# Firebase Access Contract

## Deployable repository Rules

`firestore.rules` is the deployable source for this repository. It does not
contain real email addresses, UIDs, credentials, or financial data.

Firebase Authentication establishes the caller identity. Firestore Rules then
authorize the caller only when a server-managed member document exists at:

```text
artifacts/{appId}/public/data/members/{uid}
```

The member document must contain:

```json
{ "access": "shared-ledger" }
```

The two real household accounts are provisioned out of band by an authorized
operator in the target Firebase project. The client cannot read or write the
`members` path, so membership cannot be self-granted from the app.

Authorized members may `read`, `create`, and `update` ledger documents under
`artifacts/{appId}/public/data/ledgers/{ledgerId}`. Ledger `delete` is always
denied, and every other Firestore path is denied by default.

## Emulator contract

Rules tests use synthetic UIDs and seed synthetic member documents through the
Rules-test admin context. They do not use production email addresses or UIDs.
This proves the authorization shape and the ledger mutation constraints without
claiming that a production project has been provisioned or deployed.

## Permission matrix

| Principal | Member document | Ledger read | Ledger create | Ledger update | Ledger delete | Other paths |
|---|---:|---:|---:|---:|---:|---:|
| Provisioned member | client denied | allow | allow | allow | deny | deny |
| Authenticated but unprovisioned user | deny | deny | deny | deny | deny | deny |
| Anonymous user | deny | deny | deny | deny | deny | deny |

## Release boundaries

- This change does not deploy Firebase Rules or modify Firebase Auth/data.
- Before deploying this Rules source, the authorized operator must provision
  the two real member documents in the target project using a private,
  auditable process.
- Deploying Rules before those documents exist will reproduce the blank-data
  symptom: login can succeed while Firestore reads are denied.
- A Rules deployment requires explicit authorization naming the target project,
  candidate revision, release window, and rollback source.
