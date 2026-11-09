# Arthivex — Backend Architecture & Implementation Specification

> **Document type:** Backend architecture and implementation specification.
> **Rebranding Notice:** The project was originally conceived and designed under the working name **FinGuard** and has been officially rebranded to **Arthivex** (*Arthivex — Secure Financial Transaction & Ledger Management System*). For technical stability and backward compatibility with deployed infrastructure, the underlying Java package namespace (`com.finguard`), database schema (`finguard`), and database role (`finguard_app`) are intentionally preserved.
>
> **Companion document:** `PROJECT_CONTEXT.md` (requirements and project context). If the two ever conflict, `PROJECT_CONTEXT.md` governs requirements and this file governs backend design.

## How to read this document

For each important backend feature, this document separates three things:

| Label | Meaning |
|---|---|
| **Requirement** | What the backend must guarantee. |
| **Proposed Design** | How FinGuard intends to meet the requirement. It is a proposal and **not** an existing implementation. |
| **Verification** | How the team will eventually prove the implementation works. No verification has been performed. |

Every endpoint, table, class, or mechanism named below is a **PROPOSED** design element unless a later update explicitly links it to real source code and evidence. Items that cannot be decided yet are marked `UNKNOWN / NEEDS VERIFICATION`.

> **Central principle.** The backend must be the authoritative security and financial correctness boundary. The frontend can request an operation, but only the backend can authorize and commit the financial effect.

---

## 7-Day Implementation Scope

**Status:** PROPOSED scope. Nothing below is implemented.

The implementation should prioritize **security, financial correctness, and demonstrable functionality** over unnecessary complexity. This section sequences the work. It does **not** remove or change any requirement in `PROJECT_CONTEXT.md`.

### P0 — Must Have

| # | P0 item |
|---|---|
| 1 | User authentication |
| 2 | Password hashing |
| 3 | Role-based authorization |
| 4 | Account ownership/access control |
| 5 | Account creation |
| 6 | Deposit |
| 7 | Withdrawal |
| 8 | Transfer |
| 9 | Server-side balance validation |
| 10 | Transaction atomicity |
| 11 | Idempotency for financial write operations |
| 12 | Concurrency protection for withdrawals/transfers |
| 13 | Double-entry ledger or equivalent auditable financial record |
| 14 | Append-only audit logging |
| 15 | Security and financial correctness tests |
| 16 | PostgreSQL persistence |

A P0 item is not done until it is implemented **and** verified by tests that were actually run (see Section 30 and the Definition of Done for Financial Operations).

### P1 — Important if time permits

- Transaction history/statements
- Administrator account-management features
- Auditor read-only access
- Better API error responses
- Additional concurrency tests
- Additional authorization tests
- Improved frontend integration

### P2 — Optional

- Advanced reporting
- Notifications
- Refresh tokens
- Multiple currencies
- Advanced account-management workflows
- Non-essential UI features

**P2 features must NOT delay implementation of security and financial correctness.** If time is short, cut P2 first, then P1. Never cut P0 safeguards (authorization, idempotency, concurrency protection, atomicity, ledger integrity, tests) to make room for anything else.

---

## Avoid Unnecessary Complexity

The implementation should **NOT** add the following unless the challenge requirements later make them necessary:

- Microservices
- Event-driven architecture
- Kafka
- Redis
- Distributed transactions
- Multiple databases
- Complex payment gateways
- Multi-currency support
- Refresh-token infrastructure

The goal is a **secure, testable, understandable system** that the candidate can explain during evaluation. A single Spring Boot application with a single PostgreSQL database is sufficient for everything in P0.

---

## Non-Negotiable Financial Invariants

These must always hold. Each is a **requirement** (not a claim of implementation), and each should become automated test cases.

1. No account can have a negative balance.
2. Every successful transfer is atomic.
3. Every successful financial transaction is represented in the ledger.
4. Every ledger transaction balances: total debits = total credits.
5. Failed financial operations do not partially modify balances or ledger state.
6. Duplicate requests cannot create duplicate financial effects.
7. Concurrent operations cannot violate balance or ledger invariants.
8. Financial state changes occur inside database transactions.
9. Client-supplied balance values are never trusted.
10. All financial amounts use exact decimal arithmetic.

Section 25 lists a few additional supporting invariants.

---

## 1. Backend Overview

**Purpose.** The backend will be responsible for authenticating users, authorizing every operation, processing deposits, withdrawals, and transfers, maintaining a double-entry ledger, protecting against duplicate and concurrent requests, and recording an audit trail.

**Why the backend is the security boundary.** Any code running in a browser can be inspected, modified, replayed, or bypassed. An attacker does not need the React UI. They can send crafted HTTP requests directly. Therefore every rule that protects money or data must be enforced where the attacker cannot alter it: the server.

**Responsibility for financial correctness.** The backend owns account balances, ledger records, transaction outcomes, and idempotency state. No client-supplied balance, status, role, or ownership claim is ever trusted.

**Relationship between components (proposed):**

- **Frontend (React/Vite):** presents UI and sends requests. It is a convenience layer only.
- **Backend (Spring Boot):** authenticates, authorizes, validates, and executes financial logic inside database transactions.
- **PostgreSQL:** durable store of record. It also acts as a last line of defense through constraints and locking.

> **The frontend is an untrusted client. Financial and authorization decisions must be enforced by the backend.**

---

## 2. Architecture

**Status:** PROPOSED. None of these layers exist yet.

```text
React/Vite Frontend
        |
        | HTTPS / REST API
        v
Spring Boot Backend
        |
        +-- Controller/API Layer
        |
        +-- Authentication & Authorization
        |
        +-- Service/Business Logic
        |
        +-- Transaction/Ledger Logic
        |
        +-- Repository/Data Access
        |
        v
PostgreSQL
```

| Layer | Proposed responsibility |
|---|---|
| **Controller / API** | Parse HTTP requests, perform structural validation, call services, map results and errors to HTTP responses. Contains **no** business or financial logic. |
| **Authentication & Authorization** | Establish who the caller is (authentication). Enforce role rules (RBAC) at the endpoint level. Enforce object-level rules (account ownership) in the service layer before any data is read or changed. |
| **Service / Business Logic** | Orchestrate each use case (create account, deposit, withdraw, transfer, read history), apply business rules, and define transaction boundaries. |
| **Transaction / Ledger Logic** | The single, centralized place that moves money: acquires locks, checks funds, writes ledger entries, updates balances, and records the transaction result. No other code path may change a balance. |
| **Repository / Data Access** | Persistence operations, including locking queries. Exposes no operation that lets callers set a balance arbitrarily outside the ledger component. |
| **PostgreSQL** | Source of truth, with constraints that make certain invalid states impossible even if application code has a bug. |

**Design rule:** Controllers never call repositories directly for financial state. Financial state changes flow only through the Transaction/Ledger component.

---

## 3. Domain Model

**Status:** PROPOSED conceptual model. Not a schema. The exact schema is `UNKNOWN / NEEDS VERIFICATION` (see Sections 20 and 29). The model is intentionally small to remain practical for a 7-day challenge.

### 3.1 User
- **Purpose:** An authenticated person using the system.
- **Relationships:** Has one or more Roles. Owns zero or more Accounts. Is the actor in Audit Events and the scope owner of Idempotency Records.
- **Invariants:** Unique login identifier. Password stored only as a salted, slow hash, never in plaintext. A disabled user cannot authenticate.

### 3.2 Role
- **Purpose:** Grants coarse-grained permissions: `ACCOUNT_HOLDER`, `ADMINISTRATOR`, `AUDITOR`.
- **Relationships:** Assigned to Users.
- **Invariants:** A user cannot assign roles to themselves. Role assignment is an administrative action and is audited.
- **Note:** Whether a user may hold multiple roles is `UNKNOWN / NEEDS VERIFICATION`. A single role per user is the simpler starting point.

### 3.3 Account
- **Purpose:** Holds a balance belonging to an owner.
- **Relationships:** Belongs to exactly one owner User. Is referenced by Ledger Entries.
- **Invariants:** Every account has an owner. Balance is never negative for customer accounts. Balance changes only through authorized financial operations that also write ledger entries. Currency is fixed per account (a single currency is recommended for the challenge).
- **Special account:** A system/clearing account is needed to represent money entering or leaving the system (see Section 11). It is not owned by a customer, is not accessible through customer APIs, and its balance rules differ (it may go negative because it represents the counter-side of deposits and withdrawals).

### 3.4 Financial Transaction
- **Purpose:** One logical financial event (deposit, withdrawal, or transfer) with a single, unambiguous final outcome.
- **Relationships:** Has two or more Ledger Entries (when successful). Links to the initiating User and, optionally, to an Idempotency Record.
- **Invariants:** Has a type, amount, status, and timestamps. Final status is unambiguous, such as `SUCCESS` or `FAILED`. A `SUCCESS` transaction always has balanced ledger entries. A `FAILED` transaction has **no** ledger entries and caused no balance change. Once final, it is never mutated.

### 3.5 Ledger Entry
- **Purpose:** One debit or credit line against one account, belonging to one transaction.
- **Relationships:** Belongs to one Transaction and one Account.
- **Invariants:** Immutable and append-only. Amount is strictly positive. Direction is `DEBIT` or `CREDIT`. For each transaction, the sum of debits equals the sum of credits.

### 3.6 Idempotency Record
- **Purpose:** Remembers that a client request (identified by key) was already processed and what the result was.
- **Relationships:** Scoped to a User; points to the resulting Transaction.
- **Invariants:** Unique per (user, key). Stores a fingerprint of the original request so a reused key with a different payload can be detected.

### 3.7 Audit Event
- **Purpose:** Append-only record of security- and finance-relevant actions.
- **Relationships:** References actor User and, where applicable, the target Account or Transaction.
- **Invariants:** Never updated or deleted by the application. Never contains passwords, tokens, or secrets.

---

## 4. User and Role Model

**Status:** PROPOSED. Exact permissions will be finalized during implementation. This section expands the intended permissions in `PROJECT_CONTEXT.md`, Section 9.

### 4.1 Account Holder
**Intended access:**
- view their own account
- view their own transactions
- perform permitted deposits
- perform permitted withdrawals
- perform permitted transfers

**Must not:**
- access another user's private financial information
- perform administrator operations
- bypass authorization

### 4.2 Administrator
**Intended access:**
- manage users/accounts where permitted
- perform authorized administrative/operational functions

Administrator privileges must still be **explicitly enforced by backend authorization rules**. An administrator does **not** automatically bypass every security rule. For example, it is `UNKNOWN / NEEDS VERIFICATION` whether administrators should be able to move money from customer accounts at all. The safer default is that they cannot, and that administrative actions are audited.

### 4.3 Auditor
**Intended access:**
- read appropriate audit information
- read appropriate transaction information

An Auditor must **not** perform financial operations merely because they have read access. Auditor endpoints will be read-only, and write operations will explicitly reject the Auditor role.

### 4.4 Proposed permission matrix

| Capability | Account Holder | Administrator | Auditor |
|---|---|---|---|
| View own accounts and transactions | Yes | `UNKNOWN / NEEDS VERIFICATION` | n/a |
| View other users' accounts or transactions | **No** | Only if explicitly authorized by rule | Read-only, scoped by rule |
| Deposit / withdraw / transfer on own account | Yes | No (proposed default) | **No** |
| Create accounts | Own accounts (policy `UNKNOWN / NEEDS VERIFICATION`) | Yes | No |
| Manage users | No | Yes | No |
| Read audit events | No | Limited (`UNKNOWN / NEEDS VERIFICATION`) | Yes |

**Verification:** Role tests (Section 23) will assert each cell of the final matrix.

---

## 5. Authentication

**Requirement.** Every protected endpoint must reject unauthenticated requests. Credentials must be stored and checked securely. Authentication failures must not reveal whether a username exists.

### 5.1 Proposed approach: short-lived JWT

**Proposed Design: JWT-based authentication.** A short-lived signed access token is sent in the `Authorization: Bearer` header. No refresh tokens. The final confirmation is recorded in Section 29.

Rules for the JWT approach:

- **Short-lived access token** (for example 15 to 30 minutes; the exact value is `UNKNOWN / NEEDS VERIFICATION`). When it expires, the user logs in again.
- **Passwords must never be stored in plaintext** (see 5.3).
- **The JWT must not contain sensitive financial information** (no balances, no account numbers, no transaction data).
- **The JWT must not be trusted for account ownership.** Ownership is always checked server-side against database state (Section 6).
- **Secrets and signing keys come from environment/configuration, never from source control.**
- **No refresh tokens.** They are not needed for the challenge and are classified P2 (see 7-Day Implementation Scope). Do not add refresh-token infrastructure unless a real need appears.

**Why this is suitable for a 7-day challenge:**
- Works naturally with a React SPA on a different origin from the API.
- Stateless validation keeps the first implementation small.
- Because the token travels in a header and not in a cookie, classic CSRF does not apply (see Section 22).
- A short lifetime bounds the damage of a stolen token without refresh-token machinery.

### 5.2 Login
- `POST /auth/login` (proposed) accepts credentials over HTTPS only.
- The backend looks up the user, verifies the password hash, and checks that the account is enabled.
- On success, it issues a token. On failure, it returns a generic error (for example "invalid credentials") that does not distinguish unknown user from wrong password.

### 5.3 Password handling and hashing
- Use a strong, adaptive, salted password hash. Spring Security's `DelegatingPasswordEncoder` with bcrypt or Argon2 is the intended direction. Exact algorithm and cost parameters are `UNKNOWN / NEEDS VERIFICATION`.
- Never store, log, or return plaintext passwords.
- Enforce a reasonable minimum password policy server-side.
- Consider basic brute-force mitigation (Section 22).

### 5.4 Token handling (JWT)
- **Signature validation:** Every request validates the signature with a server-held secret or key. Tokens with invalid or missing signatures are rejected. Algorithm must be pinned. `alg: none` and algorithm confusion must be rejected.
- **Expiration:** `exp` is mandatory and enforced. Also validate `iss` and `aud` if used.
- **Claims:** Include only the subject (user ID), issued-at, and expiry (plus issuer/audience if used). Do **not** put balances, account lists, ownership data, or other sensitive financial data in the token. If a role claim is included, it is only a routing convenience. The recommended MVP default is that the backend loads the current user (enabled status and role) from the database on each request, so a disabled or demoted user loses access immediately and a forged or stale claim carries no authority. Ownership is **never** derived from token claims.
- **Secret management:** The signing key must come from environment or secret configuration, never be hard-coded or committed.
- **Storage considerations:** Holding the token in memory is safer against persistent theft than `localStorage`, at the cost of requiring re-login on page reload. `localStorage` is readable by any injected script (XSS). The final choice is `UNKNOWN / NEEDS VERIFICATION` and must be coordinated with `FRONTEND.md`.
- **Refresh tokens:** Not used. Refresh-token infrastructure is out of scope for the challenge (P2). If the access token expires, the user logs in again.
- **Logout:** With stateless JWT, logout is client-side discard unless a server-side denylist is added. The limitation must be documented honestly. Because tokens are short-lived, this is accepted for the initial version.

### 5.5 Authentication failures
- Missing/invalid/expired token returns `401 Unauthorized` with a generic body.
- Failed logins and token rejections should be recorded as security events without logging submitted passwords or tokens.

**Verification:** Integration tests will cover missing, malformed, expired, and tampered tokens; wrong-password login; and disabled-user login. Not yet written.

---

## 6. Authorization

> This section is extremely important. Authorization has two independent layers. **Both** must pass for every protected operation.

### 6.1 Role-based authorization (RBAC)

**Requirement.** Different roles have different permissions, enforced on the server.

**Proposed Design.** Endpoint-level rules (for example via Spring Security method or request matchers) restrict which roles may call which endpoints. Examples: financial write endpoints require `ACCOUNT_HOLDER`; user-management endpoints require `ADMINISTRATOR`; audit-read endpoints require `AUDITOR` (or an explicitly allowed role). Default is **deny**: any endpoint not explicitly permitted is rejected.

### 6.2 Object-level authorization (BOLA / IDOR defense)

**Requirement.** The backend must verify that the authenticated user owns or is otherwise authorized to access the specific object requested.

```text
GET /accounts/{accountId}
```

must **NOT** simply trust `{accountId}`. The backend must verify:

```text
authenticatedUser -> authorizedFor(accountId)
```

**Proposed Design.**
- A single, central authorization check (for example an `AccountAccessPolicy` component, **proposed name only**) answers "may user U perform action X on account A?".
- The check runs in the **service layer**, before any read or write, so it cannot be forgotten by a controller.
- The authenticated identity comes from the verified token or session, **never** from a request field such as `userId` in the body.
- Ownership is evaluated against database state, not against client-supplied claims.
- When a user is not authorized for an object, the response should avoid revealing whether the object exists (for example return `404 Not Found` or a uniform denial). The chosen convention is `UNKNOWN / NEEDS VERIFICATION` and should be applied consistently.

### 6.3 Per-operation authorization rules

| Operation | Rule (proposed) |
|---|---|
| Account retrieval | Caller must own the account, or be an Administrator/Auditor explicitly permitted by rule. |
| Deposit | Caller must be authorized for the **target** account. |
| Withdrawal | Caller must own the **source** account. |
| Transfer | Caller must own the **source** account. The destination only needs to exist and be eligible. The caller gains no read access to it. |
| Transaction ownership | Caller may read a transaction only if authorized for at least one account involved, or via an explicit Auditor rule. |
| Transaction history | Caller may list history only for accounts they are authorized for. Pagination must not leak other accounts' entries. |

### 6.4 IDOR / Broken Object Level Authorization explained

IDOR (a form of OWASP API Security risk #1, BOLA) occurs when an API accepts an object identifier from the client and returns or modifies that object without confirming the caller is entitled to it. In a financial system, an attacker could change `accountId` in `GET /accounts/123`, a withdrawal path, or a transfer's `sourceAccountId` field and read or move another customer's money. Sequential or guessable IDs make this easier, though unguessable IDs (for example UUIDs) are **defense in depth, not a substitute** for an ownership check.

### 6.5 Why frontend checks are insufficient

Hiding a button, omitting a menu item, or validating in JavaScript only affects honest users. An attacker bypasses the UI entirely with tools such as curl, Postman, or scripts. Frontend role-based UI is purely cosmetic. Only the backend decision counts.

### 6.6 What a logged-in Account Holder must NOT be able to do

A logged-in Account Holder must **NOT** be able to:

- Read another user's account
- Withdraw from another user's account
- Transfer from another user's account
- View another user's transactions
- Modify another user's account

The backend determines ownership from the **authenticated identity and database state**. Each prohibition above must have at least one automated test.

### 6.7 Never trust client-supplied identity, role, or balance values

The backend must never trust any of these values sent by the frontend:

- `userId`
- `ownerId`
- `accountOwner`
- role values
- balance values

**Proposed Design:**
- Request DTOs for account creation and financial operations contain only the fields they need (for example amount, destination account ID). They do not accept owner, role, or balance fields.
- Never bind request bodies directly onto persistence entities (this avoids mass-assignment, where an attacker adds `role` or `balance` to the JSON).
- The acting user comes from the verified token and the database. Ownership comes from the database.
- **Administrator and Auditor permissions are also enforced server-side**, through both endpoint-level role rules and service-level policy checks. Neither role gains blanket access. Auditor write attempts are rejected. Administrator powers are limited to explicitly authorized operations (see Section 4).

**Verification:** Security tests (Section 23) will attempt cross-user reads and writes for every account-scoped endpoint and must receive denial. Tests will also submit forged `userId`, `ownerId`, role, and balance fields and assert they are ignored or rejected. Not yet written.

---

## 7. Account Management

**Requirement.** Accounts have owners, balances are protected, and balance changes occur only through authorized financial operations.

**Proposed Design.**
- **Account creation:** An authorized caller creates an account. The owner is derived from the authenticated identity (or an explicit administrator action), never from an unvalidated client field. Initial balance is zero. Opening balances, if required for demos, should be created via a normal audited deposit-style operation, not by letting clients set a balance.
- **Ownership:** Stored on the account and checked server-side on every access.
- **Retrieval and balance retrieval:** Subject to object-level authorization. Balance is read from the authoritative stored value (see Section 12).
- **Account status:** Optionally `ACTIVE` / `FROZEN` / `CLOSED`. Financial operations on non-`ACTIVE` accounts are rejected. Whether status is included in the initial scope is `UNKNOWN / NEEDS VERIFICATION`.

**Invariants:**
- Every account has an owner.
- Ownership is enforced server-side.
- Balance cannot become negative.
- Users cannot arbitrarily modify their own balance. There is no "update balance" API.
- Balance changes happen only through authorized financial operations.

**Verification:** Tests that no endpoint accepts a balance field, that creation assigns the authenticated owner, and that non-owners are denied.

---

## 8. Deposits

**Requirement.** A deposit credits the target account exactly once, with a matching ledger record and unambiguous outcome.

**Proposed Design: workflow** (all inside one database transaction after the checks):

1. **Authenticate** the request.
2. **Authorize** the target account (object-level).
3. **Validate amount**: strictly positive, correct scale, within configured limits.
4. **Validate idempotency information**: key present and well-formed. Look up or reserve the key (Section 14).
5. **Begin database transaction.**
6. **Update financial state**: lock the target account row, then increase its balance.
7. **Create ledger entries**: debit the system/clearing account, credit the customer account, same amount.
8. **Create transaction record** with final status `SUCCESS`.
9. **Create audit event** within the same transaction.
10. **Commit atomically.**
11. **Return result** (transaction ID, status, new balance as stored).

**Discussion:**
- **Positive amounts only.** Zero and negative values are rejected server-side. A negative "deposit" is effectively a withdrawal that bypasses withdrawal checks.
- **Duplicate requests.** The idempotency mechanism ensures a retried deposit credits once.
- **Atomicity and rollback.** If any step fails, the entire transaction rolls back, leaving no balance change, ledger entry, or successful transaction record.
- **Ledger consistency.** Balance increase and ledger credit commit together or not at all.
- **Auditability.** The audit event records actor, account, amount, result, and transaction ID.

**Open question:** Who may deposit, and into whose account (for example, can a user deposit into another user's account)? `UNKNOWN / NEEDS VERIFICATION`. The proposed default is the owner only.

**Verification:** Tests for invalid amounts, unauthorized target, duplicate request, rollback on injected failure, and ledger balance.

---

## 9. Withdrawals

**Requirement.** A withdrawal debits the owner's account at most once, never produces a negative balance, and remains correct under concurrent requests.

**Proposed Design: workflow:**

1. Authenticate.
2. Authorize: caller must own the source account.
3. Validate amount (strictly positive, scale, limits).
4. Handle idempotency (reserve key).
5. Begin database transaction.
6. **Lock the account row** (`SELECT ... FOR UPDATE`, or an equivalent atomic conditional update).
7. Check sufficient funds **after** acquiring the lock.
8. Decrease balance; write ledger entries (debit customer account, credit system/clearing account); write transaction record.
9. Write audit event.
10. Commit atomically.

### The concurrency problem

```text
Balance = 100

Request A: withdraw 80
Request B: withdraw 80

Both requests must NOT succeed.
```

### Why a simple `if balance >= amount` is unsafe

```text
if (account.balance >= amount) {
    account.balance = account.balance - amount;
}
```

The check and the update are two separate steps. Under concurrency:

1. Request A reads balance = 100. Check passes (100 >= 80).
2. Request B reads balance = 100. Check passes (100 >= 80).
3. A writes 20. B also writes 20 (or, worse, computes from stale data).

Result: 160 was withdrawn from an account holding 100. This is a **time-of-check to time-of-use (TOCTOU)** race. Reading the balance into application memory and deciding there is unsafe unless something forces the two requests to run one after the other for that account.

### Proposed concurrency-control strategy
**Recommended:** pessimistic row-level locking within the transaction. Request B blocks on the locked row until A commits. B then re-reads the committed balance of 20 and is rejected for insufficient funds. A database `CHECK (balance >= 0)` constraint on customer accounts serves as a backstop. See Section 15 for the full discussion and alternatives.

**Verification:** A concurrent test fires two (and then many) simultaneous 80-unit withdrawals against a 100-unit account and asserts exactly one succeeds, the final balance is 20, and the ledger shows exactly one withdrawal. The mandatory test cases are specified in Section 15.

---

## 10. Transfers

**Requirement.** A transfer moves money atomically from a source account to a destination account. It must never create money, destroy money, leave a one-sided record, execute twice, or be performed by an unauthorized user.

```text
Source Account
       |
       | debit
       v
   Transfer
       |
       | credit
       v
Destination Account
```

**Proposed Design: workflow** (single database transaction):

1. **Authenticate** and **authorize**: caller must own the source account.
2. **Validate amount**: strictly positive, correct scale, within limits.
3. **Validate destination**: exists, is eligible (for example `ACTIVE`), is not the same as the source, and uses a compatible currency. Error responses should avoid unnecessary account enumeration. The details are `UNKNOWN / NEEDS VERIFICATION`.
4. **Handle idempotency** (reserve key).
5. **Begin transaction.**
6. **Lock both account rows in a deterministic order** (Section 16).
7. **Check sufficient funds** on the source after locking.
8. **Debit source, credit destination** (balance updates).
9. **Write two (or more) ledger entries** that balance: debit source, credit destination.
10. **Write the transaction record** with final status.
11. **Write audit event.**
12. **Commit.** If any step fails, **roll back**.

```text
NO partial financial state should remain.
```

**How the design avoids each failure mode:**

| Failure mode | Proposed prevention |
|---|---|
| Money creation | Debit and credit amounts come from the same single validated amount. Ledger balance check per transaction. |
| Money destruction | Both balance changes and both ledger entries occur in one atomic transaction. |
| One-sided transfer | Single database transaction. Commit includes both sides or neither. |
| Duplicate transfer | Idempotency key unique per user, enforced by a database constraint. |
| Unauthorized transfer | Source ownership verified server-side before any lock or write. |
| Overdraft under concurrency | Row locks plus `CHECK (balance >= 0)` backstop. |
| Self-transfer anomalies | Reject source == destination (or define explicit behavior). |

**Verification:** Tests for unauthorized source, unknown destination, insufficient funds, forced mid-transfer failure (rollback leaves no partial state), duplicate requests, opposite-direction concurrent transfers (no deadlock failure or lost update), and conservation of total money across all accounts.

---

## 11. Double-Entry Ledger

**Status:** PROPOSED. No ledger exists.

**Simplicity rule.** Keep double-entry accounting, because it demonstrates financial correctness. Use the **simplest reliable model** that can demonstrate:

- Every financial operation has balanced debit/credit entries.
- Total debits equal total credits.
- Account balance changes are consistent with ledger entries.
- Failed transactions leave no partial financial state.
- Transfers debit one account and credit another atomically.

Avoid accounting features the challenge does not require (chart of accounts hierarchies, multi-currency, accruals, reversals workflows, and similar). A simple system/clearing account may be used for deposits and withdrawals.

**Requirement.** Every financial event is represented as balanced debit and credit entries so money movement is traceable and conservation can be checked.

**Terminology (project convention).**

- **Debit:** money leaving an account in the relevant transaction context.
- **Credit:** money entering an account in the relevant transaction context.

> *Note:* This is a simplified convention matching `PROJECT_CONTEXT.md`. Traditional bookkeeping assigns debit/credit effects differently depending on account type (for example, a customer deposit balance is a liability from the bank's perspective). The implementation must pick one convention, document it, and apply it consistently. The chosen convention is `UNKNOWN / NEEDS VERIFICATION`.

**Examples:**

```text
Transfer 100 from A to B
A: Debit 100
B: Credit 100

Deposit 100 into A
System/clearing account: Debit 100
A: Credit 100

Withdrawal 100 from A
A: Debit 100
System/clearing account: Credit 100
```

**Invariant:**

```text
Total Debits = Total Credits
```

This holds per transaction and across the whole ledger.

**Why a system/clearing account is proposed.** Without a counterparty, a deposit would be a single-sided entry and the invariant would not be checkable. The system account represents the outside world. Its balance can go negative (money is entering the system). It must not be reachable through customer-facing APIs.

**Ledger rules (proposed):**
- Entries are **append-only**. Corrections are made with new, compensating transactions, never by editing or deleting entries.
- Entries are written only by the Transaction/Ledger component.
- Each entry stores account, direction, positive amount, transaction reference, and timestamp.

**Relationship to balances.** See Section 12.

**Verification:** After any test sequence, assert (a) sum of debits equals sum of credits, (b) each account's stored balance reconciles with its ledger entries, and (c) total money across customer accounts changes only by deposits and withdrawals.

---

## 12. Balance Correctness

**Invariant:**

```text
Account balance must remain consistent with the authoritative financial records.
```

**Relationship.** A **financial transaction** is the logical event. **Ledger entries** are the immutable line items that make up that event. The **account balance** is the running result of those entries for one account.

**Options and trade-offs:**

| Approach | Pros | Cons |
|---|---|---|
| **Derived only** (balance = sum of ledger entries each time) | Single source of truth, no drift possible | Slower reads as history grows. Locking and the `balance >= 0` check are harder because there is no single row to lock or constrain. |
| **Stored only** (a balance column, no ledger reconciliation) | Fast, easy locking | Can drift from history. Weak auditability. Not acceptable alone. |
| **Stored balance with controlled strategy** (stored column updated only in the same transaction as the ledger entries, plus reconciliation check) | Fast reads, a lockable row, and a DB `CHECK` constraint. Ledger remains the audit authority. | Requires discipline and a reconciliation test so the two cannot silently diverge. |

**Recommended approach (proposed): stored balance with a controlled update strategy.**
- The account row holds the current balance.
- The balance changes **only** inside the Transaction/Ledger component, in the same database transaction that writes the matching ledger entries.
- A reconciliation check verifies `account.balance == sum(credits) - sum(debits)` for the account under the chosen convention. It runs in tests and can be exposed as an internal/administrative consistency check.
- In any disagreement, the ledger is treated as the authoritative record and the discrepancy is treated as a defect.

**Why this fits a 7-day challenge:** it gives a natural row to lock for concurrency control, supports a simple database constraint against negative balances, keeps reads fast, and still preserves an auditable ledger.

**Verification:** Reconciliation test after randomized sequences of operations, including concurrent ones. Not yet written.

---

## 13. Transaction Atomicity

**Requirement.** All required changes for one financial operation succeed together or none take effect. This matches the Transaction State and Failure Handling requirements in `PROJECT_CONTEXT.md`, Section 7.

```text
Transfer:
1. validate
2. debit source
3. credit destination
4. create ledger entries
5. create transaction record
6. create required audit event
7. commit
```

If any required operation fails:

```text
rollback
```

**Why partial commits are unacceptable.** If the debit commits but the credit does not, money is destroyed. If the credit commits but the debit does not, money is created. If balances change but no ledger entry exists, the history no longer explains the balance. Each case silently corrupts financial truth, and later detection and repair is expensive and error-prone.

**Proposed Design: Spring transaction management (conceptual).**
- Each financial use case is a single service method that defines **one** transaction boundary, using Spring's declarative transaction management (`@Transactional` on the service method). `@Transactional` is **not yet present**; this describes intent.
- Runtime exceptions trigger rollback by default. Checked exceptions do not unless configured. Rollback rules must be explicit.
- Be aware of Spring proxy pitfalls: self-invocation within the same class bypasses the transaction proxy, and `@Transactional` on non-public methods may not apply.
- Do not catch and swallow exceptions inside the transactional method in a way that lets the transaction commit after a failure.
- Authorization and validation that need no database writes should occur before the transaction opens where practical. Balance checks must occur **inside** the transaction after locks are held.
- **Failed-outcome recording.** A failed financial operation must leave no balance or ledger changes. If a `FAILED` transaction record is desired for traceability, it must be written in a **separate** transaction so it survives the rollback, and it must contain no ledger entries. Whether to record failures this way is `UNKNOWN / NEEDS VERIFICATION`. The recorded state must always reflect the true financial outcome.
- **Security audit events for denied or failed attempts** should likewise be written in a separate transaction so they survive rollback.

**Verification:** Tests that inject a failure after each step (after debit, after credit, after ledger write) and assert nothing persisted.

---

## 14. Idempotency

**Priority.** Idempotency is one of the **highest-priority** security and financial correctness features. A financial write endpoint is not complete without it.

**Requirement.** Retries of the same logical deposit, withdrawal, or transfer must not produce multiple financial effects. Different users must not interfere with each other. Specifically:

- An `Idempotency-Key` is required on **every** financial write request (deposit, withdrawal, transfer). Requests without one are rejected.
- The key is **scoped to the authenticated user**.
- **Database uniqueness** prevents duplicate processing (a unique constraint, not only an application check).
- **Same key + same request** returns the **original result**.
- **Same key + different request** is **rejected**.
- **Concurrent requests using the same key** must not create duplicate financial effects.
- Idempotency state is **committed atomically with the financial operation** (same database transaction).

```text
Client sends request
        |
        | idempotency key
        v
Backend checks whether key was already processed
        |
        +---- already processed --> return consistent result
        |
        +---- new request -------> process once
```

**Proposed Design.**

- **Idempotency key.** The client supplies a unique key per logical operation (for example an `Idempotency-Key` header, typically a UUID). Keys are required on all financial write endpoints. Missing keys are rejected.
- **Scope and uniqueness.** Uniqueness is enforced by a **database unique constraint** on `(user, key)` (and optionally operation scope). The application-level check alone is not sufficient.
- **Request identity (fingerprint).** The record stores a hash of the canonical request (operation type, account IDs, amount, and other significant fields).
- **User/account association.** The key is scoped to the authenticated user. User A's key never matches user B's record, so a user cannot replay, probe, or read another user's result by guessing a key.
- **Same key, same payload.** Return the **originally stored result** (same transaction ID and outcome), without re-executing.
- **Same key, different payload.** **Reject** the request (recommended: `422 Unprocessable Entity` or `409 Conflict`, final choice `UNKNOWN / NEEDS VERIFICATION`). A key must never be reusable to execute a different operation.
- **Concurrent duplicates.** Two identical requests arriving simultaneously must result in one execution. Recommended pattern: the idempotency record is inserted as the first step inside the financial transaction. The unique index makes the second request wait or fail, and it then reads the committed result of the first. The second must never execute the operation.
- **Stored result/status.** The record stores status (for example `IN_PROGRESS` or `COMPLETED`), a reference to the resulting transaction, and enough response data to return a consistent answer.
- **Failure behavior.** Because the idempotency insert and the financial changes share one transaction, a rolled-back operation also rolls back its key, allowing a legitimate retry. For deterministic failures such as insufficient funds, whether to persist a failed result under the key is `UNKNOWN / NEEDS VERIFICATION`. If persisted, it must be consistent and must not permit retry to double-apply.
- **Retention.** Records may expire after a bounded period. The retention window is `UNKNOWN / NEEDS VERIFICATION`.

**Verification:** Duplicate sequential request returns the same result and one ledger effect. Concurrent identical requests produce one effect. Same key with a different payload is rejected. User B cannot use or observe user A's key.

---

## 15. Concurrency Control

**Requirement.** Concurrent operations must never bypass financial constraints.

```text
Initial balance = 100

Request A reads 100
Request B reads 100

A withdraws 80
B withdraws 80

Unsafe implementation:
both may succeed
```

### Options

| Strategy | How it works | Pros | Cons |
|---|---|---|---|
| **Row-level pessimistic locking** (`SELECT ... FOR UPDATE`) | The transaction locks the account row. Others wait. | Simple mental model. Correct by construction. No retry logic for balance conflicts. | Contention on hot accounts. Requires lock ordering for multi-account operations. |
| **Optimistic locking** (version column) | Updates succeed only if the version is unchanged. Conflicts cause retry. | No blocking. Good for low contention. | Needs retry logic. More failures under contention. More complex to reason about for money. |
| **Atomic conditional update** (`UPDATE ... SET balance = balance - :amt WHERE id = :id AND balance >= :amt`) | The database checks and updates in one statement. Zero rows updated means insufficient funds. | Very robust. Minimal lock time. | Still needs surrounding transactional work for ledger entries. Transfers need care with ordering. |
| **Transaction isolation** (`SERIALIZABLE`) | The database detects conflicting patterns and aborts one transaction. | Strong guarantees. | Requires retry on serialization failures. Performance cost. |
| **Database constraints** (`CHECK (balance >= 0)`) | The database refuses invalid final states. | Backstop that works even if application code has a bug. | Does not by itself serialize operations or give a friendly error. |

### Recommended initial strategy (proposed)

**Pessimistic row-level locking inside a database transaction, under PostgreSQL's default `READ COMMITTED` isolation, plus a `CHECK (balance >= 0)` backstop on customer accounts.**

- Lock each account row involved, in deterministic order (Section 16), before reading its balance.
- Perform the funds check after the lock is held.
- The balance update and ledger writes happen in the same transaction.
- The constraint catches any bug that slips past application logic.

**Why this suits a 7-day challenge:** it is simple to implement correctly with Spring Data JPA's pessimistic lock support or a native query, easy to explain and defend, easy to test with real concurrency, and avoids building retry infrastructure early. The atomic conditional update is an acceptable alternative for single-account operations. The final isolation level and locking approach are `UNKNOWN / NEEDS VERIFICATION` until validated by tests (Section 29).

### Concurrent transfers

| Scenario | Proposed behavior |
|---|---|
| **Same source account** | Row lock serializes the transfers. Each re-checks funds against the committed balance. Only transfers that fit within the balance succeed. |
| **Same destination account** | Both transfers lock the destination briefly. Credits are applied sequentially and no update is lost. |
| **Different accounts (disjoint)** | No shared locks, so they run in parallel without interference. |
| **Opposite directions (A to B and B to A)** | Potential deadlock, resolved by lock ordering (Section 16). |

### Required concurrency tests

The following tests are **required** (proposed; none are written yet). They should run against real PostgreSQL (see Section 23).

**Concurrent withdrawals**

- Account balance = ₹100.
- Two simultaneous withdrawal requests of ₹100 (with different idempotency keys).
- **Exactly one must succeed.** The other must fail (insufficient funds).
- The final balance must never become negative (expected final balance: ₹0).
- The ledger must show exactly one withdrawal.
- A scaled variant with many threads should give the same outcome.

**Concurrent transfers**

- Two or more simultaneous transfers from the same source that together exceed its balance: only transfers that fit within the balance succeed.
- Simultaneous transfers in opposite directions (A to B and B to A): no deadlock failure, no lost update.
- Many simultaneous credits to one destination: no lost update.
- After every scenario, balances are correct, the ledger is balanced (total debits = total credits), and total money is conserved.

**Concurrent duplicates**

- Simultaneous requests with the same idempotency key produce exactly one financial effect.

Deterministic account locking order for transfers is retained (Section 16) to reduce deadlock risk.

**Verification:** Concurrent tests with real database and many threads, as specified above. Assertions use the invariants in "Non-Negotiable Financial Invariants". Not yet written.

---

## 16. Deadlock Considerations

**Requirement.** Multi-account operations must not deadlock indefinitely or leave partial state.

**The problem:**

```text
Transfer 1: A -> B   locks A, then waits for B
Transfer 2: B -> A   locks B, then waits for A

Each waits for the other. Deadlock.
```

PostgreSQL detects deadlocks and aborts one transaction with an error, but relying on that is wasteful and produces avoidable failures.

**Proposed Design: consistent lock ordering.**
- Always acquire account row locks in a **fixed global order**, such as ascending account ID, regardless of which is the source and which is the destination.
- Then a transfer A to B and a transfer B to A both lock the lower-ID account first, so one waits for the other rather than deadlocking.
- Apply the same ordering anywhere more than two rows could be involved. If the system/clearing account is locked in deposit/withdrawal operations, it participates in the ordering too. Because every deposit and withdrawal touches that account, it may become a contention hotspot. Mitigation options (such as per-currency or sharded clearing accounts, or avoiding a lock on it) are `UNKNOWN / NEEDS VERIFICATION`.
- Keep transactions short: do validation first, then lock, update, and commit promptly.

**Retry behavior.** If the database still aborts a transaction (deadlock or serialization failure), the service may retry a small bounded number of times (for example 2 to 3) with brief backoff, or return a retryable error such as `409`/`503`. Retry is safe only because the whole operation, including the idempotency record, rolled back. The retry policy is `UNKNOWN / NEEDS VERIFICATION`.

**Verification:** A test runs many opposite-direction transfers concurrently and asserts completion, no lost money, and balanced ledger.

---

## 17. Audit Trail

**Requirement.** Important financial and security-related actions must be recorded so the team can answer who did what, to which resource, when, and with what result. See `PROJECT_CONTEXT.md`, Section 12.

**Proposed events to audit:**
- login and other security events, where appropriate (successes and failures)
- account creation
- deposits, withdrawals, transfers
- authorization failures (denied access attempts)
- important administrative actions (user/role/account changes)

**An audit event conceptually captures:**
- **who** (actor user ID, and source IP where appropriate)
- **what** (action type)
- **when** (server-generated timestamp)
- **target/resource** (account ID, user ID, etc.)
- **result** (success, denied, failed, with reason code)
- **transaction identifier** where appropriate

**Proposed Design:**
- **Append-only behavior.** The application only inserts audit events and never updates or deletes them. The application's database role should be denied `UPDATE` and `DELETE` on the audit table, and optionally a trigger rejects modification. A fully tamper-evident design (such as hash chaining) is a possible extension and `UNKNOWN / NEEDS VERIFICATION` for the challenge scope.
- **Protection against unauthorized modification.** No API exposes audit modification. Only designated roles can read events.
- **Transaction coupling.** Audit events for successful financial operations are written inside the same database transaction, so a committed financial effect always has its audit record. Audit events for denials and failures are written in a separate transaction so they survive rollback.
- **Sensitive information.** Do not record passwords, tokens, secrets, or full request bodies. Record identifiers and result codes.
- **Logging vs. audit.** Application logs are for diagnostics and may be rotated. Audit events are durable business records. They are separate concerns.

**Verification:** Tests that each audited action creates exactly one event with the right fields, that denied attempts are recorded, that the application database role cannot update or delete audit rows, and that no secrets appear in events.

---

## 18. Error Handling

**Requirement.** Errors must be consistent, informative to legitimate clients, and must never leak sensitive internals.

**Proposed Design:** a central exception handler (for example Spring's `@RestControllerAdvice`, **proposed**) maps failures to a consistent error shape. The exact response format is `UNKNOWN / NEEDS VERIFICATION`. An example shape includes a stable error code, a safe message, a timestamp, and a request/correlation ID.

| Category | Proposed HTTP status | Notes |
|---|---|---|
| Authentication failure | 401 | Generic message. No hint about which credential was wrong. |
| Authorization failure | 403 or 404 | Use a consistent convention that avoids revealing existence of other users' objects. |
| Validation failure | 400 / 422 | Field-level messages that are safe to show. |
| Insufficient funds | 409 or 422 | Clear business error. Does not expose other accounts' data. |
| Duplicate / idempotency conflict | 409 or 422 | For a key reused with a different payload. |
| Resource not found | 404 | |
| Concurrency conflict | 409 or 503 | Retryable. |
| Internal server error | 500 | Generic message plus correlation ID. |

**Must not leak to clients:** passwords, tokens, database credentials, SQL details or constraint names, stack traces, or other sensitive internal information.

**Client vs. internal:** The client receives a safe, stable error and a correlation ID. The full exception, stack trace, and context go to **internal diagnostic logs only**, linked by the same correlation ID, and those logs must also avoid secrets.

**Verification:** Tests that error responses contain no stack traces or SQL text, that auth errors are uniform, and that unexpected exceptions return a generic 500.

---

## 19. Input Validation

**Requirement.** All input is validated on the server. Frontend validation is a usability aid and is never trusted.

**Proposed validation rules:**

| Input | Rules |
|---|---|
| Monetary amounts | Required. Strictly greater than zero. Fixed maximum scale (for example 2 decimal places). Reasonable upper bound. Rejected if not a valid decimal. No exponent or `NaN`. |
| Account IDs | Well-formed identifier format. Existence and **authorization** checked separately. |
| Transaction IDs | Well-formed. Access authorized before returning data. |
| Idempotency keys | Required on financial writes. Length and character limits. Unique per user. |
| User information | Length limits, format validation, normalization. Password policy enforced. |
| Transfer destinations | Must exist, be eligible, differ from the source, and match currency. |

**Monetary precision.** Never use `float` or `double` for money. Binary floating point cannot represent many decimal fractions exactly (for example `0.1 + 0.2 != 0.3`), which causes rounding errors that accumulate into incorrect balances.

**Money representation (finalized proposal for the MVP):**
- **Java:** `java.math.BigDecimal` with an explicit scale of 2 and an explicit rounding policy. Never construct it from a `double`.
- **PostgreSQL:** `NUMERIC(19,2)`.
- **One currency initially.** Multi-currency is out of scope (P2) and should not be introduced unless required later.
- **Never use `float` or `double` for financial amounts**, anywhere (entities, DTOs, calculations, tests).
- **API:** Represent amounts as decimal values or strings with a fixed scale of 2, and reject values with excess precision rather than silently rounding.
- The implementation should use this representation **consistently** across the API layer, service layer, persistence layer, and tests.

Use Bean Validation (`jakarta.validation`) on request DTOs for structural checks, plus explicit business-rule checks in services.

**Verification:** Unit tests for boundary amounts (0, negative, too many decimals, huge values, malformed) and malformed identifiers.

---

## 20. Database Design Principles

**Status:** PROPOSED principles only. **No schema, no SQL, and no migrations are defined here.** Exact schema is `UNKNOWN / NEEDS VERIFICATION`.

- **PostgreSQL** is the intended database.
- **Primary keys:** Every table has a primary key. Consider UUIDs for externally visible IDs (harder to guess, but not a replacement for authorization).
- **Foreign keys:** Enforce referential integrity: accounts reference owners, ledger entries reference accounts and transactions, and transactions and idempotency records reference users. This prevents orphaned or dangling financial records.
- **Unique constraints:** Particularly **idempotency records unique on (user, key)**, and a unique login identifier for users.
- **Check constraints (financial invariants where practical):** `balance >= 0` for customer accounts, `amount > 0` on ledger entries and transactions, restricted values for direction and status.
- **Indexes:** On foreign keys and common lookups: account by owner, ledger entries by account and time, transactions by account and time, idempotency lookup by (user, key). Indexes should support paginated history queries.
- **Transaction boundaries:** Defined at the service layer (Section 13). The database enforces constraints regardless of application bugs.
- **Account ownership:** Stored as a non-null foreign key from account to owner.
- **Transaction relationships:** Ledger entries link to a transaction, and each successful transaction should have balanced entries.
- **Timestamps:** Server/database-generated, timezone-aware (`TIMESTAMPTZ`), for transactions, entries, and audit events.
- **Monetary data types:** See Section 19.
- **Migrations:** A versioned migration tool (Flyway or Liquibase) is the intended direction. The choice is `UNKNOWN / NEEDS VERIFICATION`. Migrations must be reviewed like code.
- **Database accounts:** The application should connect with a least-privilege database user (no superuser, no DDL at runtime in deployment, and no `UPDATE`/`DELETE` on ledger and audit tables). Credentials come from environment configuration, never from the repository.

**Verification:** Tests that constraints reject negative balances, duplicate idempotency keys, orphaned references, and invalid amounts, independent of service logic.

---

## 21. API Design

> **All endpoints below are PROPOSED. None are implemented.** Paths, payloads, and status codes may change during implementation, and any change should be recorded as an actual decision.

Conventions (proposed):
- JSON over HTTPS.
- All endpoints except login require authentication.
- Identity comes from the token or session, never from request fields.
- Financial write endpoints require an `Idempotency-Key` header.

### 21.1 Authentication

| Item | Detail |
|---|---|
| **Endpoint** | `POST /auth/login` — **PROPOSED** |
| Purpose | Verify credentials and issue a token. |
| Authentication required | No. |
| Authorization | n/a |
| Important input | Login identifier, password. |
| Important output | Access token, expiry. No password echo. |
| Security considerations | HTTPS only. Generic failure message. Rate limiting. Never log the password. Audit success and failure. |

### 21.2 Accounts

| Item | `GET /accounts` — **PROPOSED** | `GET /accounts/{id}` — **PROPOSED** |
|---|---|---|
| Purpose | List accounts the caller may see. | Retrieve one account and its balance. |
| Authentication | Required. | Required. |
| Authorization | Returns **only** accounts the caller is authorized for. | Object-level check on `{id}`. |
| Important input | Pagination. | Path ID. |
| Important output | Account summaries. | Account details and balance. |
| Security | No cross-user leakage. | **IDOR/BOLA protection.** Do not reveal existence to non-authorized callers. |

### 21.2a Additional endpoints considered

Account creation is P0, but none of the originally listed endpoints creates an account. The following is therefore genuinely required and is added as **PROPOSED**:

| Item | Detail |
|---|---|
| **Endpoint** | `POST /accounts` — **PROPOSED** |
| Why it is needed | Account creation is a P0 requirement and no other listed endpoint provides it. |
| Authentication | Required. |
| Authorization | Account Holder creates an account for themselves. Administrator creation on behalf of others only if explicitly authorized by rule (`UNKNOWN / NEEDS VERIFICATION`). |
| Important input | Optional descriptive fields only. **No** owner, role, or balance fields. Whether it requires an `Idempotency-Key` to avoid duplicate accounts on retry is `UNKNOWN / NEEDS VERIFICATION`. |
| Important output | Account ID, initial balance of 0. |
| Security | Owner derived from the authenticated identity. Balance always starts at zero. Audit event recorded. |

**User provisioning** (how users come to exist) is `UNKNOWN / NEEDS VERIFICATION`. The simplest option is seeded or administrator-created users. If self-registration is chosen, `POST /auth/register` would be **PROPOSED**, would need to force the role to Account Holder server-side (never accept a role from the client), and would need rate limiting. It is not part of the required endpoint set unless that decision is made.

All other endpoints in this section are kept as originally proposed.

### 21.3 Deposits

| Item | Detail |
|---|---|
| **Endpoint** | `POST /accounts/{id}/deposits` — **PROPOSED** |
| Purpose | Deposit into an account. |
| Authentication | Required. |
| Authorization | Caller authorized for target account `{id}`. |
| Important input | Amount, `Idempotency-Key` header. |
| Important output | Transaction ID, status, resulting balance. |
| Security | Positive amount, idempotency, atomic ledger write, audit event. |

### 21.4 Withdrawals

| Item | Detail |
|---|---|
| **Endpoint** | `POST /accounts/{id}/withdrawals` — **PROPOSED** |
| Purpose | Withdraw from an account. |
| Authentication | Required. |
| Authorization | Caller must own `{id}`. |
| Important input | Amount, `Idempotency-Key` header. |
| Important output | Transaction ID, status, resulting balance. |
| Security | Lock before funds check, no negative balance, idempotency, audit event. |

### 21.5 Transfers

| Item | Detail |
|---|---|
| **Endpoint** | `POST /transfers` — **PROPOSED** |
| Purpose | Move money between two accounts atomically. |
| Authentication | Required. |
| Authorization | Caller must own the source account. |
| Important input | Source account ID, destination account ID, amount, `Idempotency-Key` header. |
| Important output | Transaction ID, status. Balance of the source only. |
| Security | Source ownership check, destination validation, deterministic lock order, atomicity, idempotency, audit. |

### 21.6 Transactions

| Item | `GET /accounts/{id}/transactions` — **PROPOSED** | `GET /transactions/{id}` — **PROPOSED** |
|---|---|---|
| Purpose | Paginated transaction history for an account. | Retrieve one transaction. |
| Authentication | Required. | Required. |
| Authorization | Caller authorized for `{id}` (or explicit Auditor rule). | Caller authorized for an involved account (or explicit Auditor rule). |
| Important input | Pagination, optional date filter. | Path ID. |
| Important output | Transaction summaries with timestamps and statuses. | Transaction details and ledger entries as appropriate. |
| Security | Enforce pagination limits. No leakage of other accounts' counterparty data beyond what is permitted. | IDOR/BOLA protection. |

Administrative and auditor endpoints (for example user management, audit-event reads) are intentionally **not specified yet**. They will be added only when required and will be marked `PLANNED — NOT IMPLEMENTED` until built.

---

## 22. API Security

**Status:** PROPOSED. Do not over-engineer beyond challenge needs.

- **HTTPS.** Required in deployment. TLS is typically terminated by the hosting platform or reverse proxy. HTTP should redirect or be refused. Local development may use HTTP.
- **Authentication and authorization.** As in Sections 5 and 6, with default-deny.
- **CORS.** Allow only the known frontend origin(s). Never use a wildcard origin together with credentials. Restrict methods and headers. The allowed origins come from configuration.
- **CSRF.** The proposed JWT approach sends the token in the `Authorization` header and uses no authentication cookies, so CSRF protection can be disabled for the API with a documented justification. If the design ever changes to cookie-based authentication, CSRF protection must be enabled, along with `SameSite` cookie attributes.
- **Rate limiting (P1; keep it simple and do not let it delay P0 work).** At minimum on `POST /auth/login` to slow credential guessing, and ideally on financial write endpoints to limit abuse. A simple in-memory or gateway-level limiter is enough for the challenge. Account lockout or progressive delay can supplement it.
- **Request validation.** Server-side validation of all inputs, with maximum request body size.
- **Secure error responses.** See Section 18.
- **Security headers.** Where the backend serves responses to browsers: `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` in HTTPS deployments, `Cache-Control: no-store` on sensitive responses, and a restrictive `Content-Security-Policy` where the frontend is served. Exact set is `UNKNOWN / NEEDS VERIFICATION`.
- **Secret management.** Database credentials, token signing keys, and any other secrets come from environment variables or a secret store, never from source control. Provide a secrets-free example configuration template.
- **Logging.** Never log passwords, tokens, or secrets. Include correlation IDs. Avoid logging full financial request bodies.
- **Abuse prevention.** Sensible limits on amounts and page sizes, and uniform responses that avoid account enumeration.
- **Dependencies.** Keep dependencies reasonably current and review known vulnerabilities before deployment.

**Verification:** CORS tests for disallowed origins, login rate-limit tests, header checks, and a review confirming no secrets in the repository or logs.

---

## 23. Testing Strategy

**Status:** PROPOSED. No tests exist, and none have been run. Intended tooling direction: JUnit 5, Spring Boot Test, Spring Security Test, and Testcontainers with real PostgreSQL for database-dependent tests. The tooling is `UNKNOWN / NEEDS VERIFICATION`.

**Why real PostgreSQL for integration tests:** locking, constraints, isolation behavior, and unique-index behavior differ between PostgreSQL and in-memory databases such as H2. Concurrency and constraint tests against a different engine would not prove the production behavior.

### 23.1 Unit tests
- negative and zero amounts rejected
- amounts with excess precision rejected
- insufficient funds rejected
- balance calculation logic
- authorization policy rules (who may access which account)
- idempotency fingerprint comparison

### 23.2 Integration tests
- database behavior and constraints (negative balance rejected, duplicate idempotency key rejected)
- **transaction rollback:** injected failure leaves no balance, ledger, or transaction change
- authentication (valid, invalid, expired, tampered tokens)
- authorization (role and object-level)
- idempotency (duplicate requests return one effect)

### 23.3 Security tests
- unauthorized account access (unauthenticated gets 401)
- **IDOR:** user A requests, withdraws from, or transfers from user B's account and must be denied
- role escalation (Account Holder calling administrator endpoints, Auditor calling financial writes)
- unauthorized withdrawal
- unauthorized transfer (foreign source account)
- idempotency key cross-user interference
- error responses leak no internals

### 23.4 Concurrency tests
- simultaneous withdrawals on one account (exactly the allowed number succeed)
- simultaneous transfers from the same source
- many concurrent credits to the same destination
- opposite-direction transfers (no deadlock failure or lost money)
- duplicate concurrent requests with the same idempotency key

### 23.5 Financial invariants

Tests should verify:

```text
No negative balance
Total debits = total credits
No duplicate financial effect
No partial transfer
```

### 23.6 Evidence tests should produce
- automated test reports (pass/fail with counts) saved as build output
- a reproducible command that runs the suite
- for concurrency tests: the number of threads, the observed outcomes, and the final invariant checks
- a record, in the Verification Checklist (Section 28), linking each requirement to the specific test that proves it

No evidence exists yet. Do not claim any test passes until it has actually been run.

### 23.7 Prioritized test list

**P0 security and financial tests** (write these first):

1. Authentication success and failure
2. Password hashing (stored value is a hash, never plaintext)
3. RBAC
4. Account ownership
5. IDOR/BOLA attempts
6. Negative withdrawal
7. Withdrawal exceeding balance
8. Concurrent withdrawals
9. Concurrent transfers
10. Duplicate idempotency request
11. Same idempotency key with different payload
12. Transfer atomicity
13. Ledger balancing
14. Rollback after failure
15. Audit event creation
16. Client attempting to manipulate balance
17. Client attempting to manipulate role/ownership

**Recommendation:** use **Testcontainers with real PostgreSQL** for database and concurrency tests where practical. Locking, constraint, and unique-index behavior must be proven on the same database engine used in production.

**P1 tests** (if time permits): additional concurrency scenarios, additional authorization tests across all endpoints, transaction-history authorization and pagination, Auditor read-only enforcement, and error-response format tests.

---

## 24. Threat-to-Control Mapping

> All controls below are **PROPOSED**. None are implemented. Verification is planned, not performed.

| Threat | Proposed control | Verification |
|---|---|---|
| IDOR | Server-side ownership authorization | Security test |
| Duplicate transaction | Idempotency mechanism | Duplicate-request test |
| Race condition | Database concurrency control | Concurrent-operation test |
| Negative balance | Atomic balance check/update | Withdrawal test |
| Partial transfer | Database transaction | Rollback test |
| Privilege escalation | RBAC + server-side authorization | Role test |
| Audit tampering | Restricted/append-only audit design | Audit security test |
| Sensitive data exposure | Secure logging/error handling | Security review/test |
| Authentication attacks (credential stuffing, brute force) | Strong password hashing, login rate limiting, generic failure messages | Login abuse tests, review |
| Forged or tampered tokens | Signature, expiry, algorithm pinning | Tampered-token tests |
| Malicious or malformed input | Server-side validation, parameterized queries, size limits | Validation tests |
| Idempotency key abuse | Per-user scoping, payload fingerprint, DB unique constraint | Cross-user and mismatch tests |
| Deadlock / lock contention | Deterministic lock ordering, short transactions, bounded retry | Opposite-direction transfer test |

The dedicated `THREATS.md` will provide the full analysis later.

---

## 25. Additional Supporting Invariants

The ten invariants in **Non-Negotiable Financial Invariants** (near the top of this document) are the primary list. The following supporting invariants are also required. Each is a **requirement**, and each should later become automated test cases:

1. Unauthorized users cannot modify financial state.
2. Every valid transfer has corresponding debit and credit entries.
3. Account balances remain consistent with authoritative financial records (balance reconciles with the ledger).
4. Idempotency keys cannot be reused to execute a different operation.
5. The recorded transaction state always reflects the actual financial outcome (from `PROJECT_CONTEXT.md`, Section 7).

---

## 26. Security-Critical Code Rules

Future implementation **must** follow these rules:

- Never trust account IDs supplied by the client.
- Never trust client-provided balances.
- Never allow the frontend to decide authorization.
- Never use floating-point arithmetic for money.
- Never log passwords, tokens, or secrets.
- Never allow financial operations without authentication.
- Never allow account access without authorization.
- Never perform balance checks outside the appropriate transaction/concurrency boundary.
- Never process financial operations without idempotency protection where required.
- Never allow partial financial updates.
- Never expose stack traces or database internals to clients.

Additional proposed rules:
- Never build SQL by string concatenation with user input. Use parameterized queries or JPA parameter binding.
- Never commit secrets, keys, or real credentials.
- Never add an endpoint without stating its authentication and authorization rule.
- Never write a balance outside the Transaction/Ledger component.

---

## 27. Implementation Order

All steps are **not started**.

| # | Step | Depends on |
|---|---|---|
| 1 | Project/bootstrap setup | None |
| 2 | Database/domain model | 1 |
| 3 | User/authentication | 2 |
| 4 | RBAC | 3 |
| 5 | Account management (with ownership enforcement) | 2, 3, 4 |
| 6 | Financial transaction model | 2, 5 |
| 7 | Deposits | 5, 6 |
| 8 | Withdrawals | 5, 6 (and the locking approach from 12) |
| 9 | Double-entry ledger | 6 (should be introduced **with** steps 7 and 8, not bolted on later) |
| 10 | Transfers | 7, 8, 9 |
| 11 | Idempotency | 6; must be in place before financial endpoints are treated as complete |
| 12 | Concurrency protection | 8, 10; verified with concurrency tests |
| 13 | Audit trail | 3 and onward; events added as features land |
| 14 | Error handling/validation | Begins early, finalized here |
| 15 | Automated tests | Written alongside each step, consolidated here |
| 16 | Security testing | 4, 5, 10, 11, 12 |
| 17 | Integration with frontend | Stable API from steps 3 to 12 |
| 18 | Deployment | All prior steps |

**Priority note:** Steps map to the 7-Day Implementation Scope. Work that is P1 or P2 (for example administrator account-management features, Auditor read endpoints, transaction-history polish, and extra frontend features) must not displace the P0 steps above.

**Dependency notes:**
- Authentication and RBAC precede any financial endpoint. No financial endpoint should exist without authorization.
- The ledger and the transaction model should be designed before deposits and withdrawals so those operations are never implemented as bare balance updates.
- Idempotency and concurrency protection are not "polish". Deposits, withdrawals, and transfers should not be considered done until both are in place and tested.
- Tests and audit events should be added incrementally with each feature, not postponed to the end.

---

## 28. Verification Checklist

> Initial state: nothing is implemented and nothing is tested. **Update this table only with real evidence** (for example a commit, a file path, or a test report), and never speculatively.

| Requirement | Implemented | Tested | Evidence |
|---|---|---|---|
| Authentication | No | No | — |
| RBAC | No | No | — |
| Account authorization | No | No | — |
| Account management | No | No | — |
| Deposits | No | No | — |
| Withdrawals | No | No | — |
| Transfers | No | No | — |
| Double-entry ledger | No | No | — |
| Balance/ledger reconciliation | No | No | — |
| Transaction atomicity / rollback | No | No | — |
| Idempotency | No | No | — |
| Concurrency protection | No | No | — |
| Deadlock handling | No | No | — |
| Audit trail | No | No | — |
| Input validation | No | No | — |
| Error handling | No | No | — |
| API security (CORS, rate limiting, headers) | No | No | — |
| Security tests | No | No | — |
| Financial invariant tests | No | No | — |
| Deployment | No | No | — |

---

## 29. Decisions Requiring Verification

Each item below is `UNKNOWN / NEEDS VERIFICATION`. When a decision is made, record the actual decision and reasoning, and update this document.

| Decision | Current proposal | Status |
|---|---|---|
| Authentication strategy | Stateless short-lived JWT (proposed approach) | Proposed. Confirm once implemented |
| Token lifetime and client-side storage | Bearer header, in-memory on client, no refresh tokens | `UNKNOWN / NEEDS VERIFICATION` |
| Password hashing algorithm and parameters | bcrypt or Argon2 via Spring Security | `UNKNOWN / NEEDS VERIFICATION` |
| Single vs. multiple roles per user | Single role (simpler) | `UNKNOWN / NEEDS VERIFICATION` |
| User provisioning (seeded, admin-created, or self-registration) | Seeded or admin-created (simplest) | `UNKNOWN / NEEDS VERIFICATION` |
| Administrator financial powers | No ability to move customer money by default | `UNKNOWN / NEEDS VERIFICATION` |
| Exact PostgreSQL schema | Not defined | `UNKNOWN / NEEDS VERIFICATION` |
| Migration tool | Flyway or Liquibase | `UNKNOWN / NEEDS VERIFICATION` |
| Balance representation | Stored balance reconciled with ledger | `UNKNOWN / NEEDS VERIFICATION` |
| Money type | `BigDecimal` with PostgreSQL `NUMERIC(19,2)`, single currency | Finalized as the proposed representation. Apply consistently |
| Debit/credit sign convention | Project convention in Section 11 | `UNKNOWN / NEEDS VERIFICATION` |
| System/clearing account handling and contention | Single system account | `UNKNOWN / NEEDS VERIFICATION` |
| Transaction isolation level | `READ COMMITTED` plus explicit locks | `UNKNOWN / NEEDS VERIFICATION` |
| Locking strategy | Pessimistic row locks, ordered | `UNKNOWN / NEEDS VERIFICATION` |
| Deadlock retry policy | Small bounded retry | `UNKNOWN / NEEDS VERIFICATION` |
| Idempotency storage and retention | Database table with unique (user, key) | `UNKNOWN / NEEDS VERIFICATION` |
| Idempotency mismatch status code | 422 or 409 | `UNKNOWN / NEEDS VERIFICATION` |
| Persisting failed outcomes (transaction records and idempotency) | Separate transaction, no ledger entries | `UNKNOWN / NEEDS VERIFICATION` |
| Audit storage and tamper-resistance level | Append-only table with restricted DB privileges | `UNKNOWN / NEEDS VERIFICATION` |
| Authorization denial convention (403 vs 404) | Uniform, non-revealing | `UNKNOWN / NEEDS VERIFICATION` |
| API response and error format | Consistent JSON error shape | `UNKNOWN / NEEDS VERIFICATION` |
| Rate-limiting mechanism | Simple limiter on login and writes | `UNKNOWN / NEEDS VERIFICATION` |
| Deployment architecture and TLS termination | Not decided | `UNKNOWN / NEEDS VERIFICATION` |
| Test tooling | JUnit 5, Spring Boot Test, Testcontainers | `UNKNOWN / NEEDS VERIFICATION` |

---

## 30. Backend Definition of Done

> This is a **future** definition of done. **It is not the current status.** Today, none of these conditions are met.

The backend can be considered complete only when **all** of the following are true and evidenced:

- Authentication working
- RBAC working
- Account-level authorization working
- Deposits working
- Withdrawals working
- Transfers working
- Ledger consistency verified
- Idempotency verified
- Concurrency protection verified
- Audit trail verified
- Security tests passing
- Financial invariant tests passing
- No known critical security vulnerabilities
- API documentation available

"Working" means implemented **and** demonstrated by automated tests that were actually run. Any condition lacking evidence is not met.

---

## Definition of Done for Financial Operations

> This is a **future** definition. **It is not the current status.** No financial operation is implemented.

A **deposit**, **withdrawal**, or **transfer** is complete only when **all** of the following are true and evidenced:

1. Authentication and authorization verified
2. Input validated
3. Ownership verified where applicable (target account for deposits, source account for withdrawals and transfers)
4. Idempotency handled (`Idempotency-Key` required, scoped to the user, unique in the database, committed atomically with the operation)
5. Database transaction used
6. Appropriate account locks obtained (in deterministic order for transfers)
7. Balance rules enforced server-side
8. Ledger entries created
9. Ledger remains balanced (total debits = total credits)
10. Audit event recorded
11. Commit occurs atomically
12. Automated tests pass

An operation missing any item above must not be described as complete.

---

## Closing principle

> The backend must be the authoritative security and financial correctness boundary. The frontend can request an operation, but only the backend can authorize and commit the financial effect.
