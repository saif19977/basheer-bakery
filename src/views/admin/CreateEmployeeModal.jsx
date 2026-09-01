import { Modal } from '../../components/ui/Modal';
import { ROLE_OPTIONS_FOR_CREATION } from '../../constants/tabs';

export const CreateEmployeeModal = ({ isOpen, onClose, newEmp, setNewEmp, onSubmit }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="إنشاء حساب موظف">
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="text" required placeholder="الاسم الكامل" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} className="w-full p-2.5 border rounded-lg" />
      <input type="text" required placeholder="اسم المستخدم (للدخول)" value={newEmp.username} onChange={e => setNewEmp({ ...newEmp, username: e.target.value })} className="w-full p-2.5 border rounded-lg dir-ltr text-right" />
      <input type="password" required minLength="6" placeholder="كلمة المرور" value={newEmp.password} onChange={e => setNewEmp({ ...newEmp, password: e.target.value })} className="w-full p-2.5 border rounded-lg dir-ltr text-right" />
      <select value={newEmp.role} onChange={e => setNewEmp({ ...newEmp, role: e.target.value })} className="w-full p-2.5 border rounded-lg">
        {ROLE_OPTIONS_FOR_CREATION.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg">إنشاء الحساب</button>
    </form>
  </Modal>
);
