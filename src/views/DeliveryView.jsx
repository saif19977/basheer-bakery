import { useState } from 'react';
import { Clock, Package, Phone, Printer, Search, Truck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Table } from '../components/ui/Table';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { DeliveryOrderCard } from './delivery/DeliveryOrderCard';
import { useActionLock } from '../hooks/useActionLock';
import { dispatchOrderForDelivery, markOrderDelivered } from '../services/ordersService';
import { formatDate, formatOrderNum, safeStr } from '../utils/format';

const ACTIVE_STATUSES = ['pending', 'baking', 'ready', 'out_for_delivery'];

function filterDeliveryOrders(orders, { viewMode, searchTerm }) {
  const base = viewMode === 'active'
    ? orders.filter(o => o && ACTIVE_STATUSES.includes(o.status))
    : orders.filter(o => o?.status === 'completed');

  return base.filter(o => {
    if (!o) return false;
    const s = safeStr(searchTerm);
    return safeStr(o.customerName).includes(s) || safeStr(o.phone).includes(s)
      || safeStr(o.address).includes(s) || safeStr(formatOrderNum(o)).includes(s);
  });
}

const detailsModalType = (order) => {
  if (order?.status === 'ready') return 'delivery_dispatch';
  if (order?.status === 'out_for_delivery') return 'delivery_complete';
  return 'delivery_view_only';
};

export const DeliveryView = () => {
  const { orders, user, myProfile, showNotification, setPrintData } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const actionLock = useActionLock();
  const uiProcessing = !!actionLock.processingId;

  const displayedOrders = filterDeliveryOrders(orders, { viewMode, searchTerm });

  const handleDispatch = async (order) => {
    if (actionLock.isLocked(order.id)) return;
    actionLock.lock(order.id);
    try {
      await dispatchOrderForDelivery(order.id);
      setSelectedOrder(null);
    } catch {
      actionLock.release(order.id);
    } finally {
      actionLock.finish();
    }
  };

  const handleDelivered = async (order) => {
    if (actionLock.isLocked(order.id)) return;
    actionLock.lock(order.id);
    try {
      const isCash = order.paymentType === 'نقد' || !order.paymentType;
      showNotification(isCash
        ? 'تم تسليم الطلب. يرجى تسليم النقدية لقسم الحسابات.'
        : 'تم تسليم الطلب بالآجل. الدين مسجل الآن في الحسابات.');
      await markOrderDelivered(order, { user, myProfile }, isCash);
      setSelectedOrder(null);
    } catch {
      actionLock.release(order.id);
    } finally {
      actionLock.finish();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">التوصيل والشحن</h2>
        <div className="relative w-full md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم، الهاتف، الرقم، العنوان..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'active' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>الطلبات الحالية</button>
        <button onClick={() => setViewMode('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'history' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>السجل العام</button>
      </div>

      {viewMode === 'active' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Clock size={18} className="text-yellow-500" /> قيد التحضير في المعمل (للتنسيق المسبق مع الزبون)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedOrders.filter(o => ['pending', 'baking'].includes(o.status)).map(o => (
                <DeliveryOrderCard key={o.id} order={o} color="yellow" onSelect={() => setSelectedOrder(o)} />
              ))}
              {displayedOrders.filter(o => ['pending', 'baking'].includes(o.status)).length === 0 && <p className="text-sm text-gray-400 py-2 col-span-full text-center">لا توجد طلبات في المعمل حالياً.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Package size={18} className="text-blue-500" /> جاهز للشحن</h3>
              <div className="grid grid-cols-1 gap-3">
                {displayedOrders.filter(o => o.status === 'ready').map(o => (
                  <DeliveryOrderCard key={o.id} order={o} color="blue" onSelect={() => setSelectedOrder(o)} />
                ))}
                {displayedOrders.filter(o => o.status === 'ready').length === 0 && <p className="text-sm text-gray-400 py-2 col-span-full text-center">لا توجد طلبات جاهزة للشحن.</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Truck size={18} className="text-purple-500" /> في الطريق للعميل</h3>
              <div className="grid grid-cols-1 gap-3">
                {displayedOrders.filter(o => o.status === 'out_for_delivery').map(o => (
                  <DeliveryOrderCard key={o.id} order={o} color="purple" onSelect={() => setSelectedOrder(o)} />
                ))}
                {displayedOrders.filter(o => o.status === 'out_for_delivery').length === 0 && <p className="text-sm text-gray-400 py-2 col-span-full text-center">لا يوجد سائقون في الخارج.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Table headers={['رقم الطلب', 'العميل', 'الهاتف', 'الدفع', 'تاريخ التسليم', 'العنوان', 'الفاتورة']}>
          {displayedOrders.map(o => (
            <tr key={o.id} className="hover:bg-gray-50">
              <td className="p-4 font-mono text-xs text-gray-500 font-bold">#{formatOrderNum(o)}</td>
              <td className="p-4 font-medium">
                {o.customerName || 'غير محدد'}
                {o.receivedByName && <div className="text-[10px] text-gray-500 mt-1">المستلم: {o.receivedByName}</div>}
              </td>
              <td className="p-4 dir-ltr text-right text-sm font-mono flex items-center justify-end gap-2">
                <a href={`tel:${o.phone}`} className="text-blue-500 hover:text-blue-700"><Phone size={14} /></a>
                <a href={`https://wa.me/${String(o.phone).replace(/[^0-9+]/g, '')}`} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-700"><Phone size={14} /></a>
                {o.phone || '-'}
              </td>
              <td className="p-4"><span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${o.paymentType === 'آجل' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{o.paymentType || 'نقد'}</span></td>
              <td className="p-4 text-sm text-gray-500">{formatDate(o.completedAt)}</td>
              <td className="p-4 text-sm text-gray-600 truncate max-w-[150px]" title={o.address}>{o.address || '-'}</td>
              <td className="p-4"><button onClick={() => setPrintData({ ...o, printType: 'invoice' })} className="text-gray-600 hover:text-gray-800 p-2 bg-gray-100 rounded-lg transition-colors"><Printer size={16} /></button></td>
            </tr>
          ))}
        </Table>
      )}

      <OrderDetailsModal
        isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder}
        type={detailsModalType(selectedOrder)}
        onPrimaryAction={selectedOrder?.status === 'ready' ? handleDispatch : handleDelivered}
        onSecondaryAction={(o) => setPrintData({ ...o, printType: 'invoice' })}
        isProcessing={uiProcessing}
      />
    </div>
  );
};
