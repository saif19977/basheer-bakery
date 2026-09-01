import { ArrowRightLeft } from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { formatDate, formatMoney, formatOrderNum } from '../../utils/format';

export const DriversTab = ({ driverCashOrders, isRowBusy, onReceive }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
    <h3 className="font-bold text-gray-800 mb-4 text-lg">النقدية بعهدة المناديب (بانتظار التوريد)</h3>
    <Table headers={['رقم الطلب', 'تاريخ التسليم', 'العميل', 'المندوب/السائق', 'المبلغ المطلوب', 'إجراء الحسابات']}>
      {driverCashOrders.map(o => (
        <tr key={o.id} className="hover:bg-gray-50">
          <td className="p-4 font-mono text-xs font-bold text-gray-500">#{formatOrderNum(o)}</td>
          <td className="p-4 text-sm">{formatDate(o.completedAt)}</td>
          <td className="p-4 font-bold text-sm">{o.customerName || 'غير محدد'}</td>
          <td className="p-4 text-sm text-gray-600">مندوب التوصيل</td>
          <td className="p-4 font-bold text-red-600">{formatMoney(o.price)} IQD</td>
          <td className="p-4">
            <button onClick={() => onReceive(o)} disabled={isRowBusy(o.id)} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded shadow-sm text-xs font-bold flex items-center gap-1">
              {isRowBusy(o.id) ? 'جاري المعالجة...' : <><ArrowRightLeft size={14} /> استلام النقدية</>}
            </button>
          </td>
        </tr>
      ))}
      {driverCashOrders.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">لا توجد مبالغ معلقة عند السائقين.</td></tr>}
    </Table>
  </div>
);
