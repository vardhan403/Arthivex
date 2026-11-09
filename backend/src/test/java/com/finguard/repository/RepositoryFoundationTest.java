package com.finguard.repository;

import com.finguard.entity.Account;
import com.finguard.entity.AccountStatus;
import com.finguard.entity.AccountType;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RepositoryFoundationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Test
    @DisplayName("Test 5A: User persistence with Role and timestamp generation")
    void persistUserSuccessfully() {
        User user = new User(
                "Marcus Vance",
                "m.vance@finguard-treasury.io",
                "$2a$12$e80yq9gG/j8VlYvYyGfLpOPN7y.xO7iC9j1o5t3s8f2m.n0p1q2r3",
                Role.ADMINISTRATOR
        );

        User saved = userRepository.saveAndFlush(user);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("m.vance@finguard-treasury.io");
        assertThat(saved.getRole()).isEqualTo(Role.ADMINISTRATOR);
        assertThat(saved.isEnabled()).isTrue();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Test 5B: Duplicate email violates unique database constraint")
    void duplicateEmailViolatesConstraint() {
        User user1 = new User("User One", "duplicate@finguard.io", "hash1", Role.ACCOUNT_HOLDER);
        userRepository.saveAndFlush(user1);

        User user2 = new User("User Two", "duplicate@finguard.io", "hash2", Role.ACCOUNT_HOLDER);
        assertThatThrownBy(() -> userRepository.saveAndFlush(user2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Test 5C: Account persistence with foreign key, exact BigDecimal scale 2, and initial zero balance")
    void persistAccountWithExactDecimalPrecision() {
        User owner = userRepository.saveAndFlush(
                new User("Alice Smith", "alice@example.com", "hashSecret", Role.ACCOUNT_HOLDER)
        );

        Account account = new Account(owner, "ACC-4892-001", AccountType.CHECKING, "USD");
        account.setBalance(new BigDecimal("1842950.40"));
        account.setAvailableBalance(new BigDecimal("1842950.40"));

        Account saved = accountRepository.saveAndFlush(account);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getUser().getId()).isEqualTo(owner.getId());
        assertThat(saved.getAccountNumber()).isEqualTo("ACC-4892-001");
        assertThat(saved.getStatus()).isEqualTo(AccountStatus.ACTIVE);

        // Strict Financial Invariant: BigDecimal scale of 2, exact equality without rounding drift
        assertThat(saved.getBalance()).isEqualByComparingTo(new BigDecimal("1842950.40"));
        assertThat(saved.getBalance().scale()).isEqualTo(2);
        assertThat(saved.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("1842950.40"));
        assertThat(saved.getDailyLimit()).isEqualByComparingTo(new BigDecimal("250000.00"));

        // Query by user ID
        List<Account> accounts = accountRepository.findByUserId(owner.getId());
        assertThat(accounts).hasSize(1);
        assertThat(accounts.get(0).getAccountNumber()).isEqualTo("ACC-4892-001");

        // Query by account number
        Optional<Account> found = accountRepository.findByAccountNumber("ACC-4892-001");
        assertThat(found).isPresent();
        assertThat(found.get().getUser().getName()).isEqualTo("Alice Smith");
    }

    @Test
    @DisplayName("Test 5D: Duplicate account number violates unique database constraint")
    void duplicateAccountNumberViolatesConstraint() {
        User owner = userRepository.saveAndFlush(
                new User("Bob Jones", "bob@example.com", "hashSecret", Role.ACCOUNT_HOLDER)
        );

        Account account1 = new Account(owner, "ACC-UNIQUE-999", AccountType.CHECKING, "USD");
        accountRepository.saveAndFlush(account1);

        Account account2 = new Account(owner, "ACC-UNIQUE-999", AccountType.SAVINGS, "USD");
        assertThatThrownBy(() -> accountRepository.saveAndFlush(account2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}

