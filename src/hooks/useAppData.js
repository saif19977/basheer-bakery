import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, orderBy, limit, query } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { dataCollection } from '../firebase/paths';

const SKIP_LOADING_TIMEOUT_MS = 3000;
// جلب آخر 200 طلب فقط لتسريع الإقلاع بدل تحميل كامل السجل التاريخي.
const RECENT_ORDERS_LIMIT = 200;

const sortByDateDesc = (list, dateField) => [...list].sort((a, b) => {
  try {
    return new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime();
  } catch {
    return 0;
  }
});

const snapshotToRecords = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

/**
 * يتكفّل بكل حالة الدخول (auth) والاشتراك اللحظي (onSnapshot) بجميع مجموعات
 * بيانات النظام. هذا يفصل "من أين تأتي البيانات" عن App.jsx الذي يهتم فقط
 * بترتيب الواجهة والتوجيه بين الشاشات.
 */
export function useAppData({ onNewOrder } = {}) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [showSkipLoading, setShowSkipLoading] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const prevOrderCount = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || profilesLoaded) return;
    const timer = setTimeout(() => setShowSkipLoading(true), SKIP_LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [user, profilesLoaded]);

  useEffect(() => {
    if (!user) {
      setProfilesLoaded(false);
      setShowSkipLoading(false);
      return;
    }

    const unsubProfiles = onSnapshot(dataCollection('profiles'), (snap) => {
      setProfiles(snapshotToRecords(snap));
      setProfilesLoaded(true);
    });

    const ordersQuery = query(dataCollection('orders'), orderBy('createdAt', 'desc'), limit(RECENT_ORDERS_LIMIT));
    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      const fetchedOrders = sortByDateDesc(snapshotToRecords(snap), 'createdAt');
      if (prevOrderCount.current !== 0 && fetchedOrders.length > prevOrderCount.current) {
        onNewOrder?.();
      }
      prevOrderCount.current = fetchedOrders.length;
      setOrders(fetchedOrders);
    });

    const unsubInventory = onSnapshot(dataCollection('inventory'), (snap) => setInventory(snapshotToRecords(snap)));
    const unsubInvLogs = onSnapshot(dataCollection('inventory_logs'), (snap) => setInventoryLogs(sortByDateDesc(snapshotToRecords(snap), 'date')));
    const unsubRecipes = onSnapshot(dataCollection('recipes'), (snap) => setRecipes(snapshotToRecords(snap)));
    const unsubFinished = onSnapshot(dataCollection('finished_goods'), (snap) => setFinishedGoods(snapshotToRecords(snap)));
    const unsubTransactions = onSnapshot(dataCollection('transactions'), (snap) => setTransactions(sortByDateDesc(snapshotToRecords(snap), 'date')));

    return () => {
      unsubProfiles(); unsubOrders(); unsubInventory(); unsubInvLogs();
      unsubRecipes(); unsubFinished(); unsubTransactions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    user, authLoading, profilesLoaded, showSkipLoading,
    forceSkipLoading: () => setProfilesLoaded(true),
    profiles, orders, inventory, inventoryLogs, recipes, finishedGoods, transactions,
  };
}
