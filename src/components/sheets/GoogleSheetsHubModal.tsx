import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ExternalLink,
  Download,
  CheckCircle2,
  Table,
  X,
  Package,
  Boxes,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useGoogleSheets } from '../../context/GoogleSheetsContext';
import { useGoogleDrive } from '../../context/GoogleDriveContext';
import { GoogleSignInButton } from '../drive/GoogleSignInButton';
import { api } from '../../services/api';

interface GoogleSheetsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordersData?: any[];
  inventoryData?: any[];
}

export const GoogleSheetsHubModal: React.FC<GoogleSheetsHubModalProps> = ({
  isOpen,
  onClose,
  ordersData: propOrders,
  inventoryData: propInventory
}) => {
  const { isConnected } = useGoogleDrive();
  const [loadedOrders, setLoadedOrders] = useState<any[]>([]);
  const [loadedInventory, setLoadedInventory] = useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      if (!propOrders) {
        api.getOrders().then(setLoadedOrders).catch(() => {});
      }
      if (!propInventory) {
        api.getInventory().then(setLoadedInventory).catch(() => {});
      }
    }
  }, [isOpen, propOrders, propInventory]);

  const ordersData = propOrders || loadedOrders;
  const inventoryData = propInventory || loadedInventory;
  const {
    spreadsheets,
    loading,
    exporting,
    selectedSheetData,
    loadingSheetData,
    refreshSpreadsheets,
    fetchSheetDetails,
    createNewSheet,
    exportOrders,
    exportInventory
  } = useGoogleSheets();

  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'EXPORT' | 'CREATE'>('EXPLORE');
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Explicit confirmation state for mutating/creating spreadsheets
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  if (!isOpen) return null;

  const handleExportOrdersClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Export Orders to Google Sheets',
      description: `This will create a brand new Google Spreadsheet in your Google Drive containing ${ordersData.length} order records with full payment and item details.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await exportOrders(ordersData);
          setStatusMsg({
            type: 'success',
            text: `Successfully created "${res.title}" in your Google Sheets!`
          });
        } catch (err: any) {
          setStatusMsg({ type: 'error', text: err.message || 'Failed to export orders.' });
        }
      }
    });
  };

  const handleExportInventoryClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Export Inventory to Google Sheets',
      description: `This will create a new Google Spreadsheet containing all ${inventoryData.length} raw materials, current stock levels, unit costs, and reorder levels.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await exportInventory(inventoryData);
          setStatusMsg({
            type: 'success',
            text: `Successfully created "${res.title}" in your Google Sheets!`
          });
        } catch (err: any) {
          setStatusMsg({ type: 'error', text: err.message || 'Failed to export inventory.' });
        }
      }
    });
  };

  const handleCreateCustomSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetTitle.trim()) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Create Google Spreadsheet',
      description: `Create a blank spreadsheet titled "${newSheetTitle}" in your Google Drive?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await createNewSheet(newSheetTitle.trim(), ['Item / Record', 'Date', 'Notes', 'Amount']);
          setNewSheetTitle('');
          setStatusMsg({
            type: 'success',
            text: `Spreadsheet "${res.title}" created successfully!`
          });
          setActiveTab('EXPLORE');
        } catch (err: any) {
          setStatusMsg({ type: 'error', text: err.message || 'Failed to create spreadsheet.' });
        }
      }
    });
  };

  const handlePreviewSheet = (id: string) => {
    setActivePreviewId(id);
    fetchSheetDetails(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Google Sheets Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sync orders, live inventory, and craft sales data to your Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GoogleSignInButton />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800/60 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {!isConnected ? (
          <div className="p-8 text-center flex flex-col items-center justify-center my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Connect Google Sheets</h3>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Sign in with your Google Account to export craft sales orders, inventory stock logs, and analyze
              spreadsheets directly inside Cards Crafted Studio with permission from your account.
            </p>
            <GoogleSignInButton />
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 bg-slate-900/50">
              <button
                onClick={() => {
                  setActiveTab('EXPLORE');
                  setActivePreviewId(null);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'EXPLORE'
                    ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>My Spreadsheets ({spreadsheets.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('EXPORT')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'EXPORT'
                    ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Cards Crafted Data</span>
              </button>
              <button
                onClick={() => setActiveTab('CREATE')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'CREATE'
                    ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Sheet</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* TAB 1: EXPLORE & PREVIEW */}
              {activeTab === 'EXPLORE' && (
                <div className="space-y-4">
                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Google Drive Spreadsheets</span>
                    <button
                      onClick={() => refreshSpreadsheets()}
                      disabled={loading}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* List of Sheets */}
                  {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span>Loading your spreadsheets from Google Drive...</span>
                    </div>
                  ) : spreadsheets.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
                      <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No spreadsheets found in your Google Drive.</p>
                      <button
                        onClick={() => setActiveTab('EXPORT')}
                        className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                      >
                        Export Orders or Inventory Now
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {spreadsheets.map(sheet => {
                        const isSelected = activePreviewId === sheet.id;
                        return (
                          <div
                            key={sheet.id}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50'
                                : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span className="font-bold text-xs text-white line-clamp-1">{sheet.name}</span>
                                </div>
                                <a
                                  href={sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-emerald-300 p-1 rounded-md hover:bg-slate-700/60 transition-colors"
                                  title="Open in Google Sheets"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                Modified: {sheet.modifiedTime ? new Date(sheet.modifiedTime).toLocaleString('en-IN') : 'Recent'}
                              </p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                              <button
                                onClick={() => handlePreviewSheet(sheet.id)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-700/80 hover:bg-slate-700 text-slate-200'
                                }`}
                              >
                                <Eye className="w-3 h-3" />
                                <span>{isSelected ? 'Viewing' : 'Preview Cells'}</span>
                              </button>

                              <a
                                href={sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                              >
                                <span>Open Sheet</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* PREVIEW TABLE OF ACTIVE SHEET */}
                  {activePreviewId && (
                    <div className="mt-5 p-4 bg-slate-950/80 border border-emerald-900/60 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4 text-emerald-400" />
                          <h4 className="font-bold text-xs text-white">
                            {selectedSheetData?.title || 'Spreadsheet Preview'}
                          </h4>
                          {selectedSheetData?.sheets?.[0] && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                              Tab: {selectedSheetData.sheets[0].title}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setActivePreviewId(null)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Close Preview
                        </button>
                      </div>

                      {loadingSheetData ? (
                        <div className="py-8 text-center text-xs text-slate-400">Loading sheet cells...</div>
                      ) : !selectedSheetData?.values || selectedSheetData.values.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">No data found in this sheet.</div>
                      ) : (
                        <div className="overflow-x-auto max-h-60 rounded-xl border border-slate-800">
                          <table className="w-full text-left text-xs border-collapse font-mono">
                            <tbody>
                              {selectedSheetData.values.map((row, rowIdx) => (
                                <tr
                                  key={rowIdx}
                                  className={
                                    rowIdx === 0
                                      ? 'bg-slate-800 text-emerald-300 font-bold border-b border-slate-700 sticky top-0'
                                      : 'hover:bg-slate-900 border-b border-slate-800/60 text-slate-300'
                                  }
                                >
                                  {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="p-2 border-r border-slate-800/80 whitespace-nowrap">
                                      {String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXPORT WORKFLOW */}
              {activeTab === 'EXPORT' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    Export your live Cards Crafted order and inventory databases straight into organized Google
                    Spreadsheets with formatted column headers.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Orders Export Card */}
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-purple-400" />
                          <h4 className="font-bold text-sm text-white">Export Customer Orders</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Export all <strong>{ordersData.length}</strong> active & historic orders including customer
                          names, total amounts, balance payments, order statuses, and delivery addresses.
                        </p>
                      </div>

                      <button
                        onClick={handleExportOrdersClick}
                        disabled={exporting}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>{exporting ? 'Exporting...' : 'Export Orders to Google Sheets'}</span>
                      </button>
                    </div>

                    {/* Inventory Export Card */}
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Boxes className="w-5 h-5 text-amber-400" />
                          <h4 className="font-bold text-sm text-white">Export Raw Materials & Stock</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Export all <strong>{inventoryData.length}</strong> craft supplies (paper, resin, glitter,
                          embellishments) with current stock, unit costs, and reorder thresholds.
                        </p>
                      </div>

                      <button
                        onClick={handleExportInventoryClick}
                        disabled={exporting}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>{exporting ? 'Exporting...' : 'Export Inventory to Google Sheets'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CREATE NEW SHEET */}
              {activeTab === 'CREATE' && (
                <form onSubmit={handleCreateCustomSheet} className="max-w-md mx-auto space-y-4 py-4">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-white">Create Blank Google Spreadsheet</h4>
                    <p className="text-xs text-slate-400">Created directly in your connected Google Drive</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Spreadsheet Name *</label>
                    <input
                      type="text"
                      required
                      value={newSheetTitle}
                      onChange={e => setNewSheetTitle(e.target.value)}
                      placeholder="e.g. Cards Crafted - Monthly Expenses 2026"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={exporting || !newSheetTitle.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{exporting ? 'Creating...' : 'Create Spreadsheet in Drive'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Connected with Google Workspace APIs</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Modal for Destructive/Mutating Operations */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-md w-full p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmDialog.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                Proceed & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
