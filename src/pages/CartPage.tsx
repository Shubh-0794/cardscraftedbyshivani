import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Product, Order } from '../types';
import { api } from '../services/api';
import { CraftCheckoutModal } from '../components/catalog/CraftCheckoutModal';
import {
  ShoppingCart,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Store,
  Building2,
  IndianRupee,
  Gift,
  FileText,
  Clock,
  CheckCircle2,
  Package,
  Boxes,
  Heart,
  ChevronRight,
  Printer
} from 'lucide-react';

interface CartPageProps {
  onNavigateToCatalog?: () => void;
  onNavigateToOrders?: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  onNavigateToCatalog,
  onNavigateToOrders
}) => {
  const {
    cart,
    totalItems,
    subtotal,
    updateQuantity,
    updateNote,
    removeItem,
    clearCart,
    addToCart,
    isCheckoutOpen,
    checkoutInitialStep,
    openCheckout,
    closeCheckout,
    justAddedId
  } = useCart();

  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<'PICKUP' | 'DELIVERY'>('DELIVERY');

  useEffect(() => {
    // Load active products to recommend
    api.getProducts()
      .then(prods => {
        const active = prods.filter(p => p.status === 'ACTIVE' && p.stockQuantity > 0);
        setRecommendedProducts(active.slice(0, 4));
      })
      .catch(err => console.error('Failed to load recommended crafts', err));
  }, []);

  // Shipping & Tax estimation based on chosen shipping method
  const shippingCharge = selectedShippingMethod === 'PICKUP' ? 0 : (subtotal > 999 || subtotal === 0 ? 0 : 80);
  const estimatedTax = Math.round(subtotal * 0.12);
  const estimatedGrandTotal = subtotal + shippingCharge + estimatedTax;

  const handleOrderSuccess = (order: Order) => {
    clearCart();
    if (onNavigateToOrders) {
      onNavigateToOrders();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2">
            <ShoppingCart className="w-3.5 h-3.5 text-pink-300" />
            <span>Customer Shopping Cart</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <span>Your Craft Cart</span>
            {totalItems > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 bg-pink-500 text-white rounded-full">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
            )}
          </h1>
          <p className="text-xs text-purple-200 mt-1">
            Review custom handicrafts, add engraving instructions, and proceed with direct checkout.
          </p>
        </div>

        {totalItems > 0 && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={clearCart}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white/90 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
              title="Clear all items from cart"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cart</span>
            </button>
            <button
              type="button"
              onClick={() => openCheckout('SHIPPING')}
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer transform hover:scale-102"
            >
              <span>Checkout Now (₹{subtotal.toLocaleString()})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Cart Content Area */}
      {cart.length === 0 ? (
        /* Empty Cart State */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
            <ShoppingBag className="w-10 h-10" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Your Craft Cart is Currently Empty
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Explore our collection of custom resin art, bespoke luxury invitation suites, handmade personalized gifts, and craft creations!
            </p>
          </div>

          {onNavigateToCatalog && (
            <div>
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer hover:scale-103"
              >
                <Sparkles className="w-4 h-4" />
                <span>Explore Craft Catalog & Add Items</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Suggestions Strip */}
          {recommendedProducts.length > 0 && (
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 text-left space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Popular Handcrafted Items You Might Love
                </h3>
                {onNavigateToCatalog && (
                  <button
                    onClick={onNavigateToCatalog}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Catalog</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {recommendedProducts.map(prod => (
                  <div
                    key={prod.id}
                    className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 flex flex-col justify-between space-y-3 hover:border-purple-400 dark:hover:border-purple-500 transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="w-full h-32 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-black/60 backdrop-blur-md text-white">
                          {prod.category}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {prod.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {prod.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="font-black text-sm text-purple-700 dark:text-purple-300">
                        ₹{(prod.sellingPrice || 0).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(prod, 1)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                          justAddedId === prod.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                        }`}
                      >
                        {justAddedId === prod.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Active Cart Layout: Items + Order Summary */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Cart Items (2 Columns wide on LG) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Craft Items in Cart ({cart.length})
              </span>
              {onNavigateToCatalog && (
                <button
                  type="button"
                  onClick={onNavigateToCatalog}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More Products from Catalog</span>
                </button>
              )}
            </div>

            {/* List of Cart Items */}
            <div className="space-y-3.5">
              {cart.map(item => {
                const itemTotal = (item.product.sellingPrice || 0) * item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Product Thumbnail */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/80 relative">
                        {item.product.category === 'DOCUMENT_PRINTING' ? (
                          item.product.imageUrl && item.product.imageUrl.startsWith('data:image/') ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-blue-50 dark:bg-blue-950/60 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 p-2 text-center">
                              <Printer className="w-7 h-7 mb-1" />
                              <span className="text-[9px] font-black uppercase">Print</span>
                            </div>
                          )
                        ) : item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                          {item.product.sku}
                        </span>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 ${
                              item.product.category === 'DOCUMENT_PRINTING'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            }`}>
                              {item.product.category === 'DOCUMENT_PRINTING' ? 'DOCUMENT PRINT' : item.product.category}
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                              {item.product.name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.product.description}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          {/* Unit Price & Subtotal */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black text-slate-900 dark:text-white">
                              ₹{(itemTotal || 0).toLocaleString()}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-xs font-semibold text-slate-400">
                                (₹{item.product.sellingPrice} each)
                              </span>
                            )}
                          </div>

                          {/* Quantity Stepper */}
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-2 shadow-inner">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer shadow-xs"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center font-black text-xs text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer shadow-xs"
                              title="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Custom Personalization Note Input */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Custom Engraving / Personalization Details for this Item:
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Add name 'Aarav & Riya', Wedding Date '14 Dec 2026', Gold Foil finish..."
                        value={item.customNote || ''}
                        onChange={e => updateNote(item.product.id, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trust & Craft Workshop Guarantee Strip */}
            <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-2xl flex flex-wrap items-center justify-around gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>100% Handcrafted</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Express Craft Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Live WhatsApp Updates</span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout Action */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Order Summary
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Fulfillment / Shipping Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Choose Fulfillment Mode:
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setSelectedShippingMethod('PICKUP')}
                    className={`py-2 px-2 rounded-xl text-left flex flex-col justify-between transition-all cursor-pointer ${
                      selectedShippingMethod === 'PICKUP'
                        ? 'bg-emerald-600 text-white font-black shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Store className="w-3 h-3 shrink-0" />
                      <span className="text-[10px] font-extrabold truncate">Self Pickup</span>
                    </div>
                    <span className={`text-[9px] font-black mt-0.5 ${selectedShippingMethod === 'PICKUP' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      FREE (₹0)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedShippingMethod('DELIVERY')}
                    className={`py-2 px-2 rounded-xl text-left flex flex-col justify-between transition-all cursor-pointer ${
                      selectedShippingMethod === 'DELIVERY'
                        ? 'bg-purple-600 text-white font-black shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Truck className="w-3 h-3 shrink-0" />
                      <span className="text-[10px] font-extrabold truncate">Doorstep</span>
                    </div>
                    <span className={`text-[9px] font-bold mt-0.5 ${selectedShippingMethod === 'DELIVERY' ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {subtotal > 999 ? 'FREE' : '+₹80'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{(subtotal || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>GST / Tax (12% Included)</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{(estimatedTax || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    {selectedShippingMethod === 'PICKUP' ? (
                      <Store className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {selectedShippingMethod === 'PICKUP' ? 'Self Pickup (Studio Point)' : 'Delivery Charges'}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {shippingCharge === 0 ? 'FREE' : `₹${shippingCharge}`}
                  </span>
                </div>

                {selectedShippingMethod === 'PICKUP' ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    🏪 Collect directly from Studio Counter (No shipping fee)
                  </p>
                ) : (
                  shippingCharge === 0 && subtotal > 999 && (
                    <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                      ✓ You qualified for Free Studio Express Shipping!
                    </p>
                  )
                )}

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    Estimated Total
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-purple-700 dark:text-purple-300">
                      ₹{(estimatedGrandTotal || 0).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-slate-400">Final bill confirmed at checkout</p>
                  </div>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={() => openCheckout('SHIPPING')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-102"
              >
                <span>Proceed to Shipping & Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => openCheckout('CART')}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Complete Checkout Sheet</span>
              </button>

              {/* Trust Badges */}
              <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Secure UPI QR & Advance Split Options</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Direct Craft Status Tracking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Craft Checkout Modal */}
      {isCheckoutOpen && (
        <CraftCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={closeCheckout}
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onUpdateNote={updateNote}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          onOrderSuccess={handleOrderSuccess}
          onNavigateToOrders={onNavigateToOrders}
          initialStep={checkoutInitialStep}
          initialShippingMethod={selectedShippingMethod}
        />
      )}
    </div>
  );
};
