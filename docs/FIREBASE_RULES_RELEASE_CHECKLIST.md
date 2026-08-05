# Firebase Rules Release Checklist

## Scope and deployable baseline

- Deployable Rules source: `firestore.rules`.
- Emulator project: `demo-no-project` only. It is not a Firebase production project.
- Repository Rules contain no real email addresses, UIDs, credentials, or financial data.
- Required local gates:

  ```powershell
  npm run test:rules
  npx vitest run tests/unit/ci-workflow.test.js
  git diff --check
  ```

- A passing emulator gate proves only the checked Rules against local synthetic
  fixtures. It does not prove that an online Firebase project has received or
  enforces them.
- This checklist does not itself authorize or execute `firebase deploy`.

## Required production precondition

The Rules authorization source is the server-managed member document:

```text
artifacts/{appId}/public/data/members/{uid}
```

For each of the two real household accounts, an authorized operator must
privately create the document with:

```json
{ "access": "shared-ledger" }
```

The member documents must be created in the target project before deploying
these Rules. They must not be created by the client, committed to the
repository, or copied into screenshots, tests, or release notes. If the
documents cannot be provisioned and verified, stop the release; deploying the
Rules alone will deny the accounts' Firestore reads and writes.

## Before deployment

- [ ] Obtain explicit user authorization naming the target Firebase project,
      candidate revision, release window, and authorized operator.
- [ ] Confirm the local checkout is at the approved candidate revision and that
      `firebase.json` maps Firestore Rules to `firestore.rules`.
- [ ] Run all required local gates above with `demo-no-project`.
- [ ] In the target project, privately verify that exactly the two intended
      member documents exist with `access: "shared-ledger"`; do not record the
      real UIDs in Git.
- [ ] Export the currently active Rules and release metadata to a private
      rollback record. Do not commit that export if it contains production
      identities or configuration.
- [ ] Compare the private active Rules export with `firestore.rules` and
      resolve every intentional change before deployment.
- [ ] Confirm the rollback operator and stop conditions are available.

## During deployment

- [ ] Reconfirm the target project and candidate revision immediately before
      the action.
- [ ] Release only the approved `firestore.rules` source through the
      user-approved operator and procedure.
- [ ] Record the deployment timestamp and Rules release identifier in the
      private release record.
- [ ] Stop if the target project, candidate revision, or displayed Rules source
      differs from the approved release record.

## After deployment

- [ ] Reopen the target project's Rules view and compare the displayed source
      with the approved candidate.
- [ ] With synthetic or blank validation accounts only, verify that provisioned
      members can read/create/update valid ledger documents and that anonymous
      and unprovisioned users are denied.
- [ ] Verify physical ledger deletion and client access to `members` remain
      denied.
- [ ] Record production validation separately from emulator results.

## Rollback

Roll back immediately if the deployed source differs from the candidate, a
member/denial contract check fails, deletion succeeds, or validation could
touch real financial data.

- [ ] Stop validation and preserve the observed error and timestamp privately.
- [ ] Reapply the pre-deployment Rules source from the private rollback record
      to the same target project using the approved operator.
- [ ] Reopen the Rules view and verify the restored source matches the backup.
- [ ] Repeat only synthetic/blank denial checks after rollback and require new
      explicit authorization before retrying.
