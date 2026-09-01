import { useCallback, useState } from 'react';

const NOTIFICATION_LIFETIME_MS = 5000;

// طابور إشعارات عائمة تختفي تلقائياً بعد بضع ثوانٍ.
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, NOTIFICATION_LIFETIME_MS);
  }, []);

  return { notifications, showNotification };
}
