# ADR-005: Deposit acknowledgement retention

## Status

Accepted — 2026-07-27

## Context

Deposit reminders use `acknowledgementsByKey` to record that a reminder was acknowledged. Deleting an active deposit removes only its entry from `depositsById`; an acknowledgement is an audit record, not a child record to be deleted with that deposit.

## Decision

- Keep `acknowledgementsByKey` entries after a deposit is deleted.
- Generate every new deposit ID in the application with `createDepositId()`; the deposit form has no ID input, and editing retains the existing ID.
- Warn in the vi/zh deposit view at 450 of the existing 500 acknowledgement-record limit. The warning shows only the count, never acknowledgement keys.
- Keep the repository rejection for a new acknowledgement at 500 records.

## Alternatives considered

We did not adopt dynamic-prefix acknowledgement deletion. Firestore Rules cannot safely iterate arbitrary map keys to prove that a prefix-only deletion is valid. We also did not introduce schema v2, a tombstone map, or a data migration: for this small private ledger, their migration and Rules risk outweighs the benefit.

## Consequences

Acknowledgements remain bounded by the existing 500-record limit and are intentionally retained as audit evidence. This decision changes neither `schemaVersion` nor Firebase Rules and requires no online data operation.
