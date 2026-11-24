import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from './firebase.js';
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
  Mail,
  Smartphone,
} from './icons.jsx';
import {
  firebaseConfig,
  sendFirebasePhoneOtp,
  sendEmailSignInLink,
  completeEmailSignIn,
  checkEmailSignInLink,
} from './firebaseConfig.js';

// ─── constants ────────────────────────────────────────────────────────────────
// Which login method is active: 'phone' | 'email'
const METHOD_PHONE = 'phone';
const METHOD_EMAIL = 'email';

export function StudentLogin({
  apiBaseUrl = '',
  currentStudent,
  onLoginSuccess,
  onLogout,
  onNavigateHome,
  isMandatoryBarrier = false,
}) {
  // ── which tab is active ────────────────────────────────────────────────────
  const [authMethod, setAuthMethod] = useState(METHOD_PHONE);

  // ── shared form fields ─────────────────────────────────────────────────────
  const [step, setStep]       = useState('input');  // 'input' | 'otp' | 'link_sent'
  const [name, setName]       = useState('');
  const [niatId, setNiatId]   = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── phone specific ─────────────────────────────────────────────────────────
  const [phone, setPhone]                     = useState('');
  const [otpCode, setOtpCode]                 = useState('');
  const [resendTimer, setResendTimer]         = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const otpSentRef      = useRef(false);
  const verifierRef     = useRef(null);
  const isRenderedRef   = useRef(false);  // guards StrictMode double-mount

  // ── email specific ─────────────────────────────────────────────────────────
  const [email, setEmail]           = useState('');
  const [emailForSignIn, setEmailForSignIn] = useState('');  // set after link sent

  // ── misc ───────────────────────────────────────────────────────────────────
  const [mongoStatus, setMongoStatus] = useState({ connected: false, checked: false });
  const [recentStudents, setRecentStudents] = useState([]);

  const API_URL = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    apiBaseUrl ||
    'http://localhost:5000'
  ).replace(/\/+$/, '');

  // ── reCAPTCHA setup and cleanup ───────────────────────────────────────────
  /**
   * setupRecaptcha — StrictMode-safe
   *
   * StrictMode mounts → cleanup → remounts in dev, which means the cleanup
   * fires before the second mount. We track whether we have a live, rendered
   * verifier in `isRenderedRef` and in `verifierRef`. On every call we:
   *   1. Clear + destroy any stale instance first (clears the DOM node too).
   *   2. Create a fresh RecaptchaVerifier and render it.
   * This is safe to call multiple times; Firebase itself is idempotent after
   * the DOM node is cleared.
   */
  const setupRecaptcha = async () => {
    // Destroy any previous instance so the DOM node is clean
    if (verifierRef.current) {
      try { verifierRef.current.clear(); } catch {}
      verifierRef.current = null;
      isRenderedRef.current = false;
    }

    // Also wipe the container's innerHTML so Firebase doesn't see a stale widget
    const container = document.getElementById('recaptcha-container');
    if (container) container.innerHTML = '';

    verifierRef.current = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      {
        size: 'normal',
        callback: () => {},            // reCAPTCHA solved
        'expired-callback': () => {    // token expired — force re-setup on next send
          isRenderedRef.current = false;
          verifierRef.current = null;
        },
      }
    );

    await verifierRef.current.render();
    isRenderedRef.current = true;

    return verifierRef.current;
  };

  // Cleanup on unmount (also fires between StrictMode mount cycles in dev)
  useEffect(() => {
    return () => {
      if (verifierRef.current) {
        try { verifierRef.current.clear(); } catch {}
        verifierRef.current = null;
        isRenderedRef.current = false;
      }
    };
  }, []);

  // ── On mount: check if we landed here from a Gmail sign-in link ───────────
  useEffect(() => {
    checkMongoStatus();
    loadRecentStudents();

    // If the page URL is a Firebase email sign-in link, complete sign-in
    if (checkEmailSignInLink()) {
      const savedEmail = localStorage.getItem('niat_email_for_signin') || '';
      if (savedEmail) {
        // Auto-complete when returning on the same device (email already in storage)
        finishEmailSignIn(savedEmail);
      } else {
        // Different device — switch to email tab and ask for the address
        setAuthMethod(METHOD_EMAIL);
        setStep('link_confirm');
      }
    }
  }, []);

  // ── Resend OTP countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // ── Reset step when switching methods ─────────────────────────────────────
  const switchMethod = (method) => {
    setAuthMethod(method);
    setStep('input');
    setErrorMsg('');
    setSuccessMsg('');
    setOtpCode('');
    setConfirmationResult(null);
    otpSentRef.current = false;
    if (verifierRef.current) {
      try { verifierRef.current.clear(); } catch {}
      verifierRef.current = null;
      isRenderedRef.current = false;
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // API helpers
  // ═══════════════════════════════════════════════════════════════════════════

  const checkMongoStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`);
      if (res.ok) {
        const data = await res.json();
        setMongoStatus({ connected: Boolean(data?.mongo?.connected), checked: true });
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
        if (Array.isArray(data?.students)) setRecentStudents(data.students.slice(0, 5));
      }
    } catch {}
  };

  /**
   * After Firebase signs the user in (phone or email), verify the token
   * with the backend and persist the student record.
   */
  const finalizeLogin = async (firebaseUser, preloadedProfileUser) => {
    let profileData = null;

    if (preloadedProfileUser) {
      profileData = { user: preloadedProfileUser };
    } else {
      const idToken = await firebaseUser.getIdToken();

      // 1. Verify token with backend
      const profileRes = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      });

      const profileText = await profileRes.text();
      try {
        profileData = JSON.parse(profileText);
      } catch {
        throw new Error(
          `Backend returned a non-JSON response (status ${profileRes.status}). ` +
          `Make sure the backend is running at ${API_URL}`
        );
      }
      if (!profileRes.ok) throw new Error(profileData?.message || `Backend error: ${profileRes.status}`);
    }

    // 2. Persist student
    const cleanPhone  = phone.replace(/\D/g, '');
    const cleanName   = name.trim();
    const cleanNiatId = niatId.trim().toUpperCase();

    const storeRes = await fetch(`${API_URL}/api/auth/store-student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, name: cleanName, niatId: cleanNiatId }),
    });

    let studentData = null;
    if (storeRes.ok) {
      const sb = await storeRes.json();
      studentData = sb?.student || null;
    }

    const finalStudent = {
      ...(studentData || {}),
      name:        cleanName  || profileData?.user?.email?.split('@')[0] || 'Student',
      niatId:      cleanNiatId,
      phone:       cleanPhone,
      email:       profileData?.user?.email  || email || '',
      firebaseUid: profileData?.user?.uid    || firebaseUser.uid,
      phoneNumber: profileData?.user?.phoneNumber || (cleanPhone ? `+91${cleanPhone}` : ''),
    };

    setSuccessMsg('Login successful! Redirecting...');
    onLoginSuccess?.(finalStudent);
    loadRecentStudents();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Phone OTP flow
  // ═══════════════════════════════════════════════════════════════════════════

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
            if (!name)   setName(data.student.name   || '');
            if (!niatId) setNiatId(data.student.niatId || '');
          }
        }
      } catch {}
    }
  };

  const handleSendPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) return setErrorMsg('Please enter a valid 10-digit mobile number.');
    if (!name.trim())             return setErrorMsg('Please enter your full name.');
    const cleanNiatId = niatId.trim().toUpperCase();
    if (!cleanNiatId)             return setErrorMsg('Please enter your NIAT Student ID.');
    if (!cleanNiatId.startsWith('N')) return setErrorMsg('NIAT ID must start with "N" (e.g. N26H04A0123).');
    if (otpSentRef.current && resendTimer > 0) return setErrorMsg(`Please wait ${resendTimer}s before resending.`);

    setLoading(true);
    otpSentRef.current = false;

    try {
      const appVerifier = await setupRecaptcha();
      const result = await sendFirebasePhoneOtp(`+91${cleanPhone}`, appVerifier);

      setConfirmationResult(result);
      otpSentRef.current = true;
      setSuccessMsg(`OTP sent to +91 ${cleanPhone} via SMS.`);
      setStep('otp');
      setResendTimer(60);
    } catch (err) {
      console.error('[SendOTP]', err);
      if (verifierRef.current) {
        try { verifierRef.current.clear(); } catch {}
        verifierRef.current = null;
      }
      const msg =
        err.code === 'auth/invalid-phone-number'  ? 'Invalid phone number. Enter a valid 10-digit Indian number.' :
        err.code === 'auth/too-many-requests'      ? 'Too many requests. Wait a few minutes and try again.' :
        err.code === 'auth/captcha-check-failed'   ? 'reCAPTCHA failed. Refresh the page and try again.' :
        err.code === 'auth/quota-exceeded'         ? 'SMS quota exceeded. Contact the administrator.' :
        err.message || 'Failed to send OTP. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (otpCode.trim().length !== 6) return setErrorMsg('Please enter the full 6-digit OTP.');
    if (!confirmationResult)         return setErrorMsg('OTP session expired. Go back and resend.');

    setLoading(true);
    try {
      console.log("Step 1: Starting OTP verification");
      const result = await confirmationResult.confirm(otpCode.trim());
      console.log("Step 2: Firebase OTP verified", result.user.uid);

      const idToken = await result.user.getIdToken();
      console.log("Step 3: Firebase token received");

      const response = await fetch(
        `${API_URL}/api/auth/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      console.log("Step 4: Backend status:", response.status);

      const text = await response.text();
      console.log("Step 5: Backend response:", text);

      if (!response.ok) {
        throw new Error(`Backend error ${response.status}: ${text}`);
      }
      if (!text) {
        throw new Error("Backend returned an empty response");
      }

      const data = JSON.parse(text);

      await finalizeLogin(result.user, data.user);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      const msg =
        err.code === 'auth/invalid-verification-code' ? 'Incorrect OTP. Check the SMS code.' :
        err.code === 'auth/code-expired'              ? 'OTP expired. Go back and request a new one.' :
        err.code === 'auth/session-expired'           ? 'Session expired. Go back and resend OTP.' :
        err.message || 'OTP verification failed.';
      setErrorMsg(msg);
      if (err.code === 'auth/code-expired' || err.code === 'auth/session-expired') {
        setConfirmationResult(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendPhoneOtp = () => {
    setOtpCode('');
    setConfirmationResult(null);
    otpSentRef.current = false;
    setStep('input');
    setErrorMsg('');
    setSuccessMsg('');
    if (verifierRef.current) {
      try { verifierRef.current.clear(); } catch {}
      verifierRef.current = renderPromiseRef.current = null;
    }
    setTimeout(handleSendPhoneOtp, 100);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Gmail (email magic link) flow
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSendEmailLink = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return setErrorMsg('Please enter a valid email address.');
    }
    if (!name.trim()) return setErrorMsg('Please enter your full name.');
    const cleanNiatId = niatId.trim().toUpperCase();
    if (!cleanNiatId)                      return setErrorMsg('Please enter your NIAT Student ID.');
    if (!cleanNiatId.startsWith('N'))      return setErrorMsg('NIAT ID must start with "N" (e.g. N26H04A0123).');

    setLoading(true);
    try {
      await sendEmailSignInLink(trimmedEmail);
      setEmailForSignIn(trimmedEmail);
      setSuccessMsg(`Sign-in link sent to ${trimmedEmail}. Check your Gmail and click the link.`);
      setStep('link_sent');
    } catch (err) {
      console.error('[SendEmailLink]', err);
      const msg =
        err.code === 'auth/invalid-email'       ? 'Invalid email address.' :
        err.code === 'auth/too-many-requests'   ? 'Too many requests. Wait a few minutes.' :
        err.code === 'auth/unauthorized-domain' ?
          'This domain is not authorised in Firebase Console. Add it under Authentication → Settings → Authorized domains.' :
        err.message || 'Failed to send sign-in link. Try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * finishEmailSignIn — called either automatically on redirect, or manually
   * when the student enters the email address they used (cross-device case).
   */
  const finishEmailSignIn = async (signinEmail) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const credential = await completeEmailSignIn(signinEmail);
      await finalizeLogin(credential.user);
    } catch (err) {
      console.error('[EmailSignIn]', err);
      const msg =
        err.code === 'auth/invalid-action-code'    ? 'This sign-in link is invalid or has already been used.' :
        err.code === 'auth/expired-action-code'    ? 'This sign-in link has expired. Request a new one.' :
        err.code === 'auth/invalid-email'          ? 'Email does not match the sign-in link.' :
        err.message || 'Email sign-in failed. Try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Cross-device: student entered email manually after clicking link on another device
  const handleConfirmEmail = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    const trimmed = emailForSignIn.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return setErrorMsg('Please enter the email address you used to request the sign-in link.');
    }
    await finishEmailSignIn(trimmed);
  };

  const handleResendEmailLink = async () => {
    setStep('input');
    setErrorMsg('');
    setSuccessMsg('');
    setEmailForSignIn('');
  };

  // ── Quick fill ─────────────────────────────────────────────────────────────
  const handleQuickFill = (sample) => {
    setName(sample.name   || '');
    setNiatId(sample.niatId || '');
    setPhone(sample.phone   || '');
    setErrorMsg('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Logged-in student profile card
  // ═══════════════════════════════════════════════════════════════════════════

  if (currentStudent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#070b14]">
        <div className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

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
                <p className="text-xs text-slate-400">Authenticated via Firebase</p>
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
              {currentStudent.phone && (
                <div>
                  <span className="text-slate-400">Verified Mobile:</span>
                  <p className="font-medium text-slate-200 mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    +91 {currentStudent.phone}
                  </p>
                </div>
              )}
              {currentStudent.email && (
                <div>
                  <span className="text-slate-400">Verified Email:</span>
                  <p className="font-medium text-slate-200 mt-0.5 flex items-center gap-1.5 break-all">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {currentStudent.email}
                  </p>
                </div>
              )}
              <div>
                <span className="text-slate-400">Department:</span>
                <p className="font-medium text-slate-200 mt-0.5">
                  {currentStudent.department || 'B.Tech AI & Data Science'}
                </p>
              </div>
            </div>
          </div>

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
              Sign Out
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

      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10">

        {/* ── Top badge ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-200 font-semibold tracking-wide">NIAT Academic Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
              Firebase Auth
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
              {mongoStatus.checked ? (mongoStatus.connected ? 'MongoDB ✓' : 'Local Fallback') : 'MongoDB...'}
            </span>
          </div>
        </div>

        {/* ── Mandatory barrier notice ───────────────────────────────────── */}
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

        {/* ── Branding ──────────────────────────────────────────────────── */}
        <div className="text-center mb-5">
          <div className="w-13 h-13 mx-auto rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/25 mb-3">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Student <span className="text-blue-400">Portal Login</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose how you want to verify your identity
          </p>
        </div>

        {/* ── Method Tab Switcher ────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => switchMethod(METHOD_PHONE)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              authMethod === METHOD_PHONE
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile OTP
          </button>
          <button
            type="button"
            onClick={() => switchMethod(METHOD_EMAIL)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              authMethod === METHOD_EMAIL
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Gmail Sign-In
          </button>
        </div>

        {/* ── Error / Success alerts ─────────────────────────────────────── */}
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

        {/* ══════════════════════════════════════════════════════════════════
            PHONE OTP TAB
        ══════════════════════════════════════════════════════════════════ */}
        {authMethod === METHOD_PHONE && (

          <>
            {/* Step: input phone details */}
            {step === 'input' && (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">

                <SharedNameNiatFields
                  name={name} setName={setName}
                  niatId={niatId} setNiatId={setNiatId}
                  setErrorMsg={setErrorMsg}
                />

                {/* Mobile number */}
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
                    Firebase sends a real SMS to this number.
                  </p>
                </div>

                {/* reCAPTCHA widget container (visible verification box) */}
                <div className="flex justify-center my-3 overflow-hidden rounded-lg">
                  <div id="recaptcha-container"></div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Sending OTP...</span></>
                    : <><Smartphone className="w-4 h-4" /><span>Send OTP to Mobile</span><ChevronRight className="w-4 h-4 ml-1" /></>
                  }
                </button>

                <RecentStudents list={recentStudents} onFill={handleQuickFill} />
              </form>
            )}

            {/* Step: enter OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-5">

                {/* Target info */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">OTP sent to</p>
                    <p className="text-sm font-semibold text-white">+91 {phone}</p>
                    <p className="text-[11px] text-blue-400 font-mono mt-0.5">{niatId} • {name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStep('input'); setErrorMsg(''); setSuccessMsg(''); setConfirmationResult(null); otpSentRef.current = false; }}
                    className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* OTP input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-2 text-center">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={otpCode}
                    onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrorMsg(''); }}
                    placeholder="• • • • • •"
                    maxLength={6}
                    autoFocus
                    required
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all outline-none"
                  />
                  <p className="text-[11px] text-slate-500 text-center mt-1.5">
                    Check your SMS for the 6-digit code.
                  </p>
                </div>

                {/* Back / Resend */}
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => { setStep('input'); setErrorMsg(''); setConfirmationResult(null); otpSentRef.current = false; }} className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer">
                    <ArrowLeft className="w-3.5 h-3.5" />Back
                  </button>
                  {resendTimer > 0
                    ? <span className="text-slate-500">Resend in {resendTimer}s</span>
                    : <button type="button" disabled={loading} onClick={handleResendPhoneOtp} className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer disabled:text-slate-500">Resend OTP</button>
                  }
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Verifying...</span></>
                    : <><ShieldCheck className="w-4 h-4 text-emerald-400" /><span>Verify OTP & Sign In</span></>
                  }
                </button>
              </form>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            GMAIL / EMAIL MAGIC LINK TAB
        ══════════════════════════════════════════════════════════════════ */}
        {authMethod === METHOD_EMAIL && (

          <>
            {/* Step: enter email details and request link */}
            {step === 'input' && (
              <form onSubmit={handleSendEmailLink} className="space-y-4">

                <SharedNameNiatFields
                  name={name} setName={setName}
                  niatId={niatId} setNiatId={setNiatId}
                  setErrorMsg={setErrorMsg}
                />

                {/* Email field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-red-400" />
                    Gmail / Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
                    placeholder="student@gmail.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Firebase will send a sign-in link to this inbox — no password needed.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Sending link...</span></>
                    : <><Mail className="w-4 h-4" /><span>Send Sign-In Link to Gmail</span><ChevronRight className="w-4 h-4 ml-1" /></>
                  }
                </button>

                <RecentStudents list={recentStudents} onFill={handleQuickFill} />
              </form>
            )}

            {/* Step: link sent — waiting for student to click it */}
            {step === 'link_sent' && (
              <div className="space-y-5">

                {/* Gmail inbox illustration */}
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-sm font-semibold text-white text-center">Check your Gmail inbox</p>
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    A sign-in link was sent to<br />
                    <span className="text-blue-300 font-mono font-semibold">{emailForSignIn}</span><br />
                    Click the link in the email to complete sign-in.
                  </p>
                  <p className="text-[11px] text-slate-500 text-center">
                    The link expires in 1 hour. Check your Spam folder if you don't see it.
                  </p>
                </div>

                {/* If opening on a different device, they confirm email here */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700">
                  <p className="text-[11px] text-slate-400 mb-2">
                    Clicked the link on a different device? Enter your email to complete sign-in here:
                  </p>
                  <form onSubmit={handleConfirmEmail} className="flex gap-2">
                    <input
                      type="email"
                      value={emailForSignIn}
                      onChange={(e) => setEmailForSignIn(e.target.value)}
                      placeholder="student@gmail.com"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1"
                    >
                      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Verify
                    </button>
                  </form>
                </div>

                <button
                  type="button"
                  onClick={handleResendEmailLink}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Send to a different email
                </button>
              </div>
            )}

            {/* Step: cross-device — the user opened the link on a different device */}
            {step === 'link_confirm' && (
              <form onSubmit={handleConfirmEmail} className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs">
                  <p className="font-bold text-white mb-1">Complete your sign-in</p>
                  <p>It looks like you clicked the sign-in link on a different device. Enter the email address you used to request the link.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-red-400" />
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    value={emailForSignIn}
                    onChange={(e) => setEmailForSignIn(e.target.value)}
                    placeholder="student@gmail.com"
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Signing in...</span></>
                    : <><ShieldCheck className="w-4 h-4 text-emerald-400" /><span>Complete Sign-In</span></>
                  }
                </button>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SharedNameNiatFields({ name, setName, niatId, setNiatId, setErrorMsg }) {
  return (
    <>
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
          onChange={(e) => { setNiatId(e.target.value.toUpperCase().trim()); setErrorMsg(''); }}
          placeholder="N26H04A0123"
          required
          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-mono tracking-wider text-white placeholder-slate-500 uppercase transition-all outline-none"
        />
      </div>
    </>
  );
}

function RecentStudents({ list, onFill }) {
  if (!list.length) return null;
  return (
    <div className="pt-4 border-t border-slate-800">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
        Recent Students:
      </span>
      <div className="flex flex-wrap gap-1.5">
        {list.map((std, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onFill(std)}
            className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-blue-500/60 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="text-blue-400 font-mono font-semibold">{std.niatId}</span>
            <span className="text-slate-500">•</span>
            <span>{std.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
