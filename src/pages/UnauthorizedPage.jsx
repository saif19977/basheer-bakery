import { ShieldCheck } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

export const UnauthorizedPage = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 font-sans" dir="rtl">
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-t-4 border-red-500">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldCheck size={32} className="text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">وصول غير مصرح</h1>
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">هذا الحساب غير مسجل ضمن قائمة الموظفين المعتمدين. لا يمكنك الدخول للنظام إلا بعد أن يقوم المدير بإنشاء ملف لك.</p>
      <button onClick={() => signOut(auth)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg shadow-md transition-all">تسجيل الخروج</button>
    </div>
  </div>
);
