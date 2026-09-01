// أنماط وتسميات حالة الطلب المستخدمة في StatusBadge وأي مكان يعرض الحالة.
export const ORDER_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  baking: 'bg-orange-100 text-orange-800',
  ready: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const ORDER_STATUS_LABELS = {
  pending: 'بانتظار التحضير',
  baking: 'جاري التحضير',
  ready: 'تم التجهيز',
  out_for_delivery: 'في الطريق',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

// الحالات التي تُعتبر "طلب نشط" (لم يكتمل ولم يُلغَ بعد).
export const ACTIVE_ORDER_STATUSES = ['pending', 'baking', 'ready', 'out_for_delivery'];
