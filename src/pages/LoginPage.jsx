import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getSystemEmail } from '../utils/format';

const describeSignInError = (err) => {
  if (err.code === 'auth/invalid-credential') return 'اسم المستخدم أو كلمة المرور غير صحيحة.';
  if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') return 'بيانات الدخول خاطئة، تأكد من الإدارة.';
  return err.message;
};

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, getSystemEmail(username), password);
    } catch (err) {
      setAuthError(describeSignInError(err));
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 font-sans" dir="rtl">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
        <div className="flex flex-col items-center justify-center mx-auto mb-6 mt-2">
          <div className="text-center select-none">
            <span className="block text-3xl font-serif text-slate-800 tracking-wider font-bold mb-1 cursor-default">BASHEER</span>
            <span className="block text-2xl font-serif text-slate-800 tracking-wider cursor-default">ALSHAKARCHY</span>
            <div className="w-full h-1 bg-amber-500 mt-2 mb-2 rounded"></div>
            <span className="block text-xs text-slate-600 tracking-widest font-semibold uppercase cursor-default">Sweets & Cake</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تسجيل الدخول</h1>
        <p className="text-gray-500 mb-6 text-sm">الرجاء إدخال اسم المستخدم وكلمة المرور.</p>
        {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{authError}</div>}
        <form onSubmit={handleAuth} className="space-y-4 text-right">
          <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-500 dir-ltr text-right" placeholder="اسم المستخدم" />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-500 dir-ltr text-right" placeholder="••••••••" minLength="6" />
          <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors mt-2 shadow-md">دخول النظام</button>
        </form>
      </div>
    </div>
  );
};
