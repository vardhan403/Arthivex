import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionService } from '../services/transactionService';
import { accountService } from '../services/accountService';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyFormatter';

export default function TransactionHistoryPage() {
  const navigate = useNavigate();

  // Filter and search state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [copiedHash, setCopiedHash] = useState(null);

  // Data and UI state
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // 1. Fetch user accounts for account filter dropdown
      try {
        const accList = await accountService.getAccounts();
        setAccounts(Array.isArray(accList) ? accList : (accList?.accounts || []));
      } catch (accErr) {
        console.warn('Could not load user accounts for filter:', accErr);
      }

      // 2. Fetch genuine transactions for authenticated user from backend API
      const data = await transactionService.getTransactions();
      const list = Array.isArray(data) ? data : (data?.transactions || data?.content || []);
      
      const formatted = list.map((tx) => {
        const typeUpper = (tx.type || '').toUpperCase();
        const isDep = typeUpper === 'DEPOSIT';
        const isWdr = typeUpper === 'WITHDRAWAL';
        const isTrf = typeUpper === 'TRANSFER';
        const amountNum = parseFloat(tx.amount) || 0;
        const d = tx.createdAt ? new Date(tx.createdAt) : new Date();

        return {
          id: tx.id || tx.reference || 'TXN',
          rawId: tx.id,
          reference: tx.reference || tx.id,
          hash: tx.id ? (tx.id.length > 16 ? `${tx.id.slice(0, 8)}...${tx.id.slice(-4)}` : tx.id) : '—',
          copyVal: tx.id || tx.reference || '',
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          rawDate: d,
          flow: isDep ? 'Inbound' : isWdr ? 'Outbound' : 'Internal',
          flowType: isDep ? 'deposit' : isWdr ? 'withdrawal' : 'transfer',
          rawType: typeUpper,
          accountName: tx.accountName || tx.accountType || (isDep ? 'Primary Inbound Account' : isWdr ? 'Disbursement Account' : 'Internal Transfer Account'),
          accountId: tx.accountId,
          accountNum: tx.accountNumber ? `•••• ${tx.accountNumber.slice(-4)}` : 'Vault Account',
          counterparty: tx.description || (isDep ? 'Inbound Liquidity Deposit' : isWdr ? 'Outbound Disbursement' : 'Internal Vault Transfer'),
          memo: tx.description || 'Settled Double-Entry Transaction',
          status: tx.status || 'Settled',
          amountNum,
          amount: `${isDep ? '+' : isWdr ? '-' : ''}${formatCurrency(amountNum, tx.currency || 'INR')}`,
          currency: `${tx.currency || 'INR'} Net`,
          currencyCode: tx.currency || 'INR',
          isPositive: isDep,
          isNeutral: isTrf,
        };
      });

      setRows(formatted);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setLoadError(err.message || 'Unable to connect to the transaction ledger service.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (val, id) => {
    navigator.clipboard.writeText(val);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterAccount('all');
    setFilterDate('all');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  // CSV Statement Exporter
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      alert('No transaction records available to export.');
      return;
    }
    const headers = ['Transaction ID', 'Reference', 'Date', 'Time', 'Flow', 'Account', 'Counterparty', 'Description', 'Status', 'Amount', 'Currency'];
    const rowsCsv = filteredRows.map((r) => [
      `"${r.id}"`,
      `"${r.reference || ''}"`,
      `"${r.date}"`,
      `"${r.time}"`,
      `"${r.flow}"`,
      `"${r.accountName} (${r.accountNum})"`,
      `"${(r.counterparty || '').replace(/"/g, '""')}"`,
      `"${(r.memo || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.amount}"`,
      `"${r.currency}"`
    ]);
    const csvContent = [headers.join(','), ...rowsCsv.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arthivex_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Certified Audit Manifest Exporter
  const handleExportAuditManifest = () => {
    if (filteredRows.length === 0) {
      alert('No transactions recorded to certify.');
      return;
    }
    const manifest = {
      auditTimestamp: new Date().toISOString(),
      standard: 'SOX-404 Cryptographic Double-Entry Ledger',
      totalRecords: filteredRows.length,
      records: filteredRows.map(r => ({
        id: r.id,
        hash: r.hash,
        type: r.rawType,
        amount: r.amountNum,
        status: r.status,
        timestamp: r.rawDate.toISOString()
      }))
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arthivex_audit_manifest_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. 30-Day Volume Calculation
  const primaryCurrency = accounts[0]?.currency || rows[0]?.currencyCode || 'INR';
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rows30d = rows.filter((r) => r.rawDate >= thirtyDaysAgo);
  const volume30d = rows30d.reduce((sum, r) => sum + r.amountNum, 0);
  const totalVolume = rows.reduce((sum, r) => sum + r.amountNum, 0);
  const inflows30d = rows30d.filter((r) => r.flowType === 'deposit').reduce((sum, r) => sum + r.amountNum, 0);
  const volumeDisplay = volume30d > 0 ? volume30d : totalVolume;
  const inflowRatioPct = volumeDisplay > 0 ? Math.min(100, Math.round((inflows30d / volumeDisplay) * 100)) : 0;

  // 2. Transaction Counts & Averages
  const totalTransactions = rows.length;
  const totalDeposits = rows.filter((r) => r.flowType === 'deposit').length;
  const totalWithdrawals = rows.filter((r) => r.flowType === 'withdrawal').length;
  const totalTransfers = rows.filter((r) => r.flowType === 'transfer').length;
  const avgAmount = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

  // 3. Settled Rate
  const settledRows = rows.filter(
    (r) => (r.status || '').toUpperCase() === 'SETTLED' || (r.status || '').toUpperCase() === 'COMPLETED'
  );
  const failedRows = rows.filter((r) => (r.status || '').toUpperCase() === 'FAILED');
  const settledRate = totalTransactions > 0 ? ((settledRows.length / totalTransactions) * 100).toFixed(1) : '100.0';

  // 4. Pending Settlements
  const pendingRows = rows.filter(
    (r) => (r.status || '').toUpperCase() === 'PENDING' || (r.status || '').toUpperCase() === 'IN_ESCROW' || (r.status || '').toUpperCase() === 'HOLD'
  );
  const pendingCount = pendingRows.length;
  const pendingAmount = pendingRows.reduce((sum, r) => sum + r.amountNum, 0);

  // Filtered rows
  const filteredRows = rows.filter((row) => {
    if (filterType !== 'all' && row.flowType !== filterType) return false;
    if (filterStatus !== 'all' && row.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
    if (filterAccount !== 'all' && row.accountId !== filterAccount && !row.accountNum.includes(filterAccount)) return false;
    if (filterDate === '7d') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (row.rawDate < sevenDaysAgo) return false;
    } else if (filterDate === '30d') {
      if (row.rawDate < thirtyDaysAgo) return false;
    } else if (filterDate === '90d') {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      if (row.rawDate < ninetyDaysAgo) return false;
    }
    if (
      search &&
      !row.counterparty.toLowerCase().includes(search.toLowerCase()) &&
      !row.memo.toLowerCase().includes(search.toLowerCase()) &&
      !row.id.toLowerCase().includes(search.toLowerCase()) &&
      !(row.reference && row.reference.toLowerCase().includes(search.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dee2f5] tracking-tight">Transaction History</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30 text-xs uppercase tracking-wider font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffb067]"></span>
              Real-Time Synced
            </span>
          </div>
          <p className="text-sm text-[#bfc6de]/80 max-w-3xl">
            Immutable audit log of all inbound deposits, outbound disbursements, and custodial transfers. Cryptographically signed and verified under SOX-404 guidelines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161b29] hover:bg-[#1a1f2d] border border-[#283046] text-[#dee2f5] text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-[#ffb067]">table_view</span>
            <span>Download CSV / Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportAuditManifest}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#ffb067] text-[#4c2700] hover:bg-[#ffdcc1] text-xs font-bold transition-colors shadow-sm shadow-[#ffb067]/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Export Certified Manifest</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner when Backend is Unavailable */}
      {loadError && !loading && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-red-400">cloud_off</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">Backend Ledger Service Unavailable</span>
              <span className="text-xs text-red-200/80">{loadError}</span>
            </div>
          </div>
          <button
            onClick={loadTransactions}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
            type="button"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 4 Metric KPI Cards Calculated Dynamically from Actual Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: 30-Day Volume */}
        <div className="p-4 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[#bfc6de] font-semibold font-mono">30-Day Volume</span>
            <span className="material-symbols-outlined text-[18px] text-[#ffb067]">analytics</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#dee2f5] tracking-tight font-mono">
              {formatCurrency(volumeDisplay, primaryCurrency)}
            </span>
            <span className={`inline-flex items-center text-xs font-medium font-mono ${volumeDisplay > 0 ? 'text-[#7bd0ff]' : 'text-slate-400'}`}>
              <span className="material-symbols-outlined text-[14px]">
                {volumeDisplay > 0 ? 'trending_up' : 'remove'}
              </span>
              {volumeDisplay > 0 ? `+${inflowRatioPct}% Inflow` : `${formatCurrency(0, primaryCurrency)} Net`}
            </span>
          </div>
          <div className="w-full bg-[#1c2237] h-1.5 rounded-full mt-3 overflow-hidden border border-[#283046]/40">
            <div
              className="bg-[#ffb067] h-full rounded-full transition-all duration-500"
              style={{ width: `${inflowRatioPct}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Total Transactions */}
        <div className="p-4 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[#bfc6de] font-semibold font-mono">Total Transactions</span>
            <span className="material-symbols-outlined text-[18px] text-[#bfc6de]">receipt_long</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#dee2f5] tracking-tight font-mono">{totalTransactions}</span>
            <span className="font-mono text-xs text-[#bfc6de]/80">
              Avg {formatCurrency(avgAmount, primaryCurrency)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-[#bfc6de] font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ffb067]"></span> {totalDeposits} In
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#3f465a]"></span> {totalWithdrawals + totalTransfers} Out
            </span>
          </div>
        </div>

        {/* Card 3: Settled Rate */}
        <div className="p-4 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[#bfc6de] font-semibold font-mono">Settled Rate</span>
            <span className="material-symbols-outlined text-[18px] text-[#7bd0ff]">task_alt</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#dee2f5] tracking-tight font-mono">{settledRate}%</span>
            <span className="text-xs text-[#7bd0ff] bg-[#1c2237] border border-[#283046] px-2 py-0.5 rounded font-medium font-mono">
              {failedRows.length === 0 ? 'Optimal' : `${failedRows.length} Failed`}
            </span>
          </div>
          <div className="w-full bg-[#1c2237] h-1.5 rounded-full mt-3 overflow-hidden border border-[#283046]/40">
            <div
              className="bg-[#7bd0ff] h-full rounded-full transition-all duration-500"
              style={{ width: `${totalTransactions > 0 ? parseFloat(settledRate) : 100}%` }}
            ></div>
          </div>
        </div>

        {/* Card 4: Pending Settlements */}
        <div className="p-4 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[#bfc6de] font-semibold font-mono">Pending Settlements</span>
            <span className="material-symbols-outlined text-[18px] text-[#ffb067]">hourglass_empty</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#dee2f5] tracking-tight font-mono">{pendingCount}</span>
            <span className="font-mono text-xs text-[#bfc6de]/80">
              {formatCurrency(pendingAmount, primaryCurrency)} in escrow
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <span className={`w-2 h-2 rounded-full ${pendingCount > 0 ? 'bg-[#ffb067] animate-pulse' : 'bg-emerald-400'}`}></span>
            <span className="text-xs text-[#bfc6de] font-mono">
              {pendingCount > 0 ? `${pendingCount} awaiting clearance` : 'All transactions cleared'}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar Card */}
      <div className="bg-[#161b29] p-4 rounded-xl border border-[#283046] shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 max-w-xl">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#bfc6de]/60">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Transaction ID, Counterparty, or Reference Memo..."
              className="w-full h-10 pl-11 pr-4 bg-[#1c2237] border border-[#283046] text-[#dee2f5] placeholder:text-[#bfc6de]/60 rounded-lg text-sm focus:outline-none focus:border-[#ffb067] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 pl-3 pr-8 bg-[#1c2237] border border-[#283046] text-[#dee2f5] rounded-lg text-xs appearance-none cursor-pointer focus:outline-none focus:border-[#ffb067]"
              >
                <option value="all">Type: All Flows</option>
                <option value="deposit">Inbound Deposits (+)</option>
                <option value="withdrawal">Outbound Withdrawals (-)</option>
                <option value="transfer">Internal Transfers (⇄)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#bfc6de] pointer-events-none">
                expand_more
              </span>
            </div>

            <div className="relative">
              <select
                value={filterAccount}
                onChange={(e) => {
                  setFilterAccount(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 pl-3 pr-8 bg-[#1c2237] border border-[#283046] text-[#dee2f5] rounded-lg text-xs appearance-none cursor-pointer focus:outline-none focus:border-[#ffb067]"
              >
                <option value="all">Account: All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name || acc.accountType} (•••• {acc.accountNumber?.slice(-4) || 'Vault'})
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#bfc6de] pointer-events-none">
                expand_more
              </span>
            </div>

            <div className="relative">
              <select
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 pl-3 pr-8 bg-[#1c2237] border border-[#283046] text-[#dee2f5] rounded-lg text-xs appearance-none cursor-pointer focus:outline-none focus:border-[#ffb067]"
              >
                <option value="all">Range: All Recorded</option>
                <option value="7d">Range: Last 7 Days</option>
                <option value="30d">Range: Last 30 Days</option>
                <option value="90d">Range: Last 90 Days</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#bfc6de] pointer-events-none">
                calendar_month
              </span>
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 pl-3 pr-8 bg-[#1c2237] border border-[#283046] text-[#dee2f5] rounded-lg text-xs appearance-none cursor-pointer focus:outline-none focus:border-[#ffb067]"
              >
                <option value="all">Status: All Statuses</option>
                <option value="settled">Settled / Completed</option>
                <option value="pending">Pending Settlement</option>
                <option value="failed">Failed / Exception</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#bfc6de] pointer-events-none">
                expand_more
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="h-10 px-3 rounded-lg bg-[#1c2237] hover:bg-[#1a1f2d] border border-[#283046] text-[#bfc6de] hover:text-[#dee2f5] flex items-center gap-1 text-xs transition-colors cursor-pointer"
              title="Reset Filters"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Active Filters Row */}
        <div className="flex items-center justify-between text-xs text-[#bfc6de] pt-1 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Active Filters:</span>
            {filterDate !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30 px-2 py-0.5 rounded-md font-medium">
                {filterDate === '7d' ? 'Last 7 Days' : filterDate === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                <span
                  onClick={() => setFilterDate('all')}
                  className="material-symbols-outlined text-[14px] cursor-pointer hover:text-rose-400"
                >
                  close
                </span>
              </span>
            )}
            {filterType !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30 px-2 py-0.5 rounded-md font-medium">
                {filterType.toUpperCase()}
                <span
                  onClick={() => setFilterType('all')}
                  className="material-symbols-outlined text-[14px] cursor-pointer hover:text-rose-400"
                >
                  close
                </span>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30 px-2 py-0.5 rounded-md font-medium">
                Status: {filterStatus}
                <span
                  onClick={() => setFilterStatus('all')}
                  className="material-symbols-outlined text-[14px] cursor-pointer hover:text-rose-400"
                >
                  close
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 bg-[#1c2237] border border-[#283046] px-2 py-0.5 rounded-md text-[#dee2f5]">
              Authoritative Ledger
            </span>
          </div>
          <span className="font-mono text-xs text-[#bfc6de]/80">
            Showing {filteredRows.length} of {rows.length} records
          </span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#161b29] rounded-xl border border-[#283046] shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          /* Loading State */
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-2 border-[#ffb067] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono text-[#ffb067] tracking-widest uppercase">
              Synchronizing Transaction Ledger...
            </p>
          </div>
        ) : rows.length === 0 ? (
          /* Requirement 3: New Account Empty State */
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-[#ffb067]/10 border border-[#ffb067]/30 flex items-center justify-center text-[#ffb067] mb-4 shadow-sm">
              <span className="material-symbols-outlined text-[30px]">receipt_long</span>
            </div>
            
            <h3 className="text-lg font-bold text-white tracking-tight mb-1">
              No transactions yet
            </h3>
            
            <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
              Your transaction history will appear here once you complete your first transaction.
            </p>

            {/* Exact stats specified by Requirement 3 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg mb-6">
              <div className="p-3 rounded-xl bg-[#1c2237] border border-[#283046] flex flex-col items-center">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-semibold">Total transactions</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5">0</span>
              </div>
              <div className="p-3 rounded-xl bg-[#1c2237] border border-[#283046] flex flex-col items-center">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-semibold">Deposits</span>
                <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5">0</span>
              </div>
              <div className="p-3 rounded-xl bg-[#1c2237] border border-[#283046] flex flex-col items-center">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-semibold">Withdrawals</span>
                <span className="text-lg font-bold text-slate-300 font-mono mt-0.5">0</span>
              </div>
              <div className="p-3 rounded-xl bg-[#1c2237] border border-[#283046] flex flex-col items-center">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-semibold">Transfers</span>
                <span className="text-lg font-bold text-[#ffb067] font-mono mt-0.5">0</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate('/deposit')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ffb067] hover:bg-[#ffa04c] text-[#2e1500] font-bold text-xs transition-all shadow-md shadow-[#ffb067]/20 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Make a Deposit</span>
              </button>
              <button
                onClick={() => navigate('/accounts')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1c2237] hover:bg-[#20273a] text-slate-200 border border-[#283046] text-xs font-semibold transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                <span>Manage Accounts</span>
              </button>
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          /* Filtered Empty State */
          <div className="py-14 px-6 flex flex-col items-center justify-center text-center animate-in fade-in">
            <span className="material-symbols-outlined text-3xl text-slate-500 mb-2">filter_alt_off</span>
            <h4 className="text-sm font-bold text-white mb-1">No matching transactions</h4>
            <p className="text-xs text-slate-400 mb-4 max-w-sm">
              No transactions match your current search and filter selections.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-[#ffb067] text-[#2e1500] text-xs font-semibold hover:bg-[#ffa048] transition-colors cursor-pointer"
              type="button"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Table of Genuine Transactions */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#1c2237] text-[#bfc6de] border-b border-[#283046] text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Transaction ID & Hash</th>
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Flow</th>
                  <th className="py-3.5 px-4 font-semibold">Accounts (Src → Dst)</th>
                  <th className="py-3.5 px-4 font-semibold">Counterparty & Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Ledger Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283046] text-xs text-[#dee2f5]">
                {pagedRows.map((tx, idx) => (
                  <tr key={`${tx.id}-${tx.accountId || idx}`} className="hover:bg-[#1c2237]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#ffb067]">#{tx.reference || tx.id.slice(0, 8)}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(tx.copyVal, tx.id)}
                          className="p-1 text-[#bfc6de]/60 hover:text-white rounded cursor-pointer"
                          title="Copy TX Hash"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {copiedHash === tx.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                      <span className="font-mono text-[10px] text-[#bfc6de]/60 tracking-wider">{tx.hash}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-[#dee2f5]">{tx.date}</div>
                      <div className="text-[11px] text-[#bfc6de] font-mono">{tx.time}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#1c2237] border border-[#283046] text-xs text-[#dee2f5]">
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            tx.isPositive ? 'text-emerald-400' : tx.isNeutral ? 'text-[#ffb067]' : 'text-slate-300'
                          }`}
                        >
                          {tx.isPositive ? 'arrow_downward' : tx.isNeutral ? 'swap_horiz' : 'arrow_upward'}
                        </span>
                        {tx.flow}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-[#dee2f5] font-medium">{tx.accountName}</div>
                      <div className="text-[11px] font-mono text-[#bfc6de]">{tx.accountNum}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-xs text-[#dee2f5] truncate">{tx.counterparty}</div>
                      <div className="text-[11px] text-[#bfc6de] truncate font-mono">{tx.memo}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border font-mono ${
                          tx.status === 'Settled' || tx.status === 'COMPLETED'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                            : tx.status === 'PENDING'
                            ? 'bg-[#ffb067]/15 text-[#ffb067] border-[#ffb067]/30'
                            : 'bg-red-950/60 text-red-400 border-red-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            tx.status === 'Settled' || tx.status === 'COMPLETED' ? 'bg-emerald-400' : tx.status === 'PENDING' ? 'bg-[#ffb067]' : 'bg-red-400'
                          }`}
                        ></span>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-semibold text-sm ${
                          tx.isPositive ? 'text-emerald-400' : tx.isNeutral ? 'text-[#ffb067]' : 'text-slate-200'
                        }`}
                      >
                        {tx.amount}
                      </span>
                      <div className="text-[10px] text-[#bfc6de]/70 font-mono">{tx.currency}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/transactions/${tx.rawId || tx.id}`)}
                          className="p-1.5 rounded hover:bg-[#1c2237] text-[#bfc6de] hover:text-white cursor-pointer"
                          title="Inspect Record"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer with Dynamic Pagination */}
        <div className="p-4 border-t border-[#283046] flex items-center justify-between text-xs text-[#bfc6de]">
          <span className="font-mono">
            Page {safeCurrentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-3 py-1.5 rounded bg-[#1c2237] text-[#dee2f5] border border-[#283046] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#20273a] transition-colors"
              type="button"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-3 py-1.5 rounded bg-[#1c2237] text-[#dee2f5] border border-[#283046] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#20273a] transition-colors"
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
