import { LogOut, X } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { TABS, ROLE_DISPLAY_LABELS } from '../../constants/tabs';

const roleLabel = (role) => ROLE_DISPLAY_LABELS[role] || 'موظف';

export const Sidebar = ({ isOpen, onClose, activeTab, onSelectTab, hasAccess, myProfile }) => (
  <aside className={`fixed lg:static inset-y-0 right-0 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-gray-900 text-white flex flex-col shadow-2xl lg:shadow-xl z-30`}>
    <div className="p-6 flex flex-col items-center border-b border-gray-800 text-center bg-gray-950 relative">
      <button onClick={onClose} className="lg:hidden absolute top-4 left-4 text-gray-400 hover:text-white"><X size={24} /></button>
      <span className="block text-xl font-serif text-white tracking-wider font-bold mb-1 drop-shadow-md mt-2">BASHEER</span>
      <span className="block text-lg font-serif text-white tracking-wider drop-shadow-md">ALSHAKARCHY</span>
      <div className="w-full h-0.5 bg-amber-500 mt-2 mb-1 rounded shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
      <span className="block text-[0.6rem] text-gray-400 tracking-widest font-semibold uppercase">Sweets & Cake</span>
    </div>

    <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
      <ul className="space-y-1 px-3">
        {TABS.map(tab => hasAccess(tab.id) && (
          <li key={tab.id}>
            <button
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <tab.icon size={20} />
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>

    <div className="p-4 border-t border-gray-800 bg-gray-950">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center font-bold text-lg flex-shrink-0">{myProfile?.name?.charAt(0).toUpperCase()}</div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold truncate text-white">{myProfile?.name}</p>
          <p className="text-xs text-amber-500 font-medium tracking-wider">{roleLabel(myProfile?.role)}</p>
        </div>
      </div>
      <button onClick={() => signOut(auth)} className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white py-2 rounded-lg transition-colors text-sm font-medium"><LogOut size={16} /> تسجيل الخروج</button>
    </div>
  </aside>
);
