import { useState } from 'react';
import { CheckCircle, Printer, Search, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/ui/StatCard';
import { Table } from '../components/ui/Table';
import { formatDate, formatMoney, formatOrderNum, safeStr } from '../utils/format';

function filterCompletedOrders(orders, { searchTerm, startDate, endDate }) {
  return orders.filter(o => {
    if (!o || o.status !== 'completed') return false;

    const s = safeStr(searchTerm);
    if (s && !safeStr(o.customerName).includes(s) && !safeStr(formatOrderNum(o)).includes(s)) return false;

    if (startDate || endDate) {
      try {
        const dTime = new Date(o.completedAt || o.createdAt).getTime();
        if (startDate && dTime < new Date(startDate).getTime()) return false;
        if (endDate && dTime > new Date(endDate + 'T23:59:59').getTime()) return false;
      } catch { /* تاريخ غير صالح: لا يُستبعد الطلب بسببه */ }
    }
    return true;
  });
}

function groupByMonth(completedOrders) {
  const monthlyData = {};
  completedOrders.forEach(o => {
    let monthYear = 'غير محدد';
    try {
      const dateToUse = o.completedAt || o.createdAt;
      if (dateToUse) {
        const d = new Date(dateToUse);
        if (!isNaN(d.getTime())) {
          monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }
    } catch { /* يبقى monthYear = 'غير محدد' */ }

    if (!monthlyData[monthYear]) monthlyData[monthYear] = { count: 0, revenue: 0 };
    monthlyData[monthYear].count += 1;
    monthlyData[monthYear].revenue += Number(o.price || 0);
  });
  return monthlyData;
}

export const SalesView = () => {
  const { orders, setPrintData } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const completed = filterCompletedOrders(orders, { searchTerm, startDate, endDate });
  const monthlyData = groupByMonth(completed);
  const totalSales = completed.reduce((sum, o) => sum + Number(o.price || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">سجل المبيعات</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم أو الرقم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm" /></div>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-lg outline-none text-sm focus:ring-2 focus:ring-amber-500" title="من تاريخ" />
            <span className="text-gray-400">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-lg outline-none text-sm focus:ring-2 focus:ring-amber-500" title="إلى تاريخ" />
          </div>
          <button onClick={() => setPrintData({ printType: 'sales_report', data: completed, startDate, endDate, totalSales })} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap"><Printer size={18} /> طباعة التقرير</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="الطلبات المكتملة ضمن البحث" value={completed.length} icon={CheckCircle} colorClass="bg-green-100 text-green-600" />
        <StatCard title="إجمالي الإيرادات ضمن البحث" value={`${formatMoney(totalSales)} IQD`} icon={TrendingUp} colorClass="bg-blue-100 text-blue-600" />
      </div>

      <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4 border-b pb-2">التقارير الشهرية ضمن البحث</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {Object.entries(monthlyData).sort().reverse().map(([month, data]) => (
          <div key={month} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-amber-500"></div>
            <h4 className="font-bold text-gray-700 mb-2 dir-ltr text-right">{month}</h4>
            <p className="text-sm text-gray-500 mb-1">الطلبات: <span className="font-bold text-gray-700">{data.count}</span></p>
            <p className="text-xl font-bold text-green-600 mt-2">{formatMoney(data.revenue)} IQD</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">التفاصيل والأرباح لكل طلب</h3>
      <Table headers={['رقم الطلب', 'تاريخ الاكتمال', 'العميل والمستلم', 'العنوان', 'المبلغ المستلم', 'التكلفة (COGS)', 'صافي ربح الطلب']}>
        {completed.map(o => {
          const price = Number(o?.price || 0);
          const cogs = Number(o?.cogs || 0);
          const profit = price - cogs;
          const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;
          return (
            <tr key={o.id} className="hover:bg-gray-50">
              <td className="p-4 font-mono text-xs text-gray-500 font-bold">#{formatOrderNum(o)}</td>
              <td className="p-4 text-xs text-gray-500">{formatDate(o.completedAt || o.createdAt)}</td>
              <td className="p-4">
                <p className="font-medium text-sm">{o.customerName || 'غير محدد'}</p>
                {o.receivedByName && <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded border">المستلم: {o.receivedByName}</span>}
              </td>
              <td className="p-4 text-xs text-gray-600 truncate max-w-[150px]" title={o.address}>{o.address || '-'}</td>
              <td className="p-4 font-semibold text-green-700">{formatMoney(price)} IQD</td>
              <td className="p-4 font-semibold text-orange-700">{formatMoney(cogs)} IQD</td>
              <td className="p-4 font-bold text-blue-700">{formatMoney(profit)} IQD <span className="text-xs text-gray-500 font-normal">({margin}%)</span></td>
            </tr>
          );
        })}
        {completed.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-400">لا توجد مبيعات مطابقة لبحثك.</td></tr>}
      </Table>
    </div>
  );
};
