import { Loader2, Plus } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { OrderItemEditor } from './OrderItemEditor';
import { formatMoney } from '../../utils/format';

// نموذج إنشاء/تعديل طلب. كل الحالة تُدار في useOrderForm (الهوك المستدعي)،
// وهذا المكوّن مسؤول فقط عن العرض وربط الأحداث.
export const OrderFormModal = ({
  isOpen, onClose, editingId, form, uniqueCustomers, dynamicCategories, finishedGoods,
  isProcessing, isUploadingImg,
  onCustomerSelect, onFieldChange, onDeliveryFeeChange, onItemChange, onAddItem, onRemoveItem,
  onItemImageUpload, onRemoveItemImage, onZoomImage, onSubmit,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={editingId ? 'تعديل الطلب' : 'إنشاء طلب جديد'} maxWidth="max-w-4xl">
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">بيانات العميل والتوصيل</h3>

        {!editingId && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 relative">
            <label className="block text-xs font-bold text-blue-900 mb-2">البحث وتعبئة بيانات عميل سابق</label>
            <input list="customers-list" placeholder="اكتب اسم العميل ليتم البحث..." onChange={(e) => onCustomerSelect(e.target.value)} className="w-full p-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
            <datalist id="customers-list">
              {uniqueCustomers.map(c => <option key={c.phone} value={c.name} />)}
            </datalist>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div><label className="block text-xs font-bold text-gray-700 mb-1">اسم العميل</label><input type="text" required value={form.customerName} onChange={e => onFieldChange('customerName', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف</label><input type="text" required value={form.phone} onChange={e => onFieldChange('phone', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dir-ltr text-right" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1">طريقة التواصل</label><select value={form.contactMethod} onChange={e => onFieldChange('contactMethod', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"><option value="مباشر">مباشر (المحل)</option><option value="واتساب">واتساب</option><option value="فيسبوك">فيسبوك</option><option value="انستغرام">انستغرام</option></select></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1">حالة الدفع</label><select value={form.paymentType} onChange={e => onFieldChange('paymentType', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold"><option value="نقد">نقد (استلام فوري/عند التوصيل)</option><option value="آجل">بالآجل (ديون على العميل)</option></select></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold text-gray-700 mb-1">عنوان التوصيل الدقيق</label><input type="text" required value={form.address} onChange={e => onFieldChange('address', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
          <div className="flex gap-2">
            <div className="flex-1"><label className="block text-xs font-bold text-gray-700 mb-1">موعد التسليم للزبون</label><input type="datetime-local" required value={form.deliveryDate} onChange={e => onFieldChange('deliveryDate', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
            <div className="w-32"><label className="block text-xs font-bold text-gray-700 mb-1">سعر التوصيل (IQD)</label><input type="number" min="0" step="1" value={form.deliveryFee} onChange={e => onDeliveryFeeChange(e.target.value)} className="w-full p-2.5 border border-amber-300 bg-amber-50 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-amber-900">الأصناف المطلوبة</h3>
          <button type="button" onClick={onAddItem} className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-700 flex items-center gap-1 font-bold"><Plus size={16} /> إضافة صنف جديد</button>
        </div>

        {form.items.map((item, index) => (
          <OrderItemEditor
            key={item.id}
            item={item}
            index={index}
            canRemove={form.items.length > 1}
            isEditing={!!editingId}
            isUploadingImg={isUploadingImg}
            isProcessing={isProcessing}
            dynamicCategories={dynamicCategories}
            finishedGoods={finishedGoods}
            onChange={onItemChange}
            onRemove={onRemoveItem}
            onImageUpload={onItemImageUpload}
            onRemoveImage={onRemoveItemImage}
            onZoomImage={onZoomImage}
          />
        ))}

        <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl border-2 border-amber-500 shadow-md">
          <span className="font-bold text-amber-900 text-lg">المبلغ الإجمالي الكلي للطلب (يتم حسابه تلقائياً):</span>
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg">
            <span className="font-bold text-2xl text-amber-900">{formatMoney(form.totalPrice)}</span>
            <span className="font-bold text-amber-700">IQD</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label className="block text-sm font-bold text-gray-700 mb-1">ملاحظات عامة للطلب (للتوصيل والإدارة)</label>
        <textarea value={form.globalNotes} onChange={e => onFieldChange('globalNotes', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" rows="2" placeholder="مثال: يرجى الاتصال قبل الوصول بنصف ساعة..."></textarea>
      </div>

      <button type="submit" disabled={isProcessing || isUploadingImg} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold py-4 rounded-xl mt-6 transition-colors text-lg shadow-lg flex items-center justify-center gap-2">
        {isProcessing ? <><Loader2 className="animate-spin" size={24} /> جاري المعالجة...</> : (editingId ? 'حفظ التعديلات' : 'تأكيد واعتماد الطلب')}
      </button>
    </form>
  </Modal>
);
