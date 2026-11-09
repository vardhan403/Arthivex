import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../utils/currencyFormatter';

export default function MyAccountsPage() {
  const navigate = useNavigate();

  // Screen State: 'standard' | 'empty' | 'skeleton' | 'error'
  const [screenState, setScreenState] = useState('skeleton');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Accounts List
  const [accounts, setAccounts] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkBankModal, setShowLinkBankModal] = useState(false);
  const [addAccountName, setAddAccountName] = useState('');
  const [addAccountType, setAddAccountType] = useState('CHECKING');
  const [addCurrency, setAddCurrency] = useState('INR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3200);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const data = await accountService.getAccounts();
      const list = Array.isArray(data) ? data : (data?.accounts || []);
      const formatted = list.map((acc, index) => {
        const balNum = parseFloat(acc.balance) || 0;
        const availNum = parseFloat(acc.availableBalance ?? acc.balance) || 0;
        const currency = acc.currency || 'INR';
        const typeUpper = (acc.accountType || 'CHECKING').toUpperCase();

        let typeLabel = 'Checking Account (Operating)';
        let category = 'checking';
        let icon = 'account_balance_wallet';

        if (typeUpper === 'SAVINGS') {
          typeLabel = 'Savings Account (Reserve)';
          category = 'savings';
          icon = 'lock';
        } else if (typeUpper === 'ESCROW' || typeUpper === 'TREASURY') {
          typeLabel = 'Business Escrow Account';
          category = 'escrow';
          icon = 'shield';
        }

        return {
          id: acc.id,
          category,
          accountType: typeUpper,
          name: acc.name || typeLabel,
          accountNumber: acc.accountNumber || '',
          mask: acc.accountNumber ? acc.accountNumber.slice(-4) : `${index + 1}001`.slice(-4),
          tag: `Account #${(index + 1).toString().padStart(2, '0')}`,
          badge: acc.status === 'ACTIVE' ? 'Active' : (acc.status || 'Active'),
          numericBal: balNum,
          numericAvail: availNum,
          currency: currency,
          pills: ['Double-Entry Protected', 'Encrypted Ledger'],
          dailyLimit: acc.dailyLimit || 250000,
          icon: icon,
          primary: index === 0
        };
      });

      setAccounts(formatted);
      if (formatted.length === 0) {
        setScreenState('empty');
      } else {
        setScreenState('standard');
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to connect to financial ledger service.';
      setFetchError(msg);
      setScreenState('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    showToast('Synchronizing financial accounts with ledger...');
    await loadAccounts();
    showToast('Account balances synchronized successfully.');
  };

  const copyId = (id) => {
    navigator.clipboard?.writeText(id).catch(() => {});
    showToast(`Account identifier •••• ${id} copied to clipboard`);
  };

  const handleCreateAccount = async () => {
    try {
      setIsSubmitting(true);
      await accountService.createAccount({
        accountType: addAccountType,
        currency: addCurrency
      });
      setShowAddModal(false);
      setAddAccountName('');
      setAddAccountType('CHECKING');
      setAddCurrency('INR');
      showToast(`Financial account created successfully. Initial balance: ${formatCurrency(0, addCurrency)}.`);
      await loadAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create financial account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine primary display currency for totals:
  // If user has accounts, format in the currency of their existing accounts.
  // For new users with no accounts, default to INR.
  const primaryCurrency = accounts.length > 0 ? accounts[0].currency : 'INR';

  // 1. Total Managed Assets
  const totalManagedAssets = accounts.reduce((sum, a) => sum + (a.numericBal || 0), 0);

  // 2. Operational Liquidity (Checking / Operating accounts)
  const checkingAccounts = accounts.filter((a) => a.accountType === 'CHECKING');
  const operationalLiquidity = checkingAccounts.length > 0
    ? checkingAccounts.reduce((sum, a) => sum + (a.numericAvail || 0), 0)
    : (accounts.length > 0 ? accounts.reduce((sum, a) => sum + (a.numericAvail || 0), 0) : 0);

  // 3. Reserve Vaults (Savings, Escrow, Treasury)
  const reserveAccounts = accounts.filter(
    (a) => a.accountType === 'SAVINGS' || a.accountType === 'ESCROW' || a.accountType === 'TREASURY'
  );
  const reserveVaults = reserveAccounts.reduce((sum, a) => sum + (a.numericBal || 0), 0);

  // 4. Unsettled Holds (balance - availableBalance)
  const unsettledHolds = accounts.reduce(
    (sum, a) => sum + Math.max(0, (a.numericBal || 0) - (a.numericAvail || 0)),
    0
  );

  const filteredAccounts = accounts.filter((acc) => {
    const matchesCategory = selectedCategory === 'all' || acc.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      acc.name.toLowerCase().includes(q) ||
      acc.mask.includes(q) ||
      acc.currency.toLowerCase().includes(q) ||
      acc.accountNumber.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30 font-semibold uppercase tracking-wider font-mono">
              Accounts &amp; Ledger
            </span>
            <span className="text-xs text-slate-400 font-mono">/ Internal Partitions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Financial Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage internal ledger partitions, checking accounts, and reserve vaults.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <button
            onClick={handleRefresh}
            className="h-10 px-4 rounded-xl bg-[#161b29] hover:bg-[#20273a] border border-[#283046] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            type="button"
          >
            <span
              className={`material-symbols-outlined text-[18px] text-[#ffb067] ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
            <span>Refresh Balances</span>
          </button>

          {/* Action A: Create Financial Account (Internal) */}
          <button
            onClick={() => setShowAddModal(true)}
            className="h-10 px-4 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold flex items-center gap-2 shadow-md shadow-[#ffb067]/20 transition-all active:scale-[0.98] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Create Financial Account</span>
          </button>

          {/* Action B: Link Bank Account (External - Coming Soon) */}
          <button
            onClick={() => setShowLinkBankModal(true)}
            className="h-10 px-4 rounded-xl bg-[#20273a] hover:bg-[#283046] border border-[#283046] text-slate-300 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-400">link</span>
            <span>Link Bank Account</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b29] text-[#ffb067] border border-[#ffb067]/30 font-mono font-medium">
              Coming Soon
            </span>
          </button>
        </div>
      </div>

      {/* KPI Strip (4 cards) with genuine financial metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Total Managed Assets */}
        <div className="p-5 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#ffb067]/5 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
              Total Managed Assets
            </span>
            <div className="p-1.5 rounded-lg bg-[#20273a] text-[#ffb067] border border-[#283046]">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatCurrency(totalManagedAssets, primaryCurrency)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-mono">
              <span>30-day Growth:</span>
              <span className="text-slate-500 font-semibold">Not available</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Operational Liquidity */}
        <div className="p-5 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
              Operational Liquidity
            </span>
            <div className="p-1.5 rounded-lg bg-[#20273a] text-[#ffb067] border border-[#283046]">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatCurrency(operationalLiquidity, primaryCurrency)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  operationalLiquidity > 0 ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              ></span>
              <span>
                {checkingAccounts.length > 0
                  ? `${checkingAccounts.length} active operating account${checkingAccounts.length > 1 ? 's' : ''}`
                  : 'No active operating accounts'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Reserve Vaults */}
        <div className="p-5 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
              Reserve Vaults
            </span>
            <div className="p-1.5 rounded-lg bg-[#20273a] text-[#ffb067] border border-[#283046]">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatCurrency(reserveVaults, primaryCurrency)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span className="text-[11px] text-slate-400 bg-[#20273a] border border-[#283046] px-1.5 py-0.5 rounded font-mono">
                Blended APY: Not available
              </span>
              <span>
                {reserveAccounts.length > 0
                  ? `${reserveAccounts.length} reserve vault${reserveAccounts.length > 1 ? 's' : ''}`
                  : 'No reserve vaults'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Unsettled Holds */}
        <div className="p-5 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
              Unsettled Holds
            </span>
            <div className="p-1.5 rounded-lg bg-[#20273a] text-slate-400 border border-[#283046]">
              <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatCurrency(unsettledHolds, primaryCurrency)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span className="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
              <span>
                {unsettledHolds > 0 ? 'Funds on temporary ledger hold' : 'All settlement queues cleared'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar (shown when accounts exist) */}
      {accounts.length > 0 && screenState === 'standard' && (
        <div className="p-4 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-2">
            {[
              { id: 'all', label: `All Accounts (${accounts.length})` },
              {
                id: 'checking',
                label: `Checking (${accounts.filter((a) => a.category === 'checking').length})`
              },
              {
                id: 'savings',
                label: `Savings (${accounts.filter((a) => a.category === 'savings').length})`
              },
              {
                id: 'escrow',
                label: `Escrow (${accounts.filter((a) => a.category === 'escrow').length})`
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-[#ffb067] text-[#2e1500] shadow-sm'
                    : 'bg-[#20273a] hover:bg-[#283046] border border-[#283046] text-white'
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center w-full md:w-64">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accounts or number..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0e1320] text-white placeholder:text-slate-500 border border-[#283046] text-xs focus:outline-none focus:border-[#ffb067] font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* STATE 1: STANDARD ACTIVE ACCOUNTS LIST */}
      {screenState === 'standard' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-6 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between transition-all hover:border-[#ffb067]/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-[#20273a] flex items-center justify-center text-[#ffb067] border border-[#283046]">
                        <span className="material-symbols-outlined text-[26px]">{acc.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-semibold text-white">{acc.name}</span>
                          <span className="material-symbols-outlined text-[16px] text-[#ffb067]">verified</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 mt-0.5 text-xs">
                          <span className="font-mono tracking-widest">
                            •••• •••• •••• {acc.mask}
                          </span>
                          <button
                            onClick={() => copyId(acc.accountNumber || acc.mask)}
                            className="text-slate-400 hover:text-[#ffb067]"
                            title="Copy Account Number"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[15px]">content_copy</span>
                          </button>
                          <span className="text-slate-600">•</span>
                          <span className="uppercase text-[11px] font-mono">{acc.tag}</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ffb067]"></span>
                      {acc.badge}
                    </span>
                  </div>

                  {/* Balance Area */}
                  <div className="p-4 rounded-lg bg-[#1c2237] border border-[#283046]/70 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                        Available Balance
                      </span>
                      <div className="text-2xl font-bold text-white tracking-tight mt-0.5 font-mono">
                        {formatCurrency(acc.numericBal, acc.currency)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {acc.pills.map((pill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#20273a] border border-[#283046] text-xs text-slate-200 font-medium"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Account Properties */}
                  <div className="grid grid-cols-2 gap-3 mb-6 text-slate-400 text-xs">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#1a1f2d]/60 border border-[#283046]/50">
                      <span>Account Type</span>
                      <span className="font-mono text-white font-medium">{acc.accountType}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#1a1f2d]/60 border border-[#283046]/50">
                      <span>Currency</span>
                      <span className="font-mono text-white font-medium">{acc.currency}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#1a1f2d]/60 border border-[#283046]/50">
                      <span>Daily Limit</span>
                      <span className="font-mono text-white font-medium">
                        {formatCurrency(acc.dailyLimit, acc.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#1a1f2d]/60 border border-[#283046]/50">
                      <span>Ledger Protection</span>
                      <span className="font-mono text-emerald-400 font-medium">Enforced</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-3 bg-[#090e1b]/50 rounded-lg p-2.5 border border-[#283046]/50">
                  <button
                    onClick={() => navigate(`/accounts/${acc.id}`)}
                    className="h-9 px-3.5 rounded-lg bg-[#20273a] hover:bg-[#283046] border border-[#283046] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View Account Details</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/deposit?accountId=${acc.id}`)}
                      className="h-9 px-3 rounded-lg bg-[#20273a] hover:bg-[#283046] border border-[#283046] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] text-emerald-400">add_circle</span>
                      <span>Deposit</span>
                    </button>
                    <button
                      onClick={() => navigate(`/transfer?fromAccountId=${acc.id}`)}
                      className="h-9 px-3.5 rounded-lg bg-[#ffb067] hover:bg-[#ffa048] text-[#2e1500] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                      <span>Transfer</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATE 2: EMPTY STATE */}
      {screenState === 'empty' && (
        <div className="flex flex-col items-center justify-center p-12 bg-[#161b29] border border-[#283046] rounded-xl shadow-sm text-center">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-[#20273a] flex items-center justify-center text-[#ffb067] border border-[#283046]">
            <span className="material-symbols-outlined text-[44px]">account_balance_wallet</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#20273a] text-slate-400 border border-[#283046] text-xs uppercase tracking-wider mb-2 font-medium font-mono">
            No Active Records
          </span>
          <h2 className="text-2xl font-bold text-white max-w-md">
            No Financial Accounts Yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mt-2 mb-6">
            Create your first financial account inside Arthivex to organize balances and manage internal ledger transactions.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* Primary Action: Create Financial Account (Functional) */}
            <button
              onClick={() => setShowAddModal(true)}
              className="h-10 px-6 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold flex items-center gap-2 shadow-md shadow-[#ffb067]/20 transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create Financial Account</span>
            </button>

            {/* Secondary Action: Link Bank Account (Coming Soon) */}
            <button
              onClick={() => setShowLinkBankModal(true)}
              className="h-10 px-5 rounded-xl bg-[#20273a] hover:bg-[#283046] border border-[#283046] text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">link</span>
              <span>Link Bank Account</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b29] text-[#ffb067] border border-[#ffb067]/30 font-mono">
                Coming Soon
              </span>
            </button>
          </div>
          <div className="mt-8 pt-6 flex items-center gap-6 text-slate-400 border-t border-[#283046] text-left text-xs font-mono flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffb067] text-[18px]">verified</span>
              <span>Double-Entry Protected Ledger</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffb067] text-[18px]">lock</span>
              <span>Initial balance starts at ₹0.00</span>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: SKELETON LOADING STATE */}
      {screenState === 'skeleton' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col justify-between h-72"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[#20273a]"></div>
                    <div className="flex flex-col gap-2">
                      <div className="w-44 h-4 rounded bg-[#20273a]"></div>
                      <div className="w-32 h-3 rounded bg-[#161b29]"></div>
                    </div>
                  </div>
                  <div className="w-28 h-6 rounded bg-[#20273a]"></div>
                </div>
                <div className="h-20 rounded-lg bg-[#1a1f2d] mb-4"></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-8 rounded bg-[#1a1f2d]"></div>
                  <div className="h-8 rounded bg-[#1a1f2d]"></div>
                </div>
              </div>
              <div className="h-10 rounded bg-[#1a1f2d] mt-4"></div>
            </div>
          ))}
        </div>
      )}

      {/* STATE 4: ERROR STATE */}
      {screenState === 'error' && (
        <div className="flex flex-col gap-4">
          <div className="p-6 rounded-xl bg-red-950/60 text-red-200 border border-red-500/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-[32px] text-red-400 shrink-0">error</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">
                    Unable to Load Financial Accounts
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-600 text-white font-bold uppercase font-mono">
                    Service Error
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {fetchError || 'Unable to connect to the Arthivex backend service. Please check your network connection or verify that the backend server is running.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={loadAccounts}
                className="h-10 px-4 rounded-xl bg-red-600 text-white hover:bg-red-500 text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL A: CREATE FINANCIAL ACCOUNT (INTERNAL) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#161b29] border border-[#283046] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-[#283046]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#ffb067]/10 text-[#ffb067] border border-[#ffb067]/30">
                  <span className="material-symbols-outlined text-[22px]">add_circle</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Financial Account</h3>
                  <span className="text-[10px] text-[#ffb067] uppercase tracking-wider font-semibold font-mono">
                    Internal Arthivex Partition
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20273a]"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              {/* Mandatory Explanation Callout */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-blue-400 shrink-0 mt-0.5">info</span>
                <span className="leading-relaxed">
                  Create an internal financial account within Arthivex. This account does not connect to an external bank or transfer real money.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Account Category</label>
                <select
                  value={addAccountType}
                  onChange={(e) => setAddAccountType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0e1320] text-white border border-[#283046] focus:outline-none focus:border-[#ffb067]"
                >
                  <option value="CHECKING">Checking Account (Operating)</option>
                  <option value="SAVINGS">Savings Account (Reserve)</option>
                  <option value="ESCROW">Business Escrow Account</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Currency</label>
                <select
                  value={addCurrency}
                  onChange={(e) => setAddCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0e1320] text-white border border-[#283046] focus:outline-none focus:border-[#ffb067]"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Account Label / Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={addAccountName}
                  onChange={(e) => setAddAccountName(e.target.value)}
                  placeholder="e.g., Primary Operational Vault"
                  className="w-full h-10 px-3 rounded-xl bg-[#0e1320] text-white placeholder:text-slate-500 border border-[#283046] focus:outline-none focus:border-[#ffb067]"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e1320] border border-[#283046] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Initial Balance</span>
                  <span className="font-mono text-white font-bold">
                    {formatCurrency(0, addCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Daily Transaction Limit</span>
                  <span className="font-mono text-white font-bold">
                    {formatCurrency(250000, addCurrency)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  * Arthivex enforces a zero-creation invariant. All newly created internal accounts start with an initial balance of ₹0.00.
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#0e1320] border-t border-[#283046] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="h-10 px-4 rounded-xl bg-[#20273a] hover:bg-[#283046] border border-[#283046] text-white text-xs font-semibold transition-colors"
                type="button"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold shadow-md shadow-[#ffb067]/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                type="button"
              >
                {isSubmitting && (
                  <span className="w-3.5 h-3.5 border-2 border-[#2e1500] border-t-transparent rounded-full animate-spin"></span>
                )}
                <span>Create Financial Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL B: LINK BANK ACCOUNT (COMING SOON) */}
      {showLinkBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#161b29] border border-[#283046] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-[#283046]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-[#ffb067] border border-amber-500/30">
                  <span className="material-symbols-outlined text-[22px]">account_balance</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Link Bank Account</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30 font-semibold uppercase tracking-wider font-mono">
                      Coming Soon
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">External Banking Gateway</span>
                </div>
              </div>
              <button
                onClick={() => setShowLinkBankModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20273a]"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3">
                <span className="material-symbols-outlined text-[22px] text-[#ffb067] shrink-0 mt-0.5">info</span>
                <div>
                  <p className="font-semibold text-white">
                    External bank account connectivity is not currently available.
                  </p>
                  <p className="mt-1 text-amber-200/90 leading-relaxed">
                    This feature will be enabled when a supported banking integration is implemented.
                  </p>
                </div>
              </div>

              <p className="text-slate-400 leading-relaxed">
                Arthivex currently manages secure internal financial partitions protected by double-entry ledger verification. Open Banking and direct external bank connectivity are scheduled for future platform updates.
              </p>
            </div>

            <div className="p-4 bg-[#0e1320] border-t border-[#283046] flex items-center justify-end">
              <button
                onClick={() => setShowLinkBankModal(false)}
                className="h-10 px-5 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold shadow-md shadow-[#ffb067]/20 transition-all cursor-pointer"
                type="button"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl bg-[#1c2237] border border-[#283046] text-white px-4 py-3 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[20px] text-[#ffb067]">info</span>
          <span className="text-xs">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
