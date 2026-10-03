import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- إعدادات فايربيس ---
export const firebaseConfig = {
  apiKey: "AIzaSyBxH2YVMpjJ4Gy7GDqtTKJz1FT34lA0M1s",
  authDomain: "cakeshop-88377.firebaseapp.com",
  projectId: "cakeshop-88377",
  storageBucket: "cakeshop-88377.firebasestorage.app",
  messagingSenderId: "379019120658",
  appId: "1:379019120658:web:001793ba07a1fa1af108cb",
  measurementId: "G-N30WTQGDMT"
};

// معرّف مساحة العمل داخل Firestore (كل بيانات النظام مخزّنة تحت هذا المسار).
export const appId = 'cakeshop-production';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// تخزين مؤقت دائم (IndexedDB) بدل الذاكرة فقط (سلوك getFirestore الافتراضي).
// بدون هذا، كل تعليق للتبويب في الخلفية أو قفل شاشة الجوال أو انقطاع شبكة
// قصير — وكلها شائعة جداً على أجهزة الموظفين المحمولة — كان يُجبر كل اشتراكات
// onSnapshot التسعة في useAppData.js على إعادة تحميل اللقطة الكاملة من الصفر
// كقراءات جديدة بالكامل عند إعادة الاتصال، بصرف النظر عن حجم البيانات الفعلي
// المتغيّر. هذا هو السبب الأرجح وراء استهلاك عشرات آلاف القراءات يومياً رغم
// أن حركة الطلبات الفعلية محدودة (~20 طلباً/يوم) — وليس حلقة تكرار في الكود؛
// لم يُعثر على أي حلقة كهذه بعد مراجعة App.jsx وuseAppData.js بالكامل.
// persistentMultipleTabManager تحديداً (لا persistentSingleTabManager) لأن
// الموظفين قد يفتحون أكثر من تبويب/جهاز لنفس الحساب في آنٍ واحد.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const storage = getStorage(app);
