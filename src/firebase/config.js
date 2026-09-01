import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
export const db = getFirestore(app);
export const storage = getStorage(app);
