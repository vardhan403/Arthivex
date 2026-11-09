import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

export default function AdminOnboardingPage() {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(15);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorAlert, setErrorAlert] = useState(null);
  const [successAlert, setSuccessAlert] = useState(null);

  // Rejection modal
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadOnboardingRequests();
  }, [activeTab, page]);

  const loadOnboardingRequests = async () => {
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await adminService.getOnboardingRequests({
        status: activeTab === 'ALL' ? '' : activeTab,
        page,
        size
      });
      setRequests(res?.content || []);
      setTotalElements(res?.totalElements || 0);
      setTotalPages(res?.totalPages || 0);
    } catch (err) {
      setErrorAlert(err.message || 'Failed to retrieve onboarding applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user) => {
    setActionLoadingId(user.id);
    setErrorAlert(null);
    setSuccessAlert(null);

    try {
      const updated = await adminService.approveOnboarding(user.id);
      setSuccessAlert(`Onboarding approved for ${user.email}.`);
      if (activeTab === 'PENDING') {
        setRequests(requests.filter((r) => r.id !== user.id));
        setTotalElements((prev) => Math.max(0, prev - 1));
      } else {
        setRequests(requests.map((r) => (r.id === user.id ? updated : r)));
      }
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      setErrorAlert(err.message || 'Failed to approve onboarding.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRejectModal = (user) => {
    setRejectingUser(user);
    setRejectReason('');
    setErrorAlert(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;
    setActionLoadingId(rejectingUser.id);
    setErrorAlert(null);

    try {
      const updated = await adminService.rejectOnboarding(rejectingUser.id, rejectReason);
      setSuccessAlert(`Onboarding rejected for ${rejectingUser.email}.`);
      if (activeTab === 'PENDING') {
        setRequests(requests.filter((r) => r.id !== rejectingUser.id));
        setTotalElements((prev) => Math.max(0, prev - 1));
      } else {
        setRequests(requests.map((r) => (r.id === rejectingUser.id ? updated : r)));
      }
      setRejectingUser(null);
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      setErrorAlert(err.message || 'Failed to reject onboarding.');
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-[#ffb067] border border-amber-500/20">
              ONBOARDING LIFECYCLE
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Onboarding Requests</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review applicant identities, transition account onboarding states, and enforce strict approval compliance.
          </p>
        </div>

        <button
          onClick={loadOnboardingRequests}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-300 border border-[#283046] text-sm font-medium transition-colors"
        >
          <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Refresh
        </button>
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#283046] pb-3">
        {[
          { id: 'PENDING', label: 'Pending Review' },
          { id: 'APPROVED', label: 'Approved Accounts' },
          { id: 'REJECTED', label: 'Rejected Applications' },
          { id: 'ALL', label: 'All Lifecycle Records' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(0);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[#ffb067] text-[#2e1500] shadow-md shadow-[#ffb067]/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#161b29]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications Table */}
      <div className="bg-[#161b29] border border-[#283046] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-3 border-b border-[#283046] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Total Applications: {totalElements}</span>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Querying onboarding registry...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-[#20273a] text-slate-500 mx-auto flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-2xl">check</span>
            </div>
            <p className="text-sm font-semibold text-white">No applications in this category</p>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'PENDING'
                ? 'All user registrations have been reviewed and processed.'
                : 'No accounts match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1320] text-slate-400 uppercase font-mono tracking-wider border-b border-[#283046]">
                <tr>
                  <th className="px-6 py-3">Applicant Name</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Applied On</th>
                  <th className="px-6 py-3">Lifecycle State</th>
                  <th className="px-6 py-3">Assigned Role</th>
                  <th className="px-6 py-3 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283046]/50 text-slate-300">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#1a2133]/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {r.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {r.email}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400 whitespace-nowrap">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                          r.onboardingStatus === 'APPROVED'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : r.onboardingStatus === 'PENDING'
                            ? 'bg-amber-950/60 text-[#ffb067] border border-amber-500/30'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {r.onboardingStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {r.role}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.onboardingStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleApprove(r)}
                            disabled={actionLoadingId === r.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            Approve
                          </button>
                        )}
                        {r.onboardingStatus !== 'REJECTED' && r.role !== 'ADMINISTRATOR' && (
                          <button
                            onClick={() => handleOpenRejectModal(r)}
                            disabled={actionLoadingId === r.id}
                            className="px-3 py-1.5 rounded-lg bg-[#20273a] hover:bg-rose-950/60 text-rose-400 border border-[#283046] hover:border-rose-500/30 text-xs font-mono transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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

      {/* Rejection Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#161b29] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl">person_cancel</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Reject Onboarding Application</h3>
            <p className="text-xs text-slate-400 mb-4">
              You are rejecting account approval for{' '}
              <span className="text-slate-200 font-mono">{rejectingUser.email}</span>. Please specify the compliance or business justification.
            </p>

            <div className="mb-6">
              <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                Rejection Reason (Audit Logged)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Identity documentation could not be verified or organization eligibility criteria not met..."
                rows={3}
                className="w-full p-3 bg-[#0e1320] border border-[#283046] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingUser(null)}
                className="px-4 py-2 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectingUser.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {actionLoadingId === rejectingUser.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

