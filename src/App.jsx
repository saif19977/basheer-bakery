import { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppContext } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { NotificationStack } from './components/layout/NotificationStack';
import { ImageZoomOverlay } from './components/layout/ImageZoomOverlay';
import { PrintActionBar } from './print/PrintActionBar';
import { PrintSection } from './print/PrintSection';
import { ConnectingScreen } from './pages/ConnectingScreen';
import { DataLoadingScreen } from './pages/DataLoadingScreen';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { DashboardView } from './views/DashboardView';
import { OrdersView } from './views/OrdersView';
import { CustomersView } from './views/CustomersView';
import { ProductionView } from './views/ProductionView';
import { FinishedGoodsView } from './views/FinishedGoodsView';
import { StoreView } from './views/StoreView';
import { DeliveryView } from './views/DeliveryView';
import { SalesView } from './views/SalesView';
import { FinanceView } from './views/FinanceView';
import { AdminView } from './views/AdminView';
import { useAppData } from './hooks/useAppData';
import { useNotifications } from './hooks/useNotifications';
import { useDynamicCategories } from './hooks/useDynamicCategories';
import { usePermissions, useActiveTabGuard } from './hooks/usePermissions';
import { uploadImageToStorage } from './services/storageService';

const VIEWS_BY_TAB = {
  Dashboard: DashboardView,
  Orders: OrdersView,
  Customers: CustomersView,
  Production: ProductionView,
  FinishedGoods: FinishedGoodsView,
  Delivery: DeliveryView,
  Sales: SalesView,
  Finance: FinanceView,
  Store: StoreView,
  Admin: AdminView,
};

const PRINT_AND_SCROLLBAR_STYLES = `
  @media print {
     body * { visibility: hidden; }
     .print-section, .print-section * { visibility: visible; }
     .print-section { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; margin: 0;}
     .print-section img { max-width: 100% !important; }
     aside, header, .no-print { display: none !important; }
     @page { margin: 0.5cm; }
  }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
`;

export default function App() {
  const { showNotification, notifications } = useNotifications();
  const {
    user, authLoading, profilesLoaded, showSkipLoading, forceSkipLoading,
    profiles, orders, inventory, inventoryLogs, recipes, finishedGoods, transactions,
  } = useAppData({ onNewOrder: () => showNotification('🔔 تم إضافة طلب جديد!') });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState('Orders');
  const [printData, setPrintData] = useState(null);

  const myProfile = profiles.find(p => p.uid === user?.uid);
  const { hasAccess, isManagerOrAdmin } = usePermissions(myProfile);
  useActiveTabGuard({ myProfile, profilesLoaded, activeTab, setActiveTab, hasAccess });

  const dynamicCategories = useDynamicCategories(recipes);

  const handlePrintAction = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  if (authLoading) return <ConnectingScreen />;
  if (user && !profilesLoaded) return <DataLoadingScreen showSkipLoading={showSkipLoading} onSkip={forceSkipLoading} />;
  if (!user) return <LoginPage />;
  if (!myProfile) return <UnauthorizedPage />;

  const ActiveView = VIEWS_BY_TAB[activeTab];

  return (
    <ErrorBoundary>
      <AppContext.Provider value={{
        orders, inventory, inventoryLogs, recipes, finishedGoods, transactions, profiles,
        user, myProfile, isManagerOrAdmin, dynamicCategories,
        setActiveTab, showNotification, setPrintData, setZoomedImage, uploadToStorage: uploadImageToStorage,
      }}>
        <style dangerouslySetInnerHTML={{ __html: PRINT_AND_SCROLLBAR_STYLES }} />

        <ImageZoomOverlay image={zoomedImage} onClose={() => setZoomedImage(null)} />
        <NotificationStack notifications={notifications} />
        <PrintSection printData={printData} />

        <div className={`flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans ${printData ? 'no-print' : ''}`} dir="rtl">
          {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeTab={activeTab} onSelectTab={handleSelectTab} hasAccess={hasAccess} myProfile={myProfile} />

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header activeTab={activeTab} onOpenSidebar={() => setIsSidebarOpen(true)} />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto relative custom-scrollbar">
              <PrintActionBar printData={printData} isPrinting={isPrinting} onPrint={handlePrintAction} onClose={() => setPrintData(null)} />
              {ActiveView && hasAccess(activeTab) && <ActiveView />}
            </div>
          </main>
        </div>
      </AppContext.Provider>
    </ErrorBoundary>
  );
}
