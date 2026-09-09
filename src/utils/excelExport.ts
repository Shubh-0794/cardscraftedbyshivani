import * as XLSX from 'xlsx';
import { Product, InventoryItem, InventoryMovement, Payment, User, Customer, Order } from '../types';

/**
 * Helper to trigger browser download of an XLSX workbook with auto-fitted column widths
 */
export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  try {
    const safeName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(wb, safeName);
  } catch (err) {
    console.error('Error writing XLSX workbook:', err);
  }
}

/**
 * Automatically calculate optimal column widths based on data contents and headers
 */
function calculateColumnWidths(data: Record<string, any>[]): { wch: number }[] {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map(key => {
    let maxLen = key.length;
    data.forEach(row => {
      const val = row[key];
      if (val !== null && val !== undefined) {
        const strVal = String(val);
        if (strVal.length > maxLen) {
          maxLen = strVal.length;
        }
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
}

/**
 * Universal JSON to Excel export helper (safe against empty arrays)
 */
export function exportToExcel(
  data: Record<string, any>[],
  fileName: string,
  sheetName: string = 'Sheet1'
) {
  const exportData =
    !data || data.length === 0
      ? [{ Notice: 'No records available to export at this time.', 'Exported Date': new Date().toLocaleString('en-IN') }]
      : data;

  try {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = calculateColumnWidths(exportData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

    downloadWorkbook(workbook, fileName);
  } catch (err) {
    console.error('Failed to export to Excel:', err);
  }
}

/**
 * Export Products & Details to Excel
 */
export function exportProductsToExcel(products: Product[], customFileName?: string) {
  let exportData: Record<string, any>[] = [];

  if (!products || products.length === 0) {
    exportData = [
      {
        'S.No': '-',
        'SKU / Item Code': 'PRD-TEMPLATE',
        'Product Name': 'No products in catalog yet',
        'Category': 'General',
        'Selling Price (₹)': 0,
        'Cost Price (₹)': 0,
        'Gross Profit (₹)': 0,
        'Margin %': '0%',
        'GST / Tax %': '0%',
        'Current Stock': 0,
        'Min Alert Level': 0,
        'Stock Status': 'N/A',
        'Status': 'ACTIVE',
        'Description': 'Template Sheet',
        'Materials Required': 'None',
        'Created Date': new Date().toLocaleDateString('en-IN')
      }
    ];
  } else {
    exportData = products.map((p, idx) => {
      const profit = (p.sellingPrice || 0) - (p.costPrice || 0);
      const marginPercent = p.costPrice > 0 ? ((profit / p.costPrice) * 100).toFixed(1) + '%' : 'N/A';
      const stockStatus =
        p.stockQuantity <= 0
          ? 'OUT OF STOCK'
          : p.stockQuantity <= (p.minStock || 5)
          ? 'LOW STOCK'
          : 'IN STOCK';

      return {
        'S.No': idx + 1,
        'SKU / Item Code': p.sku || `PRD-${p.id.slice(0, 5)}`,
        'Product Name': p.name,
        'Category': p.category || 'General',
        'Selling Price (₹)': p.sellingPrice || 0,
        'Cost Price (₹)': p.costPrice || 0,
        'Gross Profit (₹)': profit,
        'Margin %': marginPercent,
        'GST / Tax %': `${p.taxPercent || 0}%`,
        'Current Stock': p.stockQuantity || 0,
        'Min Alert Level': p.minStock || 0,
        'Stock Status': stockStatus,
        'Status': p.status || 'ACTIVE',
        'Description': p.description || '',
        'Materials Required': (p.materials || []).map(m => `${m.inventoryItemName} (${m.quantityRequired} ${m.unit})`).join(', ') || 'None',
        'Created Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '-'
      };
    });
  }

  const fileName = customFileName || `CardsCrafted_Products_Catalog_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportToExcel(exportData, fileName, 'Products Catalog');
}

/**
 * Export Inventory Items & Movements to Excel
 */
export function exportInventoryToExcel(
  inventory: InventoryItem[],
  movements?: InventoryMovement[],
  customFileName?: string
) {
  let stockData: Record<string, any>[] = [];

  if (!inventory || inventory.length === 0) {
    stockData = [
      {
        'S.No': '-',
        'SKU / Code': 'INV-TEMPLATE',
        'Item Name': 'No inventory items recorded yet',
        'Category': 'Raw Material',
        'Unit': 'Pcs',
        'Current Stock': 0,
        'Min Stock Alert': 0,
        'Max Stock Target': 0,
        'Purchase Price (₹)': 0,
        'Selling Price (₹)': '-',
        'Total Asset Value (₹)': 0,
        'Purchase Channel': 'OFFLINE',
        'Platform / Store': '-',
        'Order / Invoice Ref': '-',
        'Supplier': '-',
        'Storage Location': '-',
        'Stock Status': 'N/A',
        'Status': 'ACTIVE'
      }
    ];
  } else {
    stockData = inventory.map((item, idx) => {
      const totalAssetVal = (item.currentStock || 0) * (item.purchasePrice || 0);
      const stockStatus =
        item.currentStock <= 0
          ? 'OUT OF STOCK'
          : item.currentStock <= item.minStock
          ? 'LOW STOCK'
          : 'HEALTHY';

      let platformDisplay = '-';
      if (item.purchaseChannel === 'ONLINE') {
        platformDisplay = item.purchasePlatform === 'OTHER'
          ? (item.purchasePlatformOther || 'Other Online Store')
          : (item.purchasePlatform || 'Online Store');
      } else if (item.purchaseChannel === 'OFFLINE') {
        platformDisplay = item.purchasePlatformOther || item.supplier || 'Local Market / Vendor';
      }

      return {
        'S.No': idx + 1,
        'SKU / Code': item.sku || `INV-${item.id.slice(0, 5)}`,
        'Item Name': item.name,
        'Category': item.category,
        'Unit': item.unit,
        'Current Stock': item.currentStock || 0,
        'Min Stock Alert': item.minStock || 0,
        'Max Stock Target': item.maxStock || 0,
        'Purchase Price (₹)': item.purchasePrice || 0,
        'Selling Price (₹)': item.sellingPrice || '-',
        'Total Asset Value (₹)': totalAssetVal,
        'Purchase Channel': item.purchaseChannel || 'OFFLINE',
        'Platform / Store': platformDisplay,
        'Order / Invoice Ref': item.purchaseOrderRef || '-',
        'Supplier': item.supplier || '-',
        'Storage Location': item.storageLocation || 'Studio Shelf',
        'Stock Status': stockStatus,
        'Status': item.status
      };
    });
  }

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Stock Inventory
  const wsInventory = XLSX.utils.json_to_sheet(stockData);
  wsInventory['!cols'] = calculateColumnWidths(stockData);
  XLSX.utils.book_append_sheet(workbook, wsInventory, 'Current Inventory');

  // Sheet 2: Stock Logs / Movements (if provided)
  if (movements && movements.length > 0) {
    const movementData = movements.map((m, idx) => {
      let movementChannel = m.purchaseChannel || '-';
      let movementPlatform = '-';
      if (m.purchaseChannel === 'ONLINE') {
        movementPlatform = m.purchasePlatform === 'OTHER' ? (m.purchasePlatformOther || 'Other') : (m.purchasePlatform || 'Online');
      } else if (m.purchaseChannel === 'OFFLINE') {
        movementPlatform = m.purchasePlatformOther || 'Local Store';
      }

      return {
        'S.No': idx + 1,
        'Date & Time': m.createdAt ? new Date(m.createdAt).toLocaleString('en-IN') : '-',
        'Material / Item': m.inventoryItemName,
        'Movement Type': m.movementType,
        'Quantity Changed': m.quantity,
        'Previous Balance': m.previousStock,
        'New Balance': m.newStock,
        'Purchase Channel': movementChannel,
        'Platform / Store': movementPlatform,
        'Ref / Order ID': m.purchaseOrderRef || '-',
        'Linked Order': m.orderId || '-',
        'Handled By': m.createdBy || 'Admin',
        'Notes': m.notes || ''
      };
    });

    const wsMovements = XLSX.utils.json_to_sheet(movementData);
    wsMovements['!cols'] = calculateColumnWidths(movementData);
    XLSX.utils.book_append_sheet(workbook, wsMovements, 'Stock Movement Logs');
  }

  const fileName = customFileName || `CardsCrafted_Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadWorkbook(workbook, fileName);
}

/**
 * Export Payments & Financial Transactions to Excel
 */
export function exportPaymentsToExcel(payments: Payment[], customFileName?: string) {
  let exportData: Record<string, any>[] = [];

  if (!payments || payments.length === 0) {
    exportData = [
      {
        'S.No': '-',
        'Payment Code': 'PAY-TEMPLATE',
        'Order Number': '-',
        'Customer Name': 'No payments recorded yet',
        'Amount (₹)': 0,
        'Payment Mode': 'UPI',
        'Reference / UTR / Txn ID': '-',
        'Payment Date': new Date().toLocaleDateString('en-IN'),
        'Recorded By': 'Admin',
        'Notes / Remarks': '-'
      }
    ];
  } else {
    exportData = payments.map((pay, idx) => ({
      'S.No': idx + 1,
      'Payment Code': pay.paymentCode || `PAY-${pay.id.slice(0, 5)}`,
      'Order Number': pay.orderNumber || '-',
      'Customer Name': pay.customerName || 'Customer',
      'Amount (₹)': pay.amount || 0,
      'Payment Mode': pay.method,
      'Reference / UTR / Txn ID': pay.transactionReference || '-',
      'Payment Date': pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString('en-IN') : '-',
      'Recorded By': pay.createdBy || 'Admin',
      'Notes / Remarks': pay.notes || '-'
    }));
  }

  const fileName = customFileName || `CardsCrafted_Payments_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportToExcel(exportData, fileName, 'Payments Ledger');
}

/**
 * Export System Users & Staff to Excel
 */
export function exportUsersToExcel(users: User[], customFileName?: string) {
  let exportData: Record<string, any>[] = [];

  if (!users || users.length === 0) {
    exportData = [
      {
        'S.No': '-',
        'Full Name': 'No users found',
        'Email Address': '-',
        'WhatsApp / Phone': '-',
        'Assigned Role': '-',
        'Account Status': '-',
        'Last Login': '-',
        'Registration Date': new Date().toLocaleDateString('en-IN')
      }
    ];
  } else {
    exportData = users.map((u, idx) => ({
      'S.No': idx + 1,
      'Full Name': u.name,
      'Email Address': u.email,
      'WhatsApp / Phone': u.whatsapp || '-',
      'Assigned Role': u.role === 'SUPER_ADMIN' ? 'Super Admin / Studio Owner' : 'Customer Account',
      'Account Status': u.status,
      'Last Login': u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN') : 'Never',
      'Registration Date': u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '-'
    }));
  }

  const fileName = customFileName || `CardsCrafted_Users_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportToExcel(exportData, fileName, 'User Accounts');
}

/**
 * Export Customer Database to Excel
 */
export function exportCustomersToExcel(customers: Customer[], customFileName?: string) {
  let exportData: Record<string, any>[] = [];

  if (!customers || customers.length === 0) {
    exportData = [
      {
        'S.No': '-',
        'Customer Code': 'CUS-TEMPLATE',
        'Customer Name': 'No customers registered yet',
        'Email Address': '-',
        'WhatsApp / Mobile': '-',
        'Alternate Phone': '-',
        'City': '-',
        'State': '-',
        'Pincode': '-',
        'Full Address': '-',
        'Total Orders Placed': 0,
        'Lifetime Total Spent (₹)': 0,
        'Last Order Date': '-',
        'Customer Status': 'ACTIVE',
        'Created Date': new Date().toLocaleDateString('en-IN')
      }
    ];
  } else {
    exportData = customers.map((c, idx) => ({
      'S.No': idx + 1,
      'Customer Code': c.customerCode || `CUS-${c.id.slice(0, 5)}`,
      'Customer Name': c.name,
      'Email Address': c.email || '-',
      'WhatsApp / Mobile': c.whatsapp,
      'Alternate Phone': c.alternatePhone || '-',
      'City': c.city || '-',
      'State': c.state || '-',
      'Pincode': c.pincode || '-',
      'Full Address': c.address || '-',
      'Total Orders Placed': c.totalOrders || 0,
      'Lifetime Total Spent (₹)': c.totalSpent || 0,
      'Last Order Date': c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : 'None yet',
      'Customer Status': c.status || 'ACTIVE',
      'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '-'
    }));
  }

  const fileName = customFileName || `CardsCrafted_Customer_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportToExcel(exportData, fileName, 'Customers Directory');
}

/**
 * Export Orders to Excel
 */
export function exportOrdersToExcel(orders: Order[], customFileName?: string) {
  let exportData: Record<string, any>[] = [];

  if (!orders || orders.length === 0) {
    exportData = [
      {
        'S.No': '-',
        'Order Number': 'CC-TEMPLATE',
        'Customer Name': 'No orders in system yet',
        'Phone': '-',
        'Email': '-',
        'Order Date': new Date().toLocaleDateString('en-IN'),
        'Expected Delivery': '-',
        'Order Status': 'NEW',
        'Priority': 'MEDIUM',
        'Items Summary': 'No items',
        'Custom Craft Details': 'None',
        'Grand Total (₹)': 0,
        'Paid Amount (₹)': 0,
        'Balance Due (₹)': 0,
        'Payment Status': 'PENDING',
        'Created By': 'Studio'
      }
    ];
  } else {
    exportData = orders.map((o, idx) => ({
      'S.No': idx + 1,
      'Order Number': o.orderNumber,
      'Customer Name': o.customerName,
      'Phone': o.customerPhone,
      'Email': o.customerEmail,
      'Order Date': o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN') : '-',
      'Expected Delivery': o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString('en-IN') : '-',
      'Order Status': o.status,
      'Priority': o.priority,
      'Items Summary': (o.items || []).map(i => `${i.productName} (x${i.quantity})`).join(', ') || 'Custom Craft',
      'Custom Craft Details': o.customDetails ? `${o.customDetails.designName} - ${o.customDetails.description}` : 'Standard',
      'Grand Total (₹)': o.grandTotal || 0,
      'Paid Amount (₹)': o.paidAmount || 0,
      'Balance Due (₹)': o.balanceAmount || 0,
      'Payment Status': o.paymentStatus,
      'Created By': o.createdBy
    }));
  }

  const fileName = customFileName || `CardsCrafted_Orders_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportToExcel(exportData, fileName, 'Orders Ledger');
}

