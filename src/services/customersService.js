import { addDoc, arrayUnion, increment, setDoc } from 'firebase/firestore';
import { dataCollection, dataDoc } from '../firebase/paths';

// دليل عملاء دائم منفصل عن مصفوفة الطلبات المحدودة (limit(200))، بحيث لا
// يختفي عميل قديم بمجرد تجاوز عدد الطلبات لحد الاستعلام. مستند واحد لكل رقم
// هاتف (معرّف المستند = الهاتف بعد تنظيفه)، محدَّث تراكمياً عبر increment/
// arrayUnion بدل إعادة حساب كل شيء من الصفر في كل مرة.
const NO_PHONE_CUSTOMER_ID = 'NO_PHONE';

// مُصدَّرة عمداً: الواجهة (سجل المحادثات) تحتاج نفس معرّف العميل بالضبط
// لربط الملاحظات بالسجل الصحيح — معرّف واحد محسوب في مكان واحد لكل الاستخدامات.
export function customerIdFromPhone(phone) {
  const cleaned = String(phone || '').trim().replace(/[^0-9+]/g, '');
  return cleaned || NO_PHONE_CUSTOMER_ID;
}

// يُستدعى عند إنشاء أي طلب جديد (بصرف النظر عن اكتماله لاحقاً من عدمه):
// يثبّت أحدث بيانات تواصل معروفة لهذا الرقم ويزيد عدّاد طلباته. هذا وحده
// يضمن بقاء العميل ظاهراً في قاعدة العملاء إلى الأبد.
export async function upsertCustomerDirectory({ customerName, phone, address, contactMethod, paymentType }) {
  const customerId = customerIdFromPhone(phone);
  const payload = {
    phone: phone || '-',
    name: customerName || '',
    address: address || '',
    lastOrderAt: new Date().toISOString(),
    orderCount: increment(1),
  };
  if (contactMethod) payload.methods = arrayUnion(contactMethod);
  if (paymentType) payload.paymentTypes = arrayUnion(paymentType);
  await setDoc(dataDoc('customers', customerId), payload, { merge: true });
}

// يُستدعى فقط عند تحصيل/إقرار الإيراد فعلياً (لحظة اكتمال الطلب)، مطابقةً
// لتعريف "إجمالي المدفوعات" الأصلي — وليس عند مجرد إنشاء الطلب.
export async function addCustomerRevenue(phone, amount) {
  const numericAmount = Number(amount) || 0;
  if (numericAmount === 0) return;
  await setDoc(dataDoc('customers', customerIdFromPhone(phone)), {
    totalSpent: increment(numericAmount),
  }, { merge: true });
}

// عند إلغاء طلب لم يكتمل، ينزل عدّاد طلباته (الطلبات الملغاة لا تُحتسب أبداً،
// تماماً كما في الحساب الأصلي المبني على استبعادها من مصفوفة الطلبات).
export async function decrementCustomerOrderCount(phone) {
  await setDoc(dataDoc('customers', customerIdFromPhone(phone)), {
    orderCount: increment(-1),
  }, { merge: true });
}

// --- سجل المحادثات/الملاحظات (CRM) ---

// ملاحظة دائمة على خط زمني واحد لكل عميل — طلب، مكالمة، أو أي تواصل خاص.
// orderId اختياري: يربط الملاحظة بطلب محدد عند إضافتها من داخل شاشة الطلبات.
export async function addCustomerNote({ customerId, orderId, text, authorUid, authorName }) {
  await addDoc(dataCollection('customer_notes'), {
    customerId, orderId: orderId || null, text,
    authorUid, authorName: authorName || 'غير معروف',
    createdAt: new Date().toISOString(),
  });
}
