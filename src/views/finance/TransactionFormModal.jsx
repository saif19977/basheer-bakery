import { Modal } from '../../components/ui/Modal';
import { EXPENSE_CATEGORIES } from '../../constants/financeCategories';

export const TransactionFormModal = ({ isOpen, onClose, form, setForm, isProcessing, onSubmit }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="تسجيل معاملة مالية يدوية">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category: e.target.value === 'income' ? 'revenue' : 'operational' })} className="w-full p-2.5 border rounded-lg outline-none font-bold">
            <option value="expense">مصروفات (-)</option>
            <option value="income">إيرادات (+)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none">
            {form.type === 'income' ? (
              <>
                <option value="revenue">مبيعات دايركت</option>
                <option value="other_income">إيرادات أخرى</option>
              </>
            ) : (
              Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)
            )}
          </select>
        </div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">البيان (الوصف)</label><input type="text" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (IQD)</label><input type="number" required min="0" step="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none font-bold text-lg" /></div>
      <button type="submit" disabled={isProcessing} className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mt-4 shadow">{isProcessing ? 'جاري التسجيل...' : 'حفظ المعاملة في السجل'}</button>
    </form>
  </Modal>
);
