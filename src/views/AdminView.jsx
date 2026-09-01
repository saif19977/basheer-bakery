import { useState } from 'react';
import { Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Table } from '../components/ui/Table';
import { PermissionsModal } from './admin/PermissionsModal';
import { CreateEmployeeModal } from './admin/CreateEmployeeModal';
import { ROLE_OPTIONS_FOR_EDIT } from '../constants/tabs';
import {
  createEmployeeAccount, deleteEmployee, describeEmployeeCreationError,
  updateEmployeePermissions, updateEmployeeRole,
} from '../services/profilesService';
import { formatDate } from '../utils/format';

const EMPTY_NEW_EMPLOYEE = { name: '', username: '', password: '', role: 'staff' };

export const AdminView = () => {
  const { profiles, user, showNotification } = useAppContext();

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [permModal, setPermModal] = useState(null);
  const [newEmp, setNewEmp] = useState(EMPTY_NEW_EMPLOYEE);

  const handleRoleChange = async (profileId, newRole) => {
    await updateEmployeeRole(profileId, newRole);
  };

  const handleSavePermissions = async () => {
    if (!permModal) return;
    await updateEmployeePermissions(permModal.id, permModal.perms);
    setPermModal(null);
    showNotification('تم تحديث صلاحيات الموظف بنجاح.');
  };

  const togglePerm = (tabId) => {
    setPermModal(prev => {
      const newPerms = prev.perms.includes(tabId) ? prev.perms.filter(t => t !== tabId) : [...prev.perms, tabId];
      return { ...prev, perms: newPerms };
    });
  };

  const handleDeleteEmployee = async (profileId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف نهائياً؟')) return;
    await deleteEmployee(profileId);
    showNotification('تم حذف الموظف بنجاح.');
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      await createEmployeeAccount(newEmp);
      setCreateModalOpen(false);
      setNewEmp(EMPTY_NEW_EMPLOYEE);
      showNotification('✅ تم إنشاء حساب الموظف بنجاح.');
    } catch (err) {
      showNotification('❌ خطأ: ' + describeEmployeeCreationError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">إدارة النظام والموظفين</h2></div>
        <button onClick={() => setCreateModalOpen(true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm w-full md:w-auto justify-center">
          <ShieldCheck size={20} /> إضافة موظف
        </button>
      </div>
      <Table headers={['الاسم', 'اسم المستخدم', 'الرتبة', 'تاريخ الانضمام', 'إدارة الحساب']}>
        {profiles.map(p => (
          <tr key={p.id} className="hover:bg-gray-50">
            <td className="p-4 font-semibold text-gray-800">{p.name} {p.uid === user.uid && <span className="text-xs bg-amber-100 text-amber-800 px-2 rounded ml-2">أنت</span>}</td>
            <td className="p-4 text-sm text-gray-600 font-mono bg-gray-100 rounded px-2">{p.username}</td>
            <td className="p-4">
              <select value={p.role} onChange={(e) => handleRoleChange(p.id, e.target.value)} disabled={p.uid === user.uid} className="p-2 border rounded-lg text-sm bg-white">
                {ROLE_OPTIONS_FOR_EDIT.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </td>
            <td className="p-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(p.createdAt)}</td>
            <td className="p-4 flex gap-2">
              <button onClick={() => setPermModal({ id: p.id, name: p.name, perms: p.customPermissions || [] })} disabled={p.role === 'admin'} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"><Lock size={14} /> الصلاحيات</button>
              <button onClick={() => handleDeleteEmployee(p.id)} disabled={p.uid === user.uid} className="text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"><Trash2 size={14} /> حذف</button>
            </td>
          </tr>
        ))}
      </Table>

      <PermissionsModal permModal={permModal} onTogglePerm={togglePerm} onSave={handleSavePermissions} onClose={() => setPermModal(null)} />

      <CreateEmployeeModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} newEmp={newEmp} setNewEmp={setNewEmp} onSubmit={handleCreateEmployee} />
    </div>
  );
};
