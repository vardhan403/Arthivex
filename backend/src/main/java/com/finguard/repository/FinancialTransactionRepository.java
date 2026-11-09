package com.finguard.repository;

import com.finguard.entity.FinancialTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, UUID> {

    @Query("SELECT DISTINCT tx FROM FinancialTransaction tx WHERE tx.account.id = :accountId OR tx.id IN (SELECT le.transaction.id FROM LedgerEntry le WHERE le.account.id = :accountId) ORDER BY tx.createdAt DESC")
    Page<FinancialTransaction> findByAccountIdOrderByCreatedAtDesc(@Param("accountId") UUID accountId, Pageable pageable);

    @Query("SELECT DISTINCT tx FROM FinancialTransaction tx WHERE tx.account.id = :accountId OR tx.id IN (SELECT le.transaction.id FROM LedgerEntry le WHERE le.account.id = :accountId) ORDER BY tx.createdAt DESC")
    List<FinancialTransaction> findByAccountIdOrderByCreatedAtDesc(@Param("accountId") UUID accountId);

    Optional<FinancialTransaction> findByReference(String reference);

    boolean existsByReference(String reference);
}
