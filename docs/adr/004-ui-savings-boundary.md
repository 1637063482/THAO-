# ADR-004: UI, Savings Goals, and Deposits Architecture Boundary

- Status: Accepted
- Date: 2026-07-20
- Owner decision: Adopt the scope defined in `UI_SAVINGS_REDESIGN_PLAN.md` as the binding architecture and product contract for UXS-001 through UXS-015.

## Context

MyExpenseApp is a private VND ledger for one daily bookkeeper—a Vietnamese girlfriend who records day-to-day income and expenses. The project owner uses a second existing Firebase account for viewing and maintenance. VND is the only accounting fact currency; CNY is a display-only conversion.

### Prior decisions

- **T019 / ADR-003** (2026-07-20): Option A — stabilize the existing legacy yearly matrix (`shared_ledger_<year>`). T011/T012 Account/Transaction models are removed from the delivery mainline. No migration, no new Firestore collections for accounts or transactions.
- **T013–T021** repaired the actual product chain without adopting the new model: streaks are driven from legacy entries, VND is the persisted fact, CNY is view-only, Rules expectations are documented, and overwrite imports create recovery points.

### Why now

The product scope is expanding from "record income/expense" to also include:

1. Fast daily entry with immediate budget feedback.
2. Adjustable monthly and annual savings goals.
3. Deposit record management (principal, interest, maturity).
4. In-app maturity reminders.

Without a formal ADR, the following boundaries would remain ambiguous:

- Where do savings goals live (new collection vs. existing `settings`)?
- Where do deposits live (annual ledger doc vs. fixed savings document)?
- How are reminders triggered (in-app vs. external push)?
- What data model changes are allowed without a new ADR?

This ADR resolves all four questions and serves as the sole architecture reference for UXS-001 through UXS-015.

## Decision

### 1. Savings Goals Storage

**Savings goals live in the existing annual document's `settings` map.**

```text
shared_ledger_<year>/settings
  savings_goal_month_1 … savings_goal_month_12: VND integer | null
  savings_goal_annual: VND integer | null
```

Rule:

- One key per month (1–12) plus one annual key, all per-year.
- A missing or `null` key means "no goal set" (UI shows guidance, never a percentage).
- Modifying a monthly goal does not automatically adjust the annual goal.
- Changing the display language or CNY toggle never alters goal values.
- Goals are VND integers only; non-integer, negative, NaN, or formula-string values are rejected at both runtime and import schema.

### 2. Deposit Storage

**Deposits live in a fixed `shared_ledger_savings` document, not in annual ledgers.**

```text
shared_ledger_savings
  schemaVersion
  depositsById
    <depositId>
      institutionName: string
      productName: string
      principalVnd: VND integer
      annualRatePpm: positive integer (parts per million, e.g. 5% = 50000)
      openedOn: YYYY-MM-DD
      maturesOn: YYYY-MM-DD
      expectedInterestVnd: VND integer | null (user-overridable; null = UI shows calculated reference)
      actualInterestVnd: VND integer | null
      reminderDays: number[] (default [30, 7, 1])
      remindersEnabled: boolean
      status: ACTIVE | REDEEMED | ROLLED_OVER
      redeemedOn: YYYY-MM-DD | null
      rolledOverToDepositId: string | null
      note: string
      version: number
      createdAt: server timestamp
      updatedAt: server timestamp
      createdBy: uid
      updatedBy: uid
      archivedAt: server timestamp | null
  acknowledgementsByKey
    <depositId|maturesOn|stage>
      acknowledgedAt: server timestamp
      acknowledgedBy: uid
```

### Firestore Rules mutation envelope

The fixed document also carries implementation-only `lastMutation` metadata with
`kind`, `targetId`, `actorUid`, and a server timestamp. Firestore Rules cannot
iterate every member of an arbitrary dynamic map. The envelope therefore binds
each write to one changed deposit or acknowledgement key, allowing Rules to
validate that member, its version increment, and server audit fields while
rejecting bulk or forged mutations. It is not a business field and is excluded
from exported backups.

Note:

- `calculatedInterestVnd` is a read-time derived value (computed from `principalVnd × annualRatePpm ÷ 1_000_000 × depositDays ÷ 365`). It is **never persisted** — only `expectedInterestVnd` and `actualInterestVnd` are stored in the schema.
- `expectedInterestVnd` is nullable: when `null`, the UI displays `calculatedInterestVnd` as the individual reference. When the user explicitly overrides the reference, `expectedInterestVnd` is written as a VND integer.
- Total expected interest is computed with a null-safe aggregate: `SUM(COALESCE(expectedInterestVnd, calculatedInterestVnd))` over ACTIVE and MATURING deposits, where `calculatedInterestVnd` substitutes when `expectedInterestVnd` is null.
- `MATURING` and `MATURED` are derived states computed at read time from `maturesOn` and the current Vietnam date. They are **never persisted** as the `status` field. The stored status is always one of: `ACTIVE`, `REDEEMED`, or `ROLLED_OVER`.
- Rates use ppm (parts per million) scaled integer **exclusively**. Binary floating point, decimal strings, and fixed-point strings are never persisted for rates or amounts.
- No deposit data is mixed into `shared_ledger_<year>`.
- The document path is a fixed Firestore path; UI code does not construct paths directly.

### 3. Reminder Lifecycle

**Reminders fire only when the application is open or returns to foreground.**

Trigger events:

1. User authentication + deposits data first loaded.
2. PWA returns from background to visible (`visibilitychange` → visible).
3. Page stays open and crosses `Asia/Ho_Chi_Minh` midnight.
4. User adds or modifies a deposit.
5. User navigates to the savings page.

Default stages: D-30, D-7, D-1, D0, OVERDUE.

Not triggered by:

- Web Push API, Notification API, Cloudflare Workers/Cron, Firebase Cloud Messaging, email, SMS, or system calendar.
- Background service workers initiating reminders without user action.

Acknowledgement model:

- "Got it" → writes to the cloud `acknowledgementsByKey` map so other devices also suppress.
- "Snooze" → writes `snoozeUntil` to local device `localStorage` only.
- After a deposit's maturity date changes, old acknowledgements for that deposit do not suppress new-date reminders.
- When multiple deposits mature at the same time, they merge into a single dialog list.

### 4. Mobile Daily View

The mobile daily (card-style) ledger is **derived at read time** from the legacy `entries` matrix cells. It does not create, store, or imply per-transaction IDs. Each card represents one day's aggregate per category, referencing the exact source `entries` key for editing.

### 5. PWA Requirements

- The same URL works in browser and installed standalone mode.
- App shell, locale bundles, core CSS/JS, and icons are in the Service Worker cache strategy.
- Firebase financial data does not remain stale due to static caching: online sync updates per existing contract.
- SW update prompts must not block deposit maturity dialogs or quick-add.
- No new Cloudflare server-side secrets are introduced.

### 6. Internationalization

- Default locale: `vi` (Vietnamese). First visit with no preference defaults to `vi`.
- Switchable to `zh-CN` (Simplified Chinese). English is not provided as an option.
- Locale preference is persisted locally (sync to cloud is a future implementation decision, never a data integrity concern).
- `<html lang>` changes on switch. Language switch never modifies state, pendingUpdates, or Firestore facts.

### 7. UI Style

Visual token palette (Apple Warm):

```text
background-light: #F5F3EF
surface-light:    #FFFFFF
primary-apricot:  #E78B4A
primary-pressed:  #CC7135
text-primary:     #1D1D1F
text-secondary:   #6E6E73
income:           #2E9B65
expense:          #D96855
```

- Cards: 20px radius; hero cards 24–28px; buttons 12–14px.
- Shadows are minimal; hierarchy is expressed through background, spacing, and typography.
- Apricot used only for primary CTA, key progress, and small-area emphasis.

### 8. Non-Goals

The following are explicitly **not** included in the UXS scope. Any future work in these areas requires a new owner-approved ADR:

8.1 No bank account auto-sync, bank API, or Open Banking integration.
8.2 No investment portfolios, stocks, funds, or securities tracking.
8.3 No loans, credit scoring, or tax reporting.
8.4 No automatic deposit redemption or rollover.
8.5 No background scheduled tasks, external push, SMS, or email notifications.
8.6 No household, multi-family, invitation, member management, or general role system.
8.7 No multi-fact currency. VND is the only persistent accounting currency.
8.8 No English UI option.
8.9 No transaction-level audit beyond what legacy `entries` cells provide.
8.10 No reconnection of T011/T012 Account/Transaction models to runtime code.
8.11 No deployment to Cloudflare, Firebase, or production data migration without separate, explicit owner authorization (this ADR does not authorize any deployment or data operation).

## Alternatives Considered

### Alternative A: Store savings goals in a new `goals` collection

Rejected because:

- A new collection adds Firestore read overhead, new Rules paths, and synchronization complexity.
- The existing `settings` map inside each annual document already supports per-year data and is loaded as part of the normal ledger read.
- 13 additional keys (12 monthly + 1 annual) in `settings` are well within Firestore document size limits.
- Keeping goals in `settings` matches the existing pattern for budget and configuration data.

### Alternative B: Store deposits inside the annual ledger document

Rejected because:

- Deposits are not year-specific; they span across years (opened in 2025, matured in 2027).
- An annual document would force deposit queries to scan multiple years.
- The deposit data volume (multiple deposits with interest, versions, acknowledgements) risks approaching the 1 MiB Firestore document limit if repeated in every year's doc.
- A fixed document at `shared_ledger_savings` cleanly separates deposit domain from annual expense aggregation.

### Alternative C: Use Web Push or Notification API for reminders

Rejected because:

- The user does not want persistent permission prompts on a PWA.
- Push infrastructure (service worker push, VAPID keys, Cloud Functions) adds complexity and potential delivery failures.
- In-app reminders on open/foreground are sufficient for a private single-user app where the phone is checked multiple times daily.
- The product does not promise external notification capability.

### Alternative D: Reconnect T011/T012 as part of UXS

Rejected by ADR-003. The UXS phase adds savings and deposit features on top of the existing legacy matrix without introducing a general transaction model.

## Consequences

### Positive

- Single source of truth for the UXS architecture: `UI_SAVINGS_REDESIGN_PLAN.md` and this ADR.
- All UXS tasks share one consistent set of data boundaries, storage decisions, and trigger rules.
- No new Firestore collections for goals; minimal schema delta for deposits (one fixed document).
- Reminder logic is contained to the client lifecycle; no server-side infrastructure needed.
- Separation of concerns: savings goals in annual `settings`, deposits in fixed savings document, daily view derived from legacy entries.

### Negative

- The `shared_ledger_savings` document could grow large if many deposits accumulate over years. Mitigation: deposits can be archived (soft-delete with `archivedAt`); archived entries are excluded from active views but remain in the document for history.
- In-app reminders mean the user will not receive notifications when the app is closed. This is an accepted product limitation documented in non-goals.

### Neutral

- If the product grows beyond a single user, the fixed `shared_ledger_savings` document and `settings` keys would need re-evaluation. A new ADR would be required at that point.
- UI implementation can choose mobile-bottom-nav or desktop-sidebar as the shell, but must follow the navigation targets defined in `UI_SAVINGS_REDESIGN_PLAN.md`.

## Follow-Up Tasks

The UXS tasks are defined in `TASK_PLAN.md` and run in order UXS-001 through UXS-015. Each task must follow `AGENT_WORKFLOW.md`: Coder evidence → Terra review → APPROVED before the next task begins. No task may proceed if it conflicts with this ADR's data boundaries without a new owner-approved ADR superseding it.

Key implementation tasks referencing this ADR:

- UXS-007/UXS-008: Savings goal domain rules + persistence (per Section 1).
- UXS-010/UXS-011: Deposit domain model + storage adapter (per Section 2).
- UXS-013: In-app reminder engine (per Section 3).

## References

- ADR-001: Fixed shared ledger boundary
- ADR-003: Account/Transaction scope — chose legacy matrix
- `UI_SAVINGS_REDESIGN_PLAN.md`: Product and UI specification for UXS
- `TASK_PLAN.md`: Task breakdown for UXS-001 through UXS-015
