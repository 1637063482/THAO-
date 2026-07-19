# Firebase Access Contract

## Owner-Confirmed Online Rules

For T017, the project owner provided the current online Firestore Rules semantics:

- The application is still a private two-account ledger.
- The girlfriend account and the project owner account have identical ledger permissions.
- Authorization is based on `request.auth.token.email`, compared case-insensitively.
- The two real email addresses are intentionally not stored in this repository.
- Authorized accounts may `read`, `create`, and `update` documents under `artifacts/{appId}/public/data/ledgers/{ledgerId}`.
- Ledger `delete` is always denied.
- Every other Firestore path is denied.

## Repository Candidate Rules

`firestore.rules` mirrors the online rule shape for Emulator verification, but uses fixture emails:

- `girlfriend.fixture@example.invalid`
- `owner.fixture@example.invalid`

These fixture emails are test-only placeholders. They must not be deployed as production access rules. If deployment is ever authorized separately, the private Firebase console values must be applied outside repository commits, or replaced through a secure deployment process that does not commit real emails, UIDs, passwords, or tokens.

## Permission Matrix

| Principal | Ledger read | Ledger create | Ledger update | Ledger delete | Other paths |
|---|---:|---:|---:|---:|---:|
| Girlfriend account | allow | allow | allow | deny | deny |
| Project owner account | allow | allow | allow | deny | deny |
| Anonymous user | deny | deny | deny | deny | deny |
| Missing email token | deny | deny | deny | deny | deny |
| Any third email/UID | deny | deny | deny | deny | deny |

## Boundaries

- This task does not deploy Firebase Rules.
- This task does not modify Firebase Auth accounts.
- This task does not write, migrate, or inspect production data.
- This task does not add client-side role UI or account management.
- Repository tests prove that the checked-in candidate rules match the owner-confirmed online semantics; they do not prove the live Firebase project has changed.
