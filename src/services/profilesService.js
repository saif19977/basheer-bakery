import { getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, inMemoryPersistence, setPersistence, signOut } from 'firebase/auth';
import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { dataDoc } from '../firebase/paths';
import { firebaseConfig } from '../firebase/config';
import { getSystemEmail } from '../utils/format';

const SECONDARY_AUTH_APP_NAME = 'SecondaryAppForCreation';

// يُنشئ حساب دخول Firebase Auth للموظف عبر تطبيق فايربيس ثانوي منفصل، حتى لا
// يُسجَّل خروج المدير الحالي (createUserWithEmailAndPassword تُسجّل دخولاً
// تلقائياً على نفس نسخة auth لو استخدمنا التطبيق الرئيسي).
async function createEmployeeAuthAccount(username, password) {
  const secondaryApp = getApps().find(a => a.name === SECONDARY_AUTH_APP_NAME) || initializeApp(firebaseConfig, SECONDARY_AUTH_APP_NAME);
  const secondaryAuth = getAuth(secondaryApp);
  await setPersistence(secondaryAuth, inMemoryPersistence);

  const systemEmail = getSystemEmail(username);
  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, systemEmail, password);
  const newUid = userCredential.user.uid;
  await signOut(secondaryAuth);
  return newUid;
}

// ينشئ حساب دخول للموظف الجديد، ثم ملفه التعريفي في Firestore (الرتبة،
// الصلاحيات المخصّصة الفارغة، اسم المستخدم الموحّد الشكل).
export async function createEmployeeAccount(newEmp) {
  const newUid = await createEmployeeAuthAccount(newEmp.username, newEmp.password);
  await setDoc(dataDoc('profiles', newUid), {
    uid: newUid,
    name: newEmp.name,
    username: newEmp.username.trim().toLowerCase().replace(/\s+/g, ''),
    role: newEmp.role,
    customPermissions: [],
    createdAt: new Date().toISOString(),
  });
}

export async function updateEmployeeRole(profileId, newRole) {
  await updateDoc(dataDoc('profiles', profileId), { role: newRole });
}

export async function updateEmployeePermissions(profileId, perms) {
  await updateDoc(dataDoc('profiles', profileId), { customPermissions: perms });
}

export async function deleteEmployee(profileId) {
  await deleteDoc(dataDoc('profiles', profileId));
}

// يترجم أخطاء Firebase Auth الشائعة عند إنشاء الحساب لرسائل عربية مفهومة.
export function describeEmployeeCreationError(err) {
  if (err.code === 'auth/email-already-in-use') return 'اسم المستخدم (اليوزر) محجوز مسبقاً، اختر اسماً آخر.';
  if (err.code === 'auth/weak-password') return 'كلمة المرور ضعيفة، يجب أن تكون 6 أحرف أو أرقام على الأقل.';
  return err.message;
}
