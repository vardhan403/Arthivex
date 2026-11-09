/**
 * Arthivex Account Management Service
 * Communicates with /api/v1/accounts on the authoritative Spring Boot backend.
 */

import { apiRequest, isMockMode } from './apiClient';
import { MOCK_ACCOUNTS } from '../mocks/mockData';

export const accountService = {
  async getAccounts() {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...MOCK_ACCOUNTS];
    }

    return apiRequest('/accounts');
  },

  async getAccountById(accountId) {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const found = MOCK_ACCOUNTS.find((acc) => acc.id === accountId || acc.accountNumber.includes(accountId));
      if (!found) {
        throw new Error(`Account ${accountId} not found in secure ledger.`);
      }
      return { ...found };
    }

    return apiRequest(`/accounts/${accountId}`);
  },

  async createAccount({ accountType = 'CHECKING', currency = 'INR' } = {}) {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newAcc = {
        id: `mock-acc-${Date.now()}`,
        accountNumber: `ACC-${Math.floor(10000000 + Math.random() * 90000000)}`,
        name: accountType === 'CHECKING' ? 'Operating Checking Account' : 'Reserve Vault Account',
        category: accountType.toLowerCase(),
        balance: 0.0,
        availableBalance: 0.0,
        currency,
        status: 'ACTIVE',
        pills: ['Double-Entry Protected', 'Encrypted Ledger']
      };
      return newAcc;
    }

    return apiRequest('/accounts', {
      method: 'POST',
      body: { accountType, currency }
    });
  }
};
