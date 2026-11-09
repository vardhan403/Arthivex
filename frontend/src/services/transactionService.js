/**
 * Arthivex Transaction Service
 * 
 * Communicates with authoritative financial backend endpoints:
 * - /api/v1/accounts/{accountId}/transactions (GET)
 * - /api/v1/transactions/{id} (GET)
 * - /api/v1/accounts/{accountId}/deposits (POST with Idempotency-Key)
 * - /api/v1/accounts/{accountId}/withdrawals (POST with Idempotency-Key)
 * - /api/v1/transfers (POST with Idempotency-Key)
 */

import { apiRequest, isMockMode, generateIdempotencyKey } from './apiClient';
import { accountService } from './accountService';
import { MOCK_TRANSACTIONS, MOCK_ACCOUNTS } from '../mocks/mockData';

let runtimeTransactions = [...MOCK_TRANSACTIONS];

export const transactionService = {
  async getTransactions({ accountId, limit = 50, page = 0, search, type, status } = {}) {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      let list = [...runtimeTransactions];
      if (accountId) {
        list = list.filter((tx) => tx.sourceAccountId === accountId || tx.accountId === accountId);
      }
      if (type && type !== 'all' && type !== 'ALL') {
        list = list.filter((tx) => tx.type?.toUpperCase() === type.toUpperCase());
      }
      if (status && status !== 'all' && status !== 'ALL') {
        list = list.filter((tx) => tx.status?.toUpperCase() === status.toUpperCase());
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((tx) =>
          (tx.description && tx.description.toLowerCase().includes(q)) ||
          (tx.reference && tx.reference.toLowerCase().includes(q)) ||
          (tx.counterparty && tx.counterparty.toLowerCase().includes(q))
        );
      }
      return list;
    }

    if (accountId) {
      const res = await apiRequest(`/accounts/${accountId}/transactions?page=${page}&size=${limit}`);
      return Array.isArray(res) ? res : (res?.content || []);
    }

    // Direct authoritative endpoint: /transactions (aggregates user's accounts on backend)
    try {
      const res = await apiRequest(`/transactions?page=${page}&size=${limit}`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.transactions)) return res.transactions;
      if (Array.isArray(res?.content)) return res.content;
    } catch (err) {
      console.warn('Direct /transactions query failed, falling back to account iteration:', err);
    }

    // Fallback: If direct /transactions endpoint had an issue, query per account
    const accounts = await accountService.getAccounts();
    if (!accounts || accounts.length === 0) {
      return [];
    }

    const txPromises = accounts.map(acc =>
      apiRequest(`/accounts/${acc.id}/transactions?page=0&size=${limit}`).catch(() => [])
    );
    const results = await Promise.all(txPromises);
    const allTx = results.flat();

    // Deduplicate by ID and sort descending by createdAt
    const seen = new Set();
    const uniqueTx = allTx.filter(tx => {
      if (!tx || !tx.id || seen.has(tx.id)) return false;
      seen.add(tx.id);
      return true;
    });

    uniqueTx.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return uniqueTx;
  },

  async getTransactionById(transactionId) {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const found = runtimeTransactions.find(
        (tx) => tx.id === transactionId || tx.reference?.toLowerCase() === transactionId.toLowerCase()
      );
      if (!found) {
        throw new Error(`Transaction ${transactionId} not found in immutable audit ledger.`);
      }
      return { ...found };
    }

    return apiRequest(`/transactions/${transactionId}`);
  },

  async deposit({ accountId, amount, description, sourceMethod, idempotencyKey = generateIdempotencyKey() }) {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, ''));
    if (!numAmount || numAmount <= 0) {
      throw new Error('Deposit amount must be strictly greater than 0');
    }

    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const targetAccount = MOCK_ACCOUNTS.find((a) => a.id === accountId) || MOCK_ACCOUNTS[0];
      const newTx = {
        id: `tx_${Date.now().toString(36)}`,
        reference: `TX-${Math.floor(100000 + Math.random() * 900000)}-VLT`,
        createdAt: new Date().toISOString(),
        description: description || `Inbound Deposit (${sourceMethod || 'Fedwire'})`,
        type: 'DEPOSIT',
        counterparty: sourceMethod || 'Fedwire RTGS',
        accountId: targetAccount.id,
        amount: numAmount,
        currency: targetAccount.currency,
        status: 'COMPLETED',
        resultingBalance: (targetAccount.balance || 0) + numAmount,
        idempotencyKey
      };
      runtimeTransactions.unshift(newTx);
      return newTx;
    }

    return apiRequest(`/accounts/${accountId}/deposits`, {
      method: 'POST',
      idempotencyKey,
      body: {
        amount: numAmount,
        description: description || 'Inbound Liquidity Deposit',
        sourceMethod: sourceMethod || 'ACH'
      }
    });
  },

  async withdraw({ accountId, amount, destinationAccount, routingNumber, notes, idempotencyKey = generateIdempotencyKey() }) {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, ''));
    if (!numAmount || numAmount <= 0) {
      throw new Error('Withdrawal amount must be strictly greater than 0');
    }

    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const sourceAccount = MOCK_ACCOUNTS.find((a) => a.id === accountId) || MOCK_ACCOUNTS[0];
      const newTx = {
        id: `tx_${Date.now().toString(36)}`,
        reference: `TX-${Math.floor(100000 + Math.random() * 900000)}-WDR`,
        createdAt: new Date().toISOString(),
        description: notes || `Outbound Withdrawal to ${destinationAccount || 'External Account'}`,
        type: 'WITHDRAWAL',
        counterparty: destinationAccount || 'External Depository',
        accountId: sourceAccount.id,
        amount: numAmount,
        currency: sourceAccount.currency,
        status: 'COMPLETED',
        resultingBalance: Math.max(0, (sourceAccount.balance || 0) - numAmount),
        idempotencyKey
      };
      runtimeTransactions.unshift(newTx);
      return newTx;
    }

    return apiRequest(`/accounts/${accountId}/withdrawals`, {
      method: 'POST',
      idempotencyKey,
      body: {
        amount: numAmount,
        destinationAccount: destinationAccount || 'External Treasury Account',
        routingNumber: routingNumber || '021000021',
        notes: notes || 'Authorized Outbound Disbursement'
      }
    });
  },

  async transfer({ sourceAccountId, destinationAccountId, amount, description, idempotencyKey = generateIdempotencyKey() }) {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, ''));
    if (!numAmount || numAmount <= 0) {
      throw new Error('Transfer amount must be strictly greater than 0');
    }

    if (sourceAccountId === destinationAccountId) {
      throw new Error('Source account and destination account cannot be identical.');
    }

    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const sourceAccount = MOCK_ACCOUNTS.find((a) => a.id === sourceAccountId) || MOCK_ACCOUNTS[0];
      const targetAccount = MOCK_ACCOUNTS.find((a) => a.id === destinationAccountId) || MOCK_ACCOUNTS[1];
      const newTx = {
        id: `tx_${Date.now().toString(36)}`,
        reference: `TX-${Math.floor(100000 + Math.random() * 900000)}-TRF`,
        createdAt: new Date().toISOString(),
        description: description || `Internal Transfer to ${targetAccount.name}`,
        type: 'TRANSFER',
        counterparty: targetAccount.name,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: targetAccount.id,
        amount: numAmount,
        currency: sourceAccount.currency,
        status: 'COMPLETED',
        resultingBalance: Math.max(0, (sourceAccount.balance || 0) - numAmount),
        idempotencyKey
      };
      runtimeTransactions.unshift(newTx);
      return newTx;
    }

    return apiRequest('/transfers', {
      method: 'POST',
      idempotencyKey,
      body: {
        sourceAccountId,
        destinationAccountId,
        amount: numAmount,
        description: description || 'Internal Vault Transfer'
      }
    });
  }
};
