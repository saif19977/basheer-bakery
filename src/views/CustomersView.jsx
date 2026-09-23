import { useState } from 'react';
import { MessageSquare, Phone, Search, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/ui/StatCard';
import { Table } from '../components/ui/Table';
import { CustomerNotesModal } from '../components/CustomerNotesModal';
import { formatDate, formatMoney, safeStr } from '../utils/format';
import { PAYMENT_TYPE_BADGE_CLASS } from '../constants/paymentTypes';

export const CustomersView = () => {
  const { customers } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [notesCustomer, setNotesCustomer] = useState(null);

  const sTerm = safeStr(searchTerm);
  const customersList = customers
    .filter(c => safeStr(c.name).includes(sTerm) || safeStr(c.phone).includes(sTerm))
    .sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">قاعدة بيانات العملاء</h2><p className="text-sm text-gray-500 mt-1">يتم تحديثها تلقائياً مع كل طلب جديد، وتبقى محفوظة إلى الأبد</p></div>
        <div className="relative w-full md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم أو الهاتف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard title="إجمالي عدد العملاء" value={customers.length} icon={Users} colorClass="bg-blue-100 text-blue-600" />
      </div>

      <Table headers={['اسم العميل', 'رقم الهاتف', 'التفضيلات', 'إجمالي الطلبات', 'إجمالي المدفوعات', 'آخر طلب', 'العنوان المعتاد', 'سجل المحادثات']}>
        {customersList.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="p-4 font-bold text-gray-800">{c.name}</td>
            <td className="p-4 dir-ltr text-right font-mono text-sm flex items-center justify-end gap-2">
              <a href={`tel:${c.phone}`} className="text-blue-500 hover:text-blue-700"><Phone size={14} /></a>
              <a href={`https://wa.me/${String(c.phone).replace(/[^0-9+]/g, '')}`} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-700"><Phone size={14} /></a>
              {c.phone}
            </td>
            <td className="p-4 text-xs">
              <div className="flex gap-1 flex-wrap mb-1">{(c.methods || []).map(m => <span key={m} className="bg-gray-100 border px-1.5 py-0.5 rounded text-gray-600">{m}</span>)}</div>
              <div className="flex gap-1 flex-wrap">{(c.paymentTypes || []).map(p => <span key={p} className={`border px-1.5 py-0.5 rounded ${PAYMENT_TYPE_BADGE_CLASS[p] || 'bg-gray-50 text-gray-600'}`}>{p}</span>)}</div>
            </td>
            <td className="p-4 font-bold text-blue-600">{c.orderCount || 0}</td>
            <td className="p-4 font-bold text-green-700">{formatMoney(c.totalSpent)} IQD</td>
            <td className="p-4 text-sm text-gray-500">{formatDate(c.lastOrderAt)}</td>
            <td className="p-4 text-sm text-gray-600 truncate max-w-[200px]" title={c.address}>{c.address}</td>
            <td className="p-4">
              <button onClick={() => setNotesCustomer(c)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg transition-colors" title="سجل المحادثات والملاحظات"><MessageSquare size={18} /></button>
            </td>
          </tr>
        ))}
        {customersList.length === 0 && <tr><td colSpan="8" className="p-6 text-center text-gray-400">لا توجد بيانات عملاء.</td></tr>}
      </Table>

      <CustomerNotesModal
        isOpen={!!notesCustomer} onClose={() => setNotesCustomer(null)}
        customerId={notesCustomer?.id} customerName={notesCustomer?.name}
      />
    </div>
  );
};
