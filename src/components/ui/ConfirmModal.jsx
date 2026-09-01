import { Modal } from './Modal';

// نافذة تأكيد عامة (حذف/إلغاء) تُستخدم في عدة شاشات بدل تكرار نفس القالب.
export const ConfirmModal = ({
  isOpen, onClose, title, message, confirmLabel, processingLabel, isProcessing,
  onConfirm, confirmColorClass = 'bg-red-600 hover:bg-red-700',
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className="space-y-4">
      <p className="text-gray-700 font-medium">{message}</p>
      <div className="flex gap-3">
        <button onClick={onConfirm} disabled={isProcessing} className={`flex-1 ${confirmColorClass} disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors`}>
          {isProcessing ? processingLabel : confirmLabel}
        </button>
        <button type="button" onClick={onClose} disabled={isProcessing} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-lg transition-colors">تراجع</button>
      </div>
    </div>
  </Modal>
);
