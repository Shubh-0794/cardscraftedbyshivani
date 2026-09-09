import {
  getDriveAccessToken,
  createDriveFolder,
  uploadFileToDrive,
  listDriveFiles,
  DriveFile
} from './googleDrive';

// Root App folder in Google Drive
const APP_ROOT_FOLDER_NAME = 'CardsCrafted_Customer_Uploads';

// Convert base64 data URL to Blob
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binaryString = window.atob(parts[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

// Find existing folder by name under parentFolderId (or root if undefined)
export async function findOrCreateFolder(folderName: string, parentFolderId?: string): Promise<DriveFile> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected');
  }

  // Check if folder exists
  let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  } else {
    q += ` and 'root' in parents`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', 'files(id, name, mimeType, webViewLink)');
  url.searchParams.set('pageSize', '1');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
  }

  // Create if does not exist
  return await createDriveFolder(folderName, parentFolderId);
}

/**
 * Uploads a document/file into Google Drive with the hierarchy:
 * /CardsCrafted_Customer_Uploads / <CustomerName> / <YYYY-MM-DD> / <FileName>
 */
export async function uploadFileToCustomerDateFolder(
  fileOrBlob: File | Blob,
  fileName: string,
  mimeType: string,
  customerName: string,
  orderNumberOrDesc?: string
): Promise<{ driveFile: DriveFile; folderPath: string }> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected. Please connect Google Drive first.');
  }

  // 1. Sanitize customer name & create or get App Root Folder
  const cleanCustomerName = (customerName && customerName.trim()) 
    ? customerName.trim().replace(/[/\\?%*:|"<>]/g, '_') 
    : 'Guest_Customer';
  
  const rootFolder = await findOrCreateFolder(APP_ROOT_FOLDER_NAME);

  // 2. Create or get Customer folder: e.g. "Rahul_Sharma"
  const customerFolder = await findOrCreateFolder(cleanCustomerName, rootFolder.id);

  // 3. Create or get Date-wise folder: e.g. "2026-08-20"
  const now = new Date();
  const dateFolderName = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const dateFolder = await findOrCreateFolder(dateFolderName, customerFolder.id);

  // 4. Upload file into the Date folder
  const description = orderNumberOrDesc 
    ? `Customer: ${customerName} | ${orderNumberOrDesc} | Uploaded: ${now.toLocaleString()}`
    : `Customer: ${customerName} | Uploaded: ${now.toLocaleString()}`;

  const driveFile = await uploadFileToDrive(
    fileOrBlob,
    fileName,
    mimeType,
    dateFolder.id,
    description
  );

  const folderPath = `${APP_ROOT_FOLDER_NAME} > ${cleanCustomerName} > ${dateFolderName}`;

  return {
    driveFile,
    folderPath
  };
}
