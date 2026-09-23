#!/usr/bin/env node
/**
 * Phase 3 historical backfill — free-tier-safe version.
 *
 * The old version of this script loaded the ENTIRE `orders` collection in one
 * `.get()` call (1 Firestore read per document), which alone can burn through
 * a Spark-plan free-tier daily quota (50k reads/day) for a shop with a large
 * order history. This version splits the work into two independent pieces
 * with very different cost profiles:
 *
 *   MODE 1 — `--fix-counter` (cheap, O(1), run this FIRST):
 *     Finds the single highest historical `orderNumber` via one sorted,
 *     limit(1) query (2 reads total: the max-orderNumber query + the current
 *     counter doc) and raises `metadata/counters.orderNumber` to at least
 *     that value. This is the most safety-critical fix (prevents the atomic
 *     counter from re-issuing a number that's already on a printed invoice)
 *     and it does NOT require scanning the collection, so it's safe to run
 *     immediately regardless of how large your order history is.
 *
 *   MODE 2 — chunked batch processing (default mode, run once/day):
 *     Fetches only `--batch-size` orders (default 200) per invocation,
 *     ordered by `createdAt` (oldest first) starting after a cursor saved in
 *     a local JSON file, and for each order in the batch:
 *       - backfills paidAmount/remainingDebt if missing
 *       - folds the order into the `customers` collection using ONLY atomic
 *         increment()/arrayUnion() writes (no reads needed — see note below)
 *     Then saves the cursor and stops (by default after 1 batch; raise with
 *     --max-batches). Run it again (e.g. once a day, or whenever your quota
 *     has room) to continue from where it left off, until it reports
 *     "COMPLETE — no more orders to process".
 *
 * Why the customer-directory step needs no reads: because batches are always
 * processed in strict createdAt-ascending order (oldest-first, tracked by
 * the cursor), any batch is guaranteed to be chronologically newer than
 * everything already processed — including new orders the live app creates
 * while this backfill is still in progress across several days. So instead
 * of read-modify-write, every customer field is written with an atomic,
 * read-free operation: increment() for counts/totals, arrayUnion() for
 * methods/paymentTypes, and a plain (always-safe-to-overwrite) set for
 * name/address/phone/lastOrderAt, since the current batch is always the
 * most recent data seen so far for any customer it touches.
 *
 * Usage:
 *   node scripts/backfill-phase3.mjs --fix-counter                        # dry run
 *   node scripts/backfill-phase3.mjs --fix-counter --execute              # do it
 *
 *   node scripts/backfill-phase3.mjs                                      # dry run, 1 batch of 200
 *   node scripts/backfill-phase3.mjs --execute                            # real run, 1 batch of 200
 *   node scripts/backfill-phase3.mjs --execute --batch-size=200 --max-batches=2
 *   node scripts/backfill-phase3.mjs --status                             # just print progress, no writes
 *   node scripts/backfill-phase3.mjs --reset-cursor                       # start the chunked scan over
 *
 *   Add --service-account=./serviceAccountKey.json to any command if you're
 *   not using GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Recommended order of operations:
 *   1. node scripts/backfill-phase3.mjs --fix-counter --execute   (once, immediately)
 *   2. node scripts/backfill-phase3.mjs --execute                 (repeat once/day until it reports COMPLETE)
 *
 * Safe to re-run / resume: the cursor is only advanced after a batch's
 * Firestore commit succeeds, so a crashed or interrupted run can simply be
 * re-run — it will re-fetch the same (still-unprocessed) batch. All writes
 * in a batch are atomic/idempotent (increment, arrayUnion, plain field sets,
 * and a `>=`-only counter raise), so even the rare case of the same batch
 * being committed twice back-to-back only double-counts that one batch,
 * never corrupts state permanently — if you ever suspect that happened,
 * see "Recovering from a bad run" below.
 *
 * Recovering from a bad run: delete every doc in the `customers` collection,
 * `--reset-cursor`, and start the chunked scan over from the beginning. The
 * `--fix-counter` step never needs to be redone or reset — it only ever
 * raises a value and is idempotent by construction.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

const APP_ID = 'cakeshop-production';
const PROJECT_ID = 'cakeshop-88377'; // نفس firebaseConfig.projectId في src/firebase/config.js
const NO_PHONE_CUSTOMER_ID = 'NO_PHONE';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_MAX_BATCHES = 1; // "توقف تلقائياً بعد دفعة أو دفعتين" — الافتراضي الأكثر أماناً هو دفعة واحدة.

const PAYMENT_TYPE_CASH = 'نقد';
const PAYMENT_TYPE_CREDIT = 'آجل';

function parseArgs(argv) {
  const args = {
    execute: false, serviceAccountPath: null, mode: 'batch',
    batchSize: DEFAULT_BATCH_SIZE, maxBatches: DEFAULT_MAX_BATCHES, cursorPath: null,
  };
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true;
    else if (arg === '--fix-counter') args.mode = 'fix-counter';
    else if (arg === '--status') args.mode = 'status';
    else if (arg === '--reset-cursor') args.mode = 'reset-cursor';
    else if (arg.startsWith('--service-account=')) args.serviceAccountPath = arg.split('=')[1];
    else if (arg.startsWith('--batch-size=')) args.batchSize = Number(arg.split('=')[1]) || DEFAULT_BATCH_SIZE;
    else if (arg.startsWith('--max-batches=')) args.maxBatches = Number(arg.split('=')[1]) || DEFAULT_MAX_BATCHES;
    else if (arg.startsWith('--cursor-file=')) args.cursorPath = arg.split('=')[1];
  }
  if (!args.cursorPath) args.cursorPath = join(__dirname, '.backfill-cursor.json');
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
  return initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

function loadCursor(cursorPath) {
  if (!existsSync(cursorPath)) {
    return {
      lastProcessedCreatedAt: null, lastProcessedOrderId: null,
      ordersProcessed: 0, customersTouched: 0, batchesCompleted: 0,
      completed: false, startedAt: new Date().toISOString(), updatedAt: null,
    };
  }
  return JSON.parse(readFileSync(cursorPath, 'utf8'));
}

function saveCursor(cursorPath, cursor) {
  writeFileSync(cursorPath, JSON.stringify({ ...cursor, updatedAt: new Date().toISOString() }, null, 2));
}

function dataPath(db, collectionName) {
  return db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection(collectionName);
}

// --- MODE: --fix-counter — إصلاح فوري ورخيص (استعلامان فقط، بلا مسح للمجموعة) ---
async function runFixCounter(db, { execute }) {
  console.log('=== إصلاح عداد أرقام الطلبات (--fix-counter) ===\n');

  const ordersCol = dataPath(db, 'orders');
  const topSnap = await ordersCol.orderBy('orderNumber', 'desc').limit(1).get();
  const maxHistoricalOrderNumber = topSnap.empty ? 0 : Number(topSnap.docs[0].data().orderNumber) || 0;

  const countersRef = dataPath(db, 'metadata').doc('counters');
  const countersSnap = await countersRef.get();
  const currentCounterValue = Number(countersSnap.exists ? countersSnap.data().orderNumber : 0) || 0;
  const targetCounterValue = Math.max(currentCounterValue, maxHistoricalOrderNumber);

  console.log(`أعلى orderNumber تاريخي (استعلام مرتّب، مستند واحد فقط): ${maxHistoricalOrderNumber}`);
  console.log(`قيمة العداد الحالية: ${currentCounterValue}`);
  console.log(`القيمة المستهدفة: ${targetCounterValue}`);

  if (targetCounterValue <= currentCounterValue) {
    console.log('\nالعداد الحالي كافٍ بالفعل، لا حاجة للتعديل. لا شيء لفعله.');
    return;
  }

  console.log(`\nسيُرفع العداد إلى ${targetCounterValue}${execute ? '' : ' (dry-run — لن يُنفَّذ، أعد التشغيل بإضافة --execute)'}`);
  if (execute) {
    await countersRef.set({ orderNumber: targetCounterValue }, { merge: true });
    console.log('✓ تم رفع العداد بنجاح. الطلبات الجديدة الآن آمنة من تكرار أي رقم تاريخي.');
  }
}

// --- MODE: دفعة زحف تراكمي عبر الطلبات (paidAmount/remainingDebt + دليل العملاء) ---
async function runBatch(db, { execute, batchSize, maxBatches, cursorPath }) {
  console.log(`=== دفعة زحف تراكمي — ${execute ? 'EXECUTE' : 'DRY RUN'} (حجم الدفعة: ${batchSize}, أقصى عدد دفعات هذا التشغيل: ${maxBatches}) ===\n`);

  const cursor = loadCursor(cursorPath);
  if (cursor.completed) {
    console.log('✅ الزحف مكتمل بالفعل (اكتُشف ذلك من ملف المؤشر). لا مزيد من الطلبات لمعالجتها.');
    console.log(`   إجمالي ما تمت معالجته: ${cursor.ordersProcessed} طلباً عبر ${cursor.batchesCompleted} دفعة.`);
    return;
  }

  const ordersCol = dataPath(db, 'orders');

  for (let batchNum = 1; batchNum <= maxBatches; batchNum++) {
    let q = ordersCol.orderBy('createdAt').orderBy(FieldPath.documentId()).limit(batchSize);
    if (cursor.lastProcessedCreatedAt) {
      q = q.startAfter(cursor.lastProcessedCreatedAt, cursor.lastProcessedOrderId);
    }

    const snap = await q.get();
    if (snap.empty) {
      cursor.completed = true;
      saveCursor(cursorPath, cursor);
      console.log('✅ COMPLETE — لا مزيد من الطلبات لمعالجتها. الزحف التراكمي انتهى بالكامل.');
      console.log(`   إجمالي ما تمت معالجته: ${cursor.ordersProcessed} طلباً عبر ${cursor.batchesCompleted} دفعة.`);
      return;
    }

    const orders = snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
    console.log(`[دفعة ${batchNum}/${maxBatches}] تم جلب ${orders.length} طلباً (${orders.length} قراءة).`);

    // --- تجميع دلتا كل عميل ضمن هذه الدفعة فقط (بلا أي قراءة إضافية) ---
    const customerDeltas = new Map();
    const paymentSplitWrites = [];

    for (const order of orders) {
      if (order.paidAmount === undefined || order.remainingDebt === undefined) {
        const { paidAmount, remainingDebt } = computePaymentSplit({
          paymentType: order.paymentType || PAYMENT_TYPE_CASH,
          totalPrice: order.price,
          paidAmount: order.paidAmount,
        });
        paymentSplitWrites.push({ ref: order.ref, data: { paidAmount, remainingDebt } });
      }

      if (!order.phone && !order.customerName) continue;
      const custId = customerIdFromPhone(order.phone);
      const delta = customerDeltas.get(custId) || {
        orderCountDelta: 0, totalSpentDelta: 0,
        methodsToAdd: new Set(), paymentTypesToAdd: new Set(),
        latestCreatedAt: null, latestName: '', latestAddress: '', latestPhone: order.phone || '-',
      };

      if (order.status !== 'cancelled') delta.orderCountDelta += 1;
      if (order.status === 'completed') delta.totalSpentDelta += Number(order.price) || 0;
      if (order.contactMethod) delta.methodsToAdd.add(order.contactMethod);
      if (order.paymentType) delta.paymentTypesToAdd.add(order.paymentType);

      // الدفعة الحالية أحدث زمنياً دائماً من كل ما سبق معالجته (بسبب ترتيب
      // المؤشر التصاعدي بـ createdAt)، لذا آخر طلب ضمن هذه الدفعة لعميل ما
      // يكفي وحده لتحديث بيانات التواصل بأمان بلا أي قراءة مسبقة للمستند.
      if (!delta.latestCreatedAt || new Date(order.createdAt || 0) >= new Date(delta.latestCreatedAt)) {
        delta.latestCreatedAt = order.createdAt || delta.latestCreatedAt;
        delta.latestName = order.customerName || delta.latestName;
        delta.latestAddress = order.address || delta.latestAddress;
        delta.latestPhone = order.phone || delta.latestPhone;
      }

      customerDeltas.set(custId, delta);
    }

    console.log(`  ${paymentSplitWrites.length} طلباً يحتاج تعبئة paidAmount/remainingDebt.`);
    console.log(`  ${customerDeltas.size} عميلاً سيُحدَّث تراكمياً (increment/arrayUnion، بلا قراءات إضافية).`);

    if (execute) {
      const batch = db.batch();
      for (const w of paymentSplitWrites) batch.update(w.ref, w.data);
      for (const [custId, delta] of customerDeltas.entries()) {
        const custRef = dataPath(db, 'customers').doc(custId);
        const payload = {
          phone: delta.latestPhone, name: delta.latestName, address: delta.latestAddress,
          lastOrderAt: delta.latestCreatedAt,
          orderCount: FieldValue.increment(delta.orderCountDelta),
          totalSpent: FieldValue.increment(delta.totalSpentDelta),
        };
        if (delta.methodsToAdd.size > 0) payload.methods = FieldValue.arrayUnion(...delta.methodsToAdd);
        if (delta.paymentTypesToAdd.size > 0) payload.paymentTypes = FieldValue.arrayUnion(...delta.paymentTypesToAdd);
        batch.set(custRef, payload, { merge: true });
      }
      await batch.commit();
      console.log('  ✓ تم تنفيذ الكتابة لهذه الدفعة.');
    } else {
      console.log('  (dry-run — لم تُنفَّذ أي كتابة)');
    }

    const lastOrder = orders[orders.length - 1];
    cursor.lastProcessedCreatedAt = lastOrder.createdAt;
    cursor.lastProcessedOrderId = lastOrder.id;
    cursor.ordersProcessed += orders.length;
    cursor.customersTouched += customerDeltas.size;
    cursor.batchesCompleted += 1;

    // المؤشر يُحفَظ فقط بعد نجاح الكتابة (أو فوراً في dry-run بلا كتابة فعلية
    // حتى يعكس ملف الحالة تقدّم الفحص أيضاً) — راجع "Safe to re-run" أعلاه.
    saveCursor(cursorPath, cursor);

    if (orders.length < batchSize) {
      cursor.completed = true;
      saveCursor(cursorPath, cursor);
      console.log('\n✅ COMPLETE — تلك كانت آخر دفعة. الزحف التراكمي انتهى بالكامل.');
      console.log(`   إجمالي ما تمت معالجته: ${cursor.ordersProcessed} طلباً عبر ${cursor.batchesCompleted} دفعة.`);
      return;
    }
  }

  console.log(`\nتوقف بعد ${maxBatches} دفعة (كما هو مطلوب). شغّل السكربت مرة أخرى لمتابعة الزحف من حيث توقف.`);
  console.log(`تقدّم متراكم حتى الآن: ${cursor.ordersProcessed} طلباً، ${cursor.customersTouched} لمسة عميل (قد تتكرر عبر الدفعات)، عبر ${cursor.batchesCompleted} دفعة.`);
}

function printStatus(cursorPath) {
  const cursor = loadCursor(cursorPath);
  console.log('=== حالة الزحف التراكمي (ملف المؤشر) ===\n');
  console.log(JSON.stringify(cursor, null, 2));
  console.log(cursor.completed ? '\n✅ مكتمل بالكامل.' : '\n⏳ لم يكتمل بعد — شغّل بلا --status لمتابعة دفعة جديدة.');
}

function resetCursor(cursorPath) {
  if (existsSync(cursorPath)) {
    unlinkSync(cursorPath);
    console.log(`✓ تم حذف ملف المؤشر (${cursorPath}). التشغيل التالي سيبدأ الزحف من جديد بالكامل.`);
  } else {
    console.log('لا يوجد ملف مؤشر أصلاً — لا شيء لإعادة ضبطه.');
  }
}

async function main() {
  const { execute, serviceAccountPath, mode, batchSize, maxBatches, cursorPath } = parseArgs(process.argv.slice(2));

  if (mode === 'status') return printStatus(cursorPath);
  if (mode === 'reset-cursor') return resetCursor(cursorPath);

  initFirebaseAdmin({ serviceAccountPath });
  const db = getFirestore();

  if (mode === 'fix-counter') return runFixCounter(db, { execute });
  return runBatch(db, { execute, batchSize, maxBatches, cursorPath });
}

main().catch(err => {
  console.error('\n❌ فشل السكربت:', err);
  process.exit(1);
});
