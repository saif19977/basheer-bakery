import { useState } from 'react';
import { CheckCircle, ChefHat, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Table } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { ProductionOrderCard } from './production/ProductionOrderCard';
import { CompletionModal } from './production/CompletionModal';
import { useActionLock } from '../hooks/useActionLock';
import { completeProductionOrder, startBakingOrder } from '../services/ordersService';
import { formatDate, formatOrderNum } from '../utils/format';
import { getItemDisplayName, getOrderItems } from '../utils/orderItems';

const RECENT_COMPLETED_COUNT = 10;

// يجمّع الطلبات حسب تاريخ التسليم (بصيغة عربية) لعرضها كأعمدة يومية.
function groupOrdersByDate(ordersList) {
  return ordersList.reduce((acc, o) => {
    const dObj = o.deliveryDate ? new Date(o.deliveryDate) : null;
    let d = 'تاريخ غير محدد';
    if (dObj && !isNaN(dObj.getTime())) {
      d = dObj.toLocaleDateString('ar-IQ', { timeZone: 'Asia/Baghdad', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (!acc[d]) acc[d] = [];
    acc[d].push(o);
    return acc;
  }, {});
}

const ProductionColumn = (props) => {
  const { title, icon: Icon, iconColor, tone, groupedOrders, emptyMessage, cardType, onSelectOrder } = props;
  return (
    <div className={`${tone.bg} rounded-xl shadow-sm border ${tone.border} p-4`}>
      <h3 className={`font-bold ${tone.text} mb-4 flex items-center gap-2 text-lg`}><Icon className={iconColor} /> {title}</h3>
      {Object.keys(groupedOrders).length === 0 ? <p className="text-sm text-gray-400 text-center py-4">{emptyMessage}</p> : (
        Object.entries(groupedOrders).sort().map(([date, ordersList]) => (
          <div key={date} className="mb-4">
            <h4 className={`${tone.dateHeaderBg} ${tone.dateHeaderText} px-3 py-1.5 rounded-t-lg font-bold text-sm shadow-sm`}>{date}</h4>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 ${tone.groupBg} border-x border-b ${tone.border} rounded-b-lg`}>
              {ordersList.map(o => <ProductionOrderCard key={o.id} order={o} type={cardType} onSelect={() => onSelectOrder(o)} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export const ProductionView = () => {
  const { orders, recipes, inventory, setPrintData, showNotification, uploadToStorage } = useAppContext();

  const pendingOrders = orders.filter(o => o?.status === 'pending');
  const bakingOrders = orders.filter(o => o?.status === 'baking');
  const completedOrders = orders.filter(o => o && ['ready', 'out_for_delivery', 'completed'].includes(o.status)).slice(0, RECENT_COMPLETED_COUNT);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderType, setOrderType] = useState('');
  const [completionModal, setCompletionModal] = useState({ isOpen: false, order: null, finalImage: '' });
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  const actionLock = useActionLock({ withGlobalLock: true });
  const uiProcessing = !!actionLock.processingId;

  const handleStartBaking = async (order) => {
    if (actionLock.isLocked(order.id)) return;
    actionLock.lock(order.id);
    try {
      const result = await startBakingOrder(order, { recipes, inventory });
      setSelectedOrder(null);

      if (result.alreadyDeducted) {
        showNotification('تم نقل الطلب إلى مرحلة جاري التحضير.');
        return;
      }
      if (result.missingRecipes.length > 0) {
        showNotification(`⚠️ بدأ التحضير، لكن لم تخصم مواد لصنف (${result.missingRecipes.join('، ')}) لعدم وجود معادلة.`);
      } else if (result.deductedItemsCount > 0) {
        showNotification('✅ تم البدء بالتحضير وخصم المواد من المستودع بنجاح!');
      } else {
        showNotification('✅ تم نقل الطلب إلى مرحلة جاري التحضير.');
      }
    } catch {
      actionLock.release(order.id);
    } finally {
      actionLock.finish();
    }
  };

  const triggerCompletion = (order) => {
    setSelectedOrder(null);
    setCompletionModal({ isOpen: true, order, finalImage: '' });
  };

  const handleCompleteUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setIsUploadingImg(true);
    showNotification('⏳ جاري رفع صورة المنتج للسيرفر...');
    const url = await uploadToStorage(file);
    if (url) {
      setCompletionModal(prev => ({ ...prev, finalImage: url }));
      showNotification('✅ تم رفع الصورة بنجاح!');
    }
    setIsUploadingImg(false);
  };

  const confirmCompletion = async () => {
    const orderId = completionModal.order?.id;
    if (actionLock.isLocked(orderId) || isUploadingImg) return;
    actionLock.lock(orderId);
    try {
      await completeProductionOrder(orderId, completionModal.finalImage);
      setCompletionModal({ isOpen: false, order: null, finalImage: '' });
      showNotification('✅ تم إنجاز الطلب وهو جاهز الآن للتوصيل!');
    } catch {
      actionLock.release(orderId);
    } finally {
      actionLock.finish();
    }
  };

  const handlePrintProduction = (order) => setPrintData({ ...order, printType: 'production' });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">خط الإنتاج (المعمل)</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductionColumn
          title="بانتظار التحضير" icon={Clock} iconColor="text-yellow-600"
          tone={{ bg: 'bg-yellow-50/50', border: 'border-yellow-200', text: 'text-yellow-800', dateHeaderBg: 'bg-yellow-200', dateHeaderText: 'text-yellow-900', groupBg: 'bg-yellow-100/30' }}
          groupedOrders={groupOrdersByDate(pendingOrders)} emptyMessage="لا توجد طلبات معلقة."
          cardType="production_pending" onSelectOrder={(o) => { setSelectedOrder(o); setOrderType('production_pending'); }}
        />
        <ProductionColumn
          title="جاري التحضير" icon={ChefHat} iconColor="text-orange-600"
          tone={{ bg: 'bg-orange-50/50', border: 'border-orange-200', text: 'text-orange-800', dateHeaderBg: 'bg-orange-200', dateHeaderText: 'text-orange-900', groupBg: 'bg-orange-100/30' }}
          groupedOrders={groupOrdersByDate(bakingOrders)} emptyMessage="لا يوجد عمل قيد الإنجاز."
          cardType="production_baking" onSelectOrder={(o) => { setSelectedOrder(o); setOrderType('production_baking'); }}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle size={20} className="text-green-500" /> سجل المنجز للإنتاج</h3>
        <Table headers={['رقم الطلب', 'صورة النهاية', 'العناصر', 'وقت الإنجاز', 'الحالة']}>
          {completedOrders.map(o => {
            const items = getOrderItems(o);
            const displayTitle = items.length > 1 ? `طلب متعدد (${items.length})` : getItemDisplayName(items[0]);
            return (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-sm text-gray-500 font-bold">#{formatOrderNum(o)}</td>
                <td className="p-4">
                  {o.finalImage ? (
                    <img src={o.finalImage} className="w-12 h-12 rounded object-cover border border-green-400 shadow-sm cursor-pointer" alt="final" />
                  ) : <span className="text-xs text-gray-400">لا توجد</span>}
                </td>
                <td className="p-4 font-medium text-sm">{displayTitle}</td>
                <td className="p-4 text-sm text-gray-500">{formatDate(o.updatedAt || o.createdAt)}</td>
                <td className="p-4"><StatusBadge status={o.status || 'completed'} /></td>
              </tr>
            );
          })}
          {completedOrders.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-400">السجل فارغ.</td></tr>}
        </Table>
      </div>

      <OrderDetailsModal
        isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} type={orderType}
        onPrimaryAction={orderType === 'production_pending' ? handleStartBaking : triggerCompletion}
        onSecondaryAction={handlePrintProduction}
        isProcessing={uiProcessing}
      />

      <CompletionModal
        isOpen={completionModal.isOpen} order={completionModal.order} finalImage={completionModal.finalImage}
        isUploadingImg={isUploadingImg} isProcessing={uiProcessing}
        onClose={() => setCompletionModal({ isOpen: false, order: null, finalImage: '' })}
        onUploadImage={handleCompleteUpload} onConfirm={confirmCompletion}
      />
    </div>
  );
};
