import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

// Support both embedded configuration and Vercel/production environment variables
const env = (import.meta as any).env || {};
const apiKey = env.VITE_FIREBASE_API_KEY || firebaseConfigData?.apiKey || '';
const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData?.authDomain || '';
const projectId = env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData?.projectId || '';
const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData?.storageBucket || '';
const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData?.messagingSenderId || '';
const appId = env.VITE_FIREBASE_APP_ID || firebaseConfigData?.appId || '';
const rawDatabaseId = env.VITE_FIREBASE_DATABASE_ID || (firebaseConfigData as any)?.firestoreDatabaseId || '';

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const databaseId = rawDatabaseId && rawDatabaseId !== '(default)'
  ? rawDatabaseId
  : undefined;

export const db = getFirestore(app, databaseId);
try {
  setLogLevel('silent');
} catch (e) {
  console.warn('Failed to set Firestore log level to silent:', e);
}
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;


