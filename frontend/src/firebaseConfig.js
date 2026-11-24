import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

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

// Validate required keys on startup
const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingKeys = REQUIRED_KEYS.filter((k) => !firebaseConfig[k]);
if (missingKeys.length > 0) {
  console.error(
    '[Firebase] Missing environment variables:',
    missingKeys.map((k) => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join(', '),
    '\nMake sure frontend/.env is configured correctly.'
  );
}

// Initialize Firebase App singleton
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
 * createRecaptchaVerifier
 *
 * Creates a RecaptchaVerifier attached to a real DOM element via ref
 * (not getElementById). This matches the pattern:
 *
 *   verifierRef.current = new RecaptchaVerifier(auth, domElement, { size: 'normal' })
 *   renderPromiseRef.current = verifierRef.current.render()
 *
 * Pass the ref's .current (the actual DOM node) as containerRef.
 * Size 'normal' shows the visible reCAPTCHA checkbox.
 * Size 'invisible' fires silently — use 'invisible' for a seamless UX.
 */
export function createRecaptchaVerifier(domElement, size = 'invisible') {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Check your .env configuration.');
  }
  if (!domElement) {
    throw new Error('reCAPTCHA container DOM element is not mounted yet.');
  }

  const verifier = new RecaptchaVerifier(auth, domElement, {
    size,
    callback: () => {
      // reCAPTCHA solved — OTP will proceed
    },
    'expired-callback': () => {
      console.warn('[Firebase] reCAPTCHA expired. User must retry.');
    },
  });

  return verifier;
}

/**
 * sendFirebasePhoneOtp
 *
 * Calls signInWithPhoneNumber with an already-rendered RecaptchaVerifier.
 * The caller must await verifier.render() before calling this.
 */
export async function sendFirebasePhoneOtp(phoneE164, appVerifier) {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Check your .env configuration.');
  }
  return await signInWithPhoneNumber(auth, phoneE164, appVerifier);
}
