import { Camera, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { formatOrderNum } from '../../utils/format';

export const CompletionModal = ({
  isOpen, order, finalImage, isUploadingImg, isProcessing,
  onClose, onUploadImage, onConfirm,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="تأكيد تجهيز الطلب">
    <div className="space-y-4">
      <p className="text-gray-700">هل أنت متأكد من الانتهاء من تجهيز الطلب <span className="font-mono font-bold bg-gray-100 px-1">#{order && formatOrderNum(order)}</span>؟</p>
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center justify-center gap-2"><Camera size={18} /> إرفاق صورة للمنتج بعد الإكمال (اختياري)</label>
        <input type="file" accept="image/*" disabled={isUploadingImg || isProcessing} onChange={onUploadImage} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50" />
        {isUploadingImg && <p className="text-xs text-amber-600 mt-2 font-bold">جاري رفع الصورة...</p>}
        {finalImage && <img src={finalImage} alt="final product" className="mt-4 w-full max-h-48 object-contain rounded-lg border shadow-sm mx-auto" />}
      </div>
      <button onClick={onConfirm} disabled={isProcessing || isUploadingImg} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors shadow flex justify-center items-center gap-2">{isProcessing ? 'جاري المعالجة...' : <><CheckCircle size={18} /> تأكيد الإنجاز النهائي</>}</button>
    </div>
  </Modal>
);
