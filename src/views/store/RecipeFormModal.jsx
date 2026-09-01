import { Plus, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

export const RecipeFormModal = ({
  isOpen, onClose, recipeForm, setRecipeForm, dynamicCategories, inventory,
  selectedMat, setSelectedMat, selectedMatQty, setSelectedMatQty,
  isProcessing, onAddMaterial, onSubmit,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={recipeForm.id ? 'تعديل معادلة التصنيع' : 'ضبط معادلة تصنيع جديدة'}>
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">فئة الكيك</label>
          <select required value={recipeForm.cakeCategory} onChange={e => setRecipeForm({ ...recipeForm, cakeCategory: e.target.value, cakeSize: dynamicCategories[e.target.value]?.[0] || '' })} className="w-full p-2.5 border rounded-lg outline-none bg-white">
            <option value="">-- اختر الفئة --</option>
            <option value="NEW_CATEGORY" className="font-bold text-blue-600">➕ إضافة فئة كيك جديدة...</option>
            {Object.keys(dynamicCategories).filter(c => c !== 'أخرى (إدخال يدوي)').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {recipeForm.cakeCategory === 'NEW_CATEGORY' && <input type="text" required placeholder="اكتب اسم الفئة الجديدة..." value={recipeForm.customCategory} onChange={e => setRecipeForm({ ...recipeForm, customCategory: e.target.value })} className="w-full mt-2 p-2 border border-blue-400 bg-blue-50 rounded-lg outline-none" />}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الحجم المستهدف</label>
          <select required value={recipeForm.cakeSize} onChange={e => setRecipeForm({ ...recipeForm, cakeSize: e.target.value })} className="w-full p-2.5 border rounded-lg outline-none bg-white">
            <option value="">-- اختر الحجم --</option>
            <option value="NEW_SIZE" className="font-bold text-blue-600">➕ إضافة حجم جديد...</option>
            {dynamicCategories[recipeForm.cakeCategory]?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {recipeForm.cakeSize === 'NEW_SIZE' && <input type="text" required placeholder="اكتب الحجم الجديد..." value={recipeForm.customSize} onChange={e => setRecipeForm({ ...recipeForm, customSize: e.target.value })} className="w-full mt-2 p-2 border border-blue-400 bg-blue-50 rounded-lg outline-none" />}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <p className="font-bold text-sm mb-2 text-gray-800">إضافة مواد للمعادلة:</p>
        <div className="flex gap-2 mb-4">
          <select value={selectedMat} onChange={e => setSelectedMat(e.target.value)} className="flex-1 p-2 border rounded-lg outline-none text-sm bg-white">
            <option value="">-- اختر المادة من المستودع --</option>
            {inventory.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
          </select>
          <input type="number" step="0.01" min="0" placeholder="الكمية" value={selectedMatQty} onChange={e => setSelectedMatQty(e.target.value)} className="w-24 p-2 border rounded-lg outline-none text-sm text-center" />
          <button type="button" onClick={onAddMaterial} className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700"><Plus size={18} /></button>
        </div>

        <div className="space-y-2">
          {recipeForm.materials.map((m, idx) => (
            <div key={idx} className="flex justify-between bg-white p-2 rounded border text-sm items-center">
              <span className="font-medium text-gray-800">{m.itemName}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-blue-700">{m.qty} {m.unit}</span>
                <button type="button" onClick={() => setRecipeForm({ ...recipeForm, materials: recipeForm.materials.filter((_, i) => i !== idx) })} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16} /></button>
              </div>
            </div>
          ))}
          {recipeForm.materials.length === 0 && <p className="text-xs text-red-500 text-center py-2 font-bold border border-red-200 border-dashed rounded bg-red-50">لم يتم إضافة أي مواد بعد!</p>}
        </div>
      </div>
      <button type="submit" disabled={isProcessing} className="w-full bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 rounded-lg mt-4 shadow-md">{isProcessing ? 'جاري الحفظ...' : 'حفظ المعادلة'}</button>
    </form>
  </Modal>
);
