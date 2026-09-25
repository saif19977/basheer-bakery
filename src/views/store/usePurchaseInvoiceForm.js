import { useState } from 'react';
import { purchaseInventoryBatch } from '../../services/inventoryService';
import { formatMoney } from '../../utils/format';

const emptyItem = () => ({
  rowId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
  itemName: '', type: 'مكونات', unit: 'كجم', quantity: '', price: '', inventoryId: null,
});

const emptyForm = () => ({ supplier: '', invoiceNum: '', items: [emptyItem()] });

// كل سطر يولّد كتابتين على الأكثر (تحديث/إنشاء مستند المخزون + حركة دخول)،
// زائداً كتابة واحدة مشتركة للقيد المالي — حد أقصى آمن يبقي أي فاتورة واحدة
// دون سقف فايربيس الصارم البالغ 500 كتابة لكل batch (200×2+1=401).
const MAX_ITEMS_PER_INVOICE = 200;

// يدير حالة "فاتورة شراء" متعددة الأصناف بأكملها (مورّد ورقم فاتورة موحّدان
// + عدة أسطر أصناف)، مستخدَم من كل من StoreView وFinanceView على حدٍ سواء —
// نفس منطق الحساب والحفظ (purchaseInventoryBatch) بصرف النظر عن نقطة الدخول.
export function usePurchaseInvoiceForm({ inventory, showNotification, submitLock }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm());

  const openModal = () => {
    setForm(emptyForm());
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleFieldChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // عند كتابة/اختيار اسم صنف يطابق مادة موجودة فعلاً في المخزون، تُملأ
  // الفئة والوحدة تلقائياً (وسعر الوحدة إن كان الحقل ما يزال فارغاً فقط، حتى
  // لا يُطمَس سعر بدأ المستخدم كتابته)، ويُحفَظ معرّفها الثابت (inventoryId)
  // ليُستخدم في المطابقة لاحقاً بدل الاعتماد فقط على تطابق الاسم والفئة.
  const handleItemChange = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      let row = { ...items[index], [field]: value };

      if (field === 'itemName') {
        const match = inventory.find(i => i.itemName === value);
        row = match
          ? { ...row, inventoryId: match.id, type: match.type, unit: match.unit, price: row.price === '' ? match.price : row.price }
          : { ...row, inventoryId: null };
      }

      items[index] = row;
      return { ...prev, items };
    });
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (index) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const grandTotal = form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.isLocked()) return;
    submitLock.lock();
    try {
      const validItems = form.items.filter(i => i.itemName.trim() && Number(i.quantity) > 0);
      if (validItems.length === 0) {
        showNotification('❌ أضف صنفاً واحداً على الأقل باسم وكمية صحيحين.');
        return;
      }
      if (validItems.length > MAX_ITEMS_PER_INVOICE) {
        showNotification(`❌ عدد الأصناف كبير جداً لفاتورة واحدة (الحد الأقصى ${MAX_ITEMS_PER_INVOICE}) — يرجى تقسيمها إلى أكثر من فاتورة.`);
        return;
      }

      const result = await purchaseInventoryBatch({
        items: validItems, supplier: form.supplier, invoiceNum: form.invoiceNum, inventory,
      });
      showNotification(`تم تسجيل فاتورة الشراء (${result.itemCount} صنف) بإجمالي ${formatMoney(result.grandTotal)} IQD بنجاح.`);
      if (result.loggedToFinance) showNotification('تم تسجيل قيمة الفاتورة كمصروف واحد في السجل المالي تلقائياً.');
      setModalOpen(false);
      setForm(emptyForm());
    } finally {
      submitLock.unlock();
    }
  };

  return {
    isModalOpen, form, grandTotal, isProcessing: submitLock.isProcessing,
    openModal, closeModal, handleFieldChange, handleItemChange, addItem, removeItem, handleSubmit,
  };
}
