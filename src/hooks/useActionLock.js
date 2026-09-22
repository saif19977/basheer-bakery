import { useCallback, useRef, useState } from 'react';

// قفل إجراءات لكل عنصر (id) على حدة — يمنع تكرار تنفيذ نفس الإجراء على نفس
// الطلب/السجل أثناء انتظار السيرفر. مع withGlobalLock:true يُضاف قفل عام إضافي
// يمنع أي إجراء آخر (على أي id) من التنفيذ في نفس اللحظة.
//
// هناك نمطان للاستخدام:
// 1) إجراء نهائي لمرة واحدة على نفس العنصر (مثل استلام نقدية طلب معيّن في
//    المالية): استخدم lock() + finish() دائماً، مع release(id) فقط عند الفشل
//    داخل catch — بذلك يبقى العنصر مقفلاً نهائياً بعد النجاح فلا يُعاد تنفيذ
//    نفس الإجراء عليه مرة أخرى.
// 2) إجراء ضمن سلسلة مراحل متتالية على نفس العنصر (مثل انتقال الطلب عبر عدة
//    حالات في الإنتاج أو التوصيل): استخدم finishAndRelease(id) دائماً — يجب
//    ألا يبقى القفل بعد نجاح مرحلة واحدة، وإلا تُحظر كل المراحل التالية على
//    نفس رقم الطلب بصمت.
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

  // يفتح قفل العنصر ويُنهي مؤشر المعالجة معاً — للاستخدام في finally عند
  // إجراء ضمن سلسلة مراحل متتالية (انظر النمط 2 أعلاه)، بحيث تبقى المراحل
  // التالية على نفس العنصر قابلة للتنفيذ سواء نجح الإجراء الحالي أو فشل.
  const finishAndRelease = useCallback((id) => {
    lockedIds.current.delete(id);
    if (withGlobalLock) globalLock.current = false;
    setProcessingId(null);
  }, [withGlobalLock]);

  const isProcessing = useCallback((id) => processingId === id, [processingId]);

  return { isLocked, lock, release, finish, finishAndRelease, isProcessing, processingId };
}
