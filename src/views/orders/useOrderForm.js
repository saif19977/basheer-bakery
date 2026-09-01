import { useState } from 'react';
import { saveOrder, deductReadyMadeStock } from '../../services/ordersService';
import { getOrderItems } from '../../utils/orderItems';

const emptyItem = (dynamicCategories) => {
  const firstCategory = Object.keys(dynamicCategories)[0] || '';
  return {
    id: Date.now(), orderSource: 'manufacturing', cakeCategory: firstCategory,
    cakeSize: dynamicCategories[firstCategory]?.[0] || '', customCakeType: '',
    quantity: 1, weight: '', price: '', selectedFG: '', itemNotes: '', itemImages: [],
  };
};

const emptyForm = (dynamicCategories) => ({
  customerName: '', phone: '', address: '', contactMethod: 'واتساب', paymentType: 'نقد',
  deliveryDate: '', globalNotes: '', deliveryFee: '',
  items: [emptyItem(dynamicCategories)],
  totalPrice: 0,
});

const calculateTotal = (items, delivery) => {
  const itemsTotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  return itemsTotal + Number(delivery || 0);
};

// يدير كل حالة نموذج إنشاء/تعديل الطلب: الفتح/الإغلاق، تعبئة الحقول، إدارة
// الأصناف وصورها، وحفظ الطلب. مفصول عن OrdersView كي تبقى تلك الشاشة مسؤولة
// فقط عن عرض القائمة والتصفية.
export function useOrderForm({ dynamicCategories, finishedGoods, orders, user, myProfile, uploadToStorage, showNotification, submitLock }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [form, setForm] = useState(() => emptyForm(dynamicCategories));

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm(dynamicCategories));
    setModalOpen(true);
  };

  const openEditModal = (order) => {
    setEditingId(order.id);
    setForm({
      customerName: order.customerName || '', phone: order.phone || '', address: order.address || '',
      contactMethod: order.contactMethod || 'مباشر', paymentType: order.paymentType || 'نقد',
      deliveryDate: order.deliveryDate || '', globalNotes: order.notes || '', deliveryFee: order.deliveryFee || '',
      items: getOrderItems(order),
      totalPrice: order.price || 0,
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleCustomerSelect = (val, uniqueCustomers) => {
    setForm(prev => ({ ...prev, customerName: val }));
    const cust = uniqueCustomers.find(c => c.name === val);
    if (cust) {
      setForm(prev => ({ ...prev, phone: cust.phone, address: cust.address, contactMethod: cust.contactMethod }));
    }
  };

  const handleFieldChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleDeliveryFeeChange = (val) => {
    setForm(prev => ({ ...prev, deliveryFee: val, totalPrice: calculateTotal(prev.items, val) }));
  };

  const handleItemChange = (index, field, value) => {
    setForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === 'selectedFG') {
        const fgItem = finishedGoods.find(g => g.id === value);
        if (fgItem) {
          newItems[index] = {
            ...newItems[index],
            cakeCategory: fgItem.name,
            cakeSize: 'جاهز من المخزن',
            price: Number(fgItem.price || 0),
            ...(fgItem.image ? { itemImages: [fgItem.image] } : {}),
          };
        }
      }
      return { ...prev, items: newItems, totalPrice: calculateTotal(newItems, prev.deliveryFee) };
    });
  };

  const addItem = () => {
    setForm(prev => {
      const newItems = [...prev.items, emptyItem(dynamicCategories)];
      return { ...prev, items: newItems, totalPrice: calculateTotal(newItems, prev.deliveryFee) };
    });
  };

  const removeItem = (index) => {
    setForm(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems, totalPrice: calculateTotal(newItems, prev.deliveryFee) };
    });
  };

  const handleItemImageUpload = async (index, e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    e.target.value = '';

    setIsUploadingImg(true);
    showNotification('⏳ جاري رفع الصور...');

    const uploadedImages = [];
    for (let i = 0; i < filesArray.length; i++) {
      const url = await uploadToStorage(filesArray[i]);
      if (url) uploadedImages.push(url);
    }

    setForm(prev => {
      const newItems = [...prev.items];
      const currentImages = newItems[index].itemImages || [];
      newItems[index] = { ...newItems[index], itemImages: [...currentImages, ...uploadedImages] };
      return { ...prev, items: newItems };
    });

    setIsUploadingImg(false);
    if (uploadedImages.length > 0) showNotification('✅ تم رفع الصور بنجاح!');
  };

  const removeItemImage = (itemIndex, imgIndex) => {
    setForm(prev => {
      const newItems = [...prev.items];
      const newImages = [...newItems[itemIndex].itemImages];
      newImages.splice(imgIndex, 1);
      newItems[itemIndex] = { ...newItems[itemIndex], itemImages: newImages };
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.isLocked() || isUploadingImg) return;
    submitLock.lock();
    try {
      const orderPayload = { ...form, price: Number(form.totalPrice || 0), notes: form.globalNotes, deliveryFee: Number(form.deliveryFee || 0) };

      if (!editingId) {
        const stockResult = await deductReadyMadeStock(orderPayload.items, finishedGoods);
        if (!stockResult.ok) {
          showNotification(`❌ الكمية المطلوبة من الصنف "${stockResult.itemName}" غير متوفرة في المخزن التام!`);
          submitLock.unlock();
          return;
        }
      }

      await saveOrder({ editingId, orderPayload, orders, user, myProfile });
      if (!editingId) showNotification('تم حفظ الطلب بنجاح.');

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm(dynamicCategories));
    } finally {
      submitLock.unlockAfter(1500);
    }
  };

  return {
    isModalOpen, editingId, form, isUploadingImg, isProcessing: submitLock.isProcessing,
    openCreateModal, openEditModal, closeModal,
    handleCustomerSelect, handleFieldChange, handleDeliveryFeeChange,
    handleItemChange, addItem, removeItem, handleItemImageUpload, removeItemImage,
    handleSubmit,
  };
}
