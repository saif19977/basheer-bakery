import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { 
  Cake, LayoutDashboard, ShoppingCart, ChefHat, 
  Store as StoreIcon, Truck, DollarSign, Users, 
  Plus, X, CheckCircle, TrendingUp, Package, Clock, AlertCircle,
  Search, Printer, Download, Edit, Image as ImageIcon, FileText, LogOut, ShieldCheck
} from 'lucide-react';

// --- إعدادات فايربيس الخاصة بمصنع بشير الشكرجي ---
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
const appId = 'cakeshop-production'; // مسار حفظ البيانات في قاعدة بياناتك

// --- المكونات المشتركة (Shared Components) ---
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`p-4 rounded-lg flex-shrink-0 ${colorClass}`}>
      <Icon size={28} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

const Table = ({ headers, children }) => (
  <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
    <table className="w-full text-right border-collapse">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {headers.map((h, i) => <th key={i} className="p-4 font-semibold text-gray-600 text-sm">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {children}
      </tbody>
    </table>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    baking: 'bg-orange-100 text-orange-800',
    ready: 'bg-blue-100 text-blue-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800'
  };
  const labels = {
    pending: 'قيد الانتظار', 
    baking: 'جاري الخبز', 
    ready: 'جاهز',
    out_for_delivery: 'في الطريق', 
    completed: 'مكتمل'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('ar-IQ', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const formatOrderNum = (order) => order.orderNumber ? String(order.orderNumber).padStart(4, '0') : order.id.slice(0,6).toUpperCase();

// --- المكون الرئيسي للتطبيق ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // App Data States
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [joinName, setJoinName] = useState('');
  const [printData, setPrintData] = useState(null);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [authError, setAuthError] = useState('');

  // 1. مراقبة حالة تسجيل الدخول
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب البيانات من قاعدة بياناتك (Firestore)
  useEffect(() => {
    if (!user) return;

    // دالة مساعدة لتحديد مسار الجداول في قاعدة بياناتك
    const dataPath = (collectionName) => collection(db, 'artifacts', appId, 'public', 'data', collectionName);

    const unsubProfiles = onSnapshot(dataPath('profiles'), 
      (snap) => setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("خطأ في الملفات الشخصية:", err)
    );
    const unsubOrders = onSnapshot(dataPath('orders'), 
      (snap) => {
        const fetchedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(fetchedOrders);
      },
      (err) => console.error("خطأ في الطلبات:", err)
    );
    const unsubInventory = onSnapshot(dataPath('inventory'), 
      (snap) => setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("خطأ في المخزون:", err)
    );
    const unsubTransactions = onSnapshot(dataPath('transactions'), 
      (snap) => {
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        txs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(txs);
      },
      (err) => console.error("خطأ في المعاملات:", err)
    );

    return () => {
      unsubProfiles(); unsubOrders(); unsubInventory(); unsubTransactions();
    };
  }, [user]);

  const myProfile = profiles.find(p => p.uid === user?.uid);

  // --- دوال مساعدة ومنطق العمل ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSetupMode) {
        // إنشاء حساب أول مدير فقط
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // تسجيل الدخول العادي للموظفين والمدير
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential') setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      else if (err.code === 'auth/email-already-in-use') setAuthError('هذا البريد مستخدم مسبقاً.');
      else setAuthError(err.message);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!user || !joinName.trim()) return;
    
    // أول مستخدم يكمل ملفه يصبح المدير
    const isFirst = profiles.length === 0;
    const role = isFirst ? 'admin' : 'staff';
    
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), {
      uid: user.uid,
      name: joinName.trim(),
      email: user.email,
      role: role,
      createdAt: new Date().toISOString()
    });
  };

  const hasAccess = (tabId) => {
    if (!myProfile) return false;
    const role = myProfile.role;
    if (role === 'admin') return true;
    
    const permissions = {
      manager: ['Dashboard', 'Orders', 'Production', 'Store', 'Delivery', 'Sales', 'Finance'],
      sales: ['Dashboard', 'Orders', 'Sales'],
      production: ['Dashboard', 'Production', 'Store'],
      store: ['Dashboard', 'Store'],
      delivery: ['Dashboard', 'Delivery'],
      finance: ['Dashboard', 'Finance', 'Sales'],
      staff: ['Dashboard']
    };
    return permissions[role]?.includes(tabId) || false;
  };

  const TABS = [
    { id: 'Dashboard', icon: LayoutDashboard, label: 'النظرة العامة' },
    { id: 'Orders', icon: ShoppingCart, label: 'إدارة الطلبات' },
    { id: 'Production', icon: ChefHat, label: 'خط الإنتاج' },
    { id: 'Store', icon: StoreIcon, label: 'المخزون والمستودع' },
    { id: 'Delivery', icon: Truck, label: 'التوصيل والشحن' },
    { id: 'Sales', icon: TrendingUp, label: 'سجل المبيعات' },
    { id: 'Finance', icon: DollarSign, label: 'المالية والحسابات' },
    { id: 'Admin', icon: Users, label: 'إدارة النظام' },
  ];

  const handleImageUpload = (e, setFormState, formState) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setFormState({ ...formState, imageUrl: canvas.toDataURL('image/jpeg', 0.7) });
      }
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // --- واجهات العرض (Views) ---
  
  const DashboardView = () => {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const bakingCount = orders.filter(o => o.status === 'baking').length;
    const readyCount = orders.filter(o => o.status === 'ready').length;
    const lowStock = inventory.filter(i => Number(i.quantity) < 10).length;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">نظرة عامة على المصنع</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="طلبات قيد الانتظار" value={pendingCount} icon={ShoppingCart} colorClass="bg-yellow-100 text-yellow-600" />
          <StatCard title="في خط الإنتاج" value={bakingCount} icon={ChefHat} colorClass="bg-orange-100 text-orange-600" />
          <StatCard title="جاهز للشحن" value={readyCount} icon={Package} colorClass="bg-blue-100 text-blue-600" />
          <StatCard title="عناصر منخفضة المخزون" value={lowStock} icon={AlertCircle} colorClass="bg-red-100 text-red-600" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">أحدث النشاطات</h3>
          {orders.slice(0, 5).map(o => (
            <div key={o.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-semibold text-gray-800">{o.customerName} - {o.cakeType}</p>
                <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">لا توجد نشاطات حالية.</p>}
        </div>
      </div>
    );
  };

  const OrdersView = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('active');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ customerName: '', phone: '', address: '', cakeType: '', quantity: 1, price: '', notes: '', imageUrl: '' });

    const filteredOrders = orders.filter(o => {
      const orderSearchNum = formatOrderNum(o);
      const matchesSearch = o.customerName?.includes(searchTerm) || o.phone?.includes(searchTerm) || orderSearchNum.includes(searchTerm);
      if (!matchesSearch) return false;
      if (filter === 'active') return ['pending', 'baking', 'ready', 'out_for_delivery'].includes(o.status);
      if (filter === 'completed') return o.status === 'completed';
      return true;
    });

    const handleEdit = (order) => {
      setEditingId(order.id);
      setForm({
        customerName: order.customerName || '', phone: order.phone || '', address: order.address || '',
        cakeType: order.cakeType || '', quantity: order.quantity || 1, price: order.price || '',
        notes: order.notes || '', imageUrl: order.imageUrl || ''
      });
      setModalOpen(true);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', editingId), {
          ...form, updatedAt: new Date().toISOString()
        });
      } else {
        const nextOrderNum = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber || 0)) + 1 : 1;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
          ...form, status: 'pending', createdAt: new Date().toISOString(), orderNumber: nextOrderNum
        });
      }
      setModalOpen(false);
      setEditingId(null);
      setForm({ customerName: '', phone: '', address: '', cakeType: '', quantity: 1, price: '', notes: '', imageUrl: '' });
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
            <button onClick={() => { setEditingId(null); setForm({ customerName: '', phone: '', address: '', cakeType: '', quantity: 1, price: '', notes: '', imageUrl: '' }); setModalOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap">
              <Plus size={20} /> طلب جديد
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setFilter('active')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>سجل الأعمال (النشطة)</button>
          <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'completed' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>سجل المنجز</button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>الكل</button>
        </div>
        
        <Table headers={['الصورة', 'رقم الطلب', 'العميل والهاتف', 'تفاصيل الكيك', 'المبلغ', 'الحالة', 'إجراء']}>
          {filteredOrders.map(o => (
            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4">
                {o.imageUrl ? <img src={o.imageUrl} alt="cake" className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm" /> : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200"><ImageIcon size={20}/></div>}
              </td>
              <td className="p-4 font-mono text-xs text-gray-500 font-bold">#{formatOrderNum(o)}</td>
              <td className="p-4">
                <p className="font-medium text-gray-800">{o.customerName}</p>
                <p className="text-xs text-gray-500 dir-ltr text-right mt-1 font-mono">{o.phone}</p>
              </td>
              <td className="p-4 text-sm">{o.quantity}x {o.cakeType}</td>
              <td className="p-4 font-semibold text-gray-700">${Number(o.price).toFixed(2)}</td>
              <td className="p-4"><StatusBadge status={o.status} /></td>
              <td className="p-4">
                <button onClick={() => handleEdit(o)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg transition-colors">
                  <Edit size={18} />
                </button>
              </td>
            </tr>
          ))}
          {filteredOrders.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-400">لا توجد طلبات مطابقة للبحث.</td></tr>}
        </Table>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingId ? "تعديل الطلب" : "إنشاء طلب جديد"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
                <input type="text" required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" placeholder="مثال: أحمد محمد" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم هاتف المستلم</label>
                <input type="text" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dir-ltr text-right bg-white" placeholder="07..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عنوان التوصيل</label>
              <textarea required value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" rows="2" placeholder="العنوان بالتفصيل"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الكيك</label>
                <input type="text" required value={form.cakeType} onChange={e => setForm({...form, cakeType: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" placeholder="مثال: شوكولاتة" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                <input type="number" required min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر الإجمالي ($)</label>
                <input type="number" required min="0" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة التصميم (من الجهاز)</label>
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setForm, form)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" />
                {form.imageUrl && <img src={form.imageUrl} alt="preview" className="mt-2 h-16 w-16 object-cover rounded shadow-sm border border-gray-200" />}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات خاصة</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" rows="2" placeholder="كتابة على الكيك، حساسية من مكون معين..."></textarea>
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors">
              {editingId ? "حفظ التعديلات" : "حفظ الطلب"}
            </button>
          </form>
        </Modal>
      </div>
    );
  };

  const ProductionView = () => {
    const activeOrders = orders.filter(o => ['pending', 'baking'].includes(o.status));
    const completedOrders = orders.filter(o => ['ready', 'out_for_delivery', 'completed'].includes(o.status)).slice(0, 10);

    const updateStatus = async (id, newStatus) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">خط الإنتاج</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Clock size={18} className="text-yellow-500"/> بانتظار الخبز</h3>
            <div className="space-y-3">
              {activeOrders.filter(o => o.status === 'pending').map(o => (
                <div key={o.id} className="p-4 border border-yellow-200 bg-yellow-50 rounded-xl relative shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-gray-800 text-lg">{o.cakeType}</span>
                    <span className="text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded font-bold">{o.quantity} قطعة</span>
                  </div>
                  {o.imageUrl && <img src={o.imageUrl} alt="cake ref" className="w-full h-32 object-cover rounded-lg mb-3 border border-yellow-200 shadow-sm" />}
                  <p className="text-sm text-gray-600 mb-1">رقم الطلب: <span className="font-mono font-bold">#{formatOrderNum(o)}</span></p>
                  <p className="text-sm text-gray-700 mb-3 bg-white p-2 rounded border border-yellow-100">{o.notes || 'لا توجد ملاحظات إضافية.'}</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => updateStatus(o.id, 'baking')} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                      البدء بالعمل
                    </button>
                    <button onClick={() => setPrintData(o)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-lg transition-colors shadow-sm" title="طباعة الأوردر">
                      <Printer size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {activeOrders.filter(o => o.status === 'pending').length === 0 && <p className="text-sm text-gray-400 text-center py-4">لا توجد طلبات معلقة.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><ChefHat size={18} className="text-orange-500"/> جاري التحضير والخبز</h3>
            <div className="space-y-3">
              {activeOrders.filter(o => o.status === 'baking').map(o => (
                <div key={o.id} className="p-4 border border-orange-200 bg-orange-50 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-gray-800 text-lg">{o.cakeType}</span>
                    <span className="text-sm bg-orange-200 text-orange-800 px-2 py-1 rounded font-bold">{o.quantity} قطعة</span>
                  </div>
                  {o.imageUrl && <img src={o.imageUrl} alt="cake ref" className="w-full h-32 object-cover rounded-lg mb-3 border border-orange-200 shadow-sm" />}
                  <p className="text-sm text-gray-600 mb-3">رقم الطلب: <span className="font-mono font-bold">#{formatOrderNum(o)}</span></p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => updateStatus(o.id, 'ready')} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                      تحديد كـ "جاهز للاستلام"
                    </button>
                    <button onClick={() => setPrintData(o)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-lg transition-colors shadow-sm">
                      <Printer size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {activeOrders.filter(o => o.status === 'baking').length === 0 && <p className="text-sm text-gray-400 text-center py-4">لا يوجد شيء في الفرن حالياً.</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle size={20} className="text-green-500"/> سجل المنجز (حديثاً)</h3>
          <Table headers={['رقم الطلب', 'الصنف', 'الكمية', 'وقت الإنجاز', 'الحالة']}>
            {completedOrders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-xs text-gray-500 font-bold">#{formatOrderNum(o)}</td>
                <td className="p-4 font-medium">{o.cakeType}</td>
                <td className="p-4">{o.quantity}</td>
                <td className="p-4 text-sm text-gray-500">{formatDate(o.updatedAt || o.createdAt)}</td>
                <td className="p-4"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {completedOrders.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-400">لا توجد أعمال منجزة حديثاً.</td></tr>}
          </Table>
        </div>
      </div>
    );
  };

  const StoreView = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ itemName: '', type: 'مكونات', quantity: '', unit: 'كجم', price: '' });

    const handleSubmit = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), {
        ...form,
        quantity: Number(form.quantity),
        price: Number(form.price) || 0,
        lastUpdated: new Date().toISOString()
      });
      setModalOpen(false);
      setForm({ itemName: '', type: 'مكونات', quantity: '', unit: 'كجم', price: '' });
    };

    const handleAdjustQty = async (id, currentQty, change) => {
      const newQty = Number(currentQty) + change;
      if (newQty < 0) return;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id), {
        quantity: newQty,
        lastUpdated: new Date().toISOString()
      });
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">المخزون والمستودع</h2>
          <button onClick={() => setModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
            <Plus size={20} /> إضافة عنصر
          </button>
        </div>

        <Table headers={['اسم العنصر', 'الفئة', 'الرصيد الحالي', 'سعر الوحدة', 'إجمالي القيمة', 'تعديل الكمية']}>
          {inventory.map(item => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="p-4 font-semibold text-gray-800">{item.itemName}</td>
              <td className="p-4 text-sm text-gray-600">{item.type}</td>
              <td className="p-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.quantity < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {item.quantity} {item.unit}
                </span>
              </td>
              <td className="p-4 text-sm font-medium text-gray-700">${Number(item.price || 0).toFixed(2)}</td>
              <td className="p-4 font-bold text-amber-700 bg-amber-50/50">${(Number(item.quantity) * Number(item.price || 0)).toFixed(2)}</td>
              <td className="p-4 flex space-x-2 space-x-reverse">
                <button onClick={() => handleAdjustQty(item.id, item.quantity, 1)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded font-bold transition-colors">+</button>
                <button onClick={() => handleAdjustQty(item.id, item.quantity, -1)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded font-bold transition-colors">-</button>
              </td>
            </tr>
          ))}
          {inventory.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">المستودع فارغ حالياً.</td></tr>}
        </Table>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="إضافة عنصر للمخزون">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم العنصر</label>
              <input type="text" required value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" placeholder="مثال: دقيق القمح" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500">
                <option value="مكونات">مكونات ومواد خام</option>
                <option value="تغليف">مواد تغليف وعلب</option>
                <option value="معدات">معدات وأدوات</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                <input type="number" required min="0" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر الوحدة ($)</label>
                <input type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
                <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="كجم">كيلوجرام (كجم)</option>
                  <option value="جرام">جرام (جم)</option>
                  <option value="قطعة">قطعة</option>
                  <option value="لتر">لتر</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors">حفظ العنصر</button>
          </form>
        </Modal>
      </div>
    );
  };

  const DeliveryView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('active');

    const activeDeliveries = orders.filter(o => ['ready', 'out_for_delivery'].includes(o.status));
    const historyDeliveries = orders.filter(o => o.status === 'completed');

    const displayedOrders = (viewMode === 'active' ? activeDeliveries : historyDeliveries).filter(o => {
      const orderSearchNum = formatOrderNum(o);
      return o.customerName?.includes(searchTerm) || o.phone?.includes(searchTerm) || o.address?.includes(searchTerm) || orderSearchNum.includes(searchTerm);
    });

    const handleDispatch = async (id) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', id), {
        status: 'out_for_delivery', dispatchedAt: new Date().toISOString()
      });
    };

    const handleDelivered = async (order) => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), {
        status: 'completed', completedAt: now
      });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
        category: 'revenue', type: 'income', amount: Number(order.price),
        description: `إيراد طلب: ${order.customerName} #${formatOrderNum(order)}`, date: now, relatedOrderId: order.id
      });
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">التوصيل والشحن</h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
            <input type="text" placeholder="بحث بالاسم، الهاتف، الرقم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'active' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>الطلبات الحالية</button>
          <button onClick={() => setViewMode('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'history' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border'}`}>السجل العام (التاريخ)</button>
        </div>

        {viewMode === 'active' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Package size={18} className="text-blue-500"/> جاهز للشحن</h3>
              <div className="space-y-3">
                {displayedOrders.filter(o => o.status === 'ready').map(o => (
                  <div key={o.id} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <h4 className="font-bold text-gray-800">{o.customerName} <span className="text-xs text-gray-500 font-normal dir-ltr ml-2 bg-blue-100 px-1 rounded">{o.phone}</span></h4>
                    <p className="text-sm text-gray-600 my-1 font-medium">{o.address}</p>
                    <p className="text-xs text-blue-700 font-medium mb-3">الصنف: {o.quantity}x {o.cakeType} (رقم: #{formatOrderNum(o)})</p>
                    <button onClick={() => handleDispatch(o.id)} className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-md text-sm font-semibold transition-colors shadow-sm">
                      إرسال مع السائق
                    </button>
                  </div>
                ))}
                {displayedOrders.filter(o => o.status === 'ready').length === 0 && <p className="text-sm text-gray-400 py-2">لا توجد طلبات بانتظار الشحن.</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Truck size={18} className="text-purple-500"/> في الطريق للعميل</h3>
              <div className="space-y-3">
                {displayedOrders.filter(o => o.status === 'out_for_delivery').map(o => (
                  <div key={o.id} className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
                     <h4 className="font-bold text-gray-800">{o.customerName} <span className="text-xs text-gray-500 font-normal dir-ltr ml-2 bg-purple-100 px-1 rounded">{o.phone}</span></h4>
                     <p className="text-sm text-gray-600 my-1 font-medium">{o.address}</p>
                     <p className="text-xs text-purple-700 font-medium mb-3">تم إرسالها: {formatDate(o.dispatchedAt)}</p>
                    <button onClick={() => handleDelivered(o)} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md text-sm font-semibold transition-colors shadow-sm">
                      تأكيد الاستلام وإضافة الدفع للحسابات
                    </button>
                  </div>
                ))}
                 {displayedOrders.filter(o => o.status === 'out_for_delivery').length === 0 && <p className="text-sm text-gray-400 py-2">لا يوجد سائقون في الخارج حالياً.</p>}
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
                <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={o.address}>{o.address}</td>
                <td className="p-4 text-sm text-gray-500">{formatDate(o.completedAt)}</td>
              </tr>
            ))}
            {displayedOrders.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-400">السجل فارغ.</td></tr>}
          </Table>
        )}
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
          <div className="relative w-full md:w-64">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
            <input type="text" placeholder="بحث باسم العميل أو رقم الطلب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="الطلبات المكتملة المطابقة" value={completed.length} icon={CheckCircle} colorClass="bg-green-100 text-green-600" />
          <StatCard title="إجمالي إيرادات البحث" value={`$${totalSales.toFixed(2)}`} icon={TrendingUp} colorClass="bg-blue-100 text-blue-600" />
        </div>
        
        <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4 border-b pb-2">التقارير الشهرية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(monthlyData).sort().reverse().map(([month, data]) => (
            <div key={month} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1 h-full bg-amber-500"></div>
              <h4 className="font-bold text-gray-700 mb-2 dir-ltr text-right">{month}</h4>
              <p className="text-sm text-gray-500 mb-1">الطلبات: <span className="font-bold text-gray-700">{data.count}</span></p>
              <p className="text-xl font-bold text-green-600 mt-2">${data.revenue.toFixed(2)}</p>
            </div>
          ))}
          {Object.keys(monthlyData).length === 0 && <p className="text-gray-400 text-sm">لا تتوفر بيانات شهرية لعرضها.</p>}
        </div>

        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">التفاصيل</h3>
        <Table headers={['رقم الطلب', 'تاريخ الاكتمال', 'العميل', 'الأصناف', 'الإيراد']}>
          {completed.map(o => (
             <tr key={o.id} className="hover:bg-gray-50">
               <td className="p-4 font-mono text-xs text-gray-500 font-bold">#{formatOrderNum(o)}</td>
               <td className="p-4 text-sm">{formatDate(o.completedAt)}</td>
               <td className="p-4 font-medium">{o.customerName}</td>
               <td className="p-4 text-sm">{o.quantity}x {o.cakeType}</td>
               <td className="p-4 font-semibold text-green-700">+ ${Number(o.price).toFixed(2)}</td>
             </tr>
          ))}
          {completed.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-400">لا توجد مبيعات تطابق بحثك.</td></tr>}
        </Table>
      </div>
    );
  };

  const FinanceView = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [form, setForm] = useState({ type: 'expense', category: 'daily_ops', amount: '', description: '' });

    const categories = {
      revenue: 'إيرادات المبيعات',
      other_income: 'إيرادات أخرى',
      rent: 'إيجار',
      salaries: 'رواتب',
      internet: 'إنترنت',
      bonuses: 'مكافآت',
      maintenance: 'صيانة عامة',
      marketing: 'تسويق',
      personal: 'مسحوبات شخصية',
      daily_ops: 'مصاريف تشغيلية يومية',
      inventory_purchase: 'مواد مضافة (مشتريات مخزون)'
    };

    const currentInventoryValue = inventory.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price || 0)), 0);
    const filteredTransactions = transactions.filter(t => filterCategory === 'all' || t.category === filterCategory);
    const calcTotal = (condition) => transactions.filter(condition).reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalIncome = calcTotal(t => t.type === 'income');
    const totalExpense = calcTotal(t => t.type === 'expense');
    const operatingExpenses = calcTotal(t => ['rent', 'salaries', 'internet', 'bonuses', 'maintenance', 'marketing', 'daily_ops', 'personal'].includes(t.category));
    const inventoryPurchases = calcTotal(t => t.category === 'inventory_purchase');
    const netProfit = totalIncome - totalExpense;

    const handleSubmit = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
        ...form, amount: Number(form.amount), date: new Date().toISOString()
      });
      setModalOpen(false);
      setForm({ type: 'expense', category: 'daily_ops', amount: '', description: '' });
    };

    const exportToCSV = () => {
      const headers = ['التاريخ', 'النوع', 'الفئة', 'الوصف', 'المبلغ'];
      const rows = filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type === 'income' ? 'إيراد' : 'مصروف',
        categories[t.category] || t.category,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount
      ]);
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `تقرير_مالي_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">المالية والحسابات</h2>
          <div className="flex gap-2 flex-wrap">
             <button onClick={exportToCSV} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm border transition-colors">
              <Download size={20} /> تصدير تقرير
            </button>
            <button onClick={() => window.print()} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm border transition-colors">
              <Printer size={20} /> طباعة
            </button>
            <button onClick={() => setModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap">
              <Plus size={20} /> معاملة جديدة
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print-section">
           <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><FileText size={20} className="text-amber-600"/> تقرير الملخص المالي</h3>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-2">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                 <p className="text-xs text-blue-800 font-medium">الرصيد المخزني الحالي</p>
                 <p className="text-xl font-bold text-blue-900 mt-1">${currentInventoryValue.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                 <p className="text-xs text-indigo-800 font-medium">مواد مضافة للمخزون</p>
                 <p className="text-xl font-bold text-indigo-900 mt-1">${inventoryPurchases.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                 <p className="text-xs text-green-800 font-medium">إجمالي الإيرادات</p>
                 <p className="text-xl font-bold text-green-900 mt-1">${totalIncome.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                 <p className="text-xs text-red-800 font-medium">مصاريف التشغيل والثوابت</p>
                 <p className="text-xl font-bold text-red-900 mt-1">${operatingExpenses.toFixed(2)}</p>
              </div>
              <div className={`p-4 rounded-lg border ${netProfit >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-100 border-gray-200'}`}>
                 <p className={`text-xs font-bold ${netProfit >= 0 ? 'text-amber-800' : 'text-gray-600'}`}>الصافي النهائي للمرحلة</p>
                 <p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-amber-900' : 'text-gray-800'}`}>${netProfit.toFixed(2)}</p>
              </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-100 p-3 rounded-lg border gap-4 no-print">
           <span className="font-medium text-gray-700">تصفية السجل اليومي:</span>
           <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-amber-500 w-full md:w-auto bg-white">
             <option value="all">عرض كل المعاملات</option>
             {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
           </select>
        </div>

        <div className="print-section">
          <Table headers={['التاريخ', 'النوع', 'الفئة', 'الوصف', 'المبلغ']}>
            {filteredTransactions.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm">{formatDate(t.date)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {t.type === 'income' ? 'إيراد / دخل' : 'مصروف'}
                  </span>
                </td>
                <td className="p-4 text-sm font-medium text-gray-600">{categories[t.category] || t.category}</td>
                <td className="p-4 text-gray-800">{t.description}</td>
                <td className={`p-4 font-bold dir-ltr text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'} ${Number(t.amount).toFixed(2)}
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-400">لا توجد معاملات مطابقة للفلتر.</td></tr>}
          </Table>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="تسجيل معاملة مالية">
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">طبيعة المعاملة</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value, category: e.target.value === 'income' ? 'other_income' : 'daily_ops'})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                  <option value="expense">مصروفات و التزامات (-)</option>
                  <option value="income">إيرادات ومقوضات (+)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف المحاسبي</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                  {form.type === 'income' ? (
                    <>
                      <option value="revenue">إيرادات المبيعات</option>
                      <option value="other_income">إيرادات أخرى</option>
                    </>
                  ) : (
                    <>
                      <option value="daily_ops">مصاريف تشغيلية يومية</option>
                      <option value="rent">إيجار</option>
                      <option value="salaries">رواتب</option>
                      <option value="internet">إنترنت</option>
                      <option value="bonuses">مكافآت</option>
                      <option value="maintenance">صيانة عامة</option>
                      <option value="marketing">تسويق</option>
                      <option value="personal">مسحوبات شخصية</option>
                      <option value="inventory_purchase">مواد مضافة (مشتريات مخزون)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الوصف والتفاصيل</label>
              <input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white" placeholder="مثال: سحب نقدي للمالك، فاتورة صيانة العجانة..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ ($)</label>
              <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white" placeholder="0.00" />
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors shadow-sm">حفظ المعاملة</button>
          </form>
        </Modal>
      </div>
    );
  };

  const AdminView = () => {
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [createError, setCreateError] = useState('');
    const [newEmp, setNewEmp] = useState({ name: '', email: '', password: '', role: 'staff' });

    const handleRoleChange = async (profileId, newRole) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', profileId), { role: newRole });
    };

    const handleCreateEmployee = async (e) => {
      e.preventDefault();
      setCreateError('');
      try {
        const appName = "SecondaryAppForCreation";
        const secondaryApp = getApps().find(app => app.name === appName) || initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmp.email, newEmp.password);
        const newUid = userCredential.user.uid;
        
        await signOut(secondaryAuth);

        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', newUid), {
          uid: newUid,
          name: newEmp.name,
          email: newEmp.email,
          role: newEmp.role,
          createdAt: new Date().toISOString()
        });

        setCreateModalOpen(false);
        setNewEmp({ name: '', email: '', password: '', role: 'staff' });
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') setCreateError('هذا البريد مستخدم لموظف آخر.');
        else if (err.code === 'auth/weak-password') setCreateError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
        else setCreateError('حدث خطأ: ' + err.message);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">إدارة النظام</h2>
            <p className="text-gray-600 text-sm mt-1">إدارة صلاحيات الوصول وإنشاء حسابات للموظفين.</p>
          </div>
          <button onClick={() => setCreateModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors">
            <ShieldCheck size={20} /> إضافة موظف جديد
          </button>
        </div>
        
        <Table headers={['الاسم', 'البريد الإلكتروني', 'الدور المخصص', 'تاريخ الانضمام', 'الحالة']}>
          {profiles.map(p => (
             <tr key={p.id} className="hover:bg-gray-50">
               <td className="p-4 font-semibold text-gray-800">{p.name}</td>
               <td className="p-4 text-sm text-gray-600 dir-ltr text-right">{p.email}</td>
               <td className="p-4">
                  <select 
                    value={p.role}
                    onChange={(e) => handleRoleChange(p.id, e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    disabled={p.uid === user.uid}
                  >
                    <option value="admin">مدير النظام (كامل الصلاحيات)</option>
                    <option value="manager">مدير المصنع</option>
                    <option value="sales">قسم المبيعات</option>
                    <option value="production">قسم الإنتاج والخبز</option>
                    <option value="store">إدارة المستودع</option>
                    <option value="delivery">سائق توصيل</option>
                    <option value="finance">المالية والحسابات</option>
                    <option value="staff">موظف عام (لا يملك وصول)</option>
                  </select>
               </td>
               <td className="p-4 text-sm text-gray-500">{formatDate(p.createdAt)}</td>
               <td className="p-4">
                 {p.uid === user.uid ? 
                   <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded font-medium">أنت</span> : 
                   <span className="text-xs text-green-600 font-medium">نشط</span>
                 }
               </td>
             </tr>
          ))}
        </Table>

        <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="إنشاء حساب موظف جديد">
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            {createError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">{createError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل للموظف</label>
              <input type="text" required value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" placeholder="مثال: محمد علي" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (لتسجيل الدخول)</label>
              <input type="email" required value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 dir-ltr text-right" placeholder="employee@bakery.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور (أرقام وحروف - 6 الأقل)</label>
              <input type="password" required minLength="6" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 dir-ltr text-right" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية (القسم)</label>
              <select value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500">
                <option value="staff">موظف عام (لا يملك وصول)</option>
                <option value="manager">مدير المصنع</option>
                <option value="sales">قسم المبيعات (إضافة طلبات)</option>
                <option value="production">قسم الإنتاج والخبز</option>
                <option value="store">إدارة المستودع</option>
                <option value="delivery">سائق توصيل</option>
                <option value="finance">المالية والحسابات</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg mt-4 transition-colors">إنشاء الحساب الآن</button>
          </form>
        </Modal>
      </div>
    );
  };

  // --- واجهات التحميل والدخول ---

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50" dir="rtl">
        <div className="flex flex-col items-center animate-pulse">
          <Cake size={48} className="text-amber-600 mb-4" />
          <h1 className="text-xl font-bold text-gray-700">جاري تحميل نظام سويت أوبس...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    const isFirstTimeEver = profiles.length === 0;

    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 font-sans" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-100">
          <div className="flex flex-col items-center justify-center mx-auto mb-6">
             <div className="text-center">
                <span className="block text-3xl font-serif text-slate-800 tracking-wider font-bold mb-1">BASHEER</span>
                <span className="block text-2xl font-serif text-slate-800 tracking-wider">ALSHAKARCHY</span>
                <div className="w-full h-1 bg-amber-500 mt-2 mb-2 rounded"></div>
                <span className="block text-xs text-slate-600 tracking-widest font-semibold uppercase">Sweets & Cake</span>
             </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{isSetupMode ? 'إعداد حساب المدير' : 'تسجيل الدخول للنظام'}</h1>
          <p className="text-gray-500 mb-6">{isSetupMode ? 'مرحباً! يرجى إعداد حساب مدير النظام لأول مرة.' : 'الرجاء إدخال البريد الإلكتروني وكلمة المرور للدخول.'}</p>
          
          {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-200">{authError}</div>}
          
          <form onSubmit={handleAuth} className="space-y-4 text-right">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dir-ltr text-right" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dir-ltr text-right" minLength="6" />
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md mt-2">
              {isSetupMode ? 'إنشاء حساب المدير الأساسي' : 'دخول للنظام'}
            </button>
          </form>

          {isFirstTimeEver && (
            <div className="mt-6 text-sm text-gray-600 border-t pt-4">
              لم يتم تهيئة النظام بعد؟ 
              <button onClick={() => {setIsSetupMode(!isSetupMode); setAuthError('');}} className="text-amber-600 font-bold mr-2 hover:underline">
                {isSetupMode ? 'العودة لتسجيل الدخول' : 'إعداد النظام لأول مرة'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (user && !myProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 font-sans" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-100">
          <div className="flex flex-col items-center justify-center mx-auto mb-6">
             <div className="text-center">
                <span className="block text-3xl font-serif text-slate-800 tracking-wider font-bold mb-1">BASHEER</span>
                <span className="block text-2xl font-serif text-slate-800 tracking-wider">ALSHAKARCHY</span>
                <div className="w-full h-1 bg-amber-500 mt-2 mb-2 rounded"></div>
                <span className="block text-xs text-slate-600 tracking-widest font-semibold uppercase">Sweets & Cake</span>
             </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">مرحباً بك في النظام</h1>
          <p className="text-gray-500 mb-8">حسابك جاهز. الرجاء إدخال اسمك الحقيقي ليكتمل الملف الشخصي الخاص بك.</p>
          <form onSubmit={handleJoin} className="space-y-4 text-right">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
              <input 
                type="text" 
                value={joinName} 
                onChange={e => setJoinName(e.target.value)}
                placeholder="مثال: عبدالله أحمد"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                required
              />
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md">
              حفظ والدخول للوحة التحكم
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print-section { position: absolute; left: 0; top: 0; width: 100%; margin:0; padding: 20px; background: white; }
          aside, header { display: none !important; }
          .no-print { display: none !important; }
        }
      `}} />
      
      {printData && (
        <div className="print-section hidden print:block text-right dir-rtl font-sans p-8 mx-auto max-w-2xl bg-white border-2 border-dashed border-gray-300">
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
            <h1 className="text-4xl font-serif text-slate-800 font-bold mb-1">BASHEER ALSHAKARCHY</h1>
            <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Sweets & Cake</p>
            <p className="mt-6 text-xl font-bold bg-gray-100 inline-block px-6 py-2 rounded-lg border border-gray-200">وصل طلب رقم: #{formatOrderNum(printData)}</p>
          </div>
          <div className="space-y-4 text-lg">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
               <p><strong>اسم العميل:</strong> {printData.customerName}</p>
               <p><strong>رقم هاتف المستلم:</strong> <span className="dir-ltr inline-block font-mono">{printData.phone}</span></p>
            </div>
            <p className="p-4 border rounded-lg"><strong>العنوان:</strong> {printData.address}</p>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
               <p><strong>نوع الكيك:</strong> {printData.cakeType}</p>
               <p><strong>الكمية المطلوبة:</strong> {printData.quantity}</p>
            </div>
            <p className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xl"><strong>الإجمالي المستحق:</strong> ${Number(printData.price).toFixed(2)}</p>
            {printData.notes && <p className="p-4 border rounded-lg bg-yellow-50"><strong>ملاحظات خاصة:</strong> {printData.notes}</p>}
          </div>
          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>وقت وتاريخ الطلب: {formatDate(printData.createdAt)}</p>
            <p className="mt-2 font-bold">شكراً لاختياركم بشير الشكرچي!</p>
          </div>
        </div>
      )}

      <div className={`flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans ${printData ? 'no-print' : ''}`} dir="rtl">
        
        <aside className="w-64 bg-gray-900 text-white flex flex-col transition-all shadow-xl z-20">
          <div className="p-6 flex flex-col items-center border-b border-gray-800 text-center bg-gray-950">
             <span className="block text-xl font-serif text-white tracking-wider font-bold mb-1 drop-shadow-md">BASHEER</span>
             <span className="block text-lg font-serif text-white tracking-wider drop-shadow-md">ALSHAKARCHY</span>
             <div className="w-full h-0.5 bg-amber-500 mt-2 mb-1 rounded shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
             <span className="block text-[0.6rem] text-gray-400 tracking-widest font-semibold uppercase">Sweets & Cake</span>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {TABS.map(tab => hasAccess(tab.id) && (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <tab.icon size={20} />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-800 bg-gray-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center font-bold text-lg">
                {myProfile?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{myProfile?.name}</p>
                <p className="text-xs text-amber-500 font-medium tracking-wider">{
                  myProfile?.role === 'admin' ? 'مدير النظام' : 
                  myProfile?.role === 'manager' ? 'مدير مصنع' :
                  myProfile?.role === 'sales' ? 'المبيعات' :
                  myProfile?.role === 'production' ? 'الإنتاج' :
                  myProfile?.role === 'store' ? 'المستودع' :
                  myProfile?.role === 'delivery' ? 'سائق' :
                  myProfile?.role === 'finance' ? 'مالية' : 'موظف'
                }</p>
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white py-2 rounded-lg transition-colors text-sm font-medium">
              <LogOut size={16} /> تسجيل الخروج
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
            <h1 className="text-xl font-bold text-gray-800">{TABS.find(t => t.id === activeTab)?.label}</h1>
            <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full">
              {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto">
            {printData && (
               <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-5 rounded-xl shadow-sm flex justify-between items-center">
                 <div className="flex items-center gap-3">
                   <Printer size={24} className="text-blue-600" />
                   <p className="font-medium text-lg">أنت الآن في وضع الطباعة للطلب <span className="font-mono bg-blue-100 px-2 rounded">#{formatOrderNum(printData)}</span></p>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <Printer size={18} /> طباعة الفاتورة
                   </button>
                   <button onClick={() => setPrintData(null)} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg shadow hover:bg-gray-100 transition-colors">
                      إلغاء وإغلاق
                   </button>
                 </div>
               </div>
            )}

            {activeTab === 'Dashboard' && <DashboardView />}
            {activeTab === 'Orders' && <OrdersView />}
            {activeTab === 'Production' && <ProductionView />}
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