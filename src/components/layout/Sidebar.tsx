import React from 'react';
import { useAuth } from '../../context/AuthContext';
import cardsCraftedLogo from '../../assets/images/cards_crafted_logo_1786446210358.jpg';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  PackageCheck,
  Boxes,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Settings,
  History,
  Sparkles,
  X
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const { user, isCustomer, isStaff, isAdmin, isSuperAdmin } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'orders', label: 'Orders & Crafts', icon: ShoppingBag, show: true },
    { id: 'customers', label: 'Customers', icon: Users, show: isStaff },
    { id: 'products', label: 'Product Catalog', icon: PackageCheck, show: isStaff },
    { id: 'inventory', label: 'Inventory & Materials', icon: Boxes, show: isStaff },
    { id: 'payments', label: 'Payments & Receipts', icon: CreditCard, show: isStaff },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3, show: isAdmin },
    { id: 'users', label: 'User Roles & Access', icon: ShieldCheck, show: isAdmin },
    { id: 'settings', label: 'Business Settings', icon: Settings, show: isAdmin }
  ];

  const handleNavClick = (id: string) => {
    setActiveView(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 transition-colors">
      {/* Brand Header */}
      <div className="p-4 flex flex-col items-center justify-center border-b border-slate-200/80 dark:border-slate-800 mb-2 relative">
        <div className="w-full flex items-center justify-center py-1">
          <img
            src={cardsCraftedLogo}
            alt="Cards Crafted Logo"
            className="w-16 h-16 object-contain rounded-full shadow-sm hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-center mt-1">
          <h2 className="font-cursive font-bold text-2xl text-slate-900 dark:text-white leading-none">
            Cards Crafted
          </h2>
          <p className="font-cursive font-bold text-xs text-pink-600 dark:text-pink-400 leading-tight">
            by Shivani
          </p>
        </div>
        {setIsMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden absolute right-3 top-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Close Mobile Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
          {isCustomer ? 'Customer Portal' : 'Workspace Navigation'}
        </div>

        {isCustomer ? (
          <button
            onClick={() => handleNavClick('customer-portal')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
              activeView === 'customer-portal'
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-l-2 border-purple-600 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            My Craft Orders
          </button>
        ) : (
          menuItems
            .filter(item => item.show)
            .map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-l-2 border-purple-600 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })
        )}
      </nav>

      {/* User Profile Footer */}
      {user && (
        <div className="p-4 mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider truncate">
                {user.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:flex md:w-64 shrink-0 h-full border-r border-slate-200/80 dark:border-slate-800 z-20">
        {navContent}
      </aside>

      {/* Mobile Drawer (Slide-Over & Overlay) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative flex-1 max-w-xs w-full bg-white dark:bg-slate-900 shadow-xl z-10 flex flex-col h-full animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
