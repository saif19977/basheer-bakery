import { runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { dataDoc } from '../firebase/paths';

// مستند عداد وحيد لكل نوع تسلسل (اسمه الحقل داخل هذا المستند)، بدل حساب
// "أكبر رقم طلب موجود محلياً" من مصفوفة الطلبات المحدودة (limit(200)) — تلك
// الطريقة تتعطل بمجرد تجاوز عدد الطلبات لحد الاستعلام، وتتكرر الأرقام.
// runTransaction يضمن عدم تصادم رقمين حتى مع نقرات متزامنة من أكثر من جهاز.
const COUNTERS_DOC = dataDoc('metadata', 'counters');

async function incrementCounter(fieldName) {
  const nextValue = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(COUNTERS_DOC);
    const current = Number(snap.exists() ? snap.data()[fieldName] : 0) || 0;
    const next = current + 1;
    transaction.set(COUNTERS_DOC, { [fieldName]: next }, { merge: true });
    return next;
  });
  return nextValue;
}

// رقم الطلب التالي، بشكل ذري ومضمون التسلسل بغض النظر عن عدد الطلبات
// المحمّلة على العميل حالياً.
export function getNextOrderNumber() {
  return incrementCounter('orderNumber');
}
