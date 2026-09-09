import React, { useState } from 'react';
import { Order } from '../../types';
import { api } from '../../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  User,
  Phone,
  Receipt,
  X,
  CreditCard,
  Building2
} from 'lucide-react';

interface AdminPaymentVerificationModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (updatedOrder: Order) => void;
}

export const AdminPaymentVerificationModal: React.FC<AdminPaymentVerificationModalProps> = ({
  order,
  isOpen,
  onClose,
  onVerified
}) => {
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [remarks, setRemarks] = useState('Payment verified against bank statement. UTR matched.');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('UTR not found in bank statement for shiv.khante5-2@okaxis');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const utr = order.upiVerification?.utr || 'NOT_SUBMITTED';
  const targetUpiId = order.upiVerification?.upiId || 'shiv.khante5-2@okaxis';
  const claimedAmount = order.upiVerification?.amount || order.grandTotal;
  const payerUpi = order.upiVerification?.payerUpi;
  const submittedAt = order.upiVerification?.submittedAt || order.createdAt;

  const handleCopy = (text: string, isUtr: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUtr) {
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
    } else {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleVerifyPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyOrderPayment(order.id, remarks);
      onVerified(res.order);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    const finalReason = customRejectReason.trim() || rejectReason;
    if (!finalReason) {
      setError('Please provide a reason for rejecting this payment.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.rejectOrderPayment(order.id, finalReason);
      onVerified(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject payment');
    } finally {
      setLoading(false);
    }
  };

  const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(
    `Hello ${order.customerName}, regarding your Cards Crafted Order #${order.orderNumber} for ₹${claimedAmount}. We are checking your UPI payment (UTR: ${utr}) to shiv.khante5-2@okaxis.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Admin UPI Payment Verification</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                  Awaiting Match
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verify customer's 12-digit UTR against your bank statement before placing order.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Summary & Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">Order Information</span>
              <p className="text-sm font-black text-slate-900 dark:text-white">Order #{order.orderNumber}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                {order.items[0]?.productName || 'Handcrafted Craft Order'}
                {order.items.length > 1 ? ` (+${order.items.length - 1} more items)` : ''}
              </p>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400">Total Payable: ₹{(order.grandTotal || 0).toLocaleString()}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">Customer Details</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.customerName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.customerPhone}</span>
                {cleanPhone && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Submitted: {new Date(submittedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Verification Details Card */}
          <div className="bg-gradient-to-br from-purple-900/10 via-slate-900/5 to-blue-900/10 dark:from-purple-950/40 dark:to-slate-900 rounded-3xl p-5 border-2 border-purple-500/30 dark:border-purple-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                  Bank Reference & UTR Claim
                </h4>
              </div>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                Claimed: ₹{claimedAmount.toLocaleString()}
              </span>
            </div>

            {/* Claimed UTR Number */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Customer Submitted UTR / RRN (12 Digits)
                </span>
                <p className="text-base font-mono font-black text-purple-700 dark:text-purple-300 tracking-wider">
                  {utr}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(utr, true)}
                className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Copy UTR to clipboard"
              >
                {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUtr ? 'Copied!' : 'Copy UTR'}</span>
              </button>
            </div>

            {/* Target Account & Payer UPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">
                  Recipient Account UPI ID
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{targetUpiId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(targetUpiId, false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Cards Crafted (Shiv Khante)</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">
                  Payer UPI ID / App
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {payerUpi || 'UPI App / BHIM / GPay'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Reported by Customer</span>
              </div>
            </div>

            {/* Verification Steps Checklist */}
            <div className="bg-amber-500/10 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Building2 className="w-3.5 h-3.5" />
                <span>Admin Verification Guide:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 dark:text-amber-300/90">
                <li>Open your Bank Statement / GPay / Axis Bank app linked to <strong className="font-mono">{targetUpiId}</strong>.</li>
                <li>Match incoming credit of <strong>₹{claimedAmount.toLocaleString()}</strong> with UTR <strong className="font-mono">{utr}</strong>.</li>
                <li>Click <strong>Verify & Confirm Order</strong> to place order in workshop, or <strong>Reject Payment</strong> if fake/not received.</li>
              </ul>
            </div>
          </div>

          {/* Verification / Rejection Forms */}
          {!showRejectForm ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Approval Notes / Confirmation Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="e.g. Verified in Axis bank statement with matching UTR."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleVerifyPayment}
                  className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Verifying...' : '✅ Approve & Confirm Order Placement'}</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowRejectForm(true)}
                  className="w-full sm:w-auto py-3 px-4 bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span>Reject Fake / Invalid Payment</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-rose-50/50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Reject Payment & Cancel Order Placement</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Rejection Reason
                </label>
                <select
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="UTR not found in bank statement for shiv.khante5-2@okaxis">
                    UTR not found in bank statement for shiv.khante5-2@okaxis
                  </option>
                  <option value="Payment not credited / Fake or invalid UTR reference">
                    Payment not credited / Fake or invalid UTR reference
                  </option>
                  <option value="Payment amount does not match order grand total">
                    Payment amount does not match order grand total
                  </option>
                  <option value="Payment was reversed or declined by bank">
                    Payment was reversed or declined by bank
                  </option>
                  <option value="CUSTOM">Other custom reason (type below)</option>
                </select>
              </div>

              {rejectReason === 'CUSTOM' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Reason for Customer
                  </label>
                  <textarea
                    rows={2}
                    value={customRejectReason}
                    onChange={e => setCustomRejectReason(e.target.value)}
                    placeholder="Enter details of why this payment was rejected..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Notice: Rejecting this payment will mark the order as <strong>Payment Rejected</strong> and will <strong>NOT</strong> place the order into the workshop production queue. The customer will see the rejection reason on their dashboard.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRejectPayment}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{loading ? 'Rejecting...' : 'Confirm Payment Rejection & Stop Order'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="py-2.5 px-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
