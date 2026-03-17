import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  Cake, LayoutDashboard, ShoppingCart, ChefHat, 
  Store as StoreIcon, Truck, DollarSign, Users, 
  Plus, X, CheckCircle, TrendingUp, Package, Clock, AlertCircle,
  Search, Printer, Download, Edit, Image as ImageIcon, FileText, LogOut, ShieldCheck,
  Menu, Bell, Camera, Box, Tag, Trash2, CalendarClock, Play, Phone, UploadCloud, ZoomIn
} from 'lucide-react';

// --- إعدادات فايربيس ---
const firebaseConfig = {
  apiKey: "AIzaSyBxH2YVMpjJ4Gy7GDqtTKJz1FT34lA0M1s",
  authDomain: "cakeshop-88377.firebaseapp.com",
  projectId: "cakeshop-88377",
  storageBucket: "cakeshop-88377.firebasestorage.app",
  messagingSenderId: "379019120658",
  appId: "1:379019120658:web:001793ba07a1fa1af108cb",
  measurementId: "G-N30WTQGDMT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cakeshop-production';

// --- القوائم المنسدلة ---
const CAKE_CATEGORIES = {
  'قالب كيك ايطالي': ['ايطالي ١٢ قطعة', 'ايطالي ٨ قطعة'],
  'قالب كيك عالي': ['صغير عالي', 'وسط عالي', 'كبير عالي'],
  'قالب كيك ارتفاع طبيعي': ['صغير', 'وسط', 'كبير'],
  'علبة كوكيز': ['حجم قياسي'],
  'فخارة كوكيز': ['حجم قياسي'],
  'أخرى (إدخال يدوي)': []
};

// --- المكونات المشتركة ---
const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors"><X size={24} /></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass, onClick }) => (
  <div onClick={onClick} className={`bg-white p-6 rounded-xl border border-gray-100 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow hover:border-amber-200' : 'shadow-sm'}`}>
    <div className={`p-4 rounded-lg flex-shrink-0 ${colorClass}`}><Icon size={28} /></div>
    <div><p className="text-sm font-medium text-gray-500">{title}</p><h3 className="text-2xl font-bold text-gray-900">{value}</h3></div>
  </div>
);

const Table = ({ headers, children }) => (
  <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100 w-full">
    <table className="w-full text-right border-collapse min-w-[600px]">
      <thead><tr className="bg-gray-50 border-b border-gray-100">{headers.map((h, i) => <th key={i} className="p-4 font-semibold text-gray-600 text-sm whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100">{children}</tbody>
    </table>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = { pending: 'bg-yellow-100 text-yellow-800', baking: 'bg-orange-100 text-orange-800', ready: 'bg-blue-100 text-blue-800', out_for_delivery: 'bg-purple-100 text-purple-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' };
  const labels = { pending: 'بانتظار التحضير', baking: 'جاري التحضير', ready: 'تم التجهيز', out_for_delivery: 'في الطريق', completed: 'مكتمل', cancelled: 'ملغي' };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide whitespace-nowrap ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('ar-IQ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatOrderNum = (order) => order.orderNumber ? String(order.orderNumber).padStart(4, '0') : order.id.slice(0,6).toUpperCase();

const getSystemEmail = (userStr) => `${userStr.trim().toLowerCase().replace(/\s+/g, '')}@basheer.system`;

const compressImage = (file, maxWidth = 800) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        canvas.width = img.width > maxWidth ? maxWidth : img.width;
        canvas.height = img.width > maxWidth ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const getOrderItems = (order) => {
  if (order.items && order.items.length > 0) return order.items;
  return [{
     id: order.id || Date.now(),
     cakeCategory: order.cakeCategory || '',
     cakeSize: order.cakeSize || '',
     customCakeType: order.customCakeType || '',
     quantity: order.quantity || 1,
     weight: order.weight || '',
     price: order.price || 0,
     orderSource: order.orderSource || 'manufacturing',
     selectedFG: order.selectedFG || '',
     itemNotes: order.notes || '',
     itemImage: (order.images && order.images.length > 0) ? order.images[0] : ''
  }];
};

// --- مكون العداد التنازلي ---
const Countdown = ({ deliveryDate }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (!deliveryDate) return;
    const calculateTime = () => {
      const target = new Date(deliveryDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) { setIsLate(true); setTimeLeft('متأخر عن الموعد!'); return; }
      const targetDateObj = new Date(deliveryDate);
      const todayObj = new Date();
      const isToday = targetDateObj.getDate() === todayObj.getDate() && targetDateObj.getMonth() === todayObj.getMonth() && targetDateObj.getFullYear() === todayObj.getFullYear();

      if (isToday) {
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`متبقي ${hours} ساعة و ${minutes} دقيقة`);
        setIsLate(false);
      } else {
        setTimeLeft(new Date(deliveryDate).toLocaleDateString('ar-IQ', { weekday: 'long', month: 'short', day: 'numeric' }));
        setIsLate(false);
      }
    };
    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    return () => clearInterval(timer);
  }, [deliveryDate]);

  if (!deliveryDate) return null;

  return (
    <div className={`flex items-center justify-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md mt-2 ${isLate ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' : timeLeft.includes('متبقي') ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-600'}`}>
      <CalendarClock size={14} /><span>{timeLeft}</span>
    </div>
  );
};

// --- المكون الرئيسي ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null); // لعرض الصور المكبرة
  
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const prevOrderCount = useRef(0);
  
  const [activeTab, setActiveTab] = useState('Orders');
  const [joinName, setJoinName] = useState('');
  const [printData, setPrintData] = useState(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [authError, setAuthError] = useState('');

  const showNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const dataPath = (collectionName) => collection(db, 'artifacts', appId, 'public', 'data', collectionName);

    const unsubProfiles = onSnapshot(dataPath('profiles'), (snap) => setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOrders = onSnapshot(dataPath('orders'), (snap) => {
        const fetchedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (prevOrderCount.current !== 0 && fetchedOrders.length > prevOrderCount.current) showNotification("🔔 تم إضافة طلب جديد!");
        prevOrderCount.current = fetchedOrders.length;
        setOrders(fetchedOrders);
    });
    const unsubInventory = onSnapshot(dataPath('inventory'), (snap) => setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubFinished = onSnapshot(dataPath('finished_goods'), (snap) => setFinishedGoods(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubTransactions = onSnapshot(dataPath('transactions'), (snap) => {
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        txs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(txs);
    });

    return () => { unsubProfiles(); unsubOrders(); unsubInventory(); unsubFinished(); unsubTransactions(); };
  }, [user]);

  const myProfile = profiles.find(p => p.uid === user?.uid);

  useEffect(() => {
    if (myProfile && !hasAccess('Dashboard') && activeTab === 'Dashboard') {
      setActiveTab('Orders');
    } else if (myProfile && hasAccess('Dashboard') && activeTab === 'Orders' && myProfile.role !== 'sales') {
        setActiveTab('Dashboard');
    }
  }, [myProfile]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const systemEmail = getSystemEmail(username);
    try {
      if (isSetupMode) await createUserWithEmailAndPassword(auth, systemEmail, password);
      else await signInWithEmailAndPassword(auth, systemEmail, password);
    } catch (err) {
      if (err.code === 'auth/invalid-credential') setAuthError('اسم المستخدم أو كلمة المرور غير صحيحة.');
      else if (err.code === 'auth/email-already-in-use') setAuthError('اسم المستخدم هذا مستخدم مسبقاً.');
      else setAuthError(err.message);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!user || !joinName.trim()) return;
    const isFirst = profiles.length === 0;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), {
      uid: user.uid, name: joinName.trim(), username: username.trim().toLowerCase().replace(/\s+/g, ''),
      role: isFirst ? 'admin' : 'staff', createdAt: new Date().toISOString()
    });
  };

  const hasAccess = (tabId) => {
    if (!myProfile) return false;
    const role = myProfile.role;
    if (role === 'admin') return true;
    
    const permissions = {
      manager: ['Dashboard', 'Orders', 'Production', 'FinishedGoods', 'Store', 'Delivery', 'Sales', 'Finance', 'Customers'],
      operations: ['Dashboard', 'Orders', 'Production', 'FinishedGoods', 'Store', 'Delivery', 'Customers'],
      sales: ['Orders', 'FinishedGoods', 'Sales', 'Customers'],
      production: ['Production'],
      store: ['FinishedGoods', 'Store'],
      delivery: ['Delivery'],
      finance: ['Finance', 'Sales'],
      staff: []
    };
    return permissions[role]?.includes(tabId) || false;
  };

  const TABS = [
    { id: 'Dashboard', icon: LayoutDashboard, label: 'النظرة العامة' },
    { id: 'Orders', icon: ShoppingCart, label: 'إدارة الطلبات' },
    { id: 'Customers', icon: Users, label: 'قاعدة العملاء' },
    { id: 'Production', icon: ChefHat, label: 'خط الإنتاج' },
    { id: 'FinishedGoods', icon: Box, label: 'مخزن الإنتاج التام' },
    { id: 'Delivery', icon: Truck, label: 'التوصيل والشحن' },
    { id: 'Sales', icon: TrendingUp, label: 'سجل المبيعات' },
    { id: 'Finance', icon: DollarSign, label: 'المالية والحسابات' },
    { id: 'Store', icon: StoreIcon, label: 'المخزون والمستودع' },
    { id: 'Admin', icon: ShieldCheck, label: 'إدارة النظام' },
  ];

  // --- واجهات العرض ---
  
  const DashboardView = () => {
    const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'baking').length;
    const readyCount = orders.filter(o => o.status === 'ready').length;
    const finishedCount = finishedGoods.reduce((sum, item) => sum + Number(item.quantity), 0);
    const lowStock = inventory.filter(i => Number(i.quantity) < 10).length;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">نظرة عامة على المصنع</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard title="قيد التحضير (إنتاج)" value={pendingCount} icon={ChefHat} colorClass="bg-orange-100 text-orange-600" onClick={() => setActiveTab('Production')} />
          <StatCard title="طلبات جاهزة للتوصيل" value={readyCount} icon={Truck} colorClass="bg-blue-100 text-blue-600" onClick={() => setActiveTab('Delivery')} />
          <StatCard title="رصيد الإنتاج التام" value={finishedCount} icon={Box} colorClass="bg-green-100 text-green-600" onClick={() => setActiveTab('FinishedGoods')} />
          <StatCard title="مواد منخفضة المخزون" value={lowStock} icon={AlertCircle} colorClass="bg-red-100 text-red-600" onClick={() => setActiveTab('Store')} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-800 mb-4">أحدث النشاطات</h3>
          <div className="space-y-3">
            {orders.slice(0, 5).map(o => {
               const items = getOrderItems(o);
               const displayTitle = items.length > 1 ? `طلب متعدد (${items.length} أصناف)` : (items[0].cakeCategory === 'أخرى (إدخال يدوي)' ? items[0].customCakeType : items[0].cakeCategory);
               return (
              <div key={o.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-100 last:border-0 gap-2 hover:bg-gray-50 cursor-pointer px-2 rounded transition-colors" onClick={() => setActiveTab('Orders')}>
                <div>
                  <p className="font-semibold text-gray-800">{o.customerName} - #{formatOrderNum(o)}</p>
                  <p className="text-xs text-gray-500">{displayTitle} | {formatDate(o.createdAt)}</p>
                </div>
                <div className="self-start sm:self-auto"><StatusBadge status={o.status} /></div>
              </div>
            )})}
            {orders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">لا توجد نشاطات حالية.</p>}
          </div>
        </div>
      </div>
    );
  };

  const OrdersView = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('active');
    const [editingId, setEditingId] = useState(null);
    const [cancelModal, setCancelModal] = useState(null);
    
    const initialItemState = { id: Date.now(), orderSource: 'manufacturing', cakeCategory: 'قالب كيك ايطالي', cakeSize: 'ايطالي ١٢ قطعة', customCakeType: '', quantity: 1, weight: '', price: '', selectedFG: '', itemNotes: '', itemImage: '' };
    
    const [form, setForm] = useState({ 
      customerName: '', phone: '', address: '', contactMethod: 'واتساب',
      deliveryDate: '', globalNotes: '', 
      items: [{ ...initialItemState }],
      totalPrice: ''
    });

    const filteredOrders = orders.filter(o => {
      const orderSearchNum = formatOrderNum(o);
      const matchesSearch = o.customerName?.includes(searchTerm) || o.phone?.includes(searchTerm) || orderSearchNum.includes(searchTerm);
      if (!matchesSearch) return false;
      if (filter === 'active') return ['pending', 'baking', 'ready', 'out_for_delivery'].includes(o.status);
      if (filter === 'completed') return o.status === 'completed';
      if (filter === 'cancelled') return o.status === 'cancelled';
      return true;
    });

    const handleItemImageUpload = async (index, file) => {
      if(!file) return;
      const base64Image = await compressImage(file);
      handleItemChange(index, 'itemImage', base64Image);
    };

    const handleEdit = (order) => {
      setEditingId(order.id);
      setForm({
        customerName: order.customerName || '', phone: order.phone || '', address: order.address || '', contactMethod: order.contactMethod || 'مباشر',
        deliveryDate: order.deliveryDate || '', globalNotes: order.notes || '',
        items: getOrderItems(order),
        totalPrice: order.price || ''
      });
      setModalOpen(true);
    };

    const confirmCancelOrder = async () => {
        const order = cancelModal;
        const items = getOrderItems(order);
        for(const item of items) {
           if(item.orderSource === 'ready_made' && item.selectedFG) {
              const fgItem = finishedGoods.find(g => g.id === item.selectedFG);
              if(fgItem) {
                 await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finished_goods', fgItem.id), {
                    quantity: fgItem.quantity + Number(item.quantity)
                 });
              }
           }
        }
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'cancelled', updatedAt: new Date().toISOString() });
        showNotification('تم إلغاء الطلب واسترجاع الكميات للمخزن التام.');
        setCancelModal(null);
    };

    const handleItemChange = (index, field, value) => {
       const newItems = [...form.items];
       newItems[index][field] = value;
       
       if (field === 'selectedFG') {
          const fgItem = finishedGoods.find(g => g.id === value);
          if (fgItem) {
             newItems[index].cakeCategory = fgItem.name;
             newItems[index].cakeSize = 'جاهز من المخزن';
             newItems[index].price = fgItem.price * newItems[index].quantity;
             if(fgItem.image) newItems[index].itemImage = fgItem.image; // سحب صورة المنتج التام
          }
       }
       if (field === 'quantity' && newItems[index].orderSource === 'ready_made' && newItems[index].selectedFG) {
          const fgItem = finishedGoods.find(g => g.id === newItems[index].selectedFG);
          if (fgItem) newItems[index].price = fgItem.price * value;
       }
       
       const autoTotal = newItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
       setForm({ ...form, items: newItems, totalPrice: autoTotal });
    };

    const addItem = () => setForm({ ...form, items: [...form.items, { ...initialItemState, id: Date.now() }] });
    const removeItem = (index) => {
       const newItems = form.items.filter((_, i) => i !== index);
       const autoTotal = newItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
       setForm({ ...form, items: newItems, totalPrice: autoTotal });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      let finalForm = { ...form, price: form.totalPrice, notes: form.globalNotes };
      
      if (!editingId) {
         for (let item of finalForm.items) {
            if (item.orderSource === 'ready_made') {
               const fgItem = finishedGoods.find(g => g.id === item.selectedFG);
               if (!fgItem || fgItem.quantity < item.quantity) {
                  showNotification(`❌ الكمية المطلوبة من الصنف "${item.cakeCategory}" غير متوفرة في المخزن التام!`);
                  return;
               }
               await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finished_goods', fgItem.id), {
                  quantity: fgItem.quantity - item.quantity
               });
            }
         }
      }

      const allReadyMade = finalForm.items.every(i => i.orderSource === 'ready_made');
      const initialStatus = allReadyMade ? 'ready' : 'pending';

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', editingId), { ...finalForm, updatedAt: new Date().toISOString() });
      } else {
        const nextOrderNum = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber || 0)) + 1 : 1;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
          ...finalForm, status: initialStatus, createdAt: new Date().toISOString(), orderNumber: nextOrderNum
        });
        showNotification("تم حفظ الطلب بنجاح.");
      }
      setModalOpen(false);
      setEditingId(null);
      setForm({ customerName: '', phone: '', address: '', contactMethod: 'واتساب', deliveryDate: '', globalNotes: '', items: [{ ...initialItemState }], totalPrice: '' });
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة الطلبات</h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم، الهاتف، الرقم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
            <button onClick={() => { setEditingId(null); setForm({ customerName: '', phone: '', address: '', contactMethod: 'واتساب', deliveryDate: '', globalNotes: '', items: [{ ...initialItemState }], totalPrice: '' }); setModalOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"><Plus size={20} /> طلب جديد</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilter('active')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>الطلبات النشطة</button>
          <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'completed' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>سجل المنجز</button>
          <button onClick={() => setFilter('cancelled')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white text-gray-600 border'}`}>الطلبات الملغاة</button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>الكل</button>
        </div>
        
        <Table headers={['الصور', 'رقم الطلب', 'العميل', 'الأصناف', 'الموعد', 'الحالة', 'إجراء']}>
          {filteredOrders.map(o => {
            const items = getOrderItems(o);
            // عرض صورة أول صنف، أو الصورة النهائية
            const displayImg = o.finalImage ? o.finalImage : (items[0]?.itemImage || (o.images && o.images[0]));
            return (
            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4">
                {displayImg ? (
                  <div className="relative inline-block cursor-pointer" onClick={() => setZoomedImage(displayImg)}>
                    <img src={displayImg} className={`w-12 h-12 rounded-lg object-cover border-2 shadow-sm ${o.finalImage ? 'border-green-500' : 'border-gray-200'}`} title="انقر للتكبير" alt="cake"/>
                    {o.finalImage && <span className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] px-1 rounded shadow">النهائي</span>}
                  </div>
                ) : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border"><ImageIcon size={20}/></div>}
              </td>
              <td className="p-4 font-mono text-sm text-gray-500 font-bold">#{formatOrderNum(o)}</td>
              <td className="p-4"><p className="font-medium text-gray-800">{o.customerName}</p><p className="text-xs text-gray-500 dir-ltr text-right font-mono">{o.phone}</p><span className="text-[10px] bg-gray-100 px-1 rounded text-gray-600 mt-1 inline-block">{o.contactMethod || 'مباشر'}</span></td>
              <td className="p-4 text-sm text-gray-700">
                 {items.map((i, idx) => (
                    <div key={idx} className="mb-1 text-xs">
                       <span className="font-bold">{i.quantity}x {i.cakeCategory === 'أخرى (إدخال يدوي)' ? i.customCakeType : i.cakeCategory}</span> 
                       {i.orderSource === 'ready_made' && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded mx-1">مخزن</span>}
                    </div>
                 ))}
                 <div className="font-bold text-amber-600 mt-1 border-t pt-1 border-gray-100">الإجمالي: {Number(o.price).toLocaleString()} IQD</div>
              </td>
              <td className="p-4"><Countdown deliveryDate={o.deliveryDate} /></td>
              <td className="p-4"><StatusBadge status={o.status} /></td>
              <td className="p-4 flex gap-2">
                <button onClick={() => setPrintData({...o, printType: 'invoice'})} className="text-gray-600 hover:text-gray-800 p-2 bg-gray-100 rounded-lg transition-colors" title="طباعة الفاتورة"><Printer size={18} /></button>
                <button onClick={() => handleEdit(o)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg transition-colors" title="تعديل"><Edit size={18} /></button>
                {o.status !== 'cancelled' && o.status !== 'completed' && (
                  <button onClick={() => setCancelModal(o)} className="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-lg transition-colors" title="إلغاء الطلب واسترجاع المخزون"><Trash2 size={18} /></button>
                )}
              </td>
            </tr>
          )})}
          {filteredOrders.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-400">لا توجد طلبات مطابقة.</td></tr>}
        </Table>

        <Modal isOpen={!!cancelModal} onClose={() => setCancelModal(null)} title="تأكيد الإلغاء">
          <div className="space-y-4">
            <p className="text-gray-700">هل أنت متأكد من رغبتك في إلغاء هذا الطلب نهائياً؟ (سيتم استرجاع الكميات المسحوبة من المخزن التام تلقائياً)</p>
            <div className="flex gap-3">
              <button onClick={confirmCancelOrder} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">نعم، إلغاء الطلب</button>
              <button type="button" onClick={() => setCancelModal(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-lg transition-colors">تراجع</button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingId ? "تعديل الطلب" : "إنشاء طلب جديد"} maxWidth="max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Customer Info */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
               <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">بيانات العميل والتوصيل</h3>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                 <div><label className="block text-xs font-bold text-gray-700 mb-1">اسم العميل</label><input type="text" required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                 <div><label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف</label><input type="text" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dir-ltr text-right" /></div>
                 <div><label className="block text-xs font-bold text-gray-700 mb-1">طريقة التواصل</label><select value={form.contactMethod} onChange={e => setForm({...form, contactMethod: e.target.value})} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"><option value="مباشر">مباشر (المحل)</option><option value="واتساب">واتساب</option><option value="فيسبوك">فيسبوك</option><option value="انستغرام">انستغرام</option></select></div>
                 <div><label className="block text-xs font-bold text-gray-700 mb-1">موعد التسليم للزبون</label><input type="datetime-local" required value={form.deliveryDate} onChange={e => setForm({...form, deliveryDate: e.target.value})} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
               </div>
               <div><label className="block text-xs font-bold text-gray-700 mb-1">عنوان التوصيل الدقيق</label><input type="text" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
            </div>

            {/* Items List */}
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-amber-900">الأصناف المطلوبة</h3>
                  <button type="button" onClick={addItem} className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-700 flex items-center gap-1 font-bold"><Plus size={16}/> إضافة صنف جديد</button>
               </div>
               
               {form.items.map((item, index) => (
                  <div key={item.id} className="relative bg-white p-4 rounded-xl border border-amber-100 mb-4 shadow-sm">
                     <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                        <div className="flex gap-4">
                           <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-blue-800"><input type="radio" value="manufacturing" disabled={!!editingId} checked={item.orderSource === 'manufacturing'} onChange={e => handleItemChange(index, 'orderSource', e.target.value)} className="w-4 h-4 text-blue-600" /> تصنيع معمل</label>
                           <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-green-800"><input type="radio" value="ready_made" disabled={!!editingId} checked={item.orderSource === 'ready_made'} onChange={e => handleItemChange(index, 'orderSource', e.target.value)} className="w-4 h-4 text-green-600" /> سحب من المخزن التام</label>
                        </div>
                        {form.items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"><Trash2 size={14}/> إزالة</button>}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-8 space-y-4">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {item.orderSource === 'ready_made' ? (
                                 <div className="col-span-full">
                                   <label className="block text-xs font-bold text-gray-700 mb-1">اختر من المخزن التام</label>
                                   <select required={!editingId} value={item.selectedFG} onChange={e => handleItemChange(index, 'selectedFG', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500">
                                     <option value="">-- اختر منتجاً --</option>
                                     {finishedGoods.map(g => <option key={g.id} value={g.id} disabled={g.quantity === 0}>{g.name} (متوفر: {g.quantity}) - {g.price} IQD</option>)}
                                   </select>
                                 </div>
                              ) : (
                                 <>
                                   <div>
                                     <label className="block text-xs font-bold text-gray-700 mb-1">النوع / الفئة</label>
                                     <select value={item.cakeCategory} onChange={e => {handleItemChange(index, 'cakeCategory', e.target.value); handleItemChange(index, 'cakeSize', CAKE_CATEGORIES[e.target.value]?.[0]||'');}} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500">
                                       {Object.keys(CAKE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                     </select>
                                   </div>
                                   {item.cakeCategory === 'أخرى (إدخال يدوي)' ? (
                                     <div><label className="block text-xs font-bold text-gray-700 mb-1">النوع يدوياً</label><input type="text" required value={item.customCakeType} onChange={e => handleItemChange(index, 'customCakeType', e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                                   ) : (
                                     <div><label className="block text-xs font-bold text-gray-700 mb-1">الحجم</label><select value={item.cakeSize} onChange={e => handleItemChange(index, 'cakeSize', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500">{CAKE_CATEGORIES[item.cakeCategory]?.map(sz => <option key={sz} value={sz}>{sz}</option>)}</select></div>
                                   )}
                                 </>
                              )}
                           </div>
                           <div className="grid grid-cols-3 gap-3">
                              <div><label className="block text-xs font-bold text-gray-700 mb-1">الكمية</label><input type="number" required min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" /></div>
                              <div><label className="block text-xs font-bold text-gray-700 mb-1">الوزن (اختياري)</label><input type="text" value={item.weight} onChange={e => handleItemChange(index, 'weight', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" placeholder="مثال: 2 كجم" /></div>
                              <div><label className="block text-xs font-bold text-amber-700 mb-1">سعر الصنف (IQD)</label><input type="number" required min="0" step="1" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="w-full p-2.5 border border-amber-300 bg-amber-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold" /></div>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات خاصة بهذا الصنف (تظهر للمعمل)</label>
                              <textarea value={item.itemNotes} onChange={e => handleItemChange(index, 'itemNotes', e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50" rows="2" placeholder="ألوان معينة، كتابة على الكيك..."></textarea>
                           </div>
                        </div>
                        
                        <div className="md:col-span-4 border-r border-gray-100 pr-4 flex flex-col justify-center items-center">
                           <label className="block text-xs font-bold text-gray-700 mb-2 text-center">صورة التصميم</label>
                           {item.itemImage ? (
                              <div className="relative w-full max-w-[150px] aspect-square group">
                                 <img src={item.itemImage} className="w-full h-full object-cover rounded-xl border-2 border-amber-200 shadow-sm cursor-pointer" alt="item ref" onClick={() => setZoomedImage(item.itemImage)} title="تكبير الصورة" />
                                 <button type="button" onClick={() => handleItemChange(index, 'itemImage', '')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"><Trash2 size={14}/></button>
                              </div>
                           ) : (
                              <div className="w-full max-w-[150px] aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center relative hover:bg-gray-100 transition-colors cursor-pointer">
                                 <UploadCloud size={24} className="text-gray-400 mb-2"/>
                                 <span className="text-xs font-bold text-gray-500 text-center px-2">اضغط لرفع<br/>صورة</span>
                                 <input type="file" accept="image/*" onChange={e => handleItemImageUpload(index, e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               ))}
               
               <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl border-2 border-amber-500 shadow-md">
                  <span className="font-bold text-amber-900 text-lg">المبلغ الإجمالي الكلي للطلب:</span>
                  <div className="flex items-center gap-2">
                     <input type="number" required min="0" value={form.totalPrice} onChange={e => setForm({...form, totalPrice: e.target.value})} className="w-32 md:w-48 p-2 border-b-2 border-amber-500 text-center font-bold text-2xl text-amber-900 outline-none bg-transparent" />
                     <span className="font-bold text-amber-700">IQD</span>
                  </div>
               </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-1">ملاحظات عامة للطلب (للتوصيل والإدارة)</label>
              <textarea value={form.globalNotes} onChange={e => setForm({...form, globalNotes: e.target.value})} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" rows="2" placeholder="مثال: يرجى الاتصال قبل الوصول بنصف ساعة..."></textarea>
            </div>
            
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl mt-6 transition-colors text-lg shadow-lg">
              {editingId ? "حفظ التعديلات" : "تأكيد واعتماد الطلب"}
            </button>
          </form>
        </Modal>
      </div>
    );
  };

  const OrderDetailsModal = ({ isOpen, onClose, order, type, onPrimaryAction, onSecondaryAction }) => {
    if (!isOpen || !order) return null;
    const hideSensitiveInfo = type.includes('production');
    const items = getOrderItems(order);

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل طلب #${formatOrderNum(order)}`} maxWidth="max-w-2xl">
        <div className="space-y-4">
           {!hideSensitiveInfo && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <p className="font-bold text-gray-800 text-lg">{order.customerName}</p>
                     <p className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Phone size={10}/> {order.contactMethod || 'مباشر'}</p>
                   </div>
                   <span className="font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 text-lg">{Number(order.price).toLocaleString()} IQD</span>
                </div>
                <p className="text-sm text-gray-600 mb-2 dir-ltr text-right font-mono font-bold">{order.phone}</p>
                <p className="text-sm text-gray-700 bg-white p-2 rounded border"><span className="font-bold">العنوان:</span> {order.address}</p>
                {order.notes && <p className="mt-2 text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200"><span className="font-bold">ملاحظات التوصيل:</span> {order.notes}</p>}
              </div>
           )}

           <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
              <p className="text-sm font-bold text-amber-900 border-b border-amber-200 pb-2 mb-3">الأصناف المطلوبة ({items.length}):</p>
              {items.map((i, idx) => (
                <div key={idx} className="flex gap-4 bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                   {i.itemImage ? (
                      <div className="relative cursor-pointer group flex-shrink-0" onClick={() => setZoomedImage(i.itemImage)}>
                         <img src={i.itemImage} className="w-16 h-16 object-cover rounded border shadow-sm" alt="item" />
                         <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center"><ZoomIn size={16} className="text-white"/></div>
                      </div>
                   ) : (
                      <div className="w-16 h-16 bg-gray-50 border rounded flex items-center justify-center text-gray-300 flex-shrink-0"><Cake size={24}/></div>
                   )}
                   <div className="flex-1">
                     <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-amber-900 text-sm">{i.cakeCategory === 'أخرى (إدخال يدوي)' ? i.customCakeType : i.cakeCategory}</p>
                        <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold text-xs shadow-sm">{i.quantity} ق</span>
                     </div>
                     <p className="text-xs text-amber-700 mb-1">{i.cakeSize} {i.weight && `| ${i.weight}`} {i.orderSource==='ready_made'&&<span className="bg-green-100 text-green-700 px-1 rounded mx-1">مخزن</span>}</p>
                     {i.itemNotes && <p className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100"><span className="font-bold">ملاحظات:</span> {i.itemNotes}</p>}
                   </div>
                </div>
              ))}
           </div>

           <div className="flex justify-center p-3 bg-gray-50 rounded-xl border border-gray-200"><Countdown deliveryDate={order.deliveryDate} /></div>

           {order.finalImage && (
             <div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-4 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => setZoomedImage(order.finalImage)}>
               <p className="text-sm font-bold text-green-800 mb-3 flex items-center justify-center gap-2"><CheckCircle size={16}/> الصورة النهائية للمنتج (اضغط للتكبير)</p>
               <img src={order.finalImage} alt="final" className="w-full max-h-48 object-contain rounded-lg border border-green-300 shadow-sm mx-auto bg-white" />
             </div>
           )}

           <div className="pt-4 border-t border-gray-100 flex gap-2">
              {type === 'production_pending' && <button onClick={() => onPrimaryAction(order)} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2"><Play size={20} /> البدء بالتحضير</button>}
              {type === 'production_baking' && (
                <><button onClick={() => onPrimaryAction(order)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2"><CheckCircle size={20} /> تأكيد الإنجاز النهائي</button><button onClick={() => onSecondaryAction(order)} className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-4 py-3 rounded-lg shadow-md" title="طباعة تذكرة عمل (للمعمل)"><Printer size={20} /></button></>
              )}
              {type === 'delivery_dispatch' && <button onClick={() => onPrimaryAction(order)} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2"><Truck size={20} /> إرسال مع السائق</button>}
              {type === 'delivery_complete' && <button onClick={() => onPrimaryAction(order)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2"><CheckCircle size={20} /> تأكيد استلام الزبون وإضافة الإيراد</button>}
           </div>
        </div>
      </Modal>
    );
  };

  const CustomersView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const customersMap = {};
    orders.forEach(o => {
      if(o.status === 'cancelled') return;
      const phone = o.phone?.trim() || 'بدون رقم';
      if(!customersMap[phone]) {
         customersMap[phone] = { phone: phone, name: o.customerName, address: o.address, methods: new Set(), totalSpent: 0, orderCount: 0, lastOrder: o.createdAt };
      }
      if(o.contactMethod) customersMap[phone].methods.add(o.contactMethod);
      customersMap[phone].totalSpent += Number(o.price || 0);
      customersMap[phone].orderCount += 1;
      if(new Date(o.createdAt) > new Date(customersMap[phone].lastOrder)) {
          customersMap[phone].lastOrder = o.createdAt;
          customersMap[phone].name = o.customerName; 
          customersMap[phone].address = o.address;
      }
    });

    const customersList = Object.values(customersMap)
      .filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm))
      .sort((a,b) => b.totalSpent - a.totalSpent);

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h2 className="text-2xl font-bold text-gray-800">قاعدة بيانات العملاء</h2><p className="text-sm text-gray-500 mt-1">يتم تحديثها تلقائياً مع كل طلب جديد</p></div>
          <div className="relative w-full md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم أو الهاتف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard title="إجمالي عدد العملاء" value={Object.keys(customersMap).length} icon={Users} colorClass="bg-blue-100 text-blue-600" />
        </div>

        <Table headers={['اسم العميل', 'رقم الهاتف', 'طرق التواصل', 'إجمالي الطلبات', 'إجمالي المدفوعات', 'آخر طلب', 'العنوان المعتاد']}>
          {customersList.map((c, i) => (
             <tr key={i} className="hover:bg-gray-50">
               <td className="p-4 font-bold text-gray-800">{c.name}</td>
               <td className="p-4 dir-ltr text-right font-mono text-sm">{c.phone}</td>
               <td className="p-4 text-xs"><div className="flex gap-1 flex-wrap">{Array.from(c.methods).map(m => <span key={m} className="bg-gray-100 border px-2 py-0.5 rounded">{m}</span>)}</div></td>
               <td className="p-4 font-bold text-blue-600">{c.orderCount}</td>
               <td className="p-4 font-bold text-green-700">{c.totalSpent.toLocaleString()} IQD</td>
               <td className="p-4 text-sm text-gray-500">{formatDate(c.lastOrder)}</td>
               <td className="p-4 text-sm text-gray-600 truncate max-w-xs" title={c.address}>{c.address}</td>
             </tr>
          ))}
          {customersList.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-400">لا توجد بيانات عملاء.</td></tr>}
        </Table>
      </div>
    );
  };

  const ProductionView = () => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const bakingOrders = orders.filter(o => o.status === 'baking');
    const completedOrders = orders.filter(o => ['ready', 'out_for_delivery', 'completed'].includes(o.status)).slice(0, 10);
    
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderType, setOrderType] = useState(''); 
    const [completionModal, setCompletionModal] = useState({ isOpen: false, order: null, finalImage: '' });

    const handleStartBaking = async (order) => {
       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'baking', updatedAt: new Date().toISOString() });
       setSelectedOrder(null);
       showNotification("تم نقل الطلب إلى مرحلة جاري التحضير.");
    };

    const triggerCompletion = (order) => {
       setSelectedOrder(null);
       setCompletionModal({ isOpen: true, order: order, finalImage: '' }); 
    };

    const handleCompleteUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const compressedImage = await compressImage(file);
        setCompletionModal(prev => ({ ...prev, finalImage: compressedImage }));
      }
    };

    const confirmCompletion = async () => {
      const order = completionModal.order;
      const updateData = { status: 'ready', updatedAt: new Date().toISOString() };
      if (completionModal.finalImage) updateData.finalImage = completionModal.finalImage;
      
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), updateData);
      setCompletionModal({ isOpen: false, order: null, finalImage: '' });
      showNotification("✅ تم تجهيز الطلب وهو جاهز الآن للتوصيل!");
    };

    const handlePrintProduction = (order) => {
      setPrintData({ ...order, printType: 'production' });
    };

    const renderOrderCard = (o, type) => {
      const items = getOrderItems(o);
      const displayTitle = items.length > 1 ? `طلب متعدد (${items.length} أصناف)` : (items[0].cakeCategory === 'أخرى (إدخال يدوي)' ? items[0].customCakeType : items[0].cakeCategory);
      const displayImg = items[0]?.itemImage || (o.images && o.images[0]);
      return (
         <div key={o.id} onClick={() => {setSelectedOrder(o); setOrderType(type);}} className={`p-3 border rounded-xl relative shadow-sm cursor-pointer transition-all flex flex-col text-center ${type === 'production_pending' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' : 'border-orange-200 bg-orange-50 hover:bg-orange-100'}`}>
            <span className="font-mono font-bold text-gray-500 text-xs mb-1">#{formatOrderNum(o)}</span>
            <p className="font-bold text-gray-900 text-sm mb-2 flex-1 line-clamp-2">{displayTitle}</p>
            {displayImg ? (
               <img src={displayImg} className="w-full h-24 object-cover rounded-lg mb-2 shadow-sm border border-white" alt="ref" />
            ) : (
               <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-2 text-gray-400 border border-white"><ImageIcon size={24}/></div>
            )}
            <Countdown deliveryDate={o.deliveryDate} />
         </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">خط الإنتاج (المعمل)</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-lg"><Clock className="text-yellow-500"/> بانتظار التحضير</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {pendingOrders.map(o => renderOrderCard(o, 'production_pending'))}
               {pendingOrders.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-4">لا توجد طلبات معلقة.</p>}
             </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-lg"><ChefHat className="text-orange-500"/> جاري التحضير</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {bakingOrders.map(o => renderOrderCard(o, 'production_baking'))}
               {bakingOrders.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-4">لا يوجد عمل قيد الإنجاز.</p>}
             </div>
           </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle size={20} className="text-green-500"/> سجل المنجز للإنتاج</h3>
          <Table headers={['رقم الطلب', 'صورة النهاية', 'العناصر', 'وقت الإنجاز', 'الحالة']}>
            {completedOrders.map(o => {
               const items = getOrderItems(o);
               const displayTitle = items.length > 1 ? `طلب متعدد (${items.length})` : (items[0].cakeCategory === 'أخرى (إدخال يدوي)' ? items[0].customCakeType : items[0].cakeCategory);
               return (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-sm text-gray-500 font-bold">#{formatOrderNum(o)}</td>
                <td className="p-4">
                  {o.finalImage ? (
                    <img src={o.finalImage} className="w-12 h-12 rounded object-cover border border-green-400 shadow-sm cursor-pointer" alt="final" onClick={()=>setZoomedImage(o.finalImage)}/>
                  ) : <span className="text-xs text-gray-400">لا توجد</span>}
                </td>
                <td className="p-4 font-medium text-sm">{displayTitle}</td>
                <td className="p-4 text-sm text-gray-500">{formatDate(o.updatedAt || o.createdAt)}</td>
                <td className="p-4"><StatusBadge status={o.status} /></td>
              </tr>
            )})}
            {completedOrders.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-400">السجل فارغ.</td></tr>}
          </Table>
        </div>

        <OrderDetailsModal 
           isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} type={orderType}
           onPrimaryAction={orderType === 'production_pending' ? handleStartBaking : triggerCompletion}
           onSecondaryAction={handlePrintProduction}
        />

        <Modal isOpen={completionModal.isOpen} onClose={() => setCompletionModal({ isOpen: false, order: null, finalImage: '' })} title="تأكيد تجهيز الطلب">
          <div className="space-y-4">
            <p className="text-gray-700">هل أنت متأكد من الانتهاء من تجهيز الطلب <span className="font-mono font-bold bg-gray-100 px-1">#{completionModal.order && formatOrderNum(completionModal.order)}</span>؟</p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center justify-center gap-2"><Camera size={18} /> إرفاق صورة للمنتج بعد الإكمال (اختياري)</label>
              <input type="file" accept="image/*" onChange={handleCompleteUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              {completionModal.finalImage && <img src={completionModal.finalImage} alt="final product" className="mt-4 w-full max-h-48 object-contain rounded-lg border shadow-sm mx-auto" />}
            </div>
            <button onClick={confirmCompletion} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow flex justify-center items-center gap-2">تأكيد الإنجاز النهائي <CheckCircle size={18}/></button>
          </div>
        </Modal>
      </div>
    );
  };

  const FinishedGoodsView = () => {
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isSellModalOpen, setSellModalOpen] = useState(false);
    const [addStockModal, setAddStockModal] = useState(null); // لإضافة رصيد لمنتج موجود
    const [deleteFGModal, setDeleteFGModal] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [form, setForm] = useState({ code: '', name: '', quantity: 1, price: '', image: '' });
    const [sellQty, setSellQty] = useState(1);
    const [addQty, setAddQty] = useState(1);
    const [sellForm, setSellForm] = useState({ type: 'direct', customerName: '', phone: '', address: '' });

    const filteredGoods = finishedGoods.filter(g => g.name.includes(searchTerm) || (g.code && g.code.includes(searchTerm)));

    const handleUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const compressedImage = await compressImage(file);
        setForm(prev => ({ ...prev, image: compressedImage }));
      }
    };

    const handleAddItem = async (e) => {
      e.preventDefault();
      const existingItem = finishedGoods.find(item => item.name.trim() === form.name.trim() && item.code === form.code);
      if (existingItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finished_goods', existingItem.id), {
          quantity: existingItem.quantity + Number(form.quantity), price: Number(form.price) || existingItem.price, lastAddedAt: new Date().toISOString()
        });
        showNotification(`تم إضافة ${form.quantity} للرصيد السابق.`);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'finished_goods'), {
          ...form, quantity: Number(form.quantity), price: Number(form.price), addedAt: new Date().toISOString(), lastAddedAt: new Date().toISOString()
        });
        showNotification("تم إضافة المنتج الجديد للمخزن التام.");
      }
      setAddModalOpen(false);
      setForm({ code: '', name: '', quantity: 1, price: '', image: '' });
    };

    const confirmAddStock = async (e) => {
       e.preventDefault();
       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finished_goods', addStockModal.id), {
          quantity: addStockModal.quantity + addQty,
          lastAddedAt: new Date().toISOString()
       });
       showNotification("تم زيادة رصيد المنتج بنجاح.");
       setAddStockModal(null);
       setAddQty(1);
    };

    const confirmDeleteFG = async () => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finished_goods', deleteFGModal));
      showNotification("تم حذف المنتج بنجاح.");
      setDeleteFGModal(null);
    };

    const handleSell = async (e) => {
      e.preventDefault();
      if (sellQty > selectedItem.quantity) { showNotification("❌ الكمية المطلوبة أكبر من المتوفر!"); return; }
      
      const newQty = selectedItem.quantity - sellQty;
      const totalRevenue = sellQty * selectedItem.price;
      const now = new Date().toISOString();

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finished_goods', selectedItem.id), { quantity: newQty });
      
      const baseOrderData = {
        items: [{
           id: Date.now(), cakeCategory: selectedItem.name, cakeSize: 'جاهز من المخزن', 
           quantity: sellQty, price: totalRevenue, orderSource: 'ready_made', selectedFG: selectedItem.id, itemImage: selectedItem.image || ''
        }],
        price: totalRevenue, createdAt: now, orderNumber: Date.now() % 10000,
        images: selectedItem.image ? [selectedItem.image] : [], deliveryDate: now
      };

      if (sellForm.type === 'direct') {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
          category: 'revenue', type: 'income', amount: totalRevenue, description: `بيع مباشر (مخزن تام): ${sellQty}x ${selectedItem.name}`, date: now
        });

        const receiptData = {
          ...baseOrderData, id: 'DIR-' + Date.now().toString().slice(-6),
          customerName: 'بيع مباشر (مخزن تام)', phone: '-', address: 'تسليم باليد', contactMethod: 'مباشر',
          status: 'completed', completedAt: now, printType: 'receipt'
        };

        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), receiptData);
        showNotification("تم إخراج المنتج بنجاح.");
        setPrintData(receiptData); 
      } else {
        const deliveryOrderData = {
          ...baseOrderData,
          customerName: sellForm.customerName, phone: sellForm.phone, address: sellForm.address, contactMethod: 'مباشر',
          status: 'ready' 
        };
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), deliveryOrderData);
        showNotification("تم سحب المنتج وتحويله لقسم التوصيل بنجاح.");
      }

      setSellModalOpen(false);
      setSelectedItem(null);
      setSellQty(1);
      setSellForm({ type: 'direct', customerName: '', phone: '', address: '' });
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
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col relative group">
              <button onClick={(e) => { e.stopPropagation(); setDeleteFGModal(item.id); }} className="absolute top-2 left-2 bg-white hover:bg-red-600 text-red-600 hover:text-white p-2 rounded-full transition-colors z-10 shadow-md border border-gray-100" title="حذف المنتج نهائياً"><Trash2 size={16}/></button>
              {item.image ? <img src={item.image} alt={item.name} className="w-full h-40 object-cover cursor-pointer" onClick={()=>setZoomedImage(item.image)} /> : <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400"><Box size={40}/></div>}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-gray-800 line-clamp-1" title={item.name}>{item.name}</h3><span className="text-xs bg-gray-100 font-mono px-2 py-1 rounded text-gray-600 border">{item.code}</span></div>
                <p className="text-green-700 font-bold text-lg mb-2">{Number(item.price).toLocaleString()} IQD</p>
                <div className="bg-gray-50 rounded p-2 mb-4 border border-gray-100">
                   <p className="text-sm text-gray-600 flex justify-between items-center mb-1">الرصيد المتوفر: <span className={`font-bold text-lg ${item.quantity < 5 ? 'text-red-600' : 'text-blue-700'}`}>{item.quantity}</span></p>
                   <p className="text-[10px] text-gray-500 border-t pt-1 mt-1 border-gray-200">آخر إضافة: {formatDate(item.lastAddedAt || item.addedAt) || 'غير محدد'}</p>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                   <button onClick={() => {setAddStockModal(item); setAddQty(1);}} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1 border border-blue-200"><Plus size={14}/> إضافة رصيد</button>
                   <button onClick={() => {setSelectedItem(item); setSellQty(1); setSellForm({ type: 'direct', customerName: '', phone: '', address: '' }); setSellModalOpen(true);}} disabled={item.quantity === 0} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-gray-300 text-white py-2 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"><Tag size={14} /> سحب/بيع</button>
                </div>
              </div>
            </div>
          ))}
          {filteredGoods.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">المخزن التام فارغ أو لا توجد نتائج مطابقة.</p>}
        </div>

        <Modal isOpen={!!deleteFGModal} onClose={() => setDeleteFGModal(null)} title="تأكيد الحذف">
          <div className="space-y-4">
            <p className="text-gray-700 font-medium">هل أنت متأكد من حذف هذا المنتج نهائياً من المخزن التام؟</p>
            <div className="flex gap-3">
              <button onClick={confirmDeleteFG} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">نعم، احذف المنتج</button>
              <button onClick={() => setDeleteFGModal(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-lg transition-colors">تراجع</button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={!!addStockModal} onClose={() => setAddStockModal(null)} title="إضافة رصيد للمنتج">
          <form onSubmit={confirmAddStock} className="space-y-4">
             <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4 border mb-2">
                {addStockModal?.image && <img src={addStockModal.image} className="w-16 h-16 rounded-md object-cover border" alt="item"/>}
                <div><h4 className="font-bold text-gray-800 text-lg">{addStockModal?.name}</h4><p className="text-sm text-gray-600">الرصيد الحالي: <span className="font-bold text-blue-600">{addStockModal?.quantity}</span></p></div>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الجديدة المراد إضافتها للرصيد</label>
                <input type="number" required min="1" value={addQty} onChange={e => setAddQty(Number(e.target.value))} className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold" />
             </div>
             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-2 transition-colors flex justify-center items-center gap-2"><Plus size={18}/> تحديث الرصيد</button>
          </form>
        </Modal>

        <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة منتج جاهز للمخزن">
          <form onSubmit={handleAddItem} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label><input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /><p className="text-xs text-gray-500 mt-1">إذا كان الاسم موجوداً مسبقاً، سيتم تجميع الكمية كـ (رصيد تراكمي).</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">كود المنتج (اختياري)</label><input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none dir-ltr text-right" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">الكمية المضافة</label><input type="number" required min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع للقطعة (IQD)</label><input type="number" required min="0" step="1" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">صورة المنتج</label><input type="file" accept="image/*" onChange={handleUpload} className="w-full p-2 border rounded-lg bg-gray-50" />{form.image && <img src={form.image} alt="preview" className="mt-2 h-20 object-contain rounded border" />}</div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors">تأكيد الإضافة</button>
          </form>
        </Modal>

        {selectedItem && (
          <Modal isOpen={isSellModalOpen} onClose={() => setSellModalOpen(false)} title="إخراج من المخزن التام">
            <form onSubmit={handleSell} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4 border">
                {selectedItem.image && <img src={selectedItem.image} className="w-16 h-16 rounded-md object-cover" alt="item"/>}
                <div><h4 className="font-bold text-gray-800">{selectedItem.name}</h4><p className="text-sm text-gray-600">متوفر: {selectedItem.quantity} قطعة</p></div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-2">
                 <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-blue-900"><input type="radio" value="direct" checked={sellForm.type === 'direct'} onChange={e => setSellForm({...sellForm, type: e.target.value})} className="w-4 h-4 text-blue-600" /> تسليم فوري (مباشر للزبون وتأكيد الإيراد)</label>
                 <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-purple-900"><input type="radio" value="delivery" checked={sellForm.type === 'delivery'} onChange={e => setSellForm({...sellForm, type: e.target.value})} className="w-4 h-4 text-purple-600" /> إرسال مع مندوب التوصيل</label>
              </div>

              {sellForm.type === 'delivery' && (
                <div className="space-y-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
                  <input type="text" required placeholder="اسم العميل" value={sellForm.customerName} onChange={e => setSellForm({...sellForm, customerName: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none bg-white" />
                  <input type="text" required placeholder="رقم الهاتف" value={sellForm.phone} onChange={e => setSellForm({...sellForm, phone: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none dir-ltr text-right bg-white" />
                  <textarea required placeholder="عنوان التوصيل الدقيق" value={sellForm.address} onChange={e => setSellForm({...sellForm, address: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none bg-white" rows="2"></textarea>
                </div>
              )}

              <div><label className="block text-sm font-medium text-gray-700 mb-1">الكمية المراد سحبها</label><input type="number" required min="1" max={selectedItem.quantity} value={sellQty} onChange={e => setSellQty(Number(e.target.value))} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold" /></div>
              
              <div className={`${sellForm.type === 'direct' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-200 text-gray-800'} p-4 rounded-lg border`}>
                <p className="text-sm font-medium mb-1">الإجمالي المستحق:</p>
                <p className="text-2xl font-bold">{(sellQty * selectedItem.price).toLocaleString()} IQD</p>
              </div>

              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg mt-4 transition-colors flex justify-center items-center gap-2">
                 {sellForm.type === 'direct' ? <><Printer size={18}/> تأكيد وطباعة الوصل</> : <><Truck size={18}/> تحويل إلى قسم التوصيل</>}
              </button>
            </form>
          </Modal>
        )}
      </div>
    );
  };

  const DeliveryView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('active');
    const [selectedOrder, setSelectedOrder] = useState(null);

    const activeDeliveries = orders.filter(o => ['ready', 'out_for_delivery'].includes(o.status));
    const historyDeliveries = orders.filter(o => o.status === 'completed');

    const displayedOrders = (viewMode === 'active' ? activeDeliveries : historyDeliveries).filter(o => {
      const orderSearchNum = formatOrderNum(o);
      return o.customerName?.includes(searchTerm) || o.phone?.includes(searchTerm) || o.address?.includes(searchTerm) || orderSearchNum.includes(searchTerm);
    });

    const handleDispatch = async (order) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'out_for_delivery', dispatchedAt: new Date().toISOString() });
      setSelectedOrder(null);
    };

    const handleDelivered = async (order) => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'completed', completedAt: now });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
        category: 'revenue', type: 'income', amount: Number(order.price), description: `إيراد طلب: ${order.customerName} #${formatOrderNum(order)}`, date: now, relatedOrderId: order.id
      });
      setSelectedOrder(null);
      showNotification("تم تسليم الطلب وإضافة قيمته للحسابات.");
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">التوصيل والشحن</h2>
          <div className="relative w-full md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم، الهاتف، الرقم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'active' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>الطلبات الحالية</button>
          <button onClick={() => setViewMode('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'history' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>السجل العام</button>
        </div>

        {viewMode === 'active' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Package size={18} className="text-blue-500"/> جاهز للشحن</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedOrders.filter(o => o.status === 'ready').map(o => (
                  <div key={o.id} onClick={() => setSelectedOrder(o)} className="p-3 border border-blue-200 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors flex flex-col text-right">
                    <span className="font-mono text-xs text-blue-500 font-bold mb-1">#{formatOrderNum(o)}</span>
                    <h4 className="font-bold text-gray-800 line-clamp-1">{o.customerName}</h4>
                    <p className="text-xs text-gray-600 my-1 font-medium line-clamp-1">{o.address}</p>
                    <div className="mt-auto pt-2"><Countdown deliveryDate={o.deliveryDate} /></div>
                  </div>
                ))}
                {displayedOrders.filter(o => o.status === 'ready').length === 0 && <p className="text-sm text-gray-400 py-2 col-span-full text-center">لا توجد طلبات.</p>}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Truck size={18} className="text-purple-500"/> في الطريق للعميل</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedOrders.filter(o => o.status === 'out_for_delivery').map(o => (
                  <div key={o.id} onClick={() => setSelectedOrder(o)} className="p-3 border border-purple-200 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors flex flex-col text-right">
                     <span className="font-mono text-xs text-purple-500 font-bold mb-1">#{formatOrderNum(o)}</span>
                     <h4 className="font-bold text-gray-800 line-clamp-1">{o.customerName}</h4>
                     <p className="text-xs text-gray-600 my-1 font-medium line-clamp-1">{o.address}</p>
                     <div className="mt-auto pt-2"><Countdown deliveryDate={o.deliveryDate} /></div>
                  </div>
                ))}
                 {displayedOrders.filter(o => o.status === 'out_for_delivery').length === 0 && <p className="text-sm text-gray-400 py-2 col-span-full text-center">لا يوجد سائقون في الخارج.</p>}
              </div>
            </div>
          </div>
        ) : (
          <Table headers={['رقم الطلب', 'العميل', 'الهاتف', 'العنوان', 'تاريخ التسليم']}>
            {displayedOrders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-xs text-gray-500 font-bold">#{formatOrderNum(o)}</td>
                <td className="p-4 font-medium">{o.customerName}</td>
                <td className="p-4 dir-ltr text-right text-sm font-mono">{o.phone}</td>
                <td className="p-4 text-sm text-gray-600">{o.address}</td>
                <td className="p-4 text-sm text-gray-500">{formatDate(o.completedAt)}</td>
              </tr>
            ))}
          </Table>
        )}

        <OrderDetailsModal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} type={selectedOrder?.status === 'ready' ? 'delivery_dispatch' : 'delivery_complete'} onPrimaryAction={selectedOrder?.status === 'ready' ? handleDispatch : handleDelivered} />
      </div>
    );
  };

  const SalesView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const completed = orders.filter(o => {
      const searchNum = formatOrderNum(o);
      return o.status === 'completed' && (o.customerName?.includes(searchTerm) || searchNum.includes(searchTerm));
    });
    
    const monthlyData = {};
    completed.forEach(o => {
      const monthYear = o.completedAt ? o.completedAt.substring(0, 7) : 'غير محدد';
      if (!monthlyData[monthYear]) monthlyData[monthYear] = { count: 0, revenue: 0 };
      monthlyData[monthYear].count += 1;
      monthlyData[monthYear].revenue += Number(o.price);
    });

    const totalSales = completed.reduce((sum, o) => sum + Number(o.price), 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">سجل المبيعات</h2>
          <div className="relative w-full md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم أو الرقم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="الطلبات المكتملة" value={completed.length} icon={CheckCircle} colorClass="bg-green-100 text-green-600" />
          <StatCard title="إجمالي الإيرادات" value={`${totalSales.toLocaleString()} IQD`} icon={TrendingUp} colorClass="bg-blue-100 text-blue-600" />
        </div>
        
        <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4 border-b pb-2">التقارير الشهرية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(monthlyData).sort().reverse().map(([month, data]) => (
            <div key={month} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1 h-full bg-amber-500"></div>
              <h4 className="font-bold text-gray-700 mb-2 dir-ltr text-right">{month}</h4>
              <p className="text-sm text-gray-500 mb-1">الطلبات: <span className="font-bold text-gray-700">{data.count}</span></p>
              <p className="text-xl font-bold text-green-600 mt-2">{data.revenue.toLocaleString()} IQD</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">التفاصيل</h3>
        <Table headers={['رقم الطلب', 'تاريخ الاكتمال', 'العميل', 'الأصناف', 'الإيراد']}>
          {completed.map(o => {
            const items = getOrderItems(o);
            return (
             <tr key={o.id} className="hover:bg-gray-50">
               <td className="p-4 font-mono text-xs text-gray-500 font-bold">#{formatOrderNum(o)}</td>
               <td className="p-4 text-sm">{formatDate(o.completedAt)}</td>
               <td className="p-4 font-medium">{o.customerName}</td>
               <td className="p-4 text-sm">{items.map((i, idx) => <div key={idx}>{i.quantity}x {i.cakeCategory === 'أخرى (إدخال يدوي)' ? i.customCakeType : i.cakeCategory}</div>)}</td>
               <td className="p-4 font-semibold text-green-700">+ {Number(o.price).toLocaleString()} IQD</td>
             </tr>
          )})}
        </Table>
      </div>
    );
  };

  const StoreView = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ itemName: '', type: 'مكونات', quantity: '', unit: 'كجم', price: '' });

    const handleSubmit = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), { ...form, quantity: Number(form.quantity), price: Number(form.price) || 0, lastUpdated: new Date().toISOString() });
      setModalOpen(false);
      setForm({ itemName: '', type: 'مكونات', quantity: '', unit: 'كجم', price: '' });
    };

    const handleAdjustQty = async (id, currentQty, change) => {
      const newQty = Number(currentQty) + change;
      if (newQty < 0) return;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id), { quantity: newQty, lastUpdated: new Date().toISOString() });
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">المخزون والمستودع (المواد الخام)</h2>
          <button onClick={() => setModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"><Plus size={20} /> إضافة مادة خام</button>
        </div>

        <Table headers={['اسم العنصر', 'الفئة', 'الرصيد الحالي', 'سعر الوحدة', 'إجمالي القيمة', 'تعديل الكمية']}>
          {inventory.map(item => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="p-4 font-semibold text-gray-800">{item.itemName}</td>
              <td className="p-4 text-sm text-gray-600">{item.type}</td>
              <td className="p-4"><span className={`px-3 py-1 rounded-full text-sm font-bold ${item.quantity < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.quantity} {item.unit}</span></td>
              <td className="p-4 text-sm font-medium text-gray-700">{Number(item.price || 0).toLocaleString()} IQD</td>
              <td className="p-4 font-bold text-amber-700 bg-amber-50/50">{(Number(item.quantity) * Number(item.price || 0)).toLocaleString()} IQD</td>
              <td className="p-4 flex space-x-2 space-x-reverse">
                <button onClick={() => handleAdjustQty(item.id, item.quantity, 1)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded font-bold">+</button>
                <button onClick={() => handleAdjustQty(item.id, item.quantity, -1)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded font-bold">-</button>
              </td>
            </tr>
          ))}
          {inventory.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">المستودع فارغ حالياً.</td></tr>}
        </Table>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="إضافة مادة للمخزون">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم العنصر</label><input type="text" required value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none">
                <option value="مكونات">مكونات ومواد خام</option><option value="تغليف">مواد تغليف وعلب</option><option value="معدات">معدات وأدوات</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label><input type="number" required min="0" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">سعر الوحدة (IQD)</label><input type="number" step="1" min="0" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label><select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none"><option value="كجم">كجم</option><option value="جرام">جرام</option><option value="قطعة">قطعة</option><option value="لتر">لتر</option></select></div>
            </div>
            <button type="submit" className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg mt-4">حفظ العنصر</button>
          </form>
        </Modal>
      </div>
    );
  };

  const FinanceView = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [form, setForm] = useState({ type: 'expense', category: 'daily_ops', amount: '', description: '' });

    const categories = { revenue: 'إيرادات المبيعات', other_income: 'إيرادات أخرى', rent: 'إيجار', salaries: 'رواتب', internet: 'إنترنت', bonuses: 'مكافآت', maintenance: 'صيانة عامة', marketing: 'تسويق', personal: 'مسحوبات شخصية', daily_ops: 'مصاريف تشغيلية يومية', inventory_purchase: 'مواد مضافة (مشتريات)' };
    const currentInventoryValue = inventory.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price || 0)), 0);
    const filteredTransactions = transactions.filter(t => filterCategory === 'all' || t.category === filterCategory);
    const calcTotal = (condition) => transactions.filter(condition).reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalIncome = calcTotal(t => t.type === 'income');
    const totalExpense = calcTotal(t => t.type === 'expense');
    const netProfit = totalIncome - totalExpense;

    const handleSubmit = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), { ...form, amount: Number(form.amount), date: new Date().toISOString() });
      setModalOpen(false);
      setForm({ type: 'expense', category: 'daily_ops', amount: '', description: '' });
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">المالية والحسابات</h2>
          <button onClick={() => setModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"><Plus size={20} /> معاملة جديدة</button>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
           <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><FileText size={20} className="text-amber-600"/> تقرير الملخص المالي</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs text-blue-800 font-medium">قيمة المخزون الخام</p><p className="text-lg md:text-xl font-bold text-blue-900 mt-1">{currentInventoryValue.toLocaleString()} IQD</p></div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100"><p className="text-xs text-green-800 font-medium">إجمالي الإيرادات</p><p className="text-lg md:text-xl font-bold text-green-900 mt-1">{totalIncome.toLocaleString()} IQD</p></div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100"><p className="text-xs text-red-800 font-medium">إجمالي المصروفات</p><p className="text-lg md:text-xl font-bold text-red-900 mt-1">{totalExpense.toLocaleString()} IQD</p></div>
              <div className={`p-4 rounded-lg border ${netProfit >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-100 border-gray-200'}`}><p className={`text-xs font-bold ${netProfit >= 0 ? 'text-amber-800' : 'text-gray-600'}`}>صافي الأرباح</p><p className={`text-lg md:text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-amber-900' : 'text-gray-800'}`}>{netProfit.toLocaleString()} IQD</p></div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-100 p-3 rounded-lg border gap-4 no-print">
           <span className="font-medium text-gray-700">تصفية السجل اليومي:</span>
           <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-amber-500 w-full md:w-auto bg-white"><option value="all">عرض كل المعاملات</option>{Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>

        <div className="print-section">
          <Table headers={['التاريخ', 'النوع', 'الفئة', 'الوصف', 'المبلغ']}>
            {filteredTransactions.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm whitespace-nowrap">{formatDate(t.date)}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.type === 'income' ? 'إيراد' : 'مصروف'}</span></td>
                <td className="p-4 text-sm">{categories[t.category] || t.category}</td>
                <td className="p-4 text-gray-800 max-w-xs truncate">{t.description}</td>
                <td className={`p-4 font-bold dir-ltr text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'} {Number(t.amount).toLocaleString()} IQD</td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-400">لا توجد معاملات مطابقة للفلتر.</td></tr>}
          </Table>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="تسجيل معاملة مالية">
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">النوع</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value, category: e.target.value === 'income' ? 'other_income' : 'daily_ops'})} className="w-full p-2.5 border rounded-lg outline-none"><option value="expense">مصروفات (-)</option><option value="income">إيرادات (+)</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none">{form.type === 'income' ? (<><option value="revenue">مبيعات</option><option value="other_income">أخرى</option></>) : (<><option value="daily_ops">تشغيلية</option><option value="rent">إيجار</option><option value="salaries">رواتب</option><option value="personal">مسحوبات شخصية</option><option value="inventory_purchase">مشتريات مخزون</option></>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label><input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (IQD)</label><input type="number" required min="0.01" step="1" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
            <button type="submit" className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg mt-4">حفظ المعاملة</button>
          </form>
        </Modal>
      </div>
    );
  };

  const AdminView = () => {
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [newEmp, setNewEmp] = useState({ name: '', username: '', password: '', role: 'staff' });

    const handleRoleChange = async (profileId, newRole) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', profileId), { role: newRole });
    };

    const handleCreateEmployee = async (e) => {
      e.preventDefault();
      const systemEmail = getSystemEmail(newEmp.username);
      try {
        const appName = "SecondaryAppForCreation";
        const secondaryApp = getApps().find(app => app.name === appName) || initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, systemEmail, newEmp.password);
        const newUid = userCredential.user.uid;
        await signOut(secondaryAuth);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', newUid), {
          uid: newUid, name: newEmp.name, username: newEmp.username.trim().toLowerCase().replace(/\s+/g, ''),
          role: newEmp.role, createdAt: new Date().toISOString()
        });
        setCreateModalOpen(false);
        setNewEmp({ name: '', username: '', password: '', role: 'staff' });
        showNotification("تم إنشاء حساب الموظف بنجاح.");
      } catch (err) { showNotification("❌ خطأ: " + err.message); }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h2 className="text-2xl font-bold text-gray-800">إدارة النظام</h2></div>
          <button onClick={() => setCreateModalOpen(true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm w-full md:w-auto justify-center">
            <ShieldCheck size={20} /> إضافة موظف
          </button>
        </div>
        <Table headers={['الاسم', 'اسم المستخدم', 'الصلاحية', 'تاريخ الانضمام']}>
          {profiles.map(p => (
             <tr key={p.id} className="hover:bg-gray-50">
               <td className="p-4 font-semibold text-gray-800">{p.name} {p.uid === user.uid && <span className="text-xs bg-amber-100 text-amber-800 px-2 rounded ml-2">أنت</span>}</td>
               <td className="p-4 text-sm text-gray-600 font-mono bg-gray-100 rounded px-2">{p.username}</td>
               <td className="p-4">
                  <select value={p.role} onChange={(e) => handleRoleChange(p.id, e.target.value)} disabled={p.uid === user.uid} className="p-2 border rounded-lg text-sm bg-white">
                    <option value="admin">المدير</option><option value="manager">مدير المصنع</option><option value="operations">العمليات</option><option value="sales">المبيعات</option><option value="production">الإنتاج</option><option value="store">المستودع</option><option value="delivery">التوصيل</option><option value="finance">المالية</option><option value="staff">بدون صلاحية</option>
                  </select>
               </td>
               <td className="p-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(p.createdAt)}</td>
             </tr>
          ))}
        </Table>

        <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="إنشاء حساب موظف">
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <input type="text" required placeholder="الاسم الكامل" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full p-2.5 border rounded-lg" />
            <input type="text" required placeholder="اسم المستخدم (للدخول)" value={newEmp.username} onChange={e => setNewEmp({...newEmp, username: e.target.value})} className="w-full p-2.5 border rounded-lg dir-ltr text-right" />
            <input type="password" required minLength="6" placeholder="كلمة المرور" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} className="w-full p-2.5 border rounded-lg dir-ltr text-right" />
            <select value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} className="w-full p-2.5 border rounded-lg">
              <option value="staff">بدون صلاحية</option><option value="manager">مدير مصنع</option><option value="operations">العمليات</option><option value="sales">مبيعات</option><option value="production">إنتاج</option><option value="store">مستودع</option><option value="delivery">توصيل</option><option value="finance">مالية</option>
            </select>
            <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg">إنشاء الحساب</button>
          </form>
        </Modal>
      </div>
    );
  };

  // --- واجهات التحميل والدخول ---

  if (authLoading) return <div className="flex h-screen w-full items-center justify-center bg-gray-50" dir="rtl"><div className="flex flex-col items-center animate-pulse"><Cake size={48} className="text-amber-600 mb-4" /><h1 className="text-xl font-bold text-gray-700">جاري تحميل نظام المصنع...</h1></div></div>;

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 font-sans" dir="rtl">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          <div className="flex flex-col items-center justify-center mx-auto mb-6 mt-2">
             <div className="text-center"><span className="block text-3xl font-serif text-slate-800 tracking-wider font-bold mb-1">BASHEER</span><span className="block text-2xl font-serif text-slate-800 tracking-wider">ALSHAKARCHY</span><div className="w-full h-1 bg-amber-500 mt-2 mb-2 rounded"></div><span className="block text-xs text-slate-600 tracking-widest font-semibold uppercase">Sweets & Cake</span></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{isSetupMode ? 'إعداد حساب المدير' : 'تسجيل الدخول'}</h1>
          <p className="text-gray-500 mb-6 text-sm">الرجاء إدخال اسم المستخدم وكلمة المرور.</p>
          {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4 text-right">
            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-500 dir-ltr text-right" placeholder="اسم المستخدم" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-500 dir-ltr text-right" placeholder="••••••••" minLength="6" />
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors mt-2 shadow-md">{isSetupMode ? 'إنشاء حساب المدير' : 'دخول'}</button>
          </form>
          {profiles.length === 0 && <button type="button" onClick={() => {setIsSetupMode(!isSetupMode); setAuthError('');}} className="mt-4 text-sm text-amber-600 font-bold hover:underline">{isSetupMode ? 'العودة لتسجيل الدخول' : 'إعداد النظام لأول مرة'}</button>}
        </div>
      </div>
    );
  }

  if (user && !myProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 font-sans" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">إكمال الملف الشخصي</h1>
          <p className="text-gray-500 mb-6 text-sm">الرجاء إدخال اسمك الحقيقي لتتعرف عليك الإدارة.</p>
          <form onSubmit={handleJoin} className="space-y-4 text-right">
            <input type="text" required value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="الاسم الكامل (مثال: علي محمد)" className="w-full p-3 border rounded-lg" />
            <button type="submit" className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg">دخول النظام</button>
          </form>
        </div>
      </div>
    );
  }

  const isProductionPrint = printData?.printType === 'production';

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print { 
           body * { visibility: hidden; } 
           .print-section, .print-section * { visibility: visible; } 
           .print-section { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; margin: 0;} 
           aside, header, .no-print { display: none !important; } 
           @page { margin: 0.5cm; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}} />
      
      {/* نافذة تكبير الصور العامة */}
      {zoomedImage && (
         <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 cursor-pointer" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"><X size={32}/></button>
            <img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl" alt="zoomed" />
         </div>
      )}

      <div className="fixed top-4 left-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce border border-slate-700">
            {n.message.includes('❌') ? <XCircle size={18} className="text-red-400" /> : <Bell size={18} className="text-amber-400" />}
            <span className="text-sm font-medium">{n.message}</span>
          </div>
        ))}
      </div>

      {printData && (
        <div className="print-section hidden print:block text-right dir-rtl font-sans p-8 mx-auto max-w-2xl bg-white border-2 border-dashed border-gray-300">
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
            <h1 className="text-4xl font-serif text-slate-800 font-bold mb-1">BASHEER ALSHAKARCHY</h1>
            <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Sweets & Cake</p>
            <p className="mt-6 text-xl font-bold bg-gray-100 inline-block px-6 py-2 rounded-lg border border-gray-200">وصل طلب رقم: #{formatOrderNum(printData)}</p>
          </div>
          
          <div className="space-y-4 text-lg">
            {isProductionPrint ? (
              <div className="bg-gray-100 p-4 rounded-lg text-center mb-4 border border-gray-300">
                 <p className="font-bold text-xl text-gray-800">تذكرة عمل داخلية (قسم الإنتاج)</p>
                 <p className="text-sm mt-2 text-red-600 font-bold">موعد التسليم المطلوب: {formatDate(printData.deliveryDate) || 'غير محدد'}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
                   <p><strong>العميل:</strong> {printData.customerName}</p>
                   <p><strong>الهاتف:</strong> <span className="dir-ltr inline-block font-mono">{printData.phone}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
                   <p><strong>العنوان:</strong> {printData.address}</p>
                   <p><strong>طريقة التواصل:</strong> {printData.contactMethod || 'مباشر'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                   <p><strong>موعد التسليم المطلوب:</strong> {formatDate(printData.deliveryDate) || 'غير محدد'}</p>
                </div>
              </>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <p className="font-bold mb-3 border-b pb-2">الأصناف المطلوبة التفصيلية:</p>
               <div className="space-y-4">
                 {getOrderItems(printData).map((i, idx) => (
                    <div key={idx} className="flex gap-4 items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                       {i.itemImage ? (
                          <img src={i.itemImage} className="w-20 h-20 object-cover rounded border border-gray-300" alt="item" />
                       ) : <div className="w-20 h-20 bg-gray-100 border rounded flex items-center justify-center text-gray-300"><ImageIcon size={24}/></div>}
                       
                       <div className="flex-1">
                          <p className="font-bold text-lg">{i.quantity}x {i.cakeCategory === 'أخرى (إدخال يدوي)' ? i.customCakeType : i.cakeCategory}</p>
                          <p className="text-sm text-gray-600 mb-1">الحجم: {i.cakeSize} {i.weight && ` | الوزن: ${i.weight}`}</p>
                          {i.itemNotes && <p className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200 mt-2"><strong>ملاحظات الصنف:</strong> {i.itemNotes}</p>}
                       </div>
                    </div>
                 ))}
               </div>
            </div>
            
            {!isProductionPrint && (
              <p className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xl font-bold text-center"><strong>الإجمالي المستحق:</strong> {Number(printData.price).toLocaleString()} IQD</p>
            )}

            {printData.notes && <p className="p-4 border rounded-lg bg-yellow-50"><strong>ملاحظات عامة للتوصيل:</strong> {printData.notes}</p>}

          </div>
          <div className="mt-8 text-center text-gray-500 text-sm border-t pt-4 border-gray-300">
            <p>تاريخ ووقت إصدار الطلب: {formatDate(printData.createdAt)}</p>
            <p className="mt-2 font-bold text-gray-800">شكراً لاختياركم بشير الشكرچي!</p>
          </div>
        </div>
      )}

      <div className={`flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans ${printData ? 'no-print' : ''}`} dir="rtl">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
        <aside className={`fixed lg:static inset-y-0 right-0 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-gray-900 text-white flex flex-col shadow-2xl lg:shadow-xl z-30`}>
          <div className="p-6 flex flex-col items-center border-b border-gray-800 text-center bg-gray-950 relative">
             <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden absolute top-4 left-4 text-gray-400 hover:text-white"><X size={24}/></button>
             <span className="block text-xl font-serif text-white tracking-wider font-bold mb-1 drop-shadow-md mt-2">BASHEER</span>
             <span className="block text-lg font-serif text-white tracking-wider drop-shadow-md">ALSHAKARCHY</span>
             <div className="w-full h-0.5 bg-amber-500 mt-2 mb-1 rounded shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
             <span className="block text-[0.6rem] text-gray-400 tracking-widest font-semibold uppercase">Sweets & Cake</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            <ul className="space-y-1 px-3">
              {TABS.map(tab => hasAccess(tab.id) && (
                <li key={tab.id}>
                  <button onClick={() => {setActiveTab(tab.id); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                    <tab.icon size={20} />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t border-gray-800 bg-gray-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center font-bold text-lg flex-shrink-0">{myProfile?.name?.charAt(0).toUpperCase()}</div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-white">{myProfile?.name}</p>
                <p className="text-xs text-amber-500 font-medium tracking-wider">{myProfile?.role === 'admin' ? 'المدير العام' : myProfile?.role === 'manager' ? 'مدير المصنع' : myProfile?.role === 'operations' ? 'العمليات' : myProfile?.role === 'production' ? 'الإنتاج والخبز' : myProfile?.role === 'sales' ? 'المبيعات' : myProfile?.role === 'delivery' ? 'السائق' : 'موظف'}</p>
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white py-2 rounded-lg transition-colors text-sm font-medium"><LogOut size={16} /> تسجيل الخروج</button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex justify-between items-center z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-amber-600 transition-colors"><Menu size={28} /></button>
              <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">{TABS.find(t => t.id === activeTab)?.label}</h1>
            </div>
            <div className="text-xs md:text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full hidden sm:block">{new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto relative custom-scrollbar">
            {printData && (
               <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-4 md:p-5 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10">
                 <div className="flex items-center gap-3">
                   <Printer size={24} className="text-blue-600 flex-shrink-0" />
                   <p className="font-medium text-sm md:text-lg">وضع الطباعة {isProductionPrint ? '(تذكرة معمل بدون سعر)' : 'للفاتورة الكاملة'} <span className="font-mono bg-blue-100 px-2 rounded">#{formatOrderNum(printData)}</span></p>
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                   <button onClick={() => window.print()} className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2 rounded-lg shadow font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><Printer size={18} /> بدء الطباعة</button>
                   <button onClick={() => setPrintData(null)} className="flex-1 md:flex-none bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg shadow hover:bg-gray-100 transition-colors text-center font-bold">إغلاق</button>
                 </div>
               </div>
            )}

            {activeTab === 'Dashboard' && hasAccess('Dashboard') && <DashboardView />}
            {activeTab === 'Orders' && <OrdersView />}
            {activeTab === 'Customers' && <CustomersView />}
            {activeTab === 'Production' && <ProductionView />}
            {activeTab === 'FinishedGoods' && <FinishedGoodsView />}
            {activeTab === 'Store' && <StoreView />}
            {activeTab === 'Delivery' && <DeliveryView />}
            {activeTab === 'Sales' && <SalesView />}
            {activeTab === 'Finance' && <FinanceView />}
            {activeTab === 'Admin' && <AdminView />}
          </div>
        </main>
      </div>
    </>
  );
}