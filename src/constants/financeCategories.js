// تصنيفات الحركات المالية المستخدمة في شاشة "المالية والحسابات".
export const EXPENSE_CATEGORIES = {
  operational: 'المصروفات التشغيلية',
  admin: 'المصروفات الإدارية',
  marketing: 'المصروفات التسويقية',
  non_operational: 'مصروفات غير تشغيلية',
  allowances: 'المخصصات',
  inventory_purchase: 'مشتريات مخزون',
  other_expense: 'أخرى',
};

export const INCOME_CATEGORIES = {
  revenue: 'إيرادات المبيعات',
  other_income: 'إيرادات أخرى',
};

// تصنيفات قديمة ما زالت تظهر في سجلات سابقة (للعرض فقط، لم تعد تُستخدم عند الإدخال).
export const LEGACY_CATEGORIES = {
  daily_ops: 'مصاريف تشغيلية يومية',
  rent: 'إيجار',
  salaries: 'رواتب',
  personal: 'مسحوبات شخصية',
};

export const ALL_FINANCE_CATEGORIES = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...LEGACY_CATEGORIES };
