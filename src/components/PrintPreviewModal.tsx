import React, { useState } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  FileImage, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Layers, 
  Sparkles, 
  Check, 
  ShoppingCart, 
  Maximize2, 
  Minimize2, 
  Eye, 
  Sliders, 
  HelpCircle,
  ShieldCheck,
  CircleDot
} from 'lucide-react';
import { PdfPreview } from './PdfPreview';

export interface UploadedDocItem {
  id: string;
  name: string;
  size: string;
  type?: string;
  dataUrl?: string;
  pages?: number;
  file?: File;
  pageCount?: number;
  previewUrl?: string;
}

export type PaperTypeOption = '75_GSM' | '100_GSM' | 'PHOTO_PAPER';
export type ColorModeOption = 'BW' | 'COLOR';
export type OrientationOption = 'PORTRAIT' | 'LANDSCAPE';
export type PrintSidesOption = 'SINGLE' | 'DOUBLE';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: UploadedDocItem[];
  activeDocIndex: number;
  onSelectDocIndex: (index: number) => void;
  // Print settings
  copies: number;
  onCopiesChange: (copies: number) => void;
  paperGsm: PaperTypeOption;
  onPaperGsmChange: (paper: PaperTypeOption) => void;
  colorType: ColorModeOption;
  onColorTypeChange: (color: ColorModeOption) => void;
  orientation: OrientationOption;
  onOrientationChange: (orientation: OrientationOption) => void;
  printSides: PrintSidesOption;
  onPrintSidesChange: (sides: PrintSidesOption) => void;
  specialInstructions?: string;
  onSpecialInstructionsChange?: (notes: string) => void;
  // Pricing
  totalPrice: number;
  discountAmount?: number;
  onAddToCart: () => void;
}

const PAPER_CONFIGS: Record<PaperTypeOption, { name: string; tag: string; desc: string; rates: { BW: number; COLOR: number } }> = {
  '75_GSM': {
    name: '75 GSM Standard',
    tag: 'Everyday',
    desc: 'Crisp everyday laser printing for assignments, forms, notes & contracts.',
    rates: { BW: 6, COLOR: 15 }
  },
  '100_GSM': {
    name: '100 GSM Executive Bond',
    tag: 'Executive',
    desc: 'Heavyweight bond paper with high opacity. Ideal for resumes & formal proposals.',
    rates: { BW: 8, COLOR: 18 }
  },
  'PHOTO_PAPER': {
    name: 'Photo Paper',
    tag: 'Glossy HD',
    desc: 'High-gloss photographic finish for vibrant portfolios, artwork & vivid graphics.',
    rates: { BW: 30, COLOR: 45 }
  }
};

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  documents,
  activeDocIndex,
  onSelectDocIndex,
  copies,
  onCopiesChange,
  paperGsm,
  onPaperGsmChange,
  colorType,
  onColorTypeChange,
  orientation,
  onOrientationChange,
  printSides,
  onPrintSidesChange,
  totalPrice,
  discountAmount = 0,
  onAddToCart
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [activePage, setActivePage] = useState<number>(1);
  const [showMargins, setShowMargins] = useState<boolean>(true);
  const [showPunchHoles, setShowPunchHoles] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  if (!isOpen || documents.length === 0) return null;

  const activeDoc = documents[activeDocIndex] || documents[0];
  const numPages = activeDoc.pageCount || 1;
  const isImage = activeDoc.name.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/i) || activeDoc.file?.type.startsWith('image/');
  const isPdf = activeDoc.name.match(/\.pdf$/i) || activeDoc.file?.type === 'application/pdf';

  const currentPaper = PAPER_CONFIGS[paperGsm];

  const handleZoomIn = () => setZoomScale(prev => Math.min(2.5, +(prev + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomScale(prev => Math.max(0.5, +(prev - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoomScale(1);

  const toggleOrientation = () => {
    onOrientationChange(orientation === 'PORTRAIT' ? 'LANDSCAPE' : 'PORTRAIT');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className={`relative bg-slate-900 border border-slate-700/80 rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden text-slate-100 transition-all ${
          isFullscreen ? 'h-full max-h-screen rounded-none' : 'max-w-6xl max-h-[94vh] h-[92vh]'
        }`}
      >
        {/* ========================================================
            TOP BAR: TITLE & DOCUMENT SWITCHER & ACTIONS
           ======================================================== */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                  Print Preview Studio
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  A4 Laser Simulated
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                {activeDoc.name} • {activeDoc.size} • {numPages} {numPages === 1 ? 'Page' : 'Pages'}
              </p>
            </div>
          </div>

          {/* Document Switcher (if > 1 doc) */}
          {documents.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm py-1">
              {documents.map((doc, idx) => {
                const isSelected = idx === activeDocIndex;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onSelectDocIndex(idx);
                      setActivePage(1);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>Doc {idx + 1}</span>
                    <span className="text-[10px] opacity-75 max-w-[70px] truncate">({doc.name})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Toolbar & Close */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(prev => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showSettingsDrawer
                  ? 'bg-blue-600/30 border-blue-500/40 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle Print Settings Panel"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 border border-slate-700 text-slate-400 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================
            MAIN BODY: CANVAS STAGE & INTERACTIVE SETTINGS DRAWER
           ======================================================== */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Canvas & Controls Center Stage */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
            
            {/* FLOATING SUB-TOOLBAR: ZOOM / COLOR / MARGINS / ORIENTATION */}
            <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 z-20 shrink-0">
              
              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-800/90 rounded-2xl p-1 border border-slate-700/60 shadow-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 text-xs font-mono font-bold text-slate-200 hover:text-blue-400 cursor-pointer"
                  title="Reset Zoom to 100%"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* View Simulation Helpers */}
              <div className="flex items-center gap-1.5">
                {/* Color Mode Quick Toggle */}
                <button
                  type="button"
                  onClick={() => onColorTypeChange(colorType === 'BW' ? 'COLOR' : 'BW')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    colorType === 'BW'
                      ? 'bg-slate-800 border-slate-600 text-slate-200'
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-white shadow-xs'
                  }`}
                  title="Toggle Color Simulation"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{colorType === 'BW' ? 'Grayscale (B&W)' : 'Full Color'}</span>
                </button>

                {/* Orientation Quick Toggle */}
                <button
                  type="button"
                  onClick={toggleOrientation}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Rotate Sheet Orientation"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>{orientation === 'PORTRAIT' ? 'Portrait' : 'Landscape'}</span>
                </button>

                {/* Safe Margins Guide Toggle */}
                <button
                  type="button"
                  onClick={() => setShowMargins(prev => !prev)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer hidden md:flex items-center gap-1 ${
                    showMargins
                      ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                  title="Toggle 0.25 inch printable margins guide"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Margins</span>
                </button>

                {/* Punch Holes Guide Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPunchHoles(prev => !prev)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer hidden md:flex items-center gap-1 ${
                    showPunchHoles
                      ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                  title="Simulate 2-hole spiral/binder punch zone"
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  <span>Punch Holes</span>
                </button>
              </div>
            </div>

            {/* INTERACTIVE SHEET CONTAINER */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative">
              {/* Background Grid Accent */}
              <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
                  backgroundSize: '24px 24px'
                }}
              />

              {/* SIMULATED A4 PAPER SHEET */}
              <div 
                className="relative bg-white text-slate-900 transition-all duration-300 flex flex-col shadow-2xl border border-slate-300"
                style={{
                  width: orientation === 'PORTRAIT' ? `${380 * zoomScale}px` : `${537 * zoomScale}px`,
                  minHeight: orientation === 'PORTRAIT' ? `${537 * zoomScale}px` : `${380 * zoomScale}px`,
                  aspectRatio: orientation === 'PORTRAIT' ? '210 / 297' : '297 / 210',
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Visual Margin Safe Line Overlay */}
                {showMargins && (
                  <div className="absolute inset-4 sm:inset-5 border border-dashed border-blue-400/50 pointer-events-none z-10">
                    <span className="absolute top-1 left-1.5 text-[8px] font-mono text-blue-500/80 uppercase tracking-widest">
                      Safe Printable Area (A4)
                    </span>
                  </div>
                )}

                {/* Simulated Punch Holes Guide */}
                {showPunchHoles && orientation === 'PORTRAIT' && (
                  <div className="absolute left-2 inset-y-0 flex flex-col justify-around py-12 pointer-events-none z-10">
                    <div className="w-3 h-3 rounded-full border-2 border-dashed border-slate-400 bg-slate-200/60"></div>
                    <div className="w-3 h-3 rounded-full border-2 border-dashed border-slate-400 bg-slate-200/60"></div>
                  </div>
                )}

                {/* SHEET CONTENT AREA */}
                <div 
                  className={`flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden ${
                    colorType === 'BW' ? 'grayscale contrast-125' : ''
                  }`}
                >
                  {isImage && activeDoc.dataUrl ? (
                    <img
                      src={activeDoc.dataUrl}
                      alt={activeDoc.name}
                      className="max-h-full max-w-full object-contain rounded-xs shadow-xs"
                    />
                  ) : isPdf && activeDoc.dataUrl ? (
                    <PdfPreview
                      dataUrl={activeDoc.dataUrl}
                      fileName={activeDoc.name}
                      isGrayscale={colorType === 'BW'}
                      orientation={orientation}
                      showControls={false}
                      zoomScale={zoomScale}
                      activePage={activePage}
                      onPageCountDetected={(pages) => {
                        activeDoc.pageCount = pages;
                      }}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{activeDoc.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">Official Print Document Loaded</p>
                      </div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <Check className="w-3 h-3" />
                        <span>Ready for Laser Calibration</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Watermark / Paper Type Stamp at bottom */}
                <div className="px-4 py-1.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between text-[9px] font-bold text-slate-500">
                  <span>{currentPaper.name}</span>
                  <span>A4 • {orientation} • {colorType}</span>
                </div>
              </div>
            </div>

            {/* BOTTOM PAGE FLIP CONTROLS (For Multi-page PDF) */}
            {numPages > 1 && (
              <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center gap-3 shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                  disabled={activePage <= 1}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev Page</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-400">Page</span>
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={activePage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= numPages) {
                        setActivePage(val);
                      }
                    }}
                    className="w-12 text-center bg-slate-800 border border-slate-700 rounded-lg py-1 font-bold text-white focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-slate-400">of {numPages}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePage(prev => Math.min(numPages, prev + 1))}
                  disabled={activePage >= numPages}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Next Page</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ========================================================
              RIGHT SIDEBAR: LIVE PRINT SETTINGS & COST BREAKDOWN
             ======================================================== */}
          {showSettingsDrawer && (
            <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto">
              
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <h4 className="font-extrabold text-sm text-white">Live Print Controls</h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Instant Sync
                </span>
              </div>

              {/* Drawer Settings Content */}
              <div className="p-4 space-y-4 flex-1">
                
                {/* 1. Paper Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Paper Quality
                  </label>
                  <div className="space-y-2">
                    {(Object.keys(PAPER_CONFIGS) as PaperTypeOption[]).map((key) => {
                      const item = PAPER_CONFIGS[key];
                      const isSelected = paperGsm === key;
                      const rate = colorType === 'COLOR' ? item.rates.COLOR : item.rates.BW;

                      return (
                        <div
                          key={key}
                          onClick={() => onPaperGsmChange(key)}
                          className={`p-2.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                              : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{item.name}</span>
                            <span className="text-xs font-extrabold text-blue-400">₹{rate}/page</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Color Mode Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Color Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onColorTypeChange('BW')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        colorType === 'BW'
                          ? 'bg-slate-800 border-blue-500 text-white shadow-xs'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xs font-extrabold block">B&W Grayscale</span>
                      <span className="text-[11px] font-bold text-blue-400">₹{currentPaper.rates.BW}/page</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onColorTypeChange('COLOR')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        colorType === 'COLOR'
                          ? 'bg-purple-950/40 border-purple-500 text-white shadow-xs'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xs font-extrabold block">Full Color</span>
                      <span className="text-[11px] font-bold text-purple-400">₹{currentPaper.rates.COLOR}/page</span>
                    </button>
                  </div>
                </div>

                {/* 3. Orientation & Print Sides */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Orientation
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => onOrientationChange(e.target.value as OrientationOption)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white cursor-pointer focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="PORTRAIT">Portrait (Vertical)</option>
                      <option value="LANDSCAPE">Landscape (Horizontal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Print Sides
                    </label>
                    <select
                      value={printSides}
                      onChange={(e) => onPrintSidesChange(e.target.value as PrintSidesOption)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white cursor-pointer focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="SINGLE">Single Sided</option>
                      <option value="DOUBLE">Back to Back</option>
                    </select>
                  </div>
                </div>

                {/* 4. Copies Stepper */}
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-white block">Number of Copies</span>
                    <span className="text-[10px] text-slate-400">Total printed sets</span>
                  </div>

                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 gap-2">
                    <button
                      type="button"
                      onClick={() => onCopiesChange(Math.max(1, copies - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-mono font-black text-xs text-white">
                      {copies}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCopiesChange(copies + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Security Guarantee Note */}
                <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-2xl flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Privacy Guarantee: File is automatically purged from memory following laser transfer.
                  </p>
                </div>
              </div>

              {/* Drawer Footer & Direct Add to Cart Action */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Estimated Cost</span>
                    <span className="text-xl font-black text-white">₹{totalPrice}</span>
                  </div>
                  {discountAmount > 0 && (
                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                      -₹{discountAmount} (Welcome Free)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddToCart();
                    onClose();
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Confirm & Add to Cart</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
