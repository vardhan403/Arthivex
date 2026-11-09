import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation order matching Stitch HTML exactly:
  // Overview -> My Accounts -> Transactions -> Deposit -> Withdraw -> Transfer -> Settings
  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: 'dashboard' },
    { label: 'My Accounts', to: '/accounts', icon: 'account_balance' },
    { label: 'Transactions', to: '/transactions', icon: 'receipt_long' },
    { label: 'Deposit', to: '/deposit', icon: 'arrow_downward' },
    { label: 'Withdraw', to: '/withdraw', icon: 'arrow_upward' },
    { label: 'Transfer', to: '/transfer', icon: 'swap_horiz' },
    { label: 'Settings', to: '/settings', icon: 'settings' }
  ];

  const adminNavItems = [
    { label: 'Admin Overview', to: '/admin', icon: 'admin_panel_settings' },
    { label: 'User Management', to: '/admin/users', icon: 'manage_accounts' },
    { label: 'Onboarding', to: '/admin/onboarding', icon: 'how_to_reg' },
    { label: 'Audit Trail', to: '/admin/audit', icon: 'history_edu' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Collapsible Left Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[#0e1320] border-r border-[#283046]/70 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        id="appSidebar"
      >
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center gap-3 bg-[#161b29]/80 border-b border-[#283046]/50">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-[#ffb067]/10 border border-[#ffb067]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#ffb067] text-xl">shield_lock</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-white text-base tracking-tight leading-none whitespace-nowrap">
                  Arthivex
                </span>
                <span className="text-[10px] text-[#ffb067] uppercase tracking-widest font-semibold mt-1 whitespace-nowrap font-mono">
                  Enterprise Vault
                </span>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto p-1 text-slate-400 hover:text-white lg:hidden"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Section Title */}
          {!collapsed && (
            <div className="px-4 py-2.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold font-mono">
                Navigation
              </span>
            </div>
          )}

          {/* Navigation Menu Items */}
          <nav className="flex flex-col gap-1 px-2.5 pt-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#ffb067] text-[#2e1500] font-bold shadow-md shadow-[#ffb067]/20'
                      : 'text-slate-400 hover:bg-[#161b29] hover:text-white'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Privileged Administration Section (Visible strictly to verified ADMINISTRATORs) */}
          {user?.role === 'ADMINISTRATOR' && (
            <div className="mt-3 pt-3 border-t border-[#283046]/60">
              {!collapsed && (
                <div className="px-4 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-rose-400 font-bold font-mono">
                    Administration
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                </div>
              )}
              <nav className="flex flex-col gap-1 px-2.5 pt-1">
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        isActive
                          ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
                          : 'text-slate-400 hover:bg-[#161b29] hover:text-white'
                      } ${collapsed ? 'justify-center px-0' : ''}`
                    }
                  >
                    <span className="material-symbols-outlined text-[19px] shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Sidebar Security Footer */}
        <div className="p-3 flex flex-col gap-2 bg-[#161b29]/90 border-t border-[#283046]/60">
          {!collapsed ? (
            <>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#090e1b] border border-[#283046]/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#ffb067]">lock</span>
                  <span className="text-[11px] text-slate-300 font-mono">256-bit TLS Encrypted</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between px-2.5 text-slate-400 text-xs font-mono">
                <span className="text-[11px]">Spring Security v6.2</span>
                <span className="material-symbols-outlined text-sm text-[#ffb067]">verified_user</span>
              </div>
            </>
          ) : (
            <div className="flex justify-center py-1" title="256-bit TLS Encrypted • Active">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
          )}

          <button
            onClick={handleLogout}
            type="button"
            className={`flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-200 border border-[#283046] text-xs font-medium transition-colors ${
              collapsed ? 'px-0' : ''
            }`}
            title="Log Out"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
            {!collapsed && <span className="whitespace-nowrap">Log Out</span>}
          </button>

          {/* Desktop Toggle Collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center gap-1 py-1 text-slate-500 hover:text-slate-300 text-[10px] font-mono transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
            {!collapsed && <span>{collapsed ? 'Expand' : 'Collapse'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
