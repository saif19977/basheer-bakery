import { Printer } from 'lucide-react';
import { formatMoney } from '../../utils/format';

const SummaryCard = ({ accentClass, label, value, valueClass = 'text-gray-900' }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-1 h-full ${accentClass}`}></div>
    <p className="text-sm font-bold text-gray-500 mb-1">{label}</p>
    <p className={`text-xl font-bold ${valueClass}`}>{formatMoney(value)} IQD</p>
  </div>
);

export const PLTab = ({ startDate, setStartDate, endDate, setEndDate, onPrint, income, expense, netRevenue, cogs, netProfit }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
      <span className="font-bold text-sm text-gray-700">تحديد فترة التقرير:</span>
      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1.5 border rounded outline-none text-sm" />
      <span className="text-gray-400">-</span>
      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1.5 border rounded outline-none text-sm" />
      <button onClick={onPrint} className="mr-auto bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 shadow-sm"><Printer size={14} /> طباعة التقرير</button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <SummaryCard accentClass="bg-blue-500" label="إجمالي الإيرادات" value={income} valueClass="text-blue-700" />
      <SummaryCard accentClass="bg-red-500" label="المصروفات العامة" value={expense} valueClass="text-red-700" />
      <SummaryCard accentClass="bg-yellow-500" label="صافي الإيراد" value={netRevenue} valueClass="text-yellow-700" />
      <SummaryCard accentClass="bg-orange-500" label="تكلفة البضاعة المباعة" value={cogs} valueClass="text-orange-700" />
      <div className="bg-slate-800 p-5 rounded-xl shadow-md relative overflow-hidden">
        <p className="text-sm font-bold text-slate-300 mb-1">صافي الربح النهائي</p>
        <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatMoney(netProfit)} IQD</p>
      </div>
    </div>
  </div>
);
