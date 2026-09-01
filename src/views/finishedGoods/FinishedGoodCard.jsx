import { Box, Plus, Tag, Trash2 } from 'lucide-react';
import { formatDate, formatMoney } from '../../utils/format';

const LOW_STOCK_THRESHOLD = 5;

export const FinishedGoodCard = ({ item, onAddStock, onSell, onDelete }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col relative group">
    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="absolute top-2 left-2 bg-white hover:bg-red-600 text-red-600 hover:text-white p-2 rounded-full transition-colors z-10 shadow-md border border-gray-100" title="حذف المنتج نهائياً"><Trash2 size={16} /></button>
    {item.image ? <img src={item.image} alt={item.name} className="w-full h-40 object-cover cursor-pointer" /> : <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400"><Box size={40} /></div>}
    <div className="p-4 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-gray-800 line-clamp-1" title={item.name}>{item.name}</h3><span className="text-xs bg-gray-100 font-mono px-2 py-1 rounded text-gray-600 border">{item.code}</span></div>
      <p className="text-green-700 font-bold text-lg mb-2">{formatMoney(item.price)} IQD</p>
      <div className="bg-gray-50 rounded p-2 mb-4 border border-gray-100">
        <p className="text-sm text-gray-600 flex justify-between items-center mb-1">الرصيد المتوفر: <span className={`font-bold text-lg ${item.quantity < LOW_STOCK_THRESHOLD ? 'text-red-600' : 'text-blue-700'}`}>{item.quantity}</span></p>
        <p className="text-[10px] text-gray-500 border-t pt-1 mt-1 border-gray-200">آخر إضافة: {formatDate(item.lastAddedAt || item.addedAt)}</p>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <button onClick={() => onAddStock(item)} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1 border border-blue-200"><Plus size={14} /> إضافة رصيد</button>
        <button onClick={() => onSell(item)} disabled={Number(item.quantity || 0) === 0} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-gray-300 text-white py-2 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"><Tag size={14} /> سحب/بيع</button>
      </div>
    </div>
  </div>
);
