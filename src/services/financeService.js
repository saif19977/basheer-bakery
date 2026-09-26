import { addDoc, deleteDoc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { dataCollection, dataDoc } from '../firebase/paths';
import { formatOrderNum } from '../utils/format';
import { addCustomerRevenue } from './customersService';

export async function addManualTransaction(form) {
  await addDoc(dataCollection('transactions'), { ...form, amount: Number(form.amount), date: new Date().toISOString() });
}

export async function deleteTransaction(id) {
  await deleteDoc(dataDoc('transactions', id));
}

// يبني هوية مستند مالي فريدة مرتبطة بالطلب لمنع تسجيل نفس التحصيل مرتين
// (تحقق ثنائي: هذا الاسم الفريد + فحص وجود المستند قبل الكتابة).
//
// وجود القيد المالي مسبقاً (alreadyRecorded) يمنع فقط تكرار الكتابة المالية
// نفسها — لا يجوز أن يمنع تحديث حالة الطلب أيضاً. طلب قديم قد يحمل قيداً
// مالياً بالفعل (من الزحف التاريخي مثلاً) بينما تبقى حالته "بعهدة السائق"/
// "آجل غير مسدد" لأن حالته لم تُحدَّث معه — يجب تصحيح ذلك هنا وإلا يبقى
// الطلب عالقاً إلى الأبد في قائمة الانتظار رغم أن قيده المالي مسجَّل فعلاً.
const buildIdempotentRevenue = async ({ idPrefix, order, user, myProfile, description, amount, extraOrderFields = {} }) => {
  const transactionRef = dataDoc('transactions', `${idPrefix}_${order.id}`);
  const txSnap = await getDoc(transactionRef);
  const alreadyRecorded = txSnap.exists();

  await updateDoc(dataDoc('orders', order.id), {
    status: 'completed',
    cashStatus: 'received_by_finance',
    receivedByUid: user.uid,
    receivedByName: myProfile?.name || 'غير معروف',
    ...extraOrderFields,
  });

  if (!alreadyRecorded) {
    await setDoc(transactionRef, {
      category: 'revenue', type: 'income', amount, description,
      date: new Date().toISOString(), relatedOrderId: order.id,
    });
  }

  return { alreadyRecorded };
};

// تحصيل النقدية بعهدة مندوب التوصيل وتسجيلها كإيراد. المبلغ هو ما دُفع فعلاً
// عند التسليم (paidAmount) — قد يكون كامل السعر (نقد) أو جزءاً منه (دفع
// جزئي)، بينما يبقى الدين المتبقي (إن وُجد) مستقلاً وظاهراً في شاشة الديون
// حتى يُسدَّد بشكل منفصل.
export async function receiveDriverCash(order, { user, myProfile }) {
  return buildIdempotentRevenue({
    idPrefix: 'REV', order, user, myProfile,
    description: `تحصيل نقدية مندوب لطلب: ${order.customerName} #${formatOrderNum(order)}`,
    amount: Number(order.paidAmount ?? order.price ?? 0),
  });
}

// تسديد الدين المتبقي على طلب (كامل الآجل أو الجزء المتبقي من دفعة جزئية)
// وتسجيله كإيراد، ثم تصفير remainingDebt حتى يختفي من شاشة الديون. يزيد
// "إجمالي مدفوعات" العميل فقط إن لم يكن الطلب قد اكتمل مسبقاً (لتفادي
// احتسابه مرتين مع لحظة تسليم الطلب العادية).
export async function receiveCreditPayment(order, { user, myProfile }) {
  const settledAmount = Number(order.remainingDebt ?? order.price ?? 0);
  const result = await buildIdempotentRevenue({
    idPrefix: 'CREDIT', order, user, myProfile,
    description: `سداد دين طلب آجل: ${order.customerName} #${formatOrderNum(order)}`,
    amount: settledAmount,
    extraOrderFields: { remainingDebt: 0 },
  });

  if (!result.alreadyRecorded && order.status !== 'completed' && order.phone) {
    await addCustomerRevenue(order.phone, order.price);
  }

  return result;
}
