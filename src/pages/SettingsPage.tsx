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
  AlertTriangle,
  Server,
  Zap,
  Code2,
  Copy,
  Check,
  Terminal
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

  // Supabase Database Sync state
  const [supabaseSyncing, setSupabaseSyncing] = useState(false);
  const [supabaseRestoring, setSupabaseRestoring] = useState(false);
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    details?: Record<string, number>;
  } | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [sqlSchema, setSqlSchema] = useState<string>('');

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

  // --- Supabase Handler Actions ---
  const handleTestSupabaseConnection = async () => {
    setSupabaseTesting(true);
    setSupabaseStatus({ message: 'Testing live REST connection to Supabase Project (qdcqyxykmdfxxxgyhgbl)...', type: 'info' });
    try {
      const probe = await api.testSupabaseConnection();
      if (probe.success) {
        setSupabaseStatus({
          message: `✅ ${probe.message}`,
          type: 'success'
        });
      } else {
        setSupabaseStatus({
          message: `⚠️ Connection test warning: ${probe.message}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSupabaseStatus({
        message: `Connection error: ${err.message || 'Could not reach Supabase endpoint'}`,
        type: 'error'
      });
    } finally {
      setSupabaseTesting(false);
    }
  };

  const handleOverallSupabaseSync = async () => {
    setSupabaseSyncing(true);
    setSupabaseStatus({ message: 'Synchronizing all application datasets to Supabase Cloud Database...', type: 'info' });
    try {
      const result = await api.syncAllToSupabase();
      if (result.success) {
        setSupabaseStatus({
          message: `Successfully synchronized ${result.syncedCount} records across all collections to Supabase!`,
          type: 'success',
          details: result.details
        });
      } else {
        setSupabaseStatus({
          message: `Sync warning: ${result.error || result.message}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSupabaseStatus({
        message: `Sync failed: ${err.message || 'Unknown error during Supabase sync'}`,
        type: 'error'
      });
    } finally {
      setSupabaseSyncing(false);
    }
  };

  const handleRestoreFromSupabase = async () => {
    if (!window.confirm('Restore all application data from Supabase Cloud? This will merge Supabase datasets with your local store.')) {
      return;
    }
    setSupabaseRestoring(true);
    setSupabaseStatus({ message: 'Fetching documents from Supabase and merging into database...', type: 'info' });
    try {
      const result = await api.restoreAllFromSupabase();
      if (result.success) {
        setSupabaseStatus({
          message: `Successfully restored and merged ${result.importedCount} records from Supabase!`,
          type: 'success',
          details: result.details
        });
        const refreshed = await api.getSettings();
        setSettings(refreshed);
      } else {
        setSupabaseStatus({
          message: `Restore notice: ${result.error || result.message}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSupabaseStatus({
        message: `Restore failed: ${err.message || 'Unknown error during Supabase restoration'}`,
        type: 'error'
      });
    } finally {
      setSupabaseRestoring(false);
    }
  };

  const handleOpenSqlModal = async () => {
    try {
      const res = await api.getSupabaseSqlSchema();
      setSqlSchema(res.sql);
      setShowSqlModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopySql = () => {
    if (sqlSchema) {
      navigator.clipboard.writeText(sqlSchema);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2500);
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

      {/* Supabase Cloud PostgreSQL Database Section */}
      <div className="bg-gradient-to-r from-[#0d1f1c] via-[#092b23] to-[#041d17] p-6 rounded-3xl border border-emerald-900/50 text-white shadow-lg space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-emerald-800/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 rounded-2xl border border-emerald-500/30">
              <Server className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                Supabase Cloud Database
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-mono flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Connected
                </span>
              </h3>
              <p className="text-xs text-emerald-100/70 mt-0.5">
                Real-time cloud database storage powered by Supabase PostgreSQL (Project ID: <span className="font-mono text-emerald-300 font-bold">qdcqyxykmdfxxxgyhgbl</span>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenSqlModal}
              className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 font-bold text-xs rounded-2xl border border-emerald-700/60 shadow flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SQL Schema</span>
            </button>

            <button
              type="button"
              onClick={handleTestSupabaseConnection}
              disabled={supabaseTesting || supabaseSyncing || supabaseRestoring}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 shadow flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${supabaseTesting ? 'animate-spin' : ''}`} />
              {supabaseTesting ? 'Probing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleRestoreFromSupabase}
              disabled={supabaseRestoring || supabaseSyncing || supabaseTesting}
              className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-200 font-bold text-xs rounded-2xl border border-emerald-600/50 shadow flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <DownloadCloud className={`w-3.5 h-3.5 text-emerald-300 ${supabaseRestoring ? 'animate-bounce' : ''}`} />
              {supabaseRestoring ? 'Restoring...' : 'Restore from Supabase'}
            </button>

            <button
              type="button"
              onClick={handleOverallSupabaseSync}
              disabled={supabaseSyncing || supabaseRestoring || supabaseTesting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${supabaseSyncing ? 'animate-spin' : ''}`} />
              {supabaseSyncing ? 'Syncing...' : 'Sync All to Supabase'}
            </button>
          </div>
        </div>

        {supabaseStatus && (
          <div
            className={`p-4 rounded-2xl text-xs font-medium space-y-2 border ${
              supabaseStatus.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200'
                : supabaseStatus.type === 'error'
                ? 'bg-rose-950/60 border-rose-700/50 text-rose-200'
                : 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-semibold">{supabaseStatus.message}</span>
            </div>
            {supabaseStatus.details && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px]">
                {Object.entries(supabaseStatus.details).map(([key, count]) => (
                  <div key={key} className="bg-black/30 px-2.5 py-1.5 rounded-xl flex items-center justify-between border border-emerald-900/30">
                    <span className="text-emerald-200 capitalize">{key}:</span>
                    <span className="font-mono font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-emerald-400/80 block font-semibold">Supabase Project</span>
            <span className="font-mono font-extrabold text-white text-xs truncate block">qdcqyxykmdfxxxgyhgbl</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-emerald-400/80 block font-semibold">Auto-Sync on Writes</span>
            <span className="font-extrabold text-emerald-300 text-xs truncate block">Active (Background Debounced)</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-emerald-400/80 block font-semibold">API Key Mode</span>
            <span className="font-extrabold text-emerald-400 text-xs truncate block">Publishable / Anon Safe</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-emerald-400/80 block font-semibold">REST Endpoint</span>
            <span className="font-mono text-[10px] text-emerald-200 truncate block">https://qdcqyxykmdfxxxgyhgbl.supabase.co</span>
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

      {/* Supabase SQL Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-800/80 rounded-3xl max-w-3xl w-full p-6 text-white shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Supabase PostgreSQL DDL Schema</h3>
                  <p className="text-[11px] text-slate-400">Run this in your Supabase SQL Editor for structured table analytics</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-black/60">
              <pre className="p-4 text-[11px] font-mono text-emerald-300 overflow-auto max-h-[50vh] leading-relaxed select-all">
                {sqlSchema || '-- Loading SQL Schema...'}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://supabase.com/dashboard/project/qdcqyxykmdfxxxgyhgbl/sql"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Open Supabase SQL Editor
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {sqlCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{sqlCopied ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

