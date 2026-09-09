import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Order, OrderStatus, SystemSettings } from '../types';
import {
  isPrintOrder,
  PRINT_ORDER_STEPS,
  CRAFT_ORDER_STEPS,
  getOrderStepIndex,
  formatOrderStatus
} from '../utils/orderStatusUtils';
import { Badge } from '../components/common/Badge';
import { InvoiceModal } from '../components/common/InvoiceModal';
import { BillQRCodeModal } from '../components/common/BillQRCodeModal';
import { generateOrderSummaryPdf } from '../utils/pdfInvoiceGenerator';
import { useCart } from '../context/CartContext';
import {
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Send,
  Printer,
  FileDown,
  ChevronRight,
  FileText,
  AlertCircle,
  QrCode,
  Eye,
  X,
  MessageCircle,
  ExternalLink,
  Tag,
  Package,
  Calendar,
  Check,
  MapPin,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  RotateCw
} from 'lucide-react';

interface CustomerDashboardPageProps {
  selectedOrderId?: string | null;
  onClearSelectedOrderId?: () => void;
  onNavigateToCatalog?: () => void;
  onNavigateToCart?: () => void;
}

export const CustomerDashboardPage: React.FC<CustomerDashboardPageProps> = ({
  selectedOrderId,
  onClearSelectedOrderId,
  onNavigateToCatalog,
  onNavigateToCart
}) => {
  const { totalItems } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Resubmit UTR State
  const [resubmitUtr, setResubmitUtr] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState('');
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  // Custom Request Form State
  const [designName, setDesignName] = useState('');
  const [description, setDescription] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [textContent, setTextContent] = useState('');
  const [instructions, setInstructions] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = async () => {
    try {
      const [data, settingsData] = await Promise.all([
        api.getOrders(),
        api.getSettings().catch(() => null)
      ]);
      setOrders(data);
      if (settingsData) setSettings(settingsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // When selectedOrderId is passed from notification or external link, open its details modal
  useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const found = orders.find(
        o => o.id === selectedOrderId || o.orderNumber === selectedOrderId || o.orderNumber.includes(selectedOrderId)
      );
      if (found) {
        setSelectedOrder(found);
        setShowOrderDetailsModal(true);
      } else if (orders.length > 0) {
        setSelectedOrder(orders[0]);
        setShowOrderDetailsModal(true);
      }
    }
  }, [selectedOrderId, orders]);

  const handleResubmitPayment = async (orderId: string) => {
    const trimmed = resubmitUtr.trim();
    if (!trimmed || trimmed.length < 8) {
      setResubmitError('Please enter a valid UPI Reference / UTR number (at least 8-12 alphanumeric characters).');
      return;
    }

    setResubmitting(true);
    setResubmitError('');
    try {
      const updated = await api.resubmitOrderPayment(orderId, trimmed);
      setResubmitSuccess(true);
      setResubmitUtr('');
      setSelectedOrder(updated);
      await loadOrders();
      setTimeout(() => setResubmitSuccess(false), 4000);
    } catch (err: any) {
      setResubmitError(err.message || 'Failed to resubmit payment reference.');
    } finally {
      setResubmitting(false);
    }
  };

  const handleCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createOrder({
        items: [
          {
            productName: designName || 'Custom Craft Order Request',
            quantity: 1,
            unitPrice: 0,
            notes: description
          }
        ],
        customDetails: {
          designName,
          description,
          dimensions,
          material,
          color,
          textContent,
          instructions,
          referenceImages: referenceUrl ? [referenceUrl] : []
        },
        priority: 'MEDIUM'
      });
      setRequestSuccess(true);
      setShowRequestModal(false);
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to submit craft request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500">Loading your orders...</div>;
  }

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');

  return (
    <div className="space-y-6">
      {/* Header Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-pink-800 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            Customer Portal
          </div>
          <h1 className="text-2xl font-black tracking-tight">Your Craft Orders & History</h1>
          <p className="text-xs text-purple-200 mt-1">Track workshop crafting progress, view order invoices & explore our catalog.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToCart && (
            <button
              onClick={onNavigateToCart}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-pink-300" />
              <span>Cart {totalItems > 0 ? `(${totalItems})` : ''}</span>
            </button>
          )}
          {onNavigateToCatalog && (
            <button
              onClick={onNavigateToCatalog}
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-xs rounded-2xl shadow-lg hover:from-pink-400 hover:to-rose-400 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Catalog & Buy Now</span>
            </button>
          )}
        </div>
      </div>

      {requestSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between">
          <p>✓ Your custom craft request has been sent to the studio! We will review specifications and confirm pricing shortly.</p>
          <button onClick={() => setRequestSuccess(false)} className="text-emerald-900 underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Active Orders with Visual Timeline */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Active Orders in Workshop ({activeOrders.length})
        </h2>

        {activeOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center transition-colors space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Active Orders</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Explore our handcrafted catalog and place an order today!</p>
            </div>
            {onNavigateToCatalog && (
              <button
                onClick={onNavigateToCatalog}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Explore Craft Catalog</span>
              </button>
            )}
          </div>
        ) : (
          activeOrders.map(ord => {
            const isPrint = isPrintOrder(ord);
            const steps = isPrint ? PRINT_ORDER_STEPS : CRAFT_ORDER_STEPS;
            const currentIdx = getOrderStepIndex(ord.status, isPrint);

            return (
              <div key={ord.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Order #{ord.orderNumber}</span>
                      {isPrint && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                          📄 Document Print
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base mt-0.5">
                      {ord.items[0]?.productName || (isPrint ? 'Document Printing Service' : 'Custom Craft Item')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ordered: {new Date(ord.orderDate).toLocaleDateString()} | Target Delivery: {new Date(ord.expectedDeliveryDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-1">
                      <p className="text-base font-black text-slate-900 dark:text-white">₹{(ord.grandTotal || 0).toLocaleString()}</p>
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Balance: ₹{(ord.balanceAmount || 0).toLocaleString()}</p>
                    </div>

                    {/* View Details Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setShowOrderDetailsModal(true);
                      }}
                      className="p-2 sm:px-3 sm:py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      title="View complete order and tracking details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Details</span>
                    </button>

                    {/* Show Bill / Balance QR Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setShowQRModal(true);
                      }}
                      className={`p-2 sm:px-3 sm:py-1.5 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        (ord.balanceAmount || 0) > 0 && (ord.paidAmount || 0) > 0
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                          : 'bg-purple-600 hover:bg-purple-500'
                      }`}
                      title={
                        (ord.balanceAmount || 0) > 0 && (ord.paidAmount || 0) > 0
                          ? `Pay remaining balance of ₹${(ord.balanceAmount || 0).toLocaleString()} via UPI`
                          : 'Click to display QR of total amount bill'
                      }
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-200" />
                      <span className="hidden sm:inline">
                        {(ord.balanceAmount || 0) > 0 && (ord.paidAmount || 0) > 0
                          ? `Pay Balance (₹${(ord.balanceAmount || 0).toLocaleString()})`
                          : 'Pay / Bill QR'}
                      </span>
                      <span className="sm:hidden">
                        {(ord.balanceAmount || 0) > 0 && (ord.paidAmount || 0) > 0
                          ? `Pay ₹${(ord.balanceAmount || 0).toLocaleString()}`
                          : 'QR'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setShowInvoiceModal(true);
                      }}
                      className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Print Invoice Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Invoice</span>
                    </button>
                  </div>
                </div>

                {/* Payment Verification Banner on Order Card */}
                {ord.status === 'PAYMENT_VERIFICATION_PENDING' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        Payment Verification in Progress
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 text-[11px]">
                        Payment of <strong>₹{(ord.grandTotal || 0).toLocaleString()}</strong> to predefined UPI <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono font-bold">shiv.khante5-2@okaxis</code> (UTR: <strong>{ord.upiVerification?.utr || 'Submitted'}</strong>) is being verified by Admin against the bank statement. Your order will be placed once verified.
                      </p>
                    </div>
                  </div>
                )}

                {ord.status === 'PAYMENT_REJECTED' && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-rose-900 dark:text-rose-200">
                          Payment Rejected — Order Not Placed
                        </p>
                        <p className="text-rose-700 dark:text-rose-300 text-[11px]">
                          Reason: {ord.upiVerification?.rejectionReason || 'UTR not matched in bank statement.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setShowOrderDetailsModal(true);
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-xl shrink-0 cursor-pointer shadow-xs"
                    >
                      Fix UTR
                    </button>
                  </div>
                )}

                {/* Progress Bar Timeline */}
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                    <span>{isPrint ? 'Print Workflow Progress:' : 'Craft Progress:'}</span>
                    <Badge type="orderStatus" value={ord.status} />
                  </p>

                  <div className={`grid grid-cols-2 sm:grid-cols-4 ${isPrint ? 'lg:grid-cols-7' : 'lg:grid-cols-8'} gap-2 text-center`}>
                    {steps.map((st, idx) => {
                      const isCompleted = currentIdx > idx;
                      const isCurrent = currentIdx === idx;
                      return (
                        <div key={st.status} className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 transition-all ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? isPrint
                                  ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950 animate-pulse'
                                  : 'bg-purple-600 text-white ring-4 ring-purple-100 dark:ring-purple-900/50 animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          <p className={`text-[10px] font-semibold leading-tight ${isCurrent ? (isPrint ? 'text-blue-700 dark:text-blue-400 font-black' : 'text-purple-700 dark:text-purple-400 font-black') : isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                            {st.shortLabel}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Completed Orders List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs transition-colors">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Order History & Receipts
        </h2>

        {completedOrders.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No completed past orders yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {completedOrders.map(ord => (
              <div key={ord.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-white">Order #{ord.orderNumber}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{ord.items[0]?.productName} • Delivered on {new Date(ord.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white mr-1">₹{(ord.grandTotal || 0).toLocaleString()}</span>
                  
                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(ord);
                      setShowOrderDetailsModal(true);
                    }}
                    className="p-1.5 px-2 bg-pink-50 dark:bg-pink-950/60 hover:bg-pink-100 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>

                  {/* Click to Display Bill QR */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(ord);
                      setShowQRModal(true);
                    }}
                    className="p-1.5 px-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Click to display QR of total amount bill"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Bill QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(ord);
                      setShowInvoiceModal(true);
                    }}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comprehensive Order Details & Live Tracking Modal */}
      {showOrderDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl my-6 max-h-[92vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Order Details
                  </span>
                  <span className="px-2 py-0.5 bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 text-[11px] font-black rounded-lg">
                    #{selectedOrder.orderNumber}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedOrder.items[0]?.productName || 'Handcrafted Item'}
                </h3>
              </div>

              <button
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  if (onClearSelectedOrderId) onClearSelectedOrderId();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* UPI Payment Verification Notice Box */}
              {(selectedOrder.upiVerification || selectedOrder.status === 'PAYMENT_VERIFICATION_PENDING' || selectedOrder.status === 'PAYMENT_REJECTED') && (
                <div className={`p-4 rounded-2xl border ${
                  selectedOrder.status === 'PAYMENT_VERIFICATION_PENDING'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80'
                    : selectedOrder.status === 'PAYMENT_REJECTED'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                }`}>
                  <div className="flex items-start gap-3">
                    {selectedOrder.status === 'PAYMENT_VERIFICATION_PENDING' ? (
                      <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : selectedOrder.status === 'PAYMENT_REJECTED' ? (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          {selectedOrder.status === 'PAYMENT_VERIFICATION_PENDING'
                            ? '⏳ Payment Verification In Progress'
                            : selectedOrder.status === 'PAYMENT_REJECTED'
                            ? '❌ Payment Rejected — Order Not Placed'
                            : '✅ Predefined UPI Payment Verified'}
                        </h4>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Predefined UPI: <code className="font-mono text-purple-700 dark:text-purple-300">shiv.khante5-2@okaxis</code>
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                        <p>
                          <strong>Submitted UTR Reference:</strong>{' '}
                          <code className="font-mono font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-purple-700 dark:text-purple-300">
                            {selectedOrder.upiVerification?.utr || 'Pending'}
                          </code>{' '}
                          • <strong>Amount:</strong> ₹{(selectedOrder.upiVerification?.amount || selectedOrder.grandTotal || 0).toLocaleString()}
                        </p>

                        {selectedOrder.status === 'PAYMENT_VERIFICATION_PENDING' && (
                          <p className="text-amber-800 dark:text-amber-300 text-[11px]">
                            Admin is currently verifying the UTR number with the bank statement credit. Once verified, your order status will automatically transition to Confirmed.
                          </p>
                        )}

                        {selectedOrder.status === 'PAYMENT_REJECTED' && (
                          <div className="space-y-3 pt-1">
                            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold">
                              <strong>Rejection Reason:</strong> {selectedOrder.upiVerification?.rejectionReason || 'UTR not matched in bank statement. Payment was not received.'}
                            </div>

                            {/* Resubmit UTR Box */}
                            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2.5">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                If you made the payment and entered the wrong UTR, please enter your correct 12-digit UPI Reference / UTR number below:
                              </p>
                              
                              {resubmitError && (
                                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                  {resubmitError}
                                </p>
                              )}

                              {resubmitSuccess && (
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  ✓ UTR re-submitted successfully! Admin has been notified for re-verification.
                                </p>
                              )}

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Enter correct 12-digit UTR (e.g., 423589123456)"
                                  value={resubmitUtr}
                                  onChange={(e) => setResubmitUtr(e.target.value)}
                                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-600"
                                />
                                <button
                                  type="button"
                                  disabled={resubmitting || !resubmitUtr.trim()}
                                  onClick={() => handleResubmitPayment(selectedOrder.id)}
                                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                                >
                                  <RotateCw className={`w-3.5 h-3.5 ${resubmitting ? 'animate-spin' : ''}`} />
                                  <span>{resubmitting ? 'Submitting...' : 'Re-submit UTR'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Meta & Status */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase">Order Date</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {new Date(selectedOrder.orderDate).toLocaleDateString([], { dateStyle: 'medium' })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase">Target Delivery</p>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString([], { dateStyle: 'medium' })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase">Current Status</p>
                  <div className="mt-0.5">
                    <Badge type="orderStatus" value={selectedOrder.status} />
                  </div>
                </div>
              </div>

              {/* Progress Steps Timeline */}
              {(() => {
                const isPrint = isPrintOrder(selectedOrder);
                const steps = isPrint ? PRINT_ORDER_STEPS : CRAFT_ORDER_STEPS;
                const currentIdx = getOrderStepIndex(selectedOrder.status, isPrint);

                return (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      {isPrint ? 'Document Printing & Delivery Workflow' : 'Workshop Crafting Journey'}
                    </h4>
                    <div className={`grid grid-cols-2 sm:grid-cols-4 ${isPrint ? 'lg:grid-cols-7' : 'lg:grid-cols-8'} gap-2 text-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800`}>
                      {steps.map((st, idx) => {
                        const isCompleted = currentIdx > idx;
                        const isCurrent = currentIdx === idx;
                        return (
                          <div key={st.status} className="flex flex-col items-center p-1.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isCurrent
                                  ? isPrint
                                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/60 animate-pulse'
                                    : 'bg-purple-600 text-white ring-4 ring-purple-100 dark:ring-purple-900/60 animate-pulse'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                            </div>
                            <p
                              className={`text-[10px] font-bold ${
                                isCurrent
                                  ? isPrint
                                    ? 'text-blue-600 dark:text-blue-400 font-black'
                                    : 'text-purple-600 dark:text-purple-400 font-black'
                                  : isCompleted
                                  ? 'text-slate-800 dark:text-slate-200'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {st.shortLabel}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:inline-block truncate max-w-full">
                              {st.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Order Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-pink-500" />
                  Ordered Items ({selectedOrder.items.length})
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.productName}</p>
                        {item.notes && <p className="text-[11px] text-slate-400 mt-0.5">{item.notes}</p>}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Qty: <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity}</span> × ₹{(item.unitPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <span className="font-black text-slate-900 dark:text-white">
                        ₹{((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Craft Specifications if any */}
              {selectedOrder.customDetails && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Personalization & Craft Specifications
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                    {selectedOrder.customDetails.designName && (
                      <div>
                        <span className="font-bold text-slate-400 text-[10px] uppercase">Design Concept</span>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold">{selectedOrder.customDetails.designName}</p>
                      </div>
                    )}
                    {selectedOrder.customDetails.description && (
                      <div>
                        <span className="font-bold text-slate-400 text-[10px] uppercase">Custom Description</span>
                        <p className="text-slate-800 dark:text-slate-200">{selectedOrder.customDetails.description}</p>
                      </div>
                    )}
                    {selectedOrder.customDetails.textContent && (
                      <div>
                        <span className="font-bold text-slate-400 text-[10px] uppercase">Card / Nameplate Text</span>
                        <p className="text-pink-600 dark:text-pink-400 font-bold italic">"{selectedOrder.customDetails.textContent}"</p>
                      </div>
                    )}
                    {(selectedOrder.customDetails.dimensions || selectedOrder.customDetails.material) && (
                      <div className="flex gap-4 pt-1">
                        {selectedOrder.customDetails.dimensions && (
                          <div>
                            <span className="font-bold text-slate-400 text-[10px] uppercase">Size / Dimensions</span>
                            <p className="text-slate-800 dark:text-slate-200 font-semibold">{selectedOrder.customDetails.dimensions}</p>
                          </div>
                        )}
                        {selectedOrder.customDetails.material && (
                          <div>
                            <span className="font-bold text-slate-400 text-[10px] uppercase">Materials</span>
                            <p className="text-slate-800 dark:text-slate-200 font-semibold">{selectedOrder.customDetails.material}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Totals Summary */}
              <div className="bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl p-4 border border-purple-100 dark:border-purple-900/40 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{((selectedOrder.subtotal ?? selectedOrder.grandTotal) || 0).toLocaleString()}
                  </span>
                </div>
                {(selectedOrder.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount Applied</span>
                    <span className="font-bold">-₹{(selectedOrder.discount || 0).toLocaleString()}</span>
                  </div>
                )}
                {(selectedOrder.deliveryCharge ?? 0) > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Delivery Charge</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹{(selectedOrder.deliveryCharge || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                {(selectedOrder.tax ?? 0) > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax (GST)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹{(selectedOrder.tax || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-purple-200 dark:border-purple-900/60">
                  <span>Grand Total</span>
                  <span>₹{(selectedOrder.grandTotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1">
                  <span className="text-slate-500">Amount Paid: ₹{(selectedOrder.paidAmount || 0).toLocaleString()}</span>
                  <span className={(selectedOrder.balanceAmount ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-emerald-600 font-black'}>
                    {(selectedOrder.balanceAmount ?? 0) > 0 ? `Balance Due: ₹${(selectedOrder.balanceAmount || 0).toLocaleString()}` : 'Fully Paid ✓'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              {/* WhatsApp Help Trigger */}
              <a
                href={`https://wa.me/919876543210?text=${encodeURIComponent(`Hi Shivani! I have a question about my Order #${selectedOrder.orderNumber}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat with Shivani</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    generateOrderSummaryPdf(selectedOrder, settings);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Export Order Summary Invoice as PDF (.pdf)"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export as PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowQRModal(true);
                  }}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ${
                    (selectedOrder.balanceAmount ?? 0) > 0 && (selectedOrder.paidAmount ?? 0) > 0
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                      : 'bg-purple-600 hover:bg-purple-500'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {(selectedOrder.balanceAmount ?? 0) > 0 && (selectedOrder.paidAmount ?? 0) > 0
                      ? `Pay Balance (₹${(selectedOrder.balanceAmount || 0).toLocaleString()})`
                      : 'Pay / Bill QR'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowInvoiceModal(true);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Order Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Submit Custom Craft Request</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Provide details for your personalized handcrafted item.</p>

            <form onSubmit={handleCustomRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Design / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Resin Ocean Nameplate / Gold Foil Invite"
                  value={designName}
                  onChange={e => setDesignName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Custom Instructions *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your design, colors, wording, and themes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dimensions / Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 12x8 inches"
                    value={dimensions}
                    onChange={e => setDimensions(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Material</label>
                  <input
                    type="text"
                    placeholder="e.g. Epoxy Resin / Teak Wood"
                    value={material}
                    onChange={e => setMaterial(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Text / Wording on Craft</label>
                <input
                  type="text"
                  placeholder='e.g. "The Sharma Family - Est 2026"'
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reference Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={referenceUrl}
                  onChange={e => setReferenceUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Payment QR Code Modal */}
      {showQRModal && selectedOrder && (
        <BillQRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          order={selectedOrder}
          settings={settings}
          title={`Bill Payment QR - Order #${selectedOrder.orderNumber}`}
        />
      )}

      {/* Invoice Modal */}
      {selectedOrder && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          order={selectedOrder}
          settings={settings}
          initialMode="RECEIPT"
        />
      )}
    </div>
  );
};
