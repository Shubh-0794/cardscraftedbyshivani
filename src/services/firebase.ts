import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const isFirebaseConfigured = Boolean(
  firebaseConfig &&
  typeof firebaseConfig.apiKey === 'string' &&
  firebaseConfig.apiKey.trim() !== '' &&
  typeof firebaseConfig.projectId === 'string' &&
  firebaseConfig.projectId.trim() !== ''
);

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    appInstance = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const customDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
    dbInstance = customDbId ? getFirestore(appInstance, customDbId) : getFirestore(appInstance);
    authInstance = getAuth(appInstance);
  } catch (err) {
    console.warn('Firebase initialization skipped or encountered error:', err);
  }
}

export const app = appInstance;
export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore notice [' + operationType + ' ' + (path || '') + ']:', errInfo.error);
}

export async function testFirestoreConnection() {
  if (!isFirebaseConfigured || !db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Non-blocking connection test - silent ignore in dev mode or unprovisioned collections
    if (process.env.NODE_ENV === 'development') {
      console.info('Firestore connection probe finished:', (error as Error)?.message || error);
    }
  }
}

if (isFirebaseConfigured && db) {
  testFirestoreConnection();
}

