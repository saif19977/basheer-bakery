import { Wallet } from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { formatDate, formatMoney, formatOrderNum } from '../../utils/format';

export const DebtsTab = ({ creditOrders, onManageDebt }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
    <h3 className="font-bold text-gray-800 mb-4 text-lg">سجل الديون والذمم (الآجل)</h3>
    <Table headers={['رقم الطلب', 'تاريخ الطلب', 'اسم العميل', 'رقم الهاتف', 'مبلغ الدين', 'إجراء']}>
      {creditOrders.map(o => (
        <tr key={o.id} className="hover:bg-gray-50">
          <td className="p-4 font-mono text-xs font-bold text-gray-500">#{formatOrderNum(o)}</td>
          <td className="p-4 text-sm">{formatDate(o.createdAt)}</td>
          <td className="p-4 font-bold text-sm">{o.customerName || 'غير محدد'}</td>
          <td className="p-4 font-mono text-xs dir-ltr text-right">{o.phone || '-'}</td>
          <td className="p-4 font-bold text-orange-600">{formatMoney(o.remainingDebt ?? o.price)} IQD</td>
          <td className="p-4">
            <button onClick={() => onManageDebt(o)} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded shadow-sm text-xs font-bold flex items-center gap-1">
              <Wallet size={14} /> إدارة الدين
            </button>
          </td>
        </tr>
      ))}
      {creditOrders.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">لا توجد ديون مسجلة.</td></tr>}
    </Table>
  </div>
);
