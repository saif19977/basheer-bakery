import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { FinishedGoodCard } from './finishedGoods/FinishedGoodCard';
import { AddProductModal } from './finishedGoods/AddProductModal';
import { AddStockModal } from './finishedGoods/AddStockModal';
import { SellModal } from './finishedGoods/SellModal';
import { useSubmitLock } from '../hooks/useSubmitLock';
import { addOrRestockFinishedGood, addStockToFinishedGood, deleteFinishedGood, sellFinishedGood } from '../services/finishedGoodsService';
import { safeStr } from '../utils/format';

const EMPTY_PRODUCT_FORM = { code: '', name: '', quantity: 1, price: '', image: '' };
const EMPTY_SELL_FORM = { type: 'direct', customerName: '', phone: '', address: '', paymentType: 'نقد' };

export const FinishedGoodsView = () => {
  const { finishedGoods, setPrintData, user, myProfile, showNotification, uploadToStorage } = useAppContext();

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isSellModalOpen, setSellModalOpen] = useState(false);
  const [addStockModal, setAddStockModal] = useState(null);
  const [deleteFGModal, setDeleteFGModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [sellQty, setSellQty] = useState(1);
  const [addQty, setAddQty] = useState(1);
  const [sellForm, setSellForm] = useState(EMPTY_SELL_FORM);

  const submitLock = useSubmitLock();

  const filteredGoods = finishedGoods.filter(g => safeStr(g?.name).includes(safeStr(searchTerm)) || (g?.code && safeStr(g.code).includes(safeStr(searchTerm))));

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setIsUploadingImg(true);
    showNotification('⏳ جاري رفع صورة المنتج للسيرفر...');
    const url = await uploadToStorage(file);
    if (url) {
      setForm(prev => ({ ...prev, image: url }));
      showNotification('✅ تم رفع الصورة بنجاح!');
    }
    setIsUploadingImg(false);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (submitLock.isLocked() || isUploadingImg) return;
    submitLock.lock();
    try {
      const { merged } = await addOrRestockFinishedGood(form, finishedGoods);
      showNotification(merged ? `تم إضافة ${form.quantity} للرصيد السابق.` : 'تم إضافة المنتج الجديد للمخزن التام.');
      setAddModalOpen(false);
      setForm(EMPTY_PRODUCT_FORM);
    } finally {
      submitLock.unlock();
    }
  };

  const confirmAddStock = async (e) => {
    e.preventDefault();
    if (submitLock.isLocked()) return;
    submitLock.lock();
    try {
      await addStockToFinishedGood(addStockModal, addQty);
      showNotification('تم زيادة رصيد المنتج بنجاح.');
      setAddStockModal(null);
      setAddQty(1);
    } finally {
      submitLock.unlock();
    }
  };

  const confirmDeleteFG = async () => {
    if (submitLock.isLocked()) return;
    submitLock.lock();
    try {
      await deleteFinishedGood(deleteFGModal);
      showNotification('تم حذف المنتج بنجاح.');
      setDeleteFGModal(null);
    } finally {
      submitLock.unlock();
    }
  };

  const handleSell = async (e) => {
    e.preventDefault();
    if (submitLock.isLocked()) return;
    if (sellQty > Number(selectedItem.quantity || 0)) {
      showNotification('❌ الكمية المطلوبة أكبر من المتوفر!');
      return;
    }
    submitLock.lock();
    try {
      const result = await sellFinishedGood({ selectedItem, sellQty, sellForm, user, myProfile });
      if (result.type === 'direct') {
        showNotification('تم إخراج المنتج وتسجيل البيع بنجاح.');
        setPrintData(result.receiptData);
      } else {
        showNotification('تم سحب المنتج وتحويله لقسم التوصيل بنجاح.');
      }
      setSellModalOpen(false);
      setSelectedItem(null);
      setSellQty(1);
      setSellForm(EMPTY_SELL_FORM);
    } finally {
      submitLock.unlock();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">مخزن الإنتاج التام</h2><p className="text-sm text-gray-500 mt-1">منتجات جاهزة للبيع المباشر الفوري</p></div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم أو الكود..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
          <button onClick={() => setAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"><Plus size={20} /> إضافة منتج جديد</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredGoods.map(item => (
          <FinishedGoodCard
            key={item.id} item={item}
            onAddStock={(i) => { setAddStockModal(i); setAddQty(1); }}
            onSell={(i) => { setSelectedItem(i); setSellQty(1); setSellForm(EMPTY_SELL_FORM); setSellModalOpen(true); }}
            onDelete={setDeleteFGModal}
          />
        ))}
        {filteredGoods.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">المخزن التام فارغ أو لا توجد نتائج مطابقة.</p>}
      </div>

      <ConfirmModal
        isOpen={!!deleteFGModal} onClose={() => setDeleteFGModal(null)} title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا المنتج نهائياً من المخزن التام؟"
        confirmLabel="نعم، احذف المنتج" processingLabel="جاري الحذف..."
        isProcessing={submitLock.isProcessing} onConfirm={confirmDeleteFG}
      />

      <AddStockModal
        isOpen={!!addStockModal} onClose={() => setAddStockModal(null)} item={addStockModal}
        addQty={addQty} setAddQty={setAddQty} isProcessing={submitLock.isProcessing} onSubmit={confirmAddStock}
      />

      <AddProductModal
        isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} form={form} setForm={setForm}
        isProcessing={submitLock.isProcessing} isUploadingImg={isUploadingImg}
        onUploadImage={handleUpload} onSubmit={handleAddItem}
      />

      <SellModal
        isOpen={isSellModalOpen} onClose={() => setSellModalOpen(false)} item={selectedItem}
        sellQty={sellQty} setSellQty={setSellQty} sellForm={sellForm} setSellForm={setSellForm}
        isProcessing={submitLock.isProcessing} onSubmit={handleSell}
      />
    </div>
  );
};
