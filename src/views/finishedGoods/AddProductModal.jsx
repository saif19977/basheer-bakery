import { Modal } from '../../components/ui/Modal';

export const AddProductModal = ({ isOpen, onClose, form, setForm, isProcessing, isUploadingImg, onUploadImage, onSubmit }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="إضافة منتج جاهز للمخزن">
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
        <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
        <p className="text-xs text-gray-500 mt-1">إذا كان الاسم موجوداً مسبقاً، سيتم تجميع الكمية كـ (رصيد تراكمي).</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">كود المنتج (اختياري)</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none dir-ltr text-right" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">الكمية المضافة</label><input type="number" required min="1" step="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع للقطعة (IQD)</label><input type="number" required min="0" step="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none" /></div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">صورة المنتج</label>
        <input type="file" accept="image/*" disabled={isUploadingImg || isProcessing} onChange={onUploadImage} className="w-full p-2 border rounded-lg bg-gray-50 disabled:cursor-not-allowed" />
        {isUploadingImg && <span className="text-xs text-amber-600 font-bold ml-2">جاري رفع الصورة...</span>}
        {form.image && <img src={form.image} alt="preview" className="mt-2 h-20 object-contain rounded border" />}
      </div>
      <button type="submit" disabled={isProcessing || isUploadingImg} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mt-4 transition-colors">{isProcessing ? 'جاري الإضافة...' : 'تأكيد الإضافة'}</button>
    </form>
  </Modal>
);
