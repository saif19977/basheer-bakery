import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { 
  Cake, LayoutDashboard, ShoppingCart, ChefHat, 
  Store as StoreIcon, Truck, DollarSign, Users, 
  Plus, X, CheckCircle, TrendingUp, Package, Clock, AlertCircle,
  Search, Printer, Download, Edit, Image as ImageIcon, FileText, LogOut, ShieldCheck,
  Menu, Bell, Camera, Box, Tag, Trash2, CalendarClock, Play
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

// --- القوائم المنسدلة للكيك والأحجام ---
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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors"><X size={24} /></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
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

const compressImage = (file, maxWidth = 600) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
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

      if (diff <= 0) {
        setIsLate(true);
        setTimeLeft('متأخر عن الموعد!');
        return;
      }

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
    const timer = setInterval(calculateTime, 60000); // تحديث كل دقيقة
    return () => clearInterval(timer);
  }, [deliveryDate]);

  if (!deliveryDate) return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md ${isLate ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' : timeLeft.includes('متبقي') ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-600'}`}>
      <CalendarClock size={14} />
      <span>{timeLeft}</span>
    </div>
  );
};

// --- المكون الرئيسي ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
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
      manager: ['Dashboard', 'Orders', 'Production', 'FinishedGoods', 'Store', 'Delivery', 'Sales', 'Finance'],
      operations: ['Dashboard', 'Orders', 'Production', 'FinishedGoods', 'Store', 'Delivery'],
      sales: ['Orders', 'FinishedGoods', 'Sales'],
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
    { id: 'Production', icon: ChefHat, label: 'خط الإنتاج' },
    { id: 'FinishedGoods', icon: Box, label: 'مخزن الإنتاج التام' },
    { id: 'Delivery', icon: Truck, label: 'التوصيل والشحن' },
    { id: 'Sales', icon: TrendingUp, label: 'سجل المبيعات' },
    { id: 'Finance', icon: DollarSign, label: 'المالية والحسابات' },
    { id: 'Store', icon: StoreIcon, label: 'المخزون والمستودع' },
    { id: 'Admin', icon: Users, label: 'إدارة النظام' },
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
          <StatCard title="قيد التحضير (إنتاج)" value={pendingCount} icon={ChefHat} colorClass="bg-orange-100 text-orange-600" />
          <StatCard title="طلبات جاهزة للتوصيل" value={readyCount} icon={Truck} colorClass="bg-blue-100 text-blue-600" />
          <StatCard title="رصيد الإنتاج التام" value={finishedCount} icon={Box} colorClass="bg-green-100 text-green-600" />
          <StatCard title="مواد منخفضة المخزون" value={lowStock} icon={AlertCircle} colorClass="bg-red-100 text-red-600" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-800 mb-4">أحدث النشاطات</h3>
          <div className="space-y-3">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-100 last:border-0 gap-2">
                <div>
                  <p className="font-semibold text-gray-800">{myProfile?.role === 'production' ? 'طلب مخفي الإسم' : o.customerName} - {o.cakeCategory}</p>
                  <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                </div>
                <div className="self-start sm:self-auto"><StatusBadge status={o.status} /></div>
              </div>
            ))}
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
    const [selectedFG, setSelectedFG] = useState('');
    
    const [form, setForm] = useState({ 
      customerName: '', phone: '', address: '', 
      orderSource: 'manufacturing',
      cakeCategory: 'قالب كيك ايطالي', cakeSize: 'ايطالي ١٢ قطعة', customCakeType: '',
      quantity: 1, weight: '', price: '', notes: '', images: [],
      deliveryDate: '' 
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

    const handleMultipleUpload = async (e) => {
      const files = Array.from(e.target.files);
      const base64Images = await Promise.all(files.map(f => compressImage(f)));
      setForm(prev => ({ ...prev, images: [...prev.images, ...base64Images] }));
    };
    const removeImage = (index) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

    const handleEdit = (order) => {
      setEditingId(order.id);
      setSelectedFG('');
      setForm({
        customerName: order.customerName || '', phone: order.phone || '', address: order.address || '',
        orderSource: order.orderSource || 'manufacturing',
        cakeCategory: order.cakeCategory || 'أخرى (إدخال يدوي)', cakeSize: order.cakeSize || '', customCakeType: order.customCakeType || '',
        quantity: order.quantity || 1, weight: order.weight || '', price: order.price || '',
        notes: order.notes || '', images: order.images || (order.imageUrl ? [order.imageUrl] : []),
        deliveryDate: order.deliveryDate || ''
      });
      setModalOpen(true);
    };

    const handleCancelOrder = async (id) => {
      if(window.confirm('هل أنت متأكد من رغبتك في إلغاء هذا الطلب نهائياً؟')) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', id), { status: 'cancelled', updatedAt: new Date().toISOString() });
        showNotification('تم إلغاء الطلب بنجاح.');
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      let finalForm = { ...form };
      
      // التفاعل مع المخزن التام في حالة إنشاء طلب جديد (الخصم المباشر)
      if (form.orderSource === 'ready_made' && !editingId) {
        const item = finishedGoods.find(g => g.id === selectedFG);
        if (!item || item.quantity < form.quantity) {
           alert('الكمية المطلوبة غير متوفرة في المخزن التام!');
           return;
        }
        // خصم الكمية
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finished_goods', item.id), {
           quantity: item.quantity - form.quantity
        });
        finalForm.cakeCategory = item.name;
        finalForm.cakeSize = 'جاهز من المخزن';
      }

      const initialStatus = finalForm.orderSource === 'ready_made' ? 'ready' : 'pending';

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', editingId), { ...finalForm, updatedAt: new Date().toISOString() });
      } else {
        const nextOrderNum = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber || 0)) + 1 : 1;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
          ...finalForm, status: initialStatus, createdAt: new Date().toISOString(), orderNumber: nextOrderNum
        });
        if(form.orderSource === 'ready_made') showNotification("تم سحب الطلب من المخزن التام بنجاح!");
      }
      setModalOpen(false);
      setEditingId(null);
      setSelectedFG('');
      setForm({ customerName: '', phone: '', address: '', orderSource: 'manufacturing', cakeCategory: 'قالب كيك ايطالي', cakeSize: 'ايطالي ١٢ قطعة', customCakeType: '', quantity: 1, weight: '', price: '', notes: '', images: [], deliveryDate: '' });
    };

    const handleQtyChange = (e) => {
       const qty = Number(e.target.value);
       if (form.orderSource === 'ready_made' && selectedFG) {
           const item = finishedGoods.find(g => g.id === selectedFG);
           setForm({...form, quantity: qty, price: item ? item.price * qty : form.price});
       } else {
           setForm({...form, quantity: qty});
       }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة الطلبات</h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
              <input type="text" placeholder="بحث بالاسم، الهاتف، الرقم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <button onClick={() => { setEditingId(null); setSelectedFG(''); setForm({ customerName: '', phone: '', address: '', orderSource: 'manufacturing', cakeCategory: 'قالب كيك ايطالي', cakeSize: 'ايطالي ١٢ قطعة', customCakeType: '', quantity: 1, weight: '', price: '', notes: '', images: [], deliveryDate: '' }); setModalOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap">
              <Plus size={20} /> طلب جديد
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilter('active')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>الطلبات النشطة</button>
          <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'completed' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>سجل المنجز</button>
          <button onClick={() => setFilter('cancelled')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white text-gray-600 border'}`}>الطلبات الملغاة</button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>الكل</button>
        </div>
        
        <Table headers={['الصور', 'رقم الطلب', 'العميل', 'تفاصيل الصنف', 'الموعد', 'الحالة', 'إجراء']}>
          {filteredOrders.map(o => (
            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4">
                {o.finalImage ? (
                  <div className="relative inline-block">
                    <img src={o.finalImage} className="w-12 h-12 rounded-lg object-cover border-2 border-green-500 shadow-sm" title="صورة المنتج النهائي" alt="final"/>
                    <span className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] px-1 rounded shadow">النهائي</span>
                  </div>
                ) : o.images && o.images.length > 0 ? (
                  <div className="flex -space-x-2 space-x-reverse">
                    {o.images.slice(0,3).map((img, idx) => <img key={idx} src={img} alt="cake" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />)}
                    {o.images.length > 3 && <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-600">+{o.images.length - 3}</div>}
                  </div>
                ) : <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border"><ImageIcon size={16}/></div>}
              </td>
              <td className="p-4 font-mono text-sm text-gray-500 font-bold">
                #{formatOrderNum(o)}
                {o.orderSource === 'ready_made' && <span className="block mt-1 text-[10px] bg-green-100 text-green-700 px-1 py-0.5 rounded text-center">مخزن تام</span>}
              </td>
              <td className="p-4">
                <p className="font-medium text-gray-800">{o.customerName}</p>
                <p className="text-xs text-gray-500 dir-ltr text-right font-mono">{o.phone}</p>
              </td>
              <td className="p-4 text-sm text-gray-700">
                <span className="font-bold">{o.cakeCategory === 'أخرى (إدخال يدوي)' ? o.customCakeType : o.cakeCategory}</span>
                <span className="block text-xs text-gray-500 mt-1">{o.cakeSize} | {o.quantity} قطعة {o.weight && `| الوزن: ${o.weight}`}</span>
              </td>
              <td className="p-4">
                 <Countdown deliveryDate={o.deliveryDate} />
              </td>
              <td className="p-4"><StatusBadge status={o.status} /></td>
              <td className="p-4 flex gap-2">
                <button onClick={() => setPrintData({...o, printType: 'invoice'})} className="text-gray-600 hover:text-gray-800 p-2 bg-gray-100 rounded-lg transition-colors" title="طباعة الفاتورة">
                  <Printer size={18} />
                </button>
                <button onClick={() => handleEdit(o)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg transition-colors" title="تعديل">
                  <Edit size={18} />
                </button>
                {o.status !== 'cancelled' && o.status !== 'completed' && (
                  <button onClick={() => handleCancelOrder(o.id)} className="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-lg transition-colors" title="إلغاء الطلب">
                    <Trash2 size={18} />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filteredOrders.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-400">لا توجد طلبات مطابقة.</td></tr>}
        </Table>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingId ? "تعديل الطلب" : "إنشاء طلب جديد"} maxWidth="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 flex gap-4">
               <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-blue-900">
                 <input type="radio" name="orderSource" value="manufacturing" disabled={!!editingId} checked={form.orderSource === 'manufacturing'} onChange={e => setForm({...form, orderSource: e.target.value})} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                 تصنيع جديد (للمعمل)
               </label>
               <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-green-900">
                 <input type="radio" name="orderSource" value="ready_made" disabled={!!editingId} checked={form.orderSource === 'ready_made'} onChange={e => setForm({...form, orderSource: e.target.value})} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                 سحب من المخزن التام (جاهز)
               </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
                <input type="text" required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم هاتف المستلم</label>
                <input type="text" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dir-ltr text-right" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              {form.orderSource === 'ready_made' ? (
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-green-800 mb-1">اختر المنتج من المخزن التام</label>
                  <select required={!editingId} value={selectedFG} onChange={e => {
                     setSelectedFG(e.target.value);
                     const item = finishedGoods.find(g => g.id === e.target.value);
                     if(item) setForm({...form, price: item.price * form.quantity, images: item.image ? [item.image] : []});
                  }} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">-- اختر منتجاً متوفراً --</option>
                    {finishedGoods.map(g => <option key={g.id} value={g.id} disabled={g.quantity === 0}>{g.name} (متوفر: {g.quantity} قطعة) - {g.price} IQD</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع / فئة الكيك</label>
                    <select value={form.cakeCategory} onChange={e => setForm({...form, cakeCategory: e.target.value, cakeSize: CAKE_CATEGORIES[e.target.value]?.[0] || ''})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                      {Object.keys(CAKE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  
                  {form.cakeCategory === 'أخرى (إدخال يدوي)' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اكتب نوع الكيك (يدوي)</label>
                      <input type="text" required value={form.customCakeType} onChange={e => setForm({...form, customCakeType: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" placeholder="مثال: كيكة زفاف طابقين" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الحجم / التفاصيل</label>
                      <select value={form.cakeSize} onChange={e => setForm({...form, cakeSize: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                        {CAKE_CATEGORIES[form.cakeCategory]?.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية (عدد)</label>
                <input type="number" required min="1" value={form.quantity} onChange={handleQtyChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوزن (اختياري)</label>
                <input type="text" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="مثال: 2 كجم" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر الإجمالي (IQD)</label>
                <input type="number" required min="0" step="1" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">موعد التسليم للزبون</label>
                <input type="datetime-local" required value={form.deliveryDate} onChange={e => setForm({...form, deliveryDate: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان التوصيل</label>
                <textarea required value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" rows="1"></textarea>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">إرفاق صور التصميم (الصورة الأولى ستطبع مع الوصل)</label>
              <input type="file" multiple accept="image/*" onChange={handleMultipleUpload} className="w-full p-2 border border-gray-300 rounded-lg bg-white mb-3" />
              <div className="flex gap-2 flex-wrap">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="preview" className="h-20 w-20 object-cover rounded-lg shadow-sm border border-gray-300" />
                    {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center rounded-b-lg">رئيسية</span>}
                    <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات خاصة</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" rows="2"></textarea>
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors">
              {editingId ? "حفظ التعديلات" : form.orderSource === 'ready_made' ? "تأكيد السحب من المخزن" : "حفظ الطلب للمعمل"}
            </button>
          </form>
        </Modal>
      </div>
    );
  };

  // --- نافذة تفاصيل الطلب المشتركة المحدثة ---
  const OrderDetailsModal = ({ isOpen, onClose, order, type, onPrimaryAction, onSecondaryAction }) => {
    if (!isOpen || !order) return null;
    const hideSensitiveInfo = type.includes('production');

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل طلب #${formatOrderNum(order)}`} maxWidth="max-w-lg">
        <div className="space-y-4">
           {/* معلومات الزبون (مخفية في قسم الإنتاج) */}
           {!hideSensitiveInfo && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="font-bold text-gray-800 text-lg mb-1">{order.customerName}</p>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span className="dir-ltr font-mono">{order.phone}</span>
                  <span className="font-bold text-green-700">السعر: {Number(order.price).toLocaleString()} IQD</span>
                </div>
                <p className="text-sm text-gray-700 bg-white p-2 rounded border"><span className="font-bold">العنوان:</span> {order.address}</p>
              </div>
           )}

           {/* معلومات الكيك (تظهر للكل) */}
           <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <div className="flex justify-between items-start mb-2">
                 <div>
                   <p className="font-bold text-amber-900 text-lg">{order.cakeCategory === 'أخرى (إدخال يدوي)' ? order.customCakeType : order.cakeCategory}</p>
                   <p className="text-sm text-amber-800">{order.cakeSize} {order.weight && `| الوزن: ${order.weight}`}</p>
                 </div>
                 <span className="bg-amber-200 text-amber-900 px-3 py-1 rounded-lg font-bold shadow-sm">{order.quantity} قطعة</span>
              </div>
              {order.notes && <p className="mt-3 text-sm text-amber-900 bg-white p-3 rounded-lg border border-amber-100"><span className="font-bold">ملاحظات:</span> {order.notes}</p>}
           </div>

           {/* العداد الزمني */}
           <div className="flex justify-center p-2 bg-gray-50 rounded-xl border">
              <Countdown deliveryDate={order.deliveryDate} />
           </div>

           {/* الصور المرفقة للتصميم */}
           {order.images && order.images.length > 0 && (
             <div>
               <p className="text-sm font-bold text-gray-700 mb-2">صور التصميم المرفقة:</p>
               <div className="grid grid-cols-3 gap-2">
                 {order.images.map((img, i) => <img key={i} src={img} alt="design" className="w-full h-24 object-cover rounded-lg border shadow-sm" />)}
               </div>
             </div>
           )}

           {/* الصورة النهائية (إن وجدت) */}
           {order.finalImage && (
             <div className="bg-green-50 p-3 rounded-xl border border-green-200 mt-4">
               <p className="text-sm font-bold text-green-800 mb-2 text-center">الصورة النهائية للمنتج:</p>
               <img src={order.finalImage} alt="final" className="w-full max-h-48 object-contain rounded-lg border shadow-sm mx-auto" />
             </div>
           )}

           {/* أزرار الإجراءات */}
           <div className="pt-4 border-t border-gray-100 flex gap-2">
              {type === 'production_pending' && (
                <button onClick={() => onPrimaryAction(order)} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2">
                   <Play size={20} /> البدء بالتحضير
                </button>
              )}
              {type === 'production_baking' && (
                <>
                  <button onClick={() => onPrimaryAction(order)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2">
                    <CheckCircle size={20} /> تأكيد الإنجاز النهائي
                  </button>
                  <button onClick={() => onSecondaryAction(order)} className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-4 py-3 rounded-lg shadow-md" title="طباعة تذكرة عمل (للمعمل)">
                    <Printer size={20} />
                  </button>
                </>
              )}
              {type === 'delivery_dispatch' && (
                <button onClick={() => onPrimaryAction(order)} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2">
                   <Truck size={20} /> إرسال مع السائق
                </button>
              )}
              {type === 'delivery_complete' && (
                <button onClick={() => onPrimaryAction(order)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2">
                   <CheckCircle size={20} /> تأكيد استلام الزبون وإضافة الإيراد
                </button>
              )}
           </div>
        </div>
      </Modal>
    );
  };

  const ProductionView = () => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const bakingOrders = orders.filter(o => o.status === 'baking');
    const completedOrders = orders.filter(o => ['ready', 'out_for_delivery', 'completed'].includes(o.status)).slice(0, 10);
    
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderType, setOrderType] = useState(''); // لمعرفة حالة الطلب المفتوح
    const [completionModal, setCompletionModal] = useState({ isOpen: false, order: null, finalImage: '' });

    const handleStartBaking = async (order) => {
       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'baking', updatedAt: new Date().toISOString() });
       setSelectedOrder(null);
       showNotification("تم نقل الطلب إلى مرحلة جاري التحضير.");
    };

    const triggerCompletion = (order) => {
       setSelectedOrder(null); // غلق نافذة التفاصيل
       setCompletionModal({ isOpen: true, order: order, finalImage: '' }); // فتح نافذة الصورة
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

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">خط الإنتاج (المعمل)</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* القسم الأول: بانتظار التحضير */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-lg"><Clock className="text-yellow-500"/> بانتظار التحضير</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {pendingOrders.map(o => (
                 <div key={o.id} onClick={() => {setSelectedOrder(o); setOrderType('production_pending');}} className="p-3 border border-yellow-200 bg-yellow-50 rounded-xl relative shadow-sm cursor-pointer hover:bg-yellow-100 transition-all flex flex-col text-center">
                    <span className="font-mono font-bold text-gray-500 text-xs mb-1">#{formatOrderNum(o)}</span>
                    <p className="font-bold text-gray-900 text-sm mb-2 flex-1 line-clamp-2">{o.cakeCategory === 'أخرى (إدخال يدوي)' ? o.customCakeType : o.cakeCategory}</p>
                    {o.images && o.images.length > 0 ? (
                       <img src={o.images[0]} className="w-full h-20 object-cover rounded-lg mb-2" alt="ref" />
                    ) : (
                       <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-2 text-gray-400"><ImageIcon size={24}/></div>
                    )}
                    <Countdown deliveryDate={o.deliveryDate} />
                 </div>
               ))}
               {pendingOrders.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-4">لا توجد طلبات معلقة.</p>}
             </div>
           </div>

           {/* القسم الثاني: جاري التحضير */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-lg"><ChefHat className="text-orange-500"/> جاري التحضير</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {bakingOrders.map(o => (
                 <div key={o.id} onClick={() => {setSelectedOrder(o); setOrderType('production_baking');}} className="p-3 border border-orange-200 bg-orange-50 rounded-xl relative shadow-sm cursor-pointer hover:bg-orange-100 transition-all flex flex-col text-center">
                    <span className="font-mono font-bold text-gray-500 text-xs mb-1">#{formatOrderNum(o)}</span>
                    <p className="font-bold text-gray-900 text-sm mb-2 flex-1 line-clamp-2">{o.cakeCategory === 'أخرى (إدخال يدوي)' ? o.customCakeType : o.cakeCategory}</p>
                    {o.images && o.images.length > 0 ? (
                       <img src={o.images[0]} className="w-full h-20 object-cover rounded-lg mb-2" alt="ref" />
                    ) : (
                       <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-2 text-gray-400"><ImageIcon size={24}/></div>
                    )}
                    <Countdown deliveryDate={o.deliveryDate} />
                 </div>
               ))}
               {bakingOrders.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-4">لا يوجد عمل قيد الإنجاز.</p>}
             </div>
           </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle size={20} className="text-green-500"/> سجل المنجز للإنتاج</h3>
          <Table headers={['رقم الطلب', 'صورة النهاية', 'الصنف', 'الكمية', 'وقت الإنجاز', 'الحالة']}>
            {completedOrders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-sm text-gray-500 font-bold">#{formatOrderNum(o)}</td>
                <td className="p-4">
                  {o.finalImage ? <img src={o.finalImage} className="w-12 h-12 rounded object-cover border border-green-400 shadow-sm" alt="final"/> : <span className="text-xs text-gray-400">لا توجد</span>}
                </td>
                <td className="p-4 font-medium">{o.cakeCategory === 'أخرى (إدخال يدوي)' ? o.customCakeType : o.cakeCategory}</td>
                <td className="p-4">{o.quantity}</td>
                <td className="p-4 text-sm text-gray-500">{formatDate(o.updatedAt || o.createdAt)}</td>
                <td className="p-4"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {completedOrders.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">السجل فارغ.</td></tr>}
          </Table>
        </div>

        <OrderDetailsModal 
           isOpen={!!selectedOrder} 
           onClose={() => setSelectedOrder(null)} 
           order={selectedOrder} 
           type={orderType}
           onPrimaryAction={orderType === 'production_pending' ? handleStartBaking : triggerCompletion}
           onSecondaryAction={handlePrintProduction}
        />

        <Modal isOpen={completionModal.isOpen} onClose={() => setCompletionModal({ isOpen: false, order: null, finalImage: '' })} title="تأكيد تجهيز الطلب">
          <div className="space-y-4">
            <p className="text-gray-700">هل أنت متأكد من الانتهاء من تجهيز الطلب <span className="font-mono font-bold bg-gray-100 px-1">#{completionModal.order && formatOrderNum(completionModal.order)}</span>؟</p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center justify-center gap-2">
                <Camera size={18} /> إرفاق صورة للمنتج بعد الإكمال (اختياري)
              </label>
              <input type="file" accept="image/*" onChange={handleCompleteUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              {completionModal.finalImage && <img src={completionModal.finalImage} alt="final product" className="mt-4 w-full max-h-48 object-contain rounded-lg border shadow-sm mx-auto" />}
            </div>
            <button onClick={confirmCompletion} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow flex justify-center items-center gap-2">
              تأكيد الإنجاز النهائي <CheckCircle size={18}/>
            </button>
          </div>
        </Modal>
      </div>
    );
  };

  const FinishedGoodsView = () => {
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isSellModalOpen, setSellModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [form, setForm] = useState({ code: '', name: '', quantity: 1, price: '', image: '' });
    const [sellQty, setSellQty] = useState(1);

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
          ...form, quantity: Number(form.quantity), price: Number(form.price), addedAt: new Date().toISOString()
        });
        showNotification("تم إضافة المنتج الجديد للمخزن التام.");
      }
      setAddModalOpen(false);
      setForm({ code: '', name: '', quantity: 1, price: '', image: '' });
    };

    const handleSell = async (e) => {
      e.preventDefault();
      if (sellQty > selectedItem.quantity) { alert("الكمية المطلوبة أكبر من المتوفر!"); return; }
      const newQty = selectedItem.quantity - sellQty;
      const totalRevenue = sellQty * selectedItem.price;
      const now = new Date().toISOString();

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finished_goods', selectedItem.id), { quantity: newQty });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
        category: 'revenue', type: 'income', amount: totalRevenue, description: `بيع مباشر (مخزن تام): ${sellQty}x ${selectedItem.name}`, date: now
      });

      const receiptData = {
        id: 'DIR-' + Date.now().toString().slice(-6),
        customerName: 'بيع مباشر (مخزن تام)', phone: '-', address: 'تسليم باليد',
        cakeCategory: selectedItem.name, cakeSize: 'جاهز من المخزن', quantity: sellQty,
        price: totalRevenue, status: 'completed', createdAt: now, completedAt: now, orderNumber: Date.now() % 10000,
        images: selectedItem.image ? [selectedItem.image] : [], deliveryDate: now, printType: 'receipt'
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), receiptData);

      setSellModalOpen(false);
      setSelectedItem(null);
      setSellQty(1);
      showNotification("تم إخراج المنتج بنجاح.");
      setPrintData(receiptData); 
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h2 className="text-2xl font-bold text-gray-800">مخزن الإنتاج التام</h2><p className="text-sm text-gray-500 mt-1">منتجات جاهزة للبيع المباشر الفوري</p></div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="بحث بالاسم أو الكود..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
            <button onClick={() => setAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"><Plus size={20} /> إضافة منتج جاهز</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGoods.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {item.image ? <img src={item.image} alt={item.name} className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400"><Box size={40}/></div>}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-gray-800 line-clamp-1" title={item.name}>{item.name}</h3><span className="text-xs bg-gray-100 font-mono px-2 py-1 rounded text-gray-600">{item.code}</span></div>
                <p className="text-green-700 font-bold text-lg mb-2">{Number(item.price).toLocaleString()} IQD</p>
                <p className="text-sm text-gray-600 mb-4">الرصيد المتوفر: <span className={`font-bold ${item.quantity < 5 ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity}</span> قطعة</p>
                <button onClick={() => {setSelectedItem(item); setSellQty(1); setSellModalOpen(true);}} disabled={item.quantity === 0} className="mt-auto w-full bg-slate-800 hover:bg-slate-900 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-bold transition-colors flex justify-center items-center gap-2"><Printer size={16} /> {item.quantity === 0 ? 'نفذت الكمية' : 'إصدار فاتورة بيع'}</button>
              </div>
            </div>
          ))}
          {filteredGoods.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">المخزن التام فارغ أو لا توجد نتائج مطابقة.</p>}
        </div>

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
          <Modal isOpen={isSellModalOpen} onClose={() => setSellModalOpen(false)} title="إصدار فاتورة بيع مباشر">
            <form onSubmit={handleSell} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4 mb-4 border">
                {selectedItem.image && <img src={selectedItem.image} className="w-16 h-16 rounded-md object-cover" alt="item"/>}
                <div><h4 className="font-bold text-gray-800">{selectedItem.name}</h4><p className="text-sm text-gray-600">متوفر: {selectedItem.quantity} قطعة</p></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">الكمية المراد بيعها</label><input type="number" required min="1" max={selectedItem.quantity} value={sellQty} onChange={e => setSellQty(Number(e.target.value))} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-lg font-bold" /></div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-medium">الإجمالي المستحق:</p>
                <p className="text-2xl font-bold text-green-900">{(sellQty * selectedItem.price).toLocaleString()} IQD</p>
              </div>
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg mt-4 transition-colors flex justify-center items-center gap-2"><Printer size={18}/> تأكيد وطباعة الوصل</button>
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
          {completed.map(o => (
             <tr key={o.id} className="hover:bg-gray-50">
               <td className="p-4 font-mono text-xs text-gray-500 font-bold">#{formatOrderNum(o)}</td>
               <td className="p-4 text-sm">{formatDate(o.completedAt)}</td>
               <td className="p-4 font-medium">{o.customerName}</td>
               <td className="p-4 text-sm">{o.quantity}x {o.cakeCategory === 'أخرى (إدخال يدوي)' ? o.customCakeType : o.cakeCategory}</td>
               <td className="p-4 font-semibold text-green-700">+ {Number(o.price).toLocaleString()} IQD</td>
             </tr>
          ))}
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
      } catch (err) { alert(err.message); }
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
          {profiles.length === 0 && <button onClick={() => {setIsSetupMode(!isSetupMode); setAuthError('');}} className="mt-4 text-sm text-amber-600 font-bold hover:underline">{isSetupMode ? 'العودة لتسجيل الدخول' : 'إعداد النظام لأول مرة'}</button>}
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
        @media print { body * { visibility: hidden; } .print-section, .print-section * { visibility: visible; } .print-section { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; } aside, header, .no-print { display: none !important; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}} />
      
      <div className="fixed top-4 left-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce border border-slate-700">
            <Bell size={18} className="text-amber-400" />
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
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                   <p><strong>العميل:</strong> {printData.customerName}</p>
                   <p><strong>الهاتف:</strong> <span className="dir-ltr inline-block font-mono">{printData.phone}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                   <p><strong>العنوان:</strong> {printData.address}</p>
                   <p><strong>موعد التسليم:</strong> {formatDate(printData.deliveryDate) || 'غير محدد'}</p>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
               <p><strong>الصنف:</strong> {printData.cakeCategory === 'أخرى (إدخال يدوي)' ? printData.customCakeType : printData.cakeCategory}</p>
               <p><strong>الحجم:</strong> {printData.cakeSize}</p>
               <p><strong>الكمية:</strong> {printData.quantity}</p>
               {printData.weight && <p><strong>الوزن:</strong> {printData.weight}</p>}
            </div>
            
            {!isProductionPrint && (
              <p className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xl font-bold"><strong>الإجمالي المستحق:</strong> {Number(printData.price).toLocaleString()} IQD</p>
            )}

            {printData.notes && <p className="p-4 border rounded-lg bg-yellow-50"><strong>ملاحظات هامة:</strong> {printData.notes}</p>}

            {printData.images && printData.images.length > 0 && (
               <div className="mt-6 text-center">
                  <p className="text-sm font-bold text-gray-600 mb-2">الصورة المرفقة للتصميم:</p>
                  <img src={printData.images[0]} className="max-h-64 mx-auto rounded-xl border-2 border-gray-300 object-contain shadow-sm" alt="design" />
               </div>
            )}
          </div>
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>تاريخ ووقت إصدار الطلب: {formatDate(printData.createdAt)}</p>
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
                   <button onClick={() => window.print()} className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2 rounded-lg shadow font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><Printer size={18} /> طباعة</button>
                   <button onClick={() => setPrintData(null)} className="flex-1 md:flex-none bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg shadow hover:bg-gray-100 transition-colors text-center font-bold">إغلاق</button>
                 </div>
               </div>
            )}

            {activeTab === 'Dashboard' && hasAccess('Dashboard') && <DashboardView />}
            {activeTab === 'Orders' && <OrdersView />}
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