import { useMemo } from 'react';
import { BASE_CAKE_CATEGORIES } from '../constants/cakeCategories';

// يدمج الفئات/الأحجام الأساسية الثابتة مع أي فئة أو حجم جديد أُضيف عبر معادلات
// التصنيع (BOM) في شاشة المستودع، فتظهر تلقائياً في نماذج الطلبات دون تعديل كود.
export function useDynamicCategories(recipes) {
  return useMemo(() => {
    const categories = Object.fromEntries(
      Object.entries(BASE_CAKE_CATEGORIES).map(([category, sizes]) => [category, [...sizes]])
    );

    recipes.forEach(r => {
      if (!categories[r.cakeCategory]) categories[r.cakeCategory] = [];
      if (r.cakeSize && !categories[r.cakeCategory].includes(r.cakeSize)) {
        categories[r.cakeCategory].push(r.cakeSize);
      }
    });

    return categories;
  }, [recipes]);
}
