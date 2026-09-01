import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';

const REFRESH_INTERVAL_MS = 60000;

function computeTimeLeft(deliveryDate) {
  const targetDateObj = new Date(deliveryDate);
  const target = targetDateObj.getTime();
  if (isNaN(target)) return null;

  const now = new Date().getTime();
  const diff = target - now;
  if (diff <= 0) return { label: 'متأخر عن الموعد!', isLate: true };

  const todayObj = new Date();
  const isToday = targetDateObj.getDate() === todayObj.getDate()
    && targetDateObj.getMonth() === todayObj.getMonth()
    && targetDateObj.getFullYear() === todayObj.getFullYear();

  if (isToday) {
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { label: `متبقي ${hours} ساعة و ${minutes} دقيقة`, isLate: false };
  }

  const label = targetDateObj.toLocaleDateString('ar-IQ', { timeZone: 'Asia/Baghdad', weekday: 'long', month: 'short', day: 'numeric' });
  return { label, isLate: false };
}

// عدّاد تنازلي مبسّط لموعد التسليم، يتحدّث كل دقيقة ويتحوّل للون تحذيري
// عند اقتراب الموعد أو تجاوزه.
export const Countdown = ({ deliveryDate }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (!deliveryDate) return;

    const tick = () => {
      try {
        const result = computeTimeLeft(deliveryDate);
        if (!result) return;
        setTimeLeft(result.label);
        setIsLate(result.isLate);
      } catch {
        setTimeLeft('');
      }
    };

    tick();
    const timer = setInterval(tick, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [deliveryDate]);

  if (!deliveryDate || !timeLeft) return null;

  const colorClass = isLate
    ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
    : timeLeft.includes('متبقي')
      ? 'bg-orange-100 text-orange-700 border border-orange-200'
      : 'bg-gray-100 text-gray-600';

  return (
    <div className={`flex items-center justify-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md mt-2 ${colorClass}`}>
      <CalendarClock size={14} /><span>{timeLeft}</span>
    </div>
  );
};
