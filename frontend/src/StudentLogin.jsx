import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Phone,
  User,
  ShieldCheck,
  Check,
  RefreshCw,
  Sparkles,
  Database,
  IdCard,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from './icons.jsx';

export function StudentLogin({
  apiBaseUrl = '',
  currentStudent,
  onLoginSuccess,
  onLogout,
  onNavigateHome,
}) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [name, setName] = useState('');
  const [niatId, setNiatId] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [mongoStatus, setMongoStatus] = useState({ connected: false, checked: false });
  const [recentStudents, setRecentStudents] = useState([]);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check MongoDB connection status on mount
  useEffect(() => {
    checkMongoStatus();
    loadRecentStudents();
  }, []);

  // Timer countdown for resending OTP
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const checkMongoStatus = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/status`);
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
      const res = await fetch(`${apiBaseUrl}/api/auth/students`);
      if (res.ok) {
        const data = await res.json();
        if (data?.students) {
          setRecentStudents(data.students.slice(0, 5));
        }
      }
    } catch {
      // ignore
    }
  };

  // Lookup existing student when phone reaches 10 digits
  const handlePhoneChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setPhone(clean);
    setErrorMsg('');

    if (clean.length === 10) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: clean }),
        });
        const data = await res.json();
        if (data?.found && data.student) {
          if (!name) setName(data.student.name || '');
          if (!niatId) setNiatId(data.student.niatId || '');
          setIsNewUser(false);
        } else {
          setIsNewUser(true);
        }
      } catch {
        // ignore lookup error
      }
    }
  };

  // Format NIAT ID automatically
  const handleNiatIdChange = (val) => {
    const formatted = val.toUpperCase().trim();
    setNiatId(formatted);
    setErrorMsg('');
  };

  // Step 1: Send OTP to Phone
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

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
      setErrorMsg('NIAT ID must start with "N" (e.g. N26H04A0123).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: name.trim(),
          niatId: cleanNiatId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP. Please try again.');
      }

      setDemoOtp(data.otp);
      setSuccessMsg(`OTP sent successfully to +91 ${cleanPhone}`);
      setStep('otp');
      setResendTimer(60);
    } catch (err) {
      setErrorMsg(err.message || 'Error sending OTP. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          otp: cleanOtp,
          name: name.trim(),
          niatId: niatId.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid OTP code. Please check and try again.');
      }

      setSuccessMsg('Verification successful! Welcome to NIAT AI Teachers.');
      if (onLoginSuccess && data.student) {
        onLoginSuccess(data.student);
      }
      loadRecentStudents();
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo student
  const handleQuickFill = (sample) => {
    setName(sample.name);
    setNiatId(sample.niatId);
    setPhone(sample.phone);
    setErrorMsg('');
  };

  // IF ALREADY LOGGED IN: SHOW STUDENT PROFILE & DASHBOARD QUICK ACCESS
  if (currentStudent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19]">
        <div className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
          {/* Top subtle glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400" />

          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Student Account
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Verified
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Authenticated via Phone OTP</p>
              </div>
            </div>

            {/* MongoDB Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] text-emerald-400 font-medium">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>MongoDB Saved</span>
            </div>
          </div>

          {/* Student Profile Card */}
          <div className="my-6 p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Student Name
                </span>
                <h3 className="text-lg font-bold text-white">{currentStudent.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  NIAT Student ID
                </span>
                <p className="text-sm font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
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
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to AI Doubt Clearing</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 border border-slate-700/80 text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0b0f19] relative min-h-[calc(100vh-60px)]">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_20%,rgba(139,92,246,0.15),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Top Status Bar: MongoDB Info */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">NIAT Student Portal</span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono ${
              mongoStatus.connected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-400'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>{mongoStatus.connected ? 'MongoDB Live' : 'MongoDB Sync'}</span>
          </div>
        </div>

        {/* Portal Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-400 flex items-center justify-center shadow-xl shadow-purple-600/30 mb-3">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            NIAT <span className="gradient-text">Student Login</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access Autonomous AI Teachers with your NIAT ID & Phone OTP
          </p>
        </div>

        {/* Alerts / Error / Success */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <span className="font-bold text-red-400 mt-0.5">!</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: PHONE, NAME & NIAT ID */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Student Full Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm text-white placeholder-slate-500 transition-all outline-none"
              />
            </div>

            {/* NIAT ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>NIAT Student ID</span>
                </label>
                <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  e.g. N26H04A0123
                </span>
              </div>
              <input
                type="text"
                value={niatId}
                onChange={(e) => handleNiatIdChange(e.target.value)}
                placeholder="N26H04A0123"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono tracking-wider text-white placeholder-slate-500 uppercase transition-all outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Must match your NIAT College Roll / ID (e.g. N26H04A0123).
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile Number (for OTP Verification)</span>
              </label>
              <div className="flex rounded-xl bg-slate-900/80 border border-slate-700/80 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 overflow-hidden transition-all">
                <span className="px-3 py-2.5 bg-slate-800 text-slate-300 text-sm font-medium border-r border-slate-700/80 flex items-center gap-1">
                  🇮🇳 +91
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
            </div>

            {/* Quick Demo Pre-fill */}
            <div className="pt-1">
              <span className="text-[11px] text-slate-400">Quick Test Credentials:</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickFill({
                      name: 'Aarav Patel',
                      niatId: 'N26H04A0123',
                      phone: '9876543210',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Aarav (N26H04A0123)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickFill({
                      name: 'Sneha Reddy',
                      niatId: 'N26H04A0456',
                      phone: '9845012345',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Sneha (N26H04A0456)</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating OTP...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Send OTP via SMS</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            {/* Verification Target Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Verifying Phone</p>
                <p className="text-sm font-semibold text-white">+91 {phone}</p>
                <p className="text-[11px] text-indigo-400 font-mono mt-0.5">{niatId} &bull; {name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs text-purple-400 hover:text-purple-300 underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Instant Demo OTP Preview Box */}
            {demoOtp && (
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    SMS Gateway Simulation
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Your One-Time Password is: <strong className="text-white font-mono text-sm tracking-widest">{demoOtp}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(demoOtp)}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all shadow cursor-pointer shrink-0 ml-2"
                >
                  Auto Fill
                </button>
              </div>
            )}

            {/* OTP Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 text-center">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
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
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 text-white placeholder-slate-600 transition-all outline-none"
              />
              <p className="text-[11px] text-slate-400 text-center mt-1.5">
                Code expires in 5 minutes. Universal test OTP: <span className="font-mono text-purple-400 font-bold">123456</span>
              </p>
            </div>

            {/* Resend and Actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || loading}
                onClick={handleSendOtp}
                className="text-purple-400 hover:text-purple-300 disabled:text-slate-500 font-medium transition-colors cursor-pointer"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>

            {/* Verify & Login Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code & MongoDB...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verify OTP & Login</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Recent Registered Students Section */}
        {recentStudents.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Registered NIAT Students in MongoDB ({recentStudents.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recentStudents.map((std, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickFill(std)}
                  className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="text-purple-400 font-mono font-semibold">{std.niatId}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span>{std.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
