import { CheckCircle, Coins } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { formatDate, formatMoney, formatOrderNum } from '../../utils/format';

const PAYMENT_METHODS = ['نقد', 'تحويل بنكي', 'أخرى'];

// نافذة إدارة الدين الموحَّدة لطلب واحد — تجمع الملخص المالي وسجل الدفعات
// وإجراء التسديد (جزئي أو كامل المتبقي) في مكان واحد بدل زرين متجاورين بلا
// سياق. order قادم من creditOrders (اشتراك Firestore لحظي)، فتظهر أي دفعة
// جديدة في السجل أدناه فوراً دون الحاجة لإغلاق النافذة وإعادة فتحها.
export const DebtManagementModal = ({ isOpen, onClose, order, form, setForm, isProcessing, processingAction, onSubmitPartial, onSubmitFull }) => {
  if (!order) return null;
  const originalAmount = Number(order.price || 0);
  const paidAmount = Number(order.paidAmount || 0);
  const remainingDebt = Number(order.remainingDebt || 0);
  const payments = Array.isArray(order.payments) ? [...order.payments].reverse() : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`إدارة الدين — طلب #${formatOrderNum(order)}`} maxWidth="max-w-xl">
      <div className="space-y-5">
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
          <p className="font-bold text-gray-800">{order.customerName || 'غير محدد'}</p>
          <p className="text-sm text-gray-500 dir-ltr text-right">{order.phone || '-'}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">المبلغ الأصلي</p>
            <p className="font-bold text-gray-800">{formatMoney(originalAmount)}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
            <p className="text-xs text-green-700 mb-1">إجمالي المدفوع</p>
            <p className="font-bold text-green-700">{formatMoney(paidAmount)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <p className="text-xs text-red-700 mb-1">المتبقي</p>
            <p className="font-bold text-red-700">{formatMoney(remainingDebt)}</p>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-gray-700 text-sm mb-2">سجل الدفعات</h4>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg">لا توجد دفعات مسجلة بعد.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-100 rounded-lg divide-y">
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center gap-2 p-2.5 text-sm">
                  <span className="font-bold text-green-700 whitespace-nowrap">{formatMoney(p.amount)} IQD</span>
                  <span className="text-gray-500 text-xs">{p.method || '-'}</span>
                  <span className="text-gray-400 text-xs whitespace-nowrap">{formatDate(p.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {remainingDebt > 0 && (
          <form onSubmit={onSubmitPartial} className="space-y-3 border-t pt-4">
            <h4 className="font-bold text-gray-700 text-sm">تسجيل دفعة جديدة</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ الدفعة (IQD)</label>
              <input
                type="number" required min="1" max={remainingDebt} step="1"
                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full p-2.5 border rounded-lg outline-none font-bold text-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none bg-white">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الدفعة</label>
                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button type="submit" disabled={isProcessing} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5">
                <Coins size={16} /> {processingAction === 'partial' ? 'جاري التسجيل...' : 'تسديد جزء'}
              </button>
              <button type="button" onClick={onSubmitFull} disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5">
                <CheckCircle size={16} /> {processingAction === 'full' ? 'جاري التسديد...' : 'تسديد المتبقي بالكامل'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
