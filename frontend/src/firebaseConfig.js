import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithCustomToken,
} from 'firebase/auth';

/**
 * Firebase Project Configuration
 * Reads from environment variables with fallback to user-provided config.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoNiatApiKey_953470463ce24496',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'niat-academy-portal.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'niat-academy-portal',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'niat-academy-portal.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '849201938102',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:849201938102:web:7f6a91c5391d80b4',
};

// Provided Firebase Auth Token
export const FIREBASE_AUTH_TOKEN =
  'AawNgEp_BJ242db0mWwj1UXCBJFnXmdK6ANOg-otNuXFgnsrPkC1qrzkVIyQMS1YlRipGgIL3IE8_ibQl810chu1KyYIX7JWNzI6lZGBOuMbT7XiV4Yd1R2scSiUesbyBPELqAxG-TCRhjIMS2cl_mJxwQ';

// Initialize Firebase App singleton safely
let app;
let auth;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
} catch (err) {
  console.warn('⚠️ [Firebase] Initialization notice:', err.message);
}

export { app, auth };

/**
 * Setup Firebase reCAPTCHA for Phone OTP Authentication
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (!auth) return null;
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('Firebase reCAPTCHA expired.');
      },
    });
    return window.recaptchaVerifier;
  } catch (err) {
    console.warn('Firebase reCAPTCHA setup info:', err.message);
    return null;
  }
}

/**
 * Trigger Firebase Phone OTP
 */
export async function sendFirebasePhoneOtp(phoneE164, appVerifier) {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }
  return await signInWithPhoneNumber(auth, phoneE164, appVerifier);
}

/**
 * Sign In with Firebase Token
 */
export async function authenticateWithFirebaseToken(token = FIREBASE_AUTH_TOKEN) {
  if (!auth) return null;
  try {
    const cred = await signInWithCustomToken(auth, token);
    return cred.user;
  } catch (err) {
    console.info('Firebase token verification handled:', err.message);
    return null;
  }
}
