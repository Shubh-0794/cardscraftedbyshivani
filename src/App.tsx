import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { GoogleDriveProvider } from './context/GoogleDriveContext';
import { GoogleSheetsProvider } from './context/GoogleSheetsContext';
import { GmailProvider } from './context/GmailContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage';
import { CustomerAccountPage } from './pages/CustomerAccountPage';
import { CartPage } from './pages/CartPage';
import { CustomersPage } from './pages/CustomersPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrintDocsPage } from './pages/PrintDocsPage';
import { TabMenuHeader } from './components/layout/TabMenuHeader';
import { Customer } from './types';

const MainLayout: React.FC = () => {
  const { user, isCustomer } = useAuth();
  const [activeView, setActiveView] = useState(() => (isCustomer ? 'products' : 'dashboard'));
  const [selectedOrderIdForOrdersPage, setSelectedOrderIdForOrdersPage] = useState<string | null>(null);
  const [selectedCustomerOrderId, setSelectedCustomerOrderId] = useState<string | null>(null);
  const [customerForOrderCreation, setCustomerForOrderCreation] = useState<Customer | null>(null);
  const [openEnrollModalInCustomers, setOpenEnrollModalInCustomers] = useState(false);
  const [openCreateOrderModalInOrders, setOpenCreateOrderModalInOrders] = useState(false);

  useEffect(() => {
    if (isCustomer && activeView === 'orders') {
      setActiveView('dashboard');
    }
  }, [isCustomer, activeView]);

  if (!user) {
    return <LoginPage />;
  }

  // Handlers for cross-page navigation actions
  const handleOpenOrderWorkflow = (orderId: string) => {
    setSelectedOrderIdForOrdersPage(orderId);
    setActiveView('orders');
  };

  const handleOpenCustomerOrder = (orderId: string) => {
    setSelectedCustomerOrderId(orderId);
    setActiveView('dashboard');
  };

  const handleOpenCustomerEnrollment = () => {
    setOpenEnrollModalInCustomers(true);
    setActiveView('customers');
  };

  const handleCreateOrderForCustomer = (customer: Customer) => {
    setCustomerForOrderCreation(customer);
    setOpenCreateOrderModalInOrders(true);
    setActiveView('orders');
  };

  const renderActiveView = () => {
    if (isCustomer) {
      if (activeView === 'cart') {
        return (
          <CartPage
            onNavigateToCatalog={() => setActiveView('products')}
            onNavigateToOrders={() => setActiveView('dashboard')}
          />
        );
      }
      if (activeView === 'print') {
        return (
          <PrintDocsPage
            onNavigateToCart={() => setActiveView('cart')}
            onNavigateToOrders={() => setActiveView('dashboard')}
          />
        );
      }
      if (activeView === 'products') {
        return (
          <ProductsPage
            onNavigateToOrders={() => setActiveView('dashboard')}
            onNavigateToCart={() => setActiveView('cart')}
          />
        );
      }
      if (activeView === 'account') {
        return (
          <CustomerAccountPage
            onNavigateToOrders={() => setActiveView('dashboard')}
            onNavigateToCatalog={() => setActiveView('products')}
            onNavigateToCart={() => setActiveView('cart')}
          />
        );
      }
      return (
        <CustomerDashboardPage
          selectedOrderId={selectedCustomerOrderId}
          onClearSelectedOrderId={() => setSelectedCustomerOrderId(null)}
          onNavigateToCatalog={() => setActiveView('products')}
          onNavigateToCart={() => setActiveView('cart')}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardPage
            setActiveView={setActiveView}
            onNavigateView={setActiveView}
            onOpenOrderWorkflow={handleOpenOrderWorkflow}
            onOpenCustomerEnrollment={handleOpenCustomerEnrollment}
          />
        );

      case 'orders':
        return (
          <OrdersPage
            initialSelectedOrderId={selectedOrderIdForOrdersPage}
            initialCustomerForOrder={customerForOrderCreation}
            openCreateModalInitially={openCreateOrderModalInOrders}
          />
        );

      case 'customers':
        return (
          <CustomersPage
            onOpenCreateOrderForCustomer={handleCreateOrderForCustomer}
            openEnrollModalInitially={openEnrollModalInCustomers}
          />
        );

      case 'print':
        return (
          <PrintDocsPage
            onNavigateToCart={() => setActiveView('cart')}
            onNavigateToOrders={() => setActiveView('orders')}
          />
        );

      case 'products':
        return <ProductsPage onNavigateToCart={() => setActiveView('cart')} />;

      case 'cart':
        return (
          <CartPage
            onNavigateToCatalog={() => setActiveView('products')}
            onNavigateToOrders={() => setActiveView('orders')}
          />
        );

      case 'inventory':
        return <InventoryPage />;

      case 'payments':
        return <PaymentsPage />;

      case 'reports':
        return <ReportsPage />;

      case 'users':
        return <UsersPage />;

      case 'settings':
        return <SettingsPage />;

      default:
        return (
          <DashboardPage
            setActiveView={setActiveView}
            onNavigateView={setActiveView}
            onOpenOrderWorkflow={handleOpenOrderWorkflow}
            onOpenCustomerEnrollment={handleOpenCustomerEnrollment}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#050812] bg-blueprint-grid text-slate-900 dark:text-slate-100 flex flex-col p-1.5 sm:p-4 lg:p-6 transition-colors selection:bg-blue-500 selection:text-white font-sans relative overflow-x-hidden">
      {/* Centered Floating Modern Card Workspace Shell matching reference image */}
      <div className="max-w-7xl w-full mx-auto bg-slate-50/95 dark:bg-[#0c1222]/95 backdrop-blur-xl border border-slate-300/80 dark:border-slate-800/80 rounded-2xl sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col flex-1 min-h-[92vh]">
        {/* Top Header & Tab Menu Bar Component matching reference design */}
        <TabMenuHeader
          activeView={activeView}
          setActiveView={setActiveView}
          onNavigateToCustomerOrder={handleOpenCustomerOrder}
          onOpenCreateOrder={() => {
            setCustomerForOrderCreation(null);
            setOpenCreateOrderModalInOrders(true);
            setActiveView('orders');
          }}
          onOpenEnrollment={handleOpenCustomerEnrollment}
        />

        {/* Dynamic Page Content View */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 bg-gradient-to-b from-slate-100/70 via-slate-50/60 to-indigo-50/20 dark:from-[#090f1d] dark:via-[#070c17] dark:to-[#050811] bg-studio-canvas">
          <div className="max-w-7xl mx-auto">{renderActiveView()}</div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GoogleDriveProvider>
          <GoogleSheetsProvider>
            <GmailProvider>
              <CartProvider>
                <MainLayout />
              </CartProvider>
            </GmailProvider>
          </GoogleSheetsProvider>
        </GoogleDriveProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

