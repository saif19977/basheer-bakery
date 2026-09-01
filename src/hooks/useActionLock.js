import { useCallback, useRef, useState } from 'react';

// قفل إجراءات لكل عنصر (id) على حدة — يمنع تكرار تنفيذ نفس الإجراء على نفس
// الطلب/السجل أثناء انتظار السيرفر. مع withGlobalLock:true يُضاف قفل عام إضافي
// يمنع أي إجراء آخر (على أي id) من التنفيذ في نفس اللحظة.
//
// ملاحظة مهمة: القفل الخاص بعنصر معيّن لا يُفتح تلقائياً بعد النجاح — فقط
// release(id) صريحة (تُستدعى عادة داخل catch عند الفشل) تفتحه، بينما finish()
// تُستدعى دائماً (عادة داخل finally) لإعادة مؤشر "قيد المعالجة" في الواجهة فقط.
// هذا يطابق النمط الأصلي المقصود: منع إعادة تنفيذ الإجراء على نفس العنصر بعد
// نجاحه، مع السماح بإعادة المحاولة عند الفشل.
export function useActionLock({ withGlobalLock = false } = {}) {
  const lockedIds = useRef(new Set());
  const globalLock = useRef(false);
  const [processingId, setProcessingId] = useState(null);

  const isLocked = useCallback((id) => {
    if (withGlobalLock && globalLock.current) return true;
    return lockedIds.current.has(id);
  }, [withGlobalLock]);

  const lock = useCallback((id) => {
    lockedIds.current.add(id);
    if (withGlobalLock) globalLock.current = true;
    setProcessingId(id);
  }, [withGlobalLock]);

  const release = useCallback((id) => {
    lockedIds.current.delete(id);
  }, []);

  const finish = useCallback(() => {
    if (withGlobalLock) globalLock.current = false;
    setProcessingId(null);
  }, [withGlobalLock]);

  const isProcessing = useCallback((id) => processingId === id, [processingId]);

  return { isLocked, lock, release, finish, isProcessing, processingId };
}
