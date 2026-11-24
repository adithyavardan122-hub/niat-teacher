import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK initialization.
 *
 * Production (Render / cloud): Set FIREBASE_SERVICE_ACCOUNT_JSON env var to the
 * full contents of your serviceAccountKey.json file (as a JSON string).
 *
 * Local development: Set FIREBASE_PROJECT_ID in backend/.env — the Admin SDK
 * can verify tokens using just the project ID when running with Application
 * Default Credentials or when you explicitly provide a service account.
 *
 * To generate a service account key:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

let adminApp;

try {
  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      // Production: full service account credentials provided as env var
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({ credential: cert(serviceAccount) });
      console.log('[Firebase Admin] Initialized with service account credentials.');
    } else {
      // Development fallback: project-ID-only initialization.
      // Token verification will work if the token was issued by the same project.
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error(
          'FIREBASE_PROJECT_ID is not set in backend/.env. ' +
          'Set it to your Firebase project ID (e.g. niatteachers).'
        );
      }
      adminApp = initializeApp({ projectId });
      console.log(`[Firebase Admin] Initialized with projectId: ${projectId}`);
    }
  } else {
    adminApp = getApps()[0];
  }
} catch (err) {
  console.error('[Firebase Admin] Initialization error:', err.message);
}

/**
 * firebaseAuth — wraps the Admin Auth instance.
 * verifyIdToken() throws on any invalid or expired token; never returns fake data.
 */
export const firebaseAuth = {
  verifyIdToken: async (token) => {
    if (!adminApp) {
      throw new Error(
        'Firebase Admin is not initialized. Check FIREBASE_PROJECT_ID or ' +
        'FIREBASE_SERVICE_ACCOUNT_JSON in backend/.env'
      );
    }
    // This call throws if the token is invalid, expired, or from the wrong project.
    return await getAuth(adminApp).verifyIdToken(token);
  },
};

export default adminApp;
