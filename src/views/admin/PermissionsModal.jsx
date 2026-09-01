import { Modal } from '../../components/ui/Modal';
import { TABS } from '../../constants/tabs';

export const PermissionsModal = ({ permModal, onTogglePerm, onSave, onClose }) => (
  <Modal isOpen={!!permModal} onClose={onClose} title={`تعديل صلاحيات الوصول: ${permModal?.name}`}>
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-2">ضع علامة صح أمام الأقسام التي يُسمح لهذا الموظف برؤيتها والوصول إليها:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border">
        {TABS.map(tab => (
          <label key={tab.id} className="flex items-center gap-3 p-2 bg-white rounded border cursor-pointer hover:bg-blue-50 transition-colors">
            <input type="checkbox" checked={permModal?.perms.includes(tab.id)} onChange={() => onTogglePerm(tab.id)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
            <span className="text-sm font-bold text-gray-800">{tab.label}</span>
          </label>
        ))}
      </div>
      <button onClick={onSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">حفظ الصلاحيات الجديدة</button>
    </div>
  </Modal>
);
