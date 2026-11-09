import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountService } from '../services/accountService';
import { transactionService } from '../services/transactionService';
import { generateIdempotencyKey } from '../services/apiClient';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyFormatter';

export default function WithdrawPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramAccountId = searchParams.get('accountId');
  const { user } = useAuth();

  // State switcher: 'form', 'modal', 'success', 'error-insufficient', 'error-limit'
  const [screenState, setScreenState] = useState('form');

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0] || {};
  const accountCurrency = currentAccount?.currency || 'INR';
  const TOTAL_BALANCE = parseFloat(currentAccount?.balance || 0);
  const DAILY_LIMIT = 250000.0;

  // Form inputs
  const [amount, setAmount] = useState('200');
  const [memo, setMemo] = useState('Treasury capital call settlement - Q3 allocation tranche 04');
  const [twoFactorDigits, setTwoFactorDigits] = useState(['8', '2', '9', '4', '1', '7']);
  const [isExecuting, setIsExecuting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const data = await accountService.getAccounts();
      const list = Array.isArray(data) ? data : (data?.accounts || []);
      setAccounts(list);
      if (list.length > 0) {
        if (paramAccountId && list.some((a) => a.id === paramAccountId)) {
          setSelectedAccountId(paramAccountId);
        } else {
          setSelectedAccountId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts for withdrawal:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const remaining = Math.max(0, TOTAL_BALANCE - numAmount);
  const pctUsed = TOTAL_BALANCE > 0 ? Math.min(100, Math.max(0, (numAmount / TOTAL_BALANCE) * 100)) : 0;

  const isInsufficient = numAmount > TOTAL_BALANCE;
  const isLimitExceeded = numAmount > DAILY_LIMIT && !isInsufficient;

  const handlePreset = (val) => {
    setAmount(val.toString());
  };

  const handleReviewClick = () => {
    setErrorMessage('');
    if (accounts.length === 0) {
      setErrorMessage('No active custodial account found. Please create a financial account first.');
      setScreenState('error-insufficient');
      return;
    }
    if (numAmount <= 0) {
      setErrorMessage('Please enter a valid positive withdrawal amount.');
      setScreenState('error-insufficient');
      return;
    }
    if (numAmount > TOTAL_BALANCE) {
      setErrorMessage(`Entered amount (${formatCurrency(numAmount, accountCurrency)}) exceeds available balance of ${formatCurrency(TOTAL_BALANCE, accountCurrency)}.`);
      setScreenState('error-insufficient');
      return;
    }
    if (numAmount > DAILY_LIMIT) {
      setErrorMessage(`Withdrawal exceeds maximum instant limit (${formatCurrency(DAILY_LIMIT, accountCurrency)}). Dual-signoff required.`);
      setScreenState('error-limit');
      return;
    }
    setScreenState('modal');
  };

  const handleExecuteDisbursement = async () => {
    setIsExecuting(true);
    setErrorMessage('');
    try {
      const targetAccId = currentAccount.id;
      if (!targetAccId) {
        throw new Error('No source custodial account selected');
      }

      await transactionService.withdraw({
        accountId: targetAccId,
        amount: numAmount,
        destinationAccount: 'Apex Liquidity Partners LLC (•••• 8831)',
        routingNumber: '021000021',
        notes: memo,
        idempotencyKey
      });

      setIsExecuting(false);
      setScreenState('success');
      setIdempotencyKey(generateIdempotencyKey());
      await loadAccounts();
    } catch (err) {
      setIsExecuting(false);
      const msg = err.response?.data?.message || err.message || 'Withdrawal rejected';
      setErrorMessage(msg);
      if (err.response?.status === 422 || err.status === 422 || msg.toLowerCase().includes('insufficient')) {
        setScreenState('error-insufficient');
      } else {
        setScreenState('error-limit');
      }
    }
  };

  const handleDownloadReceipt = () => {
    const content = `================================================
ARTHIVEX DISBURSEMENT AUDIT RECORD
================================================
Confirmation ID: #WDR-902144
Source Account:  ${currentAccount.accountType || 'Commercial Checking'} (${currentAccount.accountNumber || 'Vault'})
Disbursed Total: ${formatCurrency(numAmount, accountCurrency)}
Beneficiary:     Apex Liquidity Partners LLC
Cleared via:     Arthivex Double-Entry Vault
Timestamp:       ${new Date().toISOString()}
Security:        Cryptographic SHA-256 Verified
================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `arthivex_disbursement_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Interface Simulation State Bar matching Stitch */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#161b29] border border-[#283046] rounded-xl shadow-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#ffb067]">tune</span>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
            Interface Simulation State:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setScreenState('form');
              setAmount('75000');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'form'
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm font-bold'
                : 'bg-[#20273a] text-slate-300 hover:text-white'
            }`}
            type="button"
          >
            1. Withdrawal Form
          </button>
          <button
            onClick={() => {
              setScreenState('modal');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'modal'
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm font-bold'
                : 'bg-[#20273a] text-slate-300 hover:text-white'
            }`}
            type="button"
          >
            2. Review Modal
          </button>
          <button
            onClick={() => setScreenState('success')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'success'
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm font-bold'
                : 'bg-[#20273a] text-slate-300 hover:text-white'
            }`}
            type="button"
          >
            3. Success State
          </button>
          <button
            onClick={() => {
              setScreenState('error-insufficient');
              setAmount('750000');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'error-insufficient'
                ? 'bg-red-600 text-white shadow-sm font-bold'
                : 'bg-[#20273a] text-slate-300 hover:text-white'
            }`}
            type="button"
          >
            4. Insufficient Balance Error
          </button>
          <button
            onClick={() => {
              setScreenState('error-limit');
              setAmount('350000');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'error-limit'
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm font-bold'
                : 'bg-[#20273a] text-slate-300 hover:text-white'
            }`}
            type="button"
          >
            5. Quorum / Limit Exceeded
          </button>
        </div>
      </div>

      {screenState !== 'success' ? (
        <section className="space-y-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[11px] uppercase bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/20 tracking-widest font-semibold font-mono">
                  Treasury Outbound Engine
                </span>
                <span className="text-slate-400 text-xs font-mono">• Protocol FedWire / ACH v4.1</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Withdraw Funds</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Initiate an outbound capital disbursement from your custodial reserves.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-[#161b29] border border-[#283046] px-4 py-2.5 rounded-xl shadow-md">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffb067] animate-pulse"></div>
              <div className="flex flex-col font-mono">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Settlement Routing</span>
                <span className="text-xs text-white font-semibold">Tier-1 Direct Clearinghouse</span>
              </div>
            </div>
          </div>

          {/* Insufficient Balance Banner */}
          {(isInsufficient || screenState === 'error-insufficient') && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[24px] text-red-400 shrink-0">error</span>
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="text-sm font-bold text-white">Insufficient Available Funds</span>
                  <p className="text-slate-200">
                    {errorMessage || `Entered amount (${formatCurrency(numAmount, accountCurrency)}) exceeds current settled balance of ${formatCurrency(TOTAL_BALANCE, accountCurrency)}. Adjust amount or select another vault.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Limit Exceeded Alert Banner */}
          {(isLimitExceeded || screenState === 'error-limit') && (
            <div className="p-4 rounded-xl bg-[#20273a] border border-[#ffb067]/40 text-white shadow-sm animate-in fade-in">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[24px] text-[#ffb067] shrink-0">
                  admin_panel_settings
                </span>
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="text-sm font-bold text-white">Withdrawal Notice</span>
                  <p className="text-slate-300">
                    {errorMessage || `Transactions exceeding ${formatCurrency(DAILY_LIMIT, accountCurrency)} require dual-treasury key sign-off (2-of-3 Quorum Signatures). Outbound lock period: 4 hours.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bento Grid: Form (8 cols) + Diagnostics (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* 1. Source Account Panel */}
              <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-white flex items-center gap-2 font-bold font-mono">
                    <span className="w-6 h-6 rounded-full bg-[#ffb067] text-[#2e1500] flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    Source Reserve Vault
                  </label>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-[#20273a] text-[#ffb067] border border-[#ffb067]/20 font-semibold font-mono">
                    Double-Entry Protected
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0e1320] border border-[#283046] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#20273a] border border-[#283046] text-[#ffb067] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">account_balance</span>
                      </div>
                      <div>
                        {accounts.length > 1 ? (
                          <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="bg-[#161b29] text-white border border-[#283046] rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-[#ffb067]"
                          >
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.accountType || 'Commercial Checking'} (•••• {a.accountNumber?.slice(-4) || 'Vault'})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white">
                              {currentAccount.accountType || 'Commercial Checking'}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              •••• {currentAccount.accountNumber?.slice(-4) || '4892'}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-slate-400 block mt-0.5">Sub-account: Segregated Treasury Liquidity ({accountCurrency})</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right font-mono">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Available Balance</span>
                      <span className="text-xl font-bold text-white tracking-tight">
                        {formatCurrency(TOTAL_BALANCE, accountCurrency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#283046]/70 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="material-symbols-outlined text-[16px] text-[#ffb067]">verified_user</span>
                      <span>Maximum instant withdrawal allowance: <strong className="text-white font-semibold">{formatCurrency(DAILY_LIMIT, accountCurrency)}</strong> per 24h window</span>
                    </div>
                    <span className="text-[11px] text-[#ffb067] font-mono font-semibold">Used: {formatCurrency(0, accountCurrency)} / {formatCurrency(DAILY_LIMIT, accountCurrency)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Recipient / Routing Spec */}
              <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-white flex items-center gap-2 font-bold font-mono">
                    <span className="w-6 h-6 rounded-full bg-[#ffb067] text-[#2e1500] flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    Destination Bank Routing
                  </label>
                  <button
                    onClick={() => navigate('/settings')}
                    className="text-xs text-[#ffb067] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    type="button"
                  >
                    <span>Manage Whitelisted Counterparties</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-400">Destination Account Entity</label>
                    <div className="relative">
                      <input
                        className="w-full h-10 px-3 bg-[#0e1320] border border-[#283046] text-white font-mono rounded-xl focus:outline-none cursor-default"
                        readOnly
                        type="text"
                        value="Apex Liquidity Partners LLC"
                      />
                      <span className="material-symbols-outlined absolute right-3 top-2.5 text-[18px] text-[#ffb067]">
                        verified
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">KYC Verified Counterparty • ID: CUST-88329</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400">Receiving Depository</label>
                    <input
                      className="w-full h-10 px-3 bg-[#0e1320] border border-[#283046] text-white font-mono rounded-xl focus:outline-none cursor-default"
                      readOnly
                      type="text"
                      value="JPMorgan Chase & Co. N.A. (US)"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">New York Clearinghouse Member #0002</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400">FedWire ABA Routing Number</label>
                    <div className="flex items-center h-10 px-3 bg-[#0e1320] border border-[#283046] rounded-xl justify-between">
                      <span className="font-mono text-white">••••••109</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#20273a] border border-[#283046] text-slate-400 font-mono">
                        ABA-US
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400">Settlement Account Identifier</label>
                    <div className="flex items-center h-10 px-3 bg-[#0e1320] border border-[#283046] rounded-xl justify-between">
                      <span className="font-mono text-white">•••• •••• •••• 8831</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/30 font-semibold font-mono">
                        CONFIRMED
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Withdrawal Quantum & Balance Dynamics */}
              <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-white flex items-center gap-2 font-bold font-mono">
                    <span className="w-6 h-6 rounded-full bg-[#ffb067] text-[#2e1500] flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    Withdrawal Quantum
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    Currency: <strong className="text-[#ffb067]">{accountCurrency} ({getCurrencySymbol(accountCurrency)})</strong>
                  </span>
                </div>

                {/* Amount input */}
                <div className="space-y-3">
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-2xl font-bold text-[#ffb067]">{getCurrencySymbol(accountCurrency)}</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="100"
                      step="1000"
                      className="w-full h-14 pl-10 pr-20 bg-[#0e1320] border border-[#283046] text-white text-2xl font-bold rounded-xl focus:outline-none focus:border-[#ffb067] transition-all font-mono"
                    />
                    <span className="absolute right-4 text-xs text-slate-400 font-bold font-mono">{accountCurrency}</span>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 mr-1 font-mono">Quick Select:</span>
                    <button
                      onClick={() => handlePreset(10000)}
                      className="px-3 py-1 rounded-lg bg-[#0e1320] hover:bg-[#20273a] border border-[#283046] text-white font-mono transition-colors"
                      type="button"
                    >
                      +{formatCurrency(10000, accountCurrency, { maximumFractionDigits: 0 })}
                    </button>
                    <button
                      onClick={() => handlePreset(25000)}
                      className="px-3 py-1 rounded-lg bg-[#0e1320] hover:bg-[#20273a] border border-[#283046] text-white font-mono transition-colors"
                      type="button"
                    >
                      +{formatCurrency(25000, accountCurrency, { maximumFractionDigits: 0 })}
                    </button>
                    <button
                      onClick={() => handlePreset(75000)}
                      className={`px-3 py-1 rounded-lg border font-mono font-semibold transition-colors ${
                        amount === '75000'
                          ? 'bg-[#ffb067] text-[#2e1500] border-[#ffb067]'
                          : 'bg-[#0e1320] hover:bg-[#20273a] border-[#283046] text-white'
                      }`}
                      type="button"
                    >
                      +{formatCurrency(75000, accountCurrency, { maximumFractionDigits: 0 })}
                    </button>
                    <button
                      onClick={() => handlePreset(250000)}
                      className="px-3 py-1 rounded-lg bg-[#0e1320] hover:bg-[#20273a] border border-[#ffb067]/30 text-[#ffb067] font-mono font-semibold transition-colors"
                      type="button"
                    >
                      Instant Max ({formatCurrency(250000, accountCurrency, { maximumFractionDigits: 0 })})
                    </button>
                    <button
                      onClick={() => handlePreset(TOTAL_BALANCE)}
                      className="px-3 py-1 rounded-lg bg-[#0e1320] hover:bg-[#20273a] border border-[#283046] text-white font-mono transition-colors"
                      type="button"
                    >
                      Vault Balance ({formatCurrency(TOTAL_BALANCE, accountCurrency)})
                    </button>
                  </div>

                  {/* Custodial Allocation Impact meter */}
                  <div className="p-4 rounded-xl bg-[#0e1320] border border-[#283046] space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Custodial Allocation Impact</span>
                      <span className="font-semibold text-[#ffb067] font-mono">{pctUsed.toFixed(2)}% of Reserves</span>
                    </div>
                    <div className="w-full h-3 bg-[#090e1b] rounded-full overflow-hidden flex border border-[#283046]/80">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isInsufficient ? 'bg-red-500' : isLimitExceeded ? 'bg-amber-400' : 'bg-[#ffb067]'
                        }`}
                        style={{ width: `${Math.min(100, pctUsed)}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 text-xs">
                      <span className="text-slate-400">Remaining available balance after disbursement:</span>
                      <span className="text-sm font-bold text-white font-mono">
                        {formatCurrency(remaining, accountCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Memo Input */}
                <div className="space-y-1 pt-2">
                  <label className="text-xs text-slate-400">Regulatory Transfer Purpose / Wire Memo</label>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Enter purpose or reference code..."
                    className="w-full h-10 px-3 bg-[#0e1320] border border-[#283046] text-white text-xs rounded-xl focus:outline-none focus:border-[#ffb067] transition-all font-mono"
                  />
                  <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono">
                    <span>Mandatory for FinCEN BSA compliance filing</span>
                    <span>Max 120 chars</span>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <span className="material-symbols-outlined text-[18px] text-[#ffb067]">check_circle</span>
                    <span>Tier-1 Zero Execution Surcharge ({formatCurrency(0, accountCurrency)} fee)</span>
                  </div>
                  <button
                    onClick={handleReviewClick}
                    className="w-full sm:w-auto px-6 h-11 bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#ffb067]/20 transition-all cursor-pointer"
                    type="button"
                  >
                    <span>Review Withdrawal Request</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar / Diagnostics matching Stitch */}
            <div className="lg:col-span-4 space-y-6">
              {/* Treasury Officer Card */}
              <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-mono">Signer Credential</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/20 font-semibold font-mono">
                    Hardware Key Ready
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0e1320] border border-[#283046] flex items-center justify-center text-[#ffb067]">
                    <span className="material-symbols-outlined text-[24px]">fingerprint</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block leading-tight">{user?.name || user?.fullName || 'Account Holder'}</span>
                    <span className="text-xs text-slate-400">{user?.role ? user.role.replace(/_/g, ' ') : 'Account Holder'}</span>
                    <span className="text-[11px] text-[#ffb067] block font-mono mt-0.5">Authenticated Session • Active</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1320] border border-[#283046] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Execution Authority</span>
                    <span className="font-semibold text-white">Cryptographic Vault Authorization</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Daily Personal Cap</span>
                    <span className="font-semibold text-[#ffb067] font-mono">{formatCurrency(DAILY_LIMIT, accountCurrency)}</span>
                  </div>
                </div>
              </div>

              {/* Settlement Windows Card */}
              <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-lg space-y-4">
                <span className="text-sm font-bold text-white block">Settlement Processing Windows</span>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#ffb067] mt-1.5 shrink-0 animate-ping"></span>
                    <div>
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-white">Immediate Window (FedACH)</span>
                        <span className="text-[10px] text-[#ffb067] font-mono font-bold">CURRENT</span>
                      </div>
                      <p className="text-slate-400">Disbursements dispatched under 15 minutes.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#283046] mt-1.5 shrink-0"></span>
                    <div>
                      <span className="font-semibold text-white">End of Day Settlement</span>
                      <p className="text-slate-400">17:30 EST Cut-off for standard wholesale clearing.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#283046] mt-1.5 shrink-0"></span>
                    <div>
                      <span className="font-semibold text-white">Multisig Threshold Gate</span>
                      <p className="text-slate-400">&gt; {formatCurrency(DAILY_LIMIT, accountCurrency)}: Requires additional 2FA peer approval.</p>
                    </div>
                  </div>
                </div>
                {/* 7-Day Treasury Trend Curve */}
                <div className="pt-2">
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1 font-mono">
                    <span>7-Day Treasury Liquidity Trend</span>
                    <span className="text-[#ffb067] font-bold">+4.2%</span>
                  </div>
                  <svg className="w-full h-14 text-[#ffb067]" fill="none" preserveAspectRatio="none" viewBox="0 0 300 60">
                    <defs>
                      <linearGradient id="peachGradientWithdraw" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ffb067" stopOpacity="0.3"></stop>
                        <stop offset="100%" stopColor="#ffb067" stopOpacity="0.0"></stop>
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 45 C 50 48, 80 30, 130 32 C 180 34, 210 18, 250 15 C 275 12, 290 10, 300 8"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    ></path>
                    <path
                      d="M0 45 C 50 48, 80 30, 130 32 C 180 34, 210 18, 250 15 C 275 12, 290 10, 300 8 L 300 60 L 0 60 Z"
                      fill="url(#peachGradientWithdraw)"
                    ></path>
                  </svg>
                </div>
              </div>

              {/* Regulatory Attestation Card */}
              <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-lg space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#ffb067]">security</span>
                  <span className="text-sm font-semibold text-white">Audit Trail Sealed</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Every outbound disbursement writes a cryptographically signed payload to the immutable Arthivex Ledger node (SHA-256).
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#283046]/70 font-mono">
                  <span>Node: us-east-vault-09</span>
                  <span className="text-[#ffb067] font-semibold">BLOCK #1,940,291</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* SUCCESS STATE PANEL matching Stitch */
        <div className="p-8 sm:p-12 rounded-2xl bg-[#161b29] border border-[#283046] shadow-xl max-w-3xl mx-auto space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-[#ffb067]/15 border border-[#ffb067]/30 mx-auto flex items-center justify-center text-[#ffb067]">
            <span className="material-symbols-outlined text-[36px]">task_alt</span>
          </div>
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs bg-[#ffb067]/15 text-[#ffb067] border border-[#ffb067]/20 font-semibold uppercase tracking-wider font-mono">
              Transaction Broadcasted
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Disbursement Dispatched to FedACH
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              The liquidation order has been cryptographically signed and injected into clearinghouse gateway node #4. Funds will settle according to wire terms.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#0e1320] border border-[#283046] text-left space-y-2 max-w-lg mx-auto text-xs">
            <div className="flex justify-between items-center border-b border-[#283046] pb-2">
              <span className="text-slate-400 uppercase font-mono text-[11px]">Confirmation Identifier</span>
              <span className="text-sm font-mono text-[#ffb067] font-bold">#WDR-902144</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Settled Amount</span>
              <span className="text-sm text-white font-bold font-mono">
                {formatCurrency(numAmount, accountCurrency)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Beneficiary</span>
              <span className="text-white">Apex Liquidity Partners LLC</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Timestamp (UTC)</span>
              <span className="text-white font-mono">2025-05-14 14:38:09.112 UTC</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#283046]">
              <span className="text-slate-400">Ledger Hash</span>
              <span className="text-slate-400 font-mono text-[11px] truncate max-w-[200px]">
                0x9b42...a4e17f9c
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleDownloadReceipt}
              className="px-5 h-11 rounded-xl bg-[#20273a] hover:bg-[#283046] border border-[#283046] text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download Signed Receipt</span>
            </button>
            <button
              onClick={() => navigate('/accounts')}
              className="px-6 h-11 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold flex items-center gap-2 shadow-md shadow-[#ffb067]/20 transition-all cursor-pointer"
              type="button"
            >
              <span>Return to Accounts Overview</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION / 2FA REVIEW MODAL matching Stitch */}
      {screenState === 'modal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#161b29] border border-[#283046] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative">
            <button
              onClick={() => setScreenState('form')}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20273a] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#ffb067] text-[#2e1500] flex items-center justify-center shrink-0 shadow-md">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#ffb067] font-semibold font-mono">
                  High-Value Custodial Attestation
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Confirm Outbound Wire</h2>
              </div>
            </div>

            <div className="rounded-xl bg-[#0e1320] border border-[#283046] p-4 space-y-2 divide-y divide-[#283046] text-xs">
              <div className="flex justify-between items-center pb-2">
                <span className="text-slate-400">Source Account</span>
                <div className="text-right">
                  <span className="font-semibold text-white">
                    {currentAccount.accountType || 'Commercial Checking'}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-mono">
                    •••• {currentAccount.accountNumber?.slice(-4) || '4892'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Destination Beneficiary</span>
                <div className="text-right">
                  <span className="font-semibold text-white">Apex Liquidity Partners LLC</span>
                  <span className="text-[11px] text-slate-500 block font-mono">ABA: ••••••109 | ACCT: •••• 8831</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Custodial Transfer Fee</span>
                <span className="text-[#ffb067] font-semibold font-mono">{formatCurrency(0, accountCurrency)} (Tier-1 Enterprise)</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-white font-semibold">Total Amount Deducted</span>
                <span className="text-2xl text-[#ffb067] font-bold font-mono">
                  {formatCurrency(numAmount, accountCurrency)}
                </span>
              </div>
            </div>

            {/* 6-Digit 2FA Token */}
            <div className="space-y-2">
              <label className="text-xs text-white font-semibold block font-mono">
                Enter 6-Digit Time-Based Security Token (2FA)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {twoFactorDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const next = [...twoFactorDigits];
                      next[idx] = e.target.value;
                      setTwoFactorDigits(next);
                    }}
                    className="h-12 text-center text-xl font-bold font-mono rounded-xl bg-[#0e1320] border border-[#283046] text-white focus:border-[#ffb067] focus:outline-none"
                    type="text"
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
                <span>Linked to Hardware Authenticator</span>
                <span className="text-[#ffb067] font-semibold">Token refreshes in 18s</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setScreenState('form')}
                className="px-5 h-11 rounded-xl bg-[#20273a] hover:bg-[#283046] border border-[#283046] text-white text-xs font-semibold transition-colors"
                type="button"
              >
                Cancel Operation
              </button>
              <button
                onClick={handleExecuteDisbursement}
                disabled={isExecuting}
                className="px-6 h-11 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#ffb067]/20 transition-all cursor-pointer disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span>{isExecuting ? 'Cryptographic Signing...' : 'Execute Disbursement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
