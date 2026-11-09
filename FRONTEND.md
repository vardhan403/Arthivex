# Arthivex — Frontend Architecture & Implementation Specification

> **Document type:** Frontend architecture and implementation specification.
> **Rebranding Notice:** The project was originally conceived and designed under the working name **FinGuard** and has been officially rebranded to **Arthivex** (*Arthivex — Secure Financial Transaction & Ledger Management System*). The frontend package is `arthivex-frontend` implementing the Stitch Dark and Light Enterprise design system with INR/global multi-currency support.

## Status vocabulary

| Label | Meaning |
|---|---|
| **Proposed** | A design or plan. Not built. |
| **Not Implemented** | Does not exist in the repository. |
| **Not Verified** | May or may not exist. No evidence has been checked. |
| **Verified** | Exists **and** has been checked, with evidence recorded in the Implementation Status table. |

Do not claim that a page, component, API, route, or feature exists merely because this document proposes it.

## Contents

1. Document Purpose
2. Relationship Between Project Documents
3. Stitch → Antigravity Implementation Workflow
4. Stitch Design Principles
5. Frontend Technology
6. Frontend Architecture
7. Proposed Frontend Directory Structure
8. Stitch Screen Inventory
9. Component Architecture
10. Routing
11. Authentication UI
12. Role-Based UI
13. Account UI
14. Deposit UI
15. Withdrawal UI
16. Transfer UI
17. Idempotency-Key Handling
18. API Service Layer
19. Mock Data
20. Frontend Security Boundary
21. Validation
22. Loading / Error / Success States
23. Responsive Design
24. Accessibility
25. Frontend Testing
26. Stitch Visual Verification
27. Google Antigravity Implementation Rules
28. PROMPTS.md Relationship
29. Implementation Status
30. Definition of Done

---

## Document Purpose

`FRONTEND.md` defines:

- FinGuard frontend architecture
- UI implementation strategy
- Stitch-to-Antigravity workflow
- React/Vite structure
- Page and component organization
- Backend API integration
- Authentication UI
- Financial operation UI
- Error/loading states
- Security boundaries
- Responsive behavior
- Accessibility
- Testing and verification

> **Stitch is the visual/UI source of truth for FinGuard.**

> **Google Antigravity is the development/implementation environment used to translate the Stitch design into the actual React/Vite frontend.**

However, Antigravity-generated code must still follow the requirements and security rules defined by `PROJECT_CONTEXT.md` and `BACKEND.md`. A visually faithful screen that violates a requirement or a security rule is not acceptable.

> **Central principle.** The frontend is an untrusted client. It can request a financial operation, but only the backend can authorize and commit the financial effect. Frontend validation, hidden UI, and role-based navigation are conveniences, never security controls.

---

## Relationship Between Project Documents

Each document is the source of truth for a different concern. If two documents appear to conflict, do not guess. Mark the point `UNKNOWN / NEEDS VERIFICATION` and resolve it explicitly.

### `PROJECT_CONTEXT.md` — source of truth for

- Functional requirements
- Business requirements
- Project scope
- Roles
- Required financial behavior
- Overall project constraints

### `BACKEND.md` — source of truth for

- Backend architecture
- API design
- Authentication
- Authorization
- Financial correctness
- Database behavior
- Idempotency
- Concurrency
- Ledger
- Audit logging
- Backend security

### Stitch — source of truth for

- Visual design
- Page layouts
- UI hierarchy
- Typography
- Colors
- Spacing
- Components
- Navigation appearance
- Forms
- Tables
- Cards
- Responsive design where specified

### Antigravity — implementation environment responsible for

- Translating Stitch designs into React/Vite code
- Creating frontend components
- Implementing routes
- Connecting frontend services to backend APIs
- Running and testing the frontend
- Fixing implementation issues
- Maintaining the visual fidelity of the Stitch design

### `FRONTEND.md` — source of truth for

- Frontend architecture
- How Stitch is translated into code
- Frontend implementation decisions
- Component organization
- API integration
- Frontend testing
- Actual implementation/verification status

### Precedence in practice

| Question | Authority |
|---|---|
| What must the system do? | `PROJECT_CONTEXT.md` |
| What does the API look like and how is money kept safe? | `BACKEND.md` |
| What should the screen look like? | Stitch |
| How is the UI built and what is actually done? | `FRONTEND.md` plus the repository |
| Security-relevant behavior | `PROJECT_CONTEXT.md` and `BACKEND.md` always override a visual design choice |

---

## Stitch → Antigravity Implementation Workflow

**Status:** Proposed workflow. No step has been performed.

1. **Design is created/provided in Stitch.**
2. **Stitch screens are inspected carefully**, one by one, before any code is written.
3. **Identify all pages, components, layouts, states, and responsive behavior**, including empty, loading, and error states, and record them in the Stitch Screen Inventory.
4. **Antigravity uses the Stitch design as the visual reference.**
5. **Antigravity implements the design using React/Vite.**
6. **The running frontend is compared against Stitch.**
7. **Visual discrepancies are corrected.**
8. **Functional behavior is added without unnecessarily changing the Stitch design.**
9. **Real backend APIs replace mock data** when backend implementation becomes available.
10. **Actual implementation and verification are recorded honestly in `FRONTEND.md`.**

```text
Stitch design  -->  Inspect & inventory  -->  Antigravity builds React/Vite UI
      ^                                                   |
      |                                                   v
 Fix discrepancies  <--  Compare running UI to Stitch  <--+
                                  |
                                  v
            Connect real backend APIs (replace mock data)
                                  |
                                  v
        Record real status and evidence in FRONTEND.md
```

> **Antigravity must NOT invent a different design when a Stitch design already exists.** If a Stitch screen is missing, ambiguous, or unreadable, the agent must say so and ask, not improvise a new visual language and present it as the design.

**Gaps.** If a needed screen or state is absent from Stitch (for example a loading or error state), implement the simplest neutral version consistent with the existing Stitch style, and record it in the inventory as "not in Stitch — added by implementation".

---

## Stitch Design Principles

Stitch controls the visual implementation **unless there is a technical, accessibility, or functional reason to deviate**. Any deviation must be recorded in the Stitch Screen Inventory with the reason.

The implementation should preserve, where applicable:

- Page layout
- Navigation
- Sidebar
- Header
- Typography
- Font hierarchy
- Colors
- Backgrounds
- Spacing
- Cards
- Tables
- Forms
- Buttons
- Icons
- Charts
- Modals
- Dropdowns
- Status indicators
- Empty states
- Loading states
- Error states
- Responsive layouts

Do not redesign the application unnecessarily.

**Conflict rule.** If a Stitch component conflicts with a backend security requirement, **keep the visual design but implement the security requirement on the backend.** Example: a Stitch design might show an editable balance field or a client-chosen "owner" dropdown. The look can be kept, but the field must not be a way to set balance or ownership. Those are never client-controlled (see `BACKEND.md`, Authorization).

**Design tokens.** When Stitch values are known, extract colors, fonts, spacing, and radii into a single place (for example CSS variables or a theme file) rather than scattering literals. This is a Proposed practice. No tokens have been extracted.

---

## Frontend Technology

**Status:** All entries below are **Proposed** or **Not Verified**. Do not claim a library is installed unless it exists in the repository's `package.json` and lockfile.

| Area | Intended direction | Status |
|---|---|---|
| UI library | React | Proposed |
| Build tool | Vite | Proposed |
| Language | JavaScript or TypeScript, depending on the actual implementation | Not decided (`UNKNOWN / NEEDS VERIFICATION`) |
| Styling | CSS, Tailwind, or component styling, depending on what best reproduces Stitch | Not decided (`UNKNOWN / NEEDS VERIFICATION`) |
| Routing | React Router, if routing is required | Proposed |
| HTTP client | `fetch` or Axios (or another client) | Not decided. Document only what is actually used |
| Testing | Vitest and React Testing Library are a natural fit for Vite | Proposed. `UNKNOWN / NEEDS VERIFICATION` |
| Dev environment | Node.js, npm, Windows, VS Code (from `PROJECT_CONTEXT.md`) | Planned |

When the real stack is chosen, **update this table with the actual versions and evidence** (for example the `package.json` path) and remove "Proposed" for anything that is genuinely installed and working.

**Keep dependencies small.** For a 7-day challenge, prefer fewer libraries. Every dependency must be something the candidate can explain.

---

## Frontend Architecture

**Status:** Proposed.

```text
React UI
   ↓
Pages
   ↓
Reusable Components
   ↓
Hooks / State
   ↓
API Service Layer
   ↓
Spring Boot Backend
   ↓
PostgreSQL
```

| Layer | Proposed responsibility |
|---|---|
| **React UI** | Application shell, layout, and routing. |
| **Pages** | One per screen. Compose components and call hooks. No raw HTTP calls and no financial rules. |
| **Reusable components** | Presentational pieces (cards, tables, forms, dialogs, feedback). They receive data and callbacks as props. |
| **Hooks / State** | Screen-level data loading, submission state (idle/submitting/success/error), and the authenticated-user state. |
| **API service layer** | The only place that builds requests, attaches authentication, attaches the `Idempotency-Key`, and normalizes responses and errors. |
| **Spring Boot backend** | Authentication, authorization, validation, transaction processing, ledger, idempotency, concurrency, audit. |
| **PostgreSQL** | Source of truth for all financial state. |

**Emphasis:** Financial security and correctness belong to the backend. The frontend's job is to collect input clearly, send requests, and faithfully display what the backend says. It never computes, decides, or caches the authoritative result of a financial operation.

---

## Proposed Frontend Directory Structure

**Status:** Proposed. **Not verified against any repository.** Do not force this structure if the actual implementation uses a different clean structure. Update this section to match reality.

```text
frontend/
├── public/
├── src/
│   ├── components/      # reusable UI (layout, financial, feedback)
│   ├── pages/           # one per screen
│   ├── layouts/         # app shell, auth layout
│   ├── services/        # API service layer (apiClient, authService, accountService, ...)
│   ├── hooks/           # data loading, submission state, auth state
│   ├── utils/           # money formatting/parsing, idempotency key helper
│   ├── styles/          # theme/tokens, global styles
│   ├── assets/          # icons, images exported from Stitch where applicable
│   ├── mocks/           # mock data, clearly separated (see Mock Data)
│   ├── App.jsx / App.tsx
│   └── main.jsx / main.tsx
└── package.json
```

The `mocks/` folder is an addition to the suggested layout, so mock data stays isolated. It is also Proposed.

---

## Stitch Screen Inventory

**Status: EMPTY.** No Stitch screens have been provided to, or observed by, the author of this document. **Do not populate this table from guesses.** Add a row only for a screen actually identified in the Stitch project, and fill in the Stitch reference (for example a screen name or link) exactly as it appears there.

| Screen | Purpose | Stitch Reference | Antigravity Implementation | Route | Status |
|---|---|---|---|---|---|
| *None recorded yet* | — | — | — | — | Not Verified |

**How to fill each row:**
- **Screen:** the name as shown in Stitch.
- **Purpose:** one line.
- **Stitch Reference:** the actual identifier or link to the Stitch screen.
- **Antigravity Implementation:** the real file path of the page/component once it exists (otherwise "Not Implemented").
- **Route:** the actual route (otherwise "Not Implemented").
- **Status:** `Not Implemented`, `Implemented — Not Verified`, or `Verified` (with evidence recorded in the Implementation Status section).

**Deviations from Stitch** should be recorded beneath the table, with the screen, what differs, and why (technical, accessibility, or functional reason).

### Functional needs from `PROJECT_CONTEXT.md` (NOT Stitch screens)

The requirements imply the UI will eventually need ways to do the following. **This list is derived from requirements, not from observed Stitch screens.** It exists so the inventory can be checked for missing coverage. It is not a claim that Stitch contains any of these.

- authentication
- account information and balances
- deposits, withdrawals, and transfers
- transaction history
- administrative functions where authorized (Administrator)
- auditor functionality where authorized (Auditor)

**Gap check:** once Stitch is inspected, compare its screens with this list and record any requirement that has no corresponding screen.

---

## Component Architecture

**Status:** Proposed. **No component is marked implemented.** Mark a component implemented only when its file exists in the repository.

### Layout Components
- App layout
- Sidebar
- Header
- Navigation
- Footer if required

### Financial Components
- Balance card
- Transaction table
- Transaction row
- Transfer form
- Deposit form
- Withdrawal form
- Account selector
- Transaction status

### Feedback Components
- Loading indicator
- Error message
- Success message
- Confirmation dialog
- Empty state

| Component | Category | Status | Evidence |
|---|---|---|---|
| (all of the above) | — | Not Implemented | — |

**Component rules (proposed):**
- Components are presentational where possible. They do not call `fetch` directly.
- Financial forms receive an `onSubmit` handler and a submission-state prop. They do not decide whether an operation is allowed.
- A balance card displays a value it was given. It never calculates a balance.
- The account selector lists only accounts the backend returned for the authenticated user.

---

## Routing

**Status:** Proposed. **No route exists.** If routing is implemented, replace this section with the actual routes and mark each Verified only after it is checked.

Potential routes:

```text
/login
/dashboard
/accounts
/accounts/:id
/accounts/:id/transactions
/deposit
/withdraw
/transfer
/transactions/:id
```

| Route | Intended screen | Auth required | Status |
|---|---|---|---|
| `/login` | Login | No | Proposed — Not Implemented |
| `/dashboard` | Dashboard | Yes | Proposed — Not Implemented |
| `/accounts` | Account list | Yes | Proposed — Not Implemented |
| `/accounts/:id` | Account details | Yes | Proposed — Not Implemented |
| `/accounts/:id/transactions` | Transaction history | Yes | Proposed — Not Implemented |
| `/deposit` | Deposit | Yes | Proposed — Not Implemented |
| `/withdraw` | Withdrawal | Yes | Proposed — Not Implemented |
| `/transfer` | Transfer | Yes | Proposed — Not Implemented |
| `/transactions/:id` | Transaction details | Yes | Proposed — Not Implemented |

Do not add routes for screens that do not exist in Stitch or in the requirements. Account-scoped routes may alternatively place the account in the path (for example `/accounts/:id/deposit`). The choice is `UNKNOWN / NEEDS VERIFICATION`.

**Protected routes.** A protected-route wrapper that redirects unauthenticated users to `/login` is a usability feature. It is **not** a security control, because anyone can still call the API directly. The backend rejects unauthenticated requests regardless.

**URL parameters** (such as `:id`) are user-controlled input. A user can type any ID. The backend checks ownership; the frontend must not assume that a URL it rendered implies authorization.

---

## Authentication UI

**Status:** Proposed. Not Implemented. Not Verified.

**Frontend responsibilities:**
- **Login form:** identifier and password fields, with a submit button.
- **Validation:** required fields (for usability only).
- **Loading state:** disable submission and show progress while the request is in flight.
- **Authentication error:** show a generic message such as "Invalid credentials". Never reveal whether the identifier exists.
- **Logout:** discard the in-memory authentication state and navigate to `/login`. With a stateless short-lived JWT, logout is client-side discard (see `BACKEND.md`, Authentication).
- **Authenticated application state:** a single source (for example a context or store) that holds the current user and token, populated only after a successful backend response.

**Rules:**
- Authentication is ultimately enforced by the backend. **The frontend must never treat a UI variable as proof of authentication.** A flag like `isLoggedIn` in React state only controls what is shown.
- **Do not store passwords** in frontend code, constants, logs, or browser storage. Clear the password field from state after submission.
- Do not hard-code credentials, tokens, or API secrets in the repository.
- On a `401` response, clear the authentication state and redirect to login.
- On token expiry, the user logs in again. `BACKEND.md` proposes no refresh tokens.

**JWT handling:** `BACKEND.md` proposes short-lived JWT bearer tokens and lists client-side storage as `UNKNOWN / NEEDS VERIFICATION`, with in-memory storage as the proposed direction (safer against persistent theft than `localStorage`, at the cost of re-login on reload). **None of this is implemented.** Once implemented, record here the storage and handling approach **that is actually used** (and nothing else), and keep it consistent with `BACKEND.md`.

---

## Role-Based UI

Roles (from `PROJECT_CONTEXT.md` and `BACKEND.md`):

- **Account Holder:** own accounts and transactions; financial operations permitted by the business rules.
- **Administrator:** manage users/accounts and perform authorized administrative functions. Exact scope is `UNKNOWN / NEEDS VERIFICATION`.
- **Auditor:** read-only access to appropriate audit and transaction information.

The frontend **may** change navigation or visibility based on the authenticated user's role, **for usability** (for example, show the audit screen only to Auditors, and hide transfer controls from Auditors).

> **Frontend role checks are NOT a security boundary.**

- The backend must independently enforce authorization on every request.
- The frontend must never be trusted to prevent unauthorized API requests. Anyone can call the API without the UI.
- The role the frontend uses to render navigation comes from a backend response. It must never be derived from a value the user can edit (URL, `localStorage`, a form field).
- Hiding a button does not protect an endpoint. Each hidden capability must also be denied by the backend, and that is tested on the backend.
- An Auditor view must not render financial-operation controls, but even if it did, the backend rejects those requests.

**Status:** Proposed. Not Implemented. Not Verified.

---

## Account UI

**Status:** Proposed. Not Implemented. Not Verified.

**Intended behavior:**
- **Account list:** shows the accounts the backend returns for the authenticated user (`GET /accounts`, Proposed).
- **Account details:** shows one account (`GET /accounts/{id}`, Proposed).
- **Balance display:** shows the balance string returned by the backend.
- **Transaction history:** a paginated list (`GET /accounts/{id}/transactions`, Proposed). History is P1 in the 7-Day Implementation Scope in `BACKEND.md`.

**Rules:**
- **Do not allow users to edit balances through the frontend.** There is no balance input anywhere. `BACKEND.md` proposes no "update balance" API.
- **The balance shown is informational; the backend is authoritative.** After any financial operation, **re-fetch** the balance from the backend. Do not compute the new balance locally by adding or subtracting.
- Display amounts as given (fixed scale of 2). Do not convert money to floating-point numbers for arithmetic (see Validation).
- If the backend returns `403`/`404` for an account, show a neutral "not found or not available" state. Do not reveal why.
- Account creation (`POST /accounts`, Proposed in `BACKEND.md`) must never send owner, role, or balance fields.
- Treat displayed data as possibly stale. Provide a refresh and re-fetch on relevant events.

---

## Deposit UI

**Status:** Proposed. Not Implemented. Not Verified.

**Expected UI:**
- **Amount input**
- **Validation** (usability only)
- **Confirmation** (a review step showing account and amount)
- **Submit**
- **Loading state** (submit disabled)
- **Success state** (show transaction ID and status as returned by the backend)
- **Failure state** (safe, generic message)

**The backend is responsible for:**
- authorization
- validation
- transaction processing
- ledger changes
- balance correctness
- idempotency
- audit logging

The frontend only requests the operation. It sends the amount and the `Idempotency-Key` (see Idempotency-Key Handling), then shows the backend's answer.

---

## Withdrawal UI

**Status:** Proposed. Not Implemented. Not Verified.

**Expected UI:**
- Amount input
- Validation
- Confirmation
- Loading
- Success
- Error

The frontend may provide basic validation (for example a positive amount). **The backend must enforce:**
- available balance
- authorization
- concurrency protection
- no negative balance
- transaction atomicity

**Notes:**
- The frontend must not block a withdrawal solely because its cached balance looks too low, or approve one because it looks high enough. The cached balance may be stale, and only the backend decision counts. Showing a gentle hint is acceptable.
- An "insufficient funds" response is a normal, expected outcome and should have a clear, calm message.
- If two tabs or devices withdraw at once, the backend decides. The UI must handle a failure even when its own balance said it would work.

---

## Transfer UI

**Status:** Proposed. Not Implemented. Not Verified.

**Expected UI:**
- **Source account** (limited to accounts the backend returned for this user)
- **Destination account**
- **Amount**
- **Validation**
- **Confirmation** (review step: source, destination, amount)
- **Loading**
- **Success**
- **Failure**

**The frontend must not assume that a transfer is successful until the backend confirms it.** It does not optimistically update balances, does not show a success message on submit, and does not move money in local state.

**Unknown-outcome case.** If the request times out or the connection drops, the outcome is **unknown**: the transfer may or may not have been committed. The UI should say so ("We could not confirm this transfer"), offer to retry **with the same idempotency key and the same details**, and/or point the user to their transaction history to check. It must not claim success or failure.

**Destination handling.** How a destination account is chosen (own accounts, or entering another account's identifier) is `UNKNOWN / NEEDS VERIFICATION`, and error messages for an invalid destination must avoid unnecessary account enumeration (see `BACKEND.md`, Transfers).

---

## Idempotency-Key Handling

**Status:** Proposed. Not Implemented. Not Verified.

Financial write requests require an `Idempotency-Key` according to `BACKEND.md`. This applies to:

- Deposit
- Withdrawal
- Transfer

Whether account creation also requires one is `UNKNOWN / NEEDS VERIFICATION` in `BACKEND.md`.

**The frontend should:**

1. **Generate a key for a new financial operation** (for example a UUID from `crypto.randomUUID()`).
2. **Send it with the request** in the `Idempotency-Key` header.
3. **Reuse the same key when retrying the same operation** (same endpoint, accounts, and amount).
4. **Avoid creating a new key for the same operation merely because the request is retried** (for example after a timeout, a network error, or a double click).

**Key lifecycle (proposed):**

| Situation | Key behavior |
|---|---|
| User opens or begins a new operation form | Generate a new key. |
| User clicks submit, then a network error or timeout occurs | Keep the key. Retry with the same key and the same details. |
| User double-clicks submit | One request only (submit is disabled while in flight). If a second is sent anyway, it carries the same key. |
| Backend returns success | Operation is finished. The next operation gets a new key. |
| Backend returns a definitive rejection (for example validation or insufficient funds) | The user edits and resubmits as a **new** operation. Generate a new key. Do **not** assume the backend cached the failure (that behavior is `UNKNOWN / NEEDS VERIFICATION` in `BACKEND.md`). |
| User changes amount, account, or destination after a failed or pending attempt | **Generate a new key.** Reusing a key with a different payload is rejected by the backend. |

Keep the key in component or hook state (a ref) tied to the operation. Whether to persist it across a page reload is `UNKNOWN / NEEDS VERIFICATION`. If persisted, it must hold only the key and non-sensitive operation details, never a token or password.

> **Idempotency is ultimately enforced by the backend/database.** The frontend key handling reduces accidental duplicates, but **the frontend must not be considered the security mechanism.** An attacker, a buggy client, or a script can send repeated or varied keys, and the backend must still be safe.

---

## API Service Layer

**Status:** Proposed. Not Implemented.

Maintain a clean separation between UI components and backend API calls:

```text
Page
 ↓
Hook / Action
 ↓
API Service
 ↓
HTTP Request
 ↓
Spring Boot API
```

Do not put large amounts of API logic directly inside visual components.

**Proposed responsibilities of the service layer:**
- One small API client wrapper that sets the base URL (from environment configuration), attaches the `Authorization: Bearer` header when authenticated, and handles JSON.
- Attaches the `Idempotency-Key` header on financial write calls (the key itself is supplied by the calling hook).
- Normalizes errors into a small, safe shape for the UI (status category, safe message, optional correlation ID). The backend error format is `UNKNOWN / NEEDS VERIFICATION`.
- Handles `401` centrally (clear authentication state and redirect to login).
- Never logs request bodies containing passwords, tokens, or secrets.
- Contains **no** financial rules (no balance math, no authorization decisions).
- Reads configuration such as the API base URL from environment variables (Vite `import.meta.env`), never hard-coded secrets. Only non-secret values belong in the frontend bundle, because everything shipped to the browser is public.

**Endpoints from `BACKEND.md` (all PROPOSED there; none is available until the backend implements it):**

| Method | Endpoint | Frontend use | Backend status | Frontend integration |
|---|---|---|---|---|
| POST | `/auth/login` | Login form | Proposed | Not Implemented |
| GET | `/accounts` | Account list | Proposed | Not Implemented |
| GET | `/accounts/{id}` | Account details | Proposed | Not Implemented |
| POST | `/accounts/{id}/deposits` | Deposit (with `Idempotency-Key`) | Proposed | Not Implemented |
| POST | `/accounts/{id}/withdrawals` | Withdrawal (with `Idempotency-Key`) | Proposed | Not Implemented |
| POST | `/transfers` | Transfer (with `Idempotency-Key`) | Proposed | Not Implemented |
| GET | `/accounts/{id}/transactions` | History | Proposed | Not Implemented |
| GET | `/transactions/{id}` | Transaction details | Proposed | Not Implemented |

`BACKEND.md` also proposes `POST /accounts` for account creation (required by P0 but absent from the original list), and mentions `POST /auth/register` only as a conditional option. Both are Proposed, and neither should be called until the backend implements them.

**Do not claim the endpoints are available** until the backend actually implements them. Do not invent request or response fields. When the backend exists, read its real contract and update this section.

---

## Mock Data

Mock data can be used during the Stitch/Antigravity visual implementation stage if the backend is not ready.

**Rules:**
- **Mock data must be clearly separated** (for example in `src/mocks/`), never mixed into components or the real API services.
- **Mock data must not be presented as real financial data.** When mock mode is active, show an unmistakable indicator (for example a banner reading "Demo data — not real accounts"). Use obviously fake names and numbers.
- **Mock financial operations must not pretend to perform real transactions.** If a mock deposit appears to work, it must be labeled as simulated and must never be described as a completed transaction.
- **Replacing mock API calls with real backend calls should be straightforward.** Mock and real implementations expose the same function signatures (for example `accountService.getAccounts()`), and a single switch selects between them.
- Mock mode must be impossible to enable in a production build by accident. Use a build-time or environment flag that defaults to off.
- Never put real credentials or real customer data in mock files.

Status: Not Implemented.

---

## Frontend Security Boundary

> **The backend is the authoritative security boundary.** The frontend is an untrusted client and can be bypassed entirely by anyone with a browser's developer tools or an HTTP client.

**Never trust the frontend for:**

- Account ownership
- User role
- Balance
- Authorization
- Transaction validity
- Ledger correctness
- Idempotency
- Concurrency
- Financial state

**Never rely on:**

```text
hidden UI elements
disabled buttons
frontend validation
localStorage values
React state
URL parameters
```

as security controls.

**Practical consequences (proposed rules):**
- Do not send fields such as `userId`, `ownerId`, `accountOwner`, `role`, or `balance` in requests. The backend derives identity and ownership from the authenticated session and the database, and it ignores or rejects such fields.
- The frontend does not decide who may see an account. It displays what the backend returns.
- Do not build features that depend on the client enforcing a limit (for example a maximum withdrawal or a daily cap).
- Do not put secrets in the bundle (signing keys, database credentials, admin passwords). Everything in a Vite bundle is public.
- Avoid rendering untrusted strings as HTML (do not use `dangerouslySetInnerHTML` with server or user data), to reduce cross-site scripting (XSS) risk. XSS also threatens any token held by the page.
- Do not log tokens, passwords, or full financial request/response bodies to the console.
- Frontend security measures reduce accidents and exposure. They never replace backend controls.

---

## Validation

Client-side validation exists **for user experience**:

- **Required fields**
- **Positive amount** (greater than zero)
- **Numeric amount**
- **Decimal precision** (at most 2 decimal places, matching `NUMERIC(19,2)` in `BACKEND.md`)
- **Account selection**
- **Destination account** (present, and not the same as the source)
- **Duplicate-submit prevention** (disable submit while a request is in flight)

> **Backend validation must independently validate all input.** A user can bypass any client validation. Passing frontend validation never implies the backend will accept the request.

**Money handling in the browser (proposed):**
- Treat amounts as **decimal strings with a fixed scale of 2** (for example `"100.00"`) when sending and displaying.
- Do not use floating-point arithmetic for financial amounts (for example `0.1 + 0.2 !== 0.3` in JavaScript). Avoid summing or comparing money as `Number` where precision matters. If a comparison is needed for a UI hint, use integer minor units or a decimal library. Library choice is `UNKNOWN / NEEDS VERIFICATION`.
- Reject input in exponent form, negative numbers, and non-numeric text before sending, but expect the backend to repeat these checks.
- Show the backend's validation messages when they are safe to display.

---

## Loading / Error / Success States

**Lifecycle (proposed):**

```text
Idle
 ↓
Submitting
 ↓
Success
```

or:

```text
Idle
 ↓
Submitting
 ↓
Error
```

An additional **Unknown outcome** state (timeout or network failure after submit) should be handled for financial writes: the user is told the result could not be confirmed and is given a safe way to retry with the same idempotency key or to check history.

**Financial operations must prevent accidental repeated submissions while a request is processing:**
- Disable the submit button and ignore further submit events while in the Submitting state.
- Do not rely on the disabled button alone for safety. The idempotency key and the backend enforce uniqueness.
- Do not let the user navigate away from a pending financial write without a warning, where practical.

**Display rules:**
- Show success only after the backend confirms success. Display the backend-provided transaction ID and status.
- After success, re-fetch authoritative data (balance, history) rather than computing it.
- Provide loading placeholders (skeleton or spinner as in Stitch) for data fetches and meaningful empty states (for example "No transactions yet").
- Error messages shown to users must be safe and helpful, with a correlation ID where the backend provides one.

**Errors must not expose:**
- stack traces
- database details
- internal server information
- secrets
- sensitive implementation details

Map backend error categories (see `BACKEND.md`, Error Handling) to user-friendly messages. Do not print raw response bodies or raw exception text into the UI unless they are known to be safe.

| Backend category (proposed) | UI behavior |
|---|---|
| Authentication failure (`401`) | Clear session, redirect to login. |
| Authorization failure (`403`/`404`) | Neutral "not available" message. |
| Validation failure | Field-level messages. |
| Insufficient funds | Clear, calm message. |
| Idempotency conflict | Explain that this request cannot be processed again as submitted. Start a fresh operation if appropriate. |
| Concurrency conflict | Offer retry. |
| Server error (`5xx`) | Generic message plus correlation ID. |

---

## Responsive Design

Document and verify behavior at:

- **Desktop**
- **Tablet**
- **Mobile**

The frontend should preserve the Stitch responsive behavior **where provided**. Where Stitch does not specify a breakpoint, implement a sensible adaptation in the same visual style and record it in the inventory as "not in Stitch".

**Test for:**
- navigation (for example a sidebar collapsing to a menu)
- tables (wide tables scroll inside their own container and the page body does not scroll sideways)
- forms
- cards
- buttons
- dialogs
- transaction screens

Use a viewport meta tag and relative units. Test real device widths or the browser's responsive mode. Do not claim responsive behavior until it has been checked, and record what was checked.

Status: Not Implemented. Not Verified.

---

## Accessibility

Targets (proposed):

- **Semantic HTML** (headings, landmarks, lists, tables with proper header cells)
- **Labels** associated with every form control
- **Keyboard navigation** (all actions reachable, a visible focus indicator, logical tab order, dialogs that trap and restore focus)
- **Accessible buttons** (real `<button>` elements with meaningful names, including icon-only buttons)
- **Accessible form fields** (error messages linked to fields, appropriate `type` and `inputmode`)
- **Meaningful error messages** (they say what went wrong and how to fix it)
- **Sufficient contrast**
- **Status communication not relying only on color** (for example transaction status uses text or an icon as well as color)

Announce asynchronous results (success or error) to assistive technology, for example with a live region.

Preserve Stitch's visual design while meeting reasonable accessibility requirements. If a Stitch color pairing has insufficient contrast, record it as a justified deviation and adjust minimally.

Status: Not Implemented. Not Verified.

---

## Frontend Testing

**Status:** Proposed. **No frontend tests exist, and none have been run.** Do not fabricate results.

### UI tests
- Components render
- Forms work
- Navigation works
- Error states work
- Loading states work

### Integration tests
- API service behavior (headers attached, errors normalized, `401` handled)
- Authentication flow
- Financial request flow (including that the same `Idempotency-Key` is reused on retry and a new key is created for a new operation)

### Security-related frontend tests

Verify that frontend behavior does not accidentally:

- expose sensitive information (tokens or passwords in the DOM, console, or storage)
- trust client-controlled authorization (for example a role stored in `localStorage` changing what the API call is allowed to do)
- send unauthorized account identifiers without backend checks (the UI must work correctly when the backend rejects them)
- reuse stale financial state incorrectly (balances re-fetched after operations, no local balance arithmetic)

> **Critical security tests must also exist on the backend.** Frontend tests cannot prove authorization, idempotency, concurrency, or ledger correctness. Those are proven by the backend tests defined in `BACKEND.md`.

Evidence should be recorded honestly: the command used, the date, and the real pass/fail result.

---

## Stitch Visual Verification

**Status:** Not performed. Do not claim visual verification occurred unless it actually occurred.

Each implemented screen should be compared against the Stitch design. Check:

- layout
- spacing
- typography
- colors
- icons
- cards
- forms
- tables
- navigation
- responsive behavior

**Record per screen (proposed template):**

| Screen | Date | Compared against (Stitch ref) | Viewports checked | Differences found | Resolved | Evidence (screenshot path, etc.) |
|---|---|---|---|---|---|---|
| *None yet* | — | — | — | — | — | — |

Differences that are intentionally kept (for example for accessibility) must be listed with the reason. A screen is "visually verified" only when this table has a real row for it.

---

## Google Antigravity Implementation Rules

Agents working in Antigravity on the FinGuard frontend must:

1. **Inspect Stitch before implementing UI.**
2. **Use Stitch as the visual reference.**
3. **Inspect the existing repository before creating files.**
4. **Do not overwrite working code without understanding it.**
5. **Do not invent APIs.**
6. **Do not invent security mechanisms.**
7. **Do not claim implementation without evidence.**
8. **Keep frontend security separate from backend security.**
9. **Keep mock data separate from production API services.**
10. **Keep the code understandable enough for the candidate to explain.**
11. **Test the running application.**
12. **Fix visual discrepancies against Stitch.**
13. **Record significant AI mistakes/corrections in `PROMPTS.md`.**

Additional rules:

- Read `PROJECT_CONTEXT.md` and `BACKEND.md` before changing the frontend, and do not contradict them.
- Never hard-code secrets, tokens, or credentials.
- Never add a financial rule to the frontend and describe it as protection.
- When the backend contract is unclear, mark it `UNKNOWN / NEEDS VERIFICATION` rather than guessing.
- Keep dependencies minimal and explainable. This is an individual challenge where the candidate must be able to explain the code.
- Update this document and the Implementation Status table when the real state changes, with real evidence.

---

## PROMPTS.md Relationship

`PROMPTS.md` is different from `FRONTEND.md`.

**`FRONTEND.md` documents:**
- architecture
- implementation
- verification

**`PROMPTS.md` documents:**
- actual AI prompts
- actual AI interactions
- mistakes made by AI
- corrections directed by the candidate
- important implementation decisions resulting from AI-assisted work

**Do NOT fabricate `PROMPTS.md`.** Only record actual interactions. `FRONTEND.md` must not contain invented AI history, and it does not substitute for `PROMPTS.md`. No AI-usage evidence is claimed anywhere in this document.

---

## Implementation Status

**This table is the starting state.** It must be updated only with real evidence (a file path, a commit, a screenshot, or a test report). If the repository has not been inspected for a feature, leave it as `No` / `Not Verified`.

| Feature | Proposed | Implemented | Tested | Evidence |
|---|---:|---:|---:|---|
| Stitch UI | Yes | No (Not Verified) | No | — |
| React/Vite setup | Yes | No | No | — |
| Authentication UI | Yes | No | No | — |
| Dashboard | Yes | No | No | — |
| Accounts UI | Yes | No | No | — |
| Deposit UI | Yes | No | No | — |
| Withdrawal UI | Yes | No | No | — |
| Transfer UI | Yes | No | No | — |
| Transaction UI | Yes | No | No | — |
| API integration | Yes | No | No | — |
| Idempotency support | Yes | No | No | — |
| Responsive design | Yes | No | No | — |
| Accessibility | Yes | No | No | — |

**Notes on the table:**
- "Stitch UI" is marked "Not Verified" because no Stitch screens were provided to the author of this document. Whether a Stitch design exists is outside what this document can confirm. Record the real Stitch reference in the Stitch Screen Inventory when available.
- "Dashboard", "Transaction UI", and similar rows describe intended features. Their presence here does not mean Stitch contains matching screens.

---

## Definition of Done

> This is a **future** definition of done. **It is not the current status.** None of these conditions are met today.

The frontend can be considered complete only when **all** of the following are true and evidenced:

- Stitch screens have been implemented.
- Visual layout closely matches Stitch.
- Navigation works.
- Responsive behavior works.
- Forms work.
- Loading/error/success states work.
- API service layer is separated from UI components.
- Real backend APIs are connected where available.
- Financial write requests support idempotency.
- No frontend-only security assumptions are relied upon.
- Frontend has been tested.
- Important visual differences have been corrected.
- Documentation reflects the actual implementation.

"Works" means demonstrated against the running application, with evidence recorded in this document. Any condition lacking evidence is not met.

---

## Closing principle

> Stitch defines how FinGuard looks. Antigravity builds it. `PROJECT_CONTEXT.md` and `BACKEND.md` define what it must do and how money is kept safe. The frontend can request an operation, but only the backend can authorize and commit the financial effect.
