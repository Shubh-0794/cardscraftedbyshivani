import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product, Order } from '../types';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CraftCheckoutModal } from '../components/catalog/CraftCheckoutModal';
import { exportProductsToExcel } from '../utils/excelExport';
import {
  PackageCheck,
  PlusCircle,
  Search,
  Tag,
  Edit2,
  Package,
  Boxes,
  TrendingUp,
  Image as ImageIcon,
  ShoppingBag,
  ShoppingCart,
  Zap,
  Check,
  Sparkles,
  ArrowRight,
  Truck,
  Heart,
  FileSpreadsheet,
  Download
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Resin Products',
  'Invitations',
  'Custom Printing',
  'Gift Items',
  'Handmade Crafts'
];

interface ProductsPageProps {
  onNavigateToOrders?: () => void;
  onNavigateToCart?: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  onNavigateToOrders,
  onNavigateToCart
}) => {
  const { isCustomer, isSuperAdmin } = useAuth();
  const {
    cart,
    totalItems,
    subtotal,
    addToCart,
    buyNow,
    updateQuantity,
    updateNote,
    removeItem,
    clearCart,
    isCheckoutOpen,
    checkoutInitialStep,
    openCheckout,
    closeCheckout,
    justAddedId
  } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Add / Edit Product Modal State (Admin)
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Resin Products');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState(1200);
  const [costPrice, setCostPrice] = useState(450);
  const [taxPercent, setTaxPercent] = useState(12);
  const [stockQuantity, setStockQuantity] = useState(20);
  const [minStock, setMinStock] = useState(5);
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const prodData = await api.getProducts();
      setProducts(prodData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addToCart(product);
  };

  const handleBuyNow = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    buyNow(product);
  };

  // Admin Modal Functions
  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Resin Products');
    setDescription('');
    setSellingPrice(1200);
    setCostPrice(450);
    setTaxPercent(12);
    setStockQuantity(20);
    setMinStock(5);
    setImageUrl('');
    setShowModal(true);
  };

  const openEditModal = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category);
    setDescription(prod.description || '');
    setSellingPrice(prod.sellingPrice);
    setCostPrice(prod.costPrice || 0);
    setTaxPercent(prod.taxPercent || 12);
    setStockQuantity(prod.stockQuantity || 0);
    setMinStock(prod.minStock || 5);
    setImageUrl(prod.imageUrl || '');
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name,
          category,
          description,
          sellingPrice: Number(sellingPrice),
          costPrice: Number(costPrice),
          taxPercent: Number(taxPercent),
          stockQuantity: Number(stockQuantity),
          minStock: Number(minStock),
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400'
        });
      } else {
        await api.createProduct({
          name,
          category,
          description,
          sellingPrice: Number(sellingPrice),
          costPrice: Number(costPrice),
          taxPercent: Number(taxPercent),
          stockQuantity: Number(stockQuantity),
          minStock: Number(minStock),
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400',
          status: 'ACTIVE'
        });
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartValue = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold tracking-wide">Loading Craft Catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-slate-700/80 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-extrabold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            Handcrafted Art & Gifts
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Craft Catalog & Studio Store
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Explore personalized handmade resin gifts, custom invitations, bookmarks, and artisanal craft pieces. Direct workshop ordering with doorstep delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Cart / Bag Button */}
          {isCustomer && (
            <button
              type="button"
              onClick={() => {
                if (onNavigateToCart) {
                  onNavigateToCart();
                } else {
                  openCheckout('CART');
                }
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-102"
              title="Go to Add To Cart Tab"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart ({totalItems})</span>
              {subtotal > 0 && (
                <span className="bg-black/30 px-2 py-0.5 rounded-lg text-[11px] font-mono">
                  ₹{(subtotal || 0).toLocaleString()}
                </span>
              )}
            </button>
          )}

          {/* Export Products to Excel */}
          <button
            type="button"
            onClick={() => exportProductsToExcel(filteredProducts.length > 0 ? filteredProducts : products)}
            className="p-2.5 sm:px-3.5 sm:py-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
            title="Download Product Catalog as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Admin Add Product Button */}
          {isSuperAdmin && (
            <button
              onClick={openAddModal}
              title="Add Product"
              className="p-2.5 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search handcrafted gifts, SKU, resin..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> product{filteredProducts.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 shadow-xs">
          <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No craft items found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || selectedCategory !== 'All'
              ? 'Try changing your search keywords or category filter.'
              : 'Our studio is crafting new items. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(prod => {
            const inCart = cart.find(i => i.product.id === prod.id);
            const isJustAdded = justAddedId === prod.id;

            return (
              <div
                key={prod.id}
                className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md group"
              >
                <div>
                  {/* Product Image Stage */}
                  <div className="h-44 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-slate-900/80 text-white font-mono font-bold text-[10px] rounded-md backdrop-blur-xs">
                      {prod.sku}
                    </span>
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded-md shadow-xs">
                      {prod.category}
                    </span>

                    {/* In-Stock Tag */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-emerald-400 rounded-md border border-slate-700">
                        ✓ In Stock ({prod.stockQuantity})
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3 text-xs">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-500 transition-colors">
                        {prod.name}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px] mt-0.5 leading-relaxed">
                        {prod.description || 'Artisanal handmade craft item with premium materials.'}
                      </p>
                    </div>

                    {/* Price & Badge */}
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Price</span>
                        <p className="font-black text-slate-900 dark:text-white text-base flex items-baseline gap-0.5">
                          <span className="text-blue-500 font-sans">₹</span>
                          {(prod.sellingPrice || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-pink-500/10 text-pink-500 border border-pink-500/20">
                          Handmade
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions (Add to Cart / Buy Now / Edit) */}
                <div className="p-4 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      onClick={e => handleAddToCart(prod, e)}
                      className={`py-2 px-2 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        isJustAdded
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : inCart
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added!</span>
                        </>
                      ) : inCart ? (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>In Bag ({inCart.quantity})</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Bag</span>
                        </>
                      )}
                    </button>

                    {/* Buy Now Button */}
                    <button
                      type="button"
                      onClick={e => handleBuyNow(prod, e)}
                      className="py-2 px-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer hover:scale-102"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Buy Now</span>
                    </button>
                  </div>

                  {/* Admin Quick Edit Button */}
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={e => openEditModal(prod, e)}
                      className="w-full py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer border border-dashed border-slate-300 dark:border-slate-700"
                    >
                      <Edit2 className="w-3 h-3 text-blue-500" />
                      <span>Edit Catalog Specs</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Sticky Cart Bar if cart has items */}
      {cart.length > 0 && isCustomer && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg bg-[#0f172a]/95 backdrop-blur-md border border-slate-700 shadow-2xl p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onNavigateToCart ? onNavigateToCart() : openCheckout('CART')}
          >
            <div className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-md">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-white">
                {totalItems} Craft Item{totalItems > 1 ? 's' : ''} in Cart
              </p>
              <p className="text-[11px] text-slate-400">
                Subtotal: <strong className="text-pink-400 font-mono">₹{(subtotal || 0).toLocaleString()}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToCart && (
              <button
                type="button"
                onClick={onNavigateToCart}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer transition-all"
              >
                View Cart Tab
              </button>
            )}
            <button
              type="button"
              onClick={() => openCheckout('SHIPPING')}
              className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
            >
              <span>Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Craft Checkout & Shipping Details Modal */}
      <CraftCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={closeCheckout}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onUpdateNote={updateNote}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        onOrderSuccess={order => {
          console.log('Order completed:', order);
          clearCart();
          if (onNavigateToOrders) onNavigateToOrders();
        }}
        onNavigateToOrders={onNavigateToOrders}
        initialStep={checkoutInitialStep}
      />

      {/* Admin Add / Edit Product Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
        subtitle={editingProduct ? 'Update product pricing, stock & details' : 'Create craft catalog item'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Resin Floral Coaster Set"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 font-medium"
              >
                {CATEGORIES.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Image URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Artisan notes, dimensions, custom possibilities..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={sellingPrice}
                onChange={e => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cost Price (₹)</label>
              <input
                type="number"
                min="0"
                value={costPrice}
                onChange={e => setCostPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Stock Units</label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={e => setStockQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
