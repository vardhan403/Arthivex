import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function TopHeader({ setMobileOpen, collapsed, setCollapsed, pageTitle, breadcrumbs = [] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    {
      id: 'notif-1',
      title: 'Ledger Synchronized',
      time: 'Just now',
      message: 'Cryptographic double-entry ledger is active and balanced.'
    },
    {
      id: 'notif-2',
      title: 'Session Authenticated',
      time: 'Current session',
      message: '256-bit JWT authentication active with role-based authorization.'
    }
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isDemo = user?.role === 'DEMO_USER' || user?.email?.startsWith('demo@');

  const handleLogout = () => {
    logout();
    navigate(isDemo ? '/' : '/login');
  };

  const displayName = user?.name || user?.fullName || user?.username || (user?.email ? user.email.split('@')[0] : 'Account Holder');
  const userRole = isDemo ? 'Demo User' : (user?.role ? user.role.replace(/_/g, ' ') : 'Account Holder');
  const vaultId = user?.id ? `AX-${user.id.substring(0, 8).toUpperCase()}` : 'AX-SESSION';

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#0e1320]/90 backdrop-blur-xl border-b border-[#283046]/70 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ease-in-out">
      {/* Left: 3-bar Hamburger, Breadcrumbs & Search */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* 3-Bar Hamburger Menu Toggle Button matching Stitch */}
        <button
          onClick={() => {
            if (window.innerWidth < 1024) {
              setMobileOpen(true);
            } else if (setCollapsed) {
              setCollapsed(!collapsed);
            }
          }}
          aria-label="Toggle navigation sidebar"
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#161b29] hover:bg-[#20273a] text-slate-300 hover:text-[#ffb067] border border-[#283046] hover:border-[#ffb067]/40 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ffb067]/40"
          title="Toggle Sidebar (Expand / Collapse)"
          type="button"
        >
          <svg
            className="w-5 h-5 transition-transform group-hover:scale-105"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <line className="transition-all duration-200 origin-center" x1="4" x2="20" y1="6" y2="6"></line>
            <line className="transition-all duration-200 origin-center" x1="4" x2="20" y1="12" y2="12"></line>
            <line className="transition-all duration-200 origin-center" x1="4" x2="20" y1="18" y2="18"></line>
          </svg>
        </button>

        {/* Stitch Breadcrumb hierarchy */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            Arthivex
          </Link>
          <span className="text-[#283046]">/</span>
          <span className="font-semibold text-white tracking-tight whitespace-nowrap">
            {pageTitle || 'Secure Banking'}
          </span>
        </div>

        {/* Global Search Input with Ctrl K pill */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:flex items-center ml-2">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-400">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 lg:w-72 h-9 pl-9 pr-14 bg-[#161b29] text-white placeholder:text-slate-500 rounded-xl border border-[#283046] text-xs focus:outline-none focus:border-[#ffb067]/60 focus:ring-1 focus:ring-[#ffb067]/40 transition-all"
            placeholder="Search accounts or transactions..."
          />
          <span className="absolute right-2.5 px-1.5 py-0.5 rounded-md bg-[#0e1320] border border-[#283046] text-slate-400 text-[10px] tracking-wide font-mono">
            Ctrl K
          </span>
        </form>
      </div>

      {/* Right Controls: Latency, Theme Toggle, Notifications, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Latency Pill matching Stitch */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b29] border border-[#283046]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] text-slate-300 font-mono">Ledger Connected • Synchronized</span>
        </div>

        {/* Theme Toggle (Light / Dark Mode) */}
        <ThemeToggle />

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#161b29] border border-transparent hover:border-[#283046] transition-colors cursor-pointer"
            type="button"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ffb067] text-[#2e1500] text-[10px] font-bold">
              {notifications.length}
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#161b29] border border-[#283046] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-[#283046]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb067] text-lg">notifications</span>
                  <span className="font-semibold text-sm text-white">System Alerts</span>
                </div>
                <span className="text-[11px] font-mono text-[#ffb067] bg-[#ffb067]/10 px-2 py-0.5 rounded border border-[#ffb067]/30 font-bold">
                  {notifications.length} Active
                </span>
              </div>

              <div className="divide-y divide-[#283046] max-h-72 overflow-y-auto my-2">
                {notifications.map((n) => (
                  <div key={n.id} className="py-3 hover:bg-[#1a1f2d] px-2 rounded-lg transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-200">{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#283046] text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-slate-400 hover:text-[#ffb067] font-medium transition-colors cursor-pointer"
                >
                  Close alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill matching Stitch */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 sm:gap-2.5 pl-2 py-1 border-l border-[#283046] hover:bg-[#161b29]/50 rounded-lg transition-colors focus:outline-none cursor-pointer"
            type="button"
          >
            <div className="w-8 h-8 rounded-full bg-[#ffb067]/20 border border-[#ffb067]/40 flex items-center justify-center text-[#ffb067] font-bold text-xs shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-[13px] leading-tight text-white font-medium whitespace-nowrap">
                {displayName}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#ffb067] leading-tight font-semibold font-mono whitespace-nowrap">
                {userRole}
              </span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-slate-400 hover:text-white">
              expand_more
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-64 bg-[#161b29] border border-[#283046] rounded-2xl shadow-2xl p-2 z-50">
              <div className="p-3 border-b border-[#283046] mb-1">
                <p className="text-xs font-bold text-white">{displayName}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{user?.email || 'authenticated.session@arthivex.internal'}</p>
                <div className="mt-2 text-[10px] font-mono bg-[#0e1320] px-2 py-1 rounded text-[#ffb067] flex items-center justify-between border border-[#283046]">
                  <span>Vault ID:</span>
                  <span className="font-bold">{vaultId}</span>
                </div>
              </div>

              <Link
                to="/settings"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#20273a] rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-base text-[#ffb067]">shield_person</span>
                Profile & Security Keys
              </Link>

              <Link
                to="/accounts"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#20273a] rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-base text-sky-400">account_balance_wallet</span>
                Treasury Ledgers
              </Link>

              <div className="border-t border-[#283046] my-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors font-medium cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  {isDemo ? 'Exit Demo Environment' : 'Disconnect Vault Session'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
