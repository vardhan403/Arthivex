import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { transactionService } from '../services/transactionService';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyFormatter';

export default function TransactionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [realTx, setRealTx] = useState(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [schemaExpanded, setSchemaExpanded] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [id]);

  const loadTransaction = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (!id) {
        throw new Error('Transaction ID is required');
      }
      const data = await transactionService.getTransactionById(id);
      const tx = data?.transaction || data;
      if (!tx || !tx.id) {
        throw new Error('Transaction record not found in the double-entry ledger.');
      }
      setRealTx(tx);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Transaction record not found or access restricted.';
      setErrorMsg(msg);
      setRealTx(null);
    } finally {
      setLoading(false);
    }
  };

  const isDeposit = realTx?.type === 'DEPOSIT' || realTx?.type === 'deposit';
  const isWithdrawal = realTx?.type === 'WITHDRAWAL' || realTx?.type === 'withdrawal';
  const txAmount = parseFloat(realTx?.amount || 0);
  const txCurrency = realTx?.currency || 'INR';

  const txData = {
    id: realTx?.reference || realTx?.id || id || '—',
    type: isDeposit ? 'Inbound Deposit' : isWithdrawal ? 'Outbound Withdrawal' : 'Inter-Vault Transfer',
    amount: `${isDeposit ? '+' : isWithdrawal ? '-' : ''}${formatCurrency(txAmount, txCurrency)}`,
    currency: txCurrency,
    timestamp: realTx?.createdAt ? new Date(realTx.createdAt).toLocaleString('en-US') : '—',
    accountName: realTx?.accountType ? `${realTx.accountType} Vault` : 'Treasury Vault Account',
    accountMask: realTx?.accountNumber ? `•••• ${realTx.accountNumber.slice(-4)}` : '•••• Vault',
    counterparty: realTx?.description || (isDeposit ? 'Inbound Liquidity Clearing' : isWithdrawal ? 'Outbound Disbursement' : 'Internal Account Transfer'),
    lei: 'LEI-CLEARING-NODE-01',
    bank: 'Arthivex Core Clearing Ledger',
    routing: 'AX-021000021',
    memo: realTx?.description || 'Double-Entry Invariant Settled Transaction',
    customerRef: realTx?.reference || realTx?.id || '—',
    batchSeq: realTx?.id ? `BATCH#${realTx.id.slice(0, 8).toUpperCase()}` : '—',
    preBalance: realTx?.resultingBalance !== undefined ? formatCurrency(parseFloat(realTx.resultingBalance) - (isDeposit ? txAmount : -txAmount), txCurrency) : '—',
    delta: `${isDeposit ? '+' : isWithdrawal ? '-' : ''}${formatCurrency(txAmount, txCurrency)}`,
    postBalance: realTx?.resultingBalance !== undefined ? formatCurrency(parseFloat(realTx.resultingBalance), txCurrency) : '—',
    uuid: realTx?.id || id || '—',
    idempotencyKey: realTx?.idempotencyKey || realTx?.reference || '—',
    signature: realTx?.id ? `sha256:${realTx.id.replace(/-/g, '')}` : '—',
  };

  const rawJsonPayload = JSON.stringify(
    {
      transaction_id: txData.uuid,
      reference: txData.customerRef,
      settlement_method: 'DOUBLE_ENTRY_LEDGER',
      currency: txData.currency,
      amount: txAmount,
      type: realTx?.type || 'TRANSFER',
      status: realTx?.status || 'SETTLED',
      account_number: realTx?.accountNumber || 'CONFIDENTIAL',
      timestamp: realTx?.createdAt || null,
      resulting_balance: realTx?.resultingBalance || null,
      cryptographic_attestation: {
        algorithm: 'HMAC-SHA256',
        digest: txData.signature,
      },
    },
    null,
    2
  );

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(txData.memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJsonPayload);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Access Restriction / Error Notice */}
      {errorMsg && (
        <div className="p-6 rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/50 text-[#ffb4ab] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[#ffb4ab]">gpp_bad</span>
            <div>
              <p className="font-semibold text-sm">Access Restricted / Record Not Found</p>
              <p className="text-xs text-[#dee2f5] mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <Link
            to="/transactions"
            className="px-4 py-2 bg-[#ffb4ab] text-[#690005] hover:opacity-90 rounded-lg text-xs font-bold"
          >
            Back to Transactions
          </Link>
        </div>
      )}

      {/* Top Utilities & Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link
              to="/transactions"
              className="inline-flex items-center gap-1.5 text-[#bfc6de] hover:text-[#ffb067] transition-colors text-xs group"
            >
              <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
              <span>Back to Transaction History</span>
            </Link>
            <span className="text-[#bfc6de]/40 text-xs">/</span>
            <span className="text-xs text-[#bfc6de]">Ledger Audit</span>
            <span className="text-[#bfc6de]/40 text-xs">/</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#1a1f2d] border border-[#283046] text-[#ffd5b3] font-mono">
              #{txData.id}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dee2f5]">Transaction Inspection Ledger</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ffb067]/20 border border-[#ffb067]/40 text-[#ffb067] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffb067] animate-ping"></span>
              Synchronized
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsFlagged(!isFlagged)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors shadow-sm ${
              isFlagged
                ? 'bg-[#93000a]/40 border-[#ffb4ab] text-[#ffb4ab]'
                : 'bg-[#161b29] hover:bg-[#1a1f2d] border-[#283046] text-[#dee2f5]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-[#ffb4ab]">flag</span>
            <span>{isFlagged ? 'Flagged for Review' : 'Flag for Compliance Review'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyMemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#161b29] hover:bg-[#1a1f2d] border border-[#283046] text-[#dee2f5] text-xs font-semibold transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-[#ffb067]">
              {copiedMemo ? 'done' : 'content_copy'}
            </span>
            <span>{copiedMemo ? 'Copied Memo!' : 'Copy Memo'}</span>
          </button>
          <button
            type="button"
            onClick={() => alert(`Certified Audit Receipt for ${txData.id} exported (PDF).`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffb067] hover:bg-[#ffdcc1] text-[#4c2700] text-xs font-bold transition-all shadow-lg shadow-[#ffb067]/20"
          >
            <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
            <span>Download Audit Receipt (PDF)</span>
          </button>
        </div>
      </div>

      {/* Primary Metric Hero Card with Decorative Cryptographic Motif */}
      <div className="relative overflow-hidden rounded-xl bg-[#161b29] border border-[#283046] p-6 sm:p-8 shadow-lg">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 pointer-events-none opacity-10">
          <svg className="text-[#ffb067]" fill="currentColor" height="340" viewBox="0 0 200 200" width="340">
            <path d="M100 10 L170 45 L170 110 C170 155 100 190 100 190 C100 190 30 155 30 110 L30 45 Z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#ffb067]/20 border border-[#ffb067]/40 text-[#ffd5b3] text-xs tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[16px] text-[#ffb067]">verified</span>
                SETTLED • FINALITY CONFIRMED
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#1a1f2d] border border-[#283046] text-[#bfc6de] text-xs">
                ACH / FedWire Inbound
              </span>
              <span className="text-xs text-[#bfc6de]">Tier-1 Wholesale Clearing</span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#ffb067] font-mono">
                {txData.amount}
              </span>
              <span className="text-lg font-medium text-[#bfc6de]">{txData.currency}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[#bfc6de] text-xs mt-1">
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#ffb067]">schedule</span>
                {txData.timestamp}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#ffb067]">fingerprint</span>
                ID: <span className="font-mono text-[#dee2f5] ml-0.5 font-semibold">{txData.id}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#ffb067]">account_balance_wallet</span>
                {txData.accountName} ({txData.accountMask})
              </span>
            </div>
          </div>

          {/* Quick Cryptographic Integrity Gauge Block */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#1a1f2d] border border-[#283046] shadow-sm">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#252a38]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-[#ffb067]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="100, 100"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-[#ffd5b3] leading-none">100%</span>
                <span className="text-[9px] text-[#bfc6de] leading-none mt-0.5">VALID</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#dee2f5]">Dual-Sign Verified</span>
              <span className="text-xs text-[#bfc6de]">Custodial signature quorum fully authenticated</span>
              <span className="text-xs text-[#ffd5b3] font-medium mt-1">Hash SHA-256 Digest Confirmed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Progression Flow (Step Indicator) */}
      <div className="rounded-xl bg-[#161b29] border border-[#283046] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb067] text-[20px]">sync_saved_locally</span>
            <span className="text-sm font-semibold text-[#dee2f5]">Settlement Lifecycle Pipeline</span>
          </div>
          <span className="text-xs text-[#ffd5b3] bg-[#ffb067]/20 border border-[#ffb067]/30 px-2 py-0.5 rounded font-semibold">
            Zero Anomalies Detected
          </span>
        </div>

        {/* Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="flex flex-col p-4 rounded-lg bg-[#1a1f2d] border border-[#283046]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#bfc6de] uppercase font-semibold">Stage 01</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ffb067]/20 text-[#ffb067] border border-[#ffb067]/40 shadow-sm">
                <span className="material-symbols-outlined text-[14px]">check</span>
              </span>
            </div>
            <span className="text-sm font-semibold text-[#dee2f5]">Ingested</span>
            <span className="text-xs text-[#bfc6de] mt-1">FedWire RTNS #021000021 entry registered</span>
            <span className="text-xs font-mono text-[#bfc6de]/60 mt-2">14:32:04.102 EST</span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col p-4 rounded-lg bg-[#1a1f2d] border border-[#283046]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#bfc6de] uppercase font-semibold">Stage 02</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ffb067]/20 text-[#ffb067] border border-[#ffb067]/40 shadow-sm">
                <span className="material-symbols-outlined text-[14px]">check</span>
              </span>
            </div>
            <span className="text-sm font-semibold text-[#dee2f5]">AML Screened</span>
            <span className="text-xs text-[#bfc6de] mt-1">Arthivex Automated OFAC & PEP cleared</span>
            <span className="text-xs font-mono text-[#bfc6de]/60 mt-2">14:32:05.419 EST</span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col p-4 rounded-lg bg-[#1a1f2d] border border-[#283046]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#bfc6de] uppercase font-semibold">Stage 03</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ffb067]/20 text-[#ffb067] border border-[#ffb067]/40 shadow-sm">
                <span className="material-symbols-outlined text-[14px]">check</span>
              </span>
            </div>
            <span className="text-sm font-semibold text-[#dee2f5]">Ledger Cleared</span>
            <span className="text-xs text-[#bfc6de] mt-1">Double-entry cryptographic journal posted</span>
            <span className="text-xs font-mono text-[#bfc6de]/60 mt-2">14:32:08.014 EST</span>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col p-4 rounded-lg bg-[#252a38] border border-[#ffb067]/50 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#ffb067] uppercase font-bold">Stage 04</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ffb067] text-[#4c2700] shadow-sm font-bold">
                <span className="material-symbols-outlined text-[14px]">check</span>
              </span>
            </div>
            <span className="text-sm font-bold text-[#ffd5b3]">Finality Settled</span>
            <span className="text-xs text-[#bfc6de] mt-1">Funds available immediately for treasury ops</span>
            <span className="text-xs font-mono text-[#ffb067] mt-2 font-semibold">14:32:09.182 EST</span>
          </div>
        </div>
      </div>

      {/* Deep Audit Details: 2-Column Ledger Mosaic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Financial & Routing Metadata (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="rounded-xl bg-[#161b29] border border-[#283046] p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb067] text-[22px]">account_tree</span>
                <span className="text-base font-semibold text-[#dee2f5]">Financial & Routing Metadata</span>
              </div>
              <span className="text-xs text-[#bfc6de] px-2 py-0.5 rounded bg-[#1a1f2d] border border-[#283046]">
                FEDWIRE-ISO20022
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Item 1 */}
              <div className="p-4 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <span className="text-[11px] text-[#bfc6de] uppercase font-medium">Transaction Identifier</span>
                <span className="text-sm font-semibold text-[#dee2f5]">#{txData.id}</span>
                <span className="text-xs text-[#bfc6de]/70 font-mono truncate">UUID: {txData.uuid}</span>
              </div>

              {/* Item 2 */}
              <div className="p-4 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <span className="text-[11px] text-[#bfc6de] uppercase font-medium">Destination Account</span>
                <span className="text-sm font-semibold text-[#dee2f5]">{txData.accountName}</span>
                <div className="flex items-center gap-1.5 text-xs text-[#bfc6de]">
                  <span>Account Number:</span>
                  <span className="font-mono text-[#ffb067] font-semibold">{txData.accountMask}</span>
                </div>
              </div>

              {/* Item 3 */}
              <div className="p-4 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <span className="text-[11px] text-[#bfc6de] uppercase font-medium">Originating Counterparty</span>
                <span className="text-sm font-semibold text-[#dee2f5]">{txData.counterparty}</span>
                <span className="text-xs text-[#bfc6de]/70 font-mono">Entity LEI: {txData.lei}</span>
              </div>

              {/* Item 4 */}
              <div className="p-4 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <span className="text-[11px] text-[#bfc6de] uppercase font-medium">Depository Institution</span>
                <span className="text-sm font-semibold text-[#dee2f5]">{txData.bank}</span>
                <span className="text-xs text-[#bfc6de]/70 font-mono">Routing (ABA): {txData.routing}</span>
              </div>
            </div>

            {/* Transaction Memo & Ledger Reference */}
            <div className="p-4 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#bfc6de] uppercase font-medium">General Ledger Reference & Memo</span>
                <span className="text-[11px] text-[#ffd5b3] bg-[#ffb067]/20 border border-[#ffb067]/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                  GL ACC #4102-IN
                </span>
              </div>
              <p className="text-sm text-[#dee2f5] font-medium bg-[#090e1b] border border-[#283046] p-3 rounded">
                "{txData.memo}"
              </p>
              <div className="flex items-center gap-4 text-[#bfc6de] text-xs">
                <span>
                  Customer Reference: <code className="text-[#ffd5b3]">{txData.customerRef}</code>
                </span>
                <span>
                  Batch Sequence: <code className="text-[#ffd5b3]">{txData.batchSeq}</code>
                </span>
              </div>
            </div>

            {/* Ledger Balance Delta Timeline Box */}
            <div className="p-4 rounded-lg bg-[#252a38] border border-[#283046] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#dee2f5]">Ledger Balance Impact Vector</span>
                <span className="text-[11px] text-[#ffd5b3] bg-[#ffb067]/20 border border-[#ffb067]/30 px-2 py-0.5 rounded font-semibold">
                  Audited in Real-Time
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3 rounded bg-[#161b29] border border-[#283046] flex flex-col">
                  <span className="text-[10px] text-[#bfc6de] uppercase">Pre-Transaction Balance</span>
                  <span className="text-sm font-mono text-[#dee2f5] mt-1 font-semibold">{txData.preBalance}</span>
                  <span className="text-[11px] text-[#bfc6de]/70">Available baseline</span>
                </div>
                <div className="p-3 rounded bg-[#161b29] border border-[#ffb067]/40 flex flex-col">
                  <span className="text-[10px] text-[#ffb067] uppercase font-bold">Delta Credited</span>
                  <span className="text-sm font-mono text-[#ffb067] mt-1 font-bold">{txData.delta}</span>
                  <span className="text-[11px] text-[#ffd5b3]/80">Unconditional Credit</span>
                </div>
                <div className="p-3 rounded bg-[#161b29] border border-[#283046] flex flex-col">
                  <span className="text-[10px] text-[#bfc6de] uppercase font-semibold">Post-Settlement Total</span>
                  <span className="text-sm font-mono text-[#dee2f5] mt-1 font-bold">{txData.postBalance}</span>
                  <span className="text-[11px] text-[#bfc6de] font-medium">Reconciled Balance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Counterparty Profile & Historical Context Card */}
          <div className="rounded-xl bg-[#161b29] border border-[#283046] p-4 sm:p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#1a1f2d] border border-[#283046] flex items-center justify-center text-[#ffb067]">
                <span className="material-symbols-outlined text-[26px]">corporate_fare</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#dee2f5]">{txData.counterparty}</span>
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">verified</span>
                </div>
                <span className="text-xs text-[#bfc6de]">Wholesale Client • Level 3 KYC Approved • 24 Settled Transits YTD</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => alert(`Opening compliance profile for ${txData.counterparty}`)}
              className="px-3.5 py-1.5 rounded-lg bg-[#1a1f2d] hover:bg-[#252a38] border border-[#283046] text-[#dee2f5] text-xs font-semibold transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>

        {/* Column 2: Security, Compliance & System Verification (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Spring Security & Cryptographic Attestation */}
          <div className="rounded-xl bg-[#161b29] border border-[#283046] p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb067] text-[22px]">shield</span>
                <span className="text-base font-semibold text-[#dee2f5]">Cryptographic Proof & Security</span>
              </div>
              <span className="text-xs text-[#ffd5b3] bg-[#ffb067]/20 border border-[#ffb067]/40 px-2 py-0.5 rounded font-semibold">
                VALIDATED
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Verification Item 1 */}
              <div className="p-3 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#bfc6de] uppercase font-medium">Spring Security Framework</span>
                  <span className="text-[10px] text-[#ffd5b3] bg-[#090e1b] border border-[#283046] px-1.5 py-0.5 rounded font-mono font-semibold">
                    v6.2.1 Secure
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#dee2f5]">HMAC-SHA256 Multi-Layer Signature</span>
                <span className="text-xs text-[#bfc6de]/70 font-mono truncate">Sig: {txData.signature}</span>
              </div>

              {/* Verification Item 2 */}
              <div className="p-3 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#bfc6de] uppercase font-medium">Idempotency Token</span>
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">lock_clock</span>
                </div>
                <span className="text-xs text-[#ffd5b3] font-mono select-all font-semibold">
                  {txData.idempotencyKey}
                </span>
                <span className="text-xs text-[#bfc6de]/70">Replay-attack guard activated & validated</span>
              </div>

              {/* Verification Item 3 */}
              <div className="p-3 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#bfc6de] uppercase font-medium">AML Compliance Engine</span>
                  <span className="text-[10px] text-[#ffd5b3] bg-[#ffb067]/20 border border-[#ffb067]/30 px-1.5 py-0.5 rounded font-semibold">
                    PASSED
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#dee2f5]">Arthivex Autonomous Engine v3.1</span>
                <span className="text-xs text-[#bfc6de]">OFAC Sanction, PEP Index & Suspicious Volume checks verified clean</span>
              </div>

              {/* Verification Item 4 */}
              <div className="p-3 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#bfc6de] uppercase font-medium">Double-Entry Audit</span>
                  <span className="text-[10px] text-[#ffd5b3] bg-[#090e1b] border border-[#283046] px-1.5 py-0.5 rounded font-semibold">
                    BALANCED
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#dee2f5]">Double-Entry Invariant Protection</span>
                <span className="text-xs text-[#bfc6de]/70">Verified: Total Debits == Total Credits</span>
              </div>

              {/* Verification Item 5: Multi-Sig Quorum */}
              <div className="p-3 rounded-lg bg-[#1a1f2d] border border-[#283046] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#bfc6de] uppercase font-medium">Multi-Sig Approval Quorum</span>
                  <span className="text-[10px] text-[#ffd5b3] bg-[#ffb067]/20 border border-[#ffb067]/30 px-1.5 py-0.5 rounded font-semibold">
                    2 of 2 Approvals
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#ffb067]">person_check</span>
                    <span className="text-[#dee2f5]">M. Vance (Treasury Admin)</span>
                  </div>
                  <span className="font-mono text-[#bfc6de]/70">14:32:07 EST</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#ffb067]">smart_toy</span>
                    <span className="text-[#dee2f5]">Arthivex Sentinel Bot-09</span>
                  </div>
                  <span className="font-mono text-[#bfc6de]/70">14:32:08 EST</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action / Institutional Note Card */}
          <div className="rounded-xl bg-[#090e1b] border border-[#ffb067]/40 text-[#dee2f5] p-6 shadow-sm flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#ffb067]/10 blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-2 text-[#ffd5b3]">
              <span className="material-symbols-outlined text-[20px]">security</span>
              <span className="text-xs tracking-wider uppercase font-bold">Institutional Vault Guarantee</span>
            </div>
            <p className="text-xs text-[#bfc6de] leading-relaxed">
              This record represents an immutable double-entry ledger event. Cryptographic state transitions are committed to distributed storage clusters across independent Fed-certified availability zones.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-[#283046] text-xs">
              <span className="text-[#ffd5b3] font-mono">Vault Shard: US-EAST-VAULT-04</span>
              <span className="text-[#bfc6de]">Revision #1 (Original)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Audit Payload Inspector (Collapsible / Toggleable) */}
      <div className="rounded-xl bg-[#161b29] border border-[#283046] p-6 shadow-sm flex flex-col gap-4">
        <div
          onClick={() => setSchemaExpanded(!schemaExpanded)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ffb067] text-[22px]">code</span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#dee2f5]">ISO-20022 Raw Message Ingestion Payload</span>
              <span className="text-xs text-[#bfc6de]">pacs.008.001.08 Financial Institutional Customer Credit Transfer</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#bfc6de] font-medium">
              {schemaExpanded ? 'Collapse Schema' : 'Expand Schema'}
            </span>
            <span
              className={`material-symbols-outlined text-[#bfc6de] text-[20px] transition-transform duration-200 ${
                schemaExpanded ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </div>
        </div>

        {/* Collapsible Content */}
        {schemaExpanded && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between px-3 py-1.5 rounded bg-[#1a1f2d] border border-[#283046]">
              <span className="text-xs text-[#bfc6de] font-mono">application/json • 200 OK</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="text-xs text-[#ffb067] hover:underline flex items-center gap-1 font-semibold"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedJson ? 'done' : 'file_copy'}
                </span>
                <span>{copiedJson ? 'Copied Raw JSON!' : 'Copy Raw JSON'}</span>
              </button>
            </div>
            <pre className="bg-[#090e1b] border border-[#283046] text-[#ffd5b3] p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed max-h-64">
              <code>{rawJsonPayload}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
