# ADR-006: Production-deployable Firestore Rules authorization

- Status: Accepted
- Date: 2026-08-05

## Context

The checked-in `firestore.rules` file is the source used by the deployment
workflow. It must therefore be safe to deploy to the real Firebase project.
Putting synthetic test email addresses in that file makes the emulator green
but denies every real account after deployment. Keeping real email addresses or
UIDs in Git would violate the repository's data and security boundary.

## Decision

Use a server-managed membership document as the authorization contract:

```text
artifacts/{appId}/public/data/members/{uid}
```

A caller is authorized when Firebase Auth has established its UID and the
matching member document has `access: "shared-ledger"`. Client reads and
writes to the member path are denied. The existing ledger validation, deny-
delete behavior, and deny-by-default fallback remain in force.

Rules tests create synthetic member documents through the emulator's disabled-
Rules context. They do not use real emails, UIDs, credentials, or financial
records. In production, the two intended member documents are provisioned
separately by an authorized operator before the Rules source is deployed.

## Consequences

- The repository Rules file is directly deployable without identity values in
  source control.
- Login and Firestore authorization are intentionally separate: a successful
  login does not imply ledger access.
- A production rollout must provision and verify the two member documents
  before releasing Rules; otherwise the application will show an empty data
  state because Firestore reads are denied.
- Membership management is not a client feature and remains outside the
  application UI.
