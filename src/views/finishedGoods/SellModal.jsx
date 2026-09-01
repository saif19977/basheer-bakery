import { Printer, Truck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { formatMoney } from '../../utils/format';

export const SellModal = ({ isOpen, onClose, item, sellQty, setSellQty, sellForm, setSellForm, isProcessing, onSubmit }) => {
  if (!item) return null;
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

        <div><label className="block text-sm font-medium text-gray-700 mb-1">حالة الدفع للفاتورة</label><select value={sellForm.paymentType} onChange={e => setSellForm({ ...sellForm, paymentType: e.target.value })} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold"><option value="نقد">نقد</option><option value="آجل">بالآجل (ديون)</option></select></div>

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
          <p className="text-2xl font-bold">{formatMoney(sellQty * Number(item.price || 0))} IQD</p>
        </div>

        <button type="submit" disabled={isProcessing} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mt-4 transition-colors flex justify-center items-center gap-2">
          {isProcessing ? 'جاري المعالجة...' : (sellForm.type === 'direct' ? <><Printer size={18} /> تأكيد الفاتورة والخصم</> : <><Truck size={18} /> تحويل الفاتورة لقسم التوصيل</>)}
        </button>
      </form>
    </Modal>
  );
};
