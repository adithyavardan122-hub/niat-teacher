import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';

/**
 * Firebase Project Configuration — project: niatteachers
 * All values are read from environment variables set in frontend/.env
 */
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate that required keys are present before initialising
const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingKeys = REQUIRED_KEYS.filter((k) => !firebaseConfig[k]);
if (missingKeys.length > 0) {
  console.error(
    '[Firebase] Missing environment variables:',
    missingKeys.map((k) => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join(', '),
    '\nMake sure frontend/.env is configured correctly.'
  );
}

// Initialize Firebase App singleton safely
let app;
let auth;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (err) {
  console.error('[Firebase] Initialization failed:', err.message);
}

export { app, auth };

/**
 * Setup Firebase invisible reCAPTCHA for Phone OTP.
 * Clears any stale verifier instance before creating a new one.
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Check your .env configuration.');
  }

  // Clear stale verifier
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore clear errors
    }
    window.recaptchaVerifier = null;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved — OTP will proceed
    },
    'expired-callback': () => {
      console.warn('[Firebase] reCAPTCHA expired. User must retry.');
      window.recaptchaVerifier = null;
    },
  });

  return window.recaptchaVerifier;
}

/**
 * Trigger Firebase Phone OTP via signInWithPhoneNumber.
 * Returns a ConfirmationResult — call .confirm(otp) on it to verify.
 */
export async function sendFirebasePhoneOtp(phoneE164, appVerifier) {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Check your .env configuration.');
  }
  return await signInWithPhoneNumber(auth, phoneE164, appVerifier);
}
