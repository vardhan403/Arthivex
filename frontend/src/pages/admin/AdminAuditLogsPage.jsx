import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

export default function AdminAuditLogsPage() {
  const [events, setEvents] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(20);

  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorAlert, setErrorAlert] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    loadAuditTrail();
  }, [page, eventTypeFilter, statusFilter]);

  const loadAuditTrail = async () => {
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await adminService.getAuditTrail({
        eventType: eventTypeFilter,
        status: statusFilter,
        query: searchQuery,
        page,
        size
      });
      setEvents(res?.content || []);
      setTotalElements(res?.totalElements || 0);
      setTotalPages(res?.totalPages || 0);
    } catch (err) {
      setErrorAlert(err.message || 'Failed to retrieve immutable audit trail.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    loadAuditTrail();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161b29] border border-[#283046] p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              IMMUTABLE AUDIT TRAIL (T-20)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security & Financial Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">
            Cryptographically sealed, append-only operational events stored directly in PostgreSQL.
          </p>
        </div>

        <button
          onClick={loadAuditTrail}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-300 border border-[#283046] text-sm font-medium transition-colors"
        >
          <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Refresh Trail
        </button>
      </div>

      {errorAlert && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-400">error</span>
            <span>{errorAlert}</span>
          </div>
          <button onClick={() => setErrorAlert(null)} className="text-rose-400 hover:text-white">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by actor email, details, event type, or correlation ID..."
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
          {/* Event Type Filter */}
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              setPage(0);
            }}
            className="bg-[#0e1320] border border-[#283046] text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#ffb067]"
          >
            <option value="">All Event Types</option>
            <option value="ADMIN_BOOTSTRAPPED">ADMIN_BOOTSTRAPPED</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="USER_REGISTERED">USER_REGISTERED</option>
            <option value="USER_STATUS_CHANGED">USER_STATUS_CHANGED</option>
            <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
            <option value="USER_ONBOARDING_APPROVED">USER_ONBOARDING_APPROVED</option>
            <option value="USER_ONBOARDING_REJECTED">USER_ONBOARDING_REJECTED</option>
            <option value="ACCOUNT_CREATED">ACCOUNT_CREATED</option>
            <option value="TRANSACTION_CREATED">TRANSACTION_CREATED</option>
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
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>

          {(searchQuery || eventTypeFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setEventTypeFilter('');
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

      {/* Events Table */}
      <div className="bg-[#161b29] border border-[#283046] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-3 border-b border-[#283046] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Recorded Events: {totalElements}</span>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Querying immutable PostgreSQL audit log...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No audit events found matching the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1320] text-slate-400 uppercase font-mono tracking-wider border-b border-[#283046]">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Event Type</th>
                  <th className="px-6 py-3">Actor / Email</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Correlation ID</th>
                  <th className="px-6 py-3">Details</th>
                  <th className="px-6 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283046]/50 text-slate-300">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-[#1a2133]/60 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-[#20273a] border border-[#283046] text-[#ffb067]">
                        {e.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-300 truncate max-w-[170px]" title={e.actorEmail || e.actorId}>
                      {e.actorEmail || (e.actorId ? e.actorId.substring(0, 8) + '...' : 'SYSTEM')}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-400">
                      {e.targetType}
                      {e.targetId && (
                        <span className="text-[10px] text-slate-500 block">
                          {e.targetId.length > 12 ? e.targetId.substring(0, 12) + '...' : e.targetId}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          e.status === 'SUCCESS'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {e.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500 text-[11px]">
                      {e.correlationId || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 max-w-[240px] truncate" title={e.details}>
                      {e.details || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedEvent(e)}
                        className="px-2 py-1 rounded bg-[#20273a] hover:bg-[#283046] text-slate-300 text-[11px] font-mono border border-[#283046]"
                      >
                        Inspect
                      </button>
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

      {/* Event Details Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#161b29] border border-[#283046] rounded-2xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#283046] mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb067]">verified</span>
                <h3 className="text-base font-bold text-white">Audit Event Details</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono mb-6 bg-[#0e1320] p-4 rounded-xl border border-[#283046]">
              <div>
                <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Event ID</span>
                <span className="text-slate-300">{selectedEvent.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Event Type</span>
                  <span className="text-[#ffb067] font-bold">{selectedEvent.eventType}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Status</span>
                  <span className={selectedEvent.status === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {selectedEvent.status || 'SUCCESS'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Actor Email & UUID</span>
                <span className="text-slate-300">{selectedEvent.actorEmail || 'N/A'} ({selectedEvent.actorId || 'SYSTEM'})</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Target Type</span>
                  <span className="text-slate-300">{selectedEvent.targetType}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Target ID</span>
                  <span className="text-slate-300">{selectedEvent.targetId || 'N/A'}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Correlation ID</span>
                <span className="text-sky-400">{selectedEvent.correlationId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Timestamp</span>
                <span className="text-slate-300">{new Date(selectedEvent.createdAt).toISOString()}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Details</span>
                <p className="text-slate-200 mt-1 whitespace-pre-wrap font-sans text-xs bg-[#161b29] p-2 rounded border border-[#283046]">
                  {selectedEvent.details || 'No additional details.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-[#20273a] hover:bg-[#283046] text-slate-300 text-xs font-mono"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

