// توحيد شكل "أصناف الطلب": الطلبات الحديثة تخزّن مصفوفة items، بينما الطلبات
// القديمة تخزّن حقول الصنف الواحد مباشرة على الطلب نفسه. هذه الدالة تُطبّع الاثنين
// لشكل واحد موحّد تستخدمه كل الواجهات.
export const getOrderItems = (order) => {
  if (order?.items && Array.isArray(order.items) && order.items.length > 0) return order.items;
  return [{
    id: order?.id || Date.now(),
    cakeCategory: order?.cakeCategory || '',
    cakeSize: order?.cakeSize || '',
    customCakeType: order?.customCakeType || '',
    quantity: order?.quantity || 1,
    weight: order?.weight || '',
    price: order?.price || 0,
    orderSource: order?.orderSource || 'manufacturing',
    selectedFG: order?.selectedFG || '',
    itemNotes: order?.notes || '',
    itemImages: (order?.images && order.images.length > 0) ? order.images : (order?.itemImage ? [order.itemImage] : [])
  }];
};

// اسم الصنف المعروض: يدوي إن كانت الفئة "أخرى"، وإلا اسم الفئة نفسها.
export const getItemDisplayName = (item) =>
  item?.cakeCategory === 'أخرى (إدخال يدوي)' ? item?.customCakeType : item?.cakeCategory;

// صور الصنف مع التوافق مع الحقل القديم itemImage المفرد.
export const getItemImages = (item) => {
  if (item?.itemImages && item.itemImages.length > 0) return item.itemImages;
  return item?.itemImage ? [item.itemImage] : [];
};
