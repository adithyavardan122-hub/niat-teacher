import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
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

// ─── Phone Auth ───────────────────────────────────────────────────────────────

/**
 * createRecaptchaVerifier
 * Creates a RecaptchaVerifier attached to a real DOM node (via ref.current).
 * size: 'invisible' (seamless) | 'normal' (visible checkbox)
 */
export function createRecaptchaVerifier(domElement, size = 'invisible') {
  if (!auth) throw new Error('Firebase Auth is not initialized. Check your .env configuration.');
  if (!domElement) throw new Error('reCAPTCHA container DOM element is not mounted yet.');

  return new RecaptchaVerifier(auth, domElement, {
    size,
    callback: () => {},
    'expired-callback': () => {
      console.warn('[Firebase] reCAPTCHA expired. User must retry.');
    },
  });
}

/**
 * sendFirebasePhoneOtp
 * Calls signInWithPhoneNumber with an already-rendered RecaptchaVerifier.
 * Caller must await verifier.render() before calling this.
 */
export async function sendFirebasePhoneOtp(phoneE164, appVerifier) {
  if (!auth) throw new Error('Firebase Auth is not initialized. Check your .env configuration.');
  return await signInWithPhoneNumber(auth, phoneE164, appVerifier);
}

// ─── Email Sign-In Link (Magic Link) ─────────────────────────────────────────

/**
 * The URL Firebase redirects the student back to after they click
 * the magic link in their Gmail.
 *
 * In development this is http://localhost:5173.
 * In production set VITE_APP_URL to your deployed domain.
 */
const EMAIL_REDIRECT_URL =
  import.meta.env.VITE_APP_URL ||
  window.location.origin; // e.g. http://localhost:5173

/**
 * sendEmailSignInLink
 *
 * Sends a Firebase sign-in link to the given email address.
 * Firebase emails it instantly — the student clicks the link
 * and gets redirected back to EMAIL_REDIRECT_URL.
 *
 * We save the email to localStorage so we can read it back when
 * the page reloads after the student clicks the link.
 */
export async function sendEmailSignInLink(email) {
  if (!auth) throw new Error('Firebase Auth is not initialized. Check your .env configuration.');

  const actionCodeSettings = {
    url: EMAIL_REDIRECT_URL,
    handleCodeInApp: true, // must be true for email link sign-in
  };

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);

  // Persist email so the confirmation step can read it after redirect
  localStorage.setItem('niat_email_for_signin', email);
}

/**
 * completeEmailSignIn
 *
 * Called when the page loads and the URL contains an email sign-in link.
 * Returns a Firebase UserCredential on success.
 *
 * email — the address the link was sent to (read from localStorage or
 *          passed explicitly when the student confirms on the same device).
 */
export async function completeEmailSignIn(email, url = window.location.href) {
  if (!auth) throw new Error('Firebase Auth is not initialized. Check your .env configuration.');

  if (!isSignInWithEmailLink(auth, url)) {
    throw new Error('This URL is not a valid Firebase email sign-in link.');
  }

  const credential = await signInWithEmailLink(auth, email, url);

  // Clean up the stored email
  localStorage.removeItem('niat_email_for_signin');

  return credential;
}

/**
 * checkEmailSignInLink
 * Returns true if the current page URL is a Firebase email sign-in link.
 */
export function checkEmailSignInLink(url = window.location.href) {
  if (!auth) return false;
  return isSignInWithEmailLink(auth, url);
}
