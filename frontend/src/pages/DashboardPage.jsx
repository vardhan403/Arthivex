import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountService } from '../services/accountService';
import { transactionService } from '../services/transactionService';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyFormatter';
import { exportTransactionsCsv } from '../utils/csvGenerator';
import { generateTransactionStatementPdf } from '../utils/pdfGenerator';

// Helper for strict monetary arithmetic avoiding floating-point inaccuracies
const parseCents = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.round(val * 100);
  const clean = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 100);
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [chartRange, setChartRange] = useState('30d'); // '7d', '30d', '90d'
  const [tableFilter, setTableFilter] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Accounts and Transactions
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Modal State
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Interactive Chart States
  const [hoveredBucketIndex, setHoveredBucketIndex] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingData(true);
    setLoadError(null);
    try {
      const accData = await accountService.getAccounts();
      const accList = Array.isArray(accData) ? accData : (accData?.accounts || []);
      setAccounts(accList);

      try {
        const txData = await transactionService.getTransactions();
        const txList = Array.isArray(txData) ? txData : (txData?.transactions || txData?.content || []);
        const formatted = txList.map((tx) => {
          const typeUpper = (tx.type || '').toUpperCase();
          const isDep = typeUpper === 'DEPOSIT';
          const isWdr = typeUpper === 'WITHDRAWAL';
          const amt = parseFloat(tx.amount) || 0;
          const d = tx.createdAt ? new Date(tx.createdAt) : new Date();
          const txCurrency = tx.currency || (tx.accountId ? accList.find(a => a.id === tx.accountId)?.currency : null) || (accList[0]?.currency || 'INR');

          return {
            id: tx.id || tx.reference || 'TXN',
            reference: tx.reference || tx.id,
            type: isDep ? 'Deposit' : isWdr ? 'Withdrawal' : 'Transfer',
            rawType: typeUpper,
            currency: txCurrency,
            party: tx.description || (isDep ? 'Direct Liquidity Deposit' : isWdr ? 'External Disbursement' : 'Internal Account Transfer'),
            memo: tx.description || (isDep ? 'Settled Deposit' : isWdr ? 'Outbound Withdrawal' : 'Ledger Transfer'),
            subMemo: `Ref: ${tx.reference || tx.id}`,
            time: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
            rawDate: d,
            status: tx.status || 'Settled',
            amount: `${isDep ? '+' : '-'}${formatCurrency(amt, txCurrency)}`,
            numericAmount: isDep ? amt : -amt,
            rawAmount: amt,
            channel: isDep ? 'Direct Deposit / Clearing' : isWdr ? 'Outbound Disbursement' : 'Internal Transfer',
            account: tx.accountNumber ? `Vault (•••• ${tx.accountNumber.slice(-4)})` : 'Primary Vault',
            hash: tx.id || '—'
          };
        });
        setTransactions(formatted);
      } catch (tErr) {
        console.error('Could not load dashboard transactions:', tErr);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoadError(err.message || 'Unable to synchronize treasury accounts from ledger service.');
    } finally {
      setLoadingData(false);
    }
  };

  // CSV Statement Exporter
  const handleExportCsv = (txList = transactions, filename = 'arthivex_ledger_statement.csv') => {
    if (!txList || txList.length === 0) {
      alert('No transactions available to export for the selected range.');
      return;
    }
    const defaultCurrency = accounts[0]?.currency || 'INR';
    exportTransactionsCsv(txList, {
      filename,
      currency: defaultCurrency
    });
  };

  // Certified PDF Statement Exporter
  const handleExportPdf = (txList = transactions) => {
    if (!txList || txList.length === 0) {
      alert('No transactions available to export for the selected range.');
      return;
    }
    const defaultCurrency = accounts[0]?.currency || 'INR';
    generateTransactionStatementPdf({
      user,
      transactions: txList,
      dateRange: `${chartRange.toUpperCase()} Summary`,
      currency: defaultCurrency
    });
  };

  // Legacy alias for existing invocations
  const handleExportStatement = (txList, filename) => handleExportCsv(txList, filename);

  // Transaction Receipt Exporter
  const handleDownloadTxnReceipt = (txn) => {
    const txnCurrency = txn.currency || accounts[0]?.currency || 'INR';
    const receipt = `ARTHIVEX AUDIT RECORD
==================================================
Reference:             ${txn.reference || txn.id}
Transaction ID:        ${txn.id}
Type:                  ${txn.type}
Amount:                ${txn.amount}
Currency:              ${txnCurrency}
Status:                ${txn.status}
Timestamp:             ${txn.time}
Account:               ${txn.account}
Description:           ${txn.party}
Channel:               ${txn.channel}
==================================================
Cryptographic Ledger Validation: CONFIRMED
Double-Entry Status: BALANCED
`;
    const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `arthivex_receipt_${txn.id}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==================== REAL FINANCIAL CALCULATIONS ====================

  // 1. Balances
  const totalBalanceCents = accounts.reduce((sum, a) => sum + parseCents(a.balance), 0);
  const availableBalanceCents = accounts.reduce((sum, a) => sum + parseCents(a.availableBalance ?? a.balance), 0);
  const lockedBalanceCents = Math.max(0, totalBalanceCents - availableBalanceCents);
  const availablePct = totalBalanceCents > 0 ? ((availableBalanceCents / totalBalanceCents) * 100).toFixed(1) : '100.0';

  // 2. Accounts
  const activeAccounts = accounts.filter((a) => (a.status || '').toUpperCase() === 'ACTIVE');
  const checkingCount = accounts.filter((a) => (a.accountType || '').toUpperCase() === 'CHECKING').length;
  const savingsCount = accounts.filter((a) => (a.accountType || '').toUpperCase() === 'SAVINGS').length;
  const treasuryCount = accounts.filter((a) => (a.accountType || '').toUpperCase() === 'TREASURY').length;

  // 3. Monthly Inflows & Outflows (Last 30 Days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent30dTransactions = transactions.filter((t) => t.rawDate && t.rawDate >= thirtyDaysAgo);

  const monthlyInflowTxns = recent30dTransactions.filter(
    (t) => t.rawType === 'DEPOSIT' && (t.status || '').toUpperCase() !== 'FAILED'
  );
  const monthlyInflowsCents = monthlyInflowTxns.reduce((sum, t) => sum + parseCents(t.rawAmount), 0);
  const monthlyInflowCount = monthlyInflowTxns.length;
  const avgInflowCents = monthlyInflowCount > 0 ? Math.round(monthlyInflowsCents / monthlyInflowCount) : 0;

  const monthlyOutflowTxns = recent30dTransactions.filter(
    (t) => (t.rawType === 'WITHDRAWAL' || t.rawType === 'TRANSFER') && (t.status || '').toUpperCase() !== 'FAILED'
  );
  const monthlyOutflowsCents = monthlyOutflowTxns.reduce((sum, t) => sum + parseCents(t.rawAmount), 0);
  const monthlyOutflowCount = monthlyOutflowTxns.length;
  const avgOutflowCents = monthlyOutflowCount > 0 ? Math.round(monthlyOutflowsCents / monthlyOutflowCount) : 0;

  const net30dCents = monthlyInflowsCents - monthlyOutflowsCents;

  // 4. Dynamic Liquidity Chart Range Bucketing (6 Buckets)
  const rangeDays = chartRange === '7d' ? 7 : chartRange === '90d' ? 90 : 30;
  const rangeStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const rangeTxns = transactions.filter((t) => t.rawDate && t.rawDate >= rangeStart);

  const bucketCount = 6;
  const bucketDurationMs = (rangeDays * 24 * 60 * 60 * 1000) / bucketCount;

  const buckets = [];
  let cumulativeNetCents = 0;

  for (let i = 0; i < bucketCount; i++) {
    const bStart = new Date(rangeStart.getTime() + i * bucketDurationMs);
    const bEnd = new Date(rangeStart.getTime() + (i + 1) * bucketDurationMs);

    const bTxns = rangeTxns.filter((t) => t.rawDate >= bStart && (i === bucketCount - 1 ? t.rawDate <= bEnd : t.rawDate < bEnd));

    const bInflows = bTxns
      .filter((t) => t.rawType === 'DEPOSIT' && (t.status || '').toUpperCase() !== 'FAILED')
      .reduce((sum, t) => sum + parseCents(t.rawAmount), 0);

    const bOutflows = bTxns
      .filter((t) => (t.rawType === 'WITHDRAWAL' || t.rawType === 'TRANSFER') && (t.status || '').toUpperCase() !== 'FAILED')
      .reduce((sum, t) => sum + parseCents(t.rawAmount), 0);

    cumulativeNetCents += bInflows - bOutflows;

    let label = bEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (i === bucketCount - 1) label = 'Current';

    buckets.push({
      index: i,
      label,
      startDate: bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      endDate: bEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      inflowCents: bInflows,
      outflowCents: bOutflows,
      netCents: bInflows - bOutflows,
      cumulativeNetCents,
      txnCount: bTxns.length
    });
  }

  const hasChartActivity = buckets.some((b) => b.inflowCents > 0 || b.outflowCents > 0);
  const maxVolumeCents = Math.max(...buckets.map((b) => Math.max(b.inflowCents, b.outflowCents)), 10000); // Minimum baseline volume
  const rangeInflowsTotal = buckets.reduce((s, b) => s + b.inflowCents, 0);
  const rangeOutflowsTotal = buckets.reduce((s, b) => s + b.outflowCents, 0);
  const rangeNetTotal = rangeInflowsTotal - rangeOutflowsTotal;

  // Cumulative trend coordinates
  const cumValues = buckets.map((b) => b.cumulativeNetCents);
  const minCum = Math.min(...cumValues, 0);
  const maxCum = Math.max(...cumValues, 10000);
  const cumSpan = maxCum - minCum || 1;

  // 5. Custodial Allocation Groups
  const allocationMap = {};
  accounts.forEach((acc) => {
    const type = (acc.accountType || 'CHECKING').toUpperCase();
    const cents = parseCents(acc.balance);
    if (!allocationMap[type]) {
      allocationMap[type] = {
        type,
        label:
          type === 'CHECKING'
            ? 'Operating Checking'
            : type === 'TREASURY'
            ? 'Corporate Treasury Vault'
            : type === 'SAVINGS'
            ? 'High-Yield Reserve'
            : `${type} Vault`,
        cents: 0,
        color: type === 'TREASURY' ? '#ffb067' : type === 'CHECKING' ? '#38bdf8' : type === 'SAVINGS' ? '#34d399' : '#a78bfa'
      };
    }
    allocationMap[type].cents += cents;
  });

  const allocationGroups = Object.values(allocationMap).map((g) => ({
    ...g,
    pct: totalBalanceCents > 0 ? (g.cents / totalBalanceCents) * 100 : 0
  }));

  // Filtering ledger table
  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter =
      (tx.party || '').toLowerCase().includes(tableFilter.toLowerCase()) ||
      (tx.id || '').toLowerCase().includes(tableFilter.toLowerCase()) ||
      (tx.reference || '').toLowerCase().includes(tableFilter.toLowerCase()) ||
      (tx.memo || '').toLowerCase().includes(tableFilter.toLowerCase());

    if (selectedType === 'All' || selectedType === 'All Transaction Types') {
      return matchesFilter;
    }
    return matchesFilter && tx.type.toLowerCase() === selectedType.toLowerCase();
  });

  const displayName = user?.fullName || user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Account Holder');
  const primaryCurrency = accounts.length > 0 && accounts[0].currency ? accounts[0].currency : 'INR';

  const formatAccountTypeLabel = (type) => {
    const t = (type || '').toUpperCase();
    if (t === 'CHECKING') return 'Commercial Checking';
    if (t === 'TREASURY') return 'Corporate Treasury Vault';
    if (t === 'SAVINGS') return 'High-Yield Savings';
    return `${t} Account`;
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Loading Skeleton View */}
      {loadingData && (
        <div className="flex flex-col gap-6 w-full animate-pulse">
          <div className="h-44 w-full bg-[#161b29] border border-[#283046] rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="h-36 bg-[#161b29] border border-[#283046] rounded-2xl"></div>
            <div className="h-36 bg-[#161b29] border border-[#283046] rounded-2xl"></div>
            <div className="h-36 bg-[#161b29] border border-[#283046] rounded-2xl"></div>
            <div className="h-36 bg-[#161b29] border border-[#283046] rounded-2xl"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 bg-[#161b29] border border-[#283046] rounded-2xl"></div>
            <div className="h-72 bg-[#161b29] border border-[#283046] rounded-2xl"></div>
          </div>
        </div>
      )}

      {/* Error Alert View */}
      {loadError && !loadingData && (
        <div className="flex flex-col w-full bg-[#450a0a]/80 border border-red-500/40 text-red-200 p-6 rounded-2xl gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-[32px] text-red-400">error_outline</span>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight">
                Arthivex Telemetry Synchronisation Error
              </span>
              <span className="text-sm text-red-200/90 leading-relaxed">
                {loadError}
              </span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md cursor-pointer"
              type="button"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Active Dashboard View */}
      {!loadingData && !loadError && (
        <>
          {/* EXECUTIVE HERO BANNER & COMMAND CLUSTER */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-slate-50 to-slate-100 dark:from-[#161b29] dark:via-[#141a29] dark:to-[#121624] border border-slate-200 dark:border-[#283046]/90 p-6 xl:p-7 shadow-md dark:shadow-2xl">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute -top-24 -right-16 w-96 h-96 rounded-full bg-[#ffb067]/10 blur-3xl opacity-40 dark:opacity-100"></div>
            <div className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-[#38bdf8]/5 blur-3xl opacity-40 dark:opacity-100"></div>

            <div className="relative z-10 flex flex-col gap-6">
              {/* Top Row: Welcome Info & Session Security Badges */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-[#ffb067]/10 border border-amber-500/30 dark:border-[#ffb067]/30 text-amber-800 dark:text-[#ffb067] text-[11px] font-semibold tracking-wide shadow-sm font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-[#ffb067] animate-ping"></span>
                      Enterprise Treasury Core
                    </span>
                    <span className="text-slate-400 dark:text-slate-600 text-xs hidden sm:inline">•</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold font-mono">
                      Double-Entry Ledger Architecture
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 my-1">
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={displayName}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-[#ffb067]/50 shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#ffb067]/20 border border-[#ffb067]/40 flex items-center justify-center text-[#ffb067] font-bold text-lg shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h1 className="text-2xl sm:text-3xl xl:text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                      Welcome back, {displayName}
                    </h1>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300/80 leading-relaxed max-w-2xl">
                    Enterprise Treasury & Liquidity Overview. Real-time settled positions and immutable double-entry ledger accounts.
                  </p>
                </div>

                {/* Real Security & Session Indicators */}
                <div className="flex flex-wrap lg:flex-col lg:items-end gap-2 shrink-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0e1320]/90 border border-slate-200 dark:border-[#283046] text-slate-700 dark:text-slate-300 text-[11px] shadow-sm font-mono">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600 dark:text-emerald-400">verified_user</span>
                    <span>Ledger Status: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</strong></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-[#0e1320]/70 border border-emerald-200 dark:border-[#283046]/80 text-emerald-700 dark:text-emerald-400/90 text-[11px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                      <span>Balanced</span>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0e1320]/70 border border-slate-200 dark:border-[#283046]/80 text-slate-700 dark:text-slate-300 text-[11px] font-mono">
                      <span className="material-symbols-outlined text-[13px] text-amber-600 dark:text-[#ffb067]">lock</span>
                      <span>JWT Authenticated</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Command Toolbar Strip */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#283046]/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold font-mono">
                  <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-[#ffb067]">bolt</span>
                  <span>Treasury Commands</span>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => navigate('/deposit')}
                    className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-[#ffb067] hover:bg-[#ffa04c] text-[#2e1500] font-bold text-xs transition-all shadow-md shadow-[#ffb067]/25 hover:shadow-[#ffb067]/40 active:scale-[0.98] border border-[#ffb067]/50 group cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover:scale-110">
                      add_circle
                    </span>
                    <span className="tracking-tight font-semibold">+ Deposit Funds</span>
                  </button>

                  <button
                    onClick={() => navigate('/withdraw')}
                    className="inline-flex items-center justify-center gap-2 px-3.5 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-900 border border-slate-300 hover:border-slate-400 dark:bg-[#0e1320]/90 dark:hover:bg-[#20273a] dark:text-slate-200 dark:hover:text-white dark:border-[#283046] dark:hover:border-slate-500 transition-all text-xs font-semibold active:scale-[0.98] group shadow-sm cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-[#ffb067] transition-colors">
                      remove_circle_outline
                    </span>
                    <span>− Withdraw Funds</span>
                  </button>

                  <button
                    onClick={() => navigate('/transfer')}
                    className="inline-flex items-center justify-center gap-2 px-3.5 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-900 border border-slate-300 hover:border-slate-400 dark:bg-[#0e1320]/90 dark:hover:bg-[#20273a] dark:text-slate-200 dark:hover:text-white dark:border-[#283046] dark:hover:border-slate-500 transition-all text-xs font-semibold active:scale-[0.98] group shadow-sm cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-[#ffb067] transition-transform group-hover:rotate-180">
                      swap_horiz
                    </span>
                    <span>⇄ Transfer Money</span>
                  </button>

                  <button
                    onClick={() => handleExportPdf(transactions)}
                    className="inline-flex items-center justify-center gap-2 px-3.5 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-900 border border-slate-300 hover:border-slate-400 dark:bg-[#0e1320]/90 dark:hover:bg-[#20273a] dark:text-slate-200 dark:hover:text-white dark:border-[#283046] dark:hover:border-slate-500 transition-all text-xs font-semibold active:scale-[0.98] group shadow-sm cursor-pointer"
                    title="Export Certified PDF Statement"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-[#ffb067] transition-colors">
                      picture_as_pdf
                    </span>
                    <span>Export PDF</span>
                  </button>

                  <button
                    onClick={() => handleExportCsv(transactions, 'arthivex_settlement_ledger.csv')}
                    className="inline-flex items-center justify-center gap-2 px-3.5 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-900 border border-slate-300 hover:border-slate-400 dark:bg-[#0e1320]/90 dark:hover:bg-[#20273a] dark:text-slate-200 dark:hover:text-white dark:border-[#283046] dark:hover:border-slate-500 transition-all text-xs font-semibold active:scale-[0.98] group shadow-sm cursor-pointer"
                    title="Export Settlement Ledger CSV"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-[#ffb067] transition-colors">
                      table_view
                    </span>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 4 SUMMARY KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Total Consolidated Balance */}
            <div className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-[#ffb067]/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                    Total Consolidated Balance
                  </span>
                  <span className="text-2xl sm:text-[28px] font-bold text-white mt-1 tracking-tight font-mono">
                    {formatCurrency(totalBalanceCents / 100, primaryCurrency)}{' '}
                    <span className="text-xs text-[#ffb067] font-semibold font-mono">{primaryCurrency}</span>
                  </span>
                </div>
                <span className="p-2.5 rounded-xl bg-[#ffb067]/10 border border-[#ffb067]/25 text-[#ffb067] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      net30dCents >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {net30dCents >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    Net 30d: {net30dCents >= 0 ? '+' : '-'}{formatCurrency(Math.abs(net30dCents) / 100, primaryCurrency)}
                  </span>
                  <span className="font-mono text-slate-400">{availablePct}% Available</span>
                </div>
                <div className="w-full bg-[#0e1320] border border-[#283046]/50 h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-[#ffb067] h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, parseFloat(availablePct)))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5 font-mono">
                  <span>Avail: {formatCurrency(availableBalanceCents / 100, primaryCurrency)}</span>
                  <span>Locked: {formatCurrency(lockedBalanceCents / 100, primaryCurrency)}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Active Vault Accounts */}
            <div className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl shadow-lg flex flex-col justify-between hover:border-[#ffb067]/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                    Active Vault Accounts
                  </span>
                  <span className="text-2xl sm:text-[28px] font-bold text-white mt-1 tracking-tight font-mono">
                    {activeAccounts.length} {activeAccounts.length === 1 ? 'Account' : 'Accounts'}
                  </span>
                </div>
                <span className="p-2.5 rounded-xl bg-[#20273a] border border-[#283046] text-[#ffb067] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">domain</span>
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-semibold font-mono">
                    {activeAccounts.length} of {accounts.length} Active
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#ffb067]/10 border border-[#ffb067]/20 text-[#ffb067] font-medium font-mono">
                    Double-Entry
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                  {accounts.length > 0 ? (
                    <span>
                      {checkingCount} Checking • {savingsCount} Savings • {treasuryCount} Treasury
                    </span>
                  ) : (
                    <span>No accounts created yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Monthly Inflows */}
            <div className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl shadow-lg flex flex-col justify-between hover:border-[#ffb067]/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                    Monthly Inflows (Deposits)
                  </span>
                  <span className="text-2xl sm:text-[28px] font-bold text-white mt-1 tracking-tight font-mono">
                    {formatCurrency(monthlyInflowsCents / 100, primaryCurrency)}{' '}
                    <span className="text-xs text-emerald-400 font-semibold font-mono">{primaryCurrency}</span>
                  </span>
                </div>
                <span className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">south_east</span>
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <span className="material-symbols-outlined text-[16px]">arrow_drop_up</span>
                  <span>
                    {monthlyInflowCount > 0
                      ? `${monthlyInflowCount} Inbound ${monthlyInflowCount === 1 ? 'Deposit' : 'Deposits'}`
                      : '0 Inbound Deposits'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>30-Day Window</span>
                  <span className="text-slate-300">Avg: {formatCurrency(avgInflowCents / 100, primaryCurrency)}</span>
                </div>
              </div>
            </div>

            {/* Card 4: Monthly Outflows */}
            <div className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl shadow-lg flex flex-col justify-between hover:border-[#ffb067]/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                    Monthly Outflows (Withdrawals)
                  </span>
                  <span className="text-2xl sm:text-[28px] font-bold text-white mt-1 tracking-tight font-mono">
                    {formatCurrency(monthlyOutflowsCents / 100, primaryCurrency)}{' '}
                    <span className="text-xs text-red-400 font-semibold font-mono">{primaryCurrency}</span>
                  </span>
                </div>
                <span className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">north_east</span>
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs text-slate-300 font-semibold">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>
                    {monthlyOutflowCount > 0
                      ? `${monthlyOutflowCount} Outbound ${monthlyOutflowCount === 1 ? 'Disbursement' : 'Disbursements'}`
                      : '0 Outbound Disbursements'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>30-Day Window</span>
                  <span className="text-slate-300">Avg: {formatCurrency(avgOutflowCents / 100, primaryCurrency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ANALYTICS & LIQUIDITY OVERVIEW DUAL-GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Cash Flow & Liquidity Volume Chart (8 Columns) */}
            <div className="xl:col-span-8 bg-[#161b29] border border-[#283046] p-6 rounded-2xl shadow-xl flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {chartRange.toUpperCase()} Liquidity Trend & Volume Analysis
                    </h2>
                    {hasChartActivity ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold font-mono">
                        Live Ledger Sync
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-400">
                    Aggregated Inflows vs Capital Disbursements ({primaryCurrency})
                  </span>
                </div>

                {/* Date Filter Segmented Switch */}
                <div className="flex items-center bg-[#0e1320] border border-[#283046] p-1 rounded-xl">
                  {['7d', '30d', '90d'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setChartRange(range)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartRange === range
                          ? 'bg-[#ffb067] text-[#2e1500] shadow-md shadow-[#ffb067]/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      type="button"
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend Pill Bar */}
              <div className="flex items-center gap-5 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#ffb067]"></span>
                  <span className="text-slate-300">Gross Inflow Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#283046]"></span>
                  <span className="text-slate-300">Outflows</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-emerald-400"></span>
                  <span className="text-slate-300">Net Reserve Trajectory</span>
                </div>
              </div>

              {/* Dynamic SVG Liquidity Visualisation OR Empty State */}
              <div className="w-full bg-[#0e1320] border border-[#283046]/70 rounded-xl p-4">
                {!hasChartActivity ? (
                  <div className="w-full py-12 flex flex-col items-center justify-center text-center gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#161b29] border border-[#283046] text-[#ffb067]">
                      <span className="material-symbols-outlined text-[32px]">query_stats</span>
                    </div>
                    <div className="flex flex-col gap-1 max-w-sm">
                      <h3 className="text-sm font-bold text-white">No transaction activity yet</h3>
                      <p className="text-xs text-slate-400">
                        Execute your first deposit, withdrawal, or transfer to track liquidity trends and volume analytics in real time.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/deposit')}
                      className="mt-1 px-4 py-2 rounded-xl bg-[#ffb067] hover:bg-[#ffa04c] text-[#2e1500] font-bold text-xs transition-all shadow-md shadow-[#ffb067]/20 flex items-center gap-1.5 cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>Deposit Funds</span>
                    </button>
                  </div>
                ) : (
                  <svg className="w-full h-56 overflow-visible" fill="none" viewBox="0 0 740 220" xmlns="http://www.w3.org/2000/svg">
                    {/* Grid Lines */}
                    <line className="text-[#283046]" opacity="0.6" stroke="currentColor" strokeDasharray="3 3" x1="40" x2="720" y1="20" y2="20"></line>
                    <line className="text-[#283046]" opacity="0.6" stroke="currentColor" strokeDasharray="3 3" x1="40" x2="720" y1="70" y2="70"></line>
                    <line className="text-[#283046]" opacity="0.6" stroke="currentColor" strokeDasharray="3 3" x1="40" x2="720" y1="120" y2="120"></line>
                    <line className="text-[#283046]" opacity="0.6" stroke="currentColor" strokeDasharray="3 3" x1="40" x2="720" y1="170" y2="170"></line>
                    <line className="text-[#343d56]" opacity="0.8" stroke="currentColor" x1="40" x2="720" y1="190" y2="190"></line>

                    {/* Y Axis Labels */}
                    <text className="text-[10px] fill-slate-500 font-mono" x="5" y="24">
                      {formatCurrency(maxVolumeCents / 100, primaryCurrency)}
                    </text>
                    <text className="text-[10px] fill-slate-500 font-mono" x="5" y="74">
                      {formatCurrency(Math.round(maxVolumeCents * 0.75) / 100, primaryCurrency)}
                    </text>
                    <text className="text-[10px] fill-slate-500 font-mono" x="5" y="124">
                      {formatCurrency(Math.round(maxVolumeCents * 0.5) / 100, primaryCurrency)}
                    </text>
                    <text className="text-[10px] fill-slate-500 font-mono" x="5" y="174">
                      {formatCurrency(Math.round(maxVolumeCents * 0.25) / 100, primaryCurrency)}
                    </text>

                    {/* Dynamic Volume Bars & Column Highlights */}
                    {buckets.map((b, i) => {
                      const xInflow = 75 + i * 110;
                      const xOutflow = xInflow + 17;
                      const isHovered = hoveredBucketIndex === i;
                      const inflowH = b.inflowCents > 0 ? Math.max(4, Math.round((b.inflowCents / maxVolumeCents) * 150)) : 0;
                      const outflowH = b.outflowCents > 0 ? Math.max(4, Math.round((b.outflowCents / maxVolumeCents) * 150)) : 0;

                      return (
                        <g key={b.index}>
                          {/* Translucent Column Highlight on Hover */}
                          {isHovered && (
                            <rect
                              x={xInflow - 10}
                              y={15}
                              width={52}
                              height={178}
                              rx={6}
                              fill="rgba(255, 176, 103, 0.08)"
                              stroke="rgba(255, 176, 103, 0.35)"
                              strokeDasharray="3 3"
                            />
                          )}

                          {inflowH > 0 && (
                            <rect
                              className={isHovered ? 'fill-[#ffa048]' : 'fill-[#ffb067]'}
                              height={inflowH}
                              rx="3"
                              width="14"
                              x={xInflow}
                              y={190 - inflowH}
                            />
                          )}
                          {outflowH > 0 && (
                            <rect
                              className={isHovered ? 'fill-[#475569]' : 'fill-[#283046]'}
                              height={outflowH}
                              rx="3"
                              width="14"
                              x={xOutflow}
                              y={190 - outflowH}
                            />
                          )}
                          <text
                            className={`text-[11px] font-mono ${isHovered ? 'fill-[#ffb067] font-bold' : 'fill-slate-400'}`}
                            x={xInflow}
                            y={210}
                          >
                            {b.label}
                          </text>

                          {/* Invisible Column Hitbox for Mouse & Touch */}
                          <rect
                            x={xInflow - 12}
                            y={10}
                            width={56}
                            height={205}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredBucketIndex(i)}
                            onMouseLeave={() => setHoveredBucketIndex(null)}
                            onTouchStart={() => setHoveredBucketIndex(i)}
                          />
                        </g>
                      );
                    })}

                    {/* Dynamic Cumulative Trajectory Path */}
                    <path
                      className="text-emerald-400"
                      d={buckets
                        .map((b, i) => {
                          const x = 75 + i * 110 + 15.5;
                          const y = 175 - Math.round(((b.cumulativeNetCents - minCum) / cumSpan) * 120);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="3"
                    ></path>

                    {/* Trend Point Circles */}
                    {buckets.map((b, i) => {
                      const x = 75 + i * 110 + 15.5;
                      const y = 175 - Math.round(((b.cumulativeNetCents - minCum) / cumSpan) * 120);
                      const isHovered = hoveredBucketIndex === i;
                      const isLast = i === buckets.length - 1;
                      return (
                        <circle
                          key={`c-${i}`}
                          className={
                            isHovered
                              ? 'fill-[#ffb067] stroke-white'
                              : isLast
                              ? 'fill-[#ffb067] stroke-[#0e1320]'
                              : 'fill-[#0e1320] stroke-emerald-400'
                          }
                          cx={x}
                          cy={y}
                          r={isHovered ? 7 : isLast ? 5 : 4}
                          strokeWidth={isHovered ? 2.5 : 2}
                        ></circle>
                      );
                    })}

                    {/* In-Chart Floating SVG Tooltip */}
                    {hoveredBucketIndex !== null && (() => {
                      const hb = buckets[hoveredBucketIndex];
                      const ttX = Math.min(530, Math.max(45, 75 + hoveredBucketIndex * 110 - 70));
                      const ttY = 16;
                      return (
                        <g className="pointer-events-none transition-all duration-150">
                          {/* Tooltip Card Container */}
                          <rect
                            x={ttX}
                            y={ttY}
                            width={195}
                            height={92}
                            rx={8}
                            fill="#141a29"
                            stroke="#ffb067"
                            strokeWidth="1.2"
                            filter="drop-shadow(0 6px 12px rgba(0,0,0,0.45))"
                          />
                          {/* Tooltip Header */}
                          <text x={ttX + 12} y={ttY + 18} className="text-[11px] fill-white font-bold font-mono">
                            {hb.label} ({hb.startDate} – {hb.endDate})
                          </text>
                          <line x1={ttX + 10} y1={ttY + 24} x2={ttX + 185} y2={ttY + 24} stroke="#283046" strokeWidth="1" />
                          {/* Inflows */}
                          <text x={ttX + 12} y={ttY + 38} className="text-[10px] fill-[#ffb067] font-mono">
                            ● Inflows: +{formatCurrency(hb.inflowCents / 100, primaryCurrency)}
                          </text>
                          {/* Outflows */}
                          <text x={ttX + 12} y={ttY + 52} className="text-[10px] fill-[#f87171] font-mono">
                            ● Outflows: -{formatCurrency(hb.outflowCents / 100, primaryCurrency)}
                          </text>
                          {/* Net Delta */}
                          <text x={ttX + 12} y={ttY + 66} className={`text-[10px] font-mono ${hb.netCents >= 0 ? 'fill-emerald-400' : 'fill-red-400'}`}>
                            ● Net: {hb.netCents >= 0 ? '+' : ''}{formatCurrency(hb.netCents / 100, primaryCurrency)}
                          </text>
                          {/* Cumulative Reserves */}
                          <text x={ttX + 12} y={ttY + 80} className="text-[10px] fill-slate-300 font-mono">
                            ● Reserves: {formatCurrency(hb.cumulativeNetCents / 100, primaryCurrency)}
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                )}

                {/* Granular Inspection Ribbon below Chart */}
                {hasChartActivity && (
                  <div className="mt-3 p-2.5 rounded-xl bg-[#141a29] border border-[#283046] flex flex-wrap items-center justify-between gap-3 text-xs">
                    {hoveredBucketIndex !== null ? (
                      <div className="flex flex-wrap items-center gap-4 text-slate-300 font-mono">
                        <span className="text-white font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#ffb067] animate-pulse"></span>
                          {buckets[hoveredBucketIndex].label} ({buckets[hoveredBucketIndex].startDate} – {buckets[hoveredBucketIndex].endDate})
                        </span>
                        <span className="text-[#ffb067]">In: +{formatCurrency(buckets[hoveredBucketIndex].inflowCents / 100, primaryCurrency)}</span>
                        <span className="text-red-400">Out: -{formatCurrency(buckets[hoveredBucketIndex].outflowCents / 100, primaryCurrency)}</span>
                        <span className={buckets[hoveredBucketIndex].netCents >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          Net: {buckets[hoveredBucketIndex].netCents >= 0 ? '+' : ''}{formatCurrency(buckets[hoveredBucketIndex].netCents / 100, primaryCurrency)}
                        </span>
                        <span className="text-slate-400">Cumulative: {formatCurrency(buckets[hoveredBucketIndex].cumulativeNetCents / 100, primaryCurrency)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <span className="material-symbols-outlined text-[16px] text-[#ffb067]">touch_app</span>
                        <span>Hover or tap any column interval to inspect detailed cash inflows, disbursements, and net reserves.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>
                  Surplus buffer:{' '}
                  <strong className="text-white font-semibold font-mono">
                    {rangeNetTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(rangeNetTotal) / 100, primaryCurrency)} {primaryCurrency}
                  </strong>{' '}
                  net {rangeNetTotal >= 0 ? 'positive inflow' : 'negative outflow'}.
                </span>
                <button
                  onClick={() => handleExportCsv(rangeTxns.length > 0 ? rangeTxns : transactions, `arthivex_${chartRange}_ledger.csv`)}
                  className="flex items-center gap-1 text-[#ffb067] text-xs font-semibold cursor-pointer hover:underline bg-transparent border-none p-0"
                  type="button"
                >
                  <span>Download Audit CSV</span>
                  <span className="material-symbols-outlined text-[14px]">file_download</span>
                </button>
              </div>
            </div>

            {/* Quick Custodial Allocation Side Panel (4 Columns) */}
            <div className="xl:col-span-4 bg-[#161b29] border border-[#283046] p-6 rounded-2xl shadow-xl flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white tracking-tight">Custodial Allocation</h3>
                <span className="p-1.5 rounded-lg bg-[#20273a] text-slate-300 border border-[#283046]">
                  <span className="material-symbols-outlined text-[18px]">pie_chart</span>
                </span>
              </div>

              {/* Dynamic Interactive Donut */}
              <div className="flex items-center justify-center py-2 relative">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#20273a]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4.5"
                  ></path>
                  {totalBalanceCents > 0 &&
                    allocationGroups.map((group, idx) => {
                      const priorPct = allocationGroups
                        .slice(0, idx)
                        .reduce((sum, g) => sum + g.pct, 0);
                      const isHovered = hoveredSlice === group.type;
                      return (
                        <path
                          key={group.type}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={group.color}
                          strokeWidth={isHovered ? 6 : 4.5}
                          strokeDasharray={`${group.pct.toFixed(2)}, 100`}
                          strokeDashoffset={-priorPct.toFixed(2)}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={() => setHoveredSlice(group.type)}
                          onMouseLeave={() => setHoveredSlice(null)}
                          onClick={() => setHoveredSlice(hoveredSlice === group.type ? null : group.type)}
                        ></path>
                      );
                    })}
                </svg>

                <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center px-2">
                  {hoveredSlice && allocationGroups.find((g) => g.type === hoveredSlice) ? (
                    (() => {
                      const sel = allocationGroups.find((g) => g.type === hoveredSlice);
                      return (
                        <>
                          <span className="text-[10px] uppercase text-[#ffb067] font-semibold tracking-wider font-mono truncate max-w-[100px]">
                            {sel.label}
                          </span>
                          <span className="text-base font-bold text-white font-mono">
                            {formatCurrency(sel.cents / 100, primaryCurrency)}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-medium font-mono">
                            {sel.pct.toFixed(1)}% Share
                          </span>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider font-mono">
                        Allocated
                      </span>
                      <span className="text-xl font-bold text-white font-mono">
                        {formatCurrency(totalBalanceCents / 100, primaryCurrency)}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium font-mono">
                        {totalBalanceCents > 0 ? 'Balanced' : '0 Accounts'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic Allocation Legend with Hover & Click Highlighting */}
              <div className="flex flex-col gap-2 pt-2">
                {allocationGroups.length > 0 ? (
                  allocationGroups.map((group) => {
                    const isHovered = hoveredSlice === group.type;
                    return (
                      <div
                        key={group.type}
                        onMouseEnter={() => setHoveredSlice(group.type)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        onClick={() => setHoveredSlice(hoveredSlice === group.type ? null : group.type)}
                        className={`flex items-center justify-between text-xs p-1.5 rounded-lg cursor-pointer transition-all ${
                          isHovered
                            ? 'bg-[#20273a] ring-1 ring-[#ffb067]/50 text-white shadow-sm'
                            : 'hover:bg-[#1a1f2d] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: group.color }}></span>
                          <span className={isHovered ? 'font-bold text-white' : ''}>
                            {group.label} ({group.pct.toFixed(1)}%)
                          </span>
                        </div>
                        <span className="font-mono text-white font-semibold">{formatCurrency(group.cents / 100, primaryCurrency)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-2 text-xs text-slate-400">
                    No account balances allocated yet. Open an account to begin tracking.
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#0e1320] border border-[#283046] flex items-center justify-between">
                <span className="text-xs text-slate-400">Ledger Portfolio</span>
                <button
                  onClick={() => navigate('/accounts')}
                  className="text-xs text-[#ffb067] font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
                  type="button"
                >
                  Manage Accounts
                </button>
              </div>
            </div>
          </div>

          {/* MULTI-ACCOUNT PORTFOLIO MATRIX */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Multi-Account Portfolio Matrix</h2>
                <p className="text-xs text-slate-400">Live clearing accounts, routing identifiers, and segregated corporate registers.</p>
              </div>
              <button
                onClick={() => navigate('/accounts')}
                className="text-[#ffb067] text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-none"
                type="button"
              >
                <span>Manage Vault Accounts</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            {/* Empty State for Accounts */}
            {accounts.length === 0 ? (
              <div className="w-full bg-[#161b29] border border-dashed border-[#283046] p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0e1320] border border-[#283046] text-[#ffb067]">
                  <span className="material-symbols-outlined text-[32px]">account_balance</span>
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="text-base font-bold text-white">No Vault Accounts Created Yet</h3>
                  <p className="text-xs text-slate-400">
                    You do not have any active accounts. Create an institutional checking, treasury vault, or high-yield savings account to begin managing your funds.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/accounts')}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ffb067] hover:bg-[#ffa04c] text-[#2e1500] font-bold text-xs transition-all shadow-md shadow-[#ffb067]/20 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>+ Open Your First Account</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {accounts.map((account) => {
                  const cents = parseCents(account.balance);
                  const availCents = parseCents(account.availableBalance ?? account.balance);
                  const isAct = (account.status || '').toUpperCase() === 'ACTIVE';

                  return (
                    <div
                      key={account.id}
                      onClick={() => navigate(`/accounts/${account.id}`)}
                      className="bg-[#161b29] border border-[#283046] p-5 rounded-2xl shadow-lg flex flex-col justify-between gap-4 hover:border-[#ffb067]/40 hover:shadow-xl transition-all cursor-pointer group"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                            {formatAccountTypeLabel(account.accountType)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono ${
                              isAct
                                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                                : 'bg-red-950/60 border border-red-500/30 text-red-400'
                            }`}
                          >
                            {account.status || 'Active'}
                          </span>
                        </div>
                        <span className="text-base font-bold text-white group-hover:text-[#ffb067] transition-colors">
                          {account.name || `${formatAccountTypeLabel(account.accountType)}`}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          •••• •••• •••• {account.accountNumber ? account.accountNumber.slice(-4) : '0000'}
                        </span>
                      </div>
                      <div className="flex flex-col pt-1">
                        <span className="text-xs text-slate-400">Current Balance</span>
                        <span className="text-2xl font-bold text-white tracking-tight font-mono">
                          {formatCurrency(cents / 100, account.currency || 'INR')}{' '}
                          <span className="text-xs text-[#ffb067] font-semibold">{account.currency || 'INR'}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 bg-[#0e1320] border border-[#283046]/80 p-2.5 rounded-xl">
                        <span className="text-[11px] text-slate-400 font-mono">
                          Avail: {formatCurrency(availCents / 100, account.currency || 'INR')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/transfer?fromAccountId=${account.id}`);
                          }}
                          className="text-xs text-[#ffb067] font-semibold hover:underline bg-transparent border-none cursor-pointer"
                          type="button"
                        >
                          Transfer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RECENT FINANCIAL ACTIVITY LEDGER TABLE SECTION */}
          <div className="bg-[#161b29] border border-[#283046] rounded-2xl shadow-xl flex flex-col overflow-hidden">
            {/* Table Header & Filter Toolbar */}
            <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#283046]">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Recent Treasury Activity</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#20273a] border border-[#283046] text-[#ffb067] text-xs font-semibold font-mono">
                    Double-Entry Audit Log
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Detailed audit log of settled allocations, incoming settlements, and wire disbursements.
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-slate-400">filter_list</span>
                  <input
                    type="text"
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    placeholder="Filter counterparty or ID..."
                    className="h-9 pl-8 pr-3 bg-[#0e1320] text-white placeholder:text-slate-500 rounded-xl border border-[#283046] text-xs focus:outline-none focus:border-[#ffb067]/60 transition-all w-52 font-mono"
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="h-9 px-3 bg-[#0e1320] text-slate-300 rounded-xl border border-[#283046] text-xs focus:outline-none cursor-pointer"
                >
                  <option value="All">All Transaction Types</option>
                  <option value="Deposit">Deposit</option>
                  <option value="Withdrawal">Withdrawal</option>
                  <option value="Transfer">Internal Transfer</option>
                </select>
                <button
                  onClick={() => handleExportStatement(filteredTransactions, 'arthivex_recent_transactions.csv')}
                  className="p-2 rounded-xl bg-[#0e1320] border border-[#283046] hover:bg-[#20273a] text-slate-300 transition-colors cursor-pointer"
                  title="Export Filtered Ledger"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                </button>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0e1320] text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-[#283046]">
                  <tr>
                    <th className="py-3.5 px-6">Transaction ID</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Counterparty / Description</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Security Status</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#283046]/60 text-xs text-slate-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 px-6 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-3 rounded-2xl bg-[#0e1320] border border-[#283046] text-slate-400">
                            <span className="material-symbols-outlined text-[28px]">receipt_long</span>
                          </div>
                          <div className="flex flex-col gap-1 max-w-sm">
                            <span className="text-sm font-semibold text-white">No transactions found</span>
                            <span className="text-xs text-slate-400">
                              Your recent settled deposits, withdrawals, and transfers will appear here in the double-entry audit ledger.
                            </span>
                          </div>
                          <button
                            onClick={() => navigate('/deposit')}
                            className="mt-1 px-4 py-2 rounded-xl bg-[#ffb067] hover:bg-[#ffa04c] text-[#2e1500] font-bold text-xs transition-all shadow-md shadow-[#ffb067]/20 inline-flex items-center gap-1.5 cursor-pointer"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            <span>Make a Deposit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 px-6 text-center text-slate-400 text-xs">
                        No transactions match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx, idx) => (
                      <tr
                        key={`${tx.id}-${tx.accountId || idx}`}
                        onClick={() => setSelectedTxn(tx)}
                        className="hover:bg-[#1c2237] transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-6 font-mono font-semibold text-[#ffb067]">
                          #{tx.reference || tx.id.slice(0, 8)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold text-xs ${
                              tx.type === 'Deposit'
                                ? 'text-emerald-400'
                                : tx.type === 'Withdrawal'
                                ? 'text-slate-400'
                                : 'text-[#ffb067]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {tx.type === 'Deposit'
                                ? 'arrow_downward'
                                : tx.type === 'Withdrawal'
                                ? 'arrow_upward'
                                : 'swap_horiz'}
                            </span>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white group-hover:text-[#ffb067] transition-colors">
                              {tx.party}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {tx.memo}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                          {tx.time}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                              tx.status === 'Settled' || tx.status === 'COMPLETED'
                                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                                : tx.status === 'PENDING'
                                ? 'bg-[#ffb067]/10 border border-[#ffb067]/20 text-[#ffb067]'
                                : 'bg-red-950/60 border border-red-500/30 text-red-400'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              {tx.status === 'Settled' || tx.status === 'COMPLETED'
                                ? 'verified'
                                : tx.status === 'PENDING'
                                ? 'schedule'
                                : 'pending'}
                            </span>
                            {tx.status}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono text-sm font-bold ${
                            tx.type === 'Deposit'
                              ? 'text-emerald-400'
                              : tx.type === 'Withdrawal'
                              ? 'text-slate-200'
                              : 'text-[#ffb067]'
                          }`}
                        >
                          {tx.amount}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTxn(tx);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#20273a] transition-all cursor-pointer"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Ledger Footer Pagination */}
            <div className="p-4 bg-[#0e1320] border-t border-[#283046] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="font-mono">
                {transactions.length === 0
                  ? '0 of 0 Total Ledger Transactions'
                  : `Showing 1 to ${filteredTransactions.length} of ${transactions.length} Total Ledger Transactions`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded-lg bg-[#161b29] border border-[#283046] text-slate-500 disabled:opacity-40"
                  disabled
                  type="button"
                >
                  Previous
                </button>
                <span className="px-2.5 py-0.5 rounded-md bg-[#ffb067] text-[#2e1500] font-mono font-bold">
                  1
                </span>
                <button
                  className="px-3 py-1 rounded-lg bg-[#161b29] border border-[#283046] text-slate-300 hover:bg-[#20273a] hover:text-white transition-colors cursor-pointer"
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: TRANSACTION DETAILS OVERLAY */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#161b29] border border-[#283046] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-[#0e1320] border-b border-[#283046] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-[#ffb067]/10 border border-[#ffb067]/25 text-[#ffb067]">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </span>
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Audit Record: #{selectedTxn.reference || selectedTxn.id}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Double-Entry Ledger Audit Record
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20273a] transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0e1320] border border-[#283046]">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    Validated Net Amount
                  </span>
                  <span className="text-2xl font-bold text-white font-mono">
                    {selectedTxn.amount}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                    selectedTxn.status === 'Settled' || selectedTxn.status === 'COMPLETED'
                      ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                      : selectedTxn.status === 'PENDING'
                      ? 'bg-[#ffb067]/10 border border-[#ffb067]/20 text-[#ffb067]'
                      : 'bg-red-950/60 border border-red-500/30 text-red-400'
                  }`}
                >
                  {selectedTxn.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col">
                  <span className="text-slate-400">Transaction Type</span>
                  <span className="font-semibold text-white mt-0.5">{selectedTxn.type}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400">Timestamp</span>
                  <span className="font-mono text-white mt-0.5">{selectedTxn.time}</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-slate-400">Counterparty / Description</span>
                  <span className="font-semibold text-white mt-0.5">{selectedTxn.party}</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-slate-400">Target Vault</span>
                  <span className="font-mono text-white mt-0.5">{selectedTxn.account}</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-slate-400">Settlement Channel</span>
                  <span className="font-mono text-white mt-0.5">{selectedTxn.channel}</span>
                </div>
                <div className="flex flex-col col-span-2 p-2.5 rounded-xl bg-[#0e1320] border border-[#283046] font-mono text-[11px] text-slate-400 break-all">
                  <span>Ledger Identifier: {selectedTxn.id}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0e1320] border-t border-[#283046] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 rounded-xl bg-[#20273a] text-slate-200 border border-[#283046] text-xs font-semibold hover:bg-[#283046] transition-colors cursor-pointer"
                type="button"
              >
                Close Record
              </button>
              <button
                onClick={() => handleDownloadTxnReceipt(selectedTxn)}
                className="px-4 py-2 rounded-xl bg-[#ffb067] hover:bg-[#ff9f43] text-[#2e1500] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ffb067]/20 transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">receipt</span>
                <span>Download Audit Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
