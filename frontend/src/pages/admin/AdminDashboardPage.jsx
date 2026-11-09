import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentAudit, setRecentAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, auditRes] = await Promise.all([
        adminService.getSummary(),
        adminService.getAuditTrail({ page: 0, size: 5 })
      ]);
      setSummary(sumRes);
      setRecentAudit(auditRes?.content || []);
    } catch (err) {
      setError(err.message || 'Failed to load administrator telemetry data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161b29] border border-[#283046] p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-[#ffb067] border border-amber-500/20">
              RESTRICTED CONSOLE
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {summary?.systemStatus || 'OPERATIONAL'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Administration & Oversight</h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative platform telemetry, identity access management, user onboarding lifecycle, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-300 border border-[#283046] text-sm font-medium transition-colors"
          >
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh Telemetry
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-rose-400">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Total Registered</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <span className="material-symbols-outlined text-lg">group</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-white font-mono">
              {loading ? '—' : summary?.totalUsers ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">{summary?.activeUsers ?? 0} active</span>
              <span>• Enabled accounts</span>
            </div>
          </div>
        </div>

        {/* Pending Onboarding */}
        <div className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Pending Onboarding</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-[#ffb067] border border-amber-500/20">
              <span className="material-symbols-outlined text-lg">pending_actions</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#ffb067] font-mono">
              {loading ? '—' : summary?.pendingOnboarding ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {summary?.pendingOnboarding > 0 ? (
                <Link to="/admin/onboarding" className="text-[#ffb067] hover:underline font-medium">
                  Review pending applications →
                </Link>
              ) : (
                'All applications processed'
              )}
            </div>
          </div>
        </div>

        {/* Total Accounts */}
        <div className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Ledger Accounts</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="material-symbols-outlined text-lg">account_balance</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-white font-mono">
              {loading ? '—' : summary?.totalAccounts ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Vault and clearing accounts
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Settled Transfers</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-white font-mono">
              {loading ? '—' : summary?.totalTransactions ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Double-entry verified
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/admin/users"
          className="bg-[#161b29] hover:bg-[#1a2133] border border-[#283046] hover:border-[#ffb067]/40 p-6 rounded-2xl transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#ffb067]/10 border border-[#ffb067]/30 text-[#ffb067] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">manage_accounts</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">User Management</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Search all users, inspect authorization roles, activate or deactivate identities, and update RBAC permissions.
            </p>
          </div>
          <div className="text-xs font-mono text-[#ffb067] mt-4 flex items-center gap-1 font-semibold">
            Manage Identities <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </Link>

        <Link
          to="/admin/onboarding"
          className="bg-[#161b29] hover:bg-[#1a2133] border border-[#283046] hover:border-[#ffb067]/40 p-6 rounded-2xl transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#ffb067] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">how_to_reg</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Onboarding Decisions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Process new account registrations through the formal approval lifecycle. Transition users between PENDING, APPROVED, and REJECTED states.
            </p>
          </div>
          <div className="text-xs font-mono text-[#ffb067] mt-4 flex items-center gap-1 font-semibold">
            Review Applications <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </Link>

        <Link
          to="/admin/audit"
          className="bg-[#161b29] hover:bg-[#1a2133] border border-[#283046] hover:border-[#ffb067]/40 p-6 rounded-2xl transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">history_edu</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Audit Trail & Security Logs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inspect the append-only cryptographic event log. Filter by event type, actor ID, status, and trace correlation IDs.
            </p>
          </div>
          <div className="text-xs font-mono text-sky-400 mt-4 flex items-center gap-1 font-semibold">
            Inspect Audit Logs <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </Link>
      </div>

      {/* Recent Audit Activity Table */}
      <div className="bg-[#161b29] border border-[#283046] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#283046] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Security & Administrative Events</h3>
            <p className="text-xs text-slate-400 mt-0.5">Live immutable stream from PostgreSQL audit log</p>
          </div>
          <Link
            to="/admin/audit"
            className="text-xs font-mono text-[#ffb067] hover:underline flex items-center gap-1"
          >
            View Complete Trail →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            Loading recent audit entries...
          </div>
        ) : recentAudit.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No audit events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1320] text-slate-400 uppercase font-mono tracking-wider border-b border-[#283046]">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Event Type</th>
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283046]/50 text-slate-300">
                {recentAudit.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#1a2133]/60 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded font-mono font-semibold bg-[#20273a] border border-[#283046] text-[#ffb067]">
                        {evt.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-300 truncate max-w-[180px]">
                      {evt.actorEmail || evt.actorId || 'SYSTEM'}
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-400">
                      {evt.targetType}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          evt.status === 'SUCCESS'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-400 max-w-[280px] truncate" title={evt.details}>
                      {evt.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

