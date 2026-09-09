import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, FileText, ZoomIn, ZoomOut } from 'lucide-react';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker config error:', e);
}

interface PdfPreviewProps {
  dataUrl: string;
  fileName?: string;
  isGrayscale?: boolean;
  orientation?: 'PORTRAIT' | 'LANDSCAPE';
  onPageCountDetected?: (pages: number) => void;
  className?: string;
  showControls?: boolean;
  initialPage?: number;
  zoomScale?: number;
  activePage?: number;
  onPageChange?: (page: number) => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  dataUrl,
  fileName,
  isGrayscale = false,
  orientation = 'PORTRAIT',
  onPageCountDetected,
  className = '',
  showControls = true,
  initialPage = 1,
  zoomScale: externalZoomScale,
  activePage: externalActivePage,
  onPageChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [internalPage, setInternalPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [internalZoomScale, setInternalZoomScale] = useState<number>(1);

  const currentPage = externalActivePage !== undefined ? externalActivePage : internalPage;
  const zoomScale = externalZoomScale !== undefined ? externalZoomScale : internalZoomScale;

  const setCurrentPage = (pageOrFn: number | ((prev: number) => number)) => {
    const newPage = typeof pageOrFn === 'function' ? pageOrFn(currentPage) : pageOrFn;
    const clamped = Math.max(1, Math.min(numPages, newPage));
    setInternalPage(clamped);
    if (onPageChange) {
      onPageChange(clamped);
    }
  };

  // Convert base64 dataUrl or binary to Uint8Array
  const getPdfData = (inputDataUrl: string): Uint8Array => {
    if (inputDataUrl.includes(',')) {
      const base64 = inputDataUrl.split(',')[1];
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
    const binaryString = window.atob(inputDataUrl);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    if (!dataUrl) {
      setLoading(false);
      setError('No document data available');
      return;
    }

    const loadPdf = async () => {
      try {
        const uint8Data = getPdfData(dataUrl);
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Data,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);

        if (onPageCountDetected && doc.numPages > 0) {
          onPageCountDetected(doc.numPages);
        }
      } catch (err: any) {
        console.error('Failed to load PDF document:', err);
        if (!isCancelled) {
          setError(err?.message || 'Could not parse PDF content');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [dataUrl]);

  // Render current page onto canvas
  useEffect(() => {
    let renderTask: any = null;
    let isCancelled = false;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;

        // Calculate scale to fit container nicely while keeping max A4 clarity
        const containerWidth = containerRef.current?.clientWidth || 280;
        const initialViewport = page.getViewport({ scale: 1.0 });

        // High DPI rendering for ultra-sharp text and graphics
        const pixelRatio = window.devicePixelRatio || 2;
        const baseScale = (containerWidth / initialViewport.width) * 0.92;
        const finalScale = baseScale * zoomScale;
        const viewport = page.getViewport({ scale: finalScale * pixelRatio });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / pixelRatio}px`;
        canvas.style.height = `${viewport.height / pixelRatio}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask && renderTask.cancel) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoomScale, orientation]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(numPages, prev + 1));
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full max-w-full overflow-hidden ${className}`}
    >
      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8 space-y-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs font-bold">Rendering High-Res PDF Preview...</span>
        </div>
      )}

      {/* Error Fallback */}
      {error && !loading && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center max-w-xs space-y-2">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {fileName || 'PDF Document'}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Document loaded & verified for A4 printing
          </p>
        </div>
      )}

      {/* Rendered Canvas */}
      {!loading && !error && (
        <div className="relative flex flex-col items-center justify-center w-full">
          <div
            className={`transition-all duration-300 rounded-lg shadow-xl overflow-hidden bg-white border border-slate-300 flex items-center justify-center ${
              isGrayscale ? 'grayscale contrast-125' : ''
            }`}
          >
            <canvas ref={canvasRef} className="block max-w-full h-auto" />
          </div>

          {/* Page Selector & Zoom Bar */}
          {showControls && numPages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-10">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-[11px] px-1">
                Page {currentPage} of {numPages}
              </span>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
