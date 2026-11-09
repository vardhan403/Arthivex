package com.finguard.service;

import com.finguard.entity.*;
import com.finguard.repository.LedgerEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Double-Entry Ledger Service (BACKEND.md Section 11, THREATS.md T-13, F-08).
 * Enforces the non-negotiable double-entry invariant: Total Debits == Total Credits.
 */
@Service
public class DoubleEntryLedgerService {

    private final LedgerEntryRepository ledgerEntryRepository;

    public DoubleEntryLedgerService(LedgerEntryRepository ledgerEntryRepository) {
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    /**
     * Records exactly two balanced ledger entries for a financial transaction.
     * Enforces that Debit amount equals Credit amount.
     */
    @Transactional
    public List<LedgerEntry> recordBalancedEntries(
            FinancialTransaction transaction,
            Account debitAccount,
            Account creditAccount,
            BigDecimal amount,
            String currency) {

        BigDecimal scaledAmount = amount.setScale(2, RoundingMode.UNNECESSARY);

        LedgerEntry debitEntry = new LedgerEntry(
                transaction,
                debitAccount,
                LedgerEntryType.DEBIT,
                scaledAmount,
                currency
        );

        LedgerEntry creditEntry = new LedgerEntry(
                transaction,
                creditAccount,
                LedgerEntryType.CREDIT,
                scaledAmount,
                currency
        );

        // Explicit Double-Entry Invariant Check: Total Debits == Total Credits
        if (debitEntry.getAmount().compareTo(creditEntry.getAmount()) != 0) {
            throw new IllegalStateException("Double-entry accounting invariant violation: Debits ("
                    + debitEntry.getAmount() + ") do not balance Credits (" + creditEntry.getAmount() + ")");
        }

        LedgerEntry savedDebit = ledgerEntryRepository.save(debitEntry);
        LedgerEntry savedCredit = ledgerEntryRepository.save(creditEntry);

        return List.of(savedDebit, savedCredit);
    }

    /**
     * Reconciles all ledger entries for a given transaction to verify that debits balance credits.
     */
    @Transactional(readOnly = true)
    public boolean verifyTransactionLedgerBalance(UUID transactionId) {
        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(transactionId);
        if (entries.isEmpty()) {
            return false;
        }

        BigDecimal totalDebits = BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY);
        BigDecimal totalCredits = BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY);

        for (LedgerEntry entry : entries) {
            if (entry.getEntryType() == LedgerEntryType.DEBIT) {
                totalDebits = totalDebits.add(entry.getAmount());
            } else if (entry.getEntryType() == LedgerEntryType.CREDIT) {
                totalCredits = totalCredits.add(entry.getAmount());
            }
        }

        return totalDebits.compareTo(totalCredits) == 0;
    }

    /**
     * Reconciles an account's stored balance with the sum of its immutable ledger entries (F-09).
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateReconciledBalance(UUID accountId) {
        List<LedgerEntry> entries = ledgerEntryRepository.findByAccountId(accountId);
        BigDecimal balance = BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY);

        for (LedgerEntry entry : entries) {
            if (entry.getEntryType() == LedgerEntryType.CREDIT) {
                balance = balance.add(entry.getAmount());
            } else if (entry.getEntryType() == LedgerEntryType.DEBIT) {
                balance = balance.subtract(entry.getAmount());
            }
        }
        return balance;
    }

    @Transactional(readOnly = true)
    public List<LedgerEntry> getEntriesForTransaction(UUID transactionId) {
        return ledgerEntryRepository.findByTransactionId(transactionId);
    }
}

