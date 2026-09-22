// طرق الدفع المتاحة عبر النظام (نموذج الطلب، بيع المخزن التام، الفواتير...).
export const PAYMENT_TYPE_CASH = 'نقد';
export const PAYMENT_TYPE_PARTIAL = 'جزئي';
export const PAYMENT_TYPE_CREDIT = 'آجل';

export const PAYMENT_TYPE_OPTIONS = [
  { value: PAYMENT_TYPE_CASH, label: 'نقد (استلام فوري/عند التوصيل)' },
  { value: PAYMENT_TYPE_PARTIAL, label: 'دفع جزئي (مقدم + دين متبقي)' },
  { value: PAYMENT_TYPE_CREDIT, label: 'بالآجل (ديون على العميل)' },
];

// نفس الألوان لكل مكان يعرض شارة طريقة الدفع (بدل تكرار الشرط الثنائي القديم
// في كل شاشة على حدة).
export const PAYMENT_TYPE_BADGE_CLASS = {
  [PAYMENT_TYPE_CASH]: 'bg-green-100 text-green-800 border-green-200',
  [PAYMENT_TYPE_PARTIAL]: 'bg-amber-100 text-amber-800 border-amber-200',
  [PAYMENT_TYPE_CREDIT]: 'bg-red-100 text-red-800 border-red-200',
};
