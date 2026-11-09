# Arthivex — Project Context

> **Document type:** Requirements and project-context document.
> **Rebranding Notice:** The project was originally conceived and designed under the working name **FinGuard** and has been officially rebranded to **Arthivex** (*Arthivex — Secure Financial Transaction & Ledger Management System*).

**Full title:** Arthivex — Secure Financial Transaction & Ledger Management System (formerly FinGuard)

---

## 1. Project Overview

| Item | Value |
|---|---|
| Project name | Arthivex (formerly FinGuard) |
| Full title | Arthivex — Secure Financial Transaction & Ledger Management System |
| Project type | Financial application / banking transaction management system |
| Context | 7-day individual hiring challenge on the Snovasys Hackathon Platform |
| Starting point | From scratch: no repository, code, schema, APIs, tests, deployment, or documentation existed when this project began |

Arthivex (originally developed as FinGuard) is a financial transaction management system in which money movement is accurate, authorized, traceable, and safe under duplicate and concurrent requests.

**Accuracy rule for this document.** It keeps three things separate:

- **Requirement**: what the system must eventually do.
- **Implementation**: what actually exists in the repository.
- **Verification**: what has been demonstrated to work, for example by passing tests.

A requirement is not an implementation, and an implementation is not verified until evidence exists.

---

## 2. Project Status

**FinGuard is currently at the requirements/planning stage and implementation has not yet started.**

There is currently no source-code repository, backend, frontend, database schema, API, authentication, test suite, deployment, or other project documentation. See Section 21 for the status table.

---

## 3. Objective

Build a secure and reliable financial transaction management system that prevents unsafe money movement, duplicate transactions, unauthorized access, incorrect balances, and financial inconsistencies.

The system should make financial transactions:

- accurate
- authorized
- traceable
- reliable
- resistant to duplicate requests
- safe under concurrent operations
- protected against unauthorized access

---

## 4. Problems Being Solved

FinGuard must address the following problems:

1. Duplicate transaction requests
2. Simultaneous withdrawals from the same account
3. Unauthorized financial transactions
4. Incorrect account balances
5. Financial inconsistencies
6. Lack of reliable transaction tracking
7. Security vulnerabilities
8. Unauthorized access to accounts and financial information
9. Race conditions during financial operations
10. Failure to preserve an accurate financial history

---

## 5. Intended Technology Stack

The stack below is a **planned technical direction only**. None of it is confirmed as configured, installed, or working.

| Layer | Intended technology |
|---|---|
| Frontend | React.js, Vite, JavaScript or TypeScript (not yet decided) |
| Backend | Java 21, Spring Boot, Maven, Spring Security |
| Database | PostgreSQL |
| Development environment | Node.js, npm, Windows, VS Code |

---

## 6. Functional Requirements

The eventual system should support the capabilities below. All are requirements, not implemented features.

### 6.1 Authentication and Authorization

Authenticated users and role-based access control. Planned roles: **Administrator**, **Account Holder**, **Auditor**. Access must be enforced on the server side, not only in the UI. The authentication mechanism will be designed during implementation.

### 6.2 Account Management

Account creation, account ownership, account balance management, viewing account information, and account-level access control. Users must only access financial information they are authorized to access.

### 6.3 Deposits

Deposit money into an account, with valid amounts, authorized access, correct balance updates, transaction recording, duplicate-request protection, and transactional consistency.

### 6.4 Withdrawals

Withdraw money from an account. The server must prevent negative balances, unauthorized withdrawals, invalid amounts, duplicate withdrawal processing, and race-condition-related balance errors.

### 6.5 Transfers

Transfer money between accounts while maintaining financial consistency. A transfer must not:

- create money accidentally
- destroy money accidentally
- record only one side of the transfer
- be unauthorized
- be processed twice
- leave balances inconsistent

Appropriate database transaction and concurrency mechanisms must be used.

### 6.6 Double-Entry Ledger

The system should maintain a reliable ledger designed around double-entry accounting principles, with conservation checks such as **total debits = total credits**. The exact schema and implementation will be determined during development. Any table or column named in later work must be marked as a proposed design until it exists.

### 6.7 Transaction History / Statements

Account holders should eventually be able to view relevant transaction history, with consideration for authorization, pagination, accurate transaction information, timestamps, transaction status, and transaction identifiers.

### 6.8 Account Ownership and Access Control

A user must not be able to access another user's account by changing an account ID in a request. Example threats: `GET /accounts/another-user-account`, or modifying an account identifier in a transaction request. The server must verify that the authenticated user is authorized for the requested account.

---

## 7. Financial Integrity Requirements

For every valid transaction:

- Money leaving one account should correspond to money entering another account where appropriate.
- Account balances must remain consistent with the ledger.
- Failed transactions must not partially modify financial state (atomicity).
- Duplicate requests must not create duplicate financial effects.
- Balances must never go negative through any operation or race.
- Total debits must equal total credits.

### Transaction State and Failure Handling

The following are **requirements**, not an existing implementation. No transaction lifecycle, state tracking, or failure handling currently exists.

- Financial operations should have a clearly defined transaction lifecycle and outcome.
- A transaction must have an unambiguous final result, such as successful or failed.
- If a financial operation fails, it must not leave partial balance changes.
- If a financial operation fails, it must not leave partial ledger changes.
- The implementation must ensure that the recorded transaction state accurately reflects the actual financial outcome.
- Financial operations should be atomic: either all required financial changes succeed together, or none of them take effect.

The specific states, schema, and mechanisms used to meet these requirements will be decided during implementation.

---

## 8. Security Requirements

Security is a major part of the project. The eventual system should consider at least:

- authentication
- role-based authorization
- object/account-level authorization
- server-side validation and input validation
- secure password handling
- protection of sensitive information (including secrets and configuration)
- transaction integrity
- idempotency
- concurrency safety
- audit logging
- database security
- secure API design and error handling
- protection against common web/API attacks

None of these protections currently exist.

---

## 9. Authentication and Authorization Requirements

- Users must be authenticated before accessing protected functionality.
- Roles: Administrator, Account Holder, Auditor. Exact permissions per role must be defined during design.
- Authorization must be enforced on the backend for every protected operation.
- Object-level (account-level) authorization must be checked server-side to prevent IDOR / broken object-level authorization.
- Frontend role-based UI is a convenience only and must never be the security boundary.

Authentication and authorization are not implemented.

### Intended Role Permissions

| Role | Intended access |
|---|---|
| Account Holder | Access their own account and transaction information; perform financial operations permitted by the business rules |
| Administrator | Manage users/accounts and perform authorized administrative and operational functions |
| Auditor | Read-only access to appropriate audit and transaction information |

- These are intended authorization boundaries. Exact permissions will be refined during implementation.
- Server-side authorization is mandatory.
- Frontend role-based UI must not be treated as a security boundary.
- An Account Holder must not access another user's account or financial information.
- An Auditor should not be able to perform financial operations merely because they can view relevant information.
- An Administrator's elevated privileges must still be explicitly authorized by backend rules rather than being assumed to bypass all security controls.

None of these permissions are currently implemented or tested.

---

## 10. Idempotency Requirements

Deposits, withdrawals, and transfers must be protected against duplicate requests: the same logical request must not be processed multiple times merely because a client retries. The eventual implementation must define an appropriate idempotency strategy, enforced server-side. No idempotency mechanism exists yet.

---

## 11. Concurrency Requirements

The system must safely handle simultaneous financial operations. Example: two withdrawal requests arrive at nearly the same time for an account with limited funds. The implementation must prevent both from succeeding because they observed the same old balance.

The design should use appropriate database transaction and concurrency-control mechanisms. Possible approaches include suitable transaction isolation, locking, optimistic concurrency, or other suitable methods. **No mechanism has been chosen or implemented.**

---

## 12. Audit Requirements

The system should keep a reliable audit trail for important financial and security-related actions. It should answer:

- Who performed the action?
- What action occurred?
- Which account or transaction was involved?
- When did it happen?
- What was the result?

The design should consider protection against unauthorized modification or deletion of audit records. No append-only audit system exists.

---

## 13. Testing Requirements

Automated tests should eventually cover important financial and security properties. None exist, and none have been run.

| Category | Areas to cover |
|---|---|
| Functional | Account creation, deposits, withdrawals, transfers |
| Security | Unauthorized access, role restrictions, account ownership enforcement, invalid requests |
| Financial integrity | No negative balances, correct balance updates, money conservation, transfer consistency |
| Idempotency | Duplicate requests, retry scenarios |
| Concurrency | Simultaneous withdrawals, simultaneous transfers, concurrent operations on the same account |

---

## 14. Frontend Requirements

The eventual React/Vite frontend should provide an interface for:

- authentication
- account information and balances
- deposits, withdrawals, and transfers
- transaction history
- administrative functions where authorized
- auditor functionality where authorized

The frontend is never the primary security boundary. Frontend validation exists for usability only.

---

## 15. Backend Requirements

The backend is the authority for financial operations and should eventually be responsible for:

- authentication and authorization
- account management
- transaction processing and balance correctness
- ledger management
- idempotency
- concurrency protection
- audit logging
- validation
- database transactions
- API security

The API structure, service structure, repository structure, and schema will be decided during implementation. No APIs exist yet.

---

## 16. Database Requirements

PostgreSQL is the intended database. The eventual design should support these **conceptual** areas:

- users
- roles
- accounts
- financial transactions
- ledger entries
- idempotency information where required
- audit information where required

These are conceptual requirements only. No tables, migrations, or database connection exist.

---

## 17. Deployment Requirements

The final project is expected to be deployed so evaluators can interact with it. Deployment details will be decided later. FinGuard is not currently deployed, and no deployment URL exists.

---

## 18. Threat Model Overview

A dedicated `THREATS.md` will be created later. Potential threats to be analyzed include:

- unauthorized account access
- privilege escalation
- IDOR / broken object-level authorization
- duplicate transaction requests
- race conditions
- negative balances
- transaction tampering
- partial transaction failures
- forged requests
- authentication attacks
- sensitive data exposure
- malicious input
- audit-log tampering
- API abuse
- database-related attacks

This is a list of threats to consider, not an analysis or a claim of mitigation.

---

## 19. Future Documentation

To be created separately after this file is reviewed:

- `BACKEND.md`
- `FRONTEND.md`
- `THREATS.md`
- `PROMPTS.md`
- `README.md`

**`PROMPTS.md` rule:** it must contain evidence of the actual AI-assisted development process and must never be fabricated. It should record actual prompts given to Claude/Antigravity, actual AI-generated changes, mistakes discovered, corrections requested, security issues discovered, testing performed, user review, and final verification. No fake prompt history and no hypothetical AI interactions.

---

## 20. AI-Assisted Development Rules

AI coding tools are allowed, but the developer must understand the important code and be able to explain it. Future AI coding agents (including Claude and Google Antigravity) working on FinGuard must:

1. Read `PROJECT_CONTEXT.md` before making changes.
2. Inspect the actual repository before making implementation claims.
3. Never assume a feature exists merely because this document requires it.
4. Never fabricate test results.
5. Never fabricate API endpoints.
6. Never fabricate database tables.
7. Never fabricate deployment information.
8. Explain security-sensitive changes.
9. Preserve financial correctness.
10. Prefer server-side enforcement for financial and security rules.
11. Add tests for critical financial behavior.
12. Clearly identify assumptions.
13. Keep documentation synchronized with actual implementation.
14. Never modify `PROMPTS.md` with fabricated AI history.
15. When an implementation decision is made, document the actual decision and its reasoning.

Additional principles:

- Never expose secrets (passwords, keys, tokens) in code, logs, or documentation.
- Financial operations must be atomic; the backend decides, the frontend only requests.
- Do not claim a feature is complete without both implementation and appropriate verification.
- If something is uncertain, mark it `UNKNOWN / NEEDS VERIFICATION` rather than guessing.

---

## 21. Current Implementation Status

**FinGuard is currently at the requirements/planning stage and implementation has not yet started.**

| Area | Status |
|---|---|
| Requirements | Defined |
| Backend | Not implemented |
| Frontend | Not implemented |
| Database | Not implemented |
| Authentication | Not implemented |
| Authorization | Not implemented |
| Transactions | Not implemented |
| Ledger | Not implemented |
| Idempotency | Not implemented |
| Concurrency protection | Not implemented |
| Audit trail | Not implemented |
| Automated tests | Not implemented |
| Deployment | Not implemented |

This table represents the starting state. Do not change an entry to "implemented" unless actual evidence exists in the repository, and note the verification evidence when updating it.

---

## 22. Future Development Roadmap

All phases below are **not started**.

| Phase | Focus |
|---|---|
| 1 | Project setup |
| 2 | Database and domain model |
| 3 | Authentication and authorization |
| 4 | Account management |
| 5 | Deposits and withdrawals |
| 6 | Transfers and ledger |
| 7 | Idempotency and concurrency protection |
| 8 | Audit trail |
| 9 | Frontend integration |
| 10 | Security and concurrency testing |
| 11 | Threat testing / self-attack |
| 12 | Deployment and documentation |
