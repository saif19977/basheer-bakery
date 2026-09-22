import { PAYMENT_TYPE_CASH, PAYMENT_TYPE_CREDIT } from '../constants/paymentTypes';

// يحسب مقدار ما يُدفع فوراً (paidAmount) وما يبقى كدين على العميل
// (remainingDebt) حسب طريقة الدفع. كل طلب يحمل الحقلين معاً — نقداً بالكامل،
// آجلاً بالكامل، أو مقسّماً بين الاثنين — بدل الاكتفاء بحقل paymentType
// وحده، حتى تعمل شاشتا "نقدية السائقين" و"الديون" بنفس المنطق للحالات الثلاث.
export function computePaymentSplit({ paymentType, totalPrice, paidAmount }) {
  const price = Math.max(Number(totalPrice) || 0, 0);

  if (paymentType === PAYMENT_TYPE_CASH) return { paidAmount: price, remainingDebt: 0 };
  if (paymentType === PAYMENT_TYPE_CREDIT) return { paidAmount: 0, remainingDebt: price };

  // جزئي: المبلغ المدفوع لا يمكن أن يكون سالباً أو يتجاوز السعر الكلي.
  const clampedPaid = Math.min(Math.max(Number(paidAmount) || 0, 0), price);
  return { paidAmount: clampedPaid, remainingDebt: price - clampedPaid };
}
