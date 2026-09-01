import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { MANUAL_ENTRY_CATEGORY } from '../../constants/cakeCategories';

// محرر صنف واحد داخل نموذج الطلب: يبدّل بين "تصنيع معمل" (فئة/حجم/سعر يدوي)
// و"سحب من المخزن التام" (اختيار منتج جاهز يملأ الحقول تلقائياً)، مع صور مرجعية.
export const OrderItemEditor = ({
  item, index, canRemove, isEditing, isUploadingImg, isProcessing,
  dynamicCategories, finishedGoods, onChange, onRemove, onImageUpload, onRemoveImage, onZoomImage,
}) => (
  <div className="relative bg-white p-4 rounded-xl border border-amber-100 mb-4 shadow-sm">
    <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-blue-800"><input type="radio" value="manufacturing" disabled={isEditing} checked={item.orderSource === 'manufacturing'} onChange={e => onChange(index, 'orderSource', e.target.value)} className="w-4 h-4 text-blue-600" /> تصنيع معمل</label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-green-800"><input type="radio" value="ready_made" disabled={isEditing} checked={item.orderSource === 'ready_made'} onChange={e => onChange(index, 'orderSource', e.target.value)} className="w-4 h-4 text-green-600" /> سحب من المخزن التام</label>
      </div>
      {canRemove && <button type="button" onClick={() => onRemove(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"><Trash2 size={14} /> إزالة</button>}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-8 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {item.orderSource === 'ready_made' ? (
            <div className="col-span-full">
              <label className="block text-xs font-bold text-gray-700 mb-1">اختر من المخزن التام</label>
              <select required={!isEditing} value={item.selectedFG} onChange={e => onChange(index, 'selectedFG', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white">
                <option value="">-- اختر منتجاً --</option>
                {finishedGoods.map(g => <option key={g.id} value={g.id} disabled={Number(g.quantity || 0) === 0}>{g.name} (متوفر: {g.quantity}) - {formatMoney(g.price)} IQD</option>)}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">النوع / الفئة</label>
                <select value={item.cakeCategory} onChange={e => { onChange(index, 'cakeCategory', e.target.value); onChange(index, 'cakeSize', dynamicCategories[e.target.value]?.[0] || ''); }} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                  {Object.keys(dynamicCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              {item.cakeCategory === MANUAL_ENTRY_CATEGORY ? (
                <div><label className="block text-xs font-bold text-gray-700 mb-1">النوع يدوياً</label><input type="text" required value={item.customCakeType} onChange={e => onChange(index, 'customCakeType', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
              ) : (
                <div><label className="block text-xs font-bold text-gray-700 mb-1">الحجم</label><select value={item.cakeSize} onChange={e => onChange(index, 'cakeSize', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white">{dynamicCategories[item.cakeCategory]?.map(sz => <option key={sz} value={sz}>{sz}</option>)}</select></div>
              )}
            </>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs font-bold text-gray-700 mb-1">الكمية</label><input type="number" required min="1" value={item.quantity} onChange={e => onChange(index, 'quantity', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1">الوزن (اختياري)</label><input type="text" value={item.weight} onChange={e => onChange(index, 'weight', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" placeholder="مثال: 2 كجم" /></div>
          <div><label className="block text-xs font-bold text-amber-700 mb-1">سعر القطعة الواحدة (IQD)</label><input type="number" required min="0" step="1" value={item.price} onChange={e => onChange(index, 'price', e.target.value)} className="w-full p-2.5 border border-amber-300 bg-amber-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold" /></div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات خاصة بهذا الصنف (تظهر للمعمل)</label>
          <textarea value={item.itemNotes} onChange={e => onChange(index, 'itemNotes', e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50" rows="2" placeholder="ألوان معينة، كتابة على الكيك..."></textarea>
        </div>
      </div>

      <div className="md:col-span-4 border-r border-gray-100 pr-4 flex flex-col items-center justify-center">
        <label className="block text-xs font-bold text-gray-700 mb-2 text-center">صور التصميم (يمكنك رفع أكثر من صورة)</label>
        <div className="flex flex-wrap gap-2 justify-center w-full max-h-48 overflow-y-auto custom-scrollbar p-1">
          {(item.itemImages || []).map((img, imgIdx) => (
            <div key={imgIdx} className="relative w-16 h-16 group">
              <img src={img} className="w-full h-full object-cover rounded-lg border border-amber-200 shadow-sm cursor-pointer" alt="item ref" onClick={() => onZoomImage(img)} title="تكبير الصورة" />
              <button type="button" onClick={() => onRemoveImage(index, imgIdx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"><X size={12} /></button>
            </div>
          ))}
          <div className="w-16 h-16 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center relative hover:bg-gray-100 transition-colors cursor-pointer">
            {isUploadingImg ? <Loader2 size={20} className="animate-spin text-amber-600 mb-1" /> : <Plus size={20} className="text-gray-400 mb-1" />}
            <span className="text-[9px] font-bold text-gray-500 text-center">{isUploadingImg ? 'جاري...' : 'إضافة'}</span>
            <input type="file" multiple accept="image/*" disabled={isUploadingImg || isProcessing} onChange={e => onImageUpload(index, e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
