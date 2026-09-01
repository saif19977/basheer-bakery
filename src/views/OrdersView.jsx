import { useMemo, useState } from 'react';
import { Edit, Image as ImageIcon, Phone, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Table } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Countdown } from '../components/ui/Countdown';
import { OrderFormModal } from './orders/OrderFormModal';
import { useOrderForm } from './orders/useOrderForm';
import { useSubmitLock } from '../hooks/useSubmitLock';
import { cancelOrder } from '../services/ordersService';
import { formatMoney, formatOrderNum, safeStr } from '../utils/format';
import { getItemDisplayName, getOrderItems } from '../utils/orderItems';

const ACTIVE_STATUSES = ['pending', 'baking', 'ready', 'out_for_delivery'];

// أحدث بيانات تواصل لكل عميل (بالاسم) مبنية من سجل الطلبات، لتعبئة نموذج
// الطلب الجديد تلقائياً عند اختيار عميل سابق.
function buildUniqueCustomers(orders) {
  const custMap = {};
  orders.forEach(o => {
    if (o?.status === 'cancelled' || !o?.phone) return;
    if (!custMap[o.phone] || new Date(o.createdAt || 0) > new Date(custMap[o.phone].date)) {
      custMap[o.phone] = { name: o.customerName || '', phone: o.phone, address: o.address || '', contactMethod: o.contactMethod || 'واتساب', date: o.createdAt };
    }
  });
  return Object.values(custMap);
}

function filterOrders(orders, { searchTerm, filter }) {
  return orders.filter(o => {
    if (!o) return false;
    const s = safeStr(searchTerm);
    const matchesSearch = safeStr(o.customerName).includes(s) || safeStr(o.phone).includes(s)
      || safeStr(formatOrderNum(o)).includes(s) || safeStr(o.address).includes(s);
    if (!matchesSearch) return false;

    if (filter === 'active') return ACTIVE_STATUSES.includes(o.status);
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'cancelled') return o.status === 'cancelled';
    return true;
  });
}

const FILTERS = [
  { id: 'active', label: 'الطلبات النشطة', activeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'completed', label: 'سجل المنجز', activeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'cancelled', label: 'الطلبات الملغاة', activeClass: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'all', label: 'الكل', activeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
];

const orderRowImage = (order, items) => order.finalImage || items[0]?.itemImages?.[0] || items[0]?.itemImage || (order.images && order.images[0]);

export const OrdersView = () => {
  const { orders, finishedGoods, dynamicCategories, isManagerOrAdmin, showNotification, setPrintData, setZoomedImage, user, myProfile, uploadToStorage } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('active');
  const [cancelModal, setCancelModal] = useState(null);

  // نفس قفل الإرسال يُستخدم لحفظ الطلب ولإلغائه، تماماً كما في الأصل
  // (لا يمكن تنفيذ الاثنين في آنٍ واحد).
  const submitLock = useSubmitLock();

  const uniqueCustomers = useMemo(() => buildUniqueCustomers(orders), [orders]);
  const filteredOrders = useMemo(() => filterOrders(orders, { searchTerm, filter }), [orders, searchTerm, filter]);

  const orderForm = useOrderForm({
    dynamicCategories, finishedGoods, orders, user, myProfile, uploadToStorage, showNotification, submitLock,
  });

  const confirmCancelOrder = async () => {
    if (submitLock.isLocked()) return;
    const order = cancelModal;
    if (!order) return;
    submitLock.lock();
    try {
      await cancelOrder(order, finishedGoods);
      showNotification('تم إلغاء الطلب واسترجاع الكميات للمخزن التام.');
      setCancelModal(null);
    } finally {
      submitLock.unlockAfter(1500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">إدارة الطلبات</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم، الهاتف، العنوان..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
          <button onClick={orderForm.openCreateModal} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"><Plus size={20} /> طلب جديد</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.id ? f.activeClass : 'bg-white text-gray-600 border'}`}>{f.label}</button>
        ))}
      </div>

      <Table headers={['الصور', 'رقم الطلب', 'العميل والتوصيل', 'الأصناف', 'الموعد', 'الحالة', 'إجراء']}>
        {filteredOrders.map(o => {
          const items = getOrderItems(o);
          const displayImg = orderRowImage(o, items);
          return (
            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4">
                {displayImg ? (
                  <div className="relative inline-block cursor-pointer" onClick={() => setZoomedImage(displayImg)}>
                    <img src={displayImg} className={`w-12 h-12 rounded-lg object-cover border-2 shadow-sm ${o.finalImage ? 'border-green-500' : 'border-gray-200'}`} title="انقر للتكبير" alt="cake" />
                    {o.finalImage && <span className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] px-1 rounded shadow">النهائي</span>}
                  </div>
                ) : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border"><ImageIcon size={20} /></div>}
              </td>
              <td className="p-4 font-mono text-sm text-gray-500 font-bold">#{formatOrderNum(o)}</td>
              <td className="p-4">
                <p className="font-medium text-gray-800">{o.customerName || 'غير محدد'}</p>
                {isManagerOrAdmin && o.createdByName && <span className="text-[9px] text-gray-500 bg-gray-100 px-1 rounded border">أُدخل بواسطة: {o.createdByName}</span>}

                <div className="mt-1 flex items-center gap-2">
                  <a href={`tel:${o.phone}`} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono hover:bg-blue-100 transition-colors flex items-center gap-1"><Phone size={10} /> اتصال</a>
                  <a href={`https://wa.me/${String(o.phone).replace(/[^0-9+]/g, '')}`} target="_blank" rel="noreferrer" className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded hover:bg-green-100 transition-colors flex items-center gap-1"><Phone size={10} /> واتساب</a>
                </div>
                <p className="text-xs text-gray-600 mt-1 max-w-[150px] truncate" title={o.address}>{o.address}</p>
              </td>
              <td className="p-4 text-sm text-gray-700">
                {items.map((i, idx) => (
                  <div key={idx} className="mb-1 text-xs">
                    <span className="font-bold">{i.quantity}x {getItemDisplayName(i)}</span>
                    {i.orderSource === 'ready_made' && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded mx-1">مخزن</span>}
                  </div>
                ))}
                <div className="font-bold text-amber-600 mt-1 border-t pt-1 border-gray-100">الإجمالي: {formatMoney(o.price)} IQD</div>
              </td>
              <td className="p-4"><Countdown deliveryDate={o.deliveryDate} /></td>
              <td className="p-4"><StatusBadge status={o.status || 'pending'} /></td>
              <td className="p-4 flex gap-2">
                <button onClick={() => setPrintData({ ...o, printType: 'invoice' })} className="text-gray-600 hover:text-gray-800 p-2 bg-gray-100 rounded-lg transition-colors" title="طباعة الفاتورة"><Printer size={18} /></button>
                <button onClick={() => orderForm.openEditModal(o)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg transition-colors" title="تعديل"><Edit size={18} /></button>
                {o.status !== 'cancelled' && o.status !== 'completed' && (
                  <button onClick={() => setCancelModal(o)} className="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-lg transition-colors" title="إلغاء الطلب واسترجاع المخزون"><Trash2 size={18} /></button>
                )}
              </td>
            </tr>
          );
        })}
        {filteredOrders.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-400">لا توجد طلبات مطابقة.</td></tr>}
      </Table>

      <ConfirmModal
        isOpen={!!cancelModal} onClose={() => setCancelModal(null)} title="تأكيد الإلغاء"
        message="هل أنت متأكد من رغبتك في إلغاء هذا الطلب نهائياً؟ (سيتم استرجاع الكميات المسحوبة من المخزن التام تلقائياً)"
        confirmLabel="نعم، إلغاء الطلب" processingLabel="جاري الإلغاء..."
        isProcessing={submitLock.isProcessing} onConfirm={confirmCancelOrder}
      />

      <OrderFormModal
        isOpen={orderForm.isModalOpen}
        onClose={orderForm.closeModal}
        editingId={orderForm.editingId}
        form={orderForm.form}
        uniqueCustomers={uniqueCustomers}
        dynamicCategories={dynamicCategories}
        finishedGoods={finishedGoods}
        isProcessing={orderForm.isProcessing}
        isUploadingImg={orderForm.isUploadingImg}
        onCustomerSelect={(val) => orderForm.handleCustomerSelect(val, uniqueCustomers)}
        onFieldChange={orderForm.handleFieldChange}
        onDeliveryFeeChange={orderForm.handleDeliveryFeeChange}
        onItemChange={orderForm.handleItemChange}
        onAddItem={orderForm.addItem}
        onRemoveItem={orderForm.removeItem}
        onItemImageUpload={orderForm.handleItemImageUpload}
        onRemoveItemImage={orderForm.removeItemImage}
        onZoomImage={setZoomedImage}
        onSubmit={orderForm.handleSubmit}
      />
    </div>
  );
};
