import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfileSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.name || user?.fullName || user?.username || (user?.email ? user.email.split('@')[0] : 'Account Holder');
  const userRole = user?.role ? user.role.replace(/_/g, ' ') : 'Account Holder';
  const vaultId = user?.id ? `FG-${user.id.slice(0, 8).toUpperCase()}` : 'FG-SESSION';

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'rails' | 'audit'
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessions, setSessions] = useState([
    {
      id: 'sess-1',
      client: 'Chrome v122 on macOS Sonoma',
      sub: 'MacBook Pro 16" (M3 Max) • VLT-NODE-04',
      ip: '127.0.0.1 (Localhost)',
      protocol: 'TLS 1.3 + JWT Session',
      status: 'Active Now',
      isCurrent: true,
    },
    {
      id: 'sess-2',
      client: 'Vault Terminal (Windows 11 Corp)',
      sub: 'Workstation Terminal • VLT-NODE-01',
      ip: '127.0.0.1 (Loopback)',
      protocol: 'HMAC-SHA256 Token',
      status: 'Idle (6m ago)',
      isCurrent: false,
    },
    {
      id: 'sess-3',
      client: 'Arthivex Mobile Client (iOS)',
      sub: 'Encrypted Key Signer App • AX-MOB-99',
      ip: '10.0.0.1 (Session Gateway)',
      protocol: 'Secure Enclave',
      status: 'Terminated',
      isCurrent: false,
      archived: true,
    },
  ]);

  const handleRevokeSession = (sessionId) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'Terminated', archived: true } : s))
    );
  };

  const handleConfirmSignOut = () => {
    setSessionModalOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1a1f2d] text-[#ffb067] text-xs font-semibold border border-[#283046]">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              FEDRAMP HIGH COMPLIANT
            </span>
            <span className="text-[#283046]">•</span>
            <span className="text-xs text-[#bfc6de] tracking-wider uppercase font-semibold">
              Node: US-EAST-VAULT-02
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dee2f5] tracking-tight">Profile & Security Settings</h1>
          <p className="text-sm text-[#bfc6de] mt-1">
            Manage authenticated user credentials, enterprise security policies, and custodial access controls.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => alert('Cryptographic attestation certificate exported.')}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-[#161b29] hover:bg-[#1a1f2d] border border-[#283046] text-[#dee2f5] text-xs font-semibold transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-[#bfc6de]">download</span>
            <span>Export Attestation</span>
          </button>
          <button
            type="button"
            onClick={() => setSessionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-[#ffb067] text-[#4c2700] hover:bg-[#ffdcc1] text-xs font-bold transition-colors shadow-sm shadow-[#ffb067]/20"
          >
            <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
            <span>End Authenticated Session</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Row */}
      <div className="w-full bg-[#161b29] p-1 rounded-xl flex flex-wrap gap-1 border border-[#283046]">
        {[
          { key: 'profile', label: 'User Profile & Identity', icon: 'badge' },
          { key: 'security', label: 'Security & Sessions', icon: 'security' },
          { key: 'rails', label: 'Connected Banking Rails', icon: 'account_balance' },
          { key: 'audit', label: 'Audit & Compliance Logs', icon: 'history_edu' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-[#1a1f2d] text-[#dee2f5] shadow-sm border border-[#283046]'
                : 'text-[#bfc6de] hover:text-white hover:bg-[#1a1f2d]/50'
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.key ? 'text-[#ffb067]' : 'text-[#bfc6de]'}`}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Grid: Left (8 cols) + Right (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* User Profile Card */}
          <div className="bg-[#161b29] rounded-xl p-6 sm:p-8 border border-[#283046] shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 bg-[#1a1f2d]/60 p-4 rounded-xl border border-[#283046]/60">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCp0RcW2D3UOgv7d5-rnF-d4tXEdSaUTMphaNlCcLsHDl9kS4aJCVd25nhsaAQkPKqcguxFzdTIoNJexPM1Ohn9fHr4gL-Lqi6DK-hzE8b3pZNTnwAtbyTqB5lsDhvkdkQrH4SLwNXyWDr6JW9ER3d1HnfPAENuHp-pKrkoXbFev6Hn6FaiNW-K4QdpRofPCeZ_ZXSf-DVGPbTNsV0PtJEOVTlAJNVALeh8cV2tXI1A"
                    alt="User Profile"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-sm ring-2 ring-[#ffb067]/40"
                  />
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#161b29] flex items-center justify-center">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-400"></span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold text-[#dee2f5]">{displayName}</span>
                    <span className="material-symbols-outlined text-[#ffb067] text-[20px]" title="Enterprise Authenticated Identity">
                      verified
                    </span>
                  </div>
                  <span className="text-xs text-[#bfc6de]">{userRole}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#252a38] text-[#dee2f5] font-mono">
                      ID: {vaultId}
                    </span>
                    <span className="text-[11px] text-[#bfc6de]">Double-Entry Ledger Verified</span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-1.5 self-stretch sm:self-auto justify-between">
                <span className="text-[11px] uppercase tracking-wider text-[#bfc6de] font-semibold">Attestation Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 font-semibold text-xs border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  VERIFIED
                </span>
              </div>
            </div>

            {/* Email and Org Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 p-4 bg-[#1a1f2d] border border-[#283046] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider text-[#bfc6de] font-semibold">Corporate Email</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#dee2f5] font-mono font-semibold">m.vance@arthivex-treasury.io</span>
                  <span className="material-symbols-outlined text-[18px] text-[#ffb067]">mark_email_read</span>
                </div>
                <span className="text-xs text-[#bfc6de]/80 mt-1">Bound to Arthivex Enterprise Identity Provider</span>
              </div>

              <div className="flex flex-col gap-1.5 p-4 bg-[#1a1f2d] border border-[#283046] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider text-[#bfc6de] font-semibold">Organization & Node</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#dee2f5] font-semibold">Arthivex Custodial Holdings LLC</span>
                  <span className="material-symbols-outlined text-[18px] text-[#bfc6de]">domain</span>
                </div>
                <span className="text-xs text-[#bfc6de]/80 mt-1 font-mono">Workstation ID: VLT-NODE-04</span>
              </div>
            </div>

            {/* Role & Security Permissions Card */}
            <div className="flex flex-col gap-3 p-4 bg-[#1a1f2d]/70 border border-[#283046] rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb067] text-[20px]">admin_panel_settings</span>
                  <span className="text-sm font-semibold text-[#dee2f5]">Role & Security Permissions</span>
                </div>
                <span className="text-xs font-mono text-[#ffb067] bg-[#ffb067]/15 border border-[#ffb067]/30 px-2 py-0.5 rounded font-semibold">
                  ROLE_TREASURY_ADMIN
                </span>
              </div>
              <p className="text-xs text-[#bfc6de] leading-relaxed">
                Spring Security v6.2 RBAC enforced across all cryptographic settlement rails and ledger modification controllers.
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#090e1b] border border-[#283046] text-[#dee2f5] text-xs font-medium">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">check_circle</span>
                  Full Ledger Access
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#090e1b] border border-[#283046] text-[#dee2f5] text-xs font-medium">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">groups</span>
                  Wire Sign-off Quorum (2-of-3)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#090e1b] border border-[#283046] text-[#dee2f5] text-xs font-medium">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">manage_accounts</span>
                  Account Management
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#090e1b] border border-[#283046] text-[#dee2f5] text-xs font-medium">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">lock_clock</span>
                  Emergency Freeze Override
                </span>
              </div>
            </div>
          </div>

          {/* Active Workstation Sessions Card */}
          <div className="bg-[#161b29] rounded-xl p-6 sm:p-8 border border-[#283046] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#283046]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb067] text-[22px]">laptop_mac</span>
                <div className="flex flex-col">
                  <h2 className="text-base font-semibold text-[#dee2f5] leading-tight">Active Workstation Sessions</h2>
                  <span className="text-xs text-[#bfc6de]">Authorized crypto-workstations connected with hardware token handshake</span>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-[#1a1f2d] text-[#ffb067] border border-[#283046] font-semibold">
                2 Active Nodes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#1a1f2d] text-[#bfc6de] text-xs font-semibold">
                    <th className="py-2.5 px-4 rounded-l">Workstation / Client</th>
                    <th className="py-2.5 px-4">Network Address</th>
                    <th className="py-2.5 px-4">Handshake Protocol</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 rounded-r text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#283046] text-xs text-[#dee2f5]">
                  {sessions.map((sess) => (
                    <tr
                      key={sess.id}
                      className={`hover:bg-[#1a1f2d]/50 transition-colors ${
                        sess.archived ? 'opacity-60 bg-[#090e1b]/40' : 'bg-[#161b29]'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#ffb067]">
                            {sess.isCurrent ? 'devices' : sess.archived ? 'phone_iphone' : 'desktop_windows'}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-[#dee2f5]">{sess.client}</span>
                            <span className="text-[10px] text-[#bfc6de]">{sess.sub}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">{sess.ip}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs text-[#bfc6de]">
                          <span className="material-symbols-outlined text-[14px] text-[#ffb067]">vpn_key</span>
                          {sess.protocol}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {sess.isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            Active Now
                          </span>
                        ) : sess.archived ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a1f2d] text-[#bfc6de]/60">
                            Terminated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a1f2d] text-[#dee2f5]">
                            Idle (6m ago)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {sess.isCurrent ? (
                          <span className="text-[11px] text-[#bfc6de] italic">Current Device</span>
                        ) : sess.archived ? (
                          <span className="text-[11px] text-[#bfc6de]/60">Archived</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(sess.id)}
                            className="text-xs text-rose-400 hover:underline font-semibold"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Security & Auth Policies */}
          <div className="bg-[#161b29] rounded-xl p-6 sm:p-8 border border-[#283046] shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#283046]">
              <span className="material-symbols-outlined text-[#ffb067] text-[22px]">enhanced_encryption</span>
              <h2 className="text-base font-semibold text-[#dee2f5]">Security & Auth Policies</h2>
            </div>

            <div className="flex flex-col gap-4">
              {/* Password Management */}
              <div className="p-4 rounded-xl bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[#bfc6de] font-semibold">Password Management</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#090e1b] border border-[#283046] text-[#dee2f5] text-[11px]">
                    Rotated 42d ago
                  </span>
                </div>
                <p className="text-xs text-[#bfc6de] mt-1">Enterprise Password last rotated 42 days ago.</p>
                <div className="mt-2 p-2 rounded bg-[#090e1b] text-[#bfc6de] text-[11px] flex items-start gap-1.5 border border-[#283046]">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067] shrink-0">info</span>
                  <span>Password change managed by Corporate Okta / SAML SSO in production deployment.</span>
                </div>
              </div>

              {/* Multi-Factor Authentication */}
              <div className="p-4 rounded-xl bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[#bfc6de] font-semibold">Multi-Factor Authentication</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[11px]">
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-[20px] text-[#ffb067]">usb</span>
                  <span className="text-sm font-semibold text-[#dee2f5]">FIDO2 / Hardware Security Key</span>
                </div>
                <span className="text-xs text-[#bfc6de]">YubiKey 5C Enterprise serial enrolled & verified.</span>
              </div>

              {/* Session Security & Inactivity */}
              <div className="p-4 rounded-xl bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[#bfc6de] font-semibold">Session Security & Inactivity</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[11px]">
                    ENABLED
                  </span>
                </div>
                <p className="text-xs text-[#dee2f5]">256-bit TLS Session with 15-minute inactivity auto-lockout.</p>
                <div className="w-full bg-[#090e1b] rounded-full h-1.5 mt-1 overflow-hidden border border-[#283046]">
                  <div className="bg-[#ffb067] h-full rounded-full" style={{ width: '78%' }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#bfc6de]">
                  <span>Idle timer: 03:22 remaining</span>
                  <span>Keep-alive ping OK</span>
                </div>
              </div>

              {/* IP Whitelisting */}
              <div className="p-4 rounded-xl bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[#bfc6de] font-semibold">IP Whitelisting</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ffb067]/15 text-[#ffb067] text-[11px] font-semibold">
                    ENFORCED
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-[#dee2f5]">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">lan</span>
                  Subnet: Authorized IP Gateway (Localhost / Enforced)
                </div>
                <span className="text-xs text-[#bfc6de]">Access rejected from non-institutional routing hops.</span>
              </div>
            </div>
          </div>

          {/* Future Enhancements (Roadmap Milestone) */}
          <div className="bg-[#161b29] rounded-xl p-6 sm:p-8 border border-[#283046] shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffb067] text-[22px]">rocket_launch</span>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-[#dee2f5]">Future Enhancements</h3>
                <span className="text-[10px] text-[#ffb067] font-semibold uppercase tracking-wider">Roadmap Milestone</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1a1f2d] border border-[#283046] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#dee2f5]">Upcoming Backend Capabilities (v3.0)</span>
                <span className="px-2 py-0.5 rounded bg-[#090e1b] text-[#bfc6de] border border-[#283046] text-[10px] font-mono font-semibold">
                  Q3 RELEASE
                </span>
              </div>
              <p className="text-xs text-[#bfc6de] leading-relaxed">
                OAuth2 OpenID Connect integration, biometric WebAuthn multi-custodian sign-offs, and multi-tenant ledger synchronization protocols.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#090e1b] border border-[#283046] text-[#dee2f5] text-[11px]">
                  <span className="material-symbols-outlined text-[13px] text-[#ffb067]">fingerprint</span>
                  WebAuthn
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#090e1b] border border-[#283046] text-[#dee2f5] text-[11px]">
                  <span className="material-symbols-outlined text-[13px] text-[#ffb067]">key</span>
                  OIDC 2.0
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#090e1b] border border-[#283046] text-[#dee2f5] text-[11px]">
                  <span className="material-symbols-outlined text-[13px] text-[#ffb067]">hub</span>
                  Cross-Vault Quorum
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminate Authenticated Session Modal */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#090e1b]/80 backdrop-blur-md transition-opacity"
            onClick={() => setSessionModalOpen(false)}
          ></div>
          <div className="relative bg-[#161b29] rounded-2xl max-w-lg w-full p-6 sm:p-8 border border-[#283046] shadow-2xl flex flex-col gap-6 z-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#93000a]/20 border border-[#ffb4ab]/40 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-rose-400 text-[24px]">warning</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-[#dee2f5]">Terminate Authenticated Session?</h3>
                <p className="text-xs text-[#bfc6de] mt-1 leading-relaxed">
                  Signing out will invalidate the active JWT session stored in memory for this workstation.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-[#bfc6de]">
                <span>Active Operator:</span>
                <span className="font-semibold text-[#dee2f5]">{displayName} (ID: {vaultId})</span>
              </div>
              <div className="flex justify-between text-[#bfc6de]">
                <span>Session Lifetime:</span>
                <span className="font-semibold text-[#dee2f5]">4h 18m elapsed</span>
              </div>
              <div className="flex justify-between text-[#bfc6de]">
                <span>Session Key Hash:</span>
                <span className="font-mono text-[11px] text-[#ffb067]">0x7F9B...88A2</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSessionModalOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-[#1a1f2d] hover:bg-[#252a38] border border-[#283046] text-[#dee2f5] text-xs font-semibold transition-colors"
              >
                Cancel & Retain Session
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="px-4 py-2.5 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold transition-colors shadow-md"
              >
                Sign Out & Invalidate Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
