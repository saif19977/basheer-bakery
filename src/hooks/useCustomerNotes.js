import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { dataCollection } from '../firebase/paths';

const sortByCreatedAtDesc = (list) => [...list].sort((a, b) => {
  try {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  } catch {
    return 0;
  }
});

// اشتراك مباشر بملاحظات عميل واحد فقط (وليس كل العملاء)، يُفعَّل فقط أثناء
// فتح نافذة سجل المحادثات — بدل تحميل ملاحظات كل عملاء المتجر في الذاكرة
// طوال الوقت ضمن حالة التطبيق العامة.
export function useCustomerNotes(customerId) {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!customerId) return;
    const notesQuery = query(dataCollection('customer_notes'), where('customerId', '==', customerId));
    const unsubscribe = onSnapshot(notesQuery, (snap) => {
      setNotes(sortByCreatedAtDesc(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
    return unsubscribe;
  }, [customerId]);

  // customerId عاد null (أُغلقت النافذة) → لا نُبقي ملاحظات العميل السابق
  // ظاهرة في الذاكرة دون اشتراك فعلي يغذّيها.
  return customerId ? notes : [];
}
