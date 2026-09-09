import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../common/Badge';
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  PlusCircle,
  UserPlus,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { api } from '../../services/api';
import { Notification } from '../../types';

interface NavbarProps {
  onOpenNewOrder?: () => void;
  onOpenNewCustomer?: () => void;
  onSearchChange?: (term: string) => void;
  onSelectOrderSearch?: (orderId: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewOrder,
  onOpenNewCustomer,
  onSearchChange,
  activeView,
  setActiveView,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { user, logout, isCustomer } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadNotifs() {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      } catch (err) {
        // silent catch
      }
    }
    loadNotifs();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      // ignore
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard';
      case 'orders': return 'Orders & Crafts';
      case 'customers': return 'Customer Directory';
      case 'products': return 'Product Catalog';
      case 'inventory': return 'Inventory & Materials';
      case 'payments': return 'Payments & Receipts';
      case 'reports': return 'Analytics & Reports';
      case 'users': return 'Users & Access';
      case 'settings': return 'Settings';
      default: return 'Cards Crafted';
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-3 sm:px-6 py-3 shadow-2xs transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* Left Side: Hamburger (Mobile) + Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {setIsMobileOpen && (
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
              {getViewTitle()}
            </h1>
            <p className="font-cursive font-bold text-xs text-pink-600 dark:text-pink-400 hidden sm:block">Cards Crafted by Shivani</p>
          </div>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-xs xl:max-w-sm mx-2 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search orders, customers, inventory..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-full text-xs focus:ring-2 focus:ring-purple-500/30 text-slate-800 dark:text-slate-100 transition-all focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400"
          />
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        </div>

        {/* Action Controls & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
            )}
          </button>

          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {!isCustomer && (
            <>
              {onOpenNewCustomer && (
                <button
                  onClick={onOpenNewCustomer}
                  title="Add Customer"
                  className="p-2 sm:px-3.5 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="hidden sm:inline">+ Customer</span>
                </button>
              )}
              {onOpenNewOrder && (
                <button
                  onClick={onOpenNewOrder}
                  title="Create Order"
                  className="p-2 sm:px-4 sm:py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold transition-colors shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">+ Order</span>
                </button>
              )}
            </>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 px-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">Notifications</h4>
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">No notifications yet</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                          n.read
                            ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                            : 'bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/50 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <p className="font-bold text-slate-900 dark:text-white mb-0.5">{n.title}</p>
                        <p className="text-[11px] leading-snug">{n.message}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 sm:w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setActiveView(isCustomer ? 'customer-portal' : 'dashboard');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  My Dashboard
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-2 mt-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Row */}
      {showMobileSearch && (
        <div className="lg:hidden pt-2.5 pb-1 animate-in fade-in slide-in-from-top-1">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search orders, customers..."
              className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:bg-white dark:focus:bg-slate-800"
              autoFocus
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <button
              onClick={() => setShowMobileSearch(false)}
              className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
