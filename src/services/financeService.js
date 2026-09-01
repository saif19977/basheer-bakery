import { addDoc, deleteDoc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { dataCollection, dataDoc } from '../firebase/paths';
import { formatOrderNum } from '../utils/format';

export async function addManualTransaction(form) {
  await addDoc(dataCollection('transactions'), { ...form, amount: Number(form.amount), date: new Date().toISOString() });
}

export async function deleteTransaction(id) {
  await deleteDoc(dataDoc('transactions', id));
}

// يبني هوية مستند مالي فريدة مرتبطة بالطلب لمنع تسجيل نفس التحصيل مرتين
// (تحقق ثنائي: هذا الاسم الفريد + فحص وجود المستند قبل الكتابة).
const buildIdempotentRevenue = async ({ idPrefix, order, user, myProfile, description }) => {
  const transactionRef = dataDoc('transactions', `${idPrefix}_${order.id}`);
  const txSnap = await getDoc(transactionRef);
  if (txSnap.exists()) return { alreadyRecorded: true };

  await updateDoc(dataDoc('orders', order.id), {
    status: 'completed',
    cashStatus: 'received_by_finance',
    receivedByUid: user.uid,
    receivedByName: myProfile?.name || 'غير معروف',
  });

  await setDoc(transactionRef, {
    category: 'revenue', type: 'income', amount: Number(order.price), description,
    date: new Date().toISOString(), relatedOrderId: order.id,
  });

  return { alreadyRecorded: false };
};

// تحصيل النقدية بعهدة مندوب التوصيل وتسجيلها كإيراد.
export async function receiveDriverCash(order, { user, myProfile }) {
  return buildIdempotentRevenue({
    idPrefix: 'REV', order, user, myProfile,
    description: `تحصيل نقدية مندوب لطلب: ${order.customerName} #${formatOrderNum(order)}`,
  });
}

// تسديد دَين طلب بالآجل وتسجيله كإيراد.
export async function receiveCreditPayment(order, { user, myProfile }) {
  return buildIdempotentRevenue({
    idPrefix: 'CREDIT', order, user, myProfile,
    description: `سداد دين طلب آجل: ${order.customerName} #${formatOrderNum(order)}`,
  });
}
