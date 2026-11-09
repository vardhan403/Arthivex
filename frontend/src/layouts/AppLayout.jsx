import React, { useState } from 'react';
import { Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { isMockMode } from '../services/apiClient';

export default function AppLayout() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090e1b] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#ffb067] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono tracking-widest text-[#ffb067] uppercase">Loading Vault Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isDemoUser = user?.role === 'DEMO_USER' || user?.email?.startsWith('demo@');

  const handleExitDemo = () => {
    logout();
    navigate('/');
  };

  const handleResetDemo = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await authService.resetDemo();
      setResetMsg('Demo environment reset to baseline accounts.');
      setTimeout(() => {
        setResetMsg(null);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setResetMsg('Failed to reset demo: ' + (err.message || 'error'));
      setTimeout(() => setResetMsg(null), 3000);
    } finally {
      setResetting(false);
    }
  };

  // Get active route title
  const getPageTitleAndBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') {
      return { title: 'Treasury Dashboard', breadcrumbs: [{ label: 'Overview' }] };
    }
    if (path.startsWith('/accounts/') && path !== '/accounts') {
      return {
        title: 'Account Ledger Details',
        breadcrumbs: [{ label: 'Accounts', to: '/accounts' }, { label: 'Audit Details' }]
      };
    }
    if (path === '/accounts') {
      return { title: 'Institutional Accounts', breadcrumbs: [{ label: 'My Accounts' }] };
    }
    if (path === '/deposit') {
      return { title: 'Inbound Liquidity & Deposit', breadcrumbs: [{ label: 'Deposit' }] };
    }
    if (path === '/withdraw') {
      return { title: 'Authorized Fund Disbursement', breadcrumbs: [{ label: 'Withdrawal' }] };
    }
    if (path === '/transfer') {
      return { title: 'Internal Atomic Ledger Transfer', breadcrumbs: [{ label: 'Transfer' }] };
    }
    if (path.startsWith('/transactions/') && path !== '/transactions') {
      return {
        title: 'Cryptographic Audit Record',
        breadcrumbs: [{ label: 'Transactions', to: '/transactions' }, { label: 'Transaction Audit' }]
      };
    }
    if (path === '/transactions') {
      return { title: 'Transaction Ledger & History', breadcrumbs: [{ label: 'Transactions' }] };
    }
    if (path === '/settings' || path === '/profile') {
      return { title: 'Profile & Security Architecture', breadcrumbs: [{ label: 'Settings' }] };
    }
    if (path === '/admin') {
      return { title: 'System Administration & Oversight', breadcrumbs: [{ label: 'Administration' }] };
    }
    if (path === '/admin/users') {
      return { title: 'User Identity Management', breadcrumbs: [{ label: 'Administration', to: '/admin' }, { label: 'Users' }] };
    }
    if (path === '/admin/onboarding') {
      return { title: 'User Onboarding Lifecycle', breadcrumbs: [{ label: 'Administration', to: '/admin' }, { label: 'Onboarding' }] };
    }
    if (path === '/admin/audit') {
      return { title: 'Security & Financial Audit Trail', breadcrumbs: [{ label: 'Administration', to: '/admin' }, { label: 'Audit Trail' }] };
    }
    return { title: 'Arthivex Vault', breadcrumbs: [] };
  };

  const { title, breadcrumbs } = getPageTitleAndBreadcrumbs();

  return (
    <div className="min-h-screen bg-[#090e1b] text-slate-100 flex">
      {/* Sidebar */}
      <AppSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header */}
        <TopHeader
          setMobileOpen={setMobileOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          pageTitle={title}
          breadcrumbs={breadcrumbs}
        />

        {/* Persistent Demo Banner (Only displayed for DEMO_USER, works in Light and Dark mode) */}
        {isDemoUser && (
          <div className="bg-amber-100 dark:bg-amber-500/15 border-b border-amber-300 dark:border-amber-500/30 px-4 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-600 dark:text-[#ffb067] text-lg">info</span>
              <span className="font-bold tracking-wide">
                DEMO ENVIRONMENT — ALL FINANCIAL INFORMATION AND TRANSACTIONS ARE SIMULATED.
              </span>
              {resetMsg && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 text-[11px] font-mono">
                  {resetMsg}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDemo}
                disabled={resetting}
                className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 dark:bg-[#ffb067]/20 dark:hover:bg-[#ffb067]/30 dark:text-[#ffd5b3] dark:border-[#ffb067]/40 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset demo account to default baseline"
                type="button"
              >
                <span className={`material-symbols-outlined text-sm ${resetting ? 'animate-spin' : ''}`}>restart_alt</span>
                <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
              </button>
              <button
                onClick={handleExitDemo}
                className="px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-200 dark:border-rose-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Exit public demo and return to landing page"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span>Exit Demo</span>
              </button>
            </div>
          </div>
        )}

        {/* Development & Security Audit Pill Banner */}
        <div className="bg-[#161b29]/80 border-b border-[#283046] px-4 lg:px-8 py-2 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffb067]"></span>
            <span className="font-semibold text-slate-200">Security Invariant:</span>
            <span>All write requests require an immutable <code>Idempotency-Key</code> header. Double-entry ledger verified.</span>
          </div>
          <div className="hidden md:flex items-center gap-3 font-mono text-[11px]">
            <span className="text-slate-500">Mode:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${
              isDemoUser
                ? 'bg-amber-950/60 text-[#ffb067] border border-amber-800/60'
                : isMockMode()
                  ? 'bg-amber-950/60 text-[#ffb067] border border-amber-800/60'
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
            }`}>
              {isDemoUser ? 'PUBLIC DEMO SANDBOX' : isMockMode() ? 'MOCK AUDIT SANDBOX' : 'LIVE SPRING BACKEND'}
            </span>
          </div>
        </div>

        {/* Page Body Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
