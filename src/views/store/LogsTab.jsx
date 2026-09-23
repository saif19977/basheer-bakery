import { memo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { formatDate } from '../../utils/format';

// memo يمنع إعادة رسم جدول قد يحوي مئات الصفوف بسبب تغييرات حالة لا علاقة
// لها بالسجل نفسه في StoreView الأب (فتح نافذة إدخال مخزني مثلاً) طالما بقيت
// props هذا المكوّن دون تغيير فعلي.
export const LogsTab = memo(({ inventoryLogs, isLoading, isLoadingMore, hasMore, onLoadMore, onRefresh }) => (
  <div className="space-y-3">
    <div className="flex justify-end">
      <button
        onClick={onRefresh} disabled={isLoading}
        className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> تحديث
      </button>
    </div>

    <Table headers={['التاريخ', 'الحركة', 'المادة', 'الكمية', 'الشركة المزودة / الملاحظات', 'رقم الفاتورة', 'مصروف مالي']}>
      {inventoryLogs.map(log => (
        <tr key={log.id} className="hover:bg-gray-50">
          <td className="p-4 text-sm text-gray-600">{formatDate(log.date)}</td>
          <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-bold ${log.type.includes('IN') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{log.type.includes('IN') ? 'إدخال' : 'إخراج'}</span></td>
          <td className="p-4 font-bold text-sm text-gray-800">{log.itemName}</td>
          <td className="p-4 font-mono text-sm">{log.qty}</td>
          <td className="p-4 text-xs text-gray-600">{log.supplier !== '-' ? `المزود: ${log.supplier}` : log.notes}</td>
          <td className="p-4 text-xs font-mono text-gray-500">{log.invoiceNum}</td>
          <td className="p-4 text-xs">{log.relatedTransactionId ? <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">مسجَّل ✓</span> : <span className="text-gray-400">-</span>}</td>
        </tr>
      ))}
      {!isLoading && inventoryLogs.length === 0 && (
        <tr><td colSpan="7" className="p-6 text-center text-gray-400">لا توجد حركات مخزون بعد.</td></tr>
      )}
    </Table>

    {isLoading && <p className="text-center text-sm text-gray-400 py-4">جاري التحميل...</p>}

    {!isLoading && hasMore && (
      <div className="flex justify-center pt-2">
        <button
          onClick={onLoadMore} disabled={isLoadingMore}
          className="px-4 py-2 bg-white border rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isLoadingMore ? 'جاري تحميل المزيد...' : 'تحميل المزيد'}
        </button>
      </div>
    )}
  </div>
));

LogsTab.displayName = 'LogsTab';
