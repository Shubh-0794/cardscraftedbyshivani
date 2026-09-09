import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose'
];

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach(scope => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'consent'
});

// Flag to indicate sign in progress
let isSigningIn = false;
// Cached in-memory access token (per security instructions, NOT in localStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: { email: string | null; displayName: string | null; photoURL: string | null; uid: string } | null = null;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  shared?: boolean;
  owners?: { displayName: string; emailAddress: string; photoLink?: string }[];
  parents?: string[];
}

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      cachedGoogleUser = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid
      };
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        cachedGoogleUser = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const connectGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token from authentication.');
    }
    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = {
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      uid: result.user.uid
    };
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const disconnectGoogleDrive = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getGoogleAccessToken = getDriveAccessToken;

export const getGoogleUserInfo = () => {
  return cachedGoogleUser;
};

// Google Drive REST API Methods
export const listDriveFiles = async (
  folderId?: string,
  searchQuery?: string,
  pageSize = 30
): Promise<{ files: DriveFile[]; nextPageToken?: string }> => {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected. Please authenticate with Google first.');
  }

  let q = "trashed = false";
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }
  if (searchQuery && searchQuery.trim()) {
    const escaped = searchQuery.replace(/'/g, "\\'");
    q += ` and (name contains '${escaped}' or fullText contains '${escaped}')`;
  }

  const fields = 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, iconLink, size, createdTime, modifiedTime, shared, owners, parents)';
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set('fields', fields);
  url.searchParams.set('orderBy', 'folder,modifiedTime desc');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 401) {
      cachedAccessToken = null;
    }
    throw new Error(errData?.error?.message || `Failed to fetch Google Drive files (${res.status})`);
  }

  const data = await res.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken
  };
};

export const createDriveFolder = async (folderName: string, parentFolderId?: string): Promise<DriveFile> => {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected.');
  }

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create Google Drive folder');
  }

  return await res.json();
};

export const uploadFileToDrive = async (
  file: File | Blob,
  fileName: string,
  mimeType: string,
  parentFolderId?: string,
  description?: string
): Promise<DriveFile> => {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected.');
  }

  const metadata: any = {
    name: fileName,
    mimeType: mimeType || 'application/octet-stream'
  };
  if (description) {
    metadata.description = description;
  }
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' })
  );
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink,size,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to upload file to Google Drive');
  }

  return await res.json();
};

// Mandatory confirmation required before calling this
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to delete file from Google Drive');
  }
};
