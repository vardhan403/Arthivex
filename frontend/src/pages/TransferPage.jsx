import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountService } from '../services/accountService';
import { transactionService } from '../services/transactionService';
import { generateIdempotencyKey } from '../services/apiClient';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyFormatter';

export default function TransferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramFromId = searchParams.get('fromAccountId') || searchParams.get('accountId');
  const { user } = useAuth();

  // Screen State: 'default' | 'modal' | 'success' | 'insufficient' | 'invalid_dest' | 'timeout'
  const [screenState, setScreenState] = useState('default');
  const [transferType, setTransferType] = useState('internal'); // 'internal' | 'external'
  const [amount, setAmount] = useState('100.00');
  const [memo, setMemo] = useState('Inter-vault quarterly reserve top-up');
  const [token2FA, setToken2FA] = useState('892104');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [customDestId, setCustomDestId] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);

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
        if (paramFromId && list.some((a) => a.id === paramFromId)) {
          setSourceAccountId(paramFromId);
          const other = list.find((a) => a.id !== paramFromId);
          if (other) setDestAccountId(other.id);
        } else {
          setSourceAccountId(list[0].id);
          if (list.length > 1) {
            setDestAccountId(list[1].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load accounts for transfer:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Accounts resolution
  const currentSource = accounts.find((a) => a.id === sourceAccountId) || accounts[0] || {};
  const sourceCurrency = currentSource?.currency || 'INR';
  const currentDest = transferType === 'internal'
    ? accounts.find((a) => a.id === destAccountId) || (accounts.length > 1 ? accounts[1] : {})
    : {
        id: customDestId || 'ext-dest',
        accountType: 'External Counterparty Commercial Wire',
        accountNumber: customDestId ? customDestId.slice(-4) : '3391',
        balance: 0,
        currency: sourceCurrency
      };
  const destCurrency = currentDest?.currency || sourceCurrency;

  const sourceAccount = {
    id: currentSource.id || 'src-acc',
    name: currentSource.accountType || 'Operating Commercial Checking',
    number: `•••• ${currentSource.accountNumber?.slice(-4) || '4892'}`,
    sub: 'Arthivex Corporate Core • Tier-1 Cleared',
    balance: formatCurrency(currentSource.balance || 0, sourceCurrency),
    numericBal: Number(currentSource.balance || 0),
  };

  const destAccount = {
    id: currentDest.id || 'dest-acc',
    name: currentDest.accountType || (transferType === 'internal' ? 'Sovereign Treasury Reserve' : 'External Wire Recipient'),
    number: `•••• ${currentDest.accountNumber?.slice(-4) || '9104'}`,
    sub: transferType === 'internal' ? 'Multi-Sig Cold Liquidity • Active Attestation' : 'ABA/Routing: 021000021 • Wire Verified',
    balance: transferType === 'internal' ? formatCurrency(currentDest.balance || 0, destCurrency) : 'External Counterparty',
    numericBal: Number(currentDest.balance || 0),
  };

  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const isOverBalance = parsedAmount > sourceAccount.numericBal;

  const handleStateChange = (state) => {
    setScreenState(state);
    if (state === 'default') {
      setAmount('100.00');
      setErrorMessage('');
    } else if (state === 'insufficient') {
      setAmount('750,000.00');
    }
  };

  const handleTypeChange = (type) => {
    setTransferType(type);
  };

  const handleQuickAmount = (val) => {
    const formatted = Number(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setAmount(formatted);
  };

  const handleSwapAccounts = () => {
    if (accounts.length > 1) {
      const prevSrc = sourceAccountId;
      setSourceAccountId(destAccountId);
      setDestAccountId(prevSrc);
    }
  };

  const handleOpenReview = (e) => {
    e?.preventDefault();
    setErrorMessage('');
    const srcId = sourceAccount.id;
    const dstId = transferType === 'internal' ? destAccount.id : customDestId;

    if (!srcId) {
      setErrorMessage('Please select a source account.');
      setScreenState('invalid_dest');
      return;
    }
    if (!dstId) {
      setErrorMessage('Please select or provide a destination account ID.');
      setScreenState('invalid_dest');
      return;
    }
    if (srcId === dstId) {
      setErrorMessage('Cannot transfer to the same account. Please choose a different destination.');
      setScreenState('invalid_dest');
      return;
    }
    if (parsedAmount <= 0) {
      setErrorMessage('Transfer amount must be greater than zero.');
      setScreenState('invalid_dest');
      return;
    }
    if (parsedAmount > sourceAccount.numericBal) {
      setErrorMessage(`Insufficient unencumbered balance in ${sourceAccount.name}.`);
      setScreenState('insufficient');
      return;
    }
    setScreenState('modal');
  };

  const handleExecuteTransfer = async () => {
    setIsExecuting(true);
    setErrorMessage('');
    try {
      const srcId = sourceAccount.id;
      const dstId = transferType === 'internal' ? destAccount.id : customDestId;

      const res = await transactionService.transfer({
        sourceAccountId: srcId,
        destinationAccountId: dstId,
        amount: parsedAmount,
        description: memo,
        idempotencyKey
      });

      setReceiptData(res);
      setScreenState('success');
      setIdempotencyKey(generateIdempotencyKey());
      await loadAccounts();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Transfer failed';
      setErrorMessage(msg);
      if (err.isNetworkError || err.status === 504 || err.response?.status === 504) {
        // Unknown outcome: keep SAME idempotency key so user can check history or retry safely
        setScreenState('timeout');
      } else if (err.status === 422 || err.response?.status === 422 || msg.toLowerCase().includes('insufficient')) {
        setScreenState('insufficient');
      } else {
        setScreenState('invalid_dest');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const formattedAmountUSD = formatCurrency(parsedAmount, sourceCurrency);

  const nowUTC = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Interactive Sandbox State Controller */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-[#161b29] border border-[#283046] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1a1f2d] border border-[#283046] text-[#ffb067] flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-[#dee2f5]">Interactive Sandbox State Controller</p>
            <p className="text-xs text-[#bfc6de]">
              Switch transaction engine states to preview atomic validation, review modals, ledger updates, and timeout safeguards.
            </p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            onClick={() => handleStateChange('default')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              screenState === 'default'
                ? 'bg-[#ffb067] text-[#4c2700] shadow-sm'
                : 'bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] border border-[#283046]'
            }`}
          >
            1. Form Default
          </button>
          <button
            onClick={() => handleStateChange('modal')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              screenState === 'modal'
                ? 'bg-[#ffb067] text-[#4c2700] shadow-sm'
                : 'bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] border border-[#283046]'
            }`}
          >
            2. Review Modal
          </button>
          <button
            onClick={() => handleStateChange('success')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              screenState === 'success'
                ? 'bg-[#ffb067] text-[#4c2700] shadow-sm'
                : 'bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] border border-[#283046]'
            }`}
          >
            3. Transfer Complete
          </button>
          <button
            onClick={() => handleStateChange('insufficient')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              screenState === 'insufficient'
                ? 'bg-[#ffb067] text-[#4c2700] shadow-sm'
                : 'bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] border border-[#283046]'
            }`}
          >
            4. Insufficient Funds
          </button>
          <button
            onClick={() => handleStateChange('invalid_dest')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              screenState === 'invalid_dest'
                ? 'bg-[#ffb067] text-[#4c2700] shadow-sm'
                : 'bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] border border-[#283046]'
            }`}
          >
            5. Invalid Destination
          </button>
          <button
            onClick={() => handleStateChange('timeout')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              screenState === 'timeout'
                ? 'bg-[#ffb067] text-[#4c2700] shadow-sm'
                : 'bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] border border-[#283046]'
            }`}
          >
            6. Network Timeout (504)
          </button>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-[#ffb067] bg-[#ffb067]/10 border border-[#ffb067]/30">
              LEDGER DISPATCH PROTOCOL
            </span>
            <span className="text-[#bfc6de] text-xs">• Atomic Idempotent Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dee2f5] tracking-tight">Transfer Money</h1>
          <p className="text-sm text-[#bfc6de] mt-1">
            Move funds seamlessly between internal Arthivex vaults or to verified external counterparties with zero settlement drift.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 bg-[#161b29] border border-[#283046] rounded-lg shadow-sm flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffb067] animate-ping"></div>
            <div>
              <span className="text-[10px] text-[#bfc6de]/70 block leading-tight font-semibold">LEDGER CONSENSUS</span>
              <span className="font-mono text-sm text-[#dee2f5] font-semibold">BLOCK #19,842,091 • NORMAL</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="p-2.5 rounded-lg bg-[#161b29] border border-[#283046] text-[#dee2f5] hover:bg-[#1a1f2d] transition-colors shadow-sm"
            title="Audit Log"
          >
            <span className="material-symbols-outlined text-[20px] text-[#bfc6de]">history</span>
          </button>
        </div>
      </div>

      {/* State 4: Insufficient Funds Alert Banner */}
      {screenState === 'insufficient' && (
        <div className="p-4 rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/50 text-[#ffb4ab] shadow-sm flex items-start gap-4">
          <div className="p-2 rounded-lg bg-[#ffb4ab] text-[#690005] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#ffb4ab]">Insufficient Ledger Liquidity (Error 422_UNPROCESSABLE)</h4>
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-[#ffb4ab] text-[#690005] font-semibold">
                DEBIT HALTED
              </span>
            </div>
            <p className="text-sm mt-1 text-[#dee2f5] opacity-90">
              {errorMessage || `The requested debit amount exceeds available unencumbered vault balance. Available balance: ${sourceAccount.balance}. Requested allocation: ${formattedAmountUSD}.`}
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <button
                onClick={() => {
                  handleQuickAmount(100);
                  setScreenState('default');
                }}
                className="underline hover:text-[#ffd5b3] font-semibold text-[#ffb067]"
              >
                Adjust to {formatCurrency(100, sourceCurrency)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 5: Invalid Destination Alert Banner */}
      {screenState === 'invalid_dest' && (
        <div className="p-4 rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/50 text-[#ffb4ab] shadow-sm flex items-start gap-4">
          <div className="p-2 rounded-lg bg-[#ffb4ab] text-[#690005] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">gpp_bad</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#ffb4ab]">Counterparty Attestation Failure (Error 400_INVALID_DESTINATION)</h4>
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-[#ffb4ab] text-[#690005] font-semibold">
                ROUTING INTERCEPT
              </span>
            </div>
            <p className="text-sm mt-1 text-[#dee2f5] opacity-90">
              {errorMessage || 'Destination vault signature has pending compliance review or does not hold dual-key signature clearance.'}
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <button
                onClick={() => handleStateChange('default')}
                className="underline hover:text-[#ffd5b3] font-semibold text-[#ffb067]"
              >
                Revert to Form Default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 6: Uncertain Outcome / Network Timeout 504 Notice */}
      {screenState === 'timeout' && (
        <div className="p-6 rounded-xl bg-[#161b29] border border-[#ffb067]/40 shadow-lg flex flex-col md:flex-row items-start gap-6">
          <div className="w-12 h-12 rounded-xl bg-[#ffb067]/20 border border-[#ffb067]/40 text-[#ffb067] shrink-0 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-[28px]">crisis_alert</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#ffb4ab]/20 border border-[#ffb4ab]/40 text-[#ffb4ab] text-[11px] uppercase tracking-wider font-semibold">
                  CRITICAL PROTOCOL NOTICE
                </span>
                <span className="text-xs text-[#ffd5b3] uppercase tracking-wider font-mono">HTTP 504 GATEWAY_TIMEOUT</span>
              </div>
              <span className="text-xs text-[#bfc6de] font-mono">{nowUTC}</span>
            </div>
            <h3 className="text-lg font-semibold text-[#dee2f5] mt-1">Network Timeout — Transaction Status Unknown</h3>
            <p className="text-sm text-[#bfc6de] mt-2 leading-relaxed">
              The transfer outcome could not be verified in real time due to network clearance delay. Transfer status is unknown. Please check your transaction history before retrying, or retry using the exact same idempotency key.
            </p>
            <div className="mt-2 text-xs font-mono text-[#ffb067]">
              Active Idempotency Key: <span className="bg-[#1a1f2d] px-2 py-1 rounded border border-[#283046]">{idempotencyKey}</span>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-[#090e1b] border border-[#283046] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#ffb067]">hourglass_top</span>
                <div>
                  <span className="text-xs text-[#bfc6de] block font-semibold">Pending Confirmation</span>
                  <span className="text-xs text-[#dee2f5]">Transaction state unconfirmed by upstream ledger gateway</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExecuteTransfer}
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-lg bg-[#ffb067] text-[#4c2700] font-semibold text-xs hover:bg-[#ffdcc1] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isExecuting ? 'Re-probing...' : 'Retry with Same Key'}
                </button>
                <button
                  onClick={() => navigate('/transactions')}
                  className="px-4 py-2 rounded-lg bg-[#1a1f2d] border border-[#283046] text-[#dee2f5] hover:bg-[#252a38] text-xs transition-colors"
                >
                  Check Transaction History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State 3: Transfer Complete / Success View */}
      {screenState === 'success' && (
        <div className="p-8 rounded-2xl bg-[#161b29] border border-[#283046] shadow-xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#ffb067]/20 border border-[#ffb067]/40 flex items-center justify-center text-[#ffb067] shadow-md mb-4">
            <span className="material-symbols-outlined text-[36px]">verified</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#ffb067]/15 text-[#ffd5b3] border border-[#ffb067]/30 text-xs uppercase tracking-wider mb-2 font-semibold">
            Atomic Ledger Execution Settled
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#dee2f5] tracking-tight">Transfer Successfully Executed</h2>
          <p className="text-base text-[#bfc6de] max-w-xl mt-1">
            {formatCurrency(parsedAmount, sourceCurrency)} has been instantaneously debited from {sourceAccount.name} and credited into {destAccount.name}.
          </p>

          {/* Transferred Ledger Card Summary */}
          <div className="w-full max-w-2xl mt-6 p-6 rounded-xl bg-[#090e1b] border border-[#283046] text-left">
            <div className="flex items-center justify-between pb-4 border-b border-[#283046]">
              <span className="text-xs text-[#bfc6de] uppercase font-semibold">TRANSACTION RECEIPT</span>
              <span className="font-mono text-xs text-[#ffb067] font-semibold">
                ID #{receiptData?.reference || receiptData?.transactionId || receiptData?.id || 'TXN-SETTLED'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-lg bg-[#161b29] border border-[#283046]">
                <span className="text-xs text-[#bfc6de] block">Source Account</span>
                <span className="text-sm font-semibold text-[#dee2f5] block mt-1">{sourceAccount.name}</span>
                <span className="font-mono text-xs text-[#bfc6de]">{sourceAccount.number}</span>
                <div className="mt-2 pt-2 border-t border-[#283046] flex items-center justify-between">
                  <span className="text-xs text-[#bfc6de]">Updated Available</span>
                  <span className="font-mono text-sm font-semibold text-[#dee2f5]">{sourceAccount.balance}</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#161b29] border border-[#283046]">
                <span className="text-xs text-[#bfc6de] block">Destination Vault</span>
                <span className="text-sm font-semibold text-[#dee2f5] block mt-1">{destAccount.name}</span>
                <span className="font-mono text-xs text-[#bfc6de]">{destAccount.number}</span>
                <div className="mt-2 pt-2 border-t border-[#283046] flex items-center justify-between">
                  <span className="text-xs text-[#bfc6de]">Updated Balance</span>
                  <span className="font-mono text-sm font-semibold text-[#ffb067]">{destAccount.balance}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 rounded bg-[#1a1f2d] border border-[#283046] flex flex-wrap items-center justify-between gap-2 text-[#dee2f5] text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#ffb067]">enhanced_encryption</span>
                <span>
                  Settlement Signature: <span className="font-mono text-[11px] text-[#ffd5b3]">SHA256:7f4a...d90c</span>
                </span>
              </div>
              <span className="text-xs text-[#bfc6de] font-mono">Atomic Latency: 42ms</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => alert('Certified Cryptographic PDF Receipt downloaded.')}
              className="px-6 py-2.5 rounded-lg bg-[#ffb067] text-[#4c2700] font-semibold text-sm hover:bg-[#ffdcc1] shadow-md shadow-[#ffb067]/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span>Export Transfer Receipt</span>
            </button>
            <button
              onClick={() => handleStateChange('default')}
              className="px-6 py-2.5 rounded-lg bg-[#1a1f2d] border border-[#283046] hover:bg-[#252a38] text-[#dee2f5] font-semibold text-sm transition-all"
            >
              Initiate Another Transfer
            </button>
          </div>
        </div>
      )}

      {/* Main Transfer Two-Column Engine Grid (Hidden if success state) */}
      {screenState !== 'success' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Configuration (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Transfer Type Selector Tabs */}
            <div className="p-1 rounded-xl bg-[#090e1b] border border-[#283046] shadow-sm flex items-center">
              <button
                type="button"
                onClick={() => handleTypeChange('internal')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  transferType === 'internal'
                    ? 'bg-[#ffb067] text-[#4c2700] shadow-md shadow-[#ffb067]/20'
                    : 'text-[#bfc6de] hover:text-[#dee2f5]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                <span>Between My Arthivex Accounts</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  transferType === 'internal' ? 'bg-[#4c2700] text-[#ffb067]' : 'bg-[#1a1f2d] text-[#bfc6de]'
                }`}>
                  INSTANT • {formatCurrency(0, sourceCurrency)} FEE
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('external')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  transferType === 'external'
                    ? 'bg-[#ffb067] text-[#4c2700] shadow-md shadow-[#ffb067]/20'
                    : 'text-[#bfc6de] hover:text-[#dee2f5]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                <span>To External Commercial Account</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#1a1f2d] text-[#bfc6de] border border-[#283046] font-semibold">
                  SAME-DAY WIRE
                </span>
              </button>
            </div>

            {/* Account Selection Panel with Direction Swap Indicator */}
            <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col gap-4 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-[#bfc6de] font-semibold">VAULT ROUTING CHANNELS</span>
                <button
                  type="button"
                  onClick={handleSwapAccounts}
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1a1f2d] hover:bg-[#252a38] border border-[#283046] text-[#ffb067] text-xs transition-all"
                >
                  <span className="material-symbols-outlined text-[16px] group-hover:rotate-180 transition-transform">swap_vert</span>
                  <span>Reverse Accounts</span>
                </button>
              </div>

              {/* Source Vault Card */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#dee2f5] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ffb067]"></span>
                    <span>From (Source Vault)</span>
                  </label>
                  {accounts.length > 1 && (
                    <select
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="bg-[#1c2237] text-white border border-[#283046] rounded px-2 py-0.5 text-[11px] font-mono focus:outline-none focus:border-[#ffb067]"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountType || 'Commercial'} •••• {a.accountNumber?.slice(-4) || 'Vault'} ({formatCurrency(a.balance, a.currency || 'INR')})
                        </option>
                      ))}
                    </select>
                  )}
                  {accounts.length <= 1 && (
                    <span className="text-[11px] text-[#bfc6de]/70 font-mono">Origin Channel</span>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-[#1c2237] border border-[#283046] hover:border-[#ffb067]/50 transition-colors shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1a1f2d] border border-[#283046] flex items-center justify-center text-[#ffb067]">
                      <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#dee2f5]">{sourceAccount.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#1a1f2d] font-mono text-xs text-[#bfc6de] border border-[#283046]">
                          {sourceAccount.number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#bfc6de]">
                        <span>{sourceAccount.sub}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#bfc6de] block">Available Balance</span>
                    <span className="text-sm font-mono font-semibold text-[#dee2f5]">{sourceAccount.balance}</span>
                  </div>
                </div>
              </div>

              {/* Direction Arrow Connector Indicator (⇄) */}
              <div className="relative py-1 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-[#283046]"></div>
                </div>
                <button
                  type="button"
                  onClick={handleSwapAccounts}
                  className="relative w-10 h-10 rounded-full bg-[#090e1b] border border-[#283046] shadow-md flex items-center justify-center text-[#bfc6de] hover:text-[#ffb067] hover:border-[#ffb067] transition-all cursor-pointer"
                  title="Reverse Route"
                >
                  <span className="material-symbols-outlined text-[20px]">sync_alt</span>
                </button>
              </div>

              {/* Destination Vault Card */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#dee2f5] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
                    <span>To (Destination Account)</span>
                  </label>
                  {transferType === 'internal' && accounts.length > 1 ? (
                    <select
                      value={destAccountId}
                      onChange={(e) => setDestAccountId(e.target.value)}
                      className="bg-[#1c2237] text-white border border-[#283046] rounded px-2 py-0.5 text-[11px] font-mono focus:outline-none focus:border-[#ffb067]"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountType || 'Commercial'} •••• {a.accountNumber?.slice(-4) || 'Vault'} ({formatCurrency(a.balance, a.currency || 'INR')})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                      screenState === 'invalid_dest'
                        ? 'bg-[#93000a]/40 text-[#ffb4ab] border-[#ffb4ab]/40'
                        : 'bg-[#ffb067]/15 text-[#ffb067] border-[#ffb067]/30'
                    }`}>
                      {screenState === 'invalid_dest'
                        ? 'FLAGGED / INVALID'
                        : transferType === 'internal'
                        ? 'Internal Vault'
                        : 'External Recipient'}
                    </span>
                  )}
                </div>

                {transferType === 'external' ? (
                  <div className="p-4 rounded-xl bg-[#1c2237] border border-[#283046] flex flex-col gap-2">
                    <label className="text-xs text-[#bfc6de]">Destination Account UUID / ID</label>
                    <input
                      type="text"
                      value={customDestId}
                      onChange={(e) => setCustomDestId(e.target.value)}
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      className="w-full h-10 px-3 bg-[#090e1b] border border-[#283046] rounded-lg text-sm font-mono text-white focus:outline-none focus:border-[#ffb067]"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">
                      Enter the destination account UUID to execute an atomic cross-account transfer.
                    </span>
                  </div>
                ) : (
                  <div
                    className={`p-4 rounded-xl border transition-colors shadow-sm flex items-center justify-between ${
                      screenState === 'invalid_dest'
                        ? 'bg-[#93000a]/20 border-[#ffb4ab]'
                        : 'bg-[#1c2237] border-[#283046] hover:border-[#ffb067]/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#1a1f2d] border border-[#283046] flex items-center justify-center text-[#ffb067]">
                        <span className="material-symbols-outlined text-[22px]">
                          {screenState === 'invalid_dest' ? 'gpp_bad' : 'shield_with_house'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#dee2f5]">{destAccount.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#1a1f2d] font-mono text-xs text-[#dee2f5] border border-[#283046]">
                            {destAccount.number}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#bfc6de]">
                          <span>{destAccount.sub}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-[#bfc6de] block">Current Vault Balance</span>
                      <span className="text-sm font-mono font-semibold text-[#dee2f5]">{destAccount.balance}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Amount & Quick Amounts */}
            <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#dee2f5]">Transfer Amount ({sourceCurrency})</label>
                <div className="flex items-center gap-1.5 text-xs text-[#bfc6de]">
                  <span>Daily Liquidity Limit:</span>
                  <span className="font-semibold text-[#ffd5b3]">{formatCurrency(5000000, sourceCurrency)}</span>
                </div>
              </div>

              {/* Big Amount Input with Currency Symbol */}
              <div className="relative flex items-center rounded-xl bg-[#090e1b] border border-[#283046] focus-within:border-[#ffb067] p-2 transition-all">
                <span className="pl-4 text-2xl font-bold text-[#ffd5b3]">{getCurrencySymbol(sourceCurrency)}</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-2xl font-bold text-[#dee2f5] focus:outline-none tracking-tight font-mono"
                  placeholder="0.00"
                />
                <div className="pr-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-[#1a1f2d] text-[#ffb067] border border-[#ffb067]/30 text-xs font-semibold shadow-sm">
                    {sourceCurrency}
                  </span>
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xs text-[#bfc6de] mr-1">Quick Allocate:</span>
                {[
                  { label: formatCurrency(25000, sourceCurrency, { maximumFractionDigits: 0 }), val: 25000 },
                  { label: formatCurrency(50000, sourceCurrency, { maximumFractionDigits: 0 }), val: 50000 },
                  { label: formatCurrency(100000, sourceCurrency, { maximumFractionDigits: 0 }), val: 100000 },
                  { label: formatCurrency(250000, sourceCurrency, { maximumFractionDigits: 0 }), val: 250000 },
                  { label: `Max Avail (${formatCurrency(sourceAccount.numericBal, sourceCurrency)})`, val: sourceAccount.numericBal },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => handleQuickAmount(chip.val)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                      parsedAmount === chip.val
                        ? 'bg-[#ffb067] text-[#4c2700] border-[#ffb067] font-semibold shadow-sm shadow-[#ffb067]/20'
                        : 'bg-[#1a1f2d] hover:bg-[#252a38] text-[#dee2f5] border-[#283046]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Live Validation Indicator */}
              <div
                className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${
                  isOverBalance
                    ? 'bg-[#93000a]/30 border-[#ffb4ab]/50 text-[#ffb4ab]'
                    : 'bg-[#090e1b] border-[#283046] text-[#dee2f5]'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isOverBalance ? 'text-[#ffb4ab]' : 'text-[#ffb067]'}`}>
                  {isOverBalance ? 'error' : 'check_circle'}
                </span>
                <span>
                  {isOverBalance ? (
                    <span>
                      Debit amount exceeds current unencumbered balance of{' '}
                      <strong>{formatCurrency(sourceAccount.numericBal, sourceCurrency)}</strong>.
                    </span>
                  ) : (
                    <span>
                      Liquidity validation cleared:{' '}
                      <strong className="text-white">Sufficient unencumbered funds in {sourceAccount.name}.</strong>
                    </span>
                  )}
                </span>
              </div>

              {/* Transfer Memo / Reference */}
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-xs text-[#dee2f5]">Transfer Memo / Ledger Reference</label>
                <div className="relative">
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="e.g. Payroll allocation, vendor clearing..."
                    className="w-full h-11 px-3.5 bg-[#090e1b] border border-[#283046] rounded-lg text-sm text-[#dee2f5] focus:outline-none focus:border-[#ffb067] transition-all"
                  />
                  <span className="absolute right-3 top-3 text-[11px] text-[#bfc6de]/60 font-mono">OPTIONAL MEMO</span>
                </div>
              </div>

              {/* Settlement Speed Indicator */}
              <div className="p-4 rounded-xl bg-[#1c2237] border border-[#283046] flex items-start gap-4">
                <div className="p-2 rounded-lg bg-[#ffb067]/15 border border-[#ffb067]/30 text-[#ffb067] mt-0.5 shrink-0">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#dee2f5]">Settlement Speed & Protocol</span>
                    <span className="px-2 py-0.5 rounded bg-[#ffb067]/15 text-[#ffd5b3] border border-[#ffb067]/30 text-xs font-semibold">
                      T+0 Real-Time
                    </span>
                  </div>
                  <p className="text-xs text-[#bfc6de] mt-0.5">
                    Immediate Internal Ledger Settlement (Atomic Rollback Protected). Both accounts update concurrently under Spring Security 256-bit vault authorization.
                  </p>
                </div>
              </div>

              {/* Main Submission Action Button */}
              <button
                type="button"
                onClick={handleOpenReview}
                className="mt-2 w-full py-3.5 px-6 rounded-xl bg-[#ffb067] text-[#4c2700] hover:bg-[#ffdcc1] active:scale-[0.99] font-bold text-base shadow-lg shadow-[#ffb067]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Review Transfer Details</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right Column: Execution Summary & Charts (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Security & Pre-flight Execution Summary Card */}
            <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#283046]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#ffb067]">verified_user</span>
                  <span className="text-sm font-semibold text-[#dee2f5]">Execution Pre-Flight</span>
                </div>
                <span className="text-xs text-[#bfc6de]/70 font-mono">REV #441</span>
              </div>

              {/* Breakdown List */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-[#bfc6de]">Transfer Principal</span>
                  <span className="font-mono text-sm font-semibold text-[#dee2f5]">{formattedAmountUSD}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#bfc6de]">Network Settlement Fee</span>
                    <span className="material-symbols-outlined text-[14px] text-[#bfc6de]/60" title="Internal transfers waive all clearing fees">
                      info
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-[#ffb067]">{formatCurrency(0, sourceCurrency)} (Waived)</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-[#bfc6de]">Idempotency Guarantee</span>
                  <span className="text-[11px] font-mono text-[#ffd5b3] px-1.5 py-0.5 rounded bg-[#1a1f2d] border border-[#283046]">
                    ACTIVE (TTL 180s)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-[#bfc6de]">Execution Authority</span>
                  <span className="text-xs text-[#dee2f5] font-medium">
                    Authenticated Session ({user?.name || user?.fullName || 'Account Holder'})
                  </span>
                </div>
                <div className="h-px bg-[#283046] my-1"></div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-[#dee2f5]">Total Debit Amount</span>
                  <span className="text-base font-bold text-[#ffb067] font-mono">{formattedAmountUSD}</span>
                </div>
              </div>

              {/* Interactive SVG Ledger Balance Projection Chart */}
              <div className="mt-2 p-4 rounded-xl bg-[#1c2237] border border-[#283046] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#bfc6de] uppercase font-semibold">VAULT LIQUIDITY DELTA</span>
                  <span className="text-xs text-[#ffb067] font-medium">Post-Transfer Preview</span>
                </div>
                <svg className="w-full h-24" fill="none" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg">
                  <line className="text-[#283046]" stroke="currentColor" strokeDasharray="3 3" x1="0" x2="320" y1="20" y2="20" />
                  <line className="text-[#283046]" stroke="currentColor" strokeDasharray="3 3" x1="0" x2="320" y1="50" y2="50" />
                  {/* Source Drop curve */}
                  <path d="M 10 30 C 80 30, 120 60, 200 60 L 310 60" fill="none" stroke="#ffb4ab" strokeLinecap="round" strokeWidth="2.5" />
                  {/* Target Gain curve */}
                  <path d="M 10 55 C 80 55, 120 25, 200 25 L 310 25" fill="none" stroke="#ffb067" strokeLinecap="round" strokeWidth="2.5" />
                  <circle cx="10" cy="30" fill="#ffb4ab" r="4" />
                  <circle cx="310" cy="60" fill="#ffb4ab" r="4" />
                  <circle cx="10" cy="55" fill="#ffb067" r="4" />
                  <circle cx="310" cy="25" fill="#ffb067" r="4" />
                </svg>
                <div className="flex items-center justify-between text-xs text-[#bfc6de]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab]"></span>
                    <span>Source: {getCurrencySymbol(sourceCurrency)}684k → {getCurrencySymbol(sourceCurrency)}584k</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffb067]"></span>
                    <span>Reserve: {getCurrencySymbol(destCurrency)}950k → {getCurrencySymbol(destCurrency)}1.05M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Attestation & Audit Vault Info */}
            <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1a1f2d] border border-[#283046] flex items-center justify-center text-[#ffb067]">
                  <span className="material-symbols-outlined text-[20px]">shield</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#dee2f5]">Institutional Security Protocol</h4>
                  <span className="text-xs text-[#bfc6de]">Arthivex Shield & Vault Engine</span>
                </div>
              </div>
              <p className="text-xs text-[#bfc6de] leading-relaxed">
                All cross-vault and external dispatches undergo continuous automated screening against international OFAC sanctions lists and smart contract multisig thresholds.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1c2237] border border-[#283046] text-xs text-[#dee2f5]">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">check_circle</span>
                  <span>Cryptographic Double-Entry Signed</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1c2237] border border-[#283046] text-xs text-[#dee2f5]">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">check_circle</span>
                  <span>Zero-Knowledge Balance Verifiability</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1c2237] border border-[#283046] text-xs text-[#dee2f5]">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb067]">check_circle</span>
                  <span>SOX 404 & SOC2 Type II Certified Pipeline</span>
                </div>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs text-[#bfc6de] border-t border-[#283046]">
                <span>Idempotency Hash:</span>
                <span className="font-mono text-[#ffd5b3] font-semibold">#IDEMP-77192</span>
              </div>
            </div>

            {/* Quick Recent Counterparties */}
            <div className="p-6 rounded-2xl bg-[#161b29] border border-[#283046] shadow-sm flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider text-[#bfc6de] font-semibold mb-1">RECENT RECIPIENTS</span>
              <div className="flex flex-col gap-1.5">
                <div
                  onClick={() => {
                    handleTypeChange('external');
                    setDestAccount({
                      name: 'European Treasury Hub (EUR)',
                      number: '•••• 1120',
                      sub: 'IBAN •••• 1120 • Barclays Direct',
                      balance: 'External Counterparty',
                      numericBal: 0,
                    });
                  }}
                  className="p-2.5 rounded-lg hover:bg-[#1a1f2d] border border-transparent hover:border-[#283046] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1a1f2d] border border-[#283046] flex items-center justify-center font-bold text-[11px] text-[#ffb067]">
                      EU
                    </div>
                    <div>
                      <span className="text-xs text-[#dee2f5] font-semibold block leading-tight">European Treasury Hub (EUR)</span>
                      <span className="text-[10px] text-[#bfc6de] font-mono">IBAN •••• 1120 • Barclays</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-[#bfc6de]">chevron_right</span>
                </div>

                <div
                  onClick={() => {
                    handleTypeChange('external');
                    setDestAccount({
                      name: 'Apex Custody Clearstream',
                      number: '•••• 8829',
                      sub: 'Wire Clearing •••• 8829',
                      balance: 'External Counterparty',
                      numericBal: 0,
                    });
                  }}
                  className="p-2.5 rounded-lg hover:bg-[#1a1f2d] border border-transparent hover:border-[#283046] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1a1f2d] border border-[#283046] flex items-center justify-center font-bold text-[11px] text-[#ffb067]">
                      AC
                    </div>
                    <div>
                      <span className="text-xs text-[#dee2f5] font-semibold block leading-tight">Apex Custody Clearstream</span>
                      <span className="text-[10px] text-[#bfc6de] font-mono">Wire Clearing •••• 8829</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-[#bfc6de]">chevron_right</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State 2: Detailed Confirmation Modal & Scrim (Level 3 Elevation) */}
      {screenState === 'modal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-[#090e1b]/80 backdrop-blur-md transition-opacity"
            onClick={() => setScreenState('default')}
          ></div>

          {/* Modal Card Container */}
          <div className="relative w-full max-w-xl rounded-2xl bg-[#161b29] border border-[#283046] shadow-2xl p-6 sm:p-8 flex flex-col gap-6 z-10">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#ffb067]/20 border border-[#ffb067]/40 text-[#ffb067] flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[26px]">lock_open</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#ffb067]/15 text-[#ffd5b3] border border-[#ffb067]/30 font-semibold">
                      PRE-FLIGHT AUTHORIZATION
                    </span>
                    <span className="font-mono text-xs text-[#bfc6de]">IDEMP #{idempotencyKey.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#dee2f5] tracking-tight mt-0.5">Confirm and Authorize Transfer</h3>
                </div>
              </div>
              <button
                onClick={() => setScreenState('default')}
                className="p-1 rounded-lg text-[#bfc6de] hover:text-[#dee2f5] hover:bg-[#1a1f2d] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Amount Highlight Display */}
            <div className="p-4 rounded-xl bg-[#090e1b] border border-[#283046] flex flex-col items-center justify-center text-center">
              <span className="text-xs text-[#bfc6de] uppercase tracking-wider font-semibold">TOTAL TRANSACTION DISPATCH</span>
              <span className="text-3xl sm:text-4xl text-[#ffb067] font-extrabold tracking-tight mt-1 font-mono">
                {formattedAmountUSD}
              </span>
              <span className="text-xs text-[#ffd5b3] mt-1 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span> Zero Transaction Fee • Instant Vault Settlement
              </span>
            </div>

            {/* Detailed Mapping Table */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-[#1c2237] border border-[#283046]">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-[#bfc6de]">Origin Source Vault</span>
                <div className="text-right">
                  <span className="text-xs text-[#dee2f5] block font-semibold">{sourceAccount.name}</span>
                  <span className="font-mono text-xs text-[#bfc6de]">Account: {sourceAccount.number}</span>
                </div>
              </div>
              <div className="h-px bg-[#283046] my-0.5"></div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-[#bfc6de]">Destination Target</span>
                <div className="text-right">
                  <span className="text-xs text-[#dee2f5] block font-semibold">{destAccount.name}</span>
                  <span className="font-mono text-xs text-[#bfc6de]">Vault: {destAccount.number}</span>
                </div>
              </div>
              <div className="h-px bg-[#283046] my-0.5"></div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-[#bfc6de]">Audit Memo</span>
                <span className="text-xs text-[#dee2f5] italic">"{memo}"</span>
              </div>
              <div className="h-px bg-[#283046] my-0.5"></div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-[#bfc6de]">Idempotency Key</span>
                <span className="font-mono text-xs text-[#ffb067] font-semibold">{idempotencyKey}</span>
              </div>
              <div className="h-px bg-[#283046] my-0.5"></div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-[#bfc6de]">Execution Timestamp</span>
                <span className="text-xs text-[#dee2f5] font-mono">{nowUTC}</span>
              </div>
            </div>

            {/* Security Authorization Passcode Prompt */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#dee2f5] flex items-center justify-between">
                <span>Enterprise Treasury 2FA / WebAuthn Key Token</span>
                <span
                  onClick={() => setToken2FA('892104')}
                  className="text-[#ffb067] font-semibold text-xs cursor-pointer hover:underline"
                >
                  Use Touch ID
                </span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={token2FA}
                  onChange={(e) => setToken2FA(e.target.value)}
                  placeholder="••••••"
                  className="w-full h-11 px-3.5 bg-[#090e1b] border border-[#283046] rounded-lg font-mono text-lg text-[#dee2f5] tracking-widest focus:outline-none focus:border-[#ffb067]"
                />
                <span className="material-symbols-outlined absolute right-3 top-3 text-[18px] text-[#ffb067]">fingerprint</span>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setScreenState('default')}
                className="flex-1 py-3 px-4 rounded-xl bg-[#1a1f2d] border border-[#283046] hover:bg-[#252a38] text-[#dee2f5] font-semibold text-sm transition-all"
              >
                Cancel & Edit
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={isExecuting}
                className="flex-1 py-3 px-4 rounded-xl bg-[#ffb067] text-[#4c2700] hover:bg-[#ffdcc1] active:scale-[0.99] font-bold text-sm shadow-md shadow-[#ffb067]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>{isExecuting ? 'Processing Transfer...' : 'Confirm and Authorize'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
