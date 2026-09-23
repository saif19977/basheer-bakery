import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { dataCollection } from '../firebase/paths';

const PAGE_SIZE = 100;

// سجل حركات المخزون يكبر بسرعة كبيرة جداً (كل عملية تصنيع تخصم عدة مواد
// خام دفعة واحدة، فتُنشئ عدة مستندات حركة لكل طلب واحد فقط). اشتراك onSnapshot
// دائم وغير محدود على هذه المجموعة (كما كان الحال سابقاً ضمن useAppData) كان
// السبب المباشر في تجمّد الواجهة: كل حركة إنتاج جديدة تُعيد بث آلاف المستندات
// وتُعيد رسم الجدول بالكامل، حتى لو لم يكن المستخدم في تبويب "مستندات
// الإدخال" أصلاً.
//
// البديل هنا: جلب صفحة واحدة ثابتة (limit(100), بلا اشتراك لحظي) فقط عند
// فتح التبويب فعلياً، مع صفحات تالية عبر "تحميل المزيد" (startAfter) تُقرأ
// مرة واحدة كل منها — لا إعادة قراءة لما سبق تحميله، ولا إعادة رسم بسبب
// حركات لا يراها المستخدم أصلاً.
export function useInventoryLogs(enabled) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);

  const fetchFirstPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(dataCollection('inventory_logs'), orderBy('date', 'desc'), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchFirstPage();
  }, [enabled, fetchFirstPage]);

  const loadMore = useCallback(async () => {
    if (!lastDocRef.current || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const q = query(
        dataCollection('inventory_logs'), orderBy('date', 'desc'),
        startAfter(lastDocRef.current), limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || lastDocRef.current;
      setLogs(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore]);

  return { logs, isLoading, isLoadingMore, hasMore, loadMore, refresh: fetchFirstPage };
}
