import { formatDate, formatMoney } from '../utils/format';

const periodLabel = (printData) => {
  const start = printData.startDate ? new Date(printData.startDate).toLocaleDateString('ar-IQ') : 'منذ البداية';
  const end = printData.endDate ? new Date(printData.endDate).toLocaleDateString('ar-IQ') : 'حتى الآن';
  return `الفترة: ${start} - ${end}`;
};

export const FinanceReportPrint = ({ printData }) => {
  const totals = printData.totals || {};

  return (
    <div className="print-section hidden print:block text-right dir-rtl font-sans p-8 mx-auto w-full bg-white">
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-serif text-slate-800 font-bold mb-1">BASHEER ALSHAKARCHY</h1>
        <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Sweets & Cake</p>
        <p className="mt-4 text-xl font-bold">تقرير الأرباح والخسائر (P&L)</p>
        <p className="text-sm text-gray-600 mt-2">{periodLabel(printData)}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center"><p className="text-xs text-blue-800">إجمالي الإيرادات</p><p className="font-bold text-lg text-blue-900">{formatMoney(totals.plIncome)} IQD</p></div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center"><p className="text-xs text-red-800">المصروفات العامة</p><p className="font-bold text-lg text-red-900">{formatMoney(totals.filteredExpense)} IQD</p></div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center"><p className="text-xs text-yellow-800">صافي الإيراد</p><p className="font-bold text-lg text-yellow-900">{formatMoney(totals.netRevenue)} IQD</p></div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center"><p className="text-xs text-orange-800">تكلفة البضاعة المباعة</p><p className="font-bold text-lg text-orange-900">{formatMoney(totals.plCogs)} IQD</p></div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center col-span-4"><p className="text-xs text-green-800">صافي الربح النهائي</p><p className="font-bold text-2xl text-green-900">{formatMoney(totals.finalNetProfit)} IQD</p></div>
      </div>

      <h4 className="font-bold text-gray-800 mb-2">تفاصيل الحركات المالية (ضمن الفترة)</h4>
      <table className="w-full text-right border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 border border-gray-300 text-sm">التاريخ</th>
            <th className="p-3 border border-gray-300 text-sm">النوع</th>
            <th className="p-3 border border-gray-300 text-sm">البيان (الوصف)</th>
            <th className="p-3 border border-gray-300 text-sm">المبلغ (IQD)</th>
          </tr>
        </thead>
        <tbody>
          {printData.data?.map((t, idx) => (
            <tr key={t?.id || idx}>
              <td className="p-3 border border-gray-300 text-xs whitespace-nowrap">{formatDate(t?.date)}</td>
              <td className="p-3 border border-gray-300 text-xs font-bold">{t?.type === 'income' ? 'إيراد (+)' : 'مصروف (-)'}</td>
              <td className="p-3 border border-gray-300 text-sm">{t?.description || '-'}</td>
              <td className="p-3 border border-gray-300 font-bold dir-ltr text-right">{t?.type === 'income' ? '+' : '-'} {formatMoney(t?.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-xs text-gray-500 mt-6">تاريخ طباعة التقرير: {new Date().toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })}</p>
    </div>
  );
};
