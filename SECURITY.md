# Security

This repository is a private household expense app. VND ledger values are production facts, while CNY is only a read-only display conversion.

## CI Boundaries

- CI runs tests, typecheck, Firestore Rules emulator tests, and build only.
- CI must not deploy Firebase, update live Rules, or write production data.
- CI must not require repository secrets for gate execution.

## Data Boundaries

- Do not commit production Firebase credentials.
- Do not commit real user UID or email allowlists.
- Do not commit real ledger or financial data.
- Use local fixtures and emulator-only test data for Rules and workflow validation.

## Firebase Rules Release Boundary

- A Rules release requires new, explicit user authorization naming the target project and candidate revision; emulator results never establish that a production project is live.
- Before an authorized release, export the active Rules to a user-controlled private release record, compare it with the candidate, and prepare rollback to that export.
- After an authorized release, validate only with synthetic or blank accounts and roll back if the deployed source or authorization boundary differs from the approved candidate.
- Do not store production project IDs, account identifiers, credentials, or financial data in this repository or its release checklist.

## Reporting

If a secret, real account identifier, or real financial record is committed, stop release work and rotate or remove the affected value outside this repository before continuing.
