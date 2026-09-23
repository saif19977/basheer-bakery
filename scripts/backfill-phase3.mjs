#!/usr/bin/env node
/**
 * Phase 3 historical backfill — run once against the live Firestore project
 * before relying on the new customers/debts/order-number architecture.
 *
 * What it does (three independent, idempotent steps):
 *   1. Rebuilds the `customers` collection from every historical order
 *      (name/phone/address/methods/paymentTypes/orderCount/totalSpent/lastOrderAt),
 *      so old customers/debts are visible instead of only ones from orders
 *      created after Phase 2 shipped.
 *   2. Backfills `paidAmount` / `remainingDebt` onto any order document that
 *      predates the partial-payment system, so the "unpaid credit" query
 *      (`remainingDebt > 0`) sees old debts too.
 *   3. Raises `metadata/counters.orderNumber` to at least the highest
 *      `orderNumber` already used by any historical order, so the new atomic
 *      counter never re-issues a number that already exists on a printed
 *      invoice.
 *
 * Usage:
 *   node scripts/backfill-phase3.mjs                       # dry run (default, no writes)
 *   node scripts/backfill-phase3.mjs --execute              # actually writes to Firestore
 *   node scripts/backfill-phase3.mjs --execute --service-account=./serviceAccountKey.json
 *
 * Credentials: point GOOGLE_APPLICATION_CREDENTIALS at a Firebase service
 * account JSON key (Project settings → Service accounts → Generate new
 * private key, project "cakeshop-88377"), or pass --service-account=<path>.
 * Never commit that key file to the repo.
 *
 * Safe to re-run: every write here is derived fresh from current order data
 * (full recompute, not an increment) or only ever raises a value, so running
 * it twice produces the same end state as running it once.
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APP_ID = 'cakeshop-production';
const PROJECT_ID = 'cakeshop-88377'; // نفس firebaseConfig.projectId في src/firebase/config.js
const NO_PHONE_CUSTOMER_ID = 'NO_PHONE';
const FIRESTORE_BATCH_LIMIT = 500;

const PAYMENT_TYPE_CASH = 'نقد';
const PAYMENT_TYPE_CREDIT = 'آجل';

function parseArgs(argv) {
  const args = { execute: false, serviceAccountPath: null };
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true;
    else if (arg.startsWith('--service-account=')) args.serviceAccountPath = arg.split('=')[1];
  }
  return args;
}

function customerIdFromPhone(phone) {
  const cleaned = String(phone || '').trim().replace(/[^0-9+]/g, '');
  return cleaned || NO_PHONE_CUSTOMER_ID;
}

// طبق أصلي لنفس src/utils/payment.js::computePaymentSplit — بلا استيراد مباشر
// حتى يبقى هذا السكربت قابلاً للتشغيل بمعزل عن حزمة تطبيق الواجهة (Vite/ESM alias).
function computePaymentSplit({ paymentType, totalPrice, paidAmount }) {
  const price = Math.max(Number(totalPrice) || 0, 0);
  if (paymentType === PAYMENT_TYPE_CASH) return { paidAmount: price, remainingDebt: 0 };
  if (paymentType === PAYMENT_TYPE_CREDIT) return { paidAmount: 0, remainingDebt: price };
  const clampedPaid = Math.min(Math.max(Number(paidAmount) || 0, 0), price);
  return { paidAmount: clampedPaid, remainingDebt: price - clampedPaid };
}

function initFirebaseAdmin({ serviceAccountPath }) {
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    return initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
  }
  // يعتمد على GOOGLE_APPLICATION_CREDENTIALS إن لم يُمرَّر مسار صريح.
  return initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

async function commitInBatches(db, writes, { execute, label }) {
  if (writes.length === 0) {
    console.log(`  (لا توجد كتابات مطلوبة لـ ${label})`);
    return;
  }
  console.log(`  ${writes.length} كتابة مطلوبة لـ ${label}${execute ? '' : ' (dry-run — لن تُنفَّذ)'}`);
  if (!execute) return;

  for (let i = 0; i < writes.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = writes.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();
    for (const w of chunk) batch.set(w.ref, w.data, { merge: true });
    await batch.commit();
    console.log(`    ✓ دُفعة ${Math.floor(i / FIRESTORE_BATCH_LIMIT) + 1} (${chunk.length} مستند)`);
  }
}

async function loadAllOrders(db) {
  const snap = await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('orders').get();
  return snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
}

// --- الخطوة ١: إعادة بناء قاعدة العملاء بالكامل من كل الطلبات التاريخية ---
function buildCustomerDirectory(orders) {
  const customers = new Map();

  const sortedByCreatedAt = [...orders].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  for (const order of sortedByCreatedAt) {
    if (!order.phone && !order.customerName) continue;
    const id = customerIdFromPhone(order.phone);
    const existing = customers.get(id) || {
      phone: order.phone || '-', name: '', address: '',
      methods: new Set(), paymentTypes: new Set(),
      orderCount: 0, totalSpent: 0, lastOrderAt: null,
    };

    // أحدث بيانات تواصل معروفة (الطلبات مرتبة تصاعدياً، فآخر طلب يفوز) —
    // مطابقةً لسلوك upsertCustomerDirectory الأصلي (merge غير تراكمي للحقول النصية).
    existing.name = order.customerName || existing.name;
    existing.address = order.address || existing.address;
    existing.phone = order.phone || existing.phone;
    existing.lastOrderAt = order.createdAt || existing.lastOrderAt;
    if (order.contactMethod) existing.methods.add(order.contactMethod);
    if (order.paymentType) existing.paymentTypes.add(order.paymentType);

    // الطلبات الملغاة لا تُحتسب أبداً ضمن عدد الطلبات (تماماً كما في
    // decrementCustomerOrderCount عند الإلغاء الفعلي).
    if (order.status !== 'cancelled') existing.orderCount += 1;

    // الإيراد لا يُحتسب إلا عند اكتمال الطلب فعلاً (كامل السعر، مطابقةً لـ
    // markOrderDelivered → addCustomerRevenue(phone, order.price)).
    if (order.status === 'completed') existing.totalSpent += Number(order.price) || 0;

    customers.set(id, existing);
  }

  return customers;
}

// --- الخطوة ٢: تعبئة paidAmount/remainingDebt للطلبات التاريخية الناقصة ---
function findOrdersMissingPaymentSplit(orders) {
  return orders.filter(o => o.paidAmount === undefined || o.remainingDebt === undefined);
}

// --- الخطوة ٣: رفع عداد أرقام الطلبات لأعلى من أي رقم مستخدم فعلياً ---
function findMaxHistoricalOrderNumber(orders) {
  return orders.reduce((max, o) => Math.max(max, Number(o.orderNumber) || 0), 0);
}

async function main() {
  const { execute, serviceAccountPath } = parseArgs(process.argv.slice(2));
  console.log(`=== Phase 3 Backfill — ${execute ? 'EXECUTE (سيُكتب فعلياً على Firestore)' : 'DRY RUN (بلا أي كتابة)'} ===\n`);

  initFirebaseAdmin({ serviceAccountPath });
  const db = getFirestore();
  const dataPath = (collectionName) =>
    db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection(collectionName);

  console.log('جاري تحميل كل الطلبات التاريخية...');
  const orders = await loadAllOrders(db);
  console.log(`تم تحميل ${orders.length} طلباً.\n`);

  console.log('[1/3] إعادة بناء قاعدة بيانات العملاء...');
  const customerMap = buildCustomerDirectory(orders);
  const customerWrites = [...customerMap.entries()].map(([id, c]) => ({
    ref: dataPath('customers').doc(id),
    data: {
      phone: c.phone, name: c.name, address: c.address,
      methods: [...c.methods], paymentTypes: [...c.paymentTypes],
      orderCount: c.orderCount, totalSpent: c.totalSpent, lastOrderAt: c.lastOrderAt,
    },
  }));
  console.log(`  ${customerMap.size} عميلاً مستخرَجاً من سجل الطلبات.`);
  await commitInBatches(db, customerWrites, { execute, label: 'مستندات قاعدة العملاء' });

  console.log('\n[2/3] تعبئة paidAmount / remainingDebt للطلبات القديمة...');
  const ordersMissingSplit = findOrdersMissingPaymentSplit(orders);
  const paymentWrites = ordersMissingSplit.map(o => {
    const { paidAmount, remainingDebt } = computePaymentSplit({
      // الطلبات القديمة (قبل خيار "جزئي") كانت دائماً نقد أو آجل فقط؛
      // نفترض نقد افتراضياً فقط إن كان الحقل نفسه غائباً تماماً.
      paymentType: o.paymentType || PAYMENT_TYPE_CASH,
      totalPrice: o.price,
      paidAmount: o.paidAmount,
    });
    return { ref: o.ref, data: { paidAmount, remainingDebt } };
  });
  await commitInBatches(db, paymentWrites, { execute, label: 'مستندات الطلبات (paidAmount/remainingDebt)' });

  console.log('\n[3/3] رفع عداد أرقام الطلبات (metadata/counters.orderNumber)...');
  const maxHistoricalOrderNumber = findMaxHistoricalOrderNumber(orders);
  const countersRef = dataPath('metadata').doc('counters');
  const countersSnap = await countersRef.get();
  const currentCounterValue = Number(countersSnap.exists ? countersSnap.data().orderNumber : 0) || 0;
  const targetCounterValue = Math.max(currentCounterValue, maxHistoricalOrderNumber);
  console.log(`  أعلى رقم طلب تاريخي: ${maxHistoricalOrderNumber} | قيمة العداد الحالية: ${currentCounterValue} | القيمة المستهدفة: ${targetCounterValue}`);
  if (targetCounterValue > currentCounterValue) {
    console.log(`  سيُرفع العداد إلى ${targetCounterValue}${execute ? '' : ' (dry-run — لن يُنفَّذ)'}`);
    if (execute) {
      await countersRef.set({ orderNumber: targetCounterValue }, { merge: true });
      console.log('    ✓ تم رفع العداد.');
    }
  } else {
    console.log('  العداد الحالي كافٍ بالفعل، لا حاجة للتعديل.');
  }

  console.log(`\n=== انتهى ${execute ? 'التنفيذ' : 'الفحص التجريبي (dry run)'} ===`);
  if (!execute) {
    console.log('لم تُكتب أي بيانات. أعد التشغيل بإضافة --execute بعد مراجعة الأرقام أعلاه لتنفيذ الكتابة فعلياً.');
  }
}

main().catch(err => {
  console.error('\n❌ فشل السكربت:', err);
  process.exit(1);
});
