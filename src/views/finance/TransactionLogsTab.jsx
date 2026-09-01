import { Trash2 } from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { formatDate, formatMoney } from '../../utils/format';
import { ALL_FINANCE_CATEGORIES } from '../../constants/financeCategories';

export const TransactionLogsTab = ({
  filterCategory, setFilterCategory, startDate, setStartDate, endDate, setEndDate,
  transactions, canDelete, onDelete,
}) => (
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row gap-3 bg-gray-100 p-3 rounded-lg border">
      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm flex-1">
        <option value="all">كل الفئات</option>
        {Object.entries(ALL_FINANCE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <div className="flex items-center gap-2">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-lg outline-none text-sm" />
        <span className="text-gray-400">-</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-lg outline-none text-sm" />
      </div>
    </div>
    <Table headers={['التاريخ', 'النوع', 'الفئة', 'الوصف', 'المبلغ', 'إجراء']}>
      {transactions.map(t => (
        <tr key={t.id} className="hover:bg-gray-50">
          <td className="p-4 text-sm whitespace-nowrap">{formatDate(t.date)}</td>
          <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.type === 'income' ? 'إيراد' : 'مصروف'}</span></td>
          <td className="p-4 text-sm font-bold">{ALL_FINANCE_CATEGORIES[t.category] || t.category}</td>
          <td className="p-4 text-gray-800 max-w-xs truncate">{t.description}</td>
          <td className={`p-4 font-bold dir-ltr text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'} {formatMoney(t.amount)} IQD</td>
          <td className="p-4 text-center">
            {canDelete && (
              <button onClick={() => onDelete(t.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors border border-transparent hover:border-red-200" title="حذف القيد لتنظيف التكرار">
                <Trash2 size={16} />
              </button>
            )}
          </td>
        </tr>
      ))}
      {transactions.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">لا توجد معاملات.</td></tr>}
    </Table>
  </div>
);
