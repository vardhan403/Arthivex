package com.finguard.dto;

import java.util.List;

public record TransactionDetailsResponse(
        TransactionResponse transaction,
        List<LedgerEntryResponse> ledgerEntries,
        boolean isBalanced
) {}

