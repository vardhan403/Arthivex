import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formState, setFormState] = useState('default');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [globalAlert, setGlobalAlert] = useState(null);
  const [successAlert, setSuccessAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const applyStatePreset = (stateKey) => {
    setFormState(stateKey);
    setEmailError('');
    setPasswordError('');
    setGlobalAlert(null);
    setSuccessAlert(false);
    setSubmitting(false);

    if (stateKey === 'default') {
      setEmail('alice@arthivex.io');
      setPassword('Password123!');
    } else if (stateKey === 'empty') {
      setEmail('');
      setPassword('');
      setEmailError('Corporate email cannot be empty.');
      setPasswordError('Passphrase cannot be empty.');
    } else if (stateKey === 'invalid_email') {
      setEmail('jennie.invalid_format');
      setPassword('SecurePassphrase123!');
      setEmailError('Please enter a valid RFC-compliant corporate address.');
    } else if (stateKey === 'unauthorized') {
      setEmail('alice@arthivex.io');
      setPassword('WrongPassword999');
      setGlobalAlert({
        title: 'Authentication Denied (401)',
        desc: 'Invalid email or password.'
      });
    } else if (stateKey === 'loading') {
      setEmail('alice@arthivex.io');
      setPassword('Password123!');
      setSubmitting(true);
    } else if (stateKey === 'success') {
      setEmail('alice@arthivex.io');
      setPassword('Password123!');
      setSuccessAlert(true);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setGlobalAlert(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError('Corporate email cannot be empty.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailError('Please enter a valid RFC-compliant corporate address.');
      return;
    }
    if (!password) {
      setPasswordError('Passphrase cannot be empty.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await login({ email: cleanEmail, password });
      setSubmitting(false);
      setSuccessAlert(true);
      setTimeout(() => {
        if (res?.user?.role === 'ADMINISTRATOR') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }, 500);
    } catch (err) {
      setSubmitting(false);
      const isRateLimited = err.status === 429 || err.errorCode === 'RATE_LIMIT_EXCEEDED';
      setGlobalAlert({
        title: isRateLimited ? 'Too Many Requests (429)' : err.status === 401 ? 'Authentication Denied (401)' : 'Authentication Error',
        desc: err.message || 'Invalid email or password.'
      });
    }
  };

  const handleSsoClick = (provider) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccessAlert(true);
      setTimeout(() => navigate('/dashboard'), 900);
    }, 1100);
  };

  return (
    <div className="w-full bg-[#0e1320] text-[#dee2f5] min-h-screen flex flex-col justify-center font-sans antialiased selection:bg-[#ffb067] selection:text-[#4c2700]">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        {/* Ambient Glow Decorator */}
        <div className="relative w-full">
          <div className="absolute -top-24 -left-12 w-96 h-96 bg-[#ffb067]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
          <div className="absolute -bottom-20 right-0 w-80 h-80 bg-[#38bdf8]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

          {/* State Preset Simulator Bar (Exact Stitch element) */}
          <div className="mb-8 p-3 rounded-2xl bg-[#161b29] flex flex-wrap items-center justify-between gap-3 shadow-sm border border-[#283046]/40">
            <div className="flex items-center gap-2 px-2">
              <span className="material-symbols-outlined text-[#ffb067] text-base">tune</span>
              <span className="text-[11px] font-semibold text-[#d7c3b4] uppercase tracking-wider">
                Interactive Test States:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" id="state-selector-group">
              {[
                { id: 'default', label: 'Default' },
                { id: 'empty', label: 'Empty Fields' },
                { id: 'invalid_email', label: 'Invalid Format' },
                { id: 'unauthorized', label: '401 Error' },
                { id: 'loading', label: 'Authenticating' },
                { id: 'success', label: 'Success' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => applyStatePreset(st.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    formState === st.id
                      ? 'bg-[#ffb067] text-[#4c2700] font-semibold shadow-sm'
                      : 'bg-[#1a1f2d] text-[#d7c3b4] hover:text-[#dee2f5]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT COLUMN: Brand Showcase & Institutional Fintech Snapshot Preview */}
            <div className="lg:col-span-6 flex flex-col space-y-8">
              {/* Logo & Brand Header with Theme Toggle & Demo Button */}
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-3 group w-fit">
                  <div className="w-11 h-11 rounded-xl bg-[#ffb067] flex items-center justify-center shadow-lg shadow-[#ffb067]/20 group-hover:scale-105 transition-transform">
                    <span
                      className="material-symbols-outlined text-[#4c2700] text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      shield_with_heart
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xl font-bold text-[#dee2f5] tracking-tight">Arthivex</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#252a38] text-[#ffdcc1] uppercase tracking-widest">
                        PRO
                      </span>
                    </div>
                    <span className="text-[11px] text-[#d7c3b4]">Institutional Asset Protection</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/demo"
                    className="px-3 py-1.5 rounded-full bg-[#ffb067]/15 hover:bg-[#ffb067]/25 text-[#ffd5b3] border border-[#ffb067]/40 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm text-[#ffb067]">explore</span>
                    <span>Explore Demo</span>
                  </Link>
                  <ThemeToggle size="sm" />
                </div>
              </div>

              {/* Headline & Context */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#dee2f5] tracking-tight leading-tight">
                  Take Control of Your Money. <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffb067] via-[#ffb877] to-[#b8e3ff]">
                    The Secure Way.
                  </span>
                </h1>
                <p className="text-base text-[#d7c3b4] max-w-xl leading-relaxed">
                  Precision custodial management, real-time threat isolation, and institutional telemetry packaged in
                  high-velocity banking infrastructure.
                </p>
              </div>

              {/* Fintech Dashboard Preview Card (Exact from Stitch UI) */}
              <div className="relative rounded-3xl bg-[#161b29] p-6 shadow-2xl overflow-hidden border border-[#283046]/40">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#ffb067]/15 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between pb-5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#1a1f2d] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#ffb067] text-base">
                        account_balance_wallet
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#d7c3b4] block">Primary Yield Ledger</span>
                      <span className="text-[11px] text-[#dee2f5] block">Custody Vault #2047</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#252a38] text-[#b8e3ff] text-[11px] flex items-center space-x-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse"></span>
                    <span>Hardware Synced</span>
                  </span>
                </div>

                {/* Metric Snapshot Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  <div className="rounded-2xl bg-[#1a1f2d] p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#d7c3b4]">
                      <span className="text-[11px] font-medium">Total Balance</span>
                      <span className="material-symbols-outlined text-sm text-[#b8e3ff]">trending_up</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-bold text-[#dee2f5] font-mono block">₹1,58,300.00</span>
                      <span className="text-[11px] text-[#34d399] flex items-center mt-0.5 font-mono">
                        <span className="material-symbols-outlined text-[13px] mr-0.5">arrow_upward</span>+12.73%
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#1a1f2d] p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#d7c3b4]">
                      <span className="text-[11px] font-medium">Income</span>
                      <span className="material-symbols-outlined text-sm text-[#ffd5b3]">payments</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-bold text-[#dee2f5] font-mono block">₹2,25,000.00</span>
                      <span className="text-[11px] text-[#ffb877] flex items-center mt-0.5 font-mono">
                        <span className="material-symbols-outlined text-[13px] mr-0.5">north_east</span>+11.94%
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#1a1f2d] p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-[#d7c3b4]">
                      <span className="text-[11px] font-medium">Monthly Burn</span>
                      <span className="material-symbols-outlined text-sm text-[#ffb4ab]">analytics</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-bold text-[#dee2f5] font-mono block">₹66,700.00</span>
                      <span className="text-[11px] text-[#d7c3b4] flex items-center mt-0.5">
                        <span className="material-symbols-outlined text-[13px] mr-0.5">check</span>Optimal
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trend Curve SVG Chart Micro-Widget */}
                <div className="rounded-2xl bg-[#1a1f2d] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] text-[#dee2f5] font-semibold">Expenditure Velocity</span>
                      <span className="text-[11px] text-[#d7c3b4]">/ Current Q3</span>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-[#ffb067] text-[#4c2700] text-[11px] font-bold">
                      ₹4,89,200 Projected
                    </div>
                  </div>

                  <div className="w-full h-20 pt-1">
                    <svg className="w-full h-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 340 70">
                      <defs>
                        <linearGradient id="areaGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#ffb067" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#ffb067" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stopColor="#b8e3ff" />
                          <stop offset="50%" stopColor="#ffb067" />
                          <stop offset="100%" stopColor="#ffd5b3" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,58 C35,52 65,30 95,44 C125,58 150,18 190,26 C230,34 260,10 295,30 C315,42 330,22 340,16 L340,70 L0,70 Z"
                        fill="url(#areaGradient)"
                      />
                      <path
                        d="M0,58 C35,52 65,30 95,44 C125,58 150,18 190,26 C230,34 260,10 295,30 C315,42 330,22 340,16"
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeLinecap="round"
                        strokeWidth="2.5"
                      />
                      <circle cx="190" cy="26" fill="#ffb067" r="4.5" />
                      <circle cx="190" cy="26" fill="none" r="8" stroke="#ffb067" strokeOpacity="0.5" strokeWidth="1.5" />
                    </svg>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#d7c3b4] pt-2 font-mono">
                    <span>Jan</span>
                    <span>Mar</span>
                    <span>May</span>
                    <span className="text-[#ffb067] font-semibold">Jul</span>
                    <span>Sep</span>
                    <span>Nov</span>
                  </div>
                </div>

                {/* Trust Guard Badges */}
                <div className="mt-4 pt-4 border-t border-[#303443] flex flex-wrap items-center justify-between gap-2 text-[#d7c3b4]">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="material-symbols-outlined text-[#ffb067] text-base"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified_user
                    </span>
                    <span className="text-[11px] font-medium">SOC-2 Type II Certified</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="material-symbols-outlined text-[#b8e3ff] text-base">lock</span>
                    <span className="text-[11px] font-medium">256-bit AES Zero-Knowledge</span>
                  </div>
                </div>
              </div>

              {/* Bottom Customer Testimonial Pill */}
              <div className="flex items-center space-x-3 p-3 rounded-2xl bg-[#161b29] max-w-md border border-[#283046]/40">
                <img
                  className="w-10 h-10 rounded-full object-cover shadow"
                  alt="Jennie Rose"
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                />
                <div className="flex flex-col">
                  <span className="text-xs text-[#dee2f5] font-semibold">Jennie Rose • VP Treasury</span>
                  <span className="text-[11px] text-[#d7c3b4]">“Arthivex handles our ₹48 Cr daily settlement safely.”</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive High-Impact Login Container */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full max-w-lg rounded-3xl bg-[#161b29] p-6 sm:p-10 shadow-2xl relative transition-all duration-300 border border-[#283046]/50">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#ffb067] to-transparent rounded-t-3xl"></div>

                {/* Header Titles */}
                <div className="mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1f2d] text-[#ffb067] text-[11px] font-semibold mb-3 border border-[#ffb067]/20">
                    <span className="w-2 h-2 rounded-full bg-[#ffb067] animate-pulse"></span>
                    <span>Encrypted Session Terminal</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#dee2f5] tracking-tight">Welcome Back</h2>
                  <p className="text-xs sm:text-sm text-[#d7c3b4] mt-1">
                    Sign in to continue managing your finances securely.
                  </p>
                </div>

                {/* Public Demo Entry Card */}
                <div className="mb-6 p-3.5 rounded-2xl bg-[#ffb067]/10 border border-[#ffb067]/30 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-xl bg-[#ffb067]/20 border border-[#ffb067]/40 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#ffb067] text-lg">explore</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Reviewing Arthivex?</p>
                      <p className="text-[11px] text-[#d7c3b4]">Explore simulated sandbox instantly.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/demo')}
                    className="px-4 py-2 rounded-xl bg-[#ffb067] text-[#4c2700] text-xs font-bold hover:bg-[#ffa048] transition-all whitespace-nowrap shadow-sm cursor-pointer"
                  >
                    Explore Demo
                  </button>
                </div>

                {/* Global Error Banner */}
                {globalAlert && (
                  <div className="mb-6 p-4 rounded-2xl bg-[#93000a]/30 border border-[#ffb4ab]/40 text-[#dee2f5] flex items-start space-x-3">
                    <span className="material-symbols-outlined text-[#ffb4ab] text-xl flex-shrink-0">error</span>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-[#ffb4ab]">{globalAlert.title}</span>
                      <span className="text-[11px] text-[#d7c3b4] mt-0.5">{globalAlert.desc}</span>
                    </div>
                  </div>
                )}

                {/* Global Success Banner */}
                {successAlert && (
                  <div className="mb-6 p-4 rounded-2xl bg-[#ffb067]/20 border border-[#ffb067]/40 text-[#dee2f5] flex items-center space-x-3">
                    <span
                      className="material-symbols-outlined text-[#ffb067] text-xl flex-shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-[#dee2f5]">Authorization Token Verified</span>
                      <span className="text-[11px] text-[#d7c3b4]">Redirecting to institutional dashboard workspace...</span>
                    </div>
                  </div>
                )}

                {/* Form Body */}
                <form className="space-y-5" onSubmit={handleFormSubmit}>
                  {/* Email Input Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-[#dee2f5] font-semibold" htmlFor="work-email">
                        Corporate / Account Email
                      </label>
                      <span className="text-[11px] text-[#d7c3b4]">SSO Enabled</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#d7c3b4]">
                        <span className="material-symbols-outlined text-base">alternate_email</span>
                      </div>
                      <input
                        className={`w-full h-12 pl-11 pr-4 rounded-2xl bg-[#1a1f2d] text-[#dee2f5] text-xs placeholder-[#d7c3b4]/40 focus:outline-none focus:bg-[#252a38] border transition-all ${
                          emailError ? 'border-[#ffb4ab]' : 'border-transparent focus:border-[#ffb067]/60'
                        }`}
                        id="work-email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="treasury@arthivex.com"
                      />
                    </div>
                    {emailError && (
                      <p className="text-[11px] text-[#ffb4ab] flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>{emailError}</span>
                      </p>
                    )}
                  </div>

                  {/* Password Input Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-[#dee2f5] font-semibold" htmlFor="work-password">
                        Password & Hardware Key
                      </label>
                      <a
                        className="text-[11px] text-[#ffb067] hover:underline transition-all"
                        href="#reset"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Password reset link dispatched to enrolled recovery devices.');
                        }}
                      >
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#d7c3b4]">
                        <span className="material-symbols-outlined text-base">key</span>
                      </div>
                      <input
                        className={`w-full h-12 pl-11 pr-11 rounded-2xl bg-[#1a1f2d] text-[#dee2f5] text-xs placeholder-[#d7c3b4]/40 focus:outline-none focus:bg-[#252a38] border transition-all ${
                          passwordError ? 'border-[#ffb4ab]' : 'border-transparent focus:border-[#ffb067]/60'
                        }`}
                        id="work-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter security passphrase"
                      />
                      <button
                        type="button"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#d7c3b4] hover:text-[#dee2f5] transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-[11px] text-[#ffb4ab] flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>{passwordError}</span>
                      </p>
                    )}
                  </div>

                  {/* Workstation Remember Device Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 rounded-lg bg-[#1a1f2d] peer-checked:bg-[#ffb067] flex items-center justify-center transition-all border border-[#283046]">
                        <span className="material-symbols-outlined text-[#4c2700] text-sm font-bold opacity-0 peer-checked:opacity-100">
                          check
                        </span>
                      </div>
                      <span className="text-xs text-[#dee2f5]">Remember workstation for 30 days</span>
                    </label>
                    <div className="flex items-center space-x-1 text-[#d7c3b4]" title="Encrypted device footprint hashing">
                      <span className="material-symbols-outlined text-sm">fingerprint</span>
                      <span className="text-[11px] font-mono">FIDO2</span>
                    </div>
                  </div>

                  {/* Primary Submit Action (Warm Peach Full-Width Button) */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 rounded-full bg-[#ffb067] hover:bg-[#ffa048] active:scale-[0.99] text-[#4c2700] font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#ffb067]/20 transition-all disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                          <span>Verifying Vault Credentials...</span>
                        </>
                      ) : successAlert ? (
                        <>
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          <span>Identity Authenticated</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Arthivex</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Social / Enterprise Auth Partition */}
                <div className="my-6 flex items-center space-x-4">
                  <div className="flex-1 h-px bg-[#1a1f2d]"></div>
                  <span className="text-[10px] text-[#d7c3b4] uppercase tracking-widest font-mono">
                    or fast connect
                  </span>
                  <div className="flex-1 h-px bg-[#1a1f2d]"></div>
                </div>

                {/* Alternative Auth SSO Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSsoClick('Okta Enterprise')}
                    className="h-11 rounded-2xl bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] flex items-center justify-center space-x-2 transition-all text-xs font-medium border border-[#283046]/40"
                  >
                    <span className="material-symbols-outlined text-[#b8e3ff] text-base">domain</span>
                    <span>Okta SSO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSsoClick('Hardware Key')}
                    className="h-11 rounded-2xl bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] flex items-center justify-center space-x-2 transition-all text-xs font-medium border border-[#283046]/40"
                  >
                    <span className="material-symbols-outlined text-[#ffb067] text-base">usb</span>
                    <span>YubiKey / Bio</span>
                  </button>
                </div>

                {/* Footer Sign-Up Link */}
                <div className="mt-8 text-center">
                  <p className="text-xs text-[#d7c3b4]">
                    Don't have an enterprise account?
                    <Link to="/register" className="text-[#ffb067] font-semibold hover:underline ml-1">
                      Register for Arthivex
                    </Link>
                  </p>
                </div>
              </div>

              {/* Bottom Session Info Note */}
              <div className="mt-6 flex items-center space-x-4 text-[#d7c3b4] text-[11px] font-mono">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>All Systems Operational</span>
                </span>
                <span>•</span>
                <span>Gateway US-East-1</span>
                <span>•</span>
                <a className="hover:text-[#dee2f5] transition-colors" href="#compliance">
                  Privacy & SLA
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
