import { addDoc, arrayUnion, deleteDoc, doc, getDoc, increment, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
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

// تسديد دين طلب آجل/جزئي — جزئياً أو تسديد كامل المتبقي دفعة واحدة، كلاهما
// عبر نفس المسار (مودال إدارة الدين يمرر amount = المتبقي بالكامل لزر
// "تسديد المتبقي بالكامل"). بما أن الطلب الواحد قد يتلقى عدة دفعات عبر
// الزمن، كل دفعة تُسجَّل كقيد مالي مستقل بمعرّف جديد في كل مرة (بعكس التحصيل
// لمرة واحدة في buildIdempotentRevenue أعلاه بمعرّف ثابت). يُنفَّذ ضمن
// Firestore transaction (قراءة remainingDebt الفعلي من الخادم ثم الكتابة)
// بدل الاعتماد على القيمة المحلية المحتمل تقادمها، حتى لا يصبح الدين سالباً
// عند تسديدتين متزامنتين على نفس الطلب من جهازين مختلفين.
export async function receivePartialCreditPayment(order, { amount, method, date, user, myProfile }) {
  const requestedAmount = Number(amount) || 0;
  if (requestedAmount <= 0) {
    throw new Error('مبلغ الدفعة غير صالح.');
  }

  const paymentDate = date || new Date().toISOString();
  const paymentMethod = method || 'نقد';
  const orderRef = dataDoc('orders', order.id);
  const transactionRef = doc(dataCollection('transactions'));

  const result = await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('تعذّر العثور على الطلب.');

    const currentDebt = Number(orderSnap.data().remainingDebt || 0);
    const paymentAmount = Math.min(requestedAmount, currentDebt);
    if (paymentAmount <= 0) throw new Error('لا يوجد دين متبقٍ على هذا الطلب.');

    const isFullSettlement = paymentAmount >= currentDebt;
    const orderUpdate = {
      remainingDebt: currentDebt - paymentAmount,
      paidAmount: increment(paymentAmount),
      payments: arrayUnion({
        amount: paymentAmount, method: paymentMethod, date: paymentDate,
        recordedByUid: user.uid, recordedByName: myProfile?.name || 'غير معروف',
      }),
    };
    if (isFullSettlement) {
      orderUpdate.status = 'completed';
      orderUpdate.cashStatus = 'received_by_finance';
      orderUpdate.receivedByUid = user.uid;
      orderUpdate.receivedByName = myProfile?.name || 'غير معروف';
    }
    transaction.update(orderRef, orderUpdate);

    transaction.set(transactionRef, {
      category: 'revenue', type: 'income', amount: paymentAmount,
      description: `تسديد ${isFullSettlement ? 'نهائي' : 'جزئي'} لدين طلب آجل: ${order.customerName} #${formatOrderNum(order)} (${paymentMethod})`,
      date: paymentDate, relatedOrderId: order.id, paymentMethod,
    });

    return { isFullSettlement, paymentAmount, remainingAfter: currentDebt - paymentAmount };
  });

  if (result.isFullSettlement && order.status !== 'completed' && order.phone) {
    await addCustomerRevenue(order.phone, order.price);
  }

  return result;
}
