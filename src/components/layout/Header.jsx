import { Menu } from 'lucide-react';
import { TABS } from '../../constants/tabs';

const todayLabel = () => new Date().toLocaleDateString('ar-IQ', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Baghdad',
});

export const Header = ({ activeTab, onOpenSidebar }) => (
  <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex justify-between items-center z-10 flex-shrink-0">
    <div className="flex items-center gap-3">
      <button onClick={onOpenSidebar} className="lg:hidden text-gray-600 hover:text-amber-600 transition-colors"><Menu size={28} /></button>
      <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">{TABS.find(t => t.id === activeTab)?.label}</h1>
    </div>
    <div className="text-xs md:text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full hidden sm:block">{todayLabel()}</div>
  </header>
);
