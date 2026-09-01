import { AlertCircle, Box, ChefHat, Truck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDate, formatOrderNum } from '../utils/format';
import { getItemDisplayName, getOrderItems } from '../utils/orderItems';

const LOW_STOCK_THRESHOLD = 10;
const RECENT_ACTIVITY_COUNT = 5;

const activityTitle = (order) => {
  const items = getOrderItems(order);
  if (items.length > 1) return `طلب متعدد (${items.length} أصناف)`;
  return getItemDisplayName(items[0]);
};

export const DashboardView = () => {
  const { orders, finishedGoods, inventory, setActiveTab } = useAppContext();

  const pendingCount = orders.filter(o => o?.status === 'pending' || o?.status === 'baking').length;
  const readyCount = orders.filter(o => o?.status === 'ready').length;
  const finishedCount = finishedGoods.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
  const lowStock = inventory.filter(i => Number(i?.quantity || 0) < LOW_STOCK_THRESHOLD).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">نظرة عامة على المصنع</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="قيد التحضير (إنتاج)" value={pendingCount} icon={ChefHat} colorClass="bg-orange-100 text-orange-600" onClick={() => setActiveTab('Production')} />
        <StatCard title="طلبات جاهزة للتوصيل" value={readyCount} icon={Truck} colorClass="bg-blue-100 text-blue-600" onClick={() => setActiveTab('Delivery')} />
        <StatCard title="رصيد الإنتاج التام" value={finishedCount} icon={Box} colorClass="bg-green-100 text-green-600" onClick={() => setActiveTab('FinishedGoods')} />
        <StatCard title="مواد منخفضة المخزون" value={lowStock} icon={AlertCircle} colorClass="bg-red-100 text-red-600" onClick={() => setActiveTab('Store')} />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-800 mb-4">أحدث النشاطات</h3>
        <div className="space-y-3">
          {orders.slice(0, RECENT_ACTIVITY_COUNT).map(o => (
            <div key={o.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-100 last:border-0 gap-2 hover:bg-gray-50 cursor-pointer px-2 rounded transition-colors" onClick={() => setActiveTab('Orders')}>
              <div>
                <p className="font-semibold text-gray-800">{o.customerName || 'غير محدد'} - #{formatOrderNum(o)}</p>
                <p className="text-xs text-gray-500">{activityTitle(o)} | {formatDate(o.createdAt)}</p>
              </div>
              <div className="self-start sm:self-auto"><StatusBadge status={o.status || 'pending'} /></div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">لا توجد نشاطات حالية.</p>}
        </div>
      </div>
    </div>
  );
};
