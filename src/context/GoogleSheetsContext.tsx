import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGoogleDrive } from './GoogleDriveContext';
import {
  GoogleSpreadsheetMeta,
  SheetData,
  listSpreadsheets,
  getSpreadsheetDetails,
  createSpreadsheet,
  exportOrdersToNewSheet,
  exportInventoryToNewSheet
} from '../services/googleSheets';

interface GoogleSheetsContextType {
  spreadsheets: GoogleSpreadsheetMeta[];
  loading: boolean;
  exporting: boolean;
  selectedSheetData: SheetData | null;
  loadingSheetData: boolean;
  refreshSpreadsheets: () => Promise<void>;
  fetchSheetDetails: (spreadsheetId: string) => Promise<SheetData | null>;
  createNewSheet: (title: string, headers?: string[], rows?: any[][]) => Promise<any>;
  exportOrders: (orders: any[]) => Promise<any>;
  exportInventory: (inventory: any[]) => Promise<any>;
}

const GoogleSheetsContext = createContext<GoogleSheetsContextType | undefined>(undefined);

export const GoogleSheetsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isConnected } = useGoogleDrive();
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheetMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedSheetData, setSelectedSheetData] = useState<SheetData | null>(null);
  const [loadingSheetData, setLoadingSheetData] = useState(false);

  const refreshSpreadsheets = async () => {
    if (!isConnected) {
      setSpreadsheets([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listSpreadsheets();
      setSpreadsheets(list);
    } catch (err) {
      console.warn('Failed to list spreadsheets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      refreshSpreadsheets();
    } else {
      setSpreadsheets([]);
      setSelectedSheetData(null);
    }
  }, [isConnected]);

  const fetchSheetDetails = async (spreadsheetId: string) => {
    setLoadingSheetData(true);
    try {
      const data = await getSpreadsheetDetails(spreadsheetId);
      setSelectedSheetData(data);
      return data;
    } catch (err) {
      console.error('Failed to get sheet details:', err);
      return null;
    } finally {
      setLoadingSheetData(false);
    }
  };

  const createNewSheet = async (title: string, headers?: string[], rows?: any[][]) => {
    setExporting(true);
    try {
      const created = await createSpreadsheet(title, headers, rows);
      await refreshSpreadsheets();
      return created;
    } finally {
      setExporting(false);
    }
  };

  const exportOrders = async (orders: any[]) => {
    setExporting(true);
    try {
      const created = await exportOrdersToNewSheet(orders);
      await refreshSpreadsheets();
      return created;
    } finally {
      setExporting(false);
    }
  };

  const exportInventory = async (inventory: any[]) => {
    setExporting(true);
    try {
      const created = await exportInventoryToNewSheet(inventory);
      await refreshSpreadsheets();
      return created;
    } finally {
      setExporting(false);
    }
  };

  return (
    <GoogleSheetsContext.Provider
      value={{
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
      }}
    >
      {children}
    </GoogleSheetsContext.Provider>
  );
};

export const useGoogleSheets = () => {
  const context = useContext(GoogleSheetsContext);
  if (!context) {
    throw new Error('useGoogleSheets must be used within a GoogleSheetsProvider');
  }
  return context;
};
