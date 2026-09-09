import { getGoogleAccessToken } from './googleDrive';

export interface GoogleSpreadsheetMeta {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  createdTime?: string;
}

export interface SheetData {
  spreadsheetId: string;
  title: string;
  sheets: {
    title: string;
    sheetId: number;
    rowCount?: number;
    columnCount?: number;
  }[];
  values?: (string | number | boolean)[][];
}

// 1. List Spreadsheets from Google Drive / Sheets
export async function listSpreadsheets(pageSize: number = 20): Promise<GoogleSpreadsheetMeta[]> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  const q = "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,modifiedTime,createdTime,webViewLink)&orderBy=modifiedTime desc&pageSize=${pageSize}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Sheets: ${res.status}`);
  }

  const data = await res.json();
  return data.files || [];
}

// 2. Get Spreadsheet Details and Sheet Values
export async function getSpreadsheetDetails(spreadsheetId: string, range?: string): Promise<SheetData> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated with Google.');

  // Fetch metadata
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch spreadsheet details: ${metaRes.status}`);
  }

  const metaData = await metaRes.json();
  const firstSheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';
  const targetRange = range || `${firstSheetTitle}!A1:Z100`;

  // Fetch grid values
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetRange)}`;
  const valuesRes = await fetch(valuesUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  let values: (string | number | boolean)[][] = [];
  if (valuesRes.ok) {
    const valuesData = await valuesRes.json();
    values = valuesData.values || [];
  }

  return {
    spreadsheetId,
    title: metaData.properties?.title || 'Untitled Spreadsheet',
    sheets: (metaData.sheets || []).map((s: any) => ({
      title: s.properties?.title || 'Sheet',
      sheetId: s.properties?.sheetId || 0,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount
    })),
    values
  };
}

// 3. Create New Google Spreadsheet
export async function createSpreadsheet(
  title: string,
  initialHeaders?: string[],
  initialRows?: (string | number | boolean)[][]
): Promise<{ spreadsheetId: string; webViewLink: string; title: string }> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated with Google.');

  const payload: any = {
    properties: {
      title
    }
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create spreadsheet: ${createRes.status}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const webViewLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // If initial rows or headers provided, populate them
  if ((initialHeaders && initialHeaders.length > 0) || (initialRows && initialRows.length > 0)) {
    const allRows: (string | number | boolean)[][] = [];
    if (initialHeaders) allRows.push(initialHeaders);
    if (initialRows) allRows.push(...initialRows);

    await appendSheetValues(spreadsheetId, 'Sheet1!A1', allRows);
  }

  return {
    spreadsheetId,
    webViewLink,
    title: created.properties?.title || title
  };
}

// 4. Append Values to Sheet
export async function appendSheetValues(
  spreadsheetId: string,
  range: string,
  rows: (string | number | boolean)[][]
): Promise<void> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated with Google.');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: rows
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to append values to sheet: ${res.status}`);
  }
}

// 5. Helper to Export Orders to Google Sheets
export async function exportOrdersToNewSheet(orders: any[], studioName: string = 'Cards Crafted') {
  const title = `${studioName} - Orders Log (${new Date().toLocaleDateString('en-IN')})`;
  const headers = [
    'Order Number',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Order Date',
    'Status',
    'Payment Status',
    'Items Count',
    'Total Amount (₹)',
    'Paid Amount (₹)',
    'Balance Due (₹)',
    'Delivery Address'
  ];

  const rows = orders.map(o => [
    o.orderNumber || '',
    o.customerName || '',
    o.customerEmail || '',
    o.customerPhone || o.customerWhatsapp || '',
    o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '',
    o.status || '',
    o.paymentStatus || '',
    Array.isArray(o.items) ? o.items.length : 1,
    Number(o.grandTotal || 0),
    Number(o.paidAmount || 0),
    Number(o.balanceAmount || 0),
    o.deliveryAddress ? `${o.deliveryAddress.address || ''}, ${o.deliveryAddress.city || ''}` : ''
  ]);

  return await createSpreadsheet(title, headers, rows);
}

// 6. Helper to Export Inventory to Google Sheets
export async function exportInventoryToNewSheet(inventory: any[], studioName: string = 'Cards Crafted') {
  const title = `${studioName} - Raw Materials & Inventory (${new Date().toLocaleDateString('en-IN')})`;
  const headers = [
    'Item SKU/Code',
    'Material / Item Name',
    'Category',
    'Current Stock',
    'Unit',
    'Unit Cost (₹)',
    'Total Stock Value (₹)',
    'Reorder Threshold',
    'Status',
    'Purchase Channel'
  ];

  const rows = inventory.map(item => {
    const stock = Number(item.currentStock || item.stockQty || 0);
    const cost = Number(item.unitCost || item.costPrice || 0);
    const min = Number(item.minStockLevel || item.reorderPoint || 10);
    return [
      item.sku || item.code || item.id || '',
      item.name || '',
      item.category || '',
      stock,
      item.unit || 'pcs',
      cost,
      stock * cost,
      min,
      stock <= 0 ? 'Out of Stock' : stock <= min ? 'Low Stock' : 'In Stock',
      item.purchaseChannel || item.channel || 'Direct'
    ];
  });

  return await createSpreadsheet(title, headers, rows);
}
