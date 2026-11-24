import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import {
  sendOtpService,
  verifyOtpService,
  lookupStudentService,
  getAllStudentsService,
  storeStudentService,
} from '../authService.js';
import { getMongoStatus } from '../db.js';

const router = express.Router();

// ── GET /api/auth/status ─────────────────────────────────────────────────────
// Returns MongoDB connection status and Firebase project info.
router.get('/status', (_req, res) => {
  const status = getMongoStatus();
  return res.status(200).json({
    success: true,
    mongo: status,
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || 'niatteachers',
    },
    timestamp: new Date().toISOString(),
  });
});

// ── GET /api/auth/profile ────────────────────────────────────────────────────
// Protected: requires a valid Firebase ID token in Authorization: Bearer <token>
router.get('/profile', verifyToken, (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      uid:         req.user.uid,
      phoneNumber: req.user.phone_number  || req.user.phoneNumber || null,
      email:       req.user.email         || null,
    },
  });
});

// ── POST /api/auth/send-otp ──────────────────────────────────────────────────
// Body: { phone, name, niatId }
// NOTE: This endpoint stores OTP server-side for the backend-only fallback flow.
// When Firebase Phone Auth is used (the primary flow), OTP is sent directly by
// Firebase — this endpoint is only used to record the student's details and
// provide the fallback when Firebase SMS is unavailable.
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, name, niatId } = req.body;
    const result = await sendOtpService({ phone, name, niatId });
    return res.status(200).json({
      success: true,
      message: `OTP dispatched to +91 ${result.phone}`,
      phone: result.phone,
      expiresInSeconds: result.expiresInSeconds,
      mongoConnected: result.mongoConnected,
      // NOTE: otp is intentionally NOT returned in the response.
      // The OTP is delivered by Firebase SMS. The backend stores it only for
      // the fallback non-Firebase path.
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Body: { phone, otp, name, niatId }
// Used only by the backend-only OTP fallback. The primary Firebase flow uses
// confirmationResult.confirm(otp) on the frontend and then calls /api/auth/profile.
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name, niatId } = req.body;
    const result = await verifyOtpService({ phone, otp, name, niatId });
    return res.status(200).json({
      success: true,
      message: 'Student verified successfully.',
      student: result.student,
      mongoConnected: result.mongoConnected,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/lookup ────────────────────────────────────────────────────
// Body: { phone, niatId }
router.post('/lookup', async (req, res) => {
  try {
    const { phone, niatId } = req.body;
    const result = await lookupStudentService({ phone, niatId });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── GET /api/auth/students ───────────────────────────────────────────────────
router.get('/students', async (_req, res) => {
  try {
    const students = await getAllStudentsService();
    return res.status(200).json({ success: true, count: students.length, students });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/store-student ─────────────────────────────────────────────
// Body: { name, niatId, phone, department?, batch? }
router.post('/store-student', async (req, res) => {
  try {
    const { name, niatId, phone, department, batch } = req.body;
    const result = await storeStudentService({ name, niatId, phone, department, batch });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
