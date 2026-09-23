import { addDoc, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
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

// إدخال مخزني جديد (شراء): يدمج مع المادة الموجودة بنفس الاسم/الفئة محتسباً
// متوسط التكلفة المرجّح، أو ينشئ مادة جديدة إن لم توجد. مزامنة ثلاثية تلقائية
// بلا أي إدخال يدوي مزدوج: (١) تحديث رصيد/تكلفة المخزون، (٢) تسجيل حركة
// إدخال في سجل المخازن، (٣) تسجيل نفس القيمة كمصروف في السجل المالي —
// مع ربط كل من حركة المخزون والقيد المالي بمعرّف الآخر (relatedTransactionId
// / relatedInventoryLogId) لتتبّع كامل بلا حاجة لخانة "تسجيل يدوي" بعد الآن.
export async function purchaseInventory({ form, inventory }) {
  const now = new Date().toISOString();
  const newQty = Number(form.quantity);
  const newPrice = Number(form.price) || 0;
  const totalCost = newQty * newPrice;

  const existing = inventory.find(i => i.itemName === form.itemName && i.type === form.type);
  let finalInvId;

  if (existing) {
    const oldTotal = existing.quantity * existing.price;
    const newTotal = newQty * newPrice;
    const avgPrice = (oldTotal + newTotal) / (existing.quantity + newQty);
    await updateDoc(dataDoc('inventory', existing.id), {
      quantity: existing.quantity + newQty, price: avgPrice, lastUpdated: now,
    });
    finalInvId = existing.id;
  } else {
    const docRef = await addDoc(dataCollection('inventory'), {
      itemName: form.itemName, type: form.type, unit: form.unit, quantity: newQty, price: newPrice, lastUpdated: now,
    });
    finalInvId = docRef.id;
  }

  // معرّفا المستندين يُولَّدان مسبقاً (بلا كتابة فعلية بعد) حتى يحمل كل منهما
  // إشارة الآخر منذ لحظة إنشائه — بلا أي update لاحق على inventory_logs (سجل
  // حركات يُنشأ فقط ولا يُعدَّل أبداً بعد كتابته، تماماً كسجل محاسبي).
  const logRef = doc(dataCollection('inventory_logs'));
  const loggedToFinance = totalCost > 0;
  const transactionRef = loggedToFinance ? doc(dataCollection('transactions')) : null;

  await setDoc(logRef, {
    date: now, type: 'IN', inventoryId: finalInvId, itemName: form.itemName, qty: newQty, price: newPrice,
    supplier: form.supplier || '-', invoiceNum: form.invoiceNum || '-', notes: 'إدخال مخزني جديد (شراء)',
    relatedTransactionId: transactionRef ? transactionRef.id : null,
  });

  if (transactionRef) {
    await setDoc(transactionRef, {
      category: 'inventory_purchase', type: 'expense', amount: totalCost,
      description: `شراء مواد: ${newQty} ${form.unit} من ${form.itemName} ${form.supplier ? '(المورد: ' + form.supplier + ')' : ''}`,
      date: now, relatedInventoryLogId: logRef.id,
    });
  }

  return { merged: !!existing, loggedToFinance };
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
