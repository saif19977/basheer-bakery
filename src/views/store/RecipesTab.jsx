import { Edit, Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '../../utils/format';

const recipeCost = (recipe, inventory) => (recipe.materials || []).reduce((cost, m) => {
  const inv = inventory.find(i => i.id === m.inventoryId);
  return inv ? cost + inv.price * m.qty : cost;
}, 0);

export const RecipesTab = ({ recipes, inventory, user, onOpenNew, onEdit, onDelete }) => (
  <>
    <div className="flex justify-between items-center mb-4">
      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">المعادلات تُستخدم لخصم المواد الأولية تلقائياً، وأي فئة تُضاف هنا ستظهر تلقائياً للبيع في شاشة إدارة الطلبات.</p>
      <button onClick={onOpenNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"><Plus size={20} /> ضبط معادلة كيك</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recipes.map(r => (
        <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative group">
          {user && (
            <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(r)} className="bg-blue-50 text-blue-600 p-1.5 rounded hover:bg-blue-100" title="تعديل"><Edit size={16} /></button>
              <button onClick={() => onDelete(r.id)} className="bg-red-50 text-red-600 p-1.5 rounded hover:bg-red-100" title="حذف"><Trash2 size={16} /></button>
            </div>
          )}
          <h4 className="font-bold text-gray-800 mb-1">{r.cakeCategory}</h4>
          <p className="text-sm text-amber-700 font-bold mb-3 border-b pb-2">الحجم: {r.cakeSize}</p>
          <ul className="text-xs text-gray-600 space-y-1 mb-3">
            {r.materials && r.materials.length > 0 ? r.materials.map((m, idx) => <li key={idx}>- {m.qty} {m.unit} من {m.itemName}</li>) : <li className="text-red-500 font-bold">لا توجد مواد مضافة! سيتم التجاهل.</li>}
          </ul>
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded border">
            <span className="text-xs font-bold text-gray-700">التكلفة التقديرية الحالية (COGS):</span>
            <span className="font-bold text-red-600">{formatMoney(recipeCost(r, inventory))} IQD</span>
          </div>
        </div>
      ))}
      {recipes.length === 0 && <p className="text-sm text-gray-400 p-4 col-span-full">لا توجد معادلات مضبوطة بعد.</p>}
    </div>
  </>
);
