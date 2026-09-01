import { Edit, Plus, Trash2 } from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { formatMoney } from '../../utils/format';

const LOW_STOCK_THRESHOLD = 10;

export const InventoryTab = ({ inventory, user, onOpenNew, onEdit, onDelete, onAdjustQty }) => (
  <>
    <div className="flex justify-end"><button onClick={onOpenNew} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"><Plus size={20} /> مستند إدخال جديد</button></div>
    <Table headers={['اسم العنصر', 'الفئة', 'الرصيد الحالي', 'متوسط تكلفة الوحدة', 'إجمالي القيمة', 'إجراءات']}>
      {inventory.map(item => (
        <tr key={item.id} className="hover:bg-gray-50">
          <td className="p-4 font-semibold text-gray-800">{item.itemName}</td>
          <td className="p-4 text-sm text-gray-600">{item.type}</td>
          <td className="p-4"><span className={`px-3 py-1 rounded-full text-sm font-bold ${item.quantity < LOW_STOCK_THRESHOLD ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.quantity} {item.unit}</span></td>
          <td className="p-4 text-sm font-medium text-gray-700">{formatMoney(item.price)} IQD</td>
          <td className="p-4 font-bold text-amber-700 bg-amber-50/50">{formatMoney(item.quantity * item.price)} IQD</td>
          <td className="p-4 flex items-center gap-2">
            <div className="flex space-x-1 space-x-reverse bg-gray-100 rounded p-1">
              <button onClick={() => onAdjustQty(item.id, item.quantity, 1, item.itemName)} className="bg-white hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-bold shadow-sm">+</button>
              <button onClick={() => onAdjustQty(item.id, item.quantity, -1, item.itemName)} className="bg-white hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-bold shadow-sm">-</button>
            </div>
            {user && (
              <>
                <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded transition-colors" title="تعديل"><Edit size={16} /></button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 rounded transition-colors" title="حذف"><Trash2 size={16} /></button>
              </>
            )}
          </td>
        </tr>
      ))}
      {inventory.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">المستودع فارغ حالياً.</td></tr>}
    </Table>
  </>
);
