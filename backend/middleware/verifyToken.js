import { firebaseAuth } from '../config/firebaseAdmin.js';

/**
 * Express middleware: verifies a Firebase ID token from the Authorization header.
 * Sets req.user to the decoded token payload on success.
 * Returns 401 JSON for missing, invalid, or expired tokens — never an empty response.
 */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token missing. Include: Authorization: Bearer <firebase-id-token>',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token is empty.',
    });
  }

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('[verifyToken] Token verification failed:', error.message);

    // Return specific error messages to help with debugging
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Firebase token has expired. Please log in again.',
      });
    }

    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token verification failed: ' + error.message,
    });
  }
};
