import { addDoc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { dataCollection, dataDoc } from '../firebase/paths';
import { computePaymentSplit } from '../utils/payment';
import { getNextOrderNumber } from './counterService';
import { addCustomerRevenue, upsertCustomerDirectory } from './customersService';

// يضيف منتجاً جديداً للمخزن التام، أو يدمج الكمية مع منتج مطابق بنفس
// الاسم/الكود (رصيد تراكمي) محدّثاً سعره لآخر سعر مُدخل.
export async function addOrRestockFinishedGood(form, finishedGoods) {
  const existingItem = finishedGoods.find(
    item => String(item.name).trim() === String(form.name).trim() && item.code === form.code
  );

  if (existingItem) {
    await updateDoc(dataDoc('finished_goods', existingItem.id), {
      quantity: Number(existingItem.quantity || 0) + Number(form.quantity),
      price: Number(form.price) || existingItem.price,
      lastAddedAt: new Date().toISOString(),
    });
    return { merged: true };
  }

  await addDoc(dataCollection('finished_goods'), {
    ...form, quantity: Number(form.quantity), price: Number(form.price),
    addedAt: new Date().toISOString(), lastAddedAt: new Date().toISOString(),
  });
  return { merged: false };
}

export async function addStockToFinishedGood(item, addQty) {
  await updateDoc(dataDoc('finished_goods', item.id), {
    quantity: Number(item.quantity || 0) + addQty,
    lastAddedAt: new Date().toISOString(),
  });
}

export async function deleteFinishedGood(id) {
  await deleteDoc(dataDoc('finished_goods', id));
}

const buildSoldOrderBase = ({ selectedItem, sellQty, orderNumber, paidAmount, remainingDebt, sellForm, user, myProfile, now, totalRevenue }) => ({
  items: [{
    id: Date.now(), cakeCategory: selectedItem.name, cakeSize: 'جاهز من المخزن',
    quantity: sellQty, price: totalRevenue, orderSource: 'ready_made', selectedFG: selectedItem.id,
    itemImages: selectedItem.image ? [selectedItem.image] : [],
  }],
  price: totalRevenue,
  paidAmount, remainingDebt,
  createdAt: now,
  orderNumber,
  images: selectedItem.image ? [selectedItem.image] : [],
  deliveryDate: now,
  paymentType: sellForm.paymentType,
  cashStatus: paidAmount > 0 ? 'pending_delivery' : 'credit_unpaid',
  createdByUid: user.uid,
  createdByName: myProfile?.name || 'غير معروف',
});

// إخراج/بيع من المخزن التام: إما تسليم فوري (فاتورة بيع مباشر مكتملة) أو
// تحويل الصنف كطلب جاهز لقسم التوصيل. يُنقص رصيد المنتج في الحالتين، ويُقسَّم
// المبلغ دائماً إلى مدفوع فوراً/متبقٍ كدين — تماماً كما في نموذج الطلب العادي،
// حتى تتدفق إيرادات وديون المخزن التام عبر نفس أنابيب المالية.
export async function sellFinishedGood({ selectedItem, sellQty, sellForm, user, myProfile }) {
  const newQty = Number(selectedItem.quantity || 0) - sellQty;
  const totalRevenue = sellQty * Number(selectedItem.price || 0);
  const now = new Date().toISOString();
  const orderNumber = await getNextOrderNumber();
  const { paidAmount, remainingDebt } = computePaymentSplit({
    paymentType: sellForm.paymentType, totalPrice: totalRevenue, paidAmount: sellForm.paidAmount,
  });

  await updateDoc(dataDoc('finished_goods', selectedItem.id), { quantity: newQty });

  const baseOrderData = buildSoldOrderBase({
    selectedItem, sellQty, orderNumber, paidAmount, remainingDebt, sellForm, user, myProfile, now, totalRevenue,
  });

  if (sellForm.type === 'direct') {
    const docId = `DIR_${Date.now()}`;

    // البيع المباشر يُحصَّل مبلغه الفوري (paidAmount) في نفس اللحظة (لا يوجد
    // سائق ينتظر تحصيله لاحقاً)؛ أي دين متبقٍ يبقى على الطلب ليظهر في شاشة
    // الديون ويُسدَّد لاحقاً بنفس آلية تسديد الديون العادية.
    if (paidAmount > 0) {
      await setDoc(dataDoc('transactions', `REV_${docId}`), {
        category: 'revenue', type: 'income', amount: paidAmount,
        description: `بيع مباشر (مخزن تام): ${sellQty}x ${selectedItem.name}`, date: now,
      });
    }

    const receiptData = {
      ...baseOrderData, id: docId,
      customerName: 'بيع مباشر (مخزن تام)', phone: '-', address: 'تسليم باليد', contactMethod: 'مباشر',
      status: 'completed', completedAt: now, printType: 'receipt',
      cashStatus: remainingDebt > 0 ? 'credit_unpaid' : 'received_by_finance',
      receivedByUid: user.uid, receivedByName: myProfile?.name || 'غير معروف',
    };
    await setDoc(dataDoc('orders', docId), receiptData);

    await upsertCustomerDirectory({
      customerName: receiptData.customerName, phone: receiptData.phone, address: receiptData.address,
      contactMethod: receiptData.contactMethod, paymentType: sellForm.paymentType,
    });
    await addCustomerRevenue(receiptData.phone, totalRevenue);

    return { type: 'direct', receiptData };
  }

  const deliveryOrderData = {
    ...baseOrderData,
    customerName: sellForm.customerName, phone: sellForm.phone, address: sellForm.address,
    contactMethod: 'مباشر', status: 'ready',
  };
  await addDoc(dataCollection('orders'), deliveryOrderData);

  await upsertCustomerDirectory({
    customerName: sellForm.customerName, phone: sellForm.phone, address: sellForm.address,
    contactMethod: 'مباشر', paymentType: sellForm.paymentType,
  });

  return { type: 'delivery' };
}
