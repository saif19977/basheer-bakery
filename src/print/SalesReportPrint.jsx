import { formatDate, formatMoney, formatOrderNum } from '../utils/format';
import { getItemDisplayName, getOrderItems } from '../utils/orderItems';

const periodLabel = (printData) => {
  const start = printData.startDate ? new Date(printData.startDate).toLocaleDateString('ar-IQ') : 'منذ البداية';
  const end = printData.endDate ? new Date(printData.endDate).toLocaleDateString('ar-IQ') : 'حتى الآن';
  return `الفترة: ${start} - ${end}`;
};

export const SalesReportPrint = ({ printData }) => {
  const totalCogs = printData.data?.reduce((sum, o) => sum + Number(o?.cogs || 0), 0) || 0;
  const netProfit = (printData.totalSales || 0) - totalCogs;

  return (
    <div className="print-section hidden print:block text-right dir-rtl font-sans p-8 mx-auto w-full bg-white">
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-serif text-slate-800 font-bold mb-1">BASHEER ALSHAKARCHY</h1>
        <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Sweets & Cake</p>
        <p className="mt-4 text-xl font-bold">تقرير المبيعات الشامل</p>
        <p className="text-sm text-gray-600 mt-2">{periodLabel(printData)}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center"><p className="text-xs text-blue-800">الطلبات المكتملة</p><p className="font-bold text-lg text-blue-900">{printData.data?.length || 0}</p></div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center"><p className="text-xs text-green-800">إجمالي المبيعات</p><p className="font-bold text-lg text-green-900">{formatMoney(printData.totalSales)} IQD</p></div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center"><p className="text-xs text-orange-800">إجمالي التكلفة (COGS)</p><p className="font-bold text-lg text-orange-900">{formatMoney(totalCogs)} IQD</p></div>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-center"><p className="text-xs text-amber-800">صافي أرباح المبيعات</p><p className="font-bold text-lg text-amber-900">{formatMoney(netProfit)} IQD</p></div>
      </div>

      <table className="w-full text-right border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 border border-gray-300 text-sm">رقم الطلب</th>
            <th className="p-3 border border-gray-300 text-sm">التاريخ</th>
            <th className="p-3 border border-gray-300 text-sm">العميل والمستلم</th>
            <th className="p-3 border border-gray-300 text-sm">الأصناف</th>
            <th className="p-3 border border-gray-300 text-sm">المبلغ (IQD)</th>
          </tr>
        </thead>
        <tbody>
          {printData.data?.map((o, idx) => (
            <tr key={o?.id || idx}>
              <td className="p-3 border border-gray-300 font-mono text-xs">#{formatOrderNum(o)}</td>
              <td className="p-3 border border-gray-300 text-xs">{formatDate(o?.completedAt)}</td>
              <td className="p-3 border border-gray-300 text-sm">
                {o?.customerName || 'غير محدد'}
                {o?.receivedByName && <div className="text-[10px] text-gray-500 mt-1">بواسطة: {o.receivedByName}</div>}
              </td>
              <td className="p-3 border border-gray-300 text-xs">{getOrderItems(o).map((i, idx) => <div key={idx}>{i.quantity}x {getItemDisplayName(i)}</div>)}</td>
              <td className="p-3 border border-gray-300 font-bold">{formatMoney(o?.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-xs text-gray-500 mt-6">تاريخ طباعة التقرير: {new Date().toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })}</p>
    </div>
  );
};
