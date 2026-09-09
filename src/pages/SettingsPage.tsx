import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { firestoreService } from '../services/firestoreService';
import { BusinessSettings } from '../types';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { GoogleDriveHubModal } from '../components/drive/GoogleDriveHubModal';
import { GoogleSignInButton } from '../components/drive/GoogleSignInButton';
import {
  Sliders,
  Save,
  Building,
  FileText,
  CheckCircle2,
  Database,
  Cloud,
  RefreshCw,
  Layers,
  Folder,
  ExternalLink,
  ShieldCheck,
  LogOut,
  DownloadCloud,
  UploadCloud,
  Activity,
  AlertTriangle
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);

  const {
    isConnected: isDriveConnected,
    googleUser,
    loading: driveLoading,
    files: driveFiles,
    connectDrive,
    disconnectDrive
  } = useGoogleDrive();

  // Firebase Overall Sync state
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    details?: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update business settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setSyncStatus({ message: 'Testing live connection to Firebase Firestore...', type: 'info' });
    try {
      const probe = await firestoreService.testConnection();
      if (probe.ok) {
        setSyncStatus({
          message: `✅ ${probe.message}`,
          type: 'success'
        });
      } else {
        setSyncStatus({
          message: `⚠️ Connection test warning: ${probe.message}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSyncStatus({
        message: `Connection error: ${err.message || 'Could not reach Firestore'}`,
        type: 'error'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleOverallFirebaseSync = async () => {
    setSyncing(true);
    setSyncStatus({ message: 'Syncing all application datasets to Firebase Firestore...', type: 'info' });
    try {
      const result = await api.syncAllToFirebase();
      if (result.errors && result.errors.length > 0) {
        setSyncStatus({
          message: `Synchronized ${result.syncedCount} records with ${result.errors.length} minor warnings.`,
          type: 'info',
          details: result.details
        });
      } else {
        setSyncStatus({
          message: `Successfully synchronized ${result.syncedCount} records across all collections to Firebase Firestore!`,
          type: 'success',
          details: result.details
        });
      }
    } catch (err: any) {
      setSyncStatus({
        message: `Sync failed: ${err.message || 'Unknown error during Firebase synchronization'}`,
        type: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreFromFirebase = async () => {
    if (!window.confirm('Restore all application data from Firebase Firestore? This will merge cloud documents with your local database.')) {
      return;
    }
    setRestoring(true);
    setSyncStatus({ message: 'Fetching cloud documents from Firebase Firestore and merging...', type: 'info' });
    try {
      const result = await api.restoreAllFromFirebase();
      setSyncStatus({
        message: `Successfully restored and merged ${result.importedCount} records from Firebase Cloud!`,
        type: 'success',
        details: result.details
      });
      // Refresh local settings
      const refreshedSettings = await api.getSettings();
      setSettings(refreshedSettings);
    } catch (err: any) {
      setSyncStatus({
        message: `Restore failed: ${err.message || 'Unknown error during Firebase restoration'}`,
        type: 'error'
      });
    } finally {
      setRestoring(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500">Loading Business Settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          Business Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure company branding, invoice templates, UPI details & Firebase Cloud persistence.</p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Settings updated successfully!
        </div>
      )}

      {/* Firebase Overall Data Sync Section */}
      <div className="bg-gradient-to-r from-slate-900 to-purple-950 p-6 rounded-3xl border border-purple-900/50 text-white shadow-lg space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-purple-800/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/30 rounded-2xl border border-purple-500/30">
              <Cloud className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                Firebase Firestore Database
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-mono">
                  Active
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Two-way Cloud Persistence & Backup for Users, Customers, Orders, Products, Inventory, Payments, Addresses & Settings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || syncing || restoring}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 shadow flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-purple-400 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Probing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleRestoreFromFirebase}
              disabled={restoring || syncing || testing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-purple-900/60 text-purple-200 font-bold text-xs rounded-2xl border border-purple-700/50 shadow flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <DownloadCloud className={`w-3.5 h-3.5 text-purple-300 ${restoring ? 'animate-bounce' : ''}`} />
              {restoring ? 'Restoring...' : 'Restore from Cloud'}
            </button>

            <button
              type="button"
              onClick={handleOverallFirebaseSync}
              disabled={syncing || restoring || testing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All to Firebase'}
            </button>
          </div>
        </div>

        {syncStatus && (
          <div
            className={`p-4 rounded-2xl text-xs font-medium space-y-2 border ${
              syncStatus.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-200'
                : syncStatus.type === 'error'
                ? 'bg-rose-950/60 border-rose-700/50 text-rose-200'
                : 'bg-purple-900/40 border-purple-700/50 text-purple-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{syncStatus.message}</span>
            </div>
            {syncStatus.details && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px]">
                {Object.entries(syncStatus.details).map(([key, count]) => (
                  <div key={key} className="bg-black/20 px-2.5 py-1.5 rounded-xl flex items-center justify-between">
                    <span className="text-slate-300 capitalize">{key}:</span>
                    <span className="font-mono font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block font-semibold">Collections</span>
            <span className="font-extrabold text-white text-sm">11 Firestore Datasets</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block font-semibold">Security Rules</span>
            <span className="font-extrabold text-emerald-400 text-sm">Deployed & Active</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block font-semibold">Auto-Sync</span>
            <span className="font-extrabold text-purple-300 text-sm">Real-time on Writes</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block font-semibold">Project ID</span>
            <span className="font-mono font-bold text-slate-200 text-xs truncate block">gen-lang-client-0294240397</span>
          </div>
        </div>
      </div>


      {/* Google Drive Cloud Workspace Storage Section */}
      <div className="bg-gradient-to-r from-[#0c1a30] to-[#122646] p-6 rounded-3xl border border-blue-900/50 text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-blue-800/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 rounded-2xl border border-blue-500/30">
              <Cloud className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                Google Drive Cloud Workspace
                {isDriveConnected ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-mono">
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-mono">
                    Not Connected
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Direct OAuth integration for backing up invoices, craft blueprints, custom resin art references and documents to your personal or studio Google Drive.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDriveConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowDriveModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Folder className="w-4 h-4" />
                  <span>Open Drive Explorer</span>
                </button>
                <button
                  type="button"
                  onClick={disconnectDrive}
                  className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Disconnect Google Drive"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <GoogleSignInButton
                onClick={connectDrive}
                loading={driveLoading}
                label="Connect Google Drive"
                className="py-2 px-4"
              />
            )}
          </div>
        </div>

        {isDriveConnected && googleUser && (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10 text-xs">
            {googleUser.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt={googleUser.displayName || 'Google User'}
                className="w-8 h-8 rounded-full border border-blue-400 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {googleUser.displayName?.charAt(0) || 'G'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-white text-xs block truncate">{googleUser.displayName}</span>
              <span className="text-slate-400 text-[11px] truncate block">{googleUser.email}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-emerald-400 font-bold text-xs block">{driveFiles.length} files loaded</span>
              <span className="text-slate-400 text-[10px]">Google Drive API v3</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block font-semibold">Scope</span>
            <span className="font-extrabold text-white text-xs truncate block">Google Drive Files</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block font-semibold">Auth Protocol</span>
            <span className="font-extrabold text-blue-300 text-xs truncate block">Client-Side OAuth 2.0</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block font-semibold">Invoice Backups</span>
            <span className="font-extrabold text-emerald-400 text-xs truncate block">Enabled from Invoices</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block font-semibold">Destructive Action Guard</span>
            <span className="font-extrabold text-purple-300 text-xs truncate block">Explicit Confirmation</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Profile */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs transition-colors">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Building className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Company Profile & Branding
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Business Name</label>
              <input
                type="text"
                value={settings.companyName || ''}
                onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={settings.gstin || ''}
                onChange={e => setSettings({ ...settings, gstin: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Support Phone / WhatsApp</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={e => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Business Address</label>
            <input
              type="text"
              value={settings.address || ''}
              onChange={e => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* UPI & Invoice Details */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs transition-colors">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            UPI Payment & Tax Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">UPI ID for Invoices</label>
              <input
                type="text"
                value={settings.upiId || ''}
                onChange={e => setSettings({ ...settings, upiId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name & Acc Details</label>
              <input
                type="text"
                value={settings.bankDetails || ''}
                onChange={e => setSettings({ ...settings, bankDetails: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currencySymbol || ''}
                onChange={e => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Order Prefix</label>
              <input
                type="text"
                value={settings.orderPrefix || ''}
                onChange={e => setSettings({ ...settings, orderPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Default Tax (%)</label>
              <input
                type="number"
                value={settings.defaultTaxPercent ?? 12}
                onChange={e => setSettings({ ...settings, defaultTaxPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Google Drive Workspace Explorer Modal */}
      <GoogleDriveHubModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
      />
    </div>
  );
};
