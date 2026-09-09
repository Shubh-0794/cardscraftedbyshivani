import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Product, Order, PrintDocumentConfig } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useGoogleDrive } from '../../context/GoogleDriveContext';
import { getFileBlob } from '../../utils/fileStorage';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Phone,
  User as UserIcon,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Truck,
  Building2,
  Store,
  Clock,
  ShieldCheck,
  QrCode,
  IndianRupee,
  X,
  FileText,
  CloudCheck,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Lock,
  BadgeCheck
} from 'lucide-react';
import { WhatsAppBtn } from '../common/WhatsAppBtn';
import { BillQRCodeModal } from '../common/BillQRCodeModal';

const PREDEFINED_UPI_ID = 'shiv.khante5-2@okaxis';
const PREDEFINED_PAYEE_NAME = 'Cards Crafted (Shiv Khante)';

export interface CartItem {
  product: Product;
  quantity: number;
  customNote?: string;
  printConfig?: PrintDocumentConfig;
}

interface CraftCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateNote: (productId: string, note: string) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
  onNavigateToOrders?: () => void;
  initialStep?: 'CART' | 'SHIPPING';
  initialShippingMethod?: 'PICKUP' | 'DELIVERY';
}

export const CraftCheckoutModal: React.FC<CraftCheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onUpdateNote,
  onRemoveItem,
  onClearCart,
  onOrderSuccess,
  onNavigateToOrders,
  initialStep = 'CART',
  initialShippingMethod = 'DELIVERY'
}) => {
  const { user } = useAuth();
  const { isConnected: isDriveConnected, uploadCustomerFileToDrive } = useGoogleDrive();
  const [currentStep, setCurrentStep] = useState<'CART' | 'SHIPPING' | 'PAYMENT_VERIFY' | 'SUCCESS'>('CART');
  const [driveSavedCount, setDriveSavedCount] = useState<number>(0);
  const [driveSavedPath, setDriveSavedPath] = useState<string>('');

  // Shipping Method Selection: 'PICKUP' (Free from Studio Pickup Point) vs 'DELIVERY' (Doorstep with Shipping Charges)
  const [shippingMethod, setShippingMethod] = useState<'PICKUP' | 'DELIVERY'>(initialShippingMethod);

  // Customer Shipping / Contact Form State
  const [recipientName, setRecipientName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('400001');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Payment Method State: 100% Full UPI Payment or Advance UPI Split
  const [paymentPlan, setPaymentPlan] = useState<'FULL_UPI' | 'ADVANCE_SPLIT'>('FULL_UPI');
  const [advancePercent, setAdvancePercent] = useState<number>(30); // 30% default advance
  const [customAdvance, setCustomAdvance] = useState<string>('');

  // Payment Verification State
  const [utrNumber, setUtrNumber] = useState('');
  const [payerUpiId, setPayerUpiId] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPaymentData, setVerifiedPaymentData] = useState<any>(null);

  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [balanceQRModalOpen, setBalanceQRModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-populate customer profile address
  useEffect(() => {
    if (isOpen) {
      if (initialShippingMethod) {
        setShippingMethod(initialShippingMethod);
      }
      if (initialStep === 'SHIPPING' && cart.length > 0) {
        setCurrentStep('SHIPPING');
      } else {
        setCurrentStep('CART');
      }
      setErrorMessage('');
      setCompletedOrder(null);
      setDriveSavedCount(0);
      setDriveSavedPath('');
      setUtrNumber('');
      setPayerUpiId('');
      setVerifiedPaymentData(null);

      // Load profile info if available
      api.getMyCustomerProfile()
        .then(cust => {
          if (cust) {
            setRecipientName(cust.name || user?.name || '');
            setWhatsapp(cust.whatsapp || user?.whatsapp || '');
            setAlternatePhone(cust.alternatePhone || '');
            if (cust.address) setAddress(cust.address);
            if (cust.city) setCity(cust.city);
            if (cust.state) setState(cust.state);
            if (cust.pincode) setPincode(cust.pincode);
          }
        })
        .catch(() => {
          if (user) {
            setRecipientName(user.name || '');
            setWhatsapp(user.whatsapp || '');
          }
        });
    }
  }, [isOpen, initialStep, initialShippingMethod, user]);

  // Calculations
  const itemsSubtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const estimatedTax = Math.round(itemsSubtotal * 0.12); // 12% GST standard
  const deliveryCharge = shippingMethod === 'PICKUP' ? 0 : (itemsSubtotal > 999 || itemsSubtotal === 0 ? 0 : 80);
  const grandTotal = itemsSubtotal + estimatedTax + deliveryCharge;

  // Advance Calculation
  const calculatedAdvance = paymentPlan === 'ADVANCE_SPLIT'
    ? (customAdvance && Number(customAdvance) > 0
        ? Math.min(grandTotal, Math.max(50, Number(customAdvance)))
        : Math.round(grandTotal * (advancePercent / 100)))
    : grandTotal;

  const payableAmountNow = Math.max(1, calculatedAdvance);
  const calculatedBalanceOnDelivery = Math.max(0, grandTotal - payableAmountNow);

  // Generate UPI URI specifically for predefined UPI ID: shiv.khante5-2@okaxis
  const upiUri = `upi://pay?pa=${encodeURIComponent(PREDEFINED_UPI_ID)}&pn=${encodeURIComponent(
    PREDEFINED_PAYEE_NAME
  )}&am=${payableAmountNow.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    `Order Payment - Cards Crafted`
  )}`;

  // Generate Dynamic QR Code whenever payment amount changes or user enters verification step
  useEffect(() => {
    if (isOpen && currentStep === 'PAYMENT_VERIFY') {
      QRCode.toDataURL(upiUri, {
        width: 260,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Error generating checkout QR:', err));
    }
  }, [isOpen, currentStep, upiUri, payableAmountNow]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(PREDEFINED_UPI_ID);
    setIsCopiedUpi(true);
    setTimeout(() => setIsCopiedUpi(false), 2500);
  };

  const handleProceedToShipping = () => {
    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add craft items first.');
      return;
    }
    setErrorMessage('');
    setCurrentStep('SHIPPING');
  };

  // Step 2 Validation: Check shipping fields and move to Step 3: PAYMENT_VERIFY
  const handleProceedToPaymentVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (shippingMethod === 'DELIVERY') {
      if (!recipientName.trim() || !whatsapp.trim() || !address.trim() || !city.trim() || !pincode.trim()) {
        setErrorMessage('Please fill in all required delivery details (Name, WhatsApp, Street Address, City, Pincode).');
        return;
      }
    } else {
      if (!recipientName.trim() || !whatsapp.trim()) {
        setErrorMessage('Please enter your Name and WhatsApp / Phone Number for pickup coordination.');
        return;
      }
    }

    if (cart.length === 0) {
      setErrorMessage('No products in cart.');
      return;
    }

    setCurrentStep('PAYMENT_VERIFY');
  };

  // Step 3: Verify Payment First, Then Place Order Only After Successful Verification
  const handleVerifyAndPlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUtr = utrNumber.trim().toUpperCase();
    if (!cleanUtr) {
      setErrorMessage('Please enter the 12-digit UPI Reference Number / UTR generated after paying to shiv.khante5-2@okaxis.');
      return;
    }

    if (cleanUtr.length < 8) {
      setErrorMessage('Invalid UPI Reference Number / UTR. Please enter a valid 12-digit UPI UTR from your payment app.');
      return;
    }

    setIsVerifying(true);
    try {
      // 1. FIRST: Verify Payment with Server
      const verifyRes = await api.verifyUpiPayment({
        utr: cleanUtr,
        amount: payableAmountNow,
        upiId: PREDEFINED_UPI_ID,
        payerUpi: payerUpiId.trim() || undefined
      });

      if (!verifyRes || !verifyRes.verified) {
        setErrorMessage(verifyRes?.message || 'Payment verification failed. Please check your transaction details and retry.');
        setIsVerifying(false);
        return;
      }

      setVerifiedPaymentData(verifyRes.data);

      // 2. SECOND: Once payment is verified, place the order
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        notes: item.customNote || ''
      }));

      const shippingAddressData = shippingMethod === 'PICKUP'
        ? {
            recipientName: recipientName.trim(),
            whatsapp: whatsapp.trim(),
            alternatePhone: alternatePhone.trim(),
            address: 'Studio Pickup Counter: 102 Creative Craft Lane, Handloom Market',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400012',
            deliveryNotes: deliveryNotes.trim()
              ? `[SELF PICKUP from Studio Point] ${deliveryNotes.trim()}`
              : '[SELF PICKUP from Studio Pickup Counter]',
            shippingMethod: 'PICKUP',
            isPickup: true
          }
        : {
            recipientName: recipientName.trim(),
            whatsapp: whatsapp.trim(),
            alternatePhone: alternatePhone.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            deliveryNotes: deliveryNotes.trim(),
            shippingMethod: 'DELIVERY',
            isPickup: false
          };

      const hasPrintItems = cart.some(c => c.printConfig || c.product.category === 'DOCUMENT_PRINTING');
      const primaryPrintConfig = cart.find(c => c.printConfig)?.printConfig;

      const orderPayload = {
        items: orderItems,
        orderType: hasPrintItems ? ('DOCUMENT_PRINTING' as const) : ('CRAFT' as const),
        status: hasPrintItems ? ('ORDER_RECEIVED' as const) : ('CONFIRMED' as const),
        shippingMethod,
        shippingAddress: shippingAddressData,
        customDetails: {
          designName: cart.map(c => c.product.name).join(' + '),
          description: hasPrintItems
            ? `Online document printing service (${cart.length} print job${cart.length > 1 ? 's' : ''})`
            : `Direct catalog order (${cart.length} craft item${cart.length > 1 ? 's' : ''})`,
          instructions: deliveryNotes.trim(),
          shippingAddress: shippingAddressData,
          printConfig: primaryPrintConfig,
          shippingMethod: shippingMethod === 'PICKUP' ? 'Self Pickup from Studio Point (FREE)' : 'Doorstep Delivery',
          paymentPlan: paymentPlan === 'ADVANCE_SPLIT'
            ? `Advance ₹${payableAmountNow} verified via UPI to ${PREDEFINED_UPI_ID} (UTR: ${cleanUtr}), balance ₹${calculatedBalanceOnDelivery} ${shippingMethod === 'PICKUP' ? 'on pickup' : 'on delivery'}`
            : `Paid 100% (₹${payableAmountNow}) verified via UPI to ${PREDEFINED_UPI_ID} (UTR: ${cleanUtr})`
        },
        deliveryCharge,
        tax: estimatedTax,
        priority: 'MEDIUM',
        expectedDeliveryDate: new Date(Date.now() + (hasPrintItems ? (shippingMethod === 'PICKUP' ? 1 : 2) : (shippingMethod === 'PICKUP' ? 3 : 6)) * 86400000).toISOString(),
        advancePayment: {
          amount: payableAmountNow,
          method: 'UPI',
          reference: cleanUtr
        }
      };

      const newOrder = await api.createOrder(orderPayload);
      setCompletedOrder(newOrder);

      // Auto sync documents in cart to Customer Google Drive folder
      if (isDriveConnected) {
        let syncedCount = 0;
        let lastPath = '';
        for (const item of cart) {
          const fileData = item.printConfig?.fileDataUrl || (item.product.id ? await getFileBlob(item.product.id) : null) || item.product.imageUrl;
          if (fileData && (fileData.startsWith('data:') || item.product.category === 'DOCUMENT_PRINTING')) {
            const fileName = item.printConfig?.documentName || `${item.product.name.replace(/\s+/g, '_')}.pdf`;
            const mimeType = item.printConfig?.documentType || 'application/pdf';
            const uploadRes = await uploadCustomerFileToDrive(
              fileData,
              fileName,
              mimeType,
              recipientName.trim(),
              `Order #${newOrder.orderNumber}`
            );
            if (uploadRes?.folderPath) {
              syncedCount++;
              lastPath = uploadRes.folderPath;
            }
          }
        }
        if (syncedCount > 0) {
          setDriveSavedCount(syncedCount);
          setDriveSavedPath(lastPath);
        }
      }

      setCurrentStep('SUCCESS');
      onClearCart();
      onOrderSuccess(newOrder);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed. Please ensure the payment is completed and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0f172a] border border-slate-700/90 text-white rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Craft Catalog Checkout
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {currentStep === 'CART' && 'Review your selected handmade craft items'}
                {currentStep === 'SHIPPING' && 'Enter shipping details & select UPI payment preference'}
                {currentStep === 'PAYMENT_VERIFY' && 'Pay to predefined UPI ID shiv.khante5-2@okaxis & verify payment to place order'}
                {currentStep === 'SUCCESS' && 'Order successfully verified & confirmed!'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        {currentStep !== 'SUCCESS' && (
          <div className="bg-slate-900/90 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep('CART')}
                className={`font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                  currentStep === 'CART'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>1. Cart</span>
              </button>
              <span className="text-slate-600">→</span>
              <button
                type="button"
                onClick={() => {
                  if (cart.length > 0) setCurrentStep('SHIPPING');
                }}
                disabled={cart.length === 0}
                className={`font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors ${
                  currentStep === 'SHIPPING'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
                }`}
              >
                <span>2. Details</span>
              </button>
              <span className="text-slate-600">→</span>
              <div
                className={`font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors ${
                  currentStep === 'PAYMENT_VERIFY'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>3. Verify UPI Payment</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official UPI: {PREDEFINED_UPI_ID}</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-700 text-rose-200 rounded-2xl font-bold flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-black text-rose-300">Payment / Order Requirement</p>
                <p className="text-[11px] text-rose-200">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: CART REVIEW */}
          {currentStep === 'CART' && (
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-sm font-bold text-slate-300">Your craft bag is empty</p>
                  <p className="text-xs text-slate-500">
                    Browse our craft catalog and click "Add to Bag" or "Buy Now" on any handmade piece.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Explore Catalog
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div
                        key={item.product.id}
                        className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.product.imageUrl || 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=200'}
                            alt={item.product.name}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                              {item.product.sku}
                            </span>
                            <h4 className="font-black text-white text-sm truncate">{item.product.name}</h4>
                            <p className="text-[11px] text-slate-400">
                              ₹{(item.product.sellingPrice || 0).toLocaleString()} each
                            </p>
                          </div>
                        </div>

                        {/* Quantity & Notes */}
                        <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2 shrink-0">
                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                className="p-1.5 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 font-black text-white text-xs">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                                className="p-1.5 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <span className="font-black text-blue-400 text-sm">
                              ₹{((item.product.sellingPrice || 0) * item.quantity).toLocaleString()}
                            </span>

                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.product.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder="Add customization note (e.g. names, theme, colors)..."
                            value={item.customNote || ''}
                            onChange={e => onUpdateNote(item.product.id, e.target.value)}
                            className="w-full sm:w-72 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-hidden focus:border-purple-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-2 mt-4">
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Items Subtotal ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)</span>
                      <span>₹{itemsSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Estimated GST (12%)</span>
                      <span>₹{estimatedTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Express Craft Shipping</span>
                      <span>{deliveryCharge === 0 ? <strong className="text-emerald-400">FREE</strong> : `₹${deliveryCharge}`}</span>
                    </div>
                    <div className="border-t border-slate-800 pt-2 flex justify-between text-white font-black text-sm">
                      <span>Grand Total</span>
                      <span className="text-blue-400 text-base">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={onClearCart}
                      className="text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer underline"
                    >
                      Clear Bag
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedToShipping}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
                    >
                      <span>Add Shipping Details & Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: SHIPPING ADDRESS DETAILS & PAYMENT PREFERENCE */}
          {currentStep === 'SHIPPING' && (
            <form onSubmit={handleProceedToPaymentVerification} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep('CART')}
                  className="text-slate-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Cart ({cart.length} items)</span>
                </button>

                <div className="text-right">
                  <span className="text-slate-400 text-[11px]">Payable Total: </span>
                  <strong className="text-blue-400 text-sm">₹{grandTotal.toLocaleString()}</strong>
                </div>
              </div>

              {/* Step 2.1: Shipping & Fulfillment Method Choice */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-xs flex items-center gap-2 text-pink-400">
                    <Truck className="w-4 h-4" />
                    1. Select Shipping / Pickup Method
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">2 Fulfillment Options</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Self Pick from Pickup Point (FREE) */}
                  <button
                    type="button"
                    onClick={() => setShippingMethod('PICKUP')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                      shippingMethod === 'PICKUP'
                        ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-emerald-950/70 border-emerald-500 text-white shadow-lg ring-2 ring-emerald-500/50'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          shippingMethod === 'PICKUP' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-black text-white text-xs block">Self Pick from Pickup Point</span>
                          <span className="text-[10px] text-emerald-400 font-bold">Free • Zero Shipping Fee</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                        FREE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      Collect directly from our studio workshop counter at your convenience. No delivery wait times!
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Ready in 1-2 business days • Mon-Sat 10am-8pm</span>
                    </div>
                  </button>

                  {/* Option B: Doorstep Delivery to Selected Address */}
                  <button
                    type="button"
                    onClick={() => setShippingMethod('DELIVERY')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                      shippingMethod === 'DELIVERY'
                        ? 'bg-gradient-to-br from-blue-950/90 via-slate-900 to-indigo-950/70 border-blue-500 text-white shadow-lg ring-2 ring-blue-500/50'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          shippingMethod === 'DELIVERY' ? 'bg-blue-500 text-white font-black' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-black text-white text-xs block">Your Selected Address</span>
                          <span className="text-[10px] text-blue-400 font-bold">Doorstep Courier Delivery</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        deliveryCharge === 0
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {deliveryCharge === 0 ? 'FREE' : `+₹${deliveryCharge}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      Delivered directly to your home, office, or gift recipient with protective shockproof packaging.
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>{itemsSubtotal > 999 ? 'Qualifies for Free Shipping (Cart > ₹999)' : 'Standard Shipping Fee: ₹80'}</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2.2: Pickup Details or Delivery Address Form */}
              {shippingMethod === 'PICKUP' ? (
                <div className="bg-slate-900/90 border border-emerald-900/50 p-4 rounded-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-white text-xs flex items-center gap-2 text-emerald-400">
                      <Building2 className="w-4 h-4" />
                      2. Studio Pickup Point Location & Contact Info
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold rounded-md">
                      ₹0 Shipping Charge
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-slate-300 text-[11px]">
                      <p className="font-bold text-white text-xs">Cards Crafted Studio Pickup Counter</p>
                      <p>102 Creative Craft Lane, Handloom Market, Near Central Plaza</p>
                      <p>Mumbai, Maharashtra - 400012</p>
                      <p className="text-emerald-400 text-[10px] font-medium pt-1">
                        Timings: Monday to Saturday, 10:00 AM – 8:00 PM • Helpline: +91 98200 11223
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Pickup Person Name *</label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Pooja Sharma"
                          value={recipientName || ''}
                          onChange={e => setRecipientName(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">WhatsApp / Phone (for Pickup OTP/Alert) *</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. 919820011223"
                          value={whatsapp || ''}
                          onChange={e => setWhatsapp(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Preferred Pickup Note / Estimated Pickup Time</label>
                    <input
                      type="text"
                      placeholder="e.g. Will pick up on Saturday afternoon, please keep gift ribbon ready"
                      value={deliveryNotes || ''}
                      onChange={e => setDeliveryNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-white text-xs flex items-center gap-2 text-pink-400">
                      <MapPin className="w-4 h-4" />
                      2. Delivery & Selected Shipping Address
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {deliveryCharge === 0 ? 'Free Delivery Applied' : `Shipping Fee: ₹${deliveryCharge}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Recipient Name *</label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Pooja Sharma"
                          value={recipientName || ''}
                          onChange={e => setRecipientName(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">WhatsApp / Phone Number *</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. 919820011223"
                          value={whatsapp || ''}
                          onChange={e => setWhatsapp(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-pink-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Street Address / Flat No / Landmark *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="House/Flat No, Apartment, Landmark, Locality..."
                      value={address || ''}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-pink-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={city || ''}
                        onChange={e => setCity(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={state || ''}
                        onChange={e => setState(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Pincode *</label>
                      <input
                        type="text"
                        required
                        value={pincode || ''}
                        onChange={e => setPincode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Special Craft Delivery Notes / Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Gift wrap with personalized ribbon, please pack extra fragile"
                      value={deliveryNotes || ''}
                      onChange={e => setDeliveryNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-pink-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 2.3: UPI Payment Preference Plan */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-xs flex items-center gap-2 text-purple-400">
                    <QrCode className="w-4 h-4" />
                    3. Choose UPI Payment Plan (To Predefined UPI: {PREDEFINED_UPI_ID})
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Verified Official UPI
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: 100% Full UPI Payment */}
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('FULL_UPI')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      paymentPlan === 'FULL_UPI'
                        ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-indigo-500 text-white shadow-lg ring-2 ring-indigo-500/50'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <QrCode className="w-5 h-5 text-indigo-400" />
                      <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full">
                        100% Full Pay
                      </span>
                    </div>
                    <span className="font-bold text-white text-xs">Full UPI Payment (₹{grandTotal.toLocaleString()})</span>
                    <span className="text-[10px] text-slate-400 mt-1">Pay entire amount now to {PREDEFINED_UPI_ID}</span>
                  </button>

                  {/* Option 2: Advance Split via UPI */}
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('ADVANCE_SPLIT')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      paymentPlan === 'ADVANCE_SPLIT'
                        ? 'bg-gradient-to-br from-purple-950 via-slate-900 to-pink-950 border-purple-500 text-white shadow-lg ring-2 ring-purple-500/50'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <IndianRupee className="w-5 h-5 text-purple-400" />
                      <span className="text-[10px] font-black px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full">
                        Advance Split
                      </span>
                    </div>
                    <span className="font-bold text-white text-xs">Advance UPI + Rest on Handover</span>
                    <span className="text-[10px] text-slate-400 mt-1">Pay partial booking advance via UPI now</span>
                  </button>
                </div>

                {/* Sub-options for Advance Split */}
                {paymentPlan === 'ADVANCE_SPLIT' && (
                  <div className="mt-2 p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Select Advance Amount to Pay via UPI Now:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[25, 30, 50].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setAdvancePercent(pct);
                              setCustomAdvance('');
                            }}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                              !customAdvance && advancePercent === pct
                                ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                                : 'bg-slate-900 text-purple-300 border-purple-800 hover:border-purple-600'
                            }`}
                          >
                            {pct}% (₹{Math.round(grandTotal * (pct / 100))})
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-950 border border-purple-900/60 rounded-lg">
                        <span className="text-[10px] text-purple-300 block font-bold">UPI Advance Payable Now:</span>
                        <strong className="text-emerald-400 text-sm">₹{payableAmountNow.toLocaleString()}</strong>
                      </div>
                      <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-bold">Balance on Delivery/Pickup:</span>
                        <strong className="text-amber-400 text-sm">₹{calculatedBalanceOnDelivery.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Proceed to UPI Payment & Verification */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101"
                >
                  <Lock className="w-4 h-4" />
                  <span>Proceed to UPI Payment & Verification (Pay ₹{payableAmountNow.toLocaleString()})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: UPI PAYMENT & MANDATORY VERIFICATION BEFORE ORDER PLACEMENT */}
          {currentStep === 'PAYMENT_VERIFY' && (
            <form onSubmit={handleVerifyAndPlaceOrder} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep('SHIPPING')}
                  className="text-slate-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Shipping Details</span>
                </button>

                <div className="text-right">
                  <span className="text-slate-400 text-[11px]">Amount to Pay Now: </span>
                  <strong className="text-emerald-400 text-base font-black">₹{payableAmountNow.toLocaleString()}</strong>
                </div>
              </div>

              {/* Verification Mandatory Notice */}
              <div className="p-3.5 bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/50 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-amber-200 flex items-center gap-2">
                    Payment Verification Required Before Order Confirmation
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Please transfer exactly <strong className="text-emerald-400">₹{payableAmountNow.toLocaleString()}</strong> to our predefined official UPI ID: <strong className="text-white font-mono">{PREDEFINED_UPI_ID}</strong>. Once payment is done, enter your 12-digit UPI UTR / Bank Reference Number below to verify and automatically place your order.
                  </p>
                </div>
              </div>

              {/* UPI Details & Dynamic QR Code Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl">
                {/* Left Column: QR Code & Direct UPI App Deep Link */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3">
                  <span className="text-[11px] font-black uppercase text-purple-300 flex items-center gap-1.5 tracking-wider">
                    <QrCode className="w-4 h-4 text-purple-400" />
                    Scan & Pay via Any UPI App
                  </span>

                  {qrCodeDataUrl ? (
                    <div className="p-2.5 bg-white rounded-2xl shadow-xl border-2 border-purple-500/40 inline-block">
                      <img
                        src={qrCodeDataUrl}
                        alt="UPI Payment QR Code"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 animate-pulse">
                      Generating QR...
                    </div>
                  )}

                  <div className="text-center space-y-1 w-full">
                    <p className="text-[10px] text-slate-400 font-medium">
                      Google Pay • PhonePe • Paytm • BHIM • Cred
                    </p>
                    <a
                      href={upiUri}
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Directly in UPI App</span>
                    </a>
                  </div>
                </div>

                {/* Right Column: Predefined UPI Details & Verification Form */}
                <div className="space-y-3.5 flex flex-col justify-between">
                  {/* Verified Predefined UPI Info Card */}
                  <div className="p-3.5 bg-slate-950/80 border border-purple-900/60 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400">Predefined Business UPI ID</span>
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Verified Receiver
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="min-w-0 pr-2">
                        <span className="font-mono font-bold text-xs text-purple-300 block truncate select-all">
                          {PREDEFINED_UPI_ID}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {PREDEFINED_PAYEE_NAME}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-2.5 py-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        {isCopiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy UPI</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Amount Due:</span>
                      <strong className="text-emerald-400 font-mono text-sm">₹{payableAmountNow.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Verification Input Form */}
                  <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                    <div>
                      <label className="block font-black text-slate-200 mb-1 text-xs flex items-center justify-between">
                        <span>12-Digit UPI Reference Number / UTR *</span>
                        <span className="text-[10px] text-purple-400 font-bold">Required to Place Order</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 423819283741 or UPI Ref ID"
                        value={utrNumber || ''}
                        onChange={e => setUtrNumber(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-slate-900 border border-purple-500/60 focus:border-purple-400 rounded-xl text-white font-mono font-bold text-xs tracking-wider placeholder:font-normal placeholder:text-slate-600 focus:outline-hidden"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Found in your GPay / PhonePe / Paytm / Bank payment receipt as UPI Ref No. or UTR.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1 text-xs">
                        Your UPI ID / Sender Mobile Number (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. yourname@okaxis or 9820011223"
                        value={payerUpiId || ''}
                        onChange={e => setPayerUpiId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-medium text-xs focus:outline-hidden focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification & Order Placement Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifying || !utrNumber.trim()}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying UPI Payment with {PREDEFINED_UPI_ID} & Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Verify UPI Payment & Place Order (₹{payableAmountNow.toLocaleString()})</span>
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-slate-400 mt-2">
                  🔒 Order is strictly created and submitted to the workshop only after payment verification with UPI ID {PREDEFINED_UPI_ID}.
                </p>
              </div>
            </form>
          )}

          {/* STEP 4: ORDER SUCCESS CONFIRMATION */}
          {currentStep === 'SUCCESS' && completedOrder && (
            <div className="py-6 px-3 text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[11px] font-extrabold">
                  ✓ Payment Verified & Order Successfully Placed!
                </span>
                <h3 className="text-xl font-black text-white">Order #{completedOrder.orderNumber}</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Thank you, <strong>{recipientName}</strong>! Your payment of <strong>₹{payableAmountNow.toLocaleString()}</strong> to <strong>{PREDEFINED_UPI_ID}</strong> has been verified. Your handmade craft order has been booked in our workshop.
                </p>
              </div>

              {/* Order & Payment Details Card */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl max-w-md mx-auto text-left text-xs space-y-2.5">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total Order Amount:</span>
                  <strong className="text-white font-mono text-sm">₹{(completedOrder.grandTotal || 0).toLocaleString()}</strong>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Verified Payment (UPI):</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ₹{payableAmountNow.toLocaleString()} (UTR: {utrNumber || 'VERIFIED'})
                  </span>
                </div>

                {completedOrder.balanceAmount > 0 && (
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Balance on Handover:</span>
                    <strong className="text-amber-400 font-mono">₹{completedOrder.balanceAmount.toLocaleString()}</strong>
                  </div>
                )}

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Fulfillment Mode:</span>
                  <strong className={completedOrder.shippingMethod === 'PICKUP' ? 'text-emerald-400' : 'text-blue-400'}>
                    {completedOrder.shippingMethod === 'PICKUP' ? '🏪 Studio Self Pickup (Free)' : '🚚 Doorstep Delivery'}
                  </strong>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{completedOrder.shippingMethod === 'PICKUP' ? 'Ready for Pickup:' : 'Target Delivery:'}</span>
                  <strong className="text-white">
                    {new Date(completedOrder.expectedDeliveryDate).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </strong>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{completedOrder.shippingMethod === 'PICKUP' ? 'Pickup Counter:' : 'Shipping Address:'}</span>
                  <span className="text-white text-right max-w-[200px] truncate">
                    {completedOrder.shippingMethod === 'PICKUP' ? 'Cards Crafted Studio Counter (102 Creative Craft Lane)' : `${address}, ${city} - ${pincode}`}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Ordered Items ({completedOrder.items.length}):</span>
                  <ul className="space-y-1 pl-2">
                    {completedOrder.items.map(item => (
                      <li key={item.id} className="text-slate-200 flex justify-between">
                        <span>• {item.productName} (x{item.quantity})</span>
                        <span className="text-slate-400">₹{(item.totalPrice || 0).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {driveSavedCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-xl border border-emerald-800/40">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CloudCheck className="w-3.5 h-3.5" />
                      <span>{driveSavedCount} Document{driveSavedCount > 1 ? 's' : ''} uploaded to Google Drive</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                      {driveSavedPath || 'Customer & Date Folder'}
                    </span>
                  </div>
                )}
              </div>

              {/* Split Balance Due Payment Card */}
              {completedOrder.balanceAmount > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider">
                        Advance Paid: ₹{payableAmountNow.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Split Payment Plan</span>
                    </div>
                    <h4 className="text-sm font-black text-white">
                      Remaining Balance: <span className="text-amber-400 font-mono text-base">₹{completedOrder.balanceAmount.toLocaleString()}</span>
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      You can settle the remaining balance right now using UPI or at the time of delivery/handover.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBalanceQRModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay Balance (₹{completedOrder.balanceAmount.toLocaleString()})</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <WhatsAppBtn
                  phone={whatsapp}
                  customerName={recipientName}
                  orderNumber={completedOrder.orderNumber}
                  messageType="confirmed"
                  customMessage={`Hi Cards Crafted Studio! I have just paid ₹${payableAmountNow} via UPI to ${PREDEFINED_UPI_ID} (UTR: ${utrNumber}) and placed order #${completedOrder.orderNumber}. Looking forward to the handmade craft piece!`}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold"
                >
                  <span>Send WhatsApp Confirmation</span>
                </WhatsAppBtn>

                {onNavigateToOrders && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToOrders();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Track in My Orders</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Balance Payment UPI Modal */}
      {completedOrder && (
        <BillQRCodeModal
          isOpen={balanceQRModalOpen}
          onClose={() => setBalanceQRModalOpen(false)}
          order={completedOrder}
          defaultMode="BALANCE"
          title={`Pay Balance Due (Order #${completedOrder.orderNumber})`}
        />
      )}
    </div>
  );
};
