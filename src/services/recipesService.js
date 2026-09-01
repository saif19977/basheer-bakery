import { addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { dataCollection, dataDoc } from '../firebase/paths';

// يحفظ معادلة تصنيع (BOM): تعديل معادلة موجودة، أو دمج مع معادلة لنفس
// الفئة/الحجم إن وُجدت، أو إنشاء معادلة جديدة. finalMaterials/finalCategory/
// finalSize تُحسب وتُتحقق من صحتها في الواجهة قبل الاستدعاء.
export async function saveRecipe({ recipeId, cakeCategory, cakeSize, materials, recipes }) {
  if (recipeId) {
    await updateDoc(dataDoc('recipes', recipeId), { cakeCategory, cakeSize, materials });
    return;
  }

  const existingId = recipes.find(r => r.cakeCategory === cakeCategory && r.cakeSize === cakeSize)?.id;
  if (existingId) {
    await updateDoc(dataDoc('recipes', existingId), { materials });
    return;
  }

  await addDoc(dataCollection('recipes'), { cakeCategory, cakeSize, materials });
}

export async function deleteRecipe(id) {
  await deleteDoc(dataDoc('recipes', id));
}
