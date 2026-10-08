import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useSubmitLock } from '../hooks/useSubmitLock';
import { useActionLock } from '../hooks/useActionLock';
import { addManualTransaction, deleteTransaction, receiveDriverCash, receivePartialCreditPayment } from '../services/financeService';
import { PLTab } from './finance/PLTab';
import { DriversTab } from './finance/DriversTab';
import { DebtsTab } from './finance/DebtsTab';
import { CreditLedgerTab } from './finance/CreditLedgerTab';
import { TransactionLogsTab } from './finance/TransactionLogsTab';
import { TransactionFormModal } from './finance/TransactionFormModal';
import { DebtManagementModal } from './finance/DebtManagementModal';
import { PurchaseInvoiceModal } from './store/PurchaseInvoiceModal';
import { usePurchaseInvoiceForm } from './store/usePurchaseInvoiceForm';
import { formatMoney } from '../utils/format';

const EMPTY_TRANSACTION_FORM = { type: 'expense', category: 'operational', amount: '', description: '' };
// تاريخ اليوم بتوقيت بغداد (لا UTC) — بين الساعة 21:00 و23:59 بتوقيت UTC يكون
// التاريخ المحلي في بغداد (UTC+3) قد تجاوز منتصف الليل فعلاً، فلو استُخدم
// new Date().toISOString() هنا لظهر "اليوم" على أنه تاريخ الأمس.
const todayDateString = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
const emptyDebtPaymentForm = () => ({ amount: '', method: 'نقد', date: todayDateString() });

const SUB_TABS = [
  { id: 'pl', label: 'تقرير الأرباح (P&L)' },
  { id: 'drivers', label: 'نقدية السائقين' },
  { id: 'debts', label: 'الديون والذمم' },
  { id: 'creditLedger', label: 'سجل الآجل والجزئي' },
  { id: 'logs', label: 'السجل اليومي' },
];

// يقارن اليوم التقويمي بتوقيت بغداد حصراً لكل من القيمة والحدَّين، بدل تحويل
// كل طرف لطابع زمني UTC بمنطق مختلف (الحد الأول كان يُفسَّر UTC منتصف الليل،
// والحد الثاني محلياً) — هذا التضارب كان يستثني دفعة "اليوم" المدخلة محلياً
// من فلتر "اليوم" نفسه لأي مستخدم شرقي UTC (بغداد UTC+3)، لأن طابعها الزمني
// الفعلي (محوَّل من منتصف ليل محلي) يقع قبل منتصف ليل UTC لنفس التاريخ.
const toBaghdadDateStr = (dateValue) => {
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
};

const withinDateRange = (dateValue, startDate, endDate) => {
  const dayStr = toBaghdadDateStr(dateValue);
  if (!dayStr) return true; // تاريخ غير صالح: لا يُستبعد السجل بسببه
  if (startDate && dayStr < startDate) return false;
  if (endDate && dayStr > endDate) return false;
  return true;
};

export const FinanceView = () => {
  const {
    orders, inventory, transactions, unpaidCreditOrders, pendingDriverCashOrders,
    user, myProfile, showNotification, setPrintData,
  } = useAppContext();

  const [isModalOpen, setModalOpen] = useState(false);
  const [subTab, setSubTab] = useState('pl');
  const [filterCategory, setFilterCategory] = useState('all');
  // فترتان مستقلتان تماماً — قبل هذا الفصل كانت شاشتا P&L والسجل اليومي
  // تتشاركان نفس startDate/endDate، فأي فترة تقرير محددة في P&L (شهر ماضٍ
  // مثلاً) تبقى فاعلة بصمت عند التنقل إلى السجل اليومي، فتُخفي معاملات
  // اليوم (كدفعة دين جديدة) دون أي إشارة أن فلتراً نشطاً يمنع ظهورها.
  const [plStartDate, setPlStartDate] = useState('');
  const [plEndDate, setPlEndDate] = useState('');
  const [logsStartDate, setLogsStartDate] = useState('');
  const [logsEndDate, setLogsEndDate] = useState('');
  const [form, setForm] = useState(EMPTY_TRANSACTION_FORM);

  const submitLock = useSubmitLock();
  // قفل منفصل عن submitLock الخاص بنموذج الحركة اليدوية — نافذتان مستقلتان
  // لا ينبغي أن تتشارك حالة "جارٍ الحفظ" لأحدهما مع الأخرى.
  const purchaseSubmitLock = useSubmitLock();
  const purchaseInvoiceForm = usePurchaseInvoiceForm({ inventory, showNotification, submitLock: purchaseSubmitLock });
  const debtPaymentSubmitLock = useSubmitLock();
  const [debtManagementOrderId, setDebtManagementOrderId] = useState(null);
  const [debtPaymentForm, setDebtPaymentForm] = useState(emptyDebtPaymentForm);
  const [debtPaymentAction, setDebtPaymentAction] = useState(null);
  const actionLock = useActionLock();
  const isRowBusy = (id) => actionLock.isProcessing(id) || actionLock.isLocked(id);

  // فلتر الفئة يبقى مشتركاً عمداً (يخص "أي معاملات تُحتسب" بصرف النظر عن
  // الفترة)، لكن كل تبويب يطبّق فترته الخاصة من هذه القاعدة المصفّاة بالفئة.
  const categoryFilteredTransactions = transactions.filter(t => t && (filterCategory === 'all' || t.category === filterCategory));
  const plFilteredTransactions = categoryFilteredTransactions.filter(t => withinDateRange(t.date, plStartDate, plEndDate));
  const logsFilteredTransactions = categoryFilteredTransactions.filter(t => withinDateRange(t.date, logsStartDate, logsEndDate));

  const calcTotal = (list, condition) => list.filter(condition).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const filteredIncome = calcTotal(plFilteredTransactions, t => t.type === 'income');
  const filteredExpense = calcTotal(plFilteredTransactions, t => t.type === 'expense');

  // ملاحظة: تقرير الأرباح (P&L) لا يزال يعتمد على مصفوفة الطلبات الأخيرة
  // المحدودة (100) لحساب تكلفة البضاعة المباعة ضمن الفترة المختارة — هذا
  // يكفي للفترات الحديثة، لكن فترة قديمة جداً قد تُغفل طلبات خارج هذا الحد.
  // معالجة هذا بشكل كامل تتطلب تقارير تجميعية يومية منفصلة (خارج نطاق هذا الإصلاح).
  const plOrders = orders.filter(o => o && o.status === 'completed' && withinDateRange(o.completedAt, plStartDate, plEndDate));
  const plCogs = plOrders.reduce((sum, o) => sum + Number(o?.cogs || 0), 0);
  const netRevenue = filteredIncome - filteredExpense;
  const finalNetProfit = netRevenue - plCogs;

  // مصدران مستقلان غير محدودين (انظر useAppData) بدل التصفية من مصفوفة
  // الطلبات المحدودة — لا يختفي منهما دين أو مبلغ معلّق مهما قدُم تاريخه.
  const driverCashOrders = pendingDriverCashOrders;
  const creditOrders = unpaidCreditOrders;
  // مشتقّة من creditOrders اللحظي (لا نسخة محلية ثابتة) حتى تعكس نافذة إدارة
  // الدين أي دفعة جديدة أو تحديث للمتبقي فور حدوثه دون إغلاقها وإعادة فتحها.
  // عند التسديد الكامل يختفي الطلب من creditOrders فتُغلَق النافذة تلقائياً.
  const debtManagementOrder = creditOrders.find(o => o.id === debtManagementOrderId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.isLocked()) return;
    submitLock.lock();
    try {
      await addManualTransaction(form);
      setModalOpen(false);
      setForm(EMPTY_TRANSACTION_FORM);
    } finally {
      submitLock.unlock();
    }
  };

  // اعتراض اختيار "مشتريات مخزون" ضمن نموذج الحركة اليدوية: يُغلَق هذا
  // النموذج فوراً وتُفتَح فاتورة الشراء متعددة الأصناف بدلاً منه — التصنيف
  // نفسه يبقى متاحاً في القائمة (وفي سجل/فلتر الحركات لاحقاً)، لكن لا طريق
  // لتسجيله كمصروف يدوي بسيط بلا أي تحديث فعلي للمخزون.
  const handleSelectInventoryPurchase = () => {
    setModalOpen(false);
    setForm(EMPTY_TRANSACTION_FORM);
    purchaseInvoiceForm.openModal();
  };

  // alreadyRecorded لم يعد يعني "لا شيء تغيّر" — buildIdempotentRevenue يُحدّث
  // حالة الطلب دائماً الآن حتى لو كان قيده المالي مسجَّلاً مسبقاً (طلب قديم من
  // الزحف التاريخي مثلاً)، فيختفي من قائمة الانتظار في الحالتين. لذا لا داعي
  // لإنهاء الإجراء مبكراً هنا، فقط تختلف رسالة الإشعار. release(order.id)
  // مُضافة احتياطاً (دفاع إضافي) في حال تأخّر تحديث القائمة اللحظي لأي سبب،
  // حتى لا يبقى الزر معطَّلاً بصرياً بعد أن أُنجز الإجراء فعلياً.
  const confirmDriverCash = async (order) => {
    if (actionLock.isLocked(order.id)) return;
    if (order.cashStatus === 'received_by_finance') {
      showNotification('تم استلام النقدية لهذا الطلب مسبقاً.');
      return;
    }
    actionLock.lock(order.id);
    try {
      const result = await receiveDriverCash(order, { user, myProfile });
      showNotification(result.alreadyRecorded
        ? 'كان هذا الإيراد مسجَّلاً مسبقاً في السجلات — تم تحديث حالة الطلب وإزالته من القائمة بلا تكرار القيد المالي.'
        : 'تم استلام النقدية وتسجيلها في الإيرادات بنجاح.');
      actionLock.release(order.id);
    } catch {
      actionLock.release(order.id);
    } finally {
      actionLock.finish();
    }
  };

  // فتح/إغلاق نافذة إدارة الدين — وجود معرّف الطلب هو ما يحدد فتحها (نفس نمط
  // CustomerNotesModal)، والطلب نفسه مشتقّ لحظياً من creditOrders أعلاه.
  const openDebtManagementModal = (order) => {
    setDebtPaymentForm(emptyDebtPaymentForm());
    setDebtManagementOrderId(order.id);
  };

  const closeDebtManagementModal = () => setDebtManagementOrderId(null);

  // مسار تسديد موحَّد (جزئي أو كامل المتبقي) يُستدعى بمبلغين مختلفين فقط —
  // الخدمة نفسها (receivePartialCreditPayment) تتكفّل بتمييز التسوية الكاملة
  // عبر transaction آمنة من التزامن.
  const submitDebtPayment = async (amount, actionLabel) => {
    if (debtPaymentSubmitLock.isLocked() || !debtManagementOrder) return;
    debtPaymentSubmitLock.lock();
    setDebtPaymentAction(actionLabel);
    try {
      const paymentDateIso = debtPaymentForm.date
        ? new Date(`${debtPaymentForm.date}T00:00:00`).toISOString()
        : new Date().toISOString();
      const result = await receivePartialCreditPayment(debtManagementOrder, {
        amount, method: debtPaymentForm.method, date: paymentDateIso, user, myProfile,
      });
      showNotification(result.isFullSettlement
        ? 'تم تسديد كامل الدين المتبقي بنجاح وتسجيله في الإيرادات.'
        : `تم تسجيل دفعة بقيمة ${formatMoney(result.paymentAmount)} IQD. المتبقي الآن: ${formatMoney(result.remainingAfter)} IQD.`);
      if (result.isFullSettlement) {
        closeDebtManagementModal();
      } else {
        setDebtPaymentForm(emptyDebtPaymentForm());
      }
    } catch (err) {
      console.error('فشل تسجيل الدفعة:', err);
      showNotification(`❌ تعذّر تسجيل الدفعة.${err?.message ? ` (${err.message})` : ''}`);
    } finally {
      debtPaymentSubmitLock.unlock();
      setDebtPaymentAction(null);
    }
  };

  const handlePartialPaymentSubmit = (e) => {
    e.preventDefault();
    submitDebtPayment(debtPaymentForm.amount, 'partial');
  };

  const handleFullPaymentSubmit = () => {
    if (!debtManagementOrder) return;
    submitDebtPayment(debtManagementOrder.remainingDebt, 'full');
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة المالية نهائياً؟ (استخدم هذا لتنظيف التكرار القديم)')) return;
    await deleteTransaction(id);
    showNotification('تم حذف المعاملة بنجاح وتحديث الحسابات.');
  };

  const badgeCount = { drivers: driverCashOrders.length, debts: creditOrders.length };
  const badgeColor = { drivers: 'bg-red-500', debts: 'bg-orange-500' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">المالية والحسابات الشاملة</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm flex-1 md:flex-none justify-center"><Plus size={20} /> تسجيل حركة مالية</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${subTab === t.id ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
            {badgeCount[t.id] > 0 && <span className={`${badgeColor[t.id]} text-white text-[10px] px-1.5 py-0.5 rounded-full`}>{badgeCount[t.id]}</span>}
          </button>
        ))}
      </div>

      {subTab === 'pl' && (
        <PLTab
          startDate={plStartDate} setStartDate={setPlStartDate} endDate={plEndDate} setEndDate={setPlEndDate}
          income={filteredIncome} expense={filteredExpense} netRevenue={netRevenue} cogs={plCogs} netProfit={finalNetProfit}
          onPrint={() => setPrintData({ printType: 'finance_report', data: plFilteredTransactions, startDate: plStartDate, endDate: plEndDate, totals: { plIncome: filteredIncome, plCogs, filteredExpense, netRevenue, finalNetProfit } })}
        />
      )}

      {subTab === 'drivers' && <DriversTab driverCashOrders={driverCashOrders} isRowBusy={isRowBusy} onReceive={confirmDriverCash} />}

      {subTab === 'debts' && <DebtsTab creditOrders={creditOrders} onManageDebt={openDebtManagementModal} />}

      {subTab === 'creditLedger' && <CreditLedgerTab creditOrders={creditOrders} />}

      {subTab === 'logs' && (
        <TransactionLogsTab
          filterCategory={filterCategory} setFilterCategory={setFilterCategory}
          startDate={logsStartDate} setStartDate={setLogsStartDate} endDate={logsEndDate} setEndDate={setLogsEndDate}
          transactions={logsFilteredTransactions} canDelete={myProfile?.role === 'admin'} onDelete={handleDeleteTransaction}
        />
      )}

      <TransactionFormModal
        isOpen={isModalOpen} onClose={() => setModalOpen(false)} form={form} setForm={setForm}
        isProcessing={submitLock.isProcessing} onSubmit={handleSubmit}
        onSelectInventoryPurchase={handleSelectInventoryPurchase}
      />

      <PurchaseInvoiceModal
        isOpen={purchaseInvoiceForm.isModalOpen} onClose={purchaseInvoiceForm.closeModal}
        inventory={inventory} form={purchaseInvoiceForm.form} grandTotal={purchaseInvoiceForm.grandTotal}
        isProcessing={purchaseInvoiceForm.isProcessing}
        onFieldChange={purchaseInvoiceForm.handleFieldChange} onItemChange={purchaseInvoiceForm.handleItemChange}
        onAddItem={purchaseInvoiceForm.addItem} onRemoveItem={purchaseInvoiceForm.removeItem}
        onSubmit={purchaseInvoiceForm.handleSubmit}
      />

      <DebtManagementModal
        isOpen={!!debtManagementOrder} onClose={closeDebtManagementModal} order={debtManagementOrder}
        form={debtPaymentForm} setForm={setDebtPaymentForm}
        isProcessing={debtPaymentSubmitLock.isProcessing} processingAction={debtPaymentAction}
        onSubmitPartial={handlePartialPaymentSubmit} onSubmitFull={handleFullPaymentSubmit}
      />
    </div>
  );
};
