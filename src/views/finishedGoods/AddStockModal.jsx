import { Plus } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

export const AddStockModal = ({ isOpen, onClose, item, addQty, setAddQty, isProcessing, onSubmit }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="إضافة رصيد للمنتج">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4 border mb-2">
        {item?.image && <img src={item.image} className="w-16 h-16 rounded-md object-cover border" alt="item" />}
        <div><h4 className="font-bold text-gray-800 text-lg">{item?.name}</h4><p className="text-sm text-gray-600">الرصيد الحالي: <span className="font-bold text-blue-600">{item?.quantity}</span></p></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الجديدة المراد إضافتها للرصيد</label>
        <input type="number" required min="1" step="1" value={addQty} onChange={e => setAddQty(Number(e.target.value))} className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold" />
      </div>
      <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mt-2 transition-colors flex justify-center items-center gap-2">{isProcessing ? 'جاري التحديث...' : <><Plus size={18} /> تحديث الرصيد</>}</button>
    </form>
  </Modal>
);
