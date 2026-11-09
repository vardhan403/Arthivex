package com.finguard.service;

import com.finguard.repository.AccountRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Generates cryptographically non-guessable, unique account numbers (T-04, T-26).
 * Format: ACC-######## (e.g. ACC-48928104) with uniqueness collision checks.
 */
@Component
public class AccountNumberGenerator {

    private final AccountRepository accountRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public AccountNumberGenerator(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public String generateUniqueAccountNumber() {
        for (int attempt = 0; attempt < 20; attempt++) {
            int randomNum = 10000000 + secureRandom.nextInt(90000000);
            String candidate = "ACC-" + randomNum;
            if (!accountRepository.existsByAccountNumber(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate a unique account number after multiple attempts.");
    }
}

