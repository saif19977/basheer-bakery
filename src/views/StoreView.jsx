import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { InventoryTab } from './store/InventoryTab';
import { LogsTab } from './store/LogsTab';
import { RecipesTab } from './store/RecipesTab';
import { InventoryFormModal } from './store/InventoryFormModal';
import { RecipeFormModal } from './store/RecipeFormModal';
import { useSubmitLock } from '../hooks/useSubmitLock';
import { adjustInventoryQuantity, deleteInventoryItem, purchaseInventory, updateInventoryItem } from '../services/inventoryService';
import { deleteRecipe, saveRecipe as saveRecipeService } from '../services/recipesService';

const EMPTY_INVENTORY_FORM = { itemName: '', type: 'مكونات', quantity: '', unit: 'كجم', price: '', supplier: '', invoiceNum: '' };
const EMPTY_RECIPE_FORM = { id: '', cakeCategory: '', customCategory: '', cakeSize: '', customSize: '', materials: [] };

const SUB_TABS = [
  { id: 'inventory', label: 'الأرصدة والتسعير' },
  { id: 'logs', label: 'مستندات الإدخال' },
  { id: 'recipes', label: 'معادلات التصنيع (BOM)' },
];

export const StoreView = () => {
  const { inventory, inventoryLogs, recipes, user, showNotification, dynamicCategories } = useAppContext();

  const [subTab, setSubTab] = useState('inventory');

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingInvId, setEditingInvId] = useState(null);
  const [deleteInvModal, setDeleteInvModal] = useState(null);
  const [logToFinance, setLogToFinance] = useState(true);
  const [form, setForm] = useState(EMPTY_INVENTORY_FORM);
  const submitLock = useSubmitLock();

  const [isRecipeModalOpen, setRecipeModalOpen] = useState(false);
  const [deleteRecipeModal, setDeleteRecipeModal] = useState(null);
  const [recipeForm, setRecipeForm] = useState(EMPTY_RECIPE_FORM);
  const [selectedMat, setSelectedMat] = useState('');
  const [selectedMatQty, setSelectedMatQty] = useState('');

  const openNewInventoryModal = () => {
    setEditingInvId(null);
    setForm(EMPTY_INVENTORY_FORM);
    setModalOpen(true);
  };

  const handleEditInventory = (item) => {
    setEditingInvId(item.id);
    setForm({
      itemName: item.itemName, type: item.type || 'مكونات', quantity: item.quantity,
      unit: item.unit || 'كجم', price: item.price || 0, supplier: '', invoiceNum: '',
    });
    setModalOpen(true);
  };

  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    if (submitLock.isLocked()) return;
    submitLock.lock();
    try {
      if (editingInvId) {
        await updateInventoryItem(editingInvId, form);
        showNotification('تم تعديل بيانات المادة بنجاح.');
        setEditingInvId(null);
        setModalOpen(false);
        setForm(EMPTY_INVENTORY_FORM);
        return;
      }

      const { merged, loggedToFinance } = await purchaseInventory({ form, inventory, logToFinance });
      showNotification(merged ? `تم زيادة رصيد وتحديث متوسط التكلفة للمادة: ${form.itemName}` : 'تم إضافة المادة الجديدة للمستودع.');
      if (loggedToFinance) showNotification('تم تسجيل عملية الشراء في السجل المالي تلقائياً.');

      setModalOpen(false);
      setForm(EMPTY_INVENTORY_FORM);
    } finally {
      submitLock.unlock();
    }
  };

  const confirmDeleteInventory = async () => {
    if (submitLock.isLocked()) return;
    submitLock.lock();
    try {
      if (deleteInvModal) {
        await deleteInventoryItem(deleteInvModal);
        showNotification('تم حذف المادة بنجاح.');
        setDeleteInvModal(null);
      }
    } finally {
      submitLock.unlock();
    }
  };

  // تعديل جرد سريع (+ / -) بلا قفل إرسال — إجراء فوري خفيف الأثر كما في الأصل.
  const handleAdjustQty = (id, currentQty, change, itemName) => {
    adjustInventoryQuantity(id, currentQty, change, itemName);
  };

  const addMaterialToRecipe = () => {
    if (!selectedMat || !selectedMatQty) return;
    const invItem = inventory.find(i => i.id === selectedMat);
    setRecipeForm(prev => ({ ...prev, materials: [...prev.materials, { inventoryId: selectedMat, itemName: invItem.itemName, unit: invItem.unit, qty: Number(selectedMatQty) }] }));
    setSelectedMat('');
    setSelectedMatQty('');
  };

  const openNewRecipeModal = () => {
    setRecipeForm(EMPTY_RECIPE_FORM);
    setRecipeModalOpen(true);
  };

  const handleEditRecipe = (r) => {
    setRecipeForm({ id: r.id, cakeCategory: r.cakeCategory, customCategory: '', cakeSize: r.cakeSize, customSize: '', materials: r.materials || [] });
    setRecipeModalOpen(true);
  };

  const saveRecipe = async (e) => {
    e.preventDefault();
    if (submitLock.isLocked()) return;
    submitLock.lock();
    try {
      let finalMaterials = [...recipeForm.materials];
      if (selectedMat && selectedMatQty) {
        const invItem = inventory.find(i => i.id === selectedMat);
        if (invItem) finalMaterials.push({ inventoryId: selectedMat, itemName: invItem.itemName, unit: invItem.unit, qty: Number(selectedMatQty) });
      }

      if (finalMaterials.length === 0) {
        showNotification('❌ لا يمكن حفظ معادلة فارغة! الرجاء إضافة مواد من خلال زر ( + ).');
        submitLock.unlock();
        return;
      }

      const finalCategory = recipeForm.cakeCategory === 'NEW_CATEGORY' ? recipeForm.customCategory : recipeForm.cakeCategory;
      const finalSize = recipeForm.cakeSize === 'NEW_SIZE' ? recipeForm.customSize : recipeForm.cakeSize;
      if (!finalCategory || !finalSize) {
        showNotification('❌ يرجى تحديد اسم الفئة والحجم بشكل صحيح.');
        submitLock.unlock();
        return;
      }

      await saveRecipeService({ recipeId: recipeForm.id, cakeCategory: finalCategory, cakeSize: finalSize, materials: finalMaterials, recipes });
      showNotification('تم حفظ المعادلة بنجاح. سيظهر الصنف تلقائياً في قائمة البيع.');
      setRecipeModalOpen(false);
      setSelectedMat('');
      setSelectedMatQty('');
    } finally {
      submitLock.unlock();
    }
  };

  const confirmDeleteRecipe = async () => {
    if (submitLock.isLocked()) return;
    submitLock.lock();
    try {
      if (deleteRecipeModal) {
        await deleteRecipe(deleteRecipeModal);
        showNotification('تم حذف المعادلة بنجاح.');
        setDeleteRecipeModal(null);
      }
    } finally {
      submitLock.unlock();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">المستودع والإدارة الفنية</h2>
        <div className="flex gap-2">
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${subTab === t.id ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {subTab === 'inventory' && (
        <InventoryTab inventory={inventory} user={user} onOpenNew={openNewInventoryModal} onEdit={handleEditInventory} onDelete={setDeleteInvModal} onAdjustQty={handleAdjustQty} />
      )}

      {subTab === 'logs' && <LogsTab inventoryLogs={inventoryLogs} />}

      {subTab === 'recipes' && (
        <RecipesTab recipes={recipes} inventory={inventory} user={user} onOpenNew={openNewRecipeModal} onEdit={handleEditRecipe} onDelete={setDeleteRecipeModal} />
      )}

      <InventoryFormModal
        isOpen={isModalOpen} onClose={() => { setModalOpen(false); setEditingInvId(null); }}
        editingInvId={editingInvId} form={form} setForm={setForm}
        logToFinance={logToFinance} setLogToFinance={setLogToFinance}
        isProcessing={submitLock.isProcessing} onSubmit={handleInventorySubmit}
      />

      <ConfirmModal
        isOpen={!!deleteInvModal} onClose={() => setDeleteInvModal(null)} title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذه المادة نهائياً من المستودع؟"
        confirmLabel="نعم، احذف" processingLabel="جاري الحذف..."
        isProcessing={submitLock.isProcessing} onConfirm={confirmDeleteInventory}
      />

      <RecipeFormModal
        isOpen={isRecipeModalOpen} onClose={() => setRecipeModalOpen(false)}
        recipeForm={recipeForm} setRecipeForm={setRecipeForm} dynamicCategories={dynamicCategories} inventory={inventory}
        selectedMat={selectedMat} setSelectedMat={setSelectedMat} selectedMatQty={selectedMatQty} setSelectedMatQty={setSelectedMatQty}
        isProcessing={submitLock.isProcessing} onAddMaterial={addMaterialToRecipe} onSubmit={saveRecipe}
      />

      <ConfirmModal
        isOpen={!!deleteRecipeModal} onClose={() => setDeleteRecipeModal(null)} title="تأكيد حذف المعادلة"
        message="هل أنت متأكد من حذف هذه المعادلة نهائياً؟ (لن يتم خصم مواد الكيك المرتبط بها مستقبلاً)"
        confirmLabel="نعم، احذف المعادلة" processingLabel="جاري الحذف..."
        isProcessing={submitLock.isProcessing} onConfirm={confirmDeleteRecipe}
      />
    </div>
  );
};
