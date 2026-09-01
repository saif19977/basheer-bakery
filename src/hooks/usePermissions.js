import { useCallback, useEffect } from 'react';
import { DEFAULT_ROLE_PERMISSIONS, TABS } from '../constants/tabs';

// يحسب صلاحيات الوصول للأقسام بناءً على رتبة الموظف أو صلاحياته المخصّصة
// (customPermissions تتجاوز الرتبة الافتراضية إن وُجدت).
export function usePermissions(myProfile) {
  const isManagerOrAdmin = myProfile?.role === 'admin' || myProfile?.role === 'manager';

  const hasAccess = useCallback((tabId) => {
    if (!myProfile) return false;
    if (myProfile.role === 'admin') return true;
    if (myProfile.customPermissions && Array.isArray(myProfile.customPermissions)) {
      return myProfile.customPermissions.includes(tabId);
    }
    return DEFAULT_ROLE_PERMISSIONS[myProfile.role]?.includes(tabId) || false;
  }, [myProfile]);

  return { hasAccess, isManagerOrAdmin };
}

// إن فقد الموظف صلاحية الوصول للقسم النشط حالياً (تعديل صلاحيات مثلاً)، يُنقل
// تلقائياً لأول قسم مسموح له به بدل ترك شاشة فارغة أو محظورة.
export function useActiveTabGuard({ myProfile, profilesLoaded, activeTab, setActiveTab, hasAccess }) {
  useEffect(() => {
    if (!myProfile || !profilesLoaded) return;
    if (hasAccess(activeTab)) return;
    const firstAllowedTab = TABS.find(t => hasAccess(t.id));
    if (firstAllowedTab) setActiveTab(firstAllowedTab.id);
  }, [myProfile, activeTab, profilesLoaded, hasAccess, setActiveTab]);
}
