# ADR-003: Account/Transaction Scope After T019

- Status: Accepted
- Date: 2026-07-20
- Owner decision: Option A, stabilize the existing legacy yearly matrix and remove T011/T012 from the delivery mainline.

## Context

MyExpenseApp is a private VND ledger for one daily bookkeeper. The girlfriend records day-to-day income and expenses; the project owner uses a second existing Firebase account for viewing and maintenance. VND is the only accounting fact currency. CNY is display-only.

T011 introduced an Account model/repository and T012 introduced a Transaction model. They are isolated from the current runtime path, but they carry platform-style assumptions that exceed current product needs:

- Account can represent non-VND currency accounts.
- Transaction can store original-currency amount plus FX snapshot.
- The proposed repository path, indexes, migration, and UI switching work would require new Firestore schema and Rules work.
- Existing legacy data stores one yearly `entries` matrix with formulas and daily remarks; it cannot reliably reconstruct every real historical transaction.

Recent fixes through T018 repaired the actual product chain without adopting the new model: legacy entries now drive streaks, VND remains the persisted fact, CNY is view-only, Rules expectations are documented, and overwrite imports create recovery points.

## Options Considered

### Option A: Stabilize the existing legacy yearly matrix

Keep `shared_ledger_<year>` with `balances`, `entries`, and `settings` as the runtime fact source. Continue hardening import/export, FX display, CI, recovery, and current VND workflows. Do not connect T011/T012 to UI, sync, Firestore Rules, or production data.

User value:

- Highest near-term value because it keeps the working app focused on the girlfriend's actual bookkeeping workflow.
- Avoids a disruptive migration for a private single-ledger product.
- Preserves the already-fixed streak, VND, import recovery, and Rules work.

Risk and cost:

- The legacy matrix remains less expressive than a true transaction ledger.
- Historical formulas and daily remarks continue to limit per-transaction audit detail.
- Future account-level reconciliation would need a new ADR or a later product decision.

### Option B: Migrate to standalone Account/Transaction

Refactor T011/T012 into a VND-only model, build repositories and Rules, write a legacy parser, run dry-run migration, dual-read validation, UI cutover, and rollback.

User value:

- Better long-term auditability, versioning, soft delete, account-level reconciliation, and query flexibility.
- Cleaner domain boundaries if the product becomes more complex.

Risk and cost:

- High migration risk because legacy formulas aggregate multiple amounts and remarks at day level.
- Requires schema, Rules, indexes, migration tooling, backup, dry-run, dual-read parity, UI rewiring, and recovery plans.
- Adds maintenance burden for a product that currently has one daily user and one fact currency.
- Reintroduces multi-currency pressure through fields that are outside the accepted VND-only product boundary.

## Decision

Choose Option A.

The project will stabilize the existing legacy yearly matrix. T011/T012 are not part of the delivery mainline and must remain disconnected from runtime code. No Transaction repository, Account repository, Firestore schema, Rules path, UI flow, migration, or production data operation may proceed from T011/T012 unless a future owner-approved ADR reverses this decision.

## T011/T012 Disposition

Reusable ideas:

- Integer VND money handling.
- Version/conflict concepts as future reference.
- Soft-delete/audit concepts as future reference.
- Repository tests as examples only, not runtime evidence.

Fields or assumptions that must be removed before any future reconsideration:

- Non-VND account currency.
- Original-currency transaction amount.
- FX snapshot as persisted transaction fact.
- Standalone transaction fact source replacing `entries` by default.
- New Firestore account/transaction collections without a dedicated migration ADR.

Required future handling:

- T020 and T021 continue against the legacy VND runtime.
- A later cleanup task may delete or quarantine T011/T012 code and tests to reduce maintenance cost.
- If a future product decision needs standalone transactions, it must start with a new ADR, VND-only schema, migration plan, Rules plan, dry-run evidence, parity checks, and explicit owner approval.

## Consequences

- Current runtime fact source remains the legacy yearly document: `shared_ledger_<year>`.
- VND entries remain authoritative; CNY remains display-only.
- No production Firebase data, Rules, Auth, schema, or index changes are authorized by this ADR.
- Architecture planning must treat Account/Transaction as rejected for the current roadmap, not as a pending default.
- Sunk cost in T011/T012 is not a reason to continue migration.

## Follow-Up Tasks

- T020: Improve FX display reliability without changing VND persisted facts.
- T021: Establish CI gates for existing tests, typecheck, Rules, and build.
- Future optional cleanup: remove or quarantine disconnected T011/T012 code after reviewer-approved scope is created.
