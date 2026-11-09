# Arthivex — PROMPTS.md

**Project:** Arthivex — Secure Financial Transaction & Ledger Management System (formerly FinGuard)  
**Purpose:** Chronological record of the AI-assisted project work, implementation direction, corrections, and verification prompts.

> **Accuracy note:** This document distinguishes between (a) prompt text supplied verbatim in the available project conversation and (b) concise historical phase records reconstructed from the documented interaction history. Reconstructed summaries are not presented as exact quotations. Where the original wording is not available, this file records the task and constraints without inventing a transcript, AI response, or test result.

---

## Project identity and permanent instructions

- The official project name is **Arthivex** (rebranded from the initial development codename **FinGuard** per Prompt 14). Do not rename it to LedgerLine, BalanceVault, or another name.
- Preserve the existing repository and working features. Inspect before changing.
- The current project context identifies the stack as **React + Vite frontend, Java + Spring Boot backend, Maven, PostgreSQL, JPA/Hibernate, and Flyway**. Verify the actual repository before relying on this description.
- The backend is the authority for authentication, authorization, account ownership, balances, and financial transactions. The frontend is untrusted.
- Do not use mock data, hardcoded financial values, fabricated users, or unsupported banking/security claims as evidence of functionality.
- Do not expose passwords, password hashes, JWTs, signing secrets, database credentials, API keys, or other private tokens.
- Use only local/test/synthetic data. Never use real bank accounts or real money.
- Do not claim a feature or test passed unless it was actually verified. Use `NOT VERIFIED` when execution or evidence is unavailable.
- Do not make broad architectural changes without first reporting the need and obtaining approval where appropriate.

---

## Historical project phases — Prompts 1–11

The following entries preserve the documented sequence and substance of the earlier project work. They are phase records, not claims that every sentence reproduces the original prompt verbatim.

### Prompt 1 — Project understanding and challenge requirements

**Task:** Understand the hiring challenge and translate its requirements into a practical FinGuard project plan.

**Recorded direction:**
- Keep the project identity as FinGuard.
- Understand the problem, expected features, evaluation criteria, and deliverables before implementation.
- Separate required functionality from optional enhancements.
- Avoid claiming that planned features already exist.
- Identify the frontend, backend, database, security, and documentation work needed.

**Evidence rule:** Requirements and plans are not implementation evidence.

### Prompt 2 — Project context and architecture documentation

**Task:** Establish project context and technical documentation to guide implementation.

**Recorded direction:**
- Document the actual project purpose, architecture, stack, trust boundaries, and planned features.
- Keep the backend as the security and financial correctness boundary.
- Explain that the browser/frontend is untrusted.
- Distinguish implemented, planned, and unverified functionality.
- Keep project documentation consistent with the repository.

**Related artifacts:** `PROJECT_CONTEXT.md`, `BACKEND.md`, `FRONTEND.md`, and `THREATS.md`.

### Prompt 3 — Frontend implementation and page structure

**Task:** Build the FinGuard frontend using the established frontend stack and page requirements.

**Recorded direction:**
- Use React and Vite, subject to verification against the actual repository.
- Build a consistent application shell, navigation, pages, reusable components, forms, and responsive layouts.
- Include the account, transaction, authentication, dashboard, profile, and settings experiences required by the project.
- Keep the UI connected to backend services rather than treating frontend state as authoritative.
- Avoid presenting simulated financial operations as real transactions.

### Prompt 4 — Stitch design integration

**Task:** Use the connected Stitch project as the visual source of truth for the frontend.

**Recorded direction:**
- Inspect the actual Stitch project and its screens before implementation.
- Compare the existing frontend against the Stitch designs.
- Preserve the intended layout, typography, spacing, colors, cards, buttons, icons, navigation, and responsive behavior.
- Do not invent missing Stitch screens. Identify missing designs and report them.
- Keep frontend-only work inside `frontend/` unless a separately approved task requires otherwise.

### Prompt 5 — Backend foundation

**Task:** Establish the backend foundation.

**Recorded direction:**
- Inspect the repository and use its actual Java/Maven/Spring Boot setup.
- Configure PostgreSQL access and database migrations.
- Establish domain entities, repositories, validation, error handling, configuration, CORS, and health checks as appropriate.
- Keep secrets in environment configuration.
- Build and test the backend.
- Do not claim full authentication, RBAC, financial operations, idempotency, audit logging, or frontend integration merely because foundation classes or dependencies exist.

### Prompt 6 — Authentication and authorization

**Task:** Implement and verify authentication and authorization through the backend.

**Recorded direction:**
- Trace login and registration from the frontend through the API and Spring Security to the authenticated principal.
- Verify password hashing and secure credential storage.
- Verify JWT creation and validation, including signature and expiry checks and issuer validation where configured.
- Enforce role-based authorization on the backend.
- Use default-deny access rules for protected endpoints.
- Enforce account ownership in backend services to prevent IDOR/BOLA.
- Do not trust role, owner ID, account balance, or user identity supplied by the frontend.

### Prompt 7 — Financial accounts and transaction operations

**Task:** Implement and verify the financial account and transaction lifecycle.

**Recorded direction:**
- Verify account creation, ownership, account number generation, currency, balance persistence, and status.
- Trace deposits, withdrawals, and transfers end to end.
- Validate positive amounts and sufficient funds on the server.
- Use precise decimal types for money.
- Persist transaction and ledger effects atomically.
- Verify rollback, negative-balance prevention, locking, and concurrency behavior.
- Ensure transaction history is sourced from persisted backend data.

### Prompt 8 — Ledger, idempotency, and financial integrity

**Task:** Strengthen the financial correctness guarantees.

**Recorded direction:**
- Verify double-entry accounting and ensure total debits equal total credits for each posted transaction.
- Ensure ledger entries reference the relevant transaction and currency.
- Prevent improper ledger modification or deletion through application and database permissions where appropriate.
- Require idempotency keys for operations that need them.
- Scope idempotency correctly, validate request fingerprints, reject key reuse with a different payload, and protect against concurrent duplicates.
- Verify deterministic locking and transaction atomicity.
- Test failure paths, insufficient funds, duplicate requests, and concurrent requests against a safe test database where available.

### Prompt 9 — Security, threat model, and test evidence

**Task:** Reconcile the implementation with the threat model and security requirements.

**Recorded direction:**
- Review authentication, authorization, ownership, input validation, safe error handling, CORS, secrets, logging, and database privileges.
- Identify threats and map each to controls and executable tests.
- Keep `THREATS.md` aligned with the actual implementation.
- Do not promote a planned control to implemented without evidence.
- Record test IDs, commands, actual outcomes, and residual risks.
- Do not claim that FinGuard is completely secure or compliant with banking regulations.

### Prompt 10 — Documentation, cleanup, and project readiness

**Task:** Prepare the project documentation and remove misleading or duplicate content.

**Recorded direction:**
- Create or update the root `README.md` with overview, features, stack, architecture, structure, prerequisites, database setup, environment variables, startup, actual API overview, tests, security limitations, local development, deployment, and demo instructions.
- Create `PROMPTS.md` from actual AI interactions and project phases; do not fabricate prompts or tool evidence.
- Remove duplicate documentation only after comparing its content.
- Remove fabricated identities, mock balances, fake APY, fake bank details, and unsupported FDIC/HSM/FedLine or similar claims.
- Keep `.env` out of source control and `.env.example` limited to placeholders.
- Run the frontend build and backend tests, and report exact results.

### Prompt 11 — Frontend financial UI, INR, account workflow, and data truthfulness

**Task:** Correct account and financial UI behavior while preserving the existing design.

**Recorded direction:**
- Separate **Create Financial Account** from **Link Bank Account**.
- Creating an account creates an internal FinGuard account, not an external bank connection.
- New accounts start at zero balance.
- INR is the default currency where appropriate; preserve genuine USD/EUR records and do not invent exchange rates.
- Use a centralized currency formatter and proper `en-IN` formatting for INR.
- Mark external bank linking as **Coming Soon** unless a real integration exists. Do not simulate bank verification or a successful connection.
- Remove fabricated totals, APY, growth percentages, liquidity claims, routing numbers, and unsupported institutional/security claims.
- Derive displayed financial values from authenticated backend data.
- For new users, show truthful zero/empty states. For API failures, show an error state rather than fake fallback data.
- Preserve the Stitch design and verify Light/Dark mode.

**Previously reported implementation evidence is not a substitute for re-running the current audit.** Historical reports mentioned INR support, Flyway V5, centralized formatting, and successful builds/tests; verify those claims against the current checkout before relying on them.

---

## Prompt 12 — Add missing Admin, Onboarding, Audit Logging & Rate Limiting features

**Prompt status:** User supplied a detailed implementation prompt. The prompt below is a normalized record of its requirements; it is not a claim that these features have been implemented.

### Objective

Inspect the existing FinGuard application and safely add missing administrator bootstrap/authentication, user management, onboarding lifecycle, persistent audit logging, Redis-backed rate limiting, and the corresponding frontend administration experience.

### Mandatory repository inspection

Before coding, inspect:
- Complete repository structure and actual frontend/backend directories.
- Actual technologies and versions.
- Build files and dependencies.
- Database schema and existing migrations.
- Existing user, role, authentication, JWT, account, onboarding, and audit implementations.
- Existing Redis configuration or dependencies.
- Existing controllers, services, repositories, filters, security rules, frontend routes, API services, and tests.

**Stack correction:** Some earlier prompt text referred to Node.js, Prisma, and a Node middleware stack. That reference may be stale. The documented current FinGuard stack is Java, Spring Boot, Maven, PostgreSQL, JPA/Hibernate, and Flyway. Do not introduce Node.js/Prisma or replace the backend stack. Inspect the actual repository and implement in the existing architecture. If the repository differs, report the discrepancy before making architectural changes.

If a feature is partly implemented, extend or repair it rather than creating duplicates. Present a plan before large architectural changes.

### 12.1 First-administrator bootstrap

- Provide a controlled, server-side method to provision the first administrator.
- Use a protected environment/configuration secret or another safe bootstrap mechanism.
- Never allow public registration to select the administrator role.
- Prevent repeated unauthorized promotion or bootstrap abuse.
- Make the bootstrap operation auditable.
- Document the local and deployment bootstrap procedure.
- Never hardcode bootstrap secrets or expose them to the frontend.

### 12.2 Administrator authentication and authorization

- Reuse the existing authentication system.
- Derive the caller's identity and role from trusted backend authentication.
- Protect every administrator endpoint on the backend.
- Reject unauthenticated callers and callers with insufficient roles.
- Return appropriate, non-revealing HTTP responses.
- Do not rely on hidden frontend buttons or client-side role flags for security.

### 12.3 Administrator user management

Where appropriate and supported by the existing data model, allow administrators to:
- View and search users.
- View account status, role, onboarding state, and creation date.
- Activate or deactivate users.
- Change roles through a controlled, authorized workflow.
- Manage onboarding decisions.

Never expose passwords, password hashes, JWTs, tokens, or secrets. Prevent unsafe removal or demotion of the last usable administrator. Audit administrative changes. Administrators must not automatically gain permission to move customer funds.

### 12.4 Onboarding lifecycle

- Inspect the existing onboarding model first.
- Implement a clear lifecycle, such as `PENDING`, `APPROVED`, and `REJECTED`, only if it fits the actual requirements and current model.
- Define the initial state for new users.
- Enforce state transitions on the backend.
- Users must not be able to approve themselves.
- Restrict approval/rejection to authorized administrators.
- Record each decision in the audit trail.
- Do not invent a KYC, identity-verification, or bank-verification integration.

### 12.5 Persistent audit logging

Use persistent PostgreSQL storage where appropriate. Record relevant events such as:
- Registration.
- Login success and failure.
- Logout, if the application has a meaningful server-side logout event.
- Account creation.
- Financial operations.
- Administrator bootstrap.
- Role and account-status changes.
- Onboarding decisions.
- Other sensitive administrative actions.

An audit record should contain appropriate fields such as event ID, timestamp, actor, action/event type, target/reference, result, safe metadata, and correlation ID.

Security requirements:
- Never record passwords, password hashes, JWTs, access tokens, secrets, or database credentials.
- Prevent ordinary users from editing or deleting audit events.
- Do not add an API that exposes sensitive audit metadata.
- Consider transaction boundaries carefully: security-denial events that must survive a rolled-back business transaction may need a separate transaction.
- Do not claim tamper-proof or hash-chained audit logging unless it is actually implemented and verified.

### 12.6 Audit-log administration UI

- Provide an administrator-facing audit log view if the backend capability is implemented.
- Show useful event information such as event type, actor, target, timestamp, and success/failure.
- Add appropriate search, filters, and pagination.
- Show a truthful empty state when there are no events.
- Give the Auditor role read-only access only if that role and permission are explicitly supported by the existing authorization model.
- Do not grant audit access to ordinary account holders.

### 12.7 Redis-backed rate limiting

- First inspect whether Redis already exists in the repository/environment.
- If Redis is not configured, propose the dependency and configuration impact before introducing it.
- Apply backend-enforced limits to login, registration, sensitive authentication operations, and administrator mutations as appropriate.
- Configure Redis connection details and limits through environment variables.
- Do not hardcode credentials.
- Define safe behavior when Redis is unavailable; do not silently disable all protection without documenting the behavior.
- Return a controlled rate-limit response, such as HTTP 429, without exposing internal errors.
- Avoid permanent account lockouts that attackers could abuse for denial of service.
- Test the actual backend enforcement, not merely the presence of a Redis dependency or frontend message.

### 12.8 Frontend administrator dashboard

- Show administrator navigation only when the authenticated backend identity has the appropriate role.
- Add user management, onboarding management, and audit-log pages only when corresponding backend APIs exist.
- Do not display fake users, fake audit events, fake statistics, or mock onboarding records.
- Handle loading, empty, unauthorized, and API-error states.
- Preserve the existing FinGuard visual language and theme behavior.

### 12.9 Database and API design

- Reuse existing tables and endpoints where possible.
- Add migrations only when required.
- Never modify already-applied migrations; create a new migration for schema changes.
- Add indexes for actual query patterns, such as event timestamp, actor, event type, and target, where justified.
- Enforce authorization and object-level access on every relevant endpoint.
- Avoid returning sensitive user fields.

### 12.10 Tests and regression verification

Add and run meaningful tests for:
- First-admin bootstrap and repeated bootstrap attempts.
- Administrator authentication and authorization.
- Ordinary-user and Auditor denial where applicable.
- User management and last-admin safeguards.
- Onboarding state transitions and self-approval prevention.
- Audit event creation and access restrictions.
- Sensitive-data exclusion from logs.
- Rate limiting and HTTP 429 behavior.
- Redis-unavailable behavior.
- Existing registration/login, account creation, INR handling, transactions, and ownership protections.

Run the frontend production build and backend test suite. Report exact counts and outcomes. Do not claim tests passed unless executed.

### 12.11 Security and truthfulness review

Search for fake balances, APY, bank connections, FedWire/FedLine, Plaid/MX, FDIC, HSM, verification claims, hardcoded demo identities, passwords, secrets, and administrator flags. Remove or correct misleading claims only within the approved scope.

### Required final report for Prompt 12

Report:
1. Actual stack and repository findings.
2. Features already present, missing, or partial.
3. Files changed and why.
4. Database migrations added.
5. Endpoints added or changed.
6. Frontend pages/components added or changed.
7. Environment variables required, with no secret values.
8. Authorization and isolation checks.
9. Test commands and exact test counts/results.
10. Frontend build result.
11. Limitations and anything marked `NOT VERIFIED`.

Preserve the FinGuard identity, existing Accounts/INR behavior, internal account creation, zero initial balances, and the separate **Link Bank Account — Coming Soon** workflow.

---

## Prompt 13 — Complete Technical Audit & Requirement Verification

**Prompt status:** The following is the user's supplied audit prompt, preserved as the authoritative audit specification. It requests inspection and verification only. It explicitly prohibits silent project modifications during the audit.

### Objective

Audit the existing project:

**FinGuard — Secure Financial Transaction & Ledger Management System**

Determine whether the actual source code, database, APIs, frontend, and tests genuinely implement the requirements. Do not assume implementation because a UI component, endpoint, table, test file, document, or earlier AI report exists.

A requirement can be marked `PASS` only when supported by actual evidence and successful execution/testing where applicable.

### 13.1 First inspect the actual project

Before making changes:
1. Inspect the complete repository structure.
2. Identify actual frontend and backend directories.
3. Identify actual technologies and versions.
4. Inspect package/build files.
5. Inspect database configuration.
6. Inspect environment configuration without exposing secrets.
7. Inspect security configuration.
8. Inspect controllers.
9. Inspect services.
10. Inspect repositories/entities/models.
11. Inspect database migrations/schema.
12. Inspect frontend pages/components/services.
13. Inspect test directories and test implementations.
14. Inspect existing documentation.

Do not modify the project during the initial audit. If the actual project differs from a requirement, report the difference rather than changing it automatically.

### 13.2 Project identity

Verify consistent use of **FinGuard** in:
- Application title and frontend branding.
- Backend service name.
- Package/project metadata where applicable.
- Documentation and page titles.
- Visible navigation and branding.

Do not rename the project.

### 13.3 Initial project setup

Verify actual implementation of:
1. React frontend.
2. Vite configuration.
3. Java version.
4. Maven configuration.
5. Spring Boot.
6. PostgreSQL connection.
7. PostgreSQL application user.
8. Spring Security.
9. Health-check endpoint.
10. Frontend development server.
11. Environment-variable configuration.
12. Database migrations.

Determine the Java version from build configuration and runtime. Do not assume Java 21.

### 13.4 Authentication and authorization

Verify:
1. Account-holder authentication.
2. Administrator authentication.
3. Auditor authentication, if implemented.
4. JWT generation.
5. JWT signature validation.
6. JWT expiration validation.
7. JWT issuer validation, if configured.
8. Invalid/tampered token rejection.
9. Password hashing and secure storage.
10. Role-based authorization.
11. Protected endpoints.
12. Default-deny behavior.
13. Unauthorized access rejection.
14. Account ownership checks.
15. IDOR/BOLA prevention.

Trace the complete path:

`Frontend → API → Security middleware/filter → JWT validation → authenticated principal → role authorization → controller/service`

Do not mark JWT as `PASS` because a JWT library is installed.

### 13.5 Account management

Verify actual functionality for:
1. Account creation.
2. Unique account numbers.
3. Account ownership.
4. Account status.
5. Multiple accounts per user.
6. Balance persistence.
7. Available balance.
8. Currency handling.
9. Account retrieval.
10. Unauthorized account-access prevention.
11. Zero initial balance where required.
12. Server-side account-creation validation.

Test actual API requests where possible. Confirm account data comes from PostgreSQL rather than hardcoded frontend data.

### 13.6 Deposits

Trace the complete flow:

`Frontend → API request → Controller → Service → Database transaction → Ledger entries → Balance update → API response → Frontend display`

Verify:
1. Authentication required.
2. Account ownership.
3. Amount validation.
4. Positive amount requirement.
5. Correct balance update.
6. Correct ledger entries.
7. Transaction persistence.
8. Atomicity.
9. Error handling.
10. Transaction history.

Execute a safe test deposit using a test account/database where possible.

### 13.7 Withdrawals

Verify:
1. Authentication.
2. Account ownership.
3. Amount validation.
4. Sufficient-balance check.
5. Negative-balance prevention.
6. Correct balance update.
7. Correct ledger entries.
8. Transaction persistence.
9. Atomic rollback on failure.
10. Transaction history.

Attempt an insufficient-balance withdrawal in a safe test environment. Verify that it fails safely and does not incorrectly modify the account or ledger.

### 13.8 Money transfers

Verify:
1. Source account validation.
2. Destination account validation.
3. Source ownership.
4. Destination validity.
5. Amount validation.
6. Same-account transfer handling.
7. Sufficient balance.
8. Source balance update.
9. Destination balance update.
10. Correct ledger entries.
11. Transaction reference.
12. Idempotency.
13. Atomicity.
14. Rollback.
15. Concurrency protection.

Actually test the transfer API where safe. Do not rely only on reading the transfer service.

### 13.9 Double-entry ledger

For every financial transaction, determine whether:

**Total debit = Total credit**

Verify:
1. Deposit creates balanced ledger entries.
2. Withdrawal creates balanced ledger entries.
3. Transfer creates balanced ledger entries.
4. Ledger entries reference the transaction.
5. Correct accounts are used.
6. Correct currency is used.
7. Entries are persisted atomically.
8. Failed transactions leave no orphan ledger entries.
9. Entries cannot be improperly modified.
10. Entries cannot be improperly deleted.
11. Account balances remain consistent with ledger data.
12. Concurrent transactions preserve ledger balance.

Inspect ledger and transaction entities, constraints, service logic, repositories, transaction annotations, and migrations. Where possible, verify actual database rows after test transactions.

### 13.10 Negative balance and financial integrity

Verify both application-level and database-level protection:
- Service validation.
- Database constraints.
- Transaction isolation.
- Locking.
- Race-condition handling.

Safely attempt:
1. Withdrawal greater than balance.
2. Two simultaneous withdrawals against the same balance.
3. Duplicate transfer request.
4. Invalid amount.
5. Zero amount.
6. Negative amount.

Verify balances cannot become invalid.

### 13.11 Idempotency

Verify:
1. Idempotency key is required where required.
2. Key is associated with the appropriate user/request scope.
3. Request fingerprint/payload validation exists where required.
4. Repeating the same request does not create another transaction.
5. Reusing the key with a different payload is rejected.
6. Database uniqueness prevents races.
7. Concurrent idempotency behavior is correct.

Execute duplicate requests. Do not mark `PASS` merely because an idempotency table or field exists.

### 13.12 Concurrency and atomicity

Verify:
1. Database transactions.
2. Locking strategy.
3. Isolation level where relevant.
4. Deterministic locking/order where required.
5. Race-condition prevention.
6. Atomic balance and ledger updates.
7. Rollback behavior.
8. Concurrent transfers.
9. Concurrent withdrawals.

Where possible, run concurrent requests against a safe test database and verify final balances and ledger totals.

### 13.13 Audit trail

Verify:
1. Audit records are persisted.
2. Actor/user is recorded.
3. Action/event type is recorded.
4. Timestamp is recorded.
5. Target/reference is recorded where appropriate.
6. Successful financial operations are recorded.
7. Failed security-sensitive operations are recorded where appropriate.
8. Ordinary users cannot modify audit records.
9. Unauthorized APIs cannot delete audit records.
10. Sensitive information is not logged.

Never store passwords, password hashes, JWTs, access tokens, secrets, or database credentials. If audit logging is absent, mark it accordingly.

### 13.14 Frontend dashboard and financial UI

Inspect the actual React application and verify:
1. Dashboard.
2. My Accounts.
3. Transactions.
4. Deposit.
5. Withdraw.
6. Transfer.
7. Settings.
8. Profile.
9. Authentication/session status.
10. Account balances.
11. Transaction history.
12. Ledger status.
13. Light Mode.
14. Dark Mode.
15. Responsive layout.

For every financial display determine whether the value comes from the backend or is hardcoded. Search for hardcoded balances, fake users, fake APY, fake growth percentages, fake bank information, fake routing numbers, fake transaction values, and fake security claims. Simulated values are not evidence of real functionality.

### 13.15 Current financial UI requirements

Verify the recently requested FinGuard Accounts changes.

**Internal account creation**
- `Create Financial Account` exists.
- It creates an internal FinGuard account.
- A new account starts at zero.
- INR is supported.
- USD/EUR are preserved where genuinely used.

**External bank linking**
- `Link Bank Account` is separate.
- It is marked `Coming Soon`.
- It does not pretend a real bank has been connected.
- It does not trigger fake verification.

**Currency**
- Verify the centralized currency formatter is used across the website.
- Search for inappropriate `$`, `USD`, and hardcoded monetary values.
- Do not replace genuine USD/EUR records with INR.
- Do not invent exchange rates.
- Verify proper `en-IN` formatting for INR.

### 13.16 Light/Dark mode and dashboard header

Verify the Dashboard Header correction, including:
- `Enterprise Treasury Core`
- `DOUBLE-ENTRY LEDGER ARCHITECTURE`
- Welcome heading and description.
- Ledger Status.
- Balanced indicator.
- JWT Authenticated indicator.
- Treasury Commands.
- Deposit Funds.
- Withdraw Funds.
- Transfer Money.
- Export Statement.

**Light Mode:** readable primary/secondary text, visible badges, borders, icons, buttons, and adequate contrast.

**Dark Mode:** preserve the existing dark design, orange accent, and green status indicators. Avoid unnecessary redesign. Do not modify unrelated sections just to fix this header.

### 13.17 Frontend/backend integration

Inspect every frontend API service. Verify:
1. API URLs.
2. HTTP methods.
3. Request bodies.
4. Response handling.
5. JWT/authentication headers.
6. Error handling.
7. Loading states.
8. Empty states.
9. Retry behavior.
10. CORS.
11. Database persistence.

For important features, make actual API requests where safe. A fetch/axios call in source code alone does not prove integration.

### 13.18 Health and operational endpoints

Verify:
- Health endpoint.
- Readiness endpoint, if implemented.
- HTTP status.
- Response body.
- Database connectivity where applicable.

Actually call the endpoint where possible.

### 13.19 Test suite audit

Inspect every test. Do not count test files as evidence.

For each test determine:
- What behavior it tests.
- Whether meaningful assertions exist.
- Whether it reaches the real service/controller/database when intended.
- Whether it can pass falsely.
- Whether it actually passes.

Verify unit, service, controller, authentication, authorization, account, deposit, withdrawal, transfer, ledger, idempotency, concurrency, negative-balance, rollback, and frontend tests.

Run available test suites and report exact:
- Tests run.
- Passed.
- Failed.
- Errors.
- Skipped.

### 13.20 Database audit

Inspect:
- Schema.
- Migrations.
- Constraints.
- Indexes.
- Foreign keys.
- Uniqueness.
- Currency constraints.
- Balance constraints.
- Transaction relationships.
- Ledger relationships.
- Idempotency constraints.
- Audit constraints.

Verify that the database enforces important financial invariants where appropriate. Do not expose credentials.

### 13.21 Secrets and environment configuration

Verify:
- Database credentials use environment variables.
- JWT secrets use environment variables.
- Redis credentials use environment variables if applicable.
- `.env` is ignored.
- `.env.example` contains placeholders only.
- No real secrets are committed.
- No credentials are hardcoded in source.

Never print actual secret values in the audit report.

### 13.22 Deployment readiness

Verify:
1. Backend build.
2. Frontend build.
3. Production environment configuration.
4. PostgreSQL deployment configuration.
5. Environment variables.
6. CORS.
7. API URL configuration.
8. Health endpoint.
9. Database migrations.
10. Deployment documentation.

Do not claim production readiness merely because a deployment configuration file exists.

### 13.23 Documentation

Inspect README, project documentation, setup instructions, database instructions, API documentation, environment setup, test instructions, deployment instructions, and `PROMPTS.md` if present.

Check whether documentation accurately describes the current implementation. Identify outdated or exaggerated claims.

### 13.24 Safe testing rules

- Use only local/test/synthetic data.
- Never use real financial accounts or real money.
- Never expose passwords, JWT secrets, database passwords, API keys, Redis credentials, or private tokens.
- If the environment does not allow a test to be safely executed, mark it `NOT VERIFIED`.
- Do not guess.

### 13.25 Mandatory result table

Use exactly these status categories:

- **PASS** — Implemented and successfully verified.
- **PARTIAL** — Implemented but incomplete or not fully verified.
- **FAIL** — Missing, broken, or demonstrably incorrect.
- **NOT VERIFIED** — Insufficient evidence or testing environment unavailable.

Use this format:

| No. | Requirement | Status | Evidence | Missing Work |
|---:|---|---|---|---|
| 1 | React + Vite | | | |
| 2 | Java + Maven | | | |
| 3 | Spring Boot | | | |
| 4 | PostgreSQL | | | |
| 5 | JWT authentication | | | |
| 6 | Role-based authorization | | | |
| 7 | Account management | | | |
| 8 | Deposits | | | |
| 9 | Withdrawals | | | |
| 10 | Transfers | | | |
| 11 | Double-entry ledger | | | |
| 12 | Negative balance prevention | | | |
| 13 | Idempotency | | | |
| 14 | Concurrency protection | | | |
| 15 | Database atomicity | | | |
| 16 | Append-only audit trail | | | |
| 17 | Frontend integration | | | |
| 18 | Automated testing | | | |
| 19 | API documentation | | | |
| 20 | Deployment readiness | | | |

Add rows for other material requirements.

### 13.26 Evidence requirement

For every `PASS` or `PARTIAL`, provide concrete evidence:
- Exact file path.
- Class/component name.
- Method/function.
- API endpoint.
- Database table/constraint.
- Migration.
- Test name.
- Actual test result.

Example format:

**PASS**

Evidence: `backend/src/.../FinancialTransactionService.java`  
Method: `transfer()`  
Finding: Transfer runs inside a database transaction and creates debit/credit ledger entries.  
Test: `TransferIntegrationTest.transferCreatesBalancedLedgerEntries`  
Result: PASSED (only if actually executed).

Do not write vague evidence such as “Implemented in backend.”

### 13.27 Final audit summary

Provide:

**Overall Results**
- Total requirements audited.
- PASS count.
- PARTIAL count.
- FAIL count.
- NOT VERIFIED count.

**Critical Security Findings**
- List only actual findings discovered.

**Financial Integrity Findings**
- Balances.
- Ledger entries.
- Duplicate transactions.
- Concurrency.
- Rollback.
- Negative balances.
- Authorization.

**Frontend Findings**
- Hardcoded financial values.
- Broken API integrations.
- Incorrect currency display.
- Light/Dark mode problems.
- Missing functionality.

**Documentation Findings**
- Inaccurate or exaggerated claims.

### 13.28 Priority plan

Classify unfinished work:

**Priority 1 — Critical Financial Security & Data Integrity**
- Negative balances.
- Broken double-entry.
- Transaction atomicity.
- Concurrency vulnerabilities.
- Unauthorized financial operations.
- Idempotency failures.

**Priority 2 — Core Financial Functionality**
- Deposits.
- Withdrawals.
- Transfers.
- Account management.
- Transaction history.

**Priority 3 — Authentication & Authorization**
- JWT validation.
- RBAC.
- Ownership.
- Administrator access.
- Unauthorized API access.

**Priority 4 — Frontend & API Integration**
- Broken API calls.
- Incorrect UI data.
- Hardcoded values.
- Currency formatting.
- Theme issues.

**Priority 5 — Testing, Documentation & Deployment**
- Missing tests.
- Incomplete documentation.
- Deployment configuration.
- Monitoring.
- Demo preparation.

### 13.29 Final rules

Do not:
- Rename FinGuard.
- Rewrite the application unnecessarily.
- Delete working features.
- Create duplicate APIs or database tables.
- Create fake test results.
- Claim a test passed without running it.
- Claim a feature is implemented merely because code exists.
- Use mock data as evidence.
- Expose secrets.
- Invent missing requirements.
- Silently modify the project during the audit.

If a test cannot be verified, write:

`NOT VERIFIED — reason: ...`

If partially implemented, write:

`PARTIAL — implemented portion: ...; missing/unverified portion: ...`

**Final objective:** Determine whether the actual FinGuard implementation satisfies the requirements, not whether the project appears complete from its UI or documentation.

---

### Prompt 14 — Project Renaming Prompt: FinGuard → Arthivex

**Task:** Perform a complete and careful rebranding of the existing project from FinGuard to Arthivex.

**New official project name:** Arthivex  
**New project title:** Arthivex — Secure Financial Transaction & Ledger Management System

**Scope & Directives:**
1. **Website Branding**:
   - Update landing page, navigation bar, top header, login, registration, dashboard, accounts, transactions, details, profile, settings, admin dashboard, footer, browser tab titles, metadata, loading states, empty states, and system notifications to Arthivex.
2. **Visual Branding**:
   - Preserve existing Stitch design system, colors, layout, and functionality. Update logo and text to Arthivex.
3. **Repository & Codebase Guidelines**:
   - Do NOT rename Java package `com.finguard`.
   - Do NOT rename database `finguard` or database user `finguard_app`.
   - Preserve all existing API routes (`/api/v1/...`).
   - Retain backward compatibility and smooth migration.
4. **Documentation Updates**:
   - Document the rebranding clearly in `README.md`, `PROJECT_CONTEXT.md`, `BACKEND.md`, `FRONTEND.md`, `THREATS.md`, and `PROMPTS.md`.
   - Explain that the project was originally developed under the working name FinGuard and officially rebranded to Arthivex.
   - Do not rewrite historical prompt records to pretend the project was always named Arthivex.
5. **Quality & Verification**:
   - Ensure frontend production build compiles cleanly without errors.
   - Maintain 100% test pass rate across backend test suites.
   - Zero regression across all financial ledger, concurrency, and security invariants.

---

## How to maintain this file

When adding a new prompt:
1. Add it in chronological order.
2. Preserve the actual prompt text when available.
3. If only a summary is available, label it as a summary/reconstruction.
4. Record the purpose, scope, constraints, and requested verification.
5. Do not invent AI responses, code changes, test results, dates, or evidence.
6. Update the project status only after checking the current repository.
7. Keep implementation status in the relevant project documentation or audit report; this file is a prompt-history record, not proof that requested work was completed.
