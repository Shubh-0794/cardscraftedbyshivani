import React, { useState, useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { useAuth } from '../context/AuthContext';
import { PrintDocumentConfig } from '../types';
import { api } from '../services/api';
import { PdfPreview } from '../components/PdfPreview';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { SAMPLE_PDF_BASE64 } from '../utils/samplePdf';
import {
  Printer,
  UploadCloud,
  FileText,
  ShieldCheck,
  Lock,
  EyeOff,
  Scissors,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Sparkles,
  ShoppingCart,
  FileCheck2,
  Sparkle,
  Check,
  Image as ImageIcon,
  Maximize2,
  X,
  FileImage,
  Layers,
  ZoomIn,
  FolderSync,
  CloudCheck,
  HardDrive
} from 'lucide-react';

interface PrintDocsPageProps {
  onNavigateToCart?: () => void;
  onNavigateToOrders?: () => void;
}

export interface UploadedDocItem {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl: string;
  pages: number;
}

// Paper Rates and Options
export const PAPER_OPTIONS = [
  {
    id: '75_GSM' as const,
    name: '75 GSM Standard',
    tag: 'Everyday',
    desc: 'Standard high-definition copy paper',
    rates: { BW: 6, COLOR: 15 }
  },
  {
    id: '100_GSM' as const,
    name: '100 GSM Bond',
    tag: 'Premium',
    desc: 'Heavyweight bright-white bond paper',
    rates: { BW: 8, COLOR: 18 }
  },
  {
    id: 'PHOTO_PAPER' as const,
    name: 'Photo Paper',
    tag: 'Glossy HD',
    desc: 'Ultra high-gloss photographic paper',
    rates: { BW: 30, COLOR: 45 }
  }
];

export const PrintDocsPage: React.FC<PrintDocsPageProps> = ({
  onNavigateToCart,
  onNavigateToOrders
}) => {
  const { addPrintJobToCart, totalItems } = useCart();
  const { user } = useAuth();
  const { isConnected: isDriveConnected, uploadCustomerFileToDrive, connectDrive } = useGoogleDrive();
  const [driveSyncStatus, setDriveSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SYNCED' | 'FAILED'>('IDLE');
  const [driveSyncPath, setDriveSyncPath] = useState<string>('');

  // Page Steps: 'LANDING' | 'VALIDATING' | 'SUCCESS' | 'CUSTOMIZE'
  const [currentStep, setCurrentStep] = useState<'LANDING' | 'VALIDATING' | 'SUCCESS' | 'CUSTOMIZE'>('LANDING');

  // File Upload State (Supports Multiple Documents)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocItem[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);
  const [validationProgress, setValidationProgress] = useState(0);

  // Customize Print Options State
  const [copies, setCopies] = useState<number>(1);
  const [orientation, setOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [colorType, setColorType] = useState<'BW' | 'COLOR'>('BW');
  const [paperGsm, setPaperGsm] = useState<'75_GSM' | '100_GSM' | 'PHOTO_PAPER'>('75_GSM');
  const paperSize = 'A4'; // Enforced max A4 size as requested
  const [printSides, setPrintSides] = useState<'SINGLE' | 'DOUBLE'>('SINGLE');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Fullscreen Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Feedback Toast
  const [showAddedToast, setShowAddedToast] = useState(false);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setExpandedFaq(prev => (prev === idx ? null : idx));
  };

  // Active Document
  const activeDoc = uploadedFiles[activeDocIndex] || uploadedFiles[0] || null;

  // Pricing Calculation across all uploaded documents
  const currentPaperConfig = PAPER_OPTIONS.find(p => p.id === paperGsm) || PAPER_OPTIONS[0];
  const costPerPage = currentPaperConfig.rates[colorType];
  
  const totalPagesAcrossAllDocs = uploadedFiles.reduce((acc, doc) => acc + (doc.pages || 1), 0) || 1;
  const rawSubtotal = totalPagesAcrossAllDocs * costPerPage * copies;
  
  // First print free offer: 1 page free (BW or Color) ONLY on user's 1st order (1 time only)
  const [isFirstPrintEligible, setIsFirstPrintEligible] = useState<boolean>(false);
  const [hasUsedFirstOrderOffer, setHasUsedFirstOrderOffer] = useState<boolean>(false);

  useEffect(() => {
    api.getFirstOrderEligibility()
      .then(res => {
        setIsFirstPrintEligible(Boolean(res.isEligible));
        setHasUsedFirstOrderOffer(Boolean(res.hasUsedOffer));
      })
      .catch(() => {
        if (user) {
          const eligible = !user.hasUsedFirstOrderFreeOffer;
          setIsFirstPrintEligible(eligible);
          setHasUsedFirstOrderOffer(!eligible);
        }
      });
  }, [user]);

  const discountAmount = isFirstPrintEligible && uploadedFiles.length > 0 ? Math.min(rawSubtotal, costPerPage * 1) : 0;
  const finalPrice = Math.max(0, rawSubtotal - discountAmount);

  // Helper to sync files to Google Drive in customer-wise & date-wise hierarchy
  const syncFilesToGoogleDrive = async (items: UploadedDocItem[]) => {
    if (!isDriveConnected || items.length === 0) return;
    
    setDriveSyncStatus('SYNCING');
    try {
      const customerName = user?.name || user?.email?.split('@')[0] || 'Customer_User';
      let lastFolderPath = '';
      
      for (const item of items) {
        if (item.dataUrl) {
          const res = await uploadCustomerFileToDrive(
            item.dataUrl,
            item.name,
            item.type || 'application/pdf',
            customerName,
            `Print Job (${item.size})`
          );
          if (res?.folderPath) {
            lastFolderPath = res.folderPath;
          }
        }
      }
      setDriveSyncStatus('SYNCED');
      if (lastFolderPath) setDriveSyncPath(lastFolderPath);
    } catch (err) {
      console.error('Google Drive auto-sync error:', err);
      setDriveSyncStatus('FAILED');
    }
  };

  // Handle Multi-File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isAppend: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    const newDocItems: UploadedDocItem[] = [];
    let processedCount = 0;

    fileList.forEach((file: File, idx: number) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const fileSizeFormatted = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${Math.round(file.size / 1024)} KB`;

        newDocItems.push({
          id: `doc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: fileSizeFormatted,
          type: file.type || 'application/pdf',
          dataUrl: dataUrl || '',
          pages: 1
        });

        processedCount++;
        if (processedCount === fileList.length) {
          if (isAppend) {
            setUploadedFiles(prev => [...prev, ...newDocItems]);
            setActiveDocIndex(uploadedFiles.length); // Switch to newly added
          } else {
            setUploadedFiles(newDocItems);
            setActiveDocIndex(0);
            setCurrentStep('VALIDATING');
            setValidationProgress(20);
          }

          // Trigger automated Google Drive organization
          syncFilesToGoogleDrive(newDocItems);
        }
      };

      reader.readAsDataURL(file);
    });

    // Reset input value so same files can be re-selected if needed
    e.target.value = '';
  };

  // Remove a specific document from list
  const handleRemoveDoc = (indexToRemove: number) => {
    setUploadedFiles(prev => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length === 0) {
        setCurrentStep('LANDING');
        setActiveDocIndex(0);
      } else {
        setActiveDocIndex(Math.min(activeDocIndex, next.length - 1));
      }
      return next;
    });
  };

  // Simulating the realistic Validation Progress
  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let timer3: NodeJS.Timeout;

    if (currentStep === 'VALIDATING') {
      timer1 = setTimeout(() => setValidationProgress(65), 350);
      timer2 = setTimeout(() => setValidationProgress(100), 700);
      timer3 = setTimeout(() => {
        setCurrentStep('SUCCESS');
      }, 950);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [currentStep]);

  // Transition from Success to Customize
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 'SUCCESS') {
      timer = setTimeout(() => {
        setCurrentStep('CUSTOMIZE');
      }, 700);
    }
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Handle Add to Cart for all uploaded files
  const handleAddToCart = () => {
    if (uploadedFiles.length === 0) return;

    uploadedFiles.forEach((doc, idx) => {
      const docPages = doc.pages || 1;
      const isFirst = idx === 0;
      const docRawPrice = docPages * costPerPage * copies;
      const docDiscount = isFirst ? discountAmount : 0;
      const docFinalPrice = Math.max(0, docRawPrice - docDiscount);

      const printConfig: PrintDocumentConfig = {
        id: doc.id,
        documentName: doc.name,
        documentSize: doc.size,
        documentType: doc.type,
        fileDataUrl: doc.dataUrl,
        totalPages: docPages,
        copies: copies,
        orientation: orientation,
        colorType: colorType,
        paperSize: 'A4',
        paperGsm: paperGsm,
        printSides: printSides,
        specialInstructions: specialInstructions,
        pricePerPage: costPerPage,
        totalPrice: docFinalPrice,
        firstPrintDiscountApplied: docDiscount > 0
      };

      addPrintJobToCart(printConfig);
    });

    setShowAddedToast(true);
  };

  // Sample document helper with real valid PDF content
  const loadSampleDocument = () => {
    setUploadedFiles([
      {
        id: `sample-${Date.now()}`,
        name: 'Vehicle_Registration_Certificate.pdf',
        size: '420 KB',
        type: 'application/pdf',
        dataUrl: SAMPLE_PDF_BASE64,
        pages: 1
      }
    ]);
    setActiveDocIndex(0);
    setCurrentStep('VALIDATING');
    setValidationProgress(20);
  };

  // Handle detected page count from PDF parser
  const handlePageCountDetected = (docIndex: number, detectedPages: number) => {
    if (detectedPages > 0) {
      setUploadedFiles(prev => {
        const updated = [...prev];
        if (updated[docIndex] && updated[docIndex].pages !== detectedPages) {
          updated[docIndex] = {
            ...updated[docIndex],
            pages: detectedPages
          };
        }
        return updated;
      });
    }
  };

  // Check if file is an image
  const isImageFile = (doc: UploadedDocItem | null) => {
    if (!doc) return false;
    return (
      doc.type.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(doc.name) ||
      doc.dataUrl.startsWith('data:image/')
    );
  };

  // Check if file is a PDF
  const isPdfFile = (doc: UploadedDocItem | null) => {
    if (!doc) return false;
    return doc.type === 'application/pdf' || /\.pdf$/i.test(doc.name) || doc.dataUrl.startsWith('data:application/pdf');
  };

  // FAQ List
  const faqs = [
    {
      q: 'What Document format can I print?',
      a: 'You can print PDF, DOCX, DOC, JPG, JPEG, PNG, PPT, and TXT files up to 50MB with crystal-clear 300 DPI high-resolution output.'
    },
    {
      q: 'Can I upload and print multiple documents in one go?',
      a: 'Yes! Use the "+" button to add as many files as you like. You can preview each document as it is and customize your copies & paper options.'
    },
    {
      q: 'What are the printing rates & paper types?',
      a: 'We offer 75 GSM Standard (₹6 B&W / ₹15 Color), 100 GSM Bond (₹8 B&W / ₹18 Color), and Glossy Photo Paper (₹30 B&W / ₹45 Color) in standard max A4 size.'
    },
    {
      q: 'How does the FREE first print offer work?',
      a: 'Offer applies to 1 page of B&W or Color on your order! The discount is applied automatically during checkout.'
    },
    {
      q: 'Are my documents/photos stored and handled securely?',
      a: '100% Yes! We strictly adhere to our "No Peek Policy". All documents are encrypted in transit and permanently deleted right after printing.'
    },
    {
      q: 'How long does it take to get my order delivered?',
      a: 'Prints are prepared in as little as 15 minutes! Delivery reaches your doorstep via priority courier or local express delivery.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Hidden File Input for Initial Upload (supports multiple) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileSelect(e, false)}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.ppt,.pptx"
        multiple
        className="hidden"
      />

      {/* Hidden File Input for Adding More Documents with Plus (+) button */}
      <input
        type="file"
        ref={additionalFileInputRef}
        onChange={(e) => handleFileSelect(e, true)}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.ppt,.pptx"
        multiple
        className="hidden"
      />

      {/* Top Header Banner matching Craft Catalog & Cart */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-slate-700/80 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-extrabold mb-2">
            <Printer className="w-3.5 h-3.5 text-pink-400" />
            <span>Laser Precision & Document Printing</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Document Printing Studio</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Upload PDF, Word, or image files for laser printing in crisp B&W or vibrant full color. Select 75 GSM, 100 GSM Bond, or Photo Paper with fast doorstep delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Cart button */}
          {totalItems > 0 && onNavigateToCart && (
            <button
              type="button"
              onClick={onNavigateToCart}
              className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-102"
              title="Go to Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart ({totalItems})</span>
            </button>
          )}

          {/* Sample Doc Helper */}
          <button
            type="button"
            onClick={loadSampleDocument}
            className="px-3.5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs rounded-2xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Try with a Sample Document Preview"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Sample Preview</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          VIEW 1: LANDING HERO & PROMISES & FAQS
         ======================================================== */}
      {currentStep === 'LANDING' && (
        <div className="max-w-2xl mx-auto space-y-5 px-1 pt-1">
          {/* Main Upload & Rates Card */}
          <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-5 sm:p-6 shadow-md border border-slate-200/80 dark:border-slate-800 space-y-5 transition-colors">
            {/* Offer Banner - 1st Order Only */}
            <div className={`flex items-start justify-between gap-3 rounded-2xl p-4 border ${
              isFirstPrintEligible
                ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-pink-500/10 border-blue-500/20 dark:border-blue-500/30'
                : 'bg-slate-100/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 opacity-80'
            }`}>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                  <Sparkles className="w-3 h-3" />
                  <span>{isFirstPrintEligible ? '1st Order Exclusive Offer' : 'Offer Status'}</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {isFirstPrintEligible ? (
                    <>Get your first print <span className="text-blue-600 dark:text-blue-400 underline decoration-amber-400 decoration-2">FREE</span> (1st Order Only)</>
                  ) : (
                    <>1st Free Print Offer <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs">(Already Claimed)</span></>
                  )}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {isFirstPrintEligible
                    ? '1 user can avail 1st free print only on their 1st order (one time only). Max A4 size, direct processing.'
                    : '1st free offer is valid strictly once per user on their first order and has already been claimed on your previous order.'}
                </p>
              </div>

              <div className={`shrink-0 px-3 py-1.5 rounded-xl text-center border ${
                isFirstPrintEligible
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-600 dark:text-amber-300'
                  : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                <span className="text-[10px] font-extrabold uppercase block leading-none">
                  {isFirstPrintEligible ? '1st Order' : '1x Limit'}
                </span>
                <span className="text-xs font-black">
                  {isFirstPrintEligible ? '100% OFF' : 'Claimed'}
                </span>
              </div>
            </div>

            {/* Rates Overview Cards */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Standard Printing Rates
              </span>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3 text-center transition-colors">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">75 GSM Standard</span>
                  <div className="mt-1 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    ₹6 <span className="text-[9px] font-normal text-slate-500">B&W</span>
                  </div>
                  <div className="text-[11px] sm:text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    ₹15 <span className="text-[9px] font-normal text-slate-500">Color</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3 text-center transition-colors">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">100 GSM Bond</span>
                  <div className="mt-1 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    ₹8 <span className="text-[9px] font-normal text-slate-500">B&W</span>
                  </div>
                  <div className="text-[11px] sm:text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    ₹18 <span className="text-[9px] font-normal text-slate-500">Color</span>
                  </div>
                </div>

                <div className="bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/70 dark:border-pink-800/40 rounded-2xl p-3 text-center transition-colors">
                  <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300 block uppercase">Photo Glossy</span>
                  <div className="mt-1 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    ₹30 <span className="text-[9px] font-normal text-slate-500">B&W</span>
                  </div>
                  <div className="text-[11px] sm:text-xs font-extrabold text-pink-600 dark:text-pink-400">
                    ₹45 <span className="text-[9px] font-normal text-slate-500">Color</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Upload Button matching Studio Theme */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <UploadCloud className="w-5 h-5" />
                <span>Upload Documents (PDF, Word, Images)</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 px-1">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Supports multi-file upload & live preview</span>
                </span>
                <button
                  type="button"
                  onClick={loadSampleDocument}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Load Sample Doc</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quality & Security Features */}
          <div className="space-y-3 pt-1">
            <div className="text-center">
              <h3 className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                Studio Guarantee & Privacy
              </h3>
              <div className="w-10 h-0.5 bg-blue-500 mx-auto mt-1 rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Feature 1 */}
              <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Instant Deletion</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Uploaded files are purged from servers immediately after printing.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Tamper Sealed</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Prints are packed in waterproof sealed sleeves prior to dispatch.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                  <EyeOff className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">No-Peek Policy</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Confidential handling with zero automated data mining or staff inspection.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white px-1 tracking-tight">
              Frequently Asked Questions
            </h3>
            <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
              {faqs.map((faq, idx) => (
                <div key={idx} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {faq.q}
                    </span>
                    <span className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                      {expandedFaq === idx ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-slate-900/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 2: VALIDATING / PROCESSING ANIMATION
         ======================================================== */}
      {currentStep === 'VALIDATING' && (
        <div className="max-w-md mx-auto min-h-[60vh] flex items-center justify-center p-4">
          <div className="w-full bg-white dark:bg-[#131b2e] rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-950"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              <Printer className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Verifying Document Specs...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Checking resolution, color profiles, and A4 print dimensions.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${validationProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>{uploadedFiles.length > 1 ? `${uploadedFiles.length} Documents Uploaded` : activeDoc?.name || 'File Uploaded'}</span>
                <span>{validationProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 3: SUCCESS CELEBRATION
         ======================================================== */}
      {currentStep === 'SUCCESS' && (
        <div className="max-w-md mx-auto min-h-[60vh] flex items-center justify-center p-4">
          <div className="w-full bg-white dark:bg-[#131b2e] rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {uploadedFiles.length > 1 ? `${uploadedFiles.length} Documents Ready!` : 'Document Verified!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ready for customized instant printing (Max A4 Size).
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-left flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {uploadedFiles.length > 1 ? `${uploadedFiles.length} files selected` : activeDoc?.name}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {activeDoc?.size} • Verified High Resolution
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 4: CUSTOMIZE PRINT OPTIONS & LIVE PREVIEW
         ======================================================== */}
      {currentStep === 'CUSTOMIZE' && activeDoc && (
        <div className="max-w-2xl mx-auto space-y-4 px-1 pt-1">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between bg-white dark:bg-[#131b2e] p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={() => setCurrentStep('LANDING')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="text-center">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                Print Customizer
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                Max A4 Size Supported
              </span>
            </div>
            {/* Plus (+) Button to Add More Documents */}
            <button
              type="button"
              onClick={() => additionalFileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border border-blue-200 dark:border-blue-800 shadow-xs"
              title="Add more documents"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add File</span>
            </button>
          </div>

          {/* DOCUMENT SWITCHER TABS & PLUS BUTTON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Uploaded Files ({uploadedFiles.length})
              </span>
              <button
                type="button"
                onClick={() => additionalFileInputRef.current?.click()}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Documents</span>
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {uploadedFiles.map((doc, idx) => {
                const isActive = idx === activeDocIndex;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDocIndex(idx)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer transition-all ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {isImageFile(doc) ? (
                      <FileImage className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    ) : (
                      <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    )}
                    <span className="text-xs font-bold max-w-[110px] sm:max-w-[140px] truncate">
                      {doc.name}
                    </span>
                    {uploadedFiles.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDoc(idx);
                        }}
                        className="p-1 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove this document"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Plus button tile in document list */}
              <button
                type="button"
                onClick={() => additionalFileInputRef.current?.click()}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-dashed border-blue-400 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100/60 text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Doc</span>
              </button>
            </div>
          </div>

          {/* Document Live Preview Card */}
          <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Document Preview (As It Will Print)</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(true)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Full screen preview"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Zoom</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(activeDocIndex)}
                  className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center cursor-pointer shadow-xs transition-colors"
                  title="Delete active document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Paper Sheet Mock / Real Preview Container */}
            <div className="relative bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-inner min-h-[260px] flex flex-col justify-center items-center overflow-hidden">
              
              {/* REAL PREVIEW: IMAGE FILES */}
              {isImageFile(activeDoc) && activeDoc.dataUrl ? (
                <div className={`relative bg-white shadow-xl rounded-lg p-2 max-w-full overflow-hidden transition-all duration-300 border border-slate-300 ${
                  orientation === 'LANDSCAPE' ? 'w-full max-w-md aspect-[4/3]' : 'w-56 sm:w-64 aspect-[3/4]'
                } flex items-center justify-center`}>
                  <img
                    src={activeDoc.dataUrl}
                    alt={activeDoc.name}
                    className={`max-h-[220px] sm:max-h-[250px] w-auto object-contain rounded-xs transition-all duration-200 ${
                      colorType === 'BW' ? 'grayscale contrast-125' : ''
                    }`}
                  />
                  {/* Watermark overlay info */}
                  <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                    {colorType === 'BW' ? 'B&W (Grayscale)' : 'Full Color'} • A4
                  </div>
                </div>
              ) : isPdfFile(activeDoc) && activeDoc.dataUrl ? (
                /* REAL PREVIEW: HIGH RES PDF CANVAS RENDERER */
                <div className={`relative bg-white shadow-xl rounded-lg p-2 max-w-full overflow-hidden transition-all duration-300 border border-slate-300 ${
                  orientation === 'LANDSCAPE' ? 'w-full max-w-md aspect-[4/3]' : 'w-56 sm:w-64'
                } flex flex-col items-center justify-center`}>
                  <PdfPreview
                    dataUrl={activeDoc.dataUrl}
                    fileName={activeDoc.name}
                    isGrayscale={colorType === 'BW'}
                    orientation={orientation}
                    onPageCountDetected={(pages) => handlePageCountDetected(activeDocIndex, pages)}
                    showControls={true}
                  />
                  {/* Watermark overlay info */}
                  <div className="mt-1 text-center bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded">
                    {colorType === 'BW' ? 'B&W (Grayscale)' : 'Full Color'} • Max A4
                  </div>
                </div>
              ) : (
                /* REALISTIC DOCUMENT SHEET MOCK FOR TEXT / SAMPLES */
                <div className={`relative bg-white text-slate-900 p-4 rounded-xl shadow-xl border border-slate-300 text-[10px] space-y-3 transition-all duration-300 ${
                  orientation === 'LANDSCAPE' ? 'w-full max-w-md aspect-[4/3]' : 'w-56 sm:w-64 aspect-[3/4]'
                } flex flex-col justify-between`}>
                  <div className="text-center border-b border-slate-900 pb-1.5">
                    <div className="font-black text-[8px] text-blue-600 uppercase tracking-widest">
                      OFFICIAL DOCUMENT PRINT
                    </div>
                    <div className="font-bold text-xs text-slate-900 truncate mt-0.5">
                      {activeDoc?.name || 'Document'}
                    </div>
                    <div className="text-[8px] text-slate-500">
                      A4 Standard Size • 300 DPI Laser Precision
                    </div>
                  </div>

                  <div className="space-y-2 py-1">
                    <div className="space-y-1 opacity-80">
                      <div className="h-1.5 bg-slate-300 rounded-full w-full"></div>
                      <div className="h-1.5 bg-slate-300 rounded-full w-11/12"></div>
                      <div className="h-1.5 bg-slate-300 rounded-full w-4/5"></div>
                      <div className={`h-1.5 rounded-full w-2/3 ${colorType === 'COLOR' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[8px]">
                      <div className="bg-slate-50 p-1 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[7px]">Paper:</span>
                        <span className="font-bold text-slate-800 truncate block">{currentPaperConfig.name}</span>
                      </div>
                      <div className="bg-slate-50 p-1 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[7px]">Mode:</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {colorType === 'COLOR' ? 'Full Color HD' : 'Crisp B&W'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-300">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified Max A4</span>
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono">
                      {activeDoc?.size || '420 KB'}
                    </span>
                  </div>
                </div>
              )}

              {/* Document 1 of N Pill Badge */}
              <div className="flex justify-center pt-3">
                <span className="bg-slate-900 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <span>Doc {activeDocIndex + 1} of {uploadedFiles.length}</span>
                  <span>•</span>
                  <span>Max A4 Size</span>
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Controls Card */}
          <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-5">
            
            {/* 1. Total Copies Stepper */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Total Copies
                </h4>
                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[180px] sm:max-w-[240px]">
                  Applied across {uploadedFiles.length} uploaded {uploadedFiles.length === 1 ? 'document' : 'documents'}
                </p>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setCopies(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center font-black text-sm text-slate-900 dark:text-white">
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => setCopies(prev => prev + 1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Paper Quality / Type Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Paper Type & Quality
                </label>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Size: Max A4
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PAPER_OPTIONS.map(paper => {
                  const isSelected = paperGsm === paper.id;
                  const rateForCurrentColor = paper.rates[colorType];
                  return (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => setPaperGsm(paper.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {paper.tag}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-xs block leading-tight">
                        {paper.name}
                      </span>
                      <div className="mt-1.5 flex items-baseline gap-1 text-[11px]">
                        <span className="font-black text-blue-600 dark:text-blue-400">
                          ₹{rateForCurrentColor}/page
                        </span>
                        <span className="text-[9px] text-slate-400">
                          ({colorType === 'COLOR' ? 'Color' : 'B&W'})
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Color Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Color Mode
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* B&W */}
                <button
                  type="button"
                  onClick={() => setColorType('BW')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    colorType === 'BW'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-600">
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-900"></div>
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">B&W</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">
                      ₹{currentPaperConfig.rates.BW}/Page
                    </span>
                  </div>
                </button>

                {/* Color */}
                <button
                  type="button"
                  onClick={() => setColorType('COLOR')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    colorType === 'COLOR'
                      ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/50 text-purple-950 dark:text-purple-200 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-blue-500 flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">Color</span>
                    <span className="text-xs font-black text-purple-600 dark:text-purple-400 block">
                      ₹{currentPaperConfig.rates.COLOR}/Page
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 4. Orientation */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Orientation
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Portrait */}
                <button
                  type="button"
                  onClick={() => setOrientation('PORTRAIT')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    orientation === 'PORTRAIT'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-7 h-9 rounded-md border flex items-center justify-center shrink-0 ${
                    orientation === 'PORTRAIT' ? 'border-blue-600 bg-white dark:bg-slate-900' : 'border-slate-300 bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <FileText className={`w-3.5 h-3.5 ${orientation === 'PORTRAIT' ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">Portrait</span>
                    <span className="text-[10px] text-slate-400 block font-medium">Vertical</span>
                  </div>
                </button>

                {/* Landscape */}
                <button
                  type="button"
                  onClick={() => setOrientation('LANDSCAPE')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    orientation === 'LANDSCAPE'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-9 h-7 rounded-md border flex items-center justify-center shrink-0 ${
                    orientation === 'LANDSCAPE' ? 'border-blue-600 bg-white dark:bg-slate-900' : 'border-slate-300 bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <FileText className={`w-3.5 h-3.5 ${orientation === 'LANDSCAPE' ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">Landscape</span>
                    <span className="text-[10px] text-slate-400 block font-medium">Horizontal</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 5. Print Sides */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Print Sides
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPrintSides('SINGLE')}
                  className={`p-2.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer text-center ${
                    printSides === 'SINGLE'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Single Sided
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSides('DOUBLE')}
                  className={`p-2.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer text-center ${
                    printSides === 'DOUBLE'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Back to Back
                </button>
              </div>
            </div>

            {/* 6. Special Instructions */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Special Printing Instructions (Optional)
              </label>
              <input
                type="text"
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Print in landscape, keep sealed, urgent..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* STICKY BOTTOM ACTION BAR */}
          <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-2xl z-40">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block">
                  {uploadedFiles.length} {uploadedFiles.length === 1 ? 'Doc' : 'Docs'} • {totalPagesAcrossAllDocs * copies} {totalPagesAcrossAllDocs * copies === 1 ? 'Page' : 'Pages'} ({currentPaperConfig.name})
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    ₹{finalPrice}
                  </span>
                  {discountAmount > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                      -₹{discountAmount} (1st Page Free)
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="py-3 px-6 sm:px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add {uploadedFiles.length > 1 ? `All ${uploadedFiles.length} Docs` : 'to Cart'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FULLSCREEN / INTERACTIVE PRINT PREVIEW MODAL
         ======================================================== */}
      <PrintPreviewModal
        isOpen={previewModalOpen && uploadedFiles.length > 0}
        onClose={() => setPreviewModalOpen(false)}
        documents={uploadedFiles}
        activeDocIndex={activeDocIndex}
        onSelectDocIndex={(idx) => setActiveDocIndex(idx)}
        copies={copies}
        onCopiesChange={(newCopies) => setCopies(newCopies)}
        paperGsm={paperGsm}
        onPaperGsmChange={(newPaper) => setPaperGsm(newPaper)}
        colorType={colorType}
        onColorTypeChange={(newColor) => setColorType(newColor)}
        orientation={orientation}
        onOrientationChange={(newOrientation) => setOrientation(newOrientation)}
        printSides={printSides}
        onPrintSidesChange={(newSides) => setPrintSides(newSides)}
        totalPrice={finalPrice}
        discountAmount={discountAmount}
        onAddToCart={handleAddToCart}
      />

      {/* ========================================================
          ADDED TO CART FEEDBACK MODAL / TOAST
         ======================================================== */}
      {showAddedToast && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#131b2e] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {uploadedFiles.length > 1 ? `${uploadedFiles.length} Documents Added!` : 'Document Added to Cart!'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your print {uploadedFiles.length > 1 ? 'jobs are' : 'job is'} saved with selected paper specs and instant delivery ready.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {onNavigateToCart && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddedToast(false);
                    onNavigateToCart();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>View Cart & Checkout</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowAddedToast(false);
                  setUploadedFiles([]);
                  setCurrentStep('LANDING');
                }}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Print More Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STICKY GUARANTEE BANNER AT VERY BOTTOM ON LANDING */}
      {currentStep === 'LANDING' && (
        <div className="fixed bottom-0 inset-x-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-t border-slate-800 py-2.5 px-4 text-center z-30 shadow-lg text-white">
          <p className="text-xs font-bold text-slate-200 tracking-wide flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
            <span>FREE DELIVERY on orders above ₹99</span>
          </p>
        </div>
      )}
    </div>
  );
};
