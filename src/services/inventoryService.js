import { doc, addDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { dataCollection, dataDoc } from '../firebase/paths';

// يعدّل بيانات مادة موجودة (تعديل مباشر، بلا دمج أو سجل حركة).
export async function updateInventoryItem(id, { itemName, type, unit, quantity, price }) {
  await updateDoc(dataDoc('inventory', id), {
    itemName, type, unit, quantity: Number(quantity), price: Number(price) || 0,
    lastUpdated: new Date().toISOString(),
  });
}

export async function deleteInventoryItem(id) {
  await deleteDoc(dataDoc('inventory', id));
}

// معادلة متوسط التكلفة المرجّح — مصدر وحيد يُعاد استخدامه لكل سطر شراء (سواء
// مادة موجودة مسبقاً أو جديدة تماماً). لمادة جديدة تُمرَّر {quantity:0, price:0}
// كرصيد سابق، وهو ما يُنتج بالضبط quantity=newQty, price=newPrice رياضياً —
// فلا حاجة لمسار منفصل لحالة "مادة جديدة".
function computeWeightedAverage({ quantity: oldQty, price: oldPrice }, newQty, newPrice) {
  const oldTotal = oldQty * oldPrice;
  const newTotal = newQty * newPrice;
  return { quantity: oldQty + newQty, price: (oldTotal + newTotal) / (oldQty + newQty) };
}

// فاتورة شراء واحدة قد تضم عدة أصناف (مورّد ورقم فاتورة موحّدان للفاتورة
// كاملة)، تُنفَّذ كعملية batch واحدة ذرّية: كل سطر يُحدّث/يُنشئ مستند مخزونه
// بمتوسط التكلفة المرجّح ويترك حركة دخول خاصة به، بينما تُسجَّل الفاتورة
// بأكملها كقيد مصروف واحد بالإجمالي الكلي — بلا أي قراءة إضافية من Firestore
// (الحساب كله من لقطة inventory المُمرَّرة + الأسطر نفسها).
//
// تكرار نفس الصنف في أكثر من سطر ضمن نفس الفاتورة (أو تكرار اسم صنف جديد لم
// يكن موجوداً) يُدمَج بشكل صحيح ومتسلسل عبر itemState بدل الاعتماد فقط على
// اللقطة الثابتة قبل هذا الإرسال، حتى لا يُفقَد أثر سطر سابق لنفس المادة.
export async function purchaseInventoryBatch({ items, supplier, invoiceNum, inventory }) {
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  const grandTotal = items.reduce((sum, item) => sum + Number(item.quantity) * (Number(item.price) || 0), 0);
  const loggedToFinance = grandTotal > 0;
  const transactionRef = loggedToFinance ? doc(dataCollection('transactions')) : null;

  const itemState = new Map(); // key: معرّف مخزون موجود، أو `new:اسم|فئة` لمادة جديدة ضمن هذه الفاتورة
  const logRefs = [];

  for (const item of items) {
    const newQty = Number(item.quantity);
    const newPrice = Number(item.price) || 0;

    const existing = item.inventoryId
      ? inventory.find(i => i.id === item.inventoryId)
      : inventory.find(i => i.itemName === item.itemName && i.type === item.type);
    const stateKey = existing ? existing.id : `new:${item.itemName}|${item.type}`;

    let state = itemState.get(stateKey);
    if (!state) {
      state = existing
        ? { ref: dataDoc('inventory', existing.id), isNew: false, quantity: existing.quantity, price: existing.price }
        : { ref: doc(dataCollection('inventory')), isNew: true, quantity: 0, price: 0 };
      itemState.set(stateKey, state);
    }

    const updated = computeWeightedAverage({ quantity: state.quantity, price: state.price }, newQty, newPrice);
    state.quantity = updated.quantity;
    state.price = updated.price;
    state.itemName = item.itemName;
    state.type = item.type;
    state.unit = item.unit;

    const logRef = doc(dataCollection('inventory_logs'));
    batch.set(logRef, {
      date: now, type: 'IN', inventoryId: state.ref.id, itemName: item.itemName, qty: newQty, price: newPrice,
      supplier: supplier || '-', invoiceNum: invoiceNum || '-', notes: 'إدخال مخزني ضمن فاتورة شراء متعددة الأصناف',
      relatedTransactionId: transactionRef ? transactionRef.id : null,
    });
    logRefs.push(logRef.id);
  }

  let mergedCount = 0;
  for (const state of itemState.values()) {
    if (state.isNew) {
      batch.set(state.ref, { itemName: state.itemName, type: state.type, unit: state.unit, quantity: state.quantity, price: state.price, lastUpdated: now });
    } else {
      batch.update(state.ref, { quantity: state.quantity, price: state.price, lastUpdated: now });
      mergedCount += 1;
    }
  }

  if (transactionRef) {
    batch.set(transactionRef, {
      category: 'inventory_purchase', type: 'expense', amount: grandTotal,
      description: `فاتورة شراء مواد (${items.length} صنف)${supplier ? ' - المورد: ' + supplier : ''}${invoiceNum ? ' - فاتورة #' + invoiceNum : ''}`,
      date: now, relatedInventoryLogIds: logRefs,
    });
  }

  await batch.commit();
  return { grandTotal, itemCount: items.length, distinctItemCount: itemState.size, mergedCount, loggedToFinance };
}

// تعديل جرد سريع (+ / -) من جدول الأرصدة، مع تسجيل حركة الجرد.
export async function adjustInventoryQuantity(id, currentQty, change, itemName) {
  const newQty = Number(currentQty) + change;
  if (newQty < 0) return;
  const now = new Date().toISOString();
  await updateDoc(dataDoc('inventory', id), { quantity: newQty, lastUpdated: now });
  await addDoc(dataCollection('inventory_logs'), {
    date: now, type: change > 0 ? 'IN_ADJUST' : 'OUT_ADJUST', inventoryId: id, itemName, qty: Math.abs(change),
    price: 0, supplier: '-', invoiceNum: '-', notes: 'تعديل جرد يدوي',
  });
}
