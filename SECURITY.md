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

## Reporting

If a secret, real account identifier, or real financial record is committed, stop release work and rotate or remove the affected value outside this repository before continuing.
