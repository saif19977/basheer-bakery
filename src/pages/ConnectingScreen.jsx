import { Cake } from 'lucide-react';

export const ConnectingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50" dir="rtl">
    <div className="flex flex-col items-center animate-pulse">
      <Cake size={48} className="text-amber-600 mb-4" />
      <h1 className="text-xl font-bold text-gray-700">جاري الاتصال بالنظام...</h1>
    </div>
  </div>
);
