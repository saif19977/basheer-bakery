import { useState } from 'react';
import { Phone, Search, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/ui/StatCard';
import { Table } from '../components/ui/Table';
import { formatDate, formatMoney, safeStr } from '../utils/format';

// يبني خريطة عميل واحد لكل رقم هاتف من سجل الطلبات (بدون قاعدة بيانات عملاء
// منفصلة) — آخر طلب يحدّد الاسم/العنوان المعروضَين، وكل الطلبات المكتملة أو
// المحصّلة مالياً تُجمع في "إجمالي المدفوعات".
function buildCustomersMap(orders) {
  const customersMap = {};

  orders.forEach(o => {
    if (!o || o.status === 'cancelled') return;
    const phone = safeStr(o.phone) || 'بدون رقم';

    if (!customersMap[phone]) {
      customersMap[phone] = {
        phone: o.phone || '-', name: o.customerName || '', address: o.address || '',
        methods: new Set(), paymentTypes: new Set(), totalSpent: 0, orderCount: 0, lastOrder: o.createdAt,
      };
    }

    const customer = customersMap[phone];
    if (o.contactMethod) customer.methods.add(o.contactMethod);
    if (o.paymentType) customer.paymentTypes.add(o.paymentType);
    if (o.status === 'completed' || o.cashStatus === 'received_by_finance') customer.totalSpent += Number(o.price || 0);
    customer.orderCount += 1;

    if (new Date(o.createdAt || 0) > new Date(customer.lastOrder)) {
      customer.lastOrder = o.createdAt;
      customer.name = o.customerName || '';
      customer.address = o.address || '';
    }
  });

  return customersMap;
}

export const CustomersView = () => {
  const { orders } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const customersMap = buildCustomersMap(orders);
  const sTerm = safeStr(searchTerm);
  const customersList = Object.values(customersMap)
    .filter(c => safeStr(c.name).includes(sTerm) || safeStr(c.phone).includes(sTerm))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">قاعدة بيانات العملاء</h2><p className="text-sm text-gray-500 mt-1">يتم تحديثها تلقائياً مع كل طلب جديد</p></div>
        <div className="relative w-full md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم أو الهاتف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard title="إجمالي عدد العملاء" value={Object.keys(customersMap).length} icon={Users} colorClass="bg-blue-100 text-blue-600" />
      </div>

      <Table headers={['اسم العميل', 'رقم الهاتف', 'التفضيلات', 'إجمالي الطلبات', 'إجمالي المدفوعات', 'آخر طلب', 'العنوان المعتاد']}>
        {customersList.map((c, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="p-4 font-bold text-gray-800">{c.name}</td>
            <td className="p-4 dir-ltr text-right font-mono text-sm flex items-center justify-end gap-2">
              <a href={`tel:${c.phone}`} className="text-blue-500 hover:text-blue-700"><Phone size={14} /></a>
              <a href={`https://wa.me/${String(c.phone).replace(/[^0-9+]/g, '')}`} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-700"><Phone size={14} /></a>
              {c.phone}
            </td>
            <td className="p-4 text-xs">
              <div className="flex gap-1 flex-wrap mb-1">{Array.from(c.methods).map(m => <span key={m} className="bg-gray-100 border px-1.5 py-0.5 rounded text-gray-600">{m}</span>)}</div>
              <div className="flex gap-1 flex-wrap">{Array.from(c.paymentTypes).map(p => <span key={p} className={`border px-1.5 py-0.5 rounded ${p === 'آجل' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{p}</span>)}</div>
            </td>
            <td className="p-4 font-bold text-blue-600">{c.orderCount}</td>
            <td className="p-4 font-bold text-green-700">{formatMoney(c.totalSpent)} IQD</td>
            <td className="p-4 text-sm text-gray-500">{formatDate(c.lastOrder)}</td>
            <td className="p-4 text-sm text-gray-600 truncate max-w-[200px]" title={c.address}>{c.address}</td>
          </tr>
        ))}
        {customersList.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-400">لا توجد بيانات عملاء.</td></tr>}
      </Table>
    </div>
  );
};
