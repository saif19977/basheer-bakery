import { Clock } from 'lucide-react';
import { Countdown } from '../../components/ui/Countdown';
import { formatDate, formatOrderNum } from '../../utils/format';

const THEMES = {
  yellow: { container: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100', orderNum: 'text-yellow-600' },
  blue: { container: 'border-blue-200 bg-blue-50 hover:bg-blue-100', orderNum: 'text-blue-500' },
  purple: { container: 'border-purple-200 bg-purple-50 hover:bg-purple-100', orderNum: 'text-purple-500' },
};

// بطاقة طلب مصغّرة تُستخدم في أعمدة التوصيل الثلاثة (بالمعمل / جاهز للشحن /
// في الطريق) — الشكل واحد، يتغيّر لون الإطار ولون رقم الطلب فقط حسب المرحلة.
export const DeliveryOrderCard = ({ order, color, onSelect }) => {
  const theme = THEMES[color];
  return (
    <div onClick={onSelect} className={`p-3 border ${theme.container} rounded-lg cursor-pointer transition-colors flex flex-col text-right`}>
      <span className={`font-mono text-xs font-bold mb-1 ${theme.orderNum}`}>#{formatOrderNum(order)}</span>
      <h4 className="font-bold text-gray-800 line-clamp-1">{order.customerName || 'غير محدد'}</h4>
      <p className="text-xs text-gray-600 my-1 font-medium line-clamp-1">{order.address || 'بدون عنوان'}</p>

      <div className="bg-white p-1.5 rounded border border-gray-100 text-[10px] font-bold text-gray-700 mt-2 text-center flex items-center justify-center gap-1">
        <Clock size={12} className="text-blue-500" /> موعد التسليم: {formatDate(order.deliveryDate)}
      </div>

      <div className="mt-auto pt-2 flex justify-between items-center">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${order.paymentType === 'آجل' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{order.paymentType || 'نقد'}</span>
        <Countdown deliveryDate={order.deliveryDate} />
      </div>
    </div>
  );
};
