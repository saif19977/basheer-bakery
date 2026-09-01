import { addDoc, updateDoc } from 'firebase/firestore';
import { dataCollection, dataDoc } from '../firebase/paths';
import { getOrderItems } from '../utils/orderItems';
import { formatOrderNum } from '../utils/format';
import { MANUAL_ENTRY_CATEGORY } from '../constants/cakeCategories';

// --- إدارة الطلبات: إنشاء / تعديل / إلغاء ---

// يعيد كميات الأصناف "المسحوبة من المخزن التام" إلى رصيدها قبل إلغاء الطلب.
export async function cancelOrder(order, finishedGoods) {
  const items = getOrderItems(order);
  for (const item of items) {
    if (item.orderSource !== 'ready_made' || !item.selectedFG) continue;
    const fgItem = finishedGoods.find(g => g.id === item.selectedFG);
    if (!fgItem) continue;
    await updateDoc(dataDoc('finished_goods', fgItem.id), {
      quantity: Number(fgItem.quantity || 0) + Number(item.quantity || 0),
    });
  }
  await updateDoc(dataDoc('orders', order.id), { status: 'cancelled', updatedAt: new Date().toISOString() });
}

// يخصم من رصيد المخزن التام كل صنف "جاهز" ضمن طلب جديد، ويتوقف فوراً عند أول
// صنف تنقص كميته (الأصناف السابقة في نفس الطلب تبقى مخصومة، كما في السلوك الأصلي).
export async function deductReadyMadeStock(items, finishedGoods) {
  for (const item of items) {
    if (item.orderSource !== 'ready_made') continue;
    const fgItem = finishedGoods.find(g => g.id === item.selectedFG);
    if (!fgItem || Number(fgItem.quantity || 0) < Number(item.quantity || 1)) {
      return { ok: false, itemName: item.cakeCategory };
    }
    await updateDoc(dataDoc('finished_goods', fgItem.id), { quantity: Number(fgItem.quantity) - Number(item.quantity) });
  }
  return { ok: true };
}

const nextOrderNumber = (orders) =>
  orders.length > 0 ? Math.max(...orders.map(o => Number(o.orderNumber) || 0)) + 1 : 1;

// ينشئ طلباً جديداً أو يحدّث طلباً موجوداً. الحالة الابتدائية للطلب الجديد تكون
// "جاهز" مباشرة إن كانت كل أصنافه من المخزن التام، وإلا "بانتظار التحضير".
export async function saveOrder({ editingId, orderPayload, orders, user, myProfile }) {
  const cashStatus = orderPayload.paymentType === 'نقد' ? 'pending_delivery' : 'credit_unpaid';

  if (editingId) {
    await updateDoc(dataDoc('orders', editingId), { ...orderPayload, cashStatus, updatedAt: new Date().toISOString() });
    return;
  }

  const allReadyMade = orderPayload.items.every(i => i.orderSource === 'ready_made');
  await addDoc(dataCollection('orders'), {
    ...orderPayload,
    status: allReadyMade ? 'ready' : 'pending',
    cashStatus,
    createdAt: new Date().toISOString(),
    orderNumber: nextOrderNumber(orders),
    createdByUid: user.uid,
    createdByName: myProfile?.name || 'غير معروف',
  });
}

// --- خط الإنتاج ---

// يخصم مواد الوصفة (BOM) من المستودع لكل صنف "تصنيع معمل" في الطلب، ويسجّل
// تكلفة الإنتاج (COGS)، قبل نقل الطلب لمرحلة "جاري التحضير".
export async function startBakingOrder(order, { recipes, inventory }) {
  if (order.materialsDeducted) {
    await updateDoc(dataDoc('orders', order.id), { status: 'baking', updatedAt: new Date().toISOString() });
    return { alreadyDeducted: true };
  }

  const missingRecipes = [];
  const inventoryDeductions = {};

  for (const item of getOrderItems(order)) {
    if (item.orderSource !== 'manufacturing') continue;

    if (item.cakeCategory === MANUAL_ENTRY_CATEGORY) {
      missingRecipes.push(item.customCakeType || 'كيك يدوي');
      continue;
    }

    const recipe = recipes.find(r => r.cakeCategory === item.cakeCategory && r.cakeSize === item.cakeSize);
    if (!recipe || !recipe.materials || recipe.materials.length === 0) {
      missingRecipes.push(`${item.cakeCategory} - ${item.cakeSize}`);
      continue;
    }

    for (const mat of recipe.materials) {
      const invItem = inventory.find(inv => inv.id === mat.inventoryId);
      if (!invItem) continue;
      const qtyToDeduct = Number(mat.qty) * Number(item.quantity);
      if (!inventoryDeductions[invItem.id]) {
        inventoryDeductions[invItem.id] = { invItem, qtyToDeduct: 0, totalCost: 0 };
      }
      inventoryDeductions[invItem.id].qtyToDeduct += qtyToDeduct;
      inventoryDeductions[invItem.id].totalCost += Number(invItem.price || 0) * qtyToDeduct;
    }
  }

  let totalCogs = 0;
  let deductedItemsCount = 0;
  for (const invId in inventoryDeductions) {
    const deduction = inventoryDeductions[invId];
    totalCogs += deduction.totalCost;
    await updateDoc(dataDoc('inventory', invId), { quantity: Number(deduction.invItem.quantity) - deduction.qtyToDeduct });
    await addDoc(dataCollection('inventory_logs'), {
      date: new Date().toISOString(), type: 'OUT_PRODUCTION', inventoryId: invId, itemName: deduction.invItem.itemName,
      qty: deduction.qtyToDeduct, price: deduction.invItem.price, supplier: '-',
      notes: `استهلاك تصنيع طلب #${formatOrderNum(order)}`,
    });
    deductedItemsCount++;
  }

  await updateDoc(dataDoc('orders', order.id), {
    status: 'baking', updatedAt: new Date().toISOString(), cogs: totalCogs, materialsDeducted: true,
  });

  return { alreadyDeducted: false, missingRecipes, deductedItemsCount };
}

// ينهي تصنيع الطلب وينقله لمرحلة "جاهز للتوصيل"، مع صورة المنتج النهائي إن وُجدت.
export async function completeProductionOrder(orderId, finalImage) {
  const updateData = { status: 'ready', updatedAt: new Date().toISOString() };
  if (finalImage) updateData.finalImage = finalImage;
  await updateDoc(dataDoc('orders', orderId), updateData);
}

// --- التوصيل ---

export async function dispatchOrderForDelivery(orderId) {
  await updateDoc(dataDoc('orders', orderId), { status: 'out_for_delivery', dispatchedAt: new Date().toISOString() });
}

// isCash يُحسب من قِبل المستدعي (قبل الاستدعاء) لأن رسالة الإشعار تُعرض قبل
// انتهاء الكتابة في السحابة، فيبقى الحساب في مكان واحد يستخدمه الطرفان.
export async function markOrderDelivered(order, { user, myProfile }, isCash) {
  const now = new Date().toISOString();
  await updateDoc(dataDoc('orders', order.id), {
    status: 'completed',
    completedAt: now,
    receivedByUid: user.uid,
    receivedByName: myProfile?.name || 'غير معروف',
    cashStatus: isCash ? 'with_driver' : 'credit_unpaid',
  });
}
