/**
 * Firebase initialization.
 * Uses environment variables for configuration.
 */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAisjnTegr_TFv5yZ10H1Gr2QakLilqIxE",
  authDomain: "facebookadsscraper.firebaseapp.com",
  projectId: "facebookadsscraper",
  storageBucket: "facebookadsscraper.firebasestorage.app",
  messagingSenderId: "559880248279",
  appId: "1:559880248279:web:a35f780fcfbe6720130992"
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export default app;
