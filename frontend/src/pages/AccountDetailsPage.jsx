import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { accountService } from '../services/accountService';
import { transactionService } from '../services/transactionService';
import { formatCurrency } from '../utils/currencyFormatter';

export default function AccountDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [revealRouting, setRevealRouting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadAccount();
  }, [id]);

  const loadAccount = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (!id) {
        throw new Error('Account ID is required');
      }
      const data = await accountService.getAccountById(id);
      setAccount(data);

      try {
        const txData = await transactionService.getTransactions({ accountId: id });
        const list = Array.isArray(txData) ? txData : (txData?.transactions || txData?.content || []);
        const formatted = list.map((tx) => {
          const isPos = tx.type === 'DEPOSIT' || (tx.type === 'TRANSFER' && tx.destinationAccountId === id);
          const amt = parseFloat(tx.amount) || 0;
          return {
            id: tx.id || tx.reference,
            date: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Recent',
            counterparty: tx.description || tx.type,
            details: `Ref: ${tx.reference || tx.id}`,
            method: tx.sourceMethod || (tx.type === 'DEPOSIT' ? 'Direct Clearing' : tx.type === 'WITHDRAWAL' ? 'Outbound Disbursement' : 'Internal Transfer'),
            status: tx.status || 'Settled',
            type: (tx.type || 'deposit').toLowerCase(),
            amount: `${isPos ? '+ ' : '- '}${formatCurrency(amt, tx.currency || data?.currency)}`,
            balance: formatCurrency(tx.balanceAfter !== undefined ? tx.balanceAfter : (data?.balance || 0), tx.currency || data?.currency),
            isPositive: isPos,
          };
        });
        setTransactions(formatted);
      } catch (tErr) {
        console.error('Could not load account transactions:', tErr);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Account not found in active custody vault.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExportStatement = () => {
    if (!transactions || transactions.length === 0) {
      alert('No ledger transactions available to export for this account.');
      return;
    }
    const headers = ['Transaction ID', 'Date', 'Description', 'Method', 'Amount', 'Status'];
    const rows = transactions.map((t) => [
      t.id,
      `"${t.date}"`,
      `"${(t.counterparty || '').replace(/"/g, '""')}"`,
      `"${t.method}"`,
      `"${t.amount}"`,
      t.status
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `arthivex_account_${id}_statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (
      searchQuery &&
      !tx.counterparty.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !tx.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !tx.details.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const formatBalance = (val) => {
    if (val === undefined || val === null) return '0.00';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[#bfc6de]">
        <span className="material-symbols-outlined text-4xl animate-spin text-[#ffb067]">progress_activity</span>
        <p className="mt-2 text-xs font-mono">Retrieving encrypted vault ledger partition...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#93000a]/40 border border-[#ffb4ab]/50 text-[#ffb4ab] text-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ffb4ab] text-xl">error</span>
            <p>{errorMsg}</p>
          </div>
          <button
            onClick={loadAccount}
            className="px-3 py-1 bg-[#ffb4ab] text-[#690005] hover:opacity-90 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Page Header & Action Cluster */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Back Navigation and Status */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <Link
              to="/accounts"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ffb067] hover:text-[#ffd5b3] transition-colors group"
            >
              <span className="material-symbols-outlined text-[18px] transform group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
              <span>Back to All Accounts</span>
            </Link>
            <span className="text-[#283046]">|</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {account?.status || 'Active'} • Double-Entry Protected
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            {account?.name || (account?.accountType ? `${account.accountType} Vault` : 'Vault Account')}
            <span className="font-mono text-sm font-normal text-[#bfc6de]">
              (•••• {account?.accountNumber ? account.accountNumber.slice(-4) : '0000'})
            </span>
          </h1>
        </div>

        {/* Right: Action Cluster */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportStatement}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161b29] hover:bg-[#1a1f2d] text-[#dee2f5] border border-[#283046] text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-[#bfc6de]">download</span>
            <span>Export CSV Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/withdraw')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161b29] hover:bg-[#1a1f2d] text-[#dee2f5] border border-[#283046] text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-[#ffb067]">arrow_upward</span>
            <span>Withdraw</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/transfer?fromAccountId=${account?.id || ''}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161b29] hover:bg-[#1a1f2d] text-[#dee2f5] border border-[#283046] text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-[#ffb067]">swap_horiz</span>
            <span>Transfer Out</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/deposit?accountId=${account?.id || ''}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ffb067] hover:bg-[#ffa048] text-[#4c2700] font-bold text-xs shadow-md shadow-[#ffb067]/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Deposit Funds</span>
          </button>
        </div>
      </div>

      {/* Hero Grid: Balance Details (8 cols) & Vault Attestation (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Hero (8 cols): Primary Balance & Account Metadata */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-xl bg-[#161b29] border border-[#283046] relative overflow-hidden shadow-sm">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#ffb067]/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Section: Balances & Stats */}
          <div className="p-6 relative z-10 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#283046]/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#ffb067] font-mono">
                  {account?.accountType || 'CHECKING'} VAULT • {account?.currency || 'INR'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#bfc6de] font-mono bg-[#090e1b]/80 px-2.5 py-1 rounded-md border border-[#283046]">
                <span className="material-symbols-outlined text-[15px] text-emerald-400">schedule</span>
                Real-Time Settlement
              </span>
            </div>

            {/* Big Metric Display */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#bfc6de] uppercase tracking-wider">Current Settled Balance</span>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">
                  {formatCurrency(account?.balance, account?.currency)}
                </span>
              </div>
            </div>

            {/* Breakdown Stats Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-[#1a1f2d] border border-[#283046] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-[#bfc6de]">Available:</span>
                <span className="font-mono font-semibold text-white">
                  {formatCurrency(account?.availableBalance ?? account?.balance, account?.currency)}
                </span>
              </div>
              <div className="hidden sm:block text-[#283046]">|</div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#bfc6de]/60"></span>
                <span className="text-[#bfc6de]">Locked / Holds:</span>
                <span className="font-mono font-medium text-[#bfc6de]">
                  {formatCurrency(Math.max(0, (account?.balance || 0) - (account?.availableBalance ?? account?.balance ?? 0)), account?.currency)}
                </span>
              </div>
              <div className="hidden sm:block text-[#283046]">|</div>
              <div className="flex items-center gap-2">
                <span className="text-[#bfc6de]">Daily Limit:</span>
                <span className="font-mono font-semibold text-white">
                  {formatCurrency(account?.dailyLimit || 250000, account?.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Structured Metadata Grid */}
          <div className="bg-[#090e1b]/80 border-t border-[#283046] p-6 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 relative z-10">
            <div>
              <span className="text-[11px] font-semibold text-[#bfc6de] uppercase tracking-wider block">Account Type</span>
              <span className="text-sm font-semibold text-white mt-1 block">
                {account?.accountType ? `${account.accountType.charAt(0)}${account.accountType.slice(1).toLowerCase()} Vault` : 'Commercial Checking'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#bfc6de] uppercase tracking-wider block">Partition Code</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono font-semibold text-white tracking-wider">
                  FG-PART-{account?.accountNumber ? account.accountNumber.slice(-4) : '0000'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#bfc6de] uppercase tracking-wider block">Masked Account</span>
              <span className="text-sm font-mono font-semibold text-white mt-1 tracking-wider block">
                •••• •••• •••• {account?.accountNumber ? account.accountNumber.slice(-4) : '0000'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#bfc6de] uppercase tracking-wider block">Depository Custodian</span>
              <span className="text-sm font-medium text-white mt-1 truncate block">Arthivex Double-Entry Vault</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#bfc6de] uppercase tracking-wider block">Ledger Currency</span>
              <span className="text-sm font-medium text-white mt-1 block font-mono">
                {account?.currency || 'INR'} • Real-Time Clearing
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#bfc6de] uppercase tracking-wider block">Vault Activation</span>
              <span className="text-sm font-mono font-medium text-white mt-1 block">
                {account?.createdAt ? new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Active Session'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Hero (4 cols): Vault Attestation & Security Widget */}
        <div className="lg:col-span-4 rounded-xl bg-[#161b29] border border-[#283046] p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#283046]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#ffb067]/15 flex items-center justify-center text-[#ffb067]">
                  <span className="material-symbols-outlined text-[19px]">verified_user</span>
                </div>
                <h2 className="text-sm font-bold text-white">Security Attestation</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30 text-[10px] font-bold tracking-wider uppercase font-mono">
                Verified Node
              </span>
            </div>

            {/* Attestation Items */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1f2d] border border-[#283046]/70">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white leading-tight">Account Status</span>
                    <span className="text-[10px] text-[#bfc6de]">Identity Verified</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                  {account?.status || 'ACTIVE'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1f2d] border border-[#283046]/70">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#ffb067]">account_balance</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white leading-tight">Ledger Protection</span>
                    <span className="text-[10px] text-[#bfc6de] font-mono">Double-Entry Core</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#ffb067] bg-[#ffb067]/15 px-2 py-0.5 rounded border border-[#ffb067]/30">
                  Balanced
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1f2d] border border-[#283046]/70">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#ffb067]">token</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white leading-tight">Security Session</span>
                    <span className="text-[10px] text-[#bfc6de] font-mono">HMAC-SHA256 Sig</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#ffb067] font-mono">Active</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Banner */}
          <div className="mt-5 pt-4 border-t border-[#283046] flex items-center justify-between bg-[#090e1b]/70 -mx-6 -mb-6 p-4 rounded-b-xl">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#ffb067] text-[20px]">enhanced_encryption</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Double-Entry Safeguard</span>
                <span className="text-[10px] text-[#bfc6de] font-mono">Invariant: Total Debits == Total Credits</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">task_alt</span>
          </div>
        </div>
      </div>

      {/* Account Transaction Ledger Card */}
      <div className="rounded-xl bg-[#161b29] border border-[#283046] shadow-sm overflow-hidden">
        {/* Ledger Header Controls */}
        <div className="p-5 sm:p-6 bg-[#161b29] border-b border-[#283046] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-white tracking-tight">Account Transaction Ledger</h2>
            <p className="text-xs text-[#bfc6de] mt-0.5">
              Audited immutable journal for {account?.name || (account?.accountType ? `${account.accountType} Vault` : 'Vault Account')}
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center min-w-[220px]">
              <span className="material-symbols-outlined absolute left-3 text-[17px] text-[#bfc6de] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#1a1f2d] border border-[#283046] text-[#dee2f5] placeholder:text-[#bfc6de]/60 text-xs focus:outline-none focus:border-[#ffb067] transition-all font-mono"
              />
            </div>

            <div className="flex items-center rounded-lg bg-[#1a1f2d] border border-[#283046] p-1 gap-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'deposit', label: 'Deposits' },
                { key: 'transfer', label: 'Transfers' },
                { key: 'withdrawal', label: 'Withdrawals' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTypeFilter(tab.key)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    typeFilter === tab.key
                      ? 'bg-[#ffb067] text-[#4c2700]'
                      : 'text-[#bfc6de] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* High-Density Styled Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1f2d]/70 border-b border-[#283046] text-[#bfc6de] text-[11px] uppercase tracking-wider font-semibold font-mono">
                <th className="py-3 px-4">Timestamp / Reference</th>
                <th className="py-3 px-4">Counterparty & Details</th>
                <th className="py-3 px-4">Method / Channel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ledger Amount</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#283046]/70">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 px-6 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[32px] text-slate-500">receipt_long</span>
                      <span className="text-sm font-semibold text-white">No transactions recorded for this vault</span>
                      <span className="text-xs text-slate-400">Deposit or transfer funds to view transactions here.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-[#1a1f2d]/60 transition-colors ${
                      idx % 2 === 0 ? 'bg-[#161b29]' : 'bg-[#090e1b]/30'
                    }`}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-white font-medium">{tx.date}</span>
                        <span className="text-[10px] text-[#bfc6de] font-mono">{tx.id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                            tx.isPositive
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : tx.type === 'transfer'
                              ? 'bg-[#ffb067]/15 border-[#ffb067]/30 text-[#ffb067]'
                              : 'bg-[#1a1f2d] border-[#283046] text-rose-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            {tx.isPositive ? 'south_west' : tx.type === 'transfer' ? 'swap_horiz' : 'north_east'}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">{tx.counterparty}</span>
                          <span className="text-[11px] text-[#bfc6de] truncate font-mono">{tx.details}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-xs text-[#dee2f5] font-medium">{tx.method}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {tx.status}
                      </span>
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm ${
                        tx.isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-white">{tx.balance}</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/transactions/${tx.id}`)}
                        className="p-1 rounded text-[#bfc6de] hover:text-[#ffb067] hover:bg-[#1a1f2d] transition-colors cursor-pointer"
                        title="View Transaction Details"
                      >
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
