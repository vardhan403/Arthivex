package com.finguard.service;

import com.finguard.repository.FinancialTransactionRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Generates cryptographically non-guessable, unique transaction references (e.g. TX-482910-VLT).
 */
@Component
public class TransactionReferenceGenerator {

    private final FinancialTransactionRepository transactionRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public TransactionReferenceGenerator(FinancialTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public String generateReference() {
        for (int i = 0; i < 20; i++) {
            int randomPart = 100000 + secureRandom.nextInt(900000);
            String candidate = "TX-" + randomPart + "-VLT";
            if (!transactionRepository.existsByReference(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate a unique transaction reference.");
    }
}

