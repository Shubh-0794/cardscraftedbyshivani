import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import {
  Customer,
  Order,
  CustomerAddress,
  WishlistItem,
  Notification as CustNotification
} from '../types';
import {
  UserCircle,
  Package,
  Heart,
  Bell,
  MapPin,
  Share2,
  Edit3,
  Trash2,
  Plus,
  Check,
  Copy,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  ShoppingBag,
  Gift,
  CheckCircle2,
  X,
  MessageCircle,
  Tag,
  ChevronRight,
  RefreshCw,
  CreditCard,
  HelpCircle,
  ArrowLeft,
  RotateCcw,
  Receipt,
  PiggyBank,
  CheckSquare,
  LogOut,
  Github,
  Link2,
  Unlink,
  ExternalLink
} from 'lucide-react';

interface CustomerAccountPageProps {
  onNavigateToOrders: () => void;
  onNavigateToCatalog: () => void;
  onNavigateToCart: () => void;
}

export const CustomerAccountPage: React.FC<CustomerAccountPageProps> = ({
  onNavigateToOrders,
  onNavigateToCatalog,
  onNavigateToCart
}) => {
  const { user, logout, connectWithGithub, disconnectGithub } = useAuth();
  const { addToCart } = useCart();

  // Sub-view overlay state (null = main list view, or 'saved_items' | 'notifications' | 'address_book' | 'referral' | 'profile_edit' | 'quick_reorder' | 'payments' | 'faqs' | 'connected_accounts')
  const [subView, setSubView] = useState<
    null | 'saved_items' | 'notifications' | 'address_book' | 'referral' | 'profile' | 'quick_reorder' | 'payments' | 'faqs' | 'connected_accounts'
  >(null);

  // GitHub account linking state
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isDisconnectingGithub, setIsDisconnectingGithub] = useState(false);
  const [githubMsg, setGithubMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [notifications, setNotifications] = useState<CustNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile Form
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    whatsapp: user?.whatsapp || '',
    alternatePhone: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001'
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Delete Account Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Address Modals
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    recipientName: user?.name || '',
    phone: user?.whatsapp || '',
    street: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    isPrimary: false
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Referral Copy feedback
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Notifications filter inside notifications subview
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'STOCK_ALERT' | 'ORDER_STATUS' | 'OFFER_ALERT'>('ALL');

  // Load account data
  const loadAccountData = async () => {
    try {
      setLoading(true);
      const [profileRes, ordersRes, addrsRes, wishRes, notifRes] = await Promise.all([
        api.getCustomerProfile().catch(() => ({ user: user!, customer: null })),
        api.getOrders().catch(() => []),
        api.getCustomerAddresses().catch(() => []),
        api.getCustomerWishlist().catch(() => []),
        api.getCustomerNotifications().catch(() => [])
      ]);

      if (profileRes.customer) {
        setCustomerProfile(profileRes.customer);
        setProfileForm({
          name: profileRes.customer.name || user?.name || '',
          email: profileRes.customer.email || user?.email || '',
          whatsapp: profileRes.customer.whatsapp || user?.whatsapp || '',
          alternatePhone: profileRes.customer.alternatePhone || '',
          address: profileRes.customer.address || '',
          city: profileRes.customer.city || 'Mumbai',
          state: profileRes.customer.state || 'Maharashtra',
          pincode: profileRes.customer.pincode || '400001'
        });
      } else if (user) {
        setProfileForm({
          name: user.name,
          email: user.email,
          whatsapp: user.whatsapp || '',
          alternatePhone: '',
          address: '',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001'
        });
      }

      setOrders(ordersRes);
      setAddresses(addrsRes);
      setWishlist(wishRes);
      setNotifications(notifRes);
    } catch (err) {
      console.error('Error loading customer account data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, []);

  // Filter Active Orders
  const activeOrders = orders.filter(
    o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  );
  const primaryActiveOrder = activeOrders[0] || null;

  // Calculate user initials
  const initials = (user?.name || 'Customer')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SP';

  // Total savings calculation (approximate craft loyalty)
  const totalCraftSavings = 5229;

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await api.updateCustomerProfile(profileForm);
      setCustomerProfile(res.customer);
      setProfileSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      alert('Please type "DELETE" exactly to confirm.');
      return;
    }
    setIsDeletingAccount(true);
    try {
      await api.deleteCustomerAccount();
      alert('Your account has been deleted.');
      logout();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  // Address Handlers
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: 'Home',
      recipientName: customerProfile?.name || user?.name || '',
      phone: customerProfile?.whatsapp || user?.whatsapp || '',
      street: '',
      city: customerProfile?.city || 'Mumbai',
      state: customerProfile?.state || 'Maharashtra',
      pincode: customerProfile?.pincode || '400001',
      isPrimary: addresses.length === 0
    });
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label,
      recipientName: addr.recipientName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isPrimary: addr.isPrimary
    });
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      if (editingAddressId) {
        await api.updateCustomerAddress(editingAddressId, addressForm);
      } else {
        await api.addCustomerAddress(addressForm);
      }
      const updated = await api.getCustomerAddresses();
      setAddresses(updated);
      setIsAddressModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to remove this address?')) return;
    try {
      await api.deleteCustomerAddress(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete address');
    }
  };

  const handleSetPrimaryAddress = async (id: string) => {
    try {
      await api.setPrimaryCustomerAddress(id);
      setAddresses(prev =>
        prev.map(a => ({
          ...a,
          isPrimary: a.id === id
        }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to set primary address');
    }
  };

  // Wishlist Handlers
  const handleRemoveFromWishlist = async (id: string) => {
    try {
      await api.removeFromCustomerWishlist(id);
      setWishlist(prev => prev.filter(w => w.id !== id));
    } catch (err: any) {
      alert('Failed to remove item');
    }
  };

  const handleMoveToCart = (item: WishlistItem) => {
    addToCart(
      {
        id: item.productId,
        name: item.name,
        category: item.category as any,
        price: item.price,
        sellingPrice: item.price,
        stockQuantity: item.stockQuantity || 5,
        status: 'ACTIVE',
        sku: item.productId,
        description: 'Handcrafted with love by Shivani',
        createdAt: item.savedAt
      },
      1
    );
    handleRemoveFromWishlist(item.id);
  };

  // Notification Handlers
  const handleMarkNotifRead = async (id: string) => {
    try {
      await api.markCustomerNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {}
  };

  const handleDeleteNotif = async (id: string) => {
    try {
      await api.deleteCustomerNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {}
  };

  // Referral Info
  const referralCode = `${(user?.name || 'SHUBHAM').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 6) || 'CRAFT'}-2026`;
  const referralUrl = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey! Check out Cards Crafted by Shivani for custom handmade cards & explosion boxes! Use my referral code ${referralCode} to get ₹100 OFF: ${referralUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto pb-16 px-3 sm:px-4 space-y-5 animate-in fade-in duration-200">
      {/* If inside a Subview, display top back button header */}
      {subView !== null ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm">
            <button
              onClick={() => setSubView(null)}
              className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-pink-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Account</span>
            </button>

            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {subView === 'saved_items' && 'Saved Items'}
              {subView === 'notifications' && 'Notifications'}
              {subView === 'address_book' && 'Address Book'}
              {subView === 'referral' && 'Refer a Friend'}
              {subView === 'profile' && 'My Profile'}
              {subView === 'quick_reorder' && 'Quick Reorder'}
              {subView === 'payments' && 'Payment Methods'}
              {subView === 'faqs' && 'Help & FAQs'}
            </span>
          </div>

          {/* SubView: Saved Items / Wishlist */}
          {subView === 'saved_items' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    My Saved Items ({wishlist.length})
                  </h3>
                </div>
                <button
                  onClick={onNavigateToCatalog}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
                >
                  + Add More
                </button>
              </div>

              {wishlist.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Heart className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-500">Your wishlist is currently empty.</p>
                  <button
                    onClick={onNavigateToCatalog}
                    className="px-4 py-2 bg-pink-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Browse Craft Catalog
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {wishlist.map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-pink-600 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-md">
                          {item.category || 'Handmade'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{item.name}</h4>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                          ₹{(item.price || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMoveToCart(item)}
                          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFromWishlist(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubView: Notifications */}
          {subView === 'notifications' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    My Notifications ({notifications.length})
                  </h3>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setNotifFilter('ALL')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      notifFilter === 'ALL'
                        ? 'bg-pink-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setNotifFilter('STOCK_ALERT')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      notifFilter === 'STOCK_ALERT'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Stock
                  </button>
                  <button
                    onClick={() => setNotifFilter('ORDER_STATUS')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      notifFilter === 'ORDER_STATUS'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Orders
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-500">No notifications at the moment.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications
                    .filter(n => notifFilter === 'ALL' || n.type === notifFilter || (notifFilter === 'ORDER_STATUS' && (n.type === 'ORDER_STATUS' || n.type === 'STATUS_CHANGE')))
                    .map(notif => (
                      <div
                        key={notif.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                          notif.read
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            : 'bg-amber-50/40 dark:bg-slate-800 border-amber-300 dark:border-amber-500/40 text-slate-900 dark:text-white shadow-xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{notif.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkNotifRead(notif.id)}
                              className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Read
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotif(notif.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* SubView: Address Book */}
          {subView === 'address_book' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    My Address Book ({addresses.length})
                  </h3>
                </div>
                <button
                  onClick={handleOpenAddAddress}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Address</span>
                </button>
              </div>

              <div className="space-y-3">
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      addr.isPrimary
                        ? 'bg-emerald-50/40 dark:bg-slate-800/80 border-emerald-500/50 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {addr.label || 'Home'}
                        </span>
                        {addr.isPrimary && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Primary Address
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditAddress(addr)}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{addr.recipientName}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{addr.street}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                        +{addr.phone}
                      </p>
                    </div>

                    {!addr.isPrimary && (
                      <button
                        onClick={() => handleSetPrimaryAddress(addr.id)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Set as Primary
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SubView: Refer a Friend */}
          {subView === 'referral' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <Gift className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Refer a Friend & Earn ₹100</h3>
                  <p className="text-xs text-slate-500">Give ₹100 off on first craft order, get ₹100 wallet credit!</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Your Unique Referral Code
                </span>
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2">
                  <span className="font-mono font-black text-sm text-pink-600 dark:text-pink-400">{referralCode}</span>
                  <button
                    onClick={handleCopyReferral}
                    className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-pink-600 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedReferral ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReferral ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* SubView: Quick Reorder */}
          {subView === 'quick_reorder' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <RotateCcw className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Reorder Past Crafts</h3>
              </div>
              {orders.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No previous orders to reorder yet.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map(o => (
                    <div
                      key={o.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-slate-500">{o.orderNumber}</span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {o.items.map(i => i.productName).join(', ')}
                        </h4>
                        <span className="text-xs font-black text-pink-600">₹{(o.grandTotal || 0).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={onNavigateToOrders}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Reorder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubView: Payments & UPI */}
          {subView === 'payments' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Saved Payment Methods</h3>
              </div>
              <div className="space-y-2.5">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-xs flex items-center justify-center">
                      UPI
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Instant UPI & QR Code</h4>
                      <p className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm supported</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    Enabled
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold text-xs flex items-center justify-center">
                      COD
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Cash on Delivery / Studio Pickup</h4>
                      <p className="text-[11px] text-slate-500">Pay upon craft handover</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                    Enabled
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SubView: FAQs & Help */}
          {subView === 'faqs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <HelpCircle className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Help & FAQs</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white">How do custom craft orders work?</h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Once you place an order, Shivani contacts you on WhatsApp to discuss theme, photos, messages, and customization.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white">What is the standard delivery timeline?</h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Handmade greeting cards take 2-4 business days, while multi-layer explosion boxes take 4-7 business days.
                  </p>
                </div>
                <button
                  onClick={() => window.open(`https://wa.me/919820112345?text=${encodeURIComponent('Hi Shivani, I need help with my craft order.')}`, '_blank')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat with Shivani on WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* SubView: Connected Accounts & GitHub */}
          {subView === 'connected_accounts' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Github className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Connected Accounts & OAuth</h3>
                  <p className="text-xs text-slate-500">Manage social accounts linked for fast sign-in</p>
                </div>
              </div>

              {githubMsg && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    githubMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {githubMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{githubMsg.text}</span>
                </div>
              )}

              {/* GitHub Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-700 flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden">
                      {user?.githubAvatarUrl ? (
                        <img
                          src={user.githubAvatarUrl}
                          alt="GitHub Avatar"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Github className="w-6 h-6 text-white" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">GitHub Account</h4>
                        {user?.githubId ? (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Connected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-bold">
                            Not Linked
                          </span>
                        )}
                      </div>

                      {user?.githubUsername ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">
                          @{user.githubUsername}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Link your GitHub profile for 1-click passwordless sign-in
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {user?.githubId ? (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      Linked ID: <code className="font-mono text-slate-700 dark:text-slate-300">{user.githubId}</code>
                    </span>
                    <button
                      type="button"
                      disabled={isDisconnectingGithub}
                      onClick={async () => {
                        if (!confirm('Are you sure you want to disconnect your GitHub account?')) return;
                        setIsDisconnectingGithub(true);
                        setGithubMsg(null);
                        try {
                          await disconnectGithub();
                          await loadAccountData();
                          setGithubMsg({ type: 'success', text: 'GitHub account disconnected successfully.' });
                        } catch (err: any) {
                          setGithubMsg({ type: 'error', text: err.message || 'Failed to disconnect GitHub.' });
                        } finally {
                          setIsDisconnectingGithub(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isDisconnectingGithub ? (
                        <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Unlink className="w-3.5 h-3.5" />
                      )}
                      <span>Disconnect GitHub</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-500">
                      Sign in directly without passwords using your GitHub identity.
                    </p>
                    <button
                      type="button"
                      disabled={isConnectingGithub}
                      onClick={async () => {
                        setIsConnectingGithub(true);
                        setGithubMsg(null);
                        try {
                          const result = await connectWithGithub('link');
                          if (result.success) {
                            await loadAccountData();
                            setGithubMsg({ type: 'success', text: 'GitHub account successfully linked!' });
                          } else if (result.error) {
                            setGithubMsg({ type: 'error', text: result.error });
                          }
                        } catch (err: any) {
                          setGithubMsg({ type: 'error', text: err.message || 'Failed to connect GitHub account.' });
                        } finally {
                          setIsConnectingGithub(false);
                        }
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isConnectingGithub ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Connect GitHub Account</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Developer / Configuration Notes */}
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <h5 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  GitHub OAuth App Configuration
                </h5>
                <p className="text-[11px] leading-relaxed">
                  To use your own GitHub OAuth application, register an OAuth App in GitHub Developer Settings with:
                </p>
                <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1 text-slate-800 dark:text-slate-200">
                  <div><strong>Homepage URL:</strong> {window.location.origin}</div>
                  <div><strong>Authorization callback URL:</strong> {window.location.origin}/auth/github/callback</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN NON-TABBED DMART-STYLE VIEW */
        <div className="space-y-5">
          {/* 1. TOP PROFILE CARD (Clean Reference Match) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {/* Circle Avatar (e.g. SP) */}
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shrink-0">
                  {initials}
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {user?.name || 'Shubham Padole'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    +91 | {user?.whatsapp || '8793532922'}
                  </p>
                </div>
              </div>

              {/* Edit Icon in Top Right */}
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                title="Edit Profile"
                aria-label="Edit Profile"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. ACTIVE ORDER SECTION (Exact Reference Match) */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 px-1">
              Active Order
            </h3>

            {primaryActiveOrder ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {primaryActiveOrder.status === 'PENDING'
                        ? 'Order Confirmed'
                        : primaryActiveOrder.status === 'IN_PRODUCTION'
                        ? 'In Craft Production'
                        : primaryActiveOrder.status.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Your shipment {primaryActiveOrder.orderNumber} confirmed. Shivani is preparing your handmade design!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => window.open(`https://wa.me/919820112345?text=${encodeURIComponent(`Hi Shivani, I need help with order ${primaryActiveOrder.orderNumber}`)}`, '_blank')}
                    className="py-2.5 border border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    HELP
                  </button>
                  <button
                    onClick={onNavigateToOrders}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    VIEW DETAILS
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-400" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Active Order Right Now</h4>
                    <p className="text-[11px] text-slate-500">Explore handcrafted cards to place an order</p>
                  </div>
                </div>
                <button
                  onClick={onNavigateToCatalog}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Shop Now
                </button>
              </div>
            )}
          </div>

          {/* 3. "YOUR INFORMATION" SECTION (Clean Non-Tab Vertical Rows with Icons & Chevron) */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 px-1">
              Your Information
            </h3>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {/* My Orders */}
              <button
                onClick={onNavigateToOrders}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <Package className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    My Orders
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Quick Reorder */}
              <button
                onClick={() => setSubView('quick_reorder')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <RotateCcw className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Quick Reorder
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* My Saved Items */}
              <button
                onClick={() => setSubView('saved_items')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <Heart className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    My Saved Items
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {wishlist.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-pink-100 dark:bg-pink-950/60 text-pink-600 rounded-full">
                      {wishlist.length}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Back in Stock Alerts */}
              <button
                onClick={() => setSubView('notifications')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <CheckSquare className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Back in Stock Alerts
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* My Notifications */}
              <button
                onClick={() => setSubView('notifications')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    My Notifications
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-full">
                      {unreadNotifCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* My Profile */}
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <UserCircle className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    My Profile
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Connected Accounts & GitHub */}
              <button
                onClick={() => setSubView('connected_accounts')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <Github className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-pink-600 transition-colors" />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                      Connected GitHub Account
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {user?.githubUsername ? `@${user.githubUsername} linked` : 'Link for 1-click login'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user?.githubId && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Linked
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>

          {/* 4. "ADDRESS & PAYMENT" SECTION (Exact Match) */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 px-1">
              Address & Payment
            </h3>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {/* My Address Book */}
              <button
                onClick={() => setSubView('address_book')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <MapPin className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    My Address Book
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Saved Payment Method(s) */}
              <button
                onClick={() => setSubView('payments')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <CreditCard className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Saved Payment Method(s)
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 5. "HELP & SUPPORT" / EXTRA (Exact Match) */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 px-1">
              Help & Support
            </h3>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {/* Refer a Friend */}
              <button
                onClick={() => setSubView('referral')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <Gift className="w-5 h-5 text-amber-500" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Refer a Friend & Earn ₹100
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Help & Contact */}
              <button
                onClick={() => window.open(`https://wa.me/919820112345?text=${encodeURIComponent('Hi Shivani, I have a question about Cards Crafted.')}`, '_blank')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <MessageCircle className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Help & Contact Shivani (WhatsApp)
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* FAQs */}
              <button
                onClick={() => setSubView('faqs')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <HelpCircle className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    FAQs & Craft Care Guide
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Sign out */}
              <button
                onClick={logout}
                className="w-full p-4 flex items-center justify-between hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <LogOut className="w-5 h-5 text-rose-500" />
                  <span className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400">
                    Sign out
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-pink-500" />
                Edit Profile & Contact Info
              </h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name || ''}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.whatsapp || ''}
                    onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                    placeholder="918793532922"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="text"
                    value={profileForm.alternatePhone || ''}
                    onChange={e => setProfileForm({ ...profileForm, alternatePhone: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email || ''}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={profileForm.address || ''}
                  onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="Flat/House, Street"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">City</label>
                  <input
                    type="text"
                    value={profileForm.city || ''}
                    onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">State</label>
                  <input
                    type="text"
                    value={profileForm.state || ''}
                    onChange={e => setProfileForm({ ...profileForm, state: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={profileForm.pincode || ''}
                    onChange={e => setProfileForm({ ...profileForm, pincode: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Danger Zone: Delete My Account in Profile */}
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">Account Closure</h4>
                  <p className="text-[11px] text-slate-500">Permanently delete your profile and data</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditProfileOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
                >
                  Delete My Account
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADDRESS MODAL */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                {editingAddressId ? 'Edit Address' : 'Add New Address'}
              </h3>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Label *
                  </label>
                  <select
                    value={addressForm.label || 'Home'}
                    onChange={e => setAddressForm({ ...addressForm, label: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Home">Home</option>
                    <option value="Studio">Studio</option>
                    <option value="Work">Work / Office</option>
                    <option value="Gift Delivery">Gift Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.recipientName || ''}
                    onChange={e => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Recipient Contact Phone *
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.phone || ''}
                  onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                  placeholder="918793532922"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Street Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={addressForm.street || ''}
                  onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                  placeholder="House/Building, Street"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city || ''}
                    onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.state || ''}
                    onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.pincode || ''}
                    onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.isPrimary}
                    onChange={e => setAddressForm({ ...addressForm, isPrimary: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                    Set as Primary Shipping Address
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {isSavingAddress ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800/80 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Customer Account?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                This action is permanent. It will delete your account login, stored addresses, and wishlist. Type <strong className="text-rose-600 dark:text-rose-400">DELETE</strong> to confirm.
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmationText}
              onChange={e => setDeleteConfirmationText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-800/80 rounded-xl text-xs text-center font-bold text-rose-600 dark:text-rose-300 focus:outline-hidden"
            />

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText !== 'DELETE' || isDeletingAccount}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
              >
                {isDeletingAccount ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
