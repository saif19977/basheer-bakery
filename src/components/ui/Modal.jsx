import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors"><X size={24} /></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};
