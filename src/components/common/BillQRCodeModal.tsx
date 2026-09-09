import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Order, SystemSettings } from '../../types';
import {
  QrCode,
  X,
  Copy,
  Check,
  Download,
  Printer,
  Smartphone,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Receipt
} from 'lucide-react';

interface BillQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  amount?: number;
  orderNumber?: string;
  customerName?: string;
  settings?: SystemSettings | null;
  title?: string;
  defaultMode?: 'TOTAL' | 'BALANCE';
}

export const BillQRCodeModal: React.FC<BillQRCodeModalProps> = ({
  isOpen,
  onClose,
  order,
  amount: customAmount,
  orderNumber: customOrderNumber,
  customerName: customCustomerName,
  settings,
  title = 'Scan & Pay Bill via UPI',
  defaultMode = 'TOTAL'
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  // If order has advance already paid and has remaining balance, strictly use BALANCE mode
  const isSplitBalanceOrder = Boolean(order && order.paidAmount > 0 && order.balanceAmount > 0);
  const initialMode = isSplitBalanceOrder ? 'BALANCE' : defaultMode;
  const [selectedAmountType, setSelectedAmountType] = useState<'TOTAL' | 'BALANCE'>(initialMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isSplitBalanceOrder) {
      setSelectedAmountType('BALANCE');
    } else {
      setSelectedAmountType(defaultMode);
    }
  }, [isOpen, defaultMode, isSplitBalanceOrder]);

  const businessName = settings?.businessName || 'Cards Crafted';
  const upiId = settings?.upiId || 'shiv.khante5-2@okaxis';
  const orderNum = order?.orderNumber || customOrderNumber || 'BILL';
  const custName = order?.customerName || customCustomerName || 'Valued Customer';

  // Determine active amount to display
  const totalAmount = order ? order.grandTotal : customAmount || 0;
  const balanceAmount = order ? order.balanceAmount : customAmount || 0;
  const activeAmount = order
    ? isSplitBalanceOrder || selectedAmountType === 'BALANCE'
      ? balanceAmount > 0
        ? balanceAmount
        : totalAmount
      : totalAmount
    : customAmount || 0;

  const modalTitle = isSplitBalanceOrder
    ? 'Pay Remaining Balance via UPI'
    : title;

  // Standard UPI URI format
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    businessName
  )}&am=${activeAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    isSplitBalanceOrder
      ? `Balance Due for Order #${orderNum} - ${businessName}`
      : `Order #${orderNum} - ${businessName}`
  )}`;

  useEffect(() => {
    if (isOpen) {
      // Generate high-resolution QR code
      QRCode.toDataURL(upiUri, {
        width: 320,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then(url => {
          setQrDataUrl(url);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [isOpen, upiUri]);

  if (!isOpen) return null;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Bill_QR_Order_${orderNum}_INR_${activeAmount}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill QR Code - Order #${orderNum}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
            .card { max-width: 400px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 20px; padding: 24px; }
            h2 { margin: 0; font-size: 24px; color: #0f172a; }
            .amount { font-size: 32px; font-weight: 900; color: #4338ca; margin: 12px 0; }
            img { width: 260px; height: 260px; }
            .upi { font-family: monospace; font-size: 14px; background: #f1f5f9; padding: 6px 12px; border-radius: 6px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>${businessName}</h2>
            <p>Scan to Pay for Order #${orderNum}</p>
            <div class="amount">₹${activeAmount.toLocaleString()}</div>
            <img src="${qrDataUrl}" alt="UPI QR" />
            <br />
            <p>UPI ID: <span class="upi">${upiId}</span></p>
            <p style="font-size: 11px; color: #64748b;">Accepted on Google Pay, PhonePe, Paytm & all UPI Apps</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col transition-colors">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                {modalTitle}
              </h3>
              <p className="text-[10px] text-purple-200">
                {isSplitBalanceOrder ? 'Settle Remaining Split Order Balance' : 'Instant UPI Payment Settlement'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 text-center space-y-4 text-xs overflow-y-auto">
          {/* If Split Order with Advance Already Paid -> Show Balance Due Info Badge */}
          {isSplitBalanceOrder ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2.5 rounded-xl text-left flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block">
                  Advance Paid: ₹{order?.paidAmount.toLocaleString()}
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  Remaining Balance: ₹{balanceAmount.toLocaleString()}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                Split Balance
              </span>
            </div>
          ) : (
            /* Bill Target & Switcher (if regular order has both total & balance) */
            order && order.balanceAmount > 0 && order.balanceAmount !== order.grandTotal && (
              <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedAmountType('TOTAL')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedAmountType === 'TOTAL'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Total Bill (₹{totalAmount.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAmountType('BALANCE')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedAmountType === 'BALANCE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Balance Due (₹{balanceAmount.toLocaleString()})
                </button>
              </div>
            )
          )}

          {/* Amount Display */}
          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 p-4 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 tracking-wider">
              {isSplitBalanceOrder || selectedAmountType === 'BALANCE'
                ? 'Balance Amount to Pay'
                : 'Total Bill Amount to Pay'}
            </span>
            <div className="flex items-center justify-center gap-1 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white my-1">
              <span className="text-purple-600 dark:text-purple-400">₹</span>
              <span>{activeAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Order #{orderNum}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{custName}</span>
            </div>
          </div>

          {/* High-res Scannable QR Code Stage */}
          <div className="relative mx-auto w-56 h-56 bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-xl flex items-center justify-center overflow-hidden group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="UPI Payment QR Code"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
            )}

            {/* Corner Decorative Target Accents */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-purple-600" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-purple-600" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-purple-600" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-purple-600" />
          </div>

          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Scan using any UPI App (GPay, PhonePe, Paytm, BHIM)</span>
          </p>

          {/* UPI ID Copy Card */}
          <div className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl flex items-center justify-between gap-2">
            <div className="text-left min-w-0">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Verified Business UPI ID</span>
              <span className="font-mono font-black text-xs text-slate-900 dark:text-white truncate block">
                {upiId}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyUPI}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy UPI</span>
                </>
              )}
            </button>
          </div>

          {/* App Deeplink Trigger on Mobile */}
          <div className="pt-1 flex items-center justify-center gap-2">
            <a
              href={upiUri}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in UPI App Directly</span>
            </a>
          </div>

          {/* Utility Action Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDownloadQR}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save QR Image</span>
            </button>

            <button
              type="button"
              onClick={handlePrintQR}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
