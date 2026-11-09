import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [simState, setSimState] = useState('default');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Validation & Simulator alerts
  const [statusBanner, setStatusBanner] = useState(null);
  const [nameError, setNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const applySimState = (state) => {
    setSimState(state);
    setStatusBanner(null);
    setNameError(false);
    setEmailError(false);
    setTermsError(false);
    setSubmitting(false);
    setShowSuccessModal(false);

    switch (state) {
      case 'default':
        setFullname('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTermsAgreed(false);
        break;

      case 'required':
        setFullname('');
        setEmail('');
        setNameError(true);
        setTermsError(true);
        setStatusBanner({
          type: 'error',
          title: 'Missing Mandatory Information',
          desc: 'Please complete legal name and accept policies to initiate your ledger.'
        });
        break;

      case 'invalid-email':
        setEmailError(true);
        setStatusBanner({
          type: 'error',
          title: 'Invalid Email Address',
          desc: 'Email domain does not contain valid institutional MX records.'
        });
        break;

      case 'password-mismatch':
        setStatusBanner({
          type: 'error',
          title: 'Password Mismatch Alert',
          desc: 'Confirm password entries must match exactly before cryptographic salt generation.'
        });
        break;

      case 'weak-pass':
        setStatusBanner({
          type: 'warning',
          title: 'Weak Password Notice',
          desc: 'Enhance security with minimum 8 characters and combination of numerals.'
        });
        break;

      case 'loading':
        setSubmitting(true);
        setStatusBanner({
          type: 'info',
          title: 'Submitting Registration',
          desc: 'Establishing secure channel to Arthivex authorization gateway...'
        });
        break;

      case 'success':
        setShowSuccessModal(true);
        break;

      default:
        break;
    }
  };

  // Password Strength Evaluation
  const hasMinLength = password.length >= 8;
  const hasLettersAndNumbers = /[0-9]/.test(password) && /[a-zA-Z]/.test(password);
  let strengthScore = 0;
  if (password.length > 0) strengthScore++;
  if (hasMinLength) strengthScore++;
  if (hasLettersAndNumbers) strengthScore++;
  if (password.length >= 12 && /[^a-zA-Z0-9]/.test(password)) strengthScore++;

  const getStrengthLabel = () => {
    if (strengthScore === 0) return { label: 'None', color: 'text-secondary' };
    if (strengthScore <= 2) return { label: 'Moderate', color: 'text-amber-400' };
    if (strengthScore === 3) return { label: 'Strong', color: 'text-[#ffb067]' };
    return { label: 'Enterprise Tier', color: 'text-emerald-400' };
  };
  const strengthInfo = getStrengthLabel();

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setStatusBanner(null);
    setNameError(false);
    setEmailError(false);
    setTermsError(false);

    if (!fullname) {
      setNameError(true);
      return;
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      setEmailError(true);
      return;
    }
    if (password !== confirmPassword) {
      setStatusBanner({
        type: 'error',
        title: 'Password Mismatch Alert',
        desc: 'Confirm password entries must match exactly.'
      });
      return;
    }
    if (!termsAgreed) {
      setTermsError(true);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: fullname.trim(),
        firstName: fullname.trim().split(' ')[0] || 'Account',
        lastName: fullname.trim().split(' ').slice(1).join(' ') || 'Holder',
        email: email.trim(),
        password
      });
      setSubmitting(false);
      setShowSuccessModal(true);
    } catch (err) {
      setSubmitting(false);
      setStatusBanner({
        type: 'error',
        title: 'Registration Error',
        desc: err.message || 'Failed to submit registration.'
      });
    }
  };

  return (
    <div className="w-full bg-[#0e1320] text-[#dee2f5] min-h-screen flex flex-col justify-center font-sans antialiased selection:bg-[#ffb067] selection:text-[#4c2700]">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Top Interactive State Simulator Bar (Exact Stitch element) */}
        <div className="mb-8 p-3 rounded-2xl bg-[#161b29] shadow-xl flex flex-wrap items-center justify-between gap-3 border border-[#283046]/40">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1f2d]">
            <span className="material-symbols-outlined text-[#ffb067] text-base">tune</span>
            <span className="text-xs text-[#dee2f5] font-semibold">Interactive UI State Simulator</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" id="state-selector-bar">
            {[
              { id: 'default', label: 'Default' },
              { id: 'required', label: 'Required Field Error' },
              { id: 'invalid-email', label: 'Invalid Email' },
              { id: 'password-mismatch', label: 'Password Mismatch' },
              { id: 'weak-pass', label: 'Weak Password' },
              { id: 'loading', label: 'Submitting' },
              { id: 'success', label: 'Success Modal' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => applySimState(btn.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  simState === btn.id
                    ? 'bg-[#ffb067] text-[#4c2700] font-semibold shadow-sm'
                    : 'bg-[#1a1f2d] text-[#bfc6de] hover:text-[#dee2f5]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Platform Benefits & Security Overview */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Brand Emblem with Theme Toggle & Demo Button */}
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 w-fit group">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ffb067] to-[#ffb877] flex items-center justify-center shadow-lg shadow-[#ffb067]/20 group-hover:scale-105 transition-transform">
                  <span
                    className="material-symbols-outlined text-[#4c2700] text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    shield_lock
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl text-[#dee2f5] font-bold tracking-tight">Arthivex</span>
                  <span className="text-[10px] text-[#bfc6de] tracking-widest uppercase font-mono font-semibold">
                    Institutional Ledger
                  </span>
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

            {/* Headline & Value Pitch */}
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] text-[#dee2f5] font-bold leading-tight tracking-tight">
                Join thousands managing their money with confidence.
              </h1>
              <p className="text-base text-[#bfc6de] leading-relaxed">
                Unify high-velocity accounts, enterprise liquidity tracking, and personalized multi-currency vaults
                inside one surgical fintech dashboard.
              </p>
            </div>

            {/* Mini Visual Component: Institutional Dark Card Preview (Exact from Stitch) */}
            <div className="relative p-6 rounded-3xl bg-[#161b29] shadow-xl overflow-hidden group border border-[#283046]/40">
              <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#ffb067]/10 blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb067] text-xl">account_balance_wallet</span>
                  <span className="text-xs text-[#bfc6de] font-semibold">Arthivex Onyx Debit</span>
                </div>
                <span className="text-[11px] text-[#ffd5b3] px-2.5 py-1 rounded-full bg-[#1a1f2d] font-medium border border-[#283046]">
                  Active • Tier I
                </span>
              </div>

              <div className="flex flex-col gap-1 mb-5">
                <span className="text-[11px] text-[#bfc6de]">Card Balance</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl text-[#dee2f5] font-bold font-mono tracking-tight">
                    ₹2,85,075.00
                  </span>
                  <span className="text-xs text-[#34d399] flex items-center gap-0.5 font-mono font-bold">
                    <span className="material-symbols-outlined text-sm">arrow_upward</span> +14.8%
                  </span>
                </div>
              </div>

              {/* Micro controls matching Finlytics card preview */}
              <div className="p-3.5 rounded-2xl bg-[#1a1f2d] flex items-center justify-between gap-3 border border-[#283046]/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#ffb067] text-base">lock</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#dee2f5] font-semibold">Spending Cap</span>
                    <span className="text-xs text-[#bfc6de] font-mono">₹4,00,000 / week</span>
                  </div>
                </div>
                {/* Pill status toggle */}
                <div className="w-11 h-6 rounded-full bg-[#ffb067] flex items-center px-1 justify-end cursor-pointer">
                  <div className="w-4 h-4 rounded-full bg-[#090e1b] shadow-sm"></div>
                </div>
              </div>
            </div>

            {/* Trust & Feature Bullet Points with Peach Icons */}
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-[#ffb067]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined text-[#ffb067] text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#dee2f5]">Instant account access</span>
                  <span className="text-xs text-[#bfc6de] leading-relaxed">
                    Provision virtual IBANs and contactless debit capabilities in under two minutes.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-[#ffb067]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined text-[#ffb067] text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#dee2f5]">Transparent transaction ledger</span>
                  <span className="text-xs text-[#bfc6de] leading-relaxed">
                    Zero covert conversion fees or surprise weekend rollover surcharges.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-[#ffb067]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined text-[#ffb067] text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#dee2f5]">Customizable notification channels</span>
                  <span className="text-xs text-[#bfc6de] leading-relaxed">
                    Direct webhook alerts, encrypted SMS notifications, or biometric push signals.
                  </span>
                </div>
              </div>
            </div>

            {/* Verified Team / Customer Social Proof */}
            <div className="p-4 rounded-2xl bg-[#1a1f2d] flex items-center justify-between border border-[#283046]/40">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 overflow-hidden">
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#1a1f2d] bg-[#252a38] flex items-center justify-center text-[#ffb067] text-xs font-bold">
                    LR
                  </div>
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#1a1f2d] bg-[#303443] flex items-center justify-center text-[#b8e3ff] text-xs font-bold">
                    MK
                  </div>
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#1a1f2d] bg-[#ffb067] flex items-center justify-center text-[#4c2700] text-xs font-bold">
                    JH
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#dee2f5]">48,200+ Verified Traders</span>
                  <span className="text-[11px] text-[#bfc6de]">SOC2 Type II & FINRA Ready</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#ffb067]">verified_user</span>
            </div>

            {/* Security Badge */}
            <div className="p-4 rounded-2xl bg-[#161b29] flex items-center gap-3 border border-[#283046]/40">
              <span className="material-symbols-outlined text-[#bfc6de] text-2xl">lock_clock</span>
              <span className="text-xs text-[#bfc6de] leading-snug">
                Designed with security in mind — data encrypted at rest with AES-256 and TLS 1.3 in transit.
              </span>
            </div>
          </div>

          {/* Right Column: Registration Card */}
          <div className="lg:col-span-7">
            <div className="relative p-6 sm:p-10 rounded-3xl bg-[#161b29] shadow-2xl transition-all duration-300 border border-[#283046]/50">
              {/* Top Card Glow Effect */}
              <div className="absolute top-0 right-1/4 w-64 h-32 bg-[#ffb067]/10 blur-3xl pointer-events-none rounded-full"></div>

              <div className="flex flex-col gap-2 mb-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#dee2f5]">Create Your Arthivex Account</h2>
                  <span className="px-3 py-1 rounded-full bg-[#1a1f2d] text-xs font-bold text-[#ffb067] border border-[#ffb067]/20">
                    Fast KYC
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#bfc6de]">
                  Get started with a simpler way to manage your financial activities.
                </p>
              </div>

              {/* Alert Display Area for Simulated States */}
              {statusBanner && (
                <div
                  className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${
                    statusBanner.type === 'error'
                      ? 'bg-[#93000a]/30 border border-[#ffb4ab]/40 text-[#dee2f5]'
                      : statusBanner.type === 'warning'
                      ? 'bg-[#ffb067]/20 border border-[#ffb067]/40 text-[#dee2f5]'
                      : 'bg-[#1a1f2d] border border-[#ffb067]/30 text-[#dee2f5]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl flex-shrink-0 ${
                      statusBanner.type === 'error'
                        ? 'text-[#ffb4ab]'
                        : statusBanner.type === 'warning'
                        ? 'text-[#ffb067]'
                        : 'text-[#ffb067] animate-spin'
                    }`}
                  >
                    {statusBanner.type === 'error' ? 'error' : statusBanner.type === 'warning' ? 'warning' : 'sync'}
                  </span>
                  <div className="flex flex-col text-left">
                    <span
                      className={`text-xs font-bold ${
                        statusBanner.type === 'error' ? 'text-[#ffb4ab]' : 'text-[#ffb067]'
                      }`}
                    >
                      {statusBanner.title}
                    </span>
                    <span className="text-[11px] text-[#bfc6de] mt-0.5">{statusBanner.desc}</span>
                  </div>
                </div>
              )}

              {/* Registration Form */}
              <form className="flex flex-col gap-5" onSubmit={handleFormSubmit}>
                {/* Full Name Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#dee2f5] font-semibold flex items-center justify-between" htmlFor="fullname">
                    <span>Full Legal Name</span>
                    <span className="text-[#bfc6de] text-[11px]">As on government ID</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-[#bfc6de] text-lg pointer-events-none">
                      person
                    </span>
                    <input
                      className={`w-full h-12 pl-12 pr-4 rounded-xl bg-[#1a1f2d] text-[#dee2f5] placeholder:text-[#bfc6de]/60 text-xs outline-none focus:bg-[#252a38] border transition-colors ${
                        nameError ? 'border-[#ffb4ab]' : 'border-transparent focus:border-[#ffb067]/60'
                      }`}
                      id="fullname"
                      name="fullname"
                      placeholder="Enter your full name"
                      type="text"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                    />
                  </div>
                  {nameError && (
                    <span className="text-[11px] text-[#ffb4ab] flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      Please enter your official full name.
                    </span>
                  )}
                </div>

                {/* Email Address Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#dee2f5] font-semibold" htmlFor="email">
                    Work or Personal Email
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-[#bfc6de] text-lg pointer-events-none">
                      alternate_email
                    </span>
                    <input
                      className={`w-full h-12 pl-12 pr-4 rounded-xl bg-[#1a1f2d] text-[#dee2f5] placeholder:text-[#bfc6de]/60 text-xs outline-none focus:bg-[#252a38] border transition-colors ${
                        emailError ? 'border-[#ffb4ab]' : 'border-transparent focus:border-[#ffb067]/60'
                      }`}
                      id="email"
                      name="email"
                      placeholder="Enter your email address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {emailError && (
                    <span className="text-[11px] text-[#ffb4ab] flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      Please provide a valid email format (e.g. name@domain.com).
                    </span>
                  )}
                </div>

                {/* Two Column Password Row for Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#dee2f5] font-semibold" htmlFor="password">
                      Master Password
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-[#bfc6de] text-lg pointer-events-none">
                        lock
                      </span>
                      <input
                        className="w-full h-12 pl-12 pr-12 rounded-xl bg-[#1a1f2d] text-[#dee2f5] placeholder:text-[#bfc6de]/60 text-xs outline-none focus:bg-[#252a38] border border-transparent focus:border-[#ffb067]/60 transition-colors"
                        id="password"
                        name="password"
                        placeholder="Create a password"
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 text-[#bfc6de] hover:text-[#dee2f5] transition-colors p-1"
                        onClick={() => setShowPass(!showPass)}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showPass ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#dee2f5] font-semibold" htmlFor="confirm-password">
                      Confirm Password
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-[#bfc6de] text-lg pointer-events-none">
                        verified_user
                      </span>
                      <input
                        className="w-full h-12 pl-12 pr-12 rounded-xl bg-[#1a1f2d] text-[#dee2f5] placeholder:text-[#bfc6de]/60 text-xs outline-none focus:bg-[#252a38] border border-transparent focus:border-[#ffb067]/60 transition-colors"
                        id="confirm-password"
                        name="confirm-password"
                        placeholder="Re-enter your password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 text-[#bfc6de] hover:text-[#dee2f5] transition-colors p-1"
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Criteria Real-Time Indicator Panel */}
                <div className="p-4 rounded-2xl bg-[#1a1f2d] flex flex-col gap-2.5 border border-[#283046]/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#bfc6de] font-semibold">Security Complexity</span>
                    <span className={`text-[11px] font-bold ${strengthInfo.color}`}>
                      {strengthInfo.label}
                    </span>
                  </div>

                  {/* Multi-segment strength meter bar */}
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                    <div className={`rounded-full transition-colors ${strengthScore >= 1 ? 'bg-[#ffb067]' : 'bg-[#303443]'}`}></div>
                    <div className={`rounded-full transition-colors ${strengthScore >= 2 ? 'bg-[#ffb067]' : 'bg-[#303443]'}`}></div>
                    <div className={`rounded-full transition-colors ${strengthScore >= 3 ? 'bg-[#ffb067]' : 'bg-[#303443]'}`}></div>
                    <div className={`rounded-full transition-colors ${strengthScore >= 4 ? 'bg-[#34d399]' : 'bg-[#303443]'}`}></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${hasMinLength ? 'text-[#ffb067]' : 'text-[#bfc6de]'}`}>
                        check_circle
                      </span>
                      <span className={`text-xs ${hasMinLength ? 'text-[#dee2f5] font-medium' : 'text-[#bfc6de]'}`}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${hasLettersAndNumbers ? 'text-[#ffb067]' : 'text-[#bfc6de]'}`}>
                        check_circle
                      </span>
                      <span className={`text-xs ${hasLettersAndNumbers ? 'text-[#dee2f5] font-medium' : 'text-[#bfc6de]'}`}>
                        Letters & numbers included
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms & Privacy Agreement Checkbox */}
                <div className="flex items-start gap-3 mt-1">
                  <div className="relative flex items-center h-5 mt-0.5">
                    <input
                      className="w-5 h-5 rounded-md accent-[#ffb067] bg-[#1a1f2d] text-[#ffb067] cursor-pointer"
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                    />
                  </div>
                  <label className="text-xs text-[#bfc6de] leading-snug cursor-pointer select-none" htmlFor="terms">
                    I accept the{' '}
                    <a className="text-[#ffd5b3] hover:underline" href="#terms" onClick={(e) => e.preventDefault()}>
                      Terms of Service
                    </a>{' '}
                    and confirm I have reviewed Arthivex’s{' '}
                    <a className="text-[#ffd5b3] hover:underline" href="#privacy" onClick={(e) => e.preventDefault()}>
                      Institutional Privacy Policy
                    </a>{' '}
                    and data storage stipulations.
                  </label>
                </div>
                {termsError && (
                  <span className="text-[11px] text-[#ffb4ab] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    You must agree to the Terms of Service to proceed.
                  </span>
                )}

                {/* Primary Action: Warm Peach Button */}
                <button
                  className="w-full h-12 mt-2 rounded-xl bg-[#ffb067] text-[#4c2700] text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#ffb067]/20 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                      <span>Encrypting & Generating Vault...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Arthivex Account</span>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>

                {/* Bottom Login Link */}
                <div className="flex items-center justify-center gap-1 pt-2">
                  <span className="text-xs text-[#bfc6de]">Already have an account?</span>
                  <Link
                    to="/login"
                    className="text-xs text-[#ffb067] hover:text-[#ffb877] font-semibold hover:underline"
                  >
                    Sign In
                  </Link>
                </div>
              </form>
            </div>

            {/* Secondary Security Disclaimer Tile below card */}
            <div className="mt-4 p-4 rounded-2xl bg-[#090e1b] flex items-center justify-between border border-[#283046]/40">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#ffb067] text-2xl">fingerprint</span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#dee2f5]">Hardware Key Support</span>
                  <span className="text-[11px] text-[#bfc6de]">
                    FIDO2 WebAuthn & YubiKey integration enabled right after registration.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#1a1f2d] text-[10px] font-mono text-[#bfc6de] border border-[#283046]">
                ISO 27001
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Modal: Welcome / Success State Dialog (Exact from Stitch) */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090e1b]/80 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-md p-8 rounded-3xl bg-[#1a1f2d] shadow-2xl flex flex-col items-center text-center gap-4 border border-[#283046]">
              <div className="w-16 h-16 rounded-full bg-[#ffb067]/20 flex items-center justify-center mb-1">
                <span
                  className="material-symbols-outlined text-[#ffb067] text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#dee2f5]">Registration Submitted</h3>
              <p className="text-xs text-[#bfc6de] leading-relaxed">
                Your account profile has been securely registered with an initial status of{' '}
                <span className="font-semibold text-[#ffb067]">PENDING</span>. A platform administrator will review and activate your ledger access.
              </p>
              <div className="w-full p-4 rounded-2xl bg-[#161b29] flex flex-col gap-2 my-2 text-left border border-[#283046]">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#bfc6de]">Onboarding Status</span>
                  <span className="text-[#ffb067] font-mono font-bold">PENDING APPROVAL</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#bfc6de]">Security Protection</span>
                  <span className="text-[#dee2f5] font-semibold">Double-Entry Protected</span>
                </div>
              </div>
              <button
                type="button"
                className="w-full h-12 rounded-xl bg-[#ffb067] text-[#4c2700] text-sm font-bold flex items-center justify-center gap-2 hover:brightness-105 transition-all shadow-lg shadow-[#ffb067]/20"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/login');
                }}
              >
                <span>Proceed to Login</span>
                <span className="material-symbols-outlined text-lg">login</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
