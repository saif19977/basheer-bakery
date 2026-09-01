import { Modal } from '../../components/ui/Modal';

export const InventoryFormModal = ({
  isOpen, onClose, editingInvId, form, setForm, logToFinance, setLogToFinance, isProcessing, onSubmit,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={editingInvId ? 'تعديل بيانات المادة' : 'مستند إدخال مخزني'}>
    <form onSubmit={onSubmit} className="space-y-4">
      {!editingInvId && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
          <p className="text-xs text-blue-800 font-bold">ملاحظة: النظام يعتمد تسعير (المتوسط المرجح). في حال إضافة مادة موجودة مسبقاً بسعر مختلف، سيتم دمج الكميات وحساب متوسط التكلفة الجديد تلقائياً.</p>
        </div>
      )}
      <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم المادة</label><input type="text" required value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none"><option value="مكونات">مكونات ومواد خام</option><option value="تغليف">مواد تغليف وعلب</option><option value="معدات">معدات وأدوات</option></select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label><select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none"><option value="كجم">كجم</option><option value="جرام">جرام</option><option value="قطعة">قطعة</option><option value="لتر">لتر</option></select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{editingInvId ? 'الكمية (تعديل مباشر)' : 'الكمية المدخلة'}</label><input type="number" required min="0" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">سعر الوحدة (IQD)</label><input type="number" step="1" min="0" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none" /></div>
      </div>

      {!editingInvId && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">الشركة الموردة (اختياري)</label><input type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">رقم فاتورة الشراء (اختياري)</label><input type="text" value={form.invoiceNum} onChange={e => setForm({ ...form, invoiceNum: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none font-mono" /></div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border flex items-center gap-3">
            <input type="checkbox" id="logToFinance" checked={logToFinance} onChange={e => setLogToFinance(e.target.checked)} className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 cursor-pointer" />
            <label htmlFor="logToFinance" className="text-sm font-bold text-gray-700 cursor-pointer">تسجيل القيمة الإجمالية كمصروف في سجل المالية تلقائياً</label>
          </div>
        </>
      )}
      <button type="submit" disabled={isProcessing} className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mt-4 shadow-md">{isProcessing ? 'جاري الحفظ...' : (editingInvId ? 'حفظ التعديلات' : 'تأكيد الإدخال وحفظ السعر')}</button>
    </form>
  </Modal>
);
