import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Why Firebase config is stored in environment variables:
 * 1. Security & Hygiene: Prevents committing project credentials directly into source control.
 * 2. Environment Portability: Enables seamless switching between development, staging, and production
 *    Firebase projects without altering source code.
 * 3. Best Practices: Follows 12-factor app methodology and Vite's client-side environment variable standard (VITE_*).
 */
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase exactly once to prevent duplicate app errors during hot module replacement (HMR)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Firebase Authentication:
 * Handles user authentication flows, user session management, token refresh, and identity verification
 * (e.g., email/password, institutional single sign-on, account lifecycle).
 */
export const auth = getAuth(app);

/**
 * Cloud Firestore:
 * Provides a scalable NoSQL cloud document database for storing, querying, and synchronizing real-time application
 * data across clients (e.g., student profiles, campus posts, events, notifications).
 */
export const db = getFirestore(app);