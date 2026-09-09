import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, PrintDocumentConfig } from '../types';
import { saveFileBlob, getFileBlob, deleteFileBlob } from '../utils/fileStorage';

export interface CartItem {
  product: Product;
  quantity: number;
  customNote?: string;
  printConfig?: PrintDocumentConfig;
}

interface CartContextType {
  cart: CartItem[];
  totalItems: number;
  subtotal: number;
  addToCart: (product: Product, quantity?: number, note?: string) => void;
  addPrintJobToCart: (config: PrintDocumentConfig) => void;
  buyNow: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNote: (productId: string, note: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  isCheckoutOpen: boolean;
  checkoutInitialStep: 'CART' | 'SHIPPING';
  openCheckout: (step?: 'CART' | 'SHIPPING') => void;
  closeCheckout: () => void;
  justAddedId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'cards_crafted_cart_v1';

// Helper to sanitize cart for localStorage so base64 strings don't exceed storage quota
const sanitizeCartForLocalStorage = (cartItems: CartItem[]): CartItem[] => {
  return cartItems.map(item => {
    const isLargeDoc = item.product.category === 'DOCUMENT_PRINTING';
    
    // Copy item
    const sanitizedItem: CartItem = {
      ...item,
      product: {
        ...item.product,
        // Only strip if it's a huge base64 dataUrl (> 2KB)
        imageUrl: (item.product.imageUrl && item.product.imageUrl.length > 2048) ? undefined : item.product.imageUrl
      },
      printConfig: item.printConfig ? {
        ...item.printConfig,
        // Omit huge base64 string from localStorage (it is safely stored in IndexedDB)
        fileDataUrl: (item.printConfig.fileDataUrl && item.printConfig.fileDataUrl.length > 2048) ? '' : item.printConfig.fileDataUrl
      } : undefined
    };

    return sanitizedItem;
  });
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      // Clean up duplicate legacy key to free up quota
      try {
        localStorage.removeItem('craft_cart');
      } catch {}

      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutInitialStep, setCheckoutInitialStep] = useState<'CART' | 'SHIPPING'>('CART');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Re-hydrate large document files from IndexedDB after initial load
  useEffect(() => {
    let isMounted = true;
    const hydrateLargeFiles = async () => {
      let needsUpdate = false;
      const updatedCart = await Promise.all(
        cart.map(async (item) => {
          if (item.product.category === 'DOCUMENT_PRINTING' && item.printConfig && !item.printConfig.fileDataUrl) {
            const blob = await getFileBlob(item.product.id);
            if (blob) {
              needsUpdate = true;
              return {
                ...item,
                product: {
                  ...item.product,
                  imageUrl: blob
                },
                printConfig: {
                  ...item.printConfig,
                  fileDataUrl: blob
                }
              };
            }
          }
          return item;
        })
      );

      if (needsUpdate && isMounted) {
        setCart(updatedCart);
      }
    };

    hydrateLargeFiles();

    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  // Synchronize cart with localStorage (sanitized) and IndexedDB for large files
  useEffect(() => {
    // 1. Persist large blobs to IndexedDB
    cart.forEach(item => {
      if (item.product.category === 'DOCUMENT_PRINTING' && item.printConfig?.fileDataUrl && item.printConfig.fileDataUrl.length > 2048) {
        saveFileBlob(item.product.id, item.printConfig.fileDataUrl);
      }
    });

    // 2. Persist lightweight metadata to localStorage
    try {
      const sanitized = sanitizeCartForLocalStorage(cart);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (err) {
      console.warn('Could not persist cart metadata to localStorage, using in-memory state:', err);
    }
  }, [cart]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice || 0) * item.quantity, 0);

  const addToCart = (product: Product, quantity = 1, note?: string) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                quantity: item.quantity + quantity,
                customNote: note || item.customNote
              }
            : item
        );
      }
      return [...prev, { product, quantity, customNote: note }];
    });

    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 2000);
  };

  const addPrintJobToCart = (config: PrintDocumentConfig) => {
    const printId = config.id || `print-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Rates: 75 GSM (BW: 6, Color: 15), 100 GSM (BW: 8, Color: 18), Photo Paper (BW: 30, Color: 45)
    const getRate = (gsm: string, color: 'BW' | 'COLOR') => {
      if (gsm === '100_GSM') return color === 'COLOR' ? 18 : 8;
      if (gsm === 'PHOTO_PAPER') return color === 'COLOR' ? 45 : 30;
      return color === 'COLOR' ? 15 : 6; // 75_GSM
    };

    const costPerPage = config.pricePerPage || getRate(config.paperGsm, config.colorType);
    const paperName = config.paperGsm === 'PHOTO_PAPER' ? 'Photo Paper' : config.paperGsm.replace('_', ' ');
    const basePrice = config.totalPages * costPerPage;
    
    // Save file data to IndexedDB immediately if available
    if (config.fileDataUrl && config.fileDataUrl.length > 2048) {
      saveFileBlob(printId, config.fileDataUrl);
    }

    // Virtual product for Document Print job
    const printProduct: Product = {
      id: printId,
      sku: `DOC-${Date.now().toString().slice(-5)}`,
      name: `Document Print: ${config.documentName}`,
      category: 'DOCUMENT_PRINTING',
      description: `${config.totalPages} Page${config.totalPages > 1 ? 's' : ''} • ${config.colorType === 'COLOR' ? 'Color' : 'B&W'} (₹${costPerPage}/pg) • ${config.orientation} • ${paperName} • ${config.paperSize}`,
      sellingPrice: basePrice,
      costPrice: Math.round(basePrice * 0.4),
      taxPercent: 12,
      stockQuantity: 9999,
      minStock: 10,
      imageUrl: config.fileDataUrl || undefined,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    setCart(prev => [
      ...prev,
      {
        product: printProduct,
        quantity: config.copies || 1,
        customNote: config.specialInstructions || `Orientation: ${config.orientation}, Color: ${config.colorType}, Paper: ${paperName}, Sides: ${config.printSides}`,
        printConfig: { ...config, id: printId, pricePerPage: costPerPage, totalPrice: basePrice * (config.copies || 1) }
      }
    ]);

    setJustAddedId(printId);
    setTimeout(() => setJustAddedId(null), 2000);
  };

  const buyNow = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev;
      return [...prev, { product, quantity: 1 }];
    });
    setCheckoutInitialStep('SHIPPING');
    setIsCheckoutOpen(true);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const updateNote = (productId: string, note: string) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, customNote: note } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    deleteFileBlob(productId);
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    cart.forEach(item => {
      deleteFileBlob(item.product.id);
    });
    setCart([]);
  };

  const openCheckout = (step: 'CART' | 'SHIPPING' = 'CART') => {
    setCheckoutInitialStep(step);
    setIsCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        totalItems,
        subtotal,
        addToCart,
        addPrintJobToCart,
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
