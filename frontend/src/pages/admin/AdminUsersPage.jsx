import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(15);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [onboardingFilter, setOnboardingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorAlert, setErrorAlert] = useState(null);
  const [successAlert, setSuccessAlert] = useState(null);

  // Role update state
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('ACCOUNT_HOLDER');

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, onboardingFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await adminService.getUsers({
        search,
        role: roleFilter,
        onboardingStatus: onboardingFilter,
        enabled: statusFilter,
        page,
        size
      });
      setUsers(res?.content || []);
      setTotalElements(res?.totalElements || 0);
      setTotalPages(res?.totalPages || 0);
    } catch (err) {
      setErrorAlert(err.message || 'Failed to retrieve users.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    loadUsers();
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.enabled;
    const actionLabel = newStatus ? 'activate' : 'deactivate';

    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${user.email}?`)) {
      return;
    }

    setActionLoadingId(user.id);
    setErrorAlert(null);
    setSuccessAlert(null);

    try {
      const updated = await adminService.updateUserStatus(user.id, newStatus);
      setUsers(users.map((u) => (u.id === user.id ? updated : u)));
      setSuccessAlert(`User ${user.email} successfully ${newStatus ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      setErrorAlert(err.message || `Failed to ${actionLabel} user.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRoleModal = (user) => {
    setRoleModalUser(user);
    setSelectedRole(user.role);
    setErrorAlert(null);
  };

  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    setActionLoadingId(roleModalUser.id);
    setErrorAlert(null);

    try {
      const updated = await adminService.updateUserRole(roleModalUser.id, selectedRole);
      setUsers(users.map((u) => (u.id === roleModalUser.id ? updated : u)));
      setSuccessAlert(`Role updated to ${selectedRole} for ${roleModalUser.email}.`);
      setRoleModalUser(null);
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      setErrorAlert(err.message || 'Failed to update user role.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161b29] border border-[#283046] p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              IDENTITY ACCESS MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Inspect registered identities, manage account status, and enforce server-side role boundaries.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {errorAlert && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-400">warning</span>
            <span>{errorAlert}</span>
          </div>
          <button onClick={() => setErrorAlert(null)} className="text-rose-400 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {successAlert && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400">check_circle</span>
            <span>{successAlert}</span>
          </div>
          <button onClick={() => setSuccessAlert(null)} className="text-emerald-400 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#161b29] border border-[#283046] p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by full name or corporate email..."
              className="w-full pl-9 pr-3 py-2 bg-[#0e1320] border border-[#283046] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ffb067]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#ffb067] text-[#2e1500] font-bold text-xs rounded-xl hover:bg-[#ffa04d] transition-colors whitespace-nowrap"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            className="bg-[#0e1320] border border-[#283046] text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#ffb067]"
          >
            <option value="">All Roles</option>
            <option value="ACCOUNT_HOLDER">Account Holder</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="AUDITOR">Auditor</option>
            <option value="DEMO_USER">Demo User</option>
          </select>

          {/* Onboarding Filter */}
          <select
            value={onboardingFilter}
            onChange={(e) => {
              setOnboardingFilter(e.target.value);
              setPage(0);
            }}
            className="bg-[#0e1320] border border-[#283046] text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#ffb067]"
          >
            <option value="">All Onboarding</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="bg-[#0e1320] border border-[#283046] text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#ffb067]"
          >
            <option value="">All Statuses</option>
            <option value="true">Active (Enabled)</option>
            <option value="false">Deactivated</option>
          </select>

          {(search || roleFilter || onboardingFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setOnboardingFilter('');
                setStatusFilter('');
                setPage(0);
              }}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white font-mono"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#161b29] border border-[#283046] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-3 border-b border-[#283046] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Total Records: {totalElements}</span>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading identities from vault database...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No users found matching current filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1320] text-slate-400 uppercase font-mono tracking-wider border-b border-[#283046]">
                <tr>
                  <th className="px-6 py-3">User & Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Onboarding</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Registered At</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283046]/50 text-slate-300">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isClearingSystem = u.email === 'system@arthivex.internal' || u.email === 'system@finguard.internal';
                  return (
                    <tr key={u.id} className="hover:bg-[#1a2133]/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          {u.name}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-500/30">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px] mt-0.5">{u.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded font-mono font-semibold text-[11px] ${
                            u.role === 'ADMINISTRATOR'
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                              : u.role === 'AUDITOR'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                              : u.role === 'DEMO_USER'
                              ? 'bg-amber-950/60 text-[#ffb067] border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            u.onboardingStatus === 'APPROVED'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : u.onboardingStatus === 'PENDING'
                              ? 'bg-amber-950/60 text-[#ffb067] border border-amber-500/30'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {u.onboardingStatus || 'APPROVED'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            u.enabled
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {u.enabled ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono text-slate-400 whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {!isClearingSystem && (
                          <div className="flex items-center justify-end gap-2">
                            {/* Role update button */}
                            {u.role !== 'DEMO_USER' && (
                              <button
                                onClick={() => handleOpenRoleModal(u)}
                                className="px-2.5 py-1 rounded-lg bg-[#20273a] hover:bg-[#283046] text-slate-300 border border-[#283046] text-xs font-mono transition-colors"
                                title="Change RBAC Role"
                              >
                                Role
                              </button>
                            )}

                            {/* Status toggle button */}
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={actionLoadingId === u.id}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                                u.enabled
                                  ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/30'
                                  : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {actionLoadingId === u.id ? '...' : u.enabled ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#283046] flex items-center justify-between text-xs font-mono">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-[#283046]"
            >
              ← Previous
            </button>
            <span className="text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-[#283046]"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#161b29] border border-[#283046] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Update User Role</h3>
            <p className="text-xs text-slate-400 mb-4">
              Modify the authoritative RBAC role for{' '}
              <span className="text-slate-200 font-mono">{roleModalUser.email}</span>.
            </p>

            <div className="space-y-3 mb-6">
              {[
                { id: 'ACCOUNT_HOLDER', name: 'Account Holder', desc: 'Standard client access with account and transfer capabilities.' },
                { id: 'ADMINISTRATOR', name: 'Administrator', desc: 'Full privileged access to platform administration, user management, and onboarding.' },
                { id: 'AUDITOR', name: 'Auditor', desc: 'Read-only compliance access to all ledger transactions and audit logs.' }
              ].map((roleOption) => (
                <label
                  key={roleOption.id}
                  onClick={() => setSelectedRole(roleOption.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === roleOption.id
                      ? 'bg-[#ffb067]/10 border-[#ffb067]/40 text-white'
                      : 'bg-[#0e1320] border-[#283046] text-slate-300 hover:bg-[#1a2133]'
                  }`}
                >
                  <input
                    type="radio"
                    name="roleSelection"
                    checked={selectedRole === roleOption.id}
                    onChange={() => setSelectedRole(roleOption.id)}
                    className="mt-0.5 accent-[#ffb067]"
                  />
                  <div>
                    <div className="font-semibold text-xs">{roleOption.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{roleOption.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-4 py-2 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={actionLoadingId === roleModalUser.id}
                className="px-4 py-2 rounded-xl bg-[#ffb067] hover:bg-[#ffa04d] text-[#2e1500] font-bold text-xs"
              >
                {actionLoadingId === roleModalUser.id ? 'Updating...' : 'Save Role Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

