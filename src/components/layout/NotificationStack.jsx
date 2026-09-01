import { AlertCircle, CheckCircle } from 'lucide-react';

const isWarningMessage = (message) => message.includes('❌') || message.includes('⚠️');

export const NotificationStack = ({ notifications }) => (
  <div className="fixed top-4 left-4 z-[60] flex flex-col gap-2 pointer-events-none">
    {notifications.map(n => (
      <div key={n.id} className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce border border-slate-700">
        {isWarningMessage(n.message) ? <AlertCircle size={18} className="text-red-400" /> : <CheckCircle size={18} className="text-green-400" />}
        <span className="text-sm font-medium">{n.message}</span>
      </div>
    ))}
  </div>
);
