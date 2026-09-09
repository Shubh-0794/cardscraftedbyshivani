import React, { useState, useRef } from 'react';
import { useGoogleDrive } from '../../context/GoogleDriveContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { Modal } from '../common/Modal';
import { DriveFile } from '../../services/googleDrive';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  File,
  Upload,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  Download,
  FolderPlus,
  ChevronRight,
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Sparkles,
  Layers,
  ArrowLeft,
  X
} from 'lucide-react';

interface GoogleDriveHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: DriveFile) => void;
  selectionMode?: boolean;
}

export const GoogleDriveHubModal: React.FC<GoogleDriveHubModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  selectionMode = false
}) => {
  const {
    isConnected,
    googleUser,
    loading,
    files,
    currentFolderId,
    currentFolderName,
    folderPath,
    searchQuery,
    error,
    connectDrive,
    disconnectDrive,
    refreshFiles,
    navigateToFolder,
    navigateUp,
    setSearchQuery,
    uploadFile,
    createFolder,
    deleteFile
  } = useGoogleDrive();

  const [activeCategory, setActiveCategory] = useState<'ALL' | 'FOLDERS' | 'IMAGES' | 'DOCS' | 'SHEETS'>('ALL');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Mandatory deletion confirmation dialog state
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setUploading(true);
    setUploadSuccess(null);
    try {
      const uploaded = await uploadFile(file, 'Uploaded via Cards Crafted Studio');
      setUploadSuccess(`"${uploaded.name}" successfully uploaded to Google Drive!`);
      setTimeout(() => setUploadSuccess(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setDeleting(true);
    try {
      await deleteFile(fileToDelete.id, fileToDelete.name);
      setFileToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const getFileIcon = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
    }
    if (file.mimeType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-pink-500" />;
    }
    if (file.mimeType.includes('pdf') || file.mimeType.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    if (file.mimeType.includes('sheet') || file.mimeType.includes('excel') || file.mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter(f => {
    if (activeCategory === 'FOLDERS') return f.mimeType === 'application/vnd.google-apps.folder';
    if (activeCategory === 'IMAGES') return f.mimeType.startsWith('image/');
    if (activeCategory === 'DOCS') return f.mimeType.includes('pdf') || f.mimeType.includes('document') || f.mimeType.includes('text');
    if (activeCategory === 'SHEETS') return f.mimeType.includes('sheet') || f.mimeType.includes('excel') || f.mimeType.includes('csv');
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#11192d]/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-blue-500 to-emerald-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Cloud className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                  Google Drive Cloud Storage
                </h2>
                {isConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Sync craft designs, invoices, customer mockups & receipts to your Google Drive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!isConnected ? (
            /* Unconnected State */
            <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 mx-auto flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                <Cloud className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Connect Your Google Drive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Seamlessly back up craft orders, upload custom resin design references, access invoices, and store workshop blueprints directly in your Google Drive with your permission.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl text-left flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2">
                <GoogleSignInButton
                  onClick={connectDrive}
                  loading={loading}
                  label="Connect Google Drive"
                  className="w-full py-3"
                />
              </div>

              <div className="text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
                <p>• Stores invoices & bills automatically in your cloud</p>
                <p>• Access your uploaded files anywhere across devices</p>
              </div>
            </div>
          ) : (
            /* Connected Drive Workspace Explorer */
            <div className="space-y-4">
              {/* Account Strip + Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl">
                {/* Google Profile Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {googleUser?.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google User'}
                      className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {googleUser?.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {googleUser?.displayName || 'Google Account'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {googleUser?.email}
                    </p>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(true)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>New Folder</span>
                  </button>

                  <button
                    type="button"
                    onClick={refreshFiles}
                    disabled={loading}
                    className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                    title="Refresh Drive Files"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={disconnectDrive}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Disconnect Google Drive"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Navigation Breadcrumb Bar & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                {/* Folder Path Breadcrumb */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 text-xs">
                  {folderPath.map((crumb, idx) => (
                    <React.Fragment key={crumb.id || 'root'}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <button
                        type="button"
                        onClick={() => navigateToFolder(crumb.id, crumb.name)}
                        className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer truncate max-w-[140px] ${
                          idx === folderPath.length - 1
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-60 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Type Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                {(['ALL', 'FOLDERS', 'IMAGES', 'DOCS', 'SHEETS'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Files' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Files Grid / List */}
              {loading && files.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-semibold">Loading Google Drive contents...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-12 text-center bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-3">
                  <Cloud className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">No files found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery ? 'Try a different search query' : 'Upload your first craft mockup, blueprint, or document!'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredFiles.map(file => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (isFolder) {
                            navigateToFolder(file.id, file.name);
                          } else if (selectionMode && onSelectFile) {
                            onSelectFile(file);
                            onClose();
                          }
                        }}
                        className={`bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 flex flex-col justify-between space-y-3 hover:border-blue-400 dark:hover:border-blue-500 transition-all group ${
                          isFolder || selectionMode ? 'cursor-pointer hover:bg-blue-50/20 dark:hover:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 shrink-0">
                            {getFileIcon(file)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400" title={file.name}>
                              {file.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              {isFolder ? (
                                <span>Folder</span>
                              ) : (
                                <>
                                  {file.size && <span>{formatFileSize(file.size)}</span>}
                                  {file.modifiedTime && (
                                    <span>
                                      • {new Date(file.modifiedTime).toLocaleDateString()}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* File Action Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                          {isFolder ? (
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <span>Open Folder</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 text-[11px] font-bold transition-colors"
                                  title="Open in Google Drive"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View</span>
                                </a>
                              )}
                              {file.webContentLink && (
                                <a
                                  href={file.webContentLink}
                                  download
                                  onClick={e => e.stopPropagation()}
                                  className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 text-[11px] font-bold transition-colors"
                                  title="Download File"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Delete File Button (Enforces User Confirmation Dialog) */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setFileToDelete(file);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete from Google Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#11192d]/80 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
            <Cloud className="w-3.5 h-3.5 text-blue-500" />
            <span>Google Drive API v3 • Direct OAuth Cloud Storage</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Create New Folder Sub-Modal */}
      {showNewFolderModal && (
        <Modal
          isOpen={showNewFolderModal}
          onClose={() => setShowNewFolderModal(false)}
          title="Create New Folder"
          subtitle={`Inside ${currentFolderName}`}
          maxWidth="sm"
        >
          <form onSubmit={handleCreateFolder} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Folder Name *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. CardsCrafted_Invoices or Resin_Art_Suites"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingFolder || !newFolderName.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {creatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MANDATORY Explicit User Confirmation Modal for Destructive Delete */}
      {fileToDelete && (
        <Modal
          isOpen={!!fileToDelete}
          onClose={() => setFileToDelete(null)}
          title="Delete File from Google Drive?"
          subtitle="Explicit confirmation required"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900 dark:text-rose-200">
                  Are you sure you want to permanently delete "{fileToDelete.name}"?
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  This action will remove the file from your Google Drive cloud account. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
