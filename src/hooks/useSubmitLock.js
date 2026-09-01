import { useCallback, useRef, useState } from 'react';

// قفل عام لمنع الإرسال المزدوج لنفس النموذج/الإجراء (زر واحد لا يمكن الضغط عليه
// مرتين أثناء انتظار السيرفر). يجمع بين useRef (تحقق فوري متزامن) وuseState
// (تعطيل الأزرار في الواجهة)، وهو النمط المتكرر الذي كان مكتوباً يدوياً في كل شاشة.
export function useSubmitLock() {
  const lockRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isLocked = useCallback(() => lockRef.current || isProcessing, [isProcessing]);

  const lock = useCallback(() => {
    lockRef.current = true;
    setIsProcessing(true);
  }, []);

  const unlock = useCallback(() => {
    lockRef.current = false;
    setIsProcessing(false);
  }, []);

  // فتح القفل بعد مهلة (حماية إضافية من الضغط المتكرر السريع بعد نجاح العملية).
  const unlockAfter = useCallback((delayMs) => {
    setTimeout(() => {
      lockRef.current = false;
      setIsProcessing(false);
    }, delayMs);
  }, []);

  return { isProcessing, isLocked, lock, unlock, unlockAfter };
}
