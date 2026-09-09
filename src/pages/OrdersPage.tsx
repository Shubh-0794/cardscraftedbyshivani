import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Order, Customer, Product, OrderStatus, PaymentMethod, SystemSettings } from '../types';
import {
  isPrintOrder,
  PRINT_ORDER_STATUS_FLOW,
  CRAFT_ORDER_STATUS_FLOW,
  PRINT_ORDER_STEPS,
  CRAFT_ORDER_STEPS,
  getOrderStepIndex,
  formatOrderStatus
} from '../utils/orderStatusUtils';
import { Badge } from '../components/common/Badge';
import { WhatsAppBtn } from '../components/common/WhatsAppBtn';
import { InvoiceModal } from '../components/common/InvoiceModal';
import { BillQRCodeModal } from '../components/common/BillQRCodeModal';
import { Modal } from '../components/common/Modal';
import { exportOrdersToExcel } from '../utils/excelExport';
import { generateOrderSummaryPdf } from '../utils/pdfInvoiceGenerator';
import { useGoogleSheets } from '../context/GoogleSheetsContext';
import { GoogleSheetsHubModal } from '../components/sheets/GoogleSheetsHubModal';
import { GmailHubModal } from '../components/gmail/GmailHubModal';
import { GoogleMapsModal } from '../components/maps/GoogleMapsModal';
import { AdminPaymentVerificationModal } from '../components/common/AdminPaymentVerificationModal';
import {
  ShoppingBag,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Printer,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Clock,
  Sparkles,
  ArrowRight,
  UserPlus,
  QrCode,
  FileSpreadsheet,
  Mail,
  MapPin,
  Send,
  Truck,
  Store,
  Building2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Copy,
  Check
} from 'lucide-react';

interface OrdersPageProps {
  initialSelectedOrderId?: string | null;
  initialCustomerForOrder?: Customer | null;
  openCreateModalInitially?: boolean;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  initialSelectedOrderId = null,
  initialCustomerForOrder = null,
  openCreateModalInitially = false
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(openCreateModalInitially || !!initialCustomerForOrder);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerForOrder?.id || '');
  const [isCustomCraft, setIsCustomCraft] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemTitle, setItemTitle] = useState('Custom Resin Artwork Plaque');
  const [itemQty, setItemQty] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(2500);

  // Custom Craft Specs
  const [customDesignName, setCustomDesignName] = useState('Personalized Ocean Plaque');
  const [customDescription, setCustomDescription] = useState('12x8 Teak wood base with ocean resin waves & gold foil lettering');
  const [customDimensions, setCustomDimensions] = useState('12x8 inches');
  const [customMaterial, setCustomMaterial] = useState('Teak Wood & Epoxy Resin');
  const [customColor, setCustomColor] = useState('Deep Ocean Blue & Gold');
  const [customTextContent, setCustomTextContent] = useState('The Sharma Family - Est 2026');
  const [customInstructions, setCustomInstructions] = useState('Deliver in premium velvet wrap gift box');
  const [customRefImage, setCustomRefImage] = useState('https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400');

  // Pricing calculations
  const [discount, setDiscount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(150);
  const [tax, setTax] = useState(318);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [advanceAmount, setAdvanceAmount] = useState(1000);
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>('UPI');
  const [creating, setCreating] = useState(false);

  // Workspace & Maps Modals State
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [gmailOrderContext, setGmailOrderContext] = useState<any>(null);
  const [mapDeliveryLocation, setMapDeliveryLocation] = useState<any>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(!!initialSelectedOrderId);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payRef, setPayRef] = useState('');
  const [recordingPay, setRecordingPay] = useState(false);

  // Admin Payment Verification Modal State
  const [verifyOrder, setVerifyOrder] = useState<Order | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const loadData = async () => {
    try {
      const [ordData, custData, prodData, settingsData] = await Promise.all([
        api.getOrders(),
        api.getCustomers(),
        api.getProducts(),
        api.getSettings().catch(() => null)
      ]);
      setOrders(ordData);
      setCustomers(custData);
      setProducts(prodData);
      if (settingsData) setSettings(settingsData);

      if (initialSelectedOrderId) {
        const found = ordData.find(o => o.id === initialSelectedOrderId || o.orderNumber === initialSelectedOrderId);
        if (found) {
          setViewOrder(found);
          setShowDetailModal(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialCustomerForOrder) {
      setSelectedCustomerId(initialCustomerForOrder.id);
      setShowCreateModal(true);
    }
  }, [initialCustomerForOrder]);

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setItemTitle(prod.name);
      setItemUnitPrice(prod.sellingPrice);
      setIsCustomCraft(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }

    setCreating(true);
    try {
      const created = await api.createOrder({
        customerId: selectedCustomerId,
        items: [
          {
            productId: selectedProductId || undefined,
            productName: itemTitle,
            quantity: Number(itemQty),
            unitPrice: Number(itemUnitPrice)
          }
        ],
        customDetails: isCustomCraft
          ? {
              designName: customDesignName,
              description: customDescription,
              dimensions: customDimensions,
              material: customMaterial,
              color: customColor,
              textContent: customTextContent,
              instructions: customInstructions,
              referenceImages: customRefImage ? [customRefImage] : []
            }
          : undefined,
        discount: Number(discount),
        deliveryCharge: Number(deliveryCharge),
        tax: Number(tax),
        priority,
        advancePayment: advanceAmount > 0 ? { amount: Number(advanceAmount), method: advanceMethod } : undefined
      });

      setShowCreateModal(false);
      loadData();
      setViewOrder(created);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!viewOrder) return;
    try {
      const updated = await api.updateOrderStatus(viewOrder.id, newStatus, `Transitioned status to ${newStatus}`);
      setViewOrder(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewOrder) return;
    setRecordingPay(true);
    try {
      const res = await api.recordOrderPayment(viewOrder.id, {
        amount: payAmount,
        method: payMethod,
        transactionReference: payRef
      });
      setViewOrder(res.order);
      setShowPaymentModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setRecordingPay(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm) ||
      o.items.some(i => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'PRINT_ORDERS') return isPrintOrder(o);
    if (statusFilter === 'PAYMENT_VERIFICATION') return o.status === 'PAYMENT_VERIFICATION_PENDING' || (o.upiVerification && o.upiVerification.status === 'PENDING');
    if (statusFilter === 'PAYMENT_REJECTED') return o.status === 'PAYMENT_REJECTED' || (o.upiVerification && o.upiVerification.status === 'REJECTED');
    if (statusFilter === 'PENDING') return ['NEW', 'ORDER_RECEIVED', 'CONFIRMED', 'DESIGNING'].includes(o.status);
    if (statusFilter === 'PRODUCTION') return ['IN_PRODUCTION', 'QUALITY_CHECK', 'PRINT_IN_PROGRESS', 'PRINT_DONE'].includes(o.status);
    if (statusFilter === 'READY') return ['READY', 'OUT_FOR_DELIVERY', 'PACKED_SEAL', 'READY_TO_DISPATCH'].includes(o.status);
    if (statusFilter === 'DELIVERED') return o.status === 'DELIVERED';
    if (statusFilter === 'PAYMENT_PENDING') return o.balanceAmount > 0;

    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500">Loading Orders...</div>;
  }

  const subtotalCalc = itemQty * itemUnitPrice;
  const grandTotalCalc = Math.max(0, subtotalCalc - discount + deliveryCharge + tax);
  const balanceCalc = Math.max(0, grandTotalCalc - advanceAmount);

  return (
    <div className="space-y-6">
      {/* Header & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Orders & Craft Workflow
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage craft orders, custom designs, workshop statuses & payments.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSheetsModal(true)}
            className="p-2 sm:px-3.5 sm:py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Export and sync orders with Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Google Sheets</span>
          </button>
          <button
            type="button"
            onClick={() => exportOrdersToExcel(filteredOrders.length > 0 ? filteredOrders : orders)}
            className="p-2 sm:px-3.5 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Download Orders Ledger as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            title="Create New Craft Order"
            className="p-2 sm:px-4 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">+ Create New Craft Order</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order #, Customer, Phone, Craft item..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-purple-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All' },
            {
              id: 'PAYMENT_VERIFICATION',
              label: '🛡️ UPI Verification Queue',
              badge: orders.filter(o => o.status === 'PAYMENT_VERIFICATION_PENDING' || (o.upiVerification && o.upiVerification.status === 'PENDING')).length,
              highlight: true
            },
            { id: 'PRINT_ORDERS', label: '📄 Print Docs Only', badge: orders.filter(isPrintOrder).length },
            { id: 'PENDING', label: 'Pending' },
            { id: 'PRODUCTION', label: 'In Production / Printing' },
            { id: 'READY', label: 'Ready / Dispatched' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'PAYMENT_PENDING', label: 'Payment Due' },
            {
              id: 'PAYMENT_REJECTED',
              label: '❌ Rejected Payments',
              badge: orders.filter(o => o.status === 'PAYMENT_REJECTED').length
            }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : f.highlight && f.badge && f.badge > 0
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{f.label}</span>
              {f.badge !== undefined && f.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  f.highlight ? 'bg-amber-500 text-white animate-pulse' : 'bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200'
                }`}>
                  {f.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        {/* Mobile View: Responsive Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No orders matching selected criteria.
            </div>
          ) : (
            filteredOrders.map(ord => (
              <div key={ord.id} className="p-4 space-y-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                {/* Header Row: Order Number & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {ord.orderNumber}
                    </span>
                    {ord.customDetails && (
                      <span className="text-[9px] bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
                        Custom Craft
                      </span>
                    )}
                  </div>
                  <Badge type="orderStatus" value={ord.status} />
                </div>

                {/* Customer & Item details */}
                <div className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{ord.customerName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{ord.customerPhone}</p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 font-medium truncate">
                      {ord.items[0]?.productName} {ord.items.length > 1 && `+${ord.items.length - 1} more`}
                    </p>
                    <div className="mt-1">
                      {ord.shippingMethod === 'PICKUP' || (ord.shippingAddress as any)?.shippingMethod === 'PICKUP' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <Store className="w-3 h-3" />
                          <span>Self Pickup (Free)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                          <Truck className="w-3 h-3" />
                          <span>Doorstep Delivery</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white">₹{(ord.grandTotal || 0).toLocaleString()}</p>
                    <p className="text-[11px] mt-0.5">
                      {(ord.balanceAmount || 0) > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          Due: ₹{(ord.balanceAmount || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Paid in Full</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Payment Verification alert banner if pending on card */}
                {ord.status === 'PAYMENT_VERIFICATION_PENDING' && (
                  <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="text-[10px] text-amber-800 dark:text-amber-300 truncate">
                        <span className="font-black">UTR: {ord.upiVerification?.utr || 'Pending'}</span>
                        <span className="opacity-80 block">Verify bank credit</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyOrder(ord);
                        setShowVerifyModal(true);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg text-[10px] shadow-xs shrink-0 cursor-pointer animate-pulse"
                    >
                      Verify UPI
                    </button>
                  </div>
                )}

                {/* Mobile Action Buttons Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-4 gap-1.5">
                  <div className="col-span-1 flex items-center justify-center">
                    <WhatsAppBtn
                      phone={ord.customerPhone}
                      customerName={ord.customerName}
                      orderNumber={ord.orderNumber}
                      balance={ord.balanceAmount}
                      messageType={ord.balanceAmount > 0 ? 'payment_due' : 'confirmed'}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQrOrder(ord);
                      setShowQRModal(true);
                    }}
                    className="py-2 px-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Click to display QR of total amount bill"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewOrder(ord);
                      setShowInvoiceModal(true);
                    }}
                    className="py-2 px-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Print Printable Summary"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Bill</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewOrder(ord);
                      setShowDetailModal(true);
                    }}
                    className="py-2 px-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table (hidden on mobile, visible on md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Craft Item</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No orders matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{ord.orderNumber}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{ord.customerName}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{ord.customerPhone}</p>
                      <div className="mt-0.5">
                        {ord.shippingMethod === 'PICKUP' || (ord.shippingAddress as any)?.shippingMethod === 'PICKUP' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <Store className="w-2.5 h-2.5" />
                            <span>Pickup (Free)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                            <Truck className="w-2.5 h-2.5" />
                            <span>Delivery</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{ord.items[0]?.productName}</p>
                      {ord.customDetails && (
                        <span className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
                          Custom Craft
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">₹{(ord.grandTotal || 0).toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={(ord.balanceAmount || 0) > 0 ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500 font-semibold'}>
                        ₹{(ord.balanceAmount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge type="orderStatus" value={ord.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ord.status === 'PAYMENT_VERIFICATION_PENDING' && (
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyOrder(ord);
                              setShowVerifyModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-lg text-xs transition-all flex items-center gap-1 shadow-xs animate-pulse cursor-pointer"
                            title="Verify customer UPI UTR against bank statement to place order"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Verify UPI</span>
                          </button>
                        )}
                        <WhatsAppBtn
                          phone={ord.customerPhone}
                          customerName={ord.customerName}
                          orderNumber={ord.orderNumber}
                          balance={ord.balanceAmount}
                          messageType={ord.balanceAmount > 0 ? 'payment_due' : 'confirmed'}
                        />
                        {/* Click to Display Bill QR */}
                        <button
                          type="button"
                          onClick={() => {
                            setQrOrder(ord);
                            setShowQRModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="Click to display QR of total amount bill"
                        >
                          <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setViewOrder(ord);
                            setShowInvoiceModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="Print Printable Summary"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Summary
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setViewOrder(ord);
                            setShowDetailModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Workflow
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Craft Order"
        subtitle="Specify items, custom craft specifications & payment details"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          {/* Customer Selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Customer *</label>
            <select
              required
              value={selectedCustomerId || ''}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customerCode}) - {c.whatsapp}
                </option>
              ))}
            </select>
          </div>

          {/* Craft Item Type Selection */}
          <div className="flex items-center gap-4 bg-purple-50/50 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/50">
            <label className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300 cursor-pointer">
              <input
                type="radio"
                name="craftType"
                checked={isCustomCraft}
                onChange={() => setIsCustomCraft(true)}
                className="text-purple-600"
              />
              Bespoke Custom Craft Item
            </label>
            <label className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300 cursor-pointer">
              <input
                type="radio"
                name="craftType"
                checked={!isCustomCraft}
                onChange={() => setIsCustomCraft(false)}
                className="text-purple-600"
              />
              Standard Catalog Product
            </label>
          </div>

          {!isCustomCraft && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catalog Product</label>
              <select
                value={selectedProductId || ''}
                onChange={e => handleProductSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              >
                <option value="">-- Select Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ₹{p.sellingPrice} (Stock: {p.stockQuantity})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Item Title / Craft Name *</label>
              <input
                type="text"
                required
                value={itemTitle || ''}
                onChange={e => setItemTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity *</label>
              <input
                type="number"
                required
                min={1}
                value={itemQty ?? 1}
                onChange={e => setItemQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Selling Price (₹) *</label>
            <input
              type="number"
              required
              min={0}
              value={itemUnitPrice ?? 0}
              onChange={e => setItemUnitPrice(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden"
            />
          </div>

          {/* Custom Craft Specifications */}
          {isCustomCraft && (
            <div className="p-4 bg-purple-50/40 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-3">
              <h4 className="font-extrabold text-purple-900 dark:text-purple-300 text-xs">Custom Craft Specifications</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Design Name / Concept</label>
                  <input
                    type="text"
                    value={customDesignName || ''}
                    onChange={e => setCustomDesignName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dimensions / Size</label>
                  <input
                    type="text"
                    value={customDimensions || ''}
                    onChange={e => setCustomDimensions(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Wording / Calligraphy Content</label>
                <input
                  type="text"
                  value={customTextContent || ''}
                  onChange={e => setCustomTextContent(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Special Design Instructions</label>
                <textarea
                  rows={2}
                  value={customInstructions || ''}
                  onChange={e => setCustomInstructions(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden text-xs"
                />
              </div>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Discount (₹)</label>
              <input
                type="number"
                value={discount ?? 0}
                onChange={e => setDiscount(Number(e.target.value))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Delivery (₹)</label>
              <input
                type="number"
                value={deliveryCharge ?? 0}
                onChange={e => setDeliveryCharge(Number(e.target.value))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Tax (12%)</label>
              <input
                type="number"
                value={tax ?? 0}
                onChange={e => setTax(Number(e.target.value))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Advance Received (₹)</label>
              <input
                type="number"
                value={advanceAmount ?? 0}
                onChange={e => setAdvanceAmount(Number(e.target.value))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400 rounded-lg"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl flex justify-between items-center text-xs border border-slate-800">
            <div>
              <p className="text-slate-400">Calculated Total</p>
              <p className="text-lg font-black">₹{grandTotalCalc.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400">Balance Due</p>
              <p className="text-base font-bold text-rose-400">₹{balanceCalc.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
            >
              {creating ? 'Creating Order...' : 'Confirm Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Order Detail & Workflow Modal */}
      {viewOrder && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Order #${viewOrder.orderNumber}`}
          subtitle={`Customer: ${viewOrder.customerName} (${viewOrder.customerPhone})`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs">
            {/* Status Transition Workflow Controls */}
            {(() => {
              const isPrint = isPrintOrder(viewOrder);
              const statusList = isPrint ? PRINT_ORDER_STATUS_FLOW : CRAFT_ORDER_STATUS_FLOW;
              const currentStepIdx = getOrderStepIndex(viewOrder.status, isPrint);
              const stepsArray = isPrint ? PRINT_ORDER_STEPS : CRAFT_ORDER_STEPS;

              return (
                <div className={`p-4 sm:p-5 ${isPrint ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-blue-600/50' : 'bg-purple-900'} text-white rounded-2xl shadow-lg space-y-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                          {isPrint ? '📄 Print Document Order Workflow' : '🎨 Custom Craft Order Workflow'}
                        </span>
                        {isPrint && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">
                            7-Step Print Pipeline
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                        {formatOrderStatus(viewOrder.status, isPrint)}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => generateOrderSummaryPdf(viewOrder, settings)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                        title="Export professional summary invoice as PDF (.pdf)"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Export as PDF</span>
                      </button>
                      <button
                        onClick={() => setShowInvoiceModal(true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                        title="Open printer-friendly customer receipt"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Receipt</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Step Progress Bar */}
                  <div className="bg-black/35 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                    <div className={`grid grid-cols-2 sm:grid-cols-4 ${isPrint ? 'md:grid-cols-7' : 'md:grid-cols-8'} gap-1.5`}>
                      {stepsArray.map((step, idx) => {
                        const isDone = currentStepIdx > idx;
                        const isCurrent = currentStepIdx === idx;
                        return (
                          <div
                            key={step.status}
                            onClick={() => handleStatusChange(step.status)}
                            className={`p-2 rounded-xl text-center cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-white text-slate-950 font-black shadow-md ring-2 ring-blue-400 scale-102'
                                : isDone
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                            title={`Click to set status to ${step.label}: ${step.desc}`}
                          >
                            <div className="text-[9px] font-bold opacity-75">
                              {isDone ? '✓ Done' : isCurrent ? '● Active' : `Step ${idx + 1}`}
                            </div>
                            <div className="text-[10px] font-extrabold leading-tight truncate mt-0.5">
                              {step.shortLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 overflow-x-auto">
                    <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0 mr-1">Advance Status:</span>
                    {statusList.map(st => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st as OrderStatus)}
                        disabled={viewOrder.status === st}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                          viewOrder.status === st
                            ? 'bg-white text-slate-950 shadow-md font-black ring-2 ring-blue-400'
                            : 'bg-white/15 hover:bg-white/25 text-white'
                        }`}
                      >
                        {formatOrderStatus(st, isPrint)}
                      </button>
                    ))}
                    {viewOrder.status !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to cancel order #${viewOrder.orderNumber}?`)) {
                            handleStatusChange('CANCELLED');
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600/30 hover:bg-rose-600 text-rose-200 ml-auto cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* UPI Payment Verification Card in Order Details */}
            {(viewOrder.upiVerification || viewOrder.status === 'PAYMENT_VERIFICATION_PENDING' || viewOrder.status === 'PAYMENT_REJECTED') && (
              <div className={`p-4 rounded-2xl border ${
                viewOrder.status === 'PAYMENT_VERIFICATION_PENDING'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                  : viewOrder.status === 'PAYMENT_REJECTED'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {viewOrder.status === 'PAYMENT_VERIFICATION_PENDING' ? (
                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : viewOrder.status === 'PAYMENT_REJECTED' ? (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                        Predefined UPI Payment Verification (shiv.khante5-2@okaxis)
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                      <span>
                        <strong>UTR Ref:</strong> <code className="font-bold text-purple-700 dark:text-purple-300">{viewOrder.upiVerification?.utr || 'Pending Submission'}</code>
                      </span>
                      <span>
                        <strong>Claimed Amount:</strong> ₹{(viewOrder.upiVerification?.amount || viewOrder.grandTotal || 0).toLocaleString()}
                      </span>
                      {viewOrder.upiVerification?.payerUpi && (
                        <span><strong>Payer UPI:</strong> {viewOrder.upiVerification.payerUpi}</span>
                      )}
                    </div>

                    {viewOrder.status === 'PAYMENT_REJECTED' && (
                      <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-1">
                        ❌ Rejection Reason: {viewOrder.upiVerification?.rejectionReason || 'UTR not matched in bank statement. Order not placed.'}
                      </p>
                    )}

                    {viewOrder.upiVerification?.status === 'VERIFIED' && (
                      <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                        ✅ Verified by {viewOrder.upiVerification.verifiedBy || 'Admin'} at {viewOrder.upiVerification.verifiedAt ? new Date(viewOrder.upiVerification.verifiedAt).toLocaleString() : ''}
                      </p>
                    )}
                  </div>

                  {viewOrder.status === 'PAYMENT_VERIFICATION_PENDING' && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyOrder(viewOrder);
                        setShowVerifyModal(true);
                      }}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer shrink-0 animate-pulse"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Review & Verify UTR</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Financial Summary & Payment Action */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</span>
                <p className="text-lg font-black text-slate-900 dark:text-white">₹{(viewOrder.grandTotal || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Amount</span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{(viewOrder.paidAmount || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Balance Due</span>
                <p className="text-lg font-black text-rose-600 dark:text-rose-400">₹{(viewOrder.balanceAmount || 0).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {/* Click to Display Bill QR Code */}
                <button
                  type="button"
                  onClick={() => {
                    setQrOrder(viewOrder);
                    setShowQRModal(true);
                  }}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Click to display QR of total amount bill"
                >
                  <QrCode className="w-3.5 h-3.5 text-purple-200" />
                  <span>Display Bill QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGmailOrderContext({
                      orderNumber: viewOrder.orderNumber,
                      customerName: viewOrder.customerName,
                      totalAmount: viewOrder.grandTotal,
                      items: viewOrder.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')
                    });
                    setShowGmailModal(true);
                  }}
                  className="px-3 py-2 bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Send order invoice & update to customer via Gmail"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Gmail Update</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMapDeliveryLocation({
                      address: (viewOrder as any).shippingAddress || 'Mumbai, Maharashtra',
                      city: 'Mumbai',
                      customerName: viewOrder.customerName,
                      orderNumber: viewOrder.orderNumber
                    });
                    setShowMapsModal(true);
                  }}
                  className="px-3 py-2 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View delivery route and customer location on Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Maps Route</span>
                </button>

                <button
                  type="button"
                  onClick={() => generateOrderSummaryPdf(viewOrder, settings)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Export Order Summary Invoice as PDF (.pdf)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export as PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Customer Receipt"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Receipt</span>
                </button>
                {viewOrder.balanceAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPayAmount(viewOrder.balanceAmount);
                      setShowPaymentModal(true);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    + Record Payment
                  </button>
                )}
              </div>
            </div>

            {/* Craft Item & Custom Details */}
            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Order Items</h4>
              {viewOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{item.productName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Qty: {item.quantity} × ₹{item.unitPrice}</p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{(item.totalPrice || ((item.quantity || 1) * (item.unitPrice || 0)) || 0).toLocaleString()}
                  </span>
                </div>
              ))}

              {viewOrder.customDetails && (
                <div className="mt-3 p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-1 text-slate-800 dark:text-slate-200">
                  <p className="font-bold text-purple-900 dark:text-purple-300">Custom Specifications:</p>
                  <p><strong>Design:</strong> {viewOrder.customDetails.designName}</p>
                  {viewOrder.customDetails.textContent && <p><strong>Calligraphy:</strong> "{viewOrder.customDetails.textContent}"</p>}
                  {viewOrder.customDetails.instructions && <p><strong>Instructions:</strong> {viewOrder.customDetails.instructions}</p>}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && viewOrder && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title={`Record Payment for #${viewOrder.orderNumber}`}
          subtitle={`Balance Due: ₹${(viewOrder.balanceAmount || 0).toLocaleString()}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                required
                min={1}
                max={viewOrder.balanceAmount}
                value={payAmount ?? 0}
                onChange={e => setPayAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
              <select
                value={payMethod || 'UPI'}
                onChange={e => setPayMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction / Reference ID</label>
              <input
                type="text"
                placeholder="e.g. UPI-9812340012"
                value={payRef || ''}
                onChange={e => setPayRef(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recordingPay}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                {recordingPay ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bill QR Code Modal */}
      {showQRModal && (qrOrder || viewOrder) && (
        <BillQRCodeModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setQrOrder(null);
          }}
          order={qrOrder || viewOrder}
          settings={settings}
          title={`Bill Payment QR - Order #${(qrOrder || viewOrder)?.orderNumber}`}
        />
      )}

      {/* Invoice Modal */}
      {viewOrder && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          order={viewOrder}
          settings={settings}
          initialMode="RECEIPT"
        />
      )}

      {/* Google Sheets Hub Modal */}
      <GoogleSheetsHubModal
        isOpen={showSheetsModal}
        onClose={() => setShowSheetsModal(false)}
        ordersData={filteredOrders.length > 0 ? filteredOrders : orders}
      />

      {/* Gmail Hub Modal */}
      <GmailHubModal
        isOpen={showGmailModal}
        onClose={() => {
          setShowGmailModal(false);
          setGmailOrderContext(null);
        }}
        initialRecipient={viewOrder?.customerEmail || ''}
        initialSubject={viewOrder ? `Cards Crafted Order #${viewOrder.orderNumber} - Order Update` : ''}
        orderContext={gmailOrderContext}
      />

      {/* Google Maps Modal */}
      <GoogleMapsModal
        isOpen={showMapsModal}
        onClose={() => {
          setShowMapsModal(false);
          setMapDeliveryLocation(null);
        }}
        deliveryLocation={mapDeliveryLocation}
      />

      {/* Admin UPI Payment Verification Modal */}
      {verifyOrder && (
        <AdminPaymentVerificationModal
          order={verifyOrder}
          isOpen={showVerifyModal}
          onClose={() => {
            setShowVerifyModal(false);
            setVerifyOrder(null);
          }}
          onVerified={(updatedOrder) => {
            loadData();
            if (viewOrder && viewOrder.id === updatedOrder.id) {
              setViewOrder(updatedOrder);
            }
          }}
        />
      )}
    </div>
  );
};
