import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { accountService } from '../services/accountService';
import { transactionService } from '../services/transactionService';
import { generateIdempotencyKey } from '../services/apiClient';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyFormatter';

export default function DepositPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramAccountId = searchParams.get('accountId');

  // State switcher: 'form', 'review', 'success', 'error-limit', 'error-gateway'
  const [screenState, setScreenState] = useState('form');

  // Accounts List
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Form Fields
  const [selectedVault, setSelectedVault] = useState('');
  const [transferRail, setTransferRail] = useState('ach'); // 'ach', 'fedwire', 'escrow'
  const [amount, setAmount] = useState('1,000.00');
  const [reference, setReference] = useState('Working Capital Inbound Deposit');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [errorMessage, setErrorMessage] = useState('');

  // Active account and currency
  const activeAccount = accounts.find((a) => a.id === selectedVault) || accounts[0] || {};
  const accountCurrency = activeAccount.currency || 'INR';

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Success Voucher Data
  const [successVoucher, setSuccessVoucher] = useState({
    id: '#DEP-2024-99120',
    amount: formatCurrency(1000, 'INR'),
    vault: 'Commercial Checking •••• 4892',
    method: 'ACH Electronic Clearing',
    eta: 'Tomorrow, 09:30 AM EST'
  });

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
          setSelectedVault(paramAccountId);
        } else {
          setSelectedVault(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts for deposit:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handlePreset = (presetAmt) => {
    setAmount(presetAmt);
  };

  const handleOpenReview = (e) => {
    e?.preventDefault();
    setErrorMessage('');
    const cleanNum = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(cleanNum) || cleanNum <= 0) {
      setErrorMessage('Please enter a valid positive deposit amount.');
      setScreenState('error-limit');
      return;
    }
    if (cleanNum > 500000 && transferRail === 'ach') {
      setErrorMessage(`ACH clearing limit exceeded (${formatCurrency(500000, accountCurrency)} maximum). Please select Wire Transfer for larger amounts.`);
      setScreenState('error-limit');
      return;
    }
    if (!selectedVault && accounts.length === 0) {
      setErrorMessage('No active custody account found. Please create or link an account first.');
      setScreenState('error-limit');
      return;
    }
    setShowReviewModal(true);
  };

  const handleExecuteDeposit = async () => {
    setIsExecuting(true);
    setErrorMessage('');
    try {
      const cleanNum = parseFloat(amount.replace(/,/g, '')) || 1000;
      const targetAccId = selectedVault || (accounts.length > 0 ? accounts[0].id : null);
      if (!targetAccId) {
        throw new Error('No target account selected');
      }

      const res = await transactionService.deposit({
        accountId: targetAccId,
        amount: cleanNum,
        description: reference,
        sourceMethod: transferRail,
        idempotencyKey
      });

      const selectedAcc = accounts.find(a => a.id === targetAccId);
      const accDisplay = selectedAcc 
        ? `${selectedAcc.accountType || 'Commercial Checking'} •••• ${selectedAcc.accountNumber?.slice(-4) || 'Vault'}`
        : 'Arthivex Custodial Account';

      const railNames = {
        'ach': 'ACH Electronic Clearing',
        'fedwire': 'Wire Transfer Settlement',
        'escrow': 'Internal Vault Clearing'
      };

      setSuccessVoucher({
        id: res?.reference || res?.transactionId || res?.id || `#DEP-${Date.now().toString().slice(-6)}`,
        amount: formatCurrency(cleanNum, selectedAcc?.currency || accountCurrency),
        vault: accDisplay,
        method: railNames[transferRail] || 'ACH Electronic Clearing',
        eta: transferRail === 'fedwire' ? 'Immediate (< 15 mins)' : 'Tomorrow, 09:30 AM EST'
      });

      setShowReviewModal(false);
      setScreenState('success');
      setIdempotencyKey(generateIdempotencyKey());
    } catch (err) {
      setShowReviewModal(false);
      const msg = err.response?.data?.message || err.message || 'Deposit gateway operation failed';
      setErrorMessage(msg);
      if (err.isNetworkError || err.status === 504) {
        setScreenState('error-gateway');
      } else {
        setScreenState('error-limit');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const resetForm = () => {
    setAmount('1,000.00');
    setReference('Working Capital Inbound Deposit');
    if (accounts.length > 0) {
      setSelectedVault(accounts[0].id);
    }
    setTransferRail('ach');
    setErrorMessage('');
    setScreenState('form');
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Header & State Simulator Strip matching Stitch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] text-[#ffb067] bg-[#ffb067]/15 border border-[#ffb067]/30 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
              Treasury Settlement Tier-1
            </span>
            <span className="text-xs text-slate-400 font-mono">
              • Electronic Clearing & Wire Settlement
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Deposit Funds
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Initiate a secure verified inbound deposit into your Arthivex custodial accounts.
          </p>
        </div>

        {/* Preview State Switcher Pill Group matching Stitch */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm self-start lg:self-auto">
          <span className="text-xs text-slate-400 px-2 uppercase tracking-wider font-mono font-semibold">
            Preview State:
          </span>
          <button
            onClick={() => {
              setScreenState('form');
              setShowReviewModal(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'form' && !showReviewModal
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            type="button"
          >
            1. Form
          </button>
          <button
            onClick={() => {
              setScreenState('form');
              setShowReviewModal(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showReviewModal
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            type="button"
          >
            2. Review Modal
          </button>
          <button
            onClick={() => {
              setScreenState('success');
              setShowReviewModal(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'success'
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            type="button"
          >
            3. Success
          </button>
          <button
            onClick={() => {
              setScreenState('error-limit');
              setShowReviewModal(false);
              setAmount('750,000.00');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'error-limit'
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            type="button"
          >
            4. Limit Error
          </button>
          <button
            onClick={() => {
              setScreenState('error-gateway');
              setShowReviewModal(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              screenState === 'error-gateway'
                ? 'bg-[#ffb067] text-[#2e1500] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            type="button"
          >
            5. Gateway Fail
          </button>
        </div>
      </div>

      {/* Threshold Validation Exception Alert Banner */}
      {screenState === 'error-limit' && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 shadow-sm flex items-start justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-red-400 shrink-0 mt-0.5">error</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-red-200">
                Deposit Validation Notice
              </span>
              <span className="text-xs text-slate-300 mt-0.5">
                {errorMessage || `Deposit amount must be greater than ${formatCurrency(0, accountCurrency)} and cannot exceed the single-transaction clearing limit.`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setScreenState('form')}
            className="text-slate-400 hover:text-white"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Gateway Timeout Alert Banner */}
      {screenState === 'error-gateway' && (
        <div className="p-4 rounded-xl bg-[#161b29] border border-red-500/40 text-slate-200 shadow-sm flex items-start gap-4 animate-in fade-in">
          <div className="h-9 w-9 rounded-lg bg-red-950/80 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400">
            <span className="material-symbols-outlined text-[20px]">cloud_off</span>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                Deposit Gateway Connection Error
              </span>
              <span className="text-[10px] bg-red-950/80 text-red-400 px-2 py-0.5 rounded font-bold uppercase border border-red-500/30 font-mono">
                Connection Error
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-1">
              {errorMessage || 'Unable to complete deposit transaction. Your local balances remain unchanged. No debit recorded.'}
            </span>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setScreenState('form')}
                className="h-8 px-3 rounded-lg bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span> Retry Handshake
              </button>
              <button
                onClick={() => setScreenState('form')}
                className="text-xs text-slate-400 hover:text-white"
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Form / Success on Left, Telemetry & Info on Right */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
          {screenState !== 'success' ? (
            /* MAIN FORM CARD matching Stitch */
            <div className="bg-[#161b29] border border-[#283046] rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col gap-6">
              {/* Step 1: Destination Custodial Vault */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 font-bold font-mono">
                    <span className="h-5 w-5 rounded-full bg-[#20273a] text-[#ffb067] border border-[#283046] flex items-center justify-center text-[11px] font-bold">
                      1
                    </span>
                    Destination Custodial Vault
                  </label>
                  <span className="text-[11px] text-[#ffb067] bg-[#ffb067]/10 border border-[#ffb067]/30 px-2 py-0.5 rounded font-mono font-medium">
                    Double-Entry Protected
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedVault}
                    onChange={(e) => setSelectedVault(e.target.value)}
                    className="w-full h-14 pl-4 pr-10 bg-[#0e1320] text-white border border-[#283046] text-sm sm:text-base font-semibold rounded-xl focus:outline-none focus:border-[#ffb067] appearance-none cursor-pointer"
                  >
                    {accounts.length > 0 ? (
                      accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountType || 'Commercial Checking'} •••• {acc.accountNumber?.slice(-4) || 'Vault'} — Available: {formatCurrency(acc.balance, acc.currency || 'INR')}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {loadingAccounts ? 'Loading custodial accounts...' : 'No active account found'}
                      </option>
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-4 text-[22px] text-slate-400 pointer-events-none">
                    unfold_more
                  </span>
                </div>
                <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-mono">
                  <span>Clearing Route: <strong className="text-white">FG-CLEARING-NODE-01</strong></span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#ffb067]"></span>
                    Live Liquidity Pool
                  </span>
                </div>
              </div>

              {/* Step 2: Deposit Transfer Rail */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 font-bold font-mono">
                    <span className="h-5 w-5 rounded-full bg-[#20273a] text-[#ffb067] border border-[#283046] flex items-center justify-center text-[11px] font-bold">
                      2
                    </span>
                    Deposit Transfer Rail
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">Real-Time Ingestion</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* ACH Electronic */}
                  <label
                    onClick={() => setTransferRail('ach')}
                    className={`group relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                      transferRail === 'ach'
                        ? 'bg-[#ffb067] text-[#2e1500] border-[#ffb067]'
                        : 'bg-[#0e1320] border-[#283046] hover:border-[#ffb067]/60 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className={`material-symbols-outlined text-[24px] ${transferRail === 'ach' ? 'text-[#2e1500]' : 'text-[#ffb067]'}`}>
                        account_balance
                      </span>
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                        transferRail === 'ach'
                          ? 'bg-[#2e1500]/15 border-[#2e1500]/30 text-[#2e1500]'
                          : 'bg-[#20273a] border-[#283046] text-[#ffb067]'
                      }`}>
                        ACTIVE
                      </span>
                    </div>
                    <span className="text-base font-bold leading-tight">ACH Electronic</span>
                    <span className={`text-xs mt-1 ${transferRail === 'ach' ? 'text-[#2e1500]/80' : 'text-slate-400'}`}>
                      1–2 Business Days
                    </span>
                    <div className={`mt-4 pt-2 flex items-center justify-between border-t ${
                      transferRail === 'ach' ? 'border-[#2e1500]/20' : 'border-[#283046]'
                    }`}>
                      <span className="text-[11px] font-mono">Fee: Free</span>
                      <span className="text-[11px] font-mono font-bold">Max {formatCurrency(500000, accountCurrency, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </label>

                  {/* FedWire Wire */}
                  <label
                    onClick={() => setTransferRail('fedwire')}
                    className={`group relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                      transferRail === 'fedwire'
                        ? 'bg-[#ffb067] text-[#2e1500] border-[#ffb067]'
                        : 'bg-[#0e1320] border-[#283046] hover:border-[#ffb067]/60 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className={`material-symbols-outlined text-[24px] ${transferRail === 'fedwire' ? 'text-[#2e1500]' : 'text-[#ffb067]'}`}>
                        bolt
                      </span>
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                        transferRail === 'fedwire'
                          ? 'bg-[#2e1500]/15 border-[#2e1500]/30 text-[#2e1500]'
                          : 'bg-[#20273a] border-[#283046] text-slate-400'
                      }`}>
                        EXPEDITED
                      </span>
                    </div>
                    <span className="text-base font-bold leading-tight">Wire Transfer</span>
                    <span className={`text-xs mt-1 ${transferRail === 'fedwire' ? 'text-[#2e1500]/80' : 'text-slate-400'}`}>
                      Immediate Settlement
                    </span>
                    <div className={`mt-4 pt-2 flex items-center justify-between border-t ${
                      transferRail === 'fedwire' ? 'border-[#2e1500]/20' : 'border-[#283046]'
                    }`}>
                      <span className="text-[11px] font-mono">Fee: Free</span>
                      <span className="text-[11px] font-mono font-bold">No Limit</span>
                    </div>
                  </label>

                  {/* Corporate Escrow */}
                  <label
                    onClick={() => setTransferRail('escrow')}
                    className={`group relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                      transferRail === 'escrow'
                        ? 'bg-[#ffb067] text-[#2e1500] border-[#ffb067]'
                        : 'bg-[#0e1320] border-[#283046] hover:border-[#ffb067]/60 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className={`material-symbols-outlined text-[24px] ${transferRail === 'escrow' ? 'text-[#2e1500]' : 'text-[#ffb067]'}`}>
                        shield_with_heart
                      </span>
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                        transferRail === 'escrow'
                          ? 'bg-[#2e1500]/15 border-[#2e1500]/30 text-[#2e1500]'
                          : 'bg-[#20273a] border-[#283046] text-slate-400'
                      }`}>
                        TRUST
                      </span>
                    </div>
                    <span className="text-base font-bold leading-tight">Corporate Escrow</span>
                    <span className={`text-xs mt-1 ${transferRail === 'escrow' ? 'text-[#2e1500]/80' : 'text-slate-400'}`}>
                      Direct Custody Inbound
                    </span>
                    <div className={`mt-4 pt-2 flex items-center justify-between border-t ${
                      transferRail === 'escrow' ? 'border-[#2e1500]/20' : 'border-[#283046]'
                    }`}>
                      <span className="text-[11px] font-mono">Multi-Sig</span>
                      <span className="text-[11px] font-mono font-bold">Certified</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 3: Deposit Amount */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 font-bold font-mono">
                    <span className="h-5 w-5 rounded-full bg-[#20273a] text-[#ffb067] border border-[#283046] flex items-center justify-center text-[11px] font-bold">
                      3
                    </span>
                    Deposit Amount
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    Tier Daily Ceiling: <strong className="text-white">{formatCurrency(1500000, accountCurrency)}</strong>
                  </span>
                </div>
                <div className="relative flex items-center rounded-xl bg-[#0e1320] border border-[#283046] p-2">
                  <span className="pl-4 text-3xl font-bold text-[#ffb067] select-none">{getCurrencySymbol(accountCurrency)}</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent pl-2 pr-20 text-3xl text-white focus:outline-none tracking-tight font-bold font-mono"
                  />
                  <div className="absolute right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161b29] border border-[#283046] text-white text-xs font-mono shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#ffb067]"></span> {accountCurrency}
                  </div>
                </div>
                {/* Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {['10000.00', '25000.00', '50000.00', '100000.00'].map((preset) => {
                    const clean = parseFloat(preset);
                    const formatted = clean.toLocaleString(accountCurrency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2 });
                    const isSelected = amount === formatted || amount === preset;
                    return (
                      <button
                        key={preset}
                        onClick={() => handlePreset(formatted)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors border ${
                          isSelected
                            ? 'bg-[#ffb067] text-[#2e1500] border-[#ffb067]'
                            : 'bg-[#0e1320] border-[#283046] hover:bg-[#20273a] text-slate-300 hover:text-white'
                        }`}
                        type="button"
                      >
                        {formatCurrency(clean, accountCurrency, { maximumFractionDigits: 0 })}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      const inp = document.querySelector('input[type="text"]');
                      inp?.focus();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0e1320] border border-[#283046] hover:bg-[#20273a] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span> Custom
                  </button>
                </div>
              </div>

              {/* Step 4: Transaction Reference / General Ledger Memo */}
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 font-bold font-mono">
                  <span className="h-5 w-5 rounded-full bg-[#20273a] text-[#ffb067] border border-[#283046] flex items-center justify-center text-[11px] font-bold">
                    4
                  </span>
                  Transaction Reference / General Ledger Memo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Enter corporate ledger description or external invoice reference"
                    className="w-full h-11 px-4 bg-[#0e1320] border border-[#283046] text-white placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-[#ffb067] transition-all font-mono"
                  />
                  <span className="absolute right-3 top-3 text-[18px] text-slate-400 material-symbols-outlined">
                    edit_note
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  This metadata tag is immutable once confirmed by Arthivex Spring Security pipeline.
                </span>
              </div>

              {/* Compliance Attestation */}
              <div className="p-4 rounded-xl bg-[#0e1320] border border-[#283046] flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#ffb067]/15 border border-[#ffb067]/30 flex items-center justify-center shrink-0 text-[#ffb067]">
                  <span className="material-symbols-outlined text-[20px]">policy</span>
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-semibold text-white">Institutional Compliance Attestation</span>
                  <span className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Inbound funds are subject to automatic Arthivex AML screening and Spring Security v6.2 cryptographic verification rules. Assets settle directly into unhypothecated reserve balance.
                  </span>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={resetForm}
                  className="h-10 px-5 rounded-xl text-slate-400 hover:text-white hover:bg-[#20273a] text-xs font-semibold transition-colors"
                  type="button"
                >
                  Reset Values
                </button>
                <button
                  onClick={handleOpenReview}
                  className="h-10 px-6 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold flex items-center gap-2 shadow-md shadow-[#ffb067]/20 transition-all cursor-pointer"
                  type="button"
                >
                  <span>Review Deposit Details</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ) : (
            /* SUCCESS VIEW CARD matching Stitch */
            <div className="bg-[#161b29] border border-[#283046] rounded-2xl shadow-xl p-8 sm:p-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 rounded-full bg-[#ffb067]/15 border border-[#ffb067]/40 flex items-center justify-center text-[#ffb067] mb-4">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[#ffb067] bg-[#ffb067]/15 border border-[#ffb067]/30 px-2.5 py-0.5 rounded font-bold mb-2 font-mono">
                Deposit Ingestion Approved
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
                Inbound Deposit Scheduled
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
                The funds have been authenticated by the Arthivex Enterprise Vault and are en route to your operating liquidity reserve.
              </p>

              <div className="w-full max-w-lg bg-[#0e1320] border border-[#283046] rounded-xl p-5 flex flex-col gap-2.5 text-left mb-6 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#283046]">
                  <span className="text-slate-400">Reference Identifier</span>
                  <span className="font-mono text-[#ffb067] font-bold bg-[#161b29] border border-[#283046] px-2 py-0.5 rounded shadow-sm">
                    {successVoucher.id}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#283046]">
                  <span className="text-slate-400">Settlement Amount</span>
                  <span className="text-base text-white font-bold font-mono">
                    {successVoucher.amount}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#283046]">
                  <span className="text-slate-400">Target Vault</span>
                  <span className="text-white font-mono">{successVoucher.vault}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#283046]">
                  <span className="text-slate-400">Method / Protocol</span>
                  <span className="text-white">{successVoucher.method}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estimated Availability</span>
                  <span className="text-[#ffb067] font-semibold font-mono">{successVoucher.eta}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => setScreenState('form')}
                  className="h-10 px-5 rounded-xl bg-[#20273a] border border-[#283046] hover:bg-[#283046] text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span> Make Another Deposit
                </button>
                <button
                  onClick={() => navigate('/transactions')}
                  className="h-10 px-6 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span> View Transaction History
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Rail: Settlement Capacity, Security Framework, Recent Inbound matching Stitch */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
          {/* Settlement Capacity Card */}
          <div className="bg-[#161b29] border border-[#283046] rounded-2xl shadow-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">Settlement Capacity</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Rolling 24h</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Used Today: {formatCurrency(215790, accountCurrency)}</span>
                <span className="text-[#ffb067] font-mono font-semibold">14.3% Capacity</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0e1320] overflow-hidden">
                <div className="h-full bg-[#ffb067] rounded-full" style={{ width: '14.3%' }}></div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                {formatCurrency(1284210, accountCurrency)} remaining before enhanced verification
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#0e1320] border border-[#283046] flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
                Vault Liquidity Ratio
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white font-mono">99.84%</span>
                <span className="text-[11px] text-[#ffb067] bg-[#ffb067]/15 border border-[#ffb067]/30 px-2 py-0.5 rounded font-semibold font-mono">
                  OPTIMAL
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Tier-1 Capital Reserves verified by automated ledger auditing checks.
              </span>
            </div>
          </div>

          {/* Security Framework Card */}
          <div className="bg-[#161b29] border border-[#283046] rounded-2xl shadow-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">Security Framework</span>
              <span className="material-symbols-outlined text-[20px] text-[#ffb067]">verified_user</span>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] text-[#ffb067] mt-0.5">lock_clock</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-white">Zero-Knowledge Attestation</span>
                  <span className="text-slate-400">Transit payloads encrypted with Ephemeral Diffie-Hellman keys.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] text-[#ffb067] mt-0.5">token</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-white">Dual Signature Vault</span>
                  <span className="text-slate-400">Deposits above {formatCurrency(1000000, accountCurrency)} mandate co-signing by Treasury Officer.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] text-[#ffb067] mt-0.5">shield</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-white">Arthivex Shield & Vault</span>
                  <span className="text-slate-400">Strict deterministic validation via Spring Security v6.2.</span>
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0e1320] border border-[#283046] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#ffb067]"></span>
                <span className="text-white font-medium">SOC-2 Type II Certified</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">AUDIT 2024-Q1</span>
            </div>
          </div>

          {/* Inbound Clearing Information Card */}
          <div className="bg-[#161b29] border border-[#283046] rounded-2xl shadow-xl p-6 flex flex-col gap-3">
            <span className="text-base font-bold text-white">Settlement Protocols</span>
            <div className="flex flex-col divide-y divide-[#283046] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-white">Double-Entry Verification</span>
                  <span className="text-[11px] text-slate-400 font-mono">Real-time debits &amp; credits balance</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">Active</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-white">Idempotency Shield</span>
                  <span className="text-[11px] text-slate-400 font-mono">Deduplication with payload hash</span>
                </div>
                <span className="text-[11px] text-[#ffb067] font-mono font-semibold">Enforced</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-white">Immutable Ledger</span>
                  <span className="text-[11px] text-slate-400 font-mono">Append-only audit trail</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: REVIEW DEPOSIT DETAILS matching Stitch */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-[#090e1b]/80 backdrop-blur-sm"
            onClick={() => setShowReviewModal(false)}
          ></div>
          <div className="relative w-full max-w-[540px] bg-[#161b29] border border-[#283046] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-[#283046]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#20273a] border border-[#283046] flex items-center justify-center text-[#ffb067]">
                  <span className="material-symbols-outlined text-[20px]">encrypted</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-white">Verify Inbound Deposit</span>
                  <span className="text-xs text-slate-400 font-mono">Secured by Arthivex Enterprise Vault</span>
                </div>
              </div>
              <button
                className="text-slate-400 hover:text-white"
                onClick={() => setShowReviewModal(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-[#0e1320] border border-[#283046] text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold font-mono">
                Total Transfer Execution
              </span>
              <span className="text-3xl text-[#ffb067] font-mono font-bold my-1">
                {formatCurrency(parseFloat(amount.replace(/,/g, '')) || 0, accountCurrency)}
              </span>
              <span className="text-[11px] text-slate-400">
                Network Transaction Fee: {formatCurrency(0, accountCurrency)} (Arthivex Enterprise Subsidy)
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#283046]">
                <span className="text-slate-400">Funding Protocol</span>
                <span className="font-semibold text-white">
                  {transferRail === 'ach'
                    ? 'ACH Electronic Transfer (1–2 Days)'
                    : transferRail === 'fedwire'
                    ? 'Wire Transfer Settlement'
                    : 'Internal Vault Direct Inbound'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#283046]">
                <span className="text-slate-400">Target Vault Account</span>
                <span className="font-semibold text-white font-mono">
                  {(() => {
                    const found = accounts.find((a) => a.id === selectedVault);
                    return found
                      ? `${found.accountType || 'Commercial Checking'} (•••• ${found.accountNumber?.slice(-4) || 'Vault'})`
                      : 'Arthivex Custodial Account';
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#283046]">
                <span className="text-slate-400">Transaction Reference</span>
                <span className="font-medium text-white font-mono">{reference}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#283046]">
                <span className="text-slate-400">Idempotency Key</span>
                <span className="font-mono text-[#ffb067] text-[11px] truncate max-w-[200px]">
                  {idempotencyKey}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Anticipated Settlement</span>
                <span className="text-[#ffb067] font-semibold font-mono">
                  {transferRail === 'fedwire' ? 'Immediate (< 15 mins)' : 'T+1 Business Day (Tomorrow)'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0e1320] border border-[#283046] flex items-start gap-2 text-slate-400 text-xs">
              <span className="material-symbols-outlined text-[16px] text-[#ffb067] shrink-0 mt-0.5">info</span>
              <span>
                Accidental double-click prevention active. Clicking execution authorizes non-revocable ingestion into institutional custody.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="h-10 px-5 rounded-xl text-slate-400 hover:text-white hover:bg-[#20273a] text-xs font-semibold transition-colors"
                onClick={() => setShowReviewModal(false)}
                type="button"
              >
                Cancel &amp; Edit
              </button>
              <button
                onClick={handleExecuteDeposit}
                disabled={isExecuting}
                className="h-10 px-6 rounded-xl bg-[#ffb067] text-[#2e1500] hover:bg-[#ffa048] text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>{isExecuting ? 'Authenticating TLS Payload...' : 'Confirm and Execute Deposit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
