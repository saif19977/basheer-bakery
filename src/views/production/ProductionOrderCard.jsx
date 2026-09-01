import { Image as ImageIcon } from 'lucide-react';
import { formatDate, formatOrderNum } from '../../utils/format';
import { getItemDisplayName, getItemImages, getOrderItems } from '../../utils/orderItems';

const cardTheme = {
  production_pending: { border: 'border-yellow-200', hover: 'hover:bg-yellow-50' },
  production_baking: { border: 'border-orange-200', hover: 'hover:bg-orange-50' },
};

// بطاقة طلب مصغّرة تُستخدم في أعمدة "بانتظار التحضير" و"جاري التحضير".
export const ProductionOrderCard = ({ order, type, onSelect }) => {
  const items = getOrderItems(order);
  const displayTitle = items.length > 1 ? `طلب متعدد (${items.length} أصناف)` : getItemDisplayName(items[0]);
  const displayImg = getItemImages(items[0])[0] || (order.images && order.images[0]);
  const theme = cardTheme[type];

  return (
    <div onClick={onSelect} className={`p-3 border rounded-xl relative shadow-sm cursor-pointer transition-all flex flex-col text-center bg-white ${theme.border} ${theme.hover}`}>
      <span className="font-mono font-bold text-gray-500 text-xs mb-1">#{formatOrderNum(order)}</span>
      <p className="font-bold text-gray-900 text-sm mb-2 flex-1 line-clamp-2">{displayTitle}</p>
      {displayImg ? (
        <img src={displayImg} className="w-full h-24 object-cover rounded-lg mb-2 shadow-sm border border-gray-100" alt="ref" />
      ) : (
        <div className="w-full h-24 bg-gray-50 rounded-lg flex items-center justify-center mb-2 text-gray-400 border border-gray-100"><ImageIcon size={24} /></div>
      )}
      <div className="bg-red-50 text-red-700 text-[10px] font-bold p-1.5 rounded border border-red-200 mt-auto">
        التسليم: {formatDate(order.deliveryDate)}
      </div>
    </div>
  );
};
