import { Modal } from '../../components/ui/Modal';
import { formatMoney, formatOrderNum } from '../../utils/format';

const PAYMENT_METHODS = ['نقد', 'تحويل بنكي', 'أخرى'];

// تسديد جزء من دين طلب واحد — مورّد ورقم الطلب ثابتان (تُحدَّد بالطلب
// الممرَّر)، والمستخدم يُدخل فقط المبلغ وطريقة الدفع وتاريخه. يعرض "المتبقي
// بعد هذه الدفعة" حياً أثناء الكتابة لتفادي إدخال مبلغ أكبر من الدين سهواً
// (الخدمة نفسها تُقيِّد المبلغ أيضاً عبر transaction على الخادم للأمان).
export const PartialPaymentModal = ({ isOpen, onClose, order, form, setForm, isProcessing, onSubmit }) => {
  if (!order) return null;
  const remainingDebt = Number(order.remainingDebt || 0);
  const enteredAmount = Math.min(Math.max(Number(form.amount) || 0, 0), remainingDebt);
  const remainingAfter = Math.max(remainingDebt - enteredAmount, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تسديد جزء من الدين — طلب #${formatOrderNum(order)}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm font-bold text-red-900">الدين الحالي المتبقي</span>
          <span className="text-lg font-bold text-red-700">{formatMoney(remainingDebt)} IQD</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ الدفعة (IQD)</label>
          <input
            type="number" required min="1" max={remainingDebt} step="1"
            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            className="w-full p-2.5 border rounded-lg outline-none font-bold text-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

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

        <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm font-bold text-green-900">المتبقي بعد هذه الدفعة</span>
          <span className="text-lg font-bold text-green-700">{formatMoney(remainingAfter)} IQD</span>
        </div>

        <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mt-2 shadow">
          {isProcessing ? 'جاري التسجيل...' : 'تأكيد الدفعة الجزئية'}
        </button>
      </form>
    </Modal>
  );
};
