import { collection, doc } from 'firebase/firestore';
import { db, appId } from './config';

// كل مجموعات البيانات مخزّنة تحت نفس المسار الثابت: artifacts/{appId}/public/data/{collectionName}
// هاتان الدالتان تمنعان تكرار كتابة هذا المسار في عشرات الأماكن عبر الواجهات.
export const dataCollection = (collectionName) =>
  collection(db, 'artifacts', appId, 'public', 'data', collectionName);

export const dataDoc = (collectionName, id) =>
  doc(db, 'artifacts', appId, 'public', 'data', collectionName, id);
