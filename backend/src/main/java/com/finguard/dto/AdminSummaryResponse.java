package com.finguard.dto;

public record AdminSummaryResponse(
        long totalUsers,
        long activeUsers,
        long pendingOnboarding,
        long totalAccounts,
        long totalTransactions,
        String systemStatus
) {
}

