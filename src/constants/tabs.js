import {
  LayoutDashboard, ShoppingCart, ChefHat, Store as StoreIcon, Truck,
  DollarSign, Users, Box, TrendingUp, ShieldCheck
} from 'lucide-react';

// أقسام النظام (الشريط الجانبي) بترتيب ظهورها.
export const TABS = [
  { id: 'Dashboard', icon: LayoutDashboard, label: 'النظرة العامة' },
  { id: 'Orders', icon: ShoppingCart, label: 'إدارة الطلبات' },
  { id: 'Customers', icon: Users, label: 'قاعدة العملاء' },
  { id: 'Production', icon: ChefHat, label: 'خط الإنتاج' },
  { id: 'FinishedGoods', icon: Box, label: 'مخزن الإنتاج التام' },
  { id: 'Delivery', icon: Truck, label: 'التوصيل والشحن' },
  { id: 'Sales', icon: TrendingUp, label: 'سجل المبيعات' },
  { id: 'Finance', icon: DollarSign, label: 'المالية والحسابات' },
  { id: 'Store', icon: StoreIcon, label: 'المستودع والمواد' },
  { id: 'Admin', icon: ShieldCheck, label: 'إدارة النظام' },
];

// الأقسام المتاحة افتراضياً لكل رتبة وظيفية عند عدم وجود صلاحيات مخصصة.
export const DEFAULT_ROLE_PERMISSIONS = {
  admin: ['Dashboard', 'Orders', 'Production', 'FinishedGoods', 'Store', 'Delivery', 'Sales', 'Finance', 'Customers', 'Admin'],
  manager: ['Dashboard', 'Orders', 'Production', 'FinishedGoods', 'Store', 'Delivery', 'Sales', 'Finance', 'Customers'],
  operations: ['Dashboard', 'Orders', 'Production', 'FinishedGoods', 'Store', 'Delivery', 'Customers'],
  sales: ['Orders', 'FinishedGoods', 'Sales', 'Customers'],
  production: ['Production'],
  store: ['FinishedGoods', 'Store'],
  delivery: ['Delivery'],
  finance: ['Finance', 'Sales'],
  staff: []
};

// الرتب المتاحة عند تعديل رتبة موظف موجود (تشمل "المدير العام").
export const ROLE_OPTIONS_FOR_EDIT = [
  { value: 'admin', label: 'المدير العام' },
  { value: 'manager', label: 'مدير المصنع' },
  { value: 'operations', label: 'العمليات' },
  { value: 'sales', label: 'المبيعات' },
  { value: 'production', label: 'الإنتاج' },
  { value: 'store', label: 'المستودع' },
  { value: 'delivery', label: 'التوصيل' },
  { value: 'finance', label: 'المالية' },
  { value: 'staff', label: 'بدون صلاحية' },
];

// الرتب المتاحة عند إنشاء حساب موظف جديد (لا يمكن منح "المدير العام" من هنا).
export const ROLE_OPTIONS_FOR_CREATION = [
  { value: 'staff', label: 'بدون صلاحية' },
  { value: 'manager', label: 'مدير مصنع' },
  { value: 'operations', label: 'العمليات' },
  { value: 'sales', label: 'مبيعات' },
  { value: 'production', label: 'إنتاج' },
  { value: 'store', label: 'مستودع' },
  { value: 'delivery', label: 'توصيل' },
  { value: 'finance', label: 'مالية' },
];

export const ROLE_DISPLAY_LABELS = {
  admin: 'المدير العام',
  manager: 'مدير المصنع',
  operations: 'العمليات',
  production: 'الإنتاج والخبز',
  sales: 'المبيعات',
  delivery: 'السائق',
};
