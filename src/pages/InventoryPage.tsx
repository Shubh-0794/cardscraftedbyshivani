import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { InventoryItem, StockMovementType, PurchaseChannel, OnlinePurchasePlatform } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { exportInventoryToExcel } from '../utils/excelExport';
import { GoogleSheetsHubModal } from '../components/sheets/GoogleSheetsHubModal';
import {
  Boxes,
  PlusCircle,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Globe,
  Store,
  ShoppingCart,
  Pencil,
  Building2,
  Tag,
  Receipt,
  Layers,
  ChevronDown
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [showSheetsModal, setShowSheetsModal] = useState(false);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'RAW_MATERIAL' | 'FINISHED_PRODUCT' | 'PACKAGING' | 'ACCESSORIES' | 'CONSUMABLES'>('RAW_MATERIAL');
  const [unit, setUnit] = useState<'PCS' | 'SETS' | 'BOXES' | 'SHEETS' | 'METERS' | 'GRAMS' | 'KG' | 'LITRES'>('PCS');
  const [currentStock, setCurrentStock] = useState(50);
  const [minStock, setMinStock] = useState(10);
  const [purchasePrice, setPurchasePrice] = useState(150);
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('Rack A1');
  const [purchaseChannel, setPurchaseChannel] = useState<PurchaseChannel>('ONLINE');
  const [purchasePlatform, setPurchasePlatform] = useState<OnlinePurchasePlatform>('FLIPKART');
  const [purchasePlatformOther, setPurchasePlatformOther] = useState('');
  const [purchaseOrderRef, setPurchaseOrderRef] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Item Modal
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'RAW_MATERIAL' | 'FINISHED_PRODUCT' | 'PACKAGING' | 'ACCESSORIES' | 'CONSUMABLES'>('RAW_MATERIAL');
  const [editUnit, setEditUnit] = useState<'PCS' | 'SETS' | 'BOXES' | 'SHEETS' | 'METERS' | 'GRAMS' | 'KG' | 'LITRES'>('PCS');
  const [editCurrentStock, setEditCurrentStock] = useState(0);
  const [editMinStock, setEditMinStock] = useState(10);
  const [editPurchasePrice, setEditPurchasePrice] = useState(0);
  const [editSupplier, setEditSupplier] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPurchaseChannel, setEditPurchaseChannel] = useState<PurchaseChannel>('ONLINE');
  const [editPurchasePlatform, setEditPurchasePlatform] = useState<OnlinePurchasePlatform>('FLIPKART');
  const [editPurchasePlatformOther, setEditPurchasePlatformOther] = useState('');
  const [editPurchaseOrderRef, setEditPurchaseOrderRef] = useState('');
  const [updating, setUpdating] = useState(false);

  // Stock Movement Modal
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementQty, setMovementQty] = useState(10);
  const [movementType, setMovementType] = useState<StockMovementType>('STOCK_IN');
  const [movementNotes, setMovementNotes] = useState('');
  const [movementChannel, setMovementChannel] = useState<PurchaseChannel>('ONLINE');
  const [movementPlatform, setMovementPlatform] = useState<OnlinePurchasePlatform>('FLIPKART');
  const [movementPlatformOther, setMovementPlatformOther] = useState('');
  const [movementOrderRef, setMovementOrderRef] = useState('');
  const [recordingMovement, setRecordingMovement] = useState(false);

  const loadInventory = async () => {
    try {
      const data = await api.getInventory();
      setInventory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createInventoryItem({
        name,
        category,
        unit,
        currentStock: Number(currentStock),
        minStock: Number(minStock),
        maxStock: Number(minStock) * 10,
        purchasePrice: Number(purchasePrice),
        supplier: supplier || (purchaseChannel === 'ONLINE' ? (purchasePlatform === 'OTHER' ? purchasePlatformOther : purchasePlatform) : purchasePlatformOther || 'Offline Supplier'),
        storageLocation: location,
        purchaseChannel,
        purchasePlatform: purchaseChannel === 'ONLINE' ? purchasePlatform : undefined,
        purchasePlatformOther: purchasePlatformOther.trim() || undefined,
        purchaseOrderRef: purchaseOrderRef.trim() || undefined,
        status: 'ACTIVE'
      });
      setShowAddModal(false);
      resetForm();
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to add inventory item');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditCurrentStock(item.currentStock);
    setEditMinStock(item.minStock);
    setEditPurchasePrice(item.purchasePrice);
    setEditSupplier(item.supplier || '');
    setEditLocation(item.storageLocation || 'Studio Shelf');
    setEditPurchaseChannel(item.purchaseChannel || 'ONLINE');
    setEditPurchasePlatform((item.purchasePlatform as OnlinePurchasePlatform) || 'FLIPKART');
    setEditPurchasePlatformOther(item.purchasePlatformOther || '');
    setEditPurchaseOrderRef(item.purchaseOrderRef || '');
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setUpdating(true);
    try {
      await api.updateInventoryItem(editItem.id, {
        name: editName,
        category: editCategory,
        unit: editUnit,
        currentStock: Number(editCurrentStock),
        minStock: Number(editMinStock),
        purchasePrice: Number(editPurchasePrice),
        supplier: editSupplier,
        storageLocation: editLocation,
        purchaseChannel: editPurchaseChannel,
        purchasePlatform: editPurchaseChannel === 'ONLINE' ? editPurchasePlatform : undefined,
        purchasePlatformOther: editPurchasePlatformOther.trim() || undefined,
        purchaseOrderRef: editPurchaseOrderRef.trim() || undefined
      });
      setEditItem(null);
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to update inventory item');
    } finally {
      setUpdating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSupplier('');
    setCurrentStock(50);
    setMinStock(10);
    setPurchasePrice(150);
    setPurchaseChannel('ONLINE');
    setPurchasePlatform('FLIPKART');
    setPurchasePlatformOther('');
    setPurchaseOrderRef('');
  };

  const handleOpenStockMovement = (item: InventoryItem) => {
    setMovementItem(item);
    setMovementQty(10);
    setMovementType('STOCK_IN');
    setMovementNotes('');
    setMovementChannel(item.purchaseChannel || 'ONLINE');
    setMovementPlatform((item.purchasePlatform as OnlinePurchasePlatform) || 'FLIPKART');
    setMovementPlatformOther(item.purchasePlatformOther || '');
    setMovementOrderRef(item.purchaseOrderRef || '');
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementItem) return;
    setRecordingMovement(true);
    try {
      await api.recordStockMovement({
        inventoryItemId: movementItem.id,
        quantity: Number(movementQty),
        movementType,
        notes: movementNotes,
        purchaseChannel: movementType === 'STOCK_IN' ? movementChannel : undefined,
        purchasePlatform: movementType === 'STOCK_IN' && movementChannel === 'ONLINE' ? movementPlatform : undefined,
        purchasePlatformOther: movementType === 'STOCK_IN' ? movementPlatformOther.trim() : undefined,
        purchaseOrderRef: movementType === 'STOCK_IN' ? movementOrderRef.trim() : undefined
      });
      setMovementItem(null);
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to record movement');
    } finally {
      setRecordingMovement(false);
    }
  };

  const totalValuation = inventory.reduce((sum, item) => sum + item.currentStock * item.purchasePrice, 0);
  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStock).length;
  const onlineCount = inventory.filter(i => i.purchaseChannel === 'ONLINE').length;
  const offlineCount = inventory.filter(i => i.purchaseChannel === 'OFFLINE').length;

  const filteredInventory = inventory.filter(item => {
    const itemPlatform = item.purchasePlatform || '';
    const itemPlatformOther = item.purchasePlatformOther || '';
    const itemRef = item.purchaseOrderRef || '';

    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      itemPlatform.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemPlatformOther.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemRef.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

    if (channelFilter !== 'ALL') {
      if (channelFilter === 'ONLINE') return item.purchaseChannel === 'ONLINE';
      if (channelFilter === 'OFFLINE') return item.purchaseChannel === 'OFFLINE';
      if (channelFilter === 'FLIPKART') return item.purchaseChannel === 'ONLINE' && item.purchasePlatform === 'FLIPKART';
      if (channelFilter === 'AMAZON') return item.purchaseChannel === 'ONLINE' && item.purchasePlatform === 'AMAZON';
      if (channelFilter === 'MEESHO') return item.purchaseChannel === 'ONLINE' && item.purchasePlatform === 'MEESHO';
      if (channelFilter === 'OTHER') return item.purchaseChannel === 'ONLINE' && item.purchasePlatform === 'OTHER';
    }

    return true;
  });

  const renderChannelBadge = (item: InventoryItem) => {
    const channel = item.purchaseChannel || 'OFFLINE';

    if (channel === 'ONLINE') {
      const platform = item.purchasePlatform || 'ONLINE';
      if (platform === 'FLIPKART') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Flipkart
          </span>
        );
      }
      if (platform === 'AMAZON') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Amazon
          </span>
        );
      }
      if (platform === 'MEESHO') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-pink-50 text-pink-700 border border-pink-200/80 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
            Meesho
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60 shadow-2xs">
          <Globe className="w-3 h-3 text-teal-600 dark:text-teal-400" />
          {item.purchasePlatformOther || 'Other Online'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-2xs">
        <Store className="w-3 h-3 text-slate-500 dark:text-slate-400" />
        {item.purchasePlatformOther || item.supplier || 'Offline Store'}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500">Loading Inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Inventory & Material Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track materials, online sourcing (Flipkart, Amazon, Meesho, Other) & offline local procurement.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSheetsModal(true)}
            className="p-2 sm:px-3.5 sm:py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Export and sync inventory materials with Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Google Sheets</span>
          </button>
          <button
            type="button"
            onClick={() => exportInventoryToExcel(filteredInventory.length > 0 ? filteredInventory : inventory)}
            className="p-2 sm:px-3.5 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Download Inventory Stock & Channel Details as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            title="Add Material / Item"
            className="p-2 sm:px-4 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">+ Add Material / Item</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Items</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{inventory.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Low Stock Items</span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{lowStockCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Inventory Valuation</span>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-400">₹{totalValuation.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Sourcing Breakdown</span>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              <Globe className="w-3.5 h-3.5" />
              <span>{onlineCount} Online</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Store className="w-3.5 h-3.5" />
              <span>{offlineCount} Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Channel Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search item, SKU, Flipkart/Amazon, supplier..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-purple-600"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs pb-1 sm:pb-0">
            <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase shrink-0 mr-1">Category:</span>
            {['ALL', 'RAW_MATERIAL', 'PACKAGING', 'ACCESSORIES', 'CONSUMABLES', 'FINISHED_PRODUCT'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Channel Filter Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase shrink-0 mr-1 flex items-center gap-1">
            <ShoppingCart className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Purchase Channel:
          </span>
          {[
            { id: 'ALL', label: 'All Channels' },
            { id: 'ONLINE', label: 'All Online' },
            { id: 'FLIPKART', label: 'Flipkart' },
            { id: 'AMAZON', label: 'Amazon' },
            { id: 'MEESHO', label: 'Meesho' },
            { id: 'OTHER', label: 'Other Online' },
            { id: 'OFFLINE', label: 'Offline / Local' }
          ].map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannelFilter(ch.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                channelFilter === ch.id
                  ? 'bg-purple-900/10 text-purple-700 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700 font-extrabold'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        {/* Mobile View: Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredInventory.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No inventory items matching category or purchase channel.
            </div>
          ) : (
            filteredInventory.map(item => {
              const isLow = item.currentStock <= item.minStock;
              return (
                <div key={item.id} className="p-4 space-y-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">{item.sku}</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded">
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>
                    <Badge type="stock" value={isLow ? 'LOW_STOCK' : 'IN_STOCK'} />
                  </div>

                  <div className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {renderChannelBadge(item)}
                        {item.purchaseOrderRef && (
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            Ref: {item.purchaseOrderRef}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        {item.supplier || 'No supplier'} • {item.storageLocation}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-sm text-slate-900 dark:text-white">
                        {item.currentStock} {item.unit}
                      </p>
                      <p className="text-[10px] text-slate-400">Min: {item.minStock} {item.unit}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cost: ₹{item.purchasePrice} / {item.unit}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                        title="Edit Item Details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenStockMovement(item)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Adjust / Stock In</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase">
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Purchase Channel</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4">Min Stock</th>
                <th className="py-3.5 px-4">Unit Cost</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInventory.map(item => {
                const isLow = item.currentStock <= item.minStock;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{item.sku}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.supplier || 'N/A'} • {item.storageLocation}</p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-600 dark:text-slate-300">{item.category.replace('_', ' ')}</td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {renderChannelBadge(item)}
                        {item.purchaseOrderRef && (
                          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[130px]" title={item.purchaseOrderRef}>
                            Ref: {item.purchaseOrderRef}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{item.minStock} {item.unit}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">₹{item.purchasePrice}</td>
                    <td className="py-3.5 px-4">
                      <Badge type="stock" value={isLow ? 'LOW_STOCK' : 'IN_STOCK'} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Item / Sourcing Channel"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenStockMovement(item)}
                          className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Adjust / Stock In
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Inventory Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory Item / Material"
        subtitle="Register new raw material or packaging with purchase channel info"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Epoxy Resin Hardener (Part B) or Premium Cardstock"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              >
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="PACKAGING">Packaging</option>
                <option value="ACCESSORIES">Accessories</option>
                <option value="CONSUMABLES">Consumables</option>
                <option value="FINISHED_PRODUCT">Finished Product</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit of Measurement</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              >
                <option value="PCS">Pieces (PCS)</option>
                <option value="SETS">Sets</option>
                <option value="BOXES">Boxes</option>
                <option value="SHEETS">Sheets</option>
                <option value="METERS">Meters</option>
                <option value="KG">Kilograms (KG)</option>
                <option value="LITRES">Litres</option>
              </select>
            </div>
          </div>

          {/* SOURCING & PURCHASE CHANNEL SECTION */}
          <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Purchase Channel (Online / Offline)
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                Sourcing Source
              </span>
            </div>

            {/* Channel Segmented Switch */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPurchaseChannel('ONLINE')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  purchaseChannel === 'ONLINE'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>🌐 Online Platform</span>
              </button>

              <button
                type="button"
                onClick={() => setPurchaseChannel('OFFLINE')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  purchaseChannel === 'OFFLINE'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>🏬 Offline / Local Market</span>
              </button>
            </div>

            {/* Online Platforms Options */}
            {purchaseChannel === 'ONLINE' ? (
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Online Platform *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'FLIPKART', label: 'Flipkart', color: 'blue' },
                      { id: 'AMAZON', label: 'Amazon', color: 'amber' },
                      { id: 'MEESHO', label: 'Meesho', color: 'pink' },
                      { id: 'OTHER', label: 'Other Online', color: 'teal' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPurchasePlatform(p.id as any)}
                        className={`py-2 px-2.5 rounded-xl font-extrabold text-xs text-center border transition-all cursor-pointer ${
                          purchasePlatform === p.id
                            ? 'bg-purple-900 text-white border-purple-900 dark:bg-purple-600 dark:border-purple-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {purchasePlatform === 'OTHER' && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Store / Website Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IndiaMART, ItsyBitsy, CanvasIndia, JioMart"
                      value={purchasePlatformOther}
                      onChange={e => setPurchasePlatformOther(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Order ID / Invoice / Tracking Ref <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. #OD123456789 or INV-2026-88"
                    value={purchaseOrderRef}
                    onChange={e => setPurchaseOrderRef(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Offline Store / Market / Wholesaler Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Crawford Market Wholesale, Sitaram Stationers, Local Depot"
                    value={purchasePlatformOther}
                    onChange={e => setPurchasePlatformOther(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bill / Cash Receipt Ref <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash Memo #4021"
                    value={purchaseOrderRef}
                    onChange={e => setPurchaseOrderRef(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Stock</label>
              <input
                type="number"
                required
                value={currentStock}
                onChange={e => setCurrentStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Min Threshold</label>
              <input
                type="number"
                required
                value={minStock}
                onChange={e => setMinStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-rose-600 dark:text-rose-400"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Purchase Price (₹)</label>
              <input
                type="number"
                required
                value={purchasePrice}
                onChange={e => setPurchasePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Supplier / Vendor Name</label>
              <input
                type="text"
                placeholder="e.g. ResinCraft India Ltd"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Storage Rack / Location</label>
              <input
                type="text"
                placeholder="e.g. Rack A1, Drawer 3"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
            >
              {creating ? 'Saving...' : 'Add Material'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Inventory Item Modal */}
      {editItem && (
        <Modal
          isOpen={!!editItem}
          onClose={() => setEditItem(null)}
          title={`Edit Material: ${editItem.name}`}
          subtitle={`SKU: ${editItem.sku} • Update sourcing details or stock thresholds`}
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateItem} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="ACCESSORIES">Accessories</option>
                  <option value="CONSUMABLES">Consumables</option>
                  <option value="FINISHED_PRODUCT">Finished Product</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit of Measurement</label>
                <select
                  value={editUnit}
                  onChange={e => setEditUnit(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value="PCS">Pieces (PCS)</option>
                  <option value="SETS">Sets</option>
                  <option value="BOXES">Boxes</option>
                  <option value="SHEETS">Sheets</option>
                  <option value="METERS">Meters</option>
                  <option value="KG">Kilograms (KG)</option>
                  <option value="LITRES">Litres</option>
                </select>
              </div>
            </div>

            {/* SOURCING & PURCHASE CHANNEL SECTION */}
            <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Purchase Channel (Online / Offline)
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                  Sourcing Source
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditPurchaseChannel('ONLINE')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    editPurchaseChannel === 'ONLINE'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>🌐 Online Platform</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditPurchaseChannel('OFFLINE')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    editPurchaseChannel === 'OFFLINE'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>🏬 Offline / Local Market</span>
                </button>
              </div>

              {editPurchaseChannel === 'ONLINE' ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Online Platform *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'FLIPKART', label: 'Flipkart' },
                        { id: 'AMAZON', label: 'Amazon' },
                        { id: 'MEESHO', label: 'Meesho' },
                        { id: 'OTHER', label: 'Other Online' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setEditPurchasePlatform(p.id as any)}
                          className={`py-2 px-2.5 rounded-xl font-extrabold text-xs text-center border transition-all cursor-pointer ${
                            editPurchasePlatform === p.id
                              ? 'bg-purple-900 text-white border-purple-900 dark:bg-purple-600 dark:border-purple-600 shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editPurchasePlatform === 'OTHER' && (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Store / Website Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. IndiaMART, ItsyBitsy, CanvasIndia"
                        value={editPurchasePlatformOther}
                        onChange={e => setEditPurchasePlatformOther(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Order ID / Invoice / Tracking Ref <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. #OD123456789 or INV-2026-88"
                      value={editPurchaseOrderRef}
                      onChange={e => setEditPurchaseOrderRef(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Offline Store / Market / Wholesaler Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Crawford Market Wholesale, Sitaram Stationers"
                      value={editPurchasePlatformOther}
                      onChange={e => setEditPurchasePlatformOther(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bill / Cash Receipt Ref <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cash Memo #4021"
                      value={editPurchaseOrderRef}
                      onChange={e => setEditPurchaseOrderRef(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Current Stock</label>
                <input
                  type="number"
                  required
                  value={editCurrentStock}
                  onChange={e => setEditCurrentStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Min Threshold</label>
                <input
                  type="number"
                  required
                  value={editMinStock}
                  onChange={e => setEditMinStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-rose-600 dark:text-rose-400"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  required
                  value={editPurchasePrice}
                  onChange={e => setEditPurchasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Supplier / Vendor Name</label>
                <input
                  type="text"
                  value={editSupplier}
                  onChange={e => setEditSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stock Movement Modal */}
      {movementItem && (
        <Modal
          isOpen={!!movementItem}
          onClose={() => setMovementItem(null)}
          title={`Stock Movement: ${movementItem.name}`}
          subtitle={`Current Stock: ${movementItem.currentStock} ${movementItem.unit}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordMovement} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Movement Type</label>
              <select
                value={movementType}
                onChange={e => setMovementType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              >
                <option value="STOCK_IN">Stock In (Purchase / Restock)</option>
                <option value="STOCK_OUT">Stock Out (Manual Removal)</option>
                <option value="ADJUSTMENT">Adjustment (Direct Stock Reset)</option>
                <option value="DAMAGED">Damaged / Wasted</option>
                <option value="RETURNED">Customer Return</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity ({movementItem.unit}) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={movementQty}
                onChange={e => setMovementQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* If Stock In, allow specifying purchase channel / ref */}
            {movementType === 'STOCK_IN' && (
              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2.5">
                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Sourcing Channel for this Restock
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementChannel('ONLINE')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                      movementChannel === 'ONLINE'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🌐 Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementChannel('OFFLINE')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                      movementChannel === 'OFFLINE'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🏬 Offline
                  </button>
                </div>

                {movementChannel === 'ONLINE' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {['FLIPKART', 'AMAZON', 'MEESHO', 'OTHER'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setMovementPlatform(p as any)}
                          className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            movementPlatform === p
                              ? 'bg-purple-900 text-white border-purple-900 dark:bg-purple-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {p === 'OTHER' ? 'Other' : p}
                        </button>
                      ))}
                    </div>

                    {movementPlatform === 'OTHER' && (
                      <input
                        type="text"
                        placeholder="Store name (e.g. IndiaMART, ItsyBitsy)"
                        value={movementPlatformOther}
                        onChange={e => setMovementPlatformOther(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    )}

                    <input
                      type="text"
                      placeholder="Order / Tracking ID (e.g. #OD123456789)"
                      value={movementOrderRef}
                      onChange={e => setMovementOrderRef(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Offline Wholesaler / Market Name"
                      value={movementPlatformOther}
                      onChange={e => setMovementPlatformOther(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Bill / Cash Receipt Ref"
                      value={movementOrderRef}
                      onChange={e => setMovementOrderRef(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Remarks</label>
              <input
                type="text"
                placeholder="e.g. Received new shipment from supplier"
                value={movementNotes}
                onChange={e => setMovementNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMovementItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recordingMovement}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                {recordingMovement ? 'Updating...' : 'Confirm Stock Movement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Google Sheets Hub Modal */}
      <GoogleSheetsHubModal
        isOpen={showSheetsModal}
        onClose={() => setShowSheetsModal(false)}
        inventoryData={inventory}
      />
    </div>
  );
};
