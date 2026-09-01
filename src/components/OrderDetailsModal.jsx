import { Cake, CheckCircle, Phone, Play, Printer, Receipt, Truck, ZoomIn } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Countdown } from './ui/Countdown';
import { useAppContext } from '../context/AppContext';
import { formatMoney, formatOrderNum } from '../utils/format';
import { getItemDisplayName, getItemImages, getOrderItems } from '../utils/orderItems';

// نافذة تفاصيل طلب موحّدة تُستخدم من شاشتي الإنتاج والتوصيل، بأزرار إجراء
// مختلفة حسب `type`. `hideSensitiveInfo` تُخفي بيانات العميل عن شاشة الإنتاج
// (المعمل لا يحتاج رقم هاتف العميل أو عنوانه).
export const OrderDetailsModal = ({ isOpen, onClose, order, type, onPrimaryAction, onSecondaryAction, isProcessing }) => {
  const { setZoomedImage } = useAppContext();
  if (!isOpen || !order) return null;

  const hideSensitiveInfo = type ? String(type).includes('production') : false;
  const items = getOrderItems(order);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل طلب #${formatOrderNum(order)}`} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {!hideSensitiveInfo && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-gray-800 text-lg">{order.customerName || 'غير محدد'}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1"><Phone size={10} /> {order.contactMethod || 'مباشر'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-bold ${order.paymentType === 'آجل' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>{order.paymentType || 'نقد'}</span>
                </div>
              </div>
              <span className="font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 text-lg">{formatMoney(order.price)} IQD</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-gray-600 dir-ltr font-mono font-bold">{order.phone || '-'}</p>
              <a href={`tel:${order.phone}`} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono hover:bg-blue-100 transition-colors flex items-center gap-1"><Phone size={10} /> اتصال</a>
              <a href={`https://wa.me/${String(order.phone).replace(/[^0-9+]/g, '')}`} target="_blank" rel="noreferrer" className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded hover:bg-green-100 transition-colors flex items-center gap-1"><Phone size={10} /> واتساب</a>
            </div>
            <p className="text-sm text-gray-700 bg-white p-2 rounded border"><span className="font-bold">العنوان:</span> {order.address || '-'}</p>
            {order.notes && <p className="mt-2 text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200"><span className="font-bold">ملاحظات التوصيل:</span> {order.notes}</p>}
          </div>
        )}

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
          <p className="text-sm font-bold text-amber-900 border-b border-amber-200 pb-2 mb-3">الأصناف المطلوبة ({items.length}):</p>
          {items.map((i, idx) => {
            const itemImages = getItemImages(i);
            return (
              <div key={idx} className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm flex flex-col">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-amber-900 text-sm">{getItemDisplayName(i)}</p>
                      <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold text-xs shadow-sm">{i.quantity} ق</span>
                    </div>
                    <p className="text-xs text-amber-700 mb-1">{i.cakeSize} {i.weight && `| ${i.weight}`} {i.orderSource === 'ready_made' && <span className="bg-green-100 text-green-700 px-1 rounded mx-1">مخزن</span>}</p>
                    {i.itemNotes && <p className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100"><span className="font-bold">ملاحظات:</span> {i.itemNotes}</p>}
                  </div>
                </div>
                {/* عرض مجموعة الصور */}
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2 custom-scrollbar">
                  {itemImages.map((img, imgIdx) => (
                    <div key={imgIdx} className="relative cursor-pointer group flex-shrink-0" onClick={() => setZoomedImage(img)}>
                      <img src={img} className="w-16 h-16 object-cover rounded border shadow-sm" alt="item" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center"><ZoomIn size={16} className="text-white" /></div>
                    </div>
                  ))}
                  {itemImages.length === 0 && (
                    <div className="w-16 h-16 bg-gray-50 border rounded flex items-center justify-center text-gray-300 flex-shrink-0"><Cake size={24} /></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center p-3 bg-gray-50 rounded-xl border border-gray-200"><Countdown deliveryDate={order.deliveryDate} /></div>

        {order.finalImage && (
          <div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-4 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => setZoomedImage(order.finalImage)}>
            <p className="text-sm font-bold text-green-800 mb-3 flex items-center justify-center gap-2"><CheckCircle size={16} /> الصورة النهائية للمنتج (اضغط للتكبير)</p>
            <img src={order.finalImage} alt="final" className="w-full max-h-48 object-contain rounded-lg border border-green-300 shadow-sm mx-auto bg-white" />
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex gap-2 flex-wrap">
          {type === 'production_pending' && <button onClick={() => onPrimaryAction(order)} disabled={isProcessing} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2">{isProcessing ? 'جاري المعالجة...' : <><Play size={20} /> البدء بالتحضير وخصم المواد</>}</button>}
          {type === 'production_baking' && (
            <><button onClick={() => onPrimaryAction(order)} disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2">{isProcessing ? 'جاري المعالجة...' : <><CheckCircle size={20} /> تأكيد الإنجاز النهائي</>}</button><button onClick={() => onSecondaryAction(order)} disabled={isProcessing} className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-4 py-3 rounded-lg shadow-md" title="طباعة تذكرة عمل (للمعمل)"><Printer size={20} /></button></>
          )}
          {type === 'delivery_dispatch' && (
            <><button onClick={() => onPrimaryAction(order)} disabled={isProcessing} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2">{isProcessing ? 'جاري المعالجة...' : <><Truck size={20} /> إرسال مع السائق</>}</button>
            <button onClick={() => onSecondaryAction(order)} disabled={isProcessing} className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-4 py-3 rounded-lg shadow-md" title="طباعة فاتورة التوصيل للزبون"><Receipt size={20} /></button></>
          )}
          {type === 'delivery_complete' && (
            <><button onClick={() => onPrimaryAction(order)} disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2">{isProcessing ? 'جاري المعالجة...' : <><CheckCircle size={20} /> تأكيد التوصيل</>}</button>
            <button onClick={() => onSecondaryAction(order)} disabled={isProcessing} className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-4 py-3 rounded-lg shadow-md" title="طباعة فاتورة التوصيل للزبون"><Receipt size={20} /></button></>
          )}
          {type === 'delivery_view_only' && (
            <div className="w-full text-center p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg font-bold">هذا الطلب لا يزال في المعمل - يُستخدم هذا العرض للتنسيق مع الزبون فقط.</div>
          )}
        </div>
      </div>
    </Modal>
  );
};
