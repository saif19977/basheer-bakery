import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useSubmitLock } from '../hooks/useSubmitLock';
import { useActionLock } from '../hooks/useActionLock';
import { addManualTransaction, deleteTransaction, receiveCreditPayment, receiveDriverCash } from '../services/financeService';
import { PLTab } from './finance/PLTab';
import { DriversTab } from './finance/DriversTab';
import { DebtsTab } from './finance/DebtsTab';
import { TransactionLogsTab } from './finance/TransactionLogsTab';
import { TransactionFormModal } from './finance/TransactionFormModal';

const EMPTY_TRANSACTION_FORM = { type: 'expense', category: 'operational', amount: '', description: '' };

const SUB_TABS = [
  { id: 'pl', label: 'تقرير الأرباح (P&L)' },
  { id: 'drivers', label: 'نقدية السائقين' },
  { id: 'debts', label: 'الديون والذمم' },
  { id: 'logs', label: 'السجل اليومي' },
];

const withinDateRange = (dateValue, startDate, endDate) => {
  try {
    const time = new Date(dateValue || 0).getTime();
    if (startDate && time < new Date(startDate).getTime()) return false;
    if (endDate && time > new Date(endDate + 'T23:59:59').getTime()) return false;
  } catch { /* تاريخ غير صالح: لا يُستبعد السجل بسببه */ }
  return true;
};

export const FinanceView = () => {
  const { orders, transactions, user, myProfile, showNotification, setPrintData } = useAppContext();

  const [isModalOpen, setModalOpen] = useState(false);
  const [subTab, setSubTab] = useState('pl');
  const [filterCategory, setFilterCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [form, setForm] = useState(EMPTY_TRANSACTION_FORM);

  const submitLock = useSubmitLock();
  const actionLock = useActionLock();
  const isRowBusy = (id) => actionLock.isProcessing(id) || actionLock.isLocked(id);

  const fullyFilteredTransactions = transactions.filter(t => {
    if (!t) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return withinDateRange(t.date, startDate, endDate);
  });

  const calcTotal = (condition) => fullyFilteredTransactions.filter(condition).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const filteredIncome = calcTotal(t => t.type === 'income');
  const filteredExpense = calcTotal(t => t.type === 'expense');

  const plOrders = orders.filter(o => o && o.status === 'completed' && withinDateRange(o.completedAt, startDate, endDate));
  const plCogs = plOrders.reduce((sum, o) => sum + Number(o?.cogs || 0), 0);
  const netRevenue = filteredIncome - filteredExpense;
  const finalNetProfit = netRevenue - plCogs;

  const driverCashOrders = orders.filter(o => o?.status === 'completed' && o?.paymentType === 'نقد' && o?.cashStatus === 'with_driver');
  const creditOrders = orders.filter(o => o?.paymentType === 'آجل' && o?.cashStatus === 'credit_unpaid');

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

  const confirmDriverCash = async (order) => {
    if (actionLock.isLocked(order.id)) return;
    if (order.cashStatus === 'received_by_finance') {
      showNotification('تم استلام النقدية لهذا الطلب مسبقاً.');
      return;
    }
    actionLock.lock(order.id);
    try {
      const result = await receiveDriverCash(order, { user, myProfile });
      if (result.alreadyRecorded) {
        showNotification('تم تسجيل هذا الإيراد مسبقاً في السجلات.');
        return;
      }
      showNotification('تم استلام النقدية وتسجيلها في الإيرادات بنجاح.');
    } catch {
      actionLock.release(order.id);
    } finally {
      actionLock.finish();
    }
  };

  const confirmCreditPayment = async (order) => {
    if (actionLock.isLocked(order.id)) return;
    if (order.cashStatus === 'received_by_finance') {
      showNotification('تم سداد دين هذا الطلب مسبقاً.');
      return;
    }
    actionLock.lock(order.id);
    try {
      const result = await receiveCreditPayment(order, { user, myProfile });
      if (result.alreadyRecorded) {
        showNotification('تم تسجيل السداد مسبقاً.');
        return;
      }
      showNotification('تم سداد الدين وتسجيله في الإيرادات بنجاح.');
    } catch {
      actionLock.release(order.id);
    } finally {
      actionLock.finish();
    }
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
        <button onClick={() => setModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"><Plus size={20} /> تسجيل حركة مالية</button>
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
          startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}
          income={filteredIncome} expense={filteredExpense} netRevenue={netRevenue} cogs={plCogs} netProfit={finalNetProfit}
          onPrint={() => setPrintData({ printType: 'finance_report', data: fullyFilteredTransactions, startDate, endDate, totals: { plIncome: filteredIncome, plCogs, filteredExpense, netRevenue, finalNetProfit } })}
        />
      )}

      {subTab === 'drivers' && <DriversTab driverCashOrders={driverCashOrders} isRowBusy={isRowBusy} onReceive={confirmDriverCash} />}

      {subTab === 'debts' && <DebtsTab creditOrders={creditOrders} isRowBusy={isRowBusy} onSettle={confirmCreditPayment} />}

      {subTab === 'logs' && (
        <TransactionLogsTab
          filterCategory={filterCategory} setFilterCategory={setFilterCategory}
          startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}
          transactions={fullyFilteredTransactions} canDelete={myProfile?.role === 'admin'} onDelete={handleDeleteTransaction}
        />
      )}

      <TransactionFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} form={form} setForm={setForm} isProcessing={submitLock.isProcessing} onSubmit={handleSubmit} />
    </div>
  );
};
