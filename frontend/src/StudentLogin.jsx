import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Phone,
  User,
  ShieldCheck,
  Check,
  RefreshCw,
  Database,
  IdCard,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Lock,
} from './icons.jsx';
import {
  firebaseConfig,
  setupRecaptcha,
  sendFirebasePhoneOtp,
} from './firebaseConfig.js';

export function StudentLogin({
  apiBaseUrl = '',
  currentStudent,
  onLoginSuccess,
  onLogout,
  onNavigateHome,
  isMandatoryBarrier = false,
}) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [name, setName] = useState('');
  const [niatId, setNiatId] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [mongoStatus, setMongoStatus] = useState({ connected: false, checked: false });
  const [recentStudents, setRecentStudents] = useState([]);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Ref to prevent multiple OTP sends in rapid succession
  const otpSentRef = useRef(false);

  // Determine the API base URL robustly
  const API_URL = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    apiBaseUrl ||
    'http://localhost:5000'
  ).replace(/\/+$/, '');

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  useEffect(() => {
    checkMongoStatus();
    loadRecentStudents();
  }, []);

  // Resend OTP countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── API helpers ─────────────────────────────────────────────────────────────

  const checkMongoStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`);
      if (res.ok) {
        const data = await res.json();
        setMongoStatus({
          connected: Boolean(data?.mongo?.connected),
          checked: true,
          uri: data?.mongo?.uri || 'MongoDB Database',
        });
      } else {
        setMongoStatus({ connected: false, checked: true });
      }
    } catch {
      setMongoStatus({ connected: false, checked: true });
    }
  };

  const loadRecentStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/students`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.students)) {
          setRecentStudents(data.students.slice(0, 5));
        }
      }
    } catch {
      // non-critical — ignore
    }
  };

  // ── Phone lookup on 10-digit entry ─────────────────────────────────────────

  const handlePhoneChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setPhone(clean);
    setErrorMsg('');

    if (clean.length === 10) {
      try {
        const res = await fetch(`${API_URL}/api/auth/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: clean }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.found && data.student) {
            if (!name) setName(data.student.name || '');
            if (!niatId) setNiatId(data.student.niatId || '');
          }
        }
      } catch {
        // lookup failure is non-critical
      }
    }
  };

  const handleNiatIdChange = (val) => {
    setNiatId(val.toUpperCase().trim());
    setErrorMsg('');
  };

  // ── Step 1: Send OTP via Firebase Phone Auth ────────────────────────────────

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    const cleanNiatId = niatId.trim().toUpperCase();
    if (!cleanNiatId) {
      setErrorMsg('Please enter your NIAT Student ID (e.g. N26H04A0123).');
      return;
    }
    if (!cleanNiatId.startsWith('N')) {
      setErrorMsg('NIAT Student ID must start with "N" (e.g. N26H04A0123).');
      return;
    }

    // Prevent duplicate rapid sends
    if (otpSentRef.current && resendTimer > 0) {
      setErrorMsg(`Please wait ${resendTimer}s before resending.`);
      return;
    }

    setLoading(true);
    otpSentRef.current = false;

    try {
      const e164 = `+91${cleanPhone}`;

      // Set up invisible reCAPTCHA and send OTP via Firebase
      const appVerifier = setupRecaptcha('recaptcha-container');
      const result = await sendFirebasePhoneOtp(e164, appVerifier);

      setConfirmationResult(result);
      otpSentRef.current = true;
      setSuccessMsg(`OTP sent to +91 ${cleanPhone} via SMS.`);
      setStep('otp');
      setResendTimer(60);
    } catch (err) {
      console.error('[SendOTP] Firebase error:', err);

      // Provide clear, actionable error messages
      if (err.code === 'auth/invalid-phone-number') {
        setErrorMsg('Invalid phone number format. Please enter a valid 10-digit Indian mobile number.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many OTP requests. This number is temporarily blocked by Firebase. Please wait a few minutes and try again.');
      } else if (err.code === 'auth/captcha-check-failed') {
        setErrorMsg('reCAPTCHA verification failed. Please refresh the page and try again.');
      } else if (err.code === 'auth/quota-exceeded') {
        setErrorMsg('SMS quota exceeded for this project. Please contact the administrator.');
      } else if (err.message?.includes('not initialized') || err.message?.includes('env')) {
        setErrorMsg('Firebase is not configured. Please check that all VITE_FIREBASE_* variables are set in frontend/.env');
      } else {
        setErrorMsg(err.message || 'Failed to send OTP. Please try again.');
      }

      // Reset reCAPTCHA so the user can retry
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit OTP code.');
      return;
    }

    if (!confirmationResult) {
      setErrorMsg('OTP session expired. Please go back and send a new OTP.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Confirm the OTP with Firebase — this is the REAL verification
      const userCredential = await confirmationResult.confirm(cleanOtp);
      const firebaseUser = userCredential.user;

      // Step 2: Get a fresh ID token from Firebase
      const idToken = await firebaseUser.getIdToken();

      // Step 3: Verify the token with our backend and get the authenticated user
      const profileRes = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Always read the response body before checking status
      const profileText = await profileRes.text();
      let profileData;
      try {
        profileData = JSON.parse(profileText);
      } catch {
        throw new Error(
          `Backend returned a non-JSON response (status ${profileRes.status}). ` +
          'Make sure the backend server is running at ' + API_URL
        );
      }

      if (!profileRes.ok) {
        throw new Error(profileData?.message || `Backend error: ${profileRes.status}`);
      }

      // Step 4: Persist the student in MongoDB (upsert with their name + NIAT ID)
      const cleanPhone = phone.replace(/\D/g, '');
      const cleanName = name.trim();
      const cleanNiatId = niatId.trim().toUpperCase();

      const storeRes = await fetch(`${API_URL}/api/auth/store-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: cleanName,
          niatId: cleanNiatId,
        }),
      });

      let studentData = null;
      if (storeRes.ok) {
        const storeBody = await storeRes.json();
        studentData = storeBody?.student || null;
      }

      // Build the final student object
      const finalStudent = {
        ...(studentData || {}),
        name: cleanName,
        niatId: cleanNiatId,
        phone: cleanPhone,
        firebaseUid: profileData.user?.uid || firebaseUser.uid,
        phoneNumber: profileData.user?.phoneNumber || `+91${cleanPhone}`,
      };

      setSuccessMsg('Login successful! Redirecting...');

      if (onLoginSuccess) {
        onLoginSuccess(finalStudent);
      }

      loadRecentStudents();
    } catch (err) {
      console.error('[VerifyOTP] Error:', err);

      if (err.code === 'auth/invalid-verification-code') {
        setErrorMsg('Incorrect OTP. Please check the code sent to your mobile.');
      } else if (err.code === 'auth/code-expired') {
        setErrorMsg('OTP has expired. Please go back and request a new one.');
        setConfirmationResult(null);
      } else if (err.code === 'auth/session-expired') {
        setErrorMsg('Session expired. Please go back and request a new OTP.');
        setConfirmationResult(null);
      } else {
        setErrorMsg(err.message || 'OTP verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────────────────────

  const handleResendOtp = () => {
    setOtp('');
    setConfirmationResult(null);
    otpSentRef.current = false;
    setStep('phone');
    setErrorMsg('');
    setSuccessMsg('');
    // A tiny delay so the reCAPTCHA container re-mounts cleanly
    setTimeout(() => {
      handleSendOtp();
    }, 100);
  };

  // ── Quick fill from recent students list ────────────────────────────────────

  const handleQuickFill = (sample) => {
    setName(sample.name || '');
    setNiatId(sample.niatId || '');
    setPhone(sample.phone || '');
    setErrorMsg('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Logged-in student profile
  // ═══════════════════════════════════════════════════════════════════════════

  if (currentStudent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#070b14]">
        <div className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Student Account
                  <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Verified
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Authenticated via Firebase Phone OTP</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                Firebase ✓
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {mongoStatus.connected ? 'MongoDB Synced' : 'Local Backup'}
              </span>
            </div>
          </div>

          {/* Student Profile Card */}
          <div className="my-6 p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Student Name</span>
                <h3 className="text-lg font-bold text-white">{currentStudent.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">NIAT Student ID</span>
                <p className="text-sm font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/30">
                  {currentStudent.niatId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Verified Mobile:</span>
                <p className="font-medium text-slate-200 mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  +91 {currentStudent.phone}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Department:</span>
                <p className="font-medium text-slate-200 mt-0.5">
                  {currentStudent.department || 'B.Tech AI & Data Science'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onNavigateHome}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Access Learning & Doubts</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 border border-slate-700 text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Login form
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#070b14] relative min-h-[calc(100vh-60px)]">
      {/* Invisible reCAPTCHA container — Firebase requires this div to exist in the DOM */}
      <div id="recaptcha-container"></div>

      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10">

        {/* Top Badge */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-200 font-semibold tracking-wide">NIAT Academic Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
              Firebase OTP
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
              {mongoStatus.checked ? (mongoStatus.connected ? 'MongoDB ✓' : 'Local Fallback') : 'MongoDB...'}
            </span>
          </div>
        </div>

        {/* Mandatory barrier notice */}
        {isMandatoryBarrier && (
          <div className="mb-5 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Student Sign-In Required</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Please verify your NIAT student identity to unlock syllabus modules, teacher voice sessions, and the doubt clearing engine.
              </p>
            </div>
          </div>
        )}

        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-13 h-13 mx-auto rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/25 mb-3">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Student <span className="text-blue-400">Portal Login</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Verify your identity with your Name, NIAT ID & mobile OTP
          </p>
        </div>

        {/* Error / Success alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
            <span className="font-bold text-red-400 mt-0.5 shrink-0">!</span>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── STEP 1: Phone, Name, NIAT ID ───────────────────────────────── */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">

            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Student Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrorMsg(''); }}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-white placeholder-slate-500 transition-all outline-none"
              />
            </div>

            {/* NIAT ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-blue-400" />
                  NIAT Student ID
                </label>
                <span className="text-[10px] text-blue-300 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  Format: N26H04A0123
                </span>
              </div>
              <input
                type="text"
                value={niatId}
                onChange={(e) => handleNiatIdChange(e.target.value)}
                placeholder="N26H04A0123"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-mono tracking-wider text-white placeholder-slate-500 uppercase transition-all outline-none"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Mobile Number (SMS OTP)
              </label>
              <div className="flex rounded-xl bg-slate-900 border border-slate-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden transition-all">
                <span className="px-3.5 py-2.5 bg-slate-800 text-slate-200 text-sm font-semibold border-r border-slate-700 flex items-center">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  required
                  className="w-full px-4 py-2.5 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Firebase will send a real SMS OTP to this number.
              </p>
            </div>

            {/* Send OTP Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending OTP via Firebase...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Send OTP to Mobile</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Recent students quick-fill */}
            {recentStudents.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Recent Students:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recentStudents.map((std, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickFill(std)}
                      className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-blue-500/60 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="text-blue-400 font-mono font-semibold">{std.niatId}</span>
                      <span className="text-slate-500">•</span>
                      <span>{std.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* ── STEP 2: OTP Verification ────────────────────────────────────── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">

            {/* Target Info */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">OTP sent to</p>
                <p className="text-sm font-semibold text-white">+91 {phone}</p>
                <p className="text-[11px] text-blue-400 font-mono mt-0.5">{niatId} • {name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setConfirmationResult(null);
                  otpSentRef.current = false;
                }}
                className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* OTP Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2 text-center">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(clean);
                  setErrorMsg('');
                }}
                placeholder="• • • • • •"
                maxLength={6}
                autoFocus
                required
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all outline-none"
              />
              <p className="text-[11px] text-slate-500 text-center mt-1.5">
                Check your SMS for the 6-digit code from Firebase.
              </p>
            </div>

            {/* Resend / Back row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setConfirmationResult(null);
                  otpSentRef.current = false;
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              {resendTimer > 0 ? (
                <span className="text-slate-500">Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendOtp}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer disabled:text-slate-500"
                >
                  Resend OTP
                </button>
              )}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying with Firebase...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verify OTP & Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
