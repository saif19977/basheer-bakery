import { Printer, Truck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { formatMoney } from '../../utils/format';
import { PAYMENT_TYPE_OPTIONS, PAYMENT_TYPE_PARTIAL } from '../../constants/paymentTypes';
import { computePaymentSplit } from '../../utils/payment';

export const SellModal = ({ isOpen, onClose, item, sellQty, setSellQty, sellForm, setSellForm, isProcessing, onSubmit }) => {
  if (!item) return null;
  const totalDue = sellQty * Number(item.price || 0);
  const { paidAmount, remainingDebt } = computePaymentSplit({ paymentType: sellForm.paymentType, totalPrice: totalDue, paidAmount: sellForm.paidAmount });
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إخراج من المخزن التام">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4 border">
          {item.image && <img src={item.image} className="w-16 h-16 rounded-md object-cover" alt="item" />}
          <div><h4 className="font-bold text-gray-800">{item.name}</h4><p className="text-sm text-gray-600">متوفر: {item.quantity} قطعة</p></div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-blue-900"><input type="radio" value="direct" checked={sellForm.type === 'direct'} onChange={e => setSellForm({ ...sellForm, type: e.target.value })} className="w-4 h-4 text-blue-600" /> تسليم فوري (مباشر للزبون)</label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-purple-900"><input type="radio" value="delivery" checked={sellForm.type === 'delivery'} onChange={e => setSellForm({ ...sellForm, type: e.target.value })} className="w-4 h-4 text-purple-600" /> إرسال مع مندوب التوصيل</label>
        </div>

        <div><label className="block text-sm font-medium text-gray-700 mb-1">حالة الدفع للفاتورة</label><select value={sellForm.paymentType} onChange={e => setSellForm({ ...sellForm, paymentType: e.target.value })} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold">{PAYMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>

        {sellForm.paymentType === PAYMENT_TYPE_PARTIAL && (
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">المبلغ المدفوع الآن (IQD)</label>
              <input type="number" required min="0" max={totalDue || undefined} step="1" value={sellForm.paidAmount} onChange={e => setSellForm({ ...sellForm, paidAmount: e.target.value })} className="w-full p-2.5 border border-amber-300 rounded-lg outline-none font-bold" />
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-red-200 flex flex-col justify-center">
              <span className="text-xs font-bold text-red-700">المتبقي كدين</span>
              <span className="text-lg font-bold text-red-600">{formatMoney(remainingDebt)} IQD</span>
            </div>
          </div>
        )}

        {sellForm.type === 'delivery' && (
          <div className="space-y-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
            <input type="text" required placeholder="اسم العميل" value={sellForm.customerName} onChange={e => setSellForm({ ...sellForm, customerName: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none bg-white" />
            <input type="text" required placeholder="رقم الهاتف" value={sellForm.phone} onChange={e => setSellForm({ ...sellForm, phone: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none dir-ltr text-right bg-white" />
            <textarea required placeholder="عنوان التوصيل الدقيق" value={sellForm.address} onChange={e => setSellForm({ ...sellForm, address: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none bg-white" rows="2"></textarea>
          </div>
        )}

        <div><label className="block text-sm font-medium text-gray-700 mb-1">الكمية المراد سحبها</label><input type="number" required min="1" max={item.quantity} value={sellQty} onChange={e => setSellQty(Number(e.target.value))} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold" /></div>

        <div className={`${sellForm.type === 'direct' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-200 text-gray-800'} p-4 rounded-lg border`}>
          <p className="text-sm font-medium mb-1">الإجمالي المستحق:</p>
          <p className="text-2xl font-bold">{formatMoney(totalDue)} IQD</p>
          {sellForm.paymentType === PAYMENT_TYPE_PARTIAL && (
            <p className="text-xs font-bold mt-1">مدفوع الآن: {formatMoney(paidAmount)} IQD · متبقٍ: {formatMoney(remainingDebt)} IQD</p>
          )}
        </div>

        <button type="submit" disabled={isProcessing} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mt-4 transition-colors flex justify-center items-center gap-2">
          {isProcessing ? 'جاري المعالجة...' : (sellForm.type === 'direct' ? <><Printer size={18} /> تأكيد الفاتورة والخصم</> : <><Truck size={18} /> تحويل الفاتورة لقسم التوصيل</>)}
        </button>
      </form>
    </Modal>
  );
};
