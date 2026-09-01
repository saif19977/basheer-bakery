// دوال تنسيق العرض المشتركة (نصوص، عملة، تواريخ، أرقام الطلبات)

export const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  return String(val).toLowerCase().trim();
};

export const formatMoney = (amount) => {
  return Math.round(Number(amount || 0)).toLocaleString('en-US');
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'غير محدد';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'تاريخ غير صالح';
    return d.toLocaleString('ar-IQ', {
      timeZone: 'Asia/Baghdad',
      weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch {
    return 'خطأ في التاريخ';
  }
};

export const formatOrderNum = (order) => {
  if (!order) return '0000';
  if (order.orderNumber) return String(order.orderNumber).padStart(4, '0');
  if (order.id) return String(order.id).slice(0, 6).toUpperCase();
  return '0000';
};

export const getSystemEmail = (userStr) =>
  `${String(userStr || '').trim().toLowerCase().replace(/\s+/g, '')}@basheer.system`;
