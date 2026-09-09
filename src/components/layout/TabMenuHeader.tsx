import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useGoogleDrive } from '../../context/GoogleDriveContext';
import { GoogleDriveHubModal } from '../drive/GoogleDriveHubModal';
import { GoogleSheetsHubModal } from '../sheets/GoogleSheetsHubModal';
import { GmailHubModal } from '../gmail/GmailHubModal';
import { GoogleMapsModal } from '../maps/GoogleMapsModal';
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Users,
  PackageCheck,
  Boxes,
  IndianRupee,
  BarChart3,
  ShieldCheck,
  Settings,
  History,
  Plus,
  Sun,
  Moon,
  Sparkles,
  Search,
  Bell,
  CheckCircle2,
  Calendar,
  Layers,
  Cloud,
  FileSpreadsheet,
  Mail,
  MapPin,
  UserCircle,
  Tag,
  Clock,
  Package,
  X,
  ChevronRight,
  Check,
  ArrowRight,
  Printer,
  Volume2
} from 'lucide-react';
import { api } from '../../services/api';
import { playNotificationSound } from '../../services/notificationSound';

interface TabMenuHeaderProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onNavigateToCustomerOrder?: (orderId: string) => void;
  onOpenCreateOrder?: () => void;
  onOpenEnrollment?: () => void;
  onSearchChange?: (term: string) => void;
}

export const TabMenuHeader: React.FC<TabMenuHeaderProps> = ({
  activeView,
  setActiveView,
  onNavigateToCustomerOrder,
  onOpenCreateOrder,
  onOpenEnrollment,
  onSearchChange
}) => {
  const { user, logout, isCustomer } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { totalItems } = useCart();
  const { isConnected: isDriveConnected } = useGoogleDrive();
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [showMapsModal, setShowMapsModal] = useState(false);

  // State for notifications bell (Customer & Admin)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [quickNotifs, setQuickNotifs] = useState<any[]>([]);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'ORDERS' | 'STOCK' | 'OFFERS'>('ALL');
  const [activeToast, setActiveToast] = useState<any | null>(null);

  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const initialLoadedRef = useRef<boolean>(false);

  // Fetch notifications with polling and sound trigger
  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        let notifs: any[] = [];
        if (isCustomer) {
          notifs = await api.getCustomerNotifications();
        } else {
          notifs = await api.getNotifications();
        }

        if (!isMounted) return;

        setQuickNotifs(notifs);
        const unreadCount = notifs.filter(n => !n.read).length;
        setUnreadNotifCount(unreadCount);

        if (!initialLoadedRef.current) {
          // Initial load: populate known IDs without sounding
          notifs.forEach(n => knownNotifIdsRef.current.add(n.id));
          initialLoadedRef.current = true;
        } else {
          // Subsequent polling: detect new unread notification
          const newUnread = notifs.filter(n => !n.read && !knownNotifIdsRef.current.has(n.id));
          if (newUnread.length > 0) {
            // Play crystal notification sound chime!
            playNotificationSound();

            // Display top toast banner for the latest notification
            const latestNotif = newUnread[0];
            setActiveToast(latestNotif);

            // Record as known
            newUnread.forEach(n => knownNotifIdsRef.current.add(n.id));
          }
        }
      } catch (err) {
        // Silently handle polling errors
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 7000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isCustomer, activeView]);

  // Auto-dismiss active toast after 6 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const handleNotificationClick = async (n: any) => {
    try {
      if (!n.read) {
        if (isCustomer) {
          await api.markCustomerNotificationRead(n.id);
        } else {
          await api.markNotificationRead(n.id);
        }
        setQuickNotifs(prev => prev.map(item => (item.id === n.id ? { ...item, read: true } : item)));
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error(e);
    }
    setShowNotifDropdown(false);
    setActiveToast(null);

    // If notification has orderId or is related to order status, redirect to that order's details!
    if (n.orderId || n.orderNumber || n.type === 'ORDER_STATUS' || n.type === 'STATUS_CHANGE' || n.type === 'NEW_ORDER' || n.type === 'PAYMENT_VERIFIED' || n.type === 'PAYMENT_REJECTED') {
      if (isCustomer) {
        if (onNavigateToCustomerOrder) {
          onNavigateToCustomerOrder(n.orderId || '');
        } else {
          setActiveView('dashboard');
        }
      } else {
        setActiveView('orders');
      }
    } else if (n.type === 'STOCK_ALERT' || n.type === 'LOW_STOCK') {
      setActiveView(isCustomer ? 'products' : 'inventory');
    } else if (n.type === 'OFFER_ALERT') {
      setActiveView('products');
    } else {
      setActiveView(isCustomer ? 'account' : 'reports');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      if (isCustomer) {
        await api.markAllCustomerNotificationsRead();
      } else {
        await api.markAllNotificationsRead();
      }
      setQuickNotifs(prev => prev.map(item => ({ ...item, read: true })));
      setUnreadNotifCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredNotifs = quickNotifs.filter(n => {
    if (notifFilter === 'ORDERS') return n.type === 'ORDER_STATUS' || n.type === 'STATUS_CHANGE' || n.type === 'NEW_ORDER' || n.type === 'PAYMENT_VERIFIED' || n.type === 'PAYMENT_REJECTED';
    if (notifFilter === 'STOCK') return n.type === 'STOCK_ALERT' || n.type === 'LOW_STOCK';
    if (notifFilter === 'OFFERS') return n.type === 'OFFER_ALERT';
    return true;
  });

  // Navigation tabs for Super Admin
  const adminTabs = [
    { id: 'orders', label: 'ADD / ORDERS', icon: Plus, badge: 'Active' },
    { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'print', label: 'PRINT DOCS', icon: Printer, badge: '15 Min' },
    { id: 'customers', label: 'CUSTOMERS', icon: Users },
    { id: 'products', label: 'PRODUCTS', icon: PackageCheck },
    { id: 'inventory', label: 'INVENTORY', icon: Boxes },
    { id: 'payments', label: 'PAYMENTS', icon: IndianRupee },
    { id: 'reports', label: 'REPORTS', icon: BarChart3 },
    { id: 'users', label: 'USERS', icon: ShieldCheck },
    { id: 'settings', label: 'SETTINGS', icon: Settings }
  ];

  // Navigation tabs for Customer Portal (Catalog, Print, Add to Cart / Cart, My Orders, & My Account)
  const customerTabs = [
    { id: 'products', label: 'CRAFT CATALOG', icon: Sparkles },
    { id: 'print', label: 'PRINT', icon: Printer, badge: '15 Mins' },
    { id: 'cart', label: 'ADD TO CART', icon: ShoppingCart, badgeCount: totalItems },
    { id: 'dashboard', label: 'MY ORDERS', icon: ShoppingBag },
    { id: 'account', label: 'MY ACCOUNT', icon: UserCircle }
  ];

  const tabs = isCustomer ? customerTabs : adminTabs;

  // Format current date nicely like "August 2026"
  const currentMonthYear = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'A';

  return (
    <div className="w-full bg-[#101726] dark:bg-[#0c1220] border-b border-slate-700/60 dark:border-slate-800/80 rounded-t-2xl sm:rounded-t-[28px] text-white shadow-lg overflow-hidden transition-colors">
      {/* Top Header Row */}
      <div className="px-3.5 sm:px-6 pt-3.5 sm:pt-5 pb-2.5 sm:pb-3 flex items-center justify-between gap-2.5 sm:gap-3">
        {/* Brand and System Status (CC Logo removed as requested) */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex flex-col">
              <h1 className="font-cursive font-bold text-2xl sm:text-3xl tracking-wide text-white leading-none drop-shadow-sm select-none">
                Cards Crafted
              </h1>
              <span className="font-cursive font-bold text-sm sm:text-base text-pink-300 tracking-wider leading-tight -mt-0.5 select-none">
                by Shivani
              </span>
            </div>
            {!isCustomer && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400 shrink-0" />
                <span className="text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 truncate">
                  SYSTEM ONLINE • SYNC ACTIVE
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Top Actions: Notification Bell + Cart Trigger + Theme Toggle + Profile Logout Pill */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Universal Notification Bell (Customer & Admin) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
              }}
              className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 transition-colors cursor-pointer"
              title="Notifications & Alerts"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center animate-bounce shadow-md">
                  {unreadNotifCount}
                </span>
              )}
            </button>
          </div>

          {/* Customer Top Cart Trigger */}
          {isCustomer && (
            <button
              onClick={() => setActiveView('cart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                activeView === 'cart'
                  ? 'bg-pink-600 text-white border-pink-500 shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60 text-slate-200 hover:text-white'
              }`}
              title="View Cart & Proceed to Checkout"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span className="px-1.5 py-0.2 bg-pink-500 text-white font-black text-[10px] rounded-full">
                  {totalItems}
                </span>
              )}
            </button>
          )}

          {/* Quick Action Trigger Buttons for Admin */}
          {!isCustomer && onOpenCreateOrder && (
            <button
              onClick={onOpenCreateOrder}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-xl transition-all hover:scale-102 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Quick Order</span>
            </button>
          )}

          {/* Google Workspace Quick Hubs: Drive, Sheets, Gmail, Maps (Only visible in Admin / Staff views) */}
          {!isCustomer && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/60">
              {/* Drive */}
              <button
                onClick={() => setShowDriveModal(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  isDriveConnected
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Google Drive Cloud Storage"
              >
                <Cloud className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">Drive</span>
              </button>

              {/* Sheets */}
              <button
                onClick={() => setShowSheetsModal(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  isDriveConnected
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Google Sheets Sync & Export"
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">Sheets</span>
              </button>

              {/* Gmail */}
              <button
                onClick={() => setShowGmailModal(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  isDriveConnected
                    ? 'bg-red-600/30 text-red-300 border border-red-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Gmail Customer Communications"
              >
                <Mail className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-red-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">Gmail</span>
              </button>

              {/* Maps */}
              <button
                onClick={() => setShowMapsModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer"
                title="Google Maps Delivery & Studio Hub"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Maps</span>
              </button>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-300" />
            )}
          </button>

          {/* User Initial & LOGOUT Pill Button */}
          <div className="flex items-center bg-slate-800/80 dark:bg-slate-800/90 border border-slate-700/60 rounded-full p-1 pl-1.5 pr-2.5 sm:pr-3 gap-1.5 sm:gap-2 shadow-xs">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-pink-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              {userInitial}
            </div>
            <button
              onClick={logout}
              className="text-[10px] sm:text-xs font-black tracking-wider text-slate-200 hover:text-rose-400 transition-colors uppercase cursor-pointer flex items-center gap-1"
            >
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date & Greeting Bar */}
      <div className="px-3 sm:px-6 py-2">
        <div className="w-full bg-[#161f33] dark:bg-[#11192a] border border-slate-700/50 dark:border-slate-800 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 shadow-inner text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide">{currentMonthYear}</span>
            {!isCustomer && (
              <>
                <span className="text-slate-500 text-xs hidden sm:inline">•</span>
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  Studio Operations, Inventory Management & Invoicing
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <span>Hi , <strong className="font-extrabold text-blue-300">{user?.name}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Tab Menu Bar */}
      <div className="px-1.5 sm:px-4 border-t border-slate-800/80 bg-[#0e1424] dark:bg-[#0a0f1d]">
        <nav className="flex items-stretch overflow-x-auto no-scrollbar space-x-1 sm:space-x-2 py-1 scroll-smooth touch-pan-x">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            const hasBadge = 'badgeCount' in tab && typeof tab.badgeCount === 'number' && tab.badgeCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`shrink-0 sm:flex-1 min-w-[76px] sm:min-w-[95px] flex flex-col items-center justify-center py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer relative group touch-manipulation ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-black border-b-3 border-blue-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-bold border-b-3 border-transparent'
                }`}
              >
                <div className="mb-1 transition-transform group-hover:scale-110 relative">
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {hasBadge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs animate-bounce">
                      {tab.badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[11px] tracking-wider uppercase text-center truncate max-w-full font-bold flex items-center gap-1">
                  <span>{tab.label}</span>
                </span>

                {/* Subtle active glow indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-blue-400 shadow-sm shadow-blue-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Google Drive Workspace Hub Modal */}
      <GoogleDriveHubModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
      />

      {/* Google Sheets Sync & Export Modal */}
      <GoogleSheetsHubModal
        isOpen={showSheetsModal}
        onClose={() => setShowSheetsModal(false)}
      />

      {/* Gmail Communications Modal */}
      <GmailHubModal
        isOpen={showGmailModal}
        onClose={() => setShowGmailModal(false)}
      />

      {/* Google Maps Delivery & Studio Hub Modal */}
      <GoogleMapsModal
        isOpen={showMapsModal}
        onClose={() => setShowMapsModal(false)}
      />

      {/* Real-time Floating Notification Banner with Audio chime feedback */}
      {activeToast && (
        <div className="fixed top-4 sm:top-5 right-3 sm:right-6 z-[120] max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-900/98 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl text-white flex items-start gap-3 ring-2 ring-amber-500/20">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0" onClick={() => handleNotificationClick(activeToast)}>
              <div className="flex items-center gap-1.5 cursor-pointer">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">New Notification</span>
                <span className="text-[10px] text-slate-400 font-mono">• Just now</span>
              </div>
              <h4 className="text-xs font-bold text-white mt-0.5 truncate cursor-pointer hover:text-pink-300">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 cursor-pointer leading-relaxed">
                {activeToast.message}
              </p>
              <button
                type="button"
                onClick={() => handleNotificationClick(activeToast)}
                className="mt-2 text-[10px] font-black text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View Alert</span>
                <ArrowRight className="w-3 h-3 text-pink-400" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notification Dropdown Modal with High Visibility & Fixed Coordinates */}
      {showNotifDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[95] bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setShowNotifDropdown(false)}
          />

          {/* Dropdown Card */}
          <div className="fixed top-16 sm:top-20 right-3 sm:right-6 md:right-8 z-[100] w-[94vw] sm:w-[420px] max-w-[440px] bg-[#0f172a] border border-slate-700/90 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Notifications
                    </span>
                    {unreadNotifCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold rounded-md">
                        {unreadNotifCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Live order tracking & craft updates</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadNotifCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
                    title="Mark all notifications as read"
                  >
                    <Check className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setShowNotifDropdown(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {(['ALL', 'ORDERS', 'STOCK', 'OFFERS'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setNotifFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    notifFilter === f
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  {f === 'ALL' ? 'All Alerts' : f === 'ORDERS' ? '📦 Orders' : f === 'STOCK' ? '🌸 Stock' : '🎁 Offers'}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredNotifs.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-400">No notifications in this filter</p>
                </div>
              ) : (
                filteredNotifs.map(n => {
                  const isOrder = n.type === 'ORDER_STATUS' || n.type === 'STATUS_CHANGE' || n.type === 'NEW_ORDER' || n.type === 'PAYMENT_VERIFIED' || n.type === 'PAYMENT_REJECTED' || n.orderId;
                  const isStock = n.type === 'STOCK_ALERT' || n.type === 'LOW_STOCK';
                  const isOffer = n.type === 'OFFER_ALERT';

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.01] ${
                        n.read
                          ? 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                          : 'bg-slate-800/90 border-amber-500/40 text-white shadow-sm ring-1 ring-amber-500/20 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Type Icon */}
                        <div
                          className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
                            isOrder
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : isStock
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          }`}
                        >
                          {isOrder ? (
                            <ShoppingBag className="w-3.5 h-3.5" />
                          ) : isStock ? (
                            <Package className="w-3.5 h-3.5" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-white text-xs truncate">
                              {n.title}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 shrink-0">
                              {new Date(n.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>

                          {/* Call to action chip */}
                          <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-700/40">
                            <span className="text-[10px] font-bold text-pink-400 flex items-center gap-1 group-hover:text-pink-300">
                              {isOrder ? (
                                <>
                                  <span>View Order Details</span>
                                  <ArrowRight className="w-3 h-3 text-pink-400" />
                                </>
                              ) : isStock ? (
                                <>
                                  <span>Shop Product Catalog</span>
                                  <ArrowRight className="w-3 h-3 text-pink-400" />
                                </>
                              ) : (
                                <>
                                  <span>Explore Special Offers</span>
                                  <ArrowRight className="w-3 h-3 text-pink-400" />
                                </>
                              )}
                            </span>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setShowNotifDropdown(false);
                  setActiveView('dashboard');
                }}
                className="text-[11px] font-bold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                <span>{isCustomer ? 'My Orders' : 'Dashboard'}</span>
              </button>
              <button
                onClick={() => {
                  setShowNotifDropdown(false);
                  setActiveView(isCustomer ? 'account' : 'reports');
                }}
                className="text-[11px] font-bold text-pink-400 hover:text-pink-300 px-2.5 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 transition-colors cursor-pointer flex items-center gap-1"
              >
                <UserCircle className="w-3.5 h-3.5" />
                <span>All Alerts & History</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
