import { Cake } from 'lucide-react';

export const DataLoadingScreen = ({ showSkipLoading, onSkip }) => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 font-sans" dir="rtl">
    <div className="flex flex-col items-center animate-pulse text-center">
      <Cake size={48} className="text-amber-600 mb-4" />
      <h1 className="text-xl font-bold text-gray-700">جاري تحميل وتأمين البيانات...</h1>
      <p className="text-sm text-gray-500 mt-2">النظام يقوم بتحميل الصور والمرفقات من الخادم</p>
      {showSkipLoading && (
        <button onClick={onSkip} className="mt-8 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-colors border border-amber-800">
          تخطي الانتظار والدخول إجبارياً
        </button>
      )}
    </div>
  </div>
);
