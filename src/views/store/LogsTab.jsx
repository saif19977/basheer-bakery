import { Table } from '../../components/ui/Table';
import { formatDate } from '../../utils/format';

export const LogsTab = ({ inventoryLogs }) => (
  <Table headers={['التاريخ', 'الحركة', 'المادة', 'الكمية', 'الشركة المزودة / الملاحظات', 'رقم الفاتورة']}>
    {inventoryLogs.map(log => (
      <tr key={log.id} className="hover:bg-gray-50">
        <td className="p-4 text-sm text-gray-600">{formatDate(log.date)}</td>
        <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-bold ${log.type.includes('IN') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{log.type.includes('IN') ? 'إدخال' : 'إخراج'}</span></td>
        <td className="p-4 font-bold text-sm text-gray-800">{log.itemName}</td>
        <td className="p-4 font-mono text-sm">{log.qty}</td>
        <td className="p-4 text-xs text-gray-600">{log.supplier !== '-' ? `المزود: ${log.supplier}` : log.notes}</td>
        <td className="p-4 text-xs font-mono text-gray-500">{log.invoiceNum}</td>
      </tr>
    ))}
  </Table>
);
