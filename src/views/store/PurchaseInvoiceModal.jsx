import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { formatMoney } from '../../utils/format';

// نفس قوائم الفئة/الوحدة الموجودة في InventoryFormModal.jsx تماماً — تكرار
// مقصود لبقاء ذلك المكوّن (المخصَّص الآن فقط لتعديل مادة موجودة مباشرة) بلا
// أي تعديل، بدل ربطه بنموذج فاتورة الشراء متعددة الأصناف الجديد.
const ITEM_TYPES = [
  { value: 'مكونات', label: 'مكونات ومواد خام' },
  { value: 'تغليف', label: 'مواد تغليف وعلب' },
  { value: 'معدات', label: 'معدات وأدوات' },
];
const UNITS = ['كجم', 'جرام', 'قطعة', 'لتر'];
const ITEMS_DATALIST_ID = 'purchase-invoice-existing-items';

const PurchaseItemRow = ({ item, index, canRemove, onChange, onRemove }) => {
  const lineTotal = Number(item.quantity || 0) * Number(item.price || 0);
  return (
    <div className="grid grid-cols-12 gap-2 items-start bg-gray-50 border border-gray-100 rounded-lg p-3">
      <div className="col-span-12 md:col-span-4">
        <label className="block text-[11px] font-bold text-gray-500 mb-1">الصنف</label>
        <input
          list={ITEMS_DATALIST_ID} required placeholder="اكتب اسم الصنف أو اختر من القائمة..."
          value={item.itemName} onChange={e => onChange(index, 'itemName', e.target.value)}
          className="w-full p-2 border rounded-lg outline-none text-sm bg-white focus:ring-2 focus:ring-amber-500"
        />
        {!item.inventoryId && item.itemName.trim() && (
          <p className="text-[10px] text-blue-600 font-bold mt-1">➕ صنف جديد سيُضاف للمخزون</p>
        )}
      </div>
      <div className="col-span-6 md:col-span-2">
        <label className="block text-[11px] font-bold text-gray-500 mb-1">الفئة</label>
        <select value={item.type} onChange={e => onChange(index, 'type', e.target.value)} className="w-full p-2 border rounded-lg outline-none text-sm bg-white">
          {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="col-span-6 md:col-span-2">
        <label className="block text-[11px] font-bold text-gray-500 mb-1">الوحدة</label>
        <select value={item.unit} onChange={e => onChange(index, 'unit', e.target.value)} className="w-full p-2 border rounded-lg outline-none text-sm bg-white">
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="col-span-4 md:col-span-1">
        <label className="block text-[11px] font-bold text-gray-500 mb-1">الكمية</label>
        <input type="number" required min="0.01" step="0.01" value={item.quantity} onChange={e => onChange(index, 'quantity', e.target.value)} className="w-full p-2 border rounded-lg outline-none text-sm text-center" />
      </div>
      <div className="col-span-4 md:col-span-2">
        <label className="block text-[11px] font-bold text-gray-500 mb-1">سعر الوحدة</label>
        <input type="number" required min="0" step="1" value={item.price} onChange={e => onChange(index, 'price', e.target.value)} className="w-full p-2 border rounded-lg outline-none text-sm text-center" />
      </div>
      <div className="col-span-3 md:col-span-1 flex flex-col justify-between h-full">
        <label className="block text-[11px] font-bold text-gray-500 mb-1">الإجمالي</label>
        <span className="text-xs font-bold text-amber-700 py-2">{formatMoney(lineTotal)}</span>
      </div>
      <div className="col-span-1 flex items-end justify-end h-full pb-1">
        {canRemove && <button type="button" onClick={() => onRemove(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="إزالة الصنف"><Trash2 size={16} /></button>}
      </div>
    </div>
  );
};

// مستند إدخال مخزني كفاتورة شراء واحدة تضم عدة أصناف: مورّد ورقم فاتورة
// موحّدان لكامل الفاتورة، وسطر مستقل لكل صنف (يُطابَق تلقائياً بمادة موجودة
// عبر القائمة المقترحة، أو يُضاف كمادة جديدة إن كُتب اسم غير موجود). الحفظ
// يمرّ بالكامل عبر purchaseInventoryBatch (نفس معادلة متوسط التكلفة، وقيد
// مصروف واحد بإجمالي الفاتورة بدل قيد لكل صنف).
export const PurchaseInvoiceModal = ({ isOpen, onClose, inventory, form, grandTotal, isProcessing, onFieldChange, onItemChange, onAddItem, onRemoveItem, onSubmit }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="فاتورة شراء مخزون" maxWidth="max-w-4xl">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-800 font-bold">سيُحدَّث رصيد ومتوسط تكلفة كل صنف تلقائياً، وستُسجَّل قيمة الفاتورة كاملةً كقيد مصروف واحد في السجل المالي — بلا أي إدخال يدوي إضافي.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الشركة الموردة (اختياري)</label>
          <input type="text" value={form.supplier} onChange={e => onFieldChange('supplier', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رقم فاتورة الشراء (اختياري)</label>
          <input type="text" value={form.invoiceNum} onChange={e => onFieldChange('invoiceNum', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none font-mono" />
        </div>
      </div>

      <datalist id={ITEMS_DATALIST_ID}>
        {inventory.map(i => <option key={i.id} value={i.itemName} />)}
      </datalist>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-bold text-gray-700">أصناف الفاتورة</label>
          <button type="button" onClick={onAddItem} className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors"><Plus size={14} /> إضافة صنف</button>
        </div>
        {form.items.map((item, index) => (
          <PurchaseItemRow
            key={item.rowId} item={item} index={index}
            canRemove={form.items.length > 1} onChange={onItemChange} onRemove={onRemoveItem}
          />
        ))}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center">
        <span className="text-sm font-bold text-green-900">إجمالي الفاتورة</span>
        <span className="text-2xl font-bold text-green-700">{formatMoney(grandTotal)} IQD</span>
      </div>

      <button type="submit" disabled={isProcessing} className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mt-2 shadow-md">
        {isProcessing ? 'جاري الحفظ...' : 'تأكيد الفاتورة وحفظ الجميع'}
      </button>
    </form>
  </Modal>
);
