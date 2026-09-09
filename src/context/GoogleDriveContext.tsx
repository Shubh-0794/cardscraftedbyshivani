import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  getDriveAccessToken,
  listDriveFiles,
  createDriveFolder,
  uploadFileToDrive,
  deleteDriveFile,
  DriveFile,
  getGoogleUserInfo,
  initDriveAuth
} from '../services/googleDrive';
import {
  uploadFileToCustomerDateFolder,
  dataUrlToBlob
} from '../services/customerDriveSync';

interface GoogleDriveContextType {
  isConnected: boolean;
  googleUser: { email: string | null; displayName: string | null; photoURL: string | null; uid: string } | null;
  loading: boolean;
  files: DriveFile[];
  currentFolderId: string | null;
  currentFolderName: string;
  folderPath: { id: string | null; name: string }[];
  searchQuery: string;
  error: string | null;
  connectDrive: () => Promise<boolean>;
  disconnectDrive: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  navigateToFolder: (folderId: string | null, folderName?: string) => void;
  navigateUp: () => void;
  setSearchQuery: (query: string) => void;
  uploadFile: (file: File, description?: string) => Promise<DriveFile>;
  uploadCustomerFileToDrive: (
    fileOrBlobOrDataUrl: File | Blob | string,
    fileName: string,
    mimeType: string,
    customerName: string,
    orderNumberOrDesc?: string
  ) => Promise<{ driveFile: DriveFile; folderPath: string } | null>;
  createFolder: (name: string) => Promise<DriveFile>;
  deleteFile: (fileId: string, fileName: string) => Promise<void>;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

export const GoogleDriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(() => !!getDriveAccessToken());
  const [googleUser, setGoogleUser] = useState<{ email: string | null; displayName: string | null; photoURL: string | null; uid: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'My Drive' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = useCallback(async () => {
    if (!getDriveAccessToken()) {
      setIsConnected(false);
      setFiles([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await listDriveFiles(currentFolderId || undefined, searchQuery || undefined);
      setFiles(res.files);
      setIsConnected(true);
      setGoogleUser(getGoogleUserInfo());
    } catch (err: any) {
      console.error('Failed to load drive files:', err);
      setError(err.message || 'Failed to load files from Google Drive');
      if (err.message?.includes('401') || err.message?.includes('not connected')) {
        setIsConnected(false);
      }
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, searchQuery]);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setIsConnected(true);
        setGoogleUser({
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid
        });
        refreshFiles();
      },
      () => {
        if (!getDriveAccessToken()) {
          setIsConnected(false);
          setGoogleUser(null);
          setFiles([]);
        }
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [refreshFiles]);

  useEffect(() => {
    if (isConnected) {
      refreshFiles();
    }
  }, [isConnected, currentFolderId, searchQuery, refreshFiles]);

  const connectDrive = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await connectGoogleDrive();
      setIsConnected(true);
      setGoogleUser({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid
      });
      await refreshFiles();
      return true;
    } catch (err: any) {
      console.error('Drive connection failed:', err);
      setError(err.message || 'Google Drive connection cancelled or failed.');
      setIsConnected(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disconnectDrive = async () => {
    setLoading(true);
    try {
      await disconnectGoogleDrive();
      setIsConnected(false);
      setGoogleUser(null);
      setFiles([]);
      setCurrentFolderId(null);
      setFolderPath([{ id: null, name: 'My Drive' }]);
    } catch (err: any) {
      console.error('Drive disconnect error:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderId: string | null, folderName = 'Folder') => {
    if (folderId === null) {
      setCurrentFolderId(null);
      setFolderPath([{ id: null, name: 'My Drive' }]);
      return;
    }

    const existingIndex = folderPath.findIndex(p => p.id === folderId);
    if (existingIndex > -1) {
      setFolderPath(folderPath.slice(0, existingIndex + 1));
    } else {
      setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
    }
    setCurrentFolderId(folderId);
  };

  const navigateUp = () => {
    if (folderPath.length <= 1) return;
    const newPath = folderPath.slice(0, folderPath.length - 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  };

  const uploadFile = async (file: File, description?: string): Promise<DriveFile> => {
    setLoading(true);
    setError(null);
    try {
      const uploaded = await uploadFileToDrive(
        file,
        file.name,
        file.type,
        currentFolderId || undefined,
        description
      );
      await refreshFiles();
      return uploaded;
    } catch (err: any) {
      console.error('Drive file upload error:', err);
      setError(err.message || 'Failed to upload file to Google Drive.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Upload file into structured: /CardsCrafted_Customer_Uploads/<CustomerName>/<YYYY-MM-DD>/<File>
  const uploadCustomerFileToDrive = async (
    fileOrBlobOrDataUrl: File | Blob | string,
    fileName: string,
    mimeType: string,
    customerName: string,
    orderNumberOrDesc?: string
  ): Promise<{ driveFile: DriveFile; folderPath: string } | null> => {
    if (!getDriveAccessToken()) {
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      let payloadBlob: Blob;
      if (typeof fileOrBlobOrDataUrl === 'string') {
        payloadBlob = dataUrlToBlob(fileOrBlobOrDataUrl);
      } else {
        payloadBlob = fileOrBlobOrDataUrl;
      }

      const result = await uploadFileToCustomerDateFolder(
        payloadBlob,
        fileName,
        mimeType || 'application/octet-stream',
        customerName,
        orderNumberOrDesc
      );

      await refreshFiles();
      return result;
    } catch (err: any) {
      console.error('Failed to sync customer file to Google Drive:', err);
      // Non-blocking error for smoother UX, logged clearly
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (name: string): Promise<DriveFile> => {
    setLoading(true);
    setError(null);
    try {
      const folder = await createDriveFolder(name, currentFolderId || undefined);
      await refreshFiles();
      return folder;
    } catch (err: any) {
      console.error('Drive create folder error:', err);
      setError(err.message || 'Failed to create folder.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mandatory confirmation enforced in UI components calling this
  const deleteFile = async (fileId: string, fileName: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await deleteDriveFile(fileId);
      await refreshFiles();
    } catch (err: any) {
      console.error('Drive delete error:', err);
      setError(err.message || 'Failed to delete file from Google Drive.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const currentFolderName = folderPath[folderPath.length - 1]?.name || 'My Drive';

  return (
    <GoogleDriveContext.Provider
      value={{
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
        uploadCustomerFileToDrive,
        createFolder,
        deleteFile
      }}
    >
      {children}
    </GoogleDriveContext.Provider>
  );
};

export const useGoogleDrive = () => {
  const context = useContext(GoogleDriveContext);
  if (!context) {
    throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
  }
  return context;
};
