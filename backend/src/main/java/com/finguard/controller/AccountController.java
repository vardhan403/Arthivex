package com.finguard.controller;

import com.finguard.dto.AccountResponse;
import com.finguard.dto.CreateAccountRequest;
import com.finguard.security.UserPrincipal;
import com.finguard.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Account Management Controller.
 * Handles account creation, server-side scoped account listing, and account details.
 */
@RestController
@RequestMapping({"/api/v1/accounts", "/api/accounts"})
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(
            @Valid @RequestBody(required = false) CreateAccountRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        AccountResponse response = accountService.createAccount(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> listAccounts(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<AccountResponse> accounts = accountService.listAccounts(principal);
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<AccountResponse> getAccountById(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal UserPrincipal principal) {
        AccountResponse account = accountService.getAccountById(accountId, principal);
        return ResponseEntity.ok(account);
    }
}

