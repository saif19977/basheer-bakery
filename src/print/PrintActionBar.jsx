import { Printer } from 'lucide-react';
import { formatOrderNum } from '../utils/format';

// شريط التحكم بوضع الطباعة (يظهر داخل الواجهة، وليس ضمن الصفحة المطبوعة نفسها).
export const PrintActionBar = ({ printData, isPrinting, onPrint, onClose }) => {
  if (!printData) return null;

  const isProductionPrint = printData.printType === 'production';
  const isSalesReport = printData.printType === 'sales_report';
  const isFinanceReport = printData.printType === 'finance_report';
  const isReport = isSalesReport || isFinanceReport;

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-4 md:p-5 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <Printer size={24} className="text-blue-600 flex-shrink-0" />
        <p className="font-medium text-sm md:text-lg">
          وضع الطباعة {isProductionPrint ? '(تذكرة معمل بدون سعر)' : isReport ? '(تقرير شامل)' : '(فاتورة عميل)'}
          {' '}
          {!isReport && <span className="font-mono bg-blue-100 px-2 rounded ml-1">#{formatOrderNum(printData)}</span>}
        </p>
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <button onClick={onPrint} disabled={isPrinting} className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2 rounded-lg shadow font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"><Printer size={18} /> {isPrinting ? 'جاري التجهيز...' : 'بدء الطباعة'}</button>
        <button onClick={onClose} disabled={isPrinting} className="flex-1 md:flex-none bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg shadow hover:bg-gray-100 transition-colors text-center font-bold disabled:opacity-50">إغلاق</button>
      </div>
    </div>
  );
};
