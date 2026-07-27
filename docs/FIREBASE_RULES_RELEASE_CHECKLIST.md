# Firebase Rules Release Checklist

## Scope and candidate baseline

- Candidate Rules source: `firestore.rules` at commit `270245953476730473e84f4cdaa655547e8366af`.
- Emulator project: `demo-no-project` only. It is not a Firebase production project.
- Required local gates:

  ```powershell
  npm run test:rules
  npx vitest run tests/unit/ci-workflow.test.js
  git diff --check
  ```

- A passing emulator gate proves only the checked candidate against local synthetic fixtures. It does not prove that any online Firebase project has received or enforces these Rules.
- This checklist does not authorize or execute `firebase deploy`.

## Release blocker in the current candidate

The current candidate allowlist contains only `.invalid` synthetic fixture addresses. Do not deploy it to a production project. Before a future release can proceed, the user must explicitly approve a production-safe authorization design that does not commit real email addresses, UIDs, credentials, or financial data to this repository. That design and its two-authorized-account contract require a fresh Rules review and emulator coverage before this checklist may continue.

## Before deployment

- [ ] Obtain new, explicit user authorization for this release. The authorization must name the target Firebase project ID, the candidate commit SHA, the release window, and the authorized operator. Do not write the production project ID in this repository.
- [ ] Confirm the local checkout is at the approved candidate SHA and that `firebase.json` still maps Firestore Rules to `firestore.rules`.
- [ ] Run all required local gates above with `demo-no-project`; record the command results in the user-approved release record, not as evidence that production is live.
- [ ] In the Firebase Console for the user-confirmed target project, copy the currently active Firestore Rules source, active release timestamp, and project ID into a user-controlled private release record. Do not commit that export if it contains real identities or production configuration.
- [ ] Compare the private current-Rules export with the candidate using `git diff --no-index --word-diff=plain <private-current.rules> firestore.rules`; resolve every intentional change before deployment.
- [ ] Confirm the approved authorization design has two authorized-account contract checks and negative checks for anonymous and unauthorized access. Use only synthetic or blank validation identities; do not place their real identifiers in this document, source, tests, screenshots, or commit messages.
- [ ] Confirm the rollback operator, private backup location, and stop conditions below are available before making any production change.

## During deployment

- [ ] Reconfirm the target project ID with the user and operator immediately before the action. A matching local Firebase login or default project is not sufficient authorization.
- [ ] The user-approved operator releases only `firestore.rules` to the user-confirmed project, following the Firebase CLI or Console procedure selected in the authorization record.
- [ ] Record the deployment timestamp and resulting Rules release identifier in the private release record. Do not add a production ID, account identifier, credential, or financial data to Git.
- [ ] Stop immediately if the target project, candidate SHA, or displayed Rules source differs from the approved release record.

## After deployment

- [ ] Reopen the Firestore Rules view for the user-confirmed project and compare the displayed source with the approved candidate SHA/source.
- [ ] With only synthetic or blank validation accounts, verify the approved two-authorized-account contract and the anonymous/unauthorized denial contract against the deployed project. Do not create, read, or alter real financial records.
- [ ] Verify the candidate boundary still holds: authorized users may read/create/update the savings document through valid mutations; physical document deletion remains denied; unmatched documents remain denied.
- [ ] Record the results and any release identifier in the private release record. State separately that production validation passed; never infer it from an emulator result.

## Rollback

Roll back immediately if any deployed source differs from the candidate, either authorized-account contract check fails, anonymous/unauthorized access succeeds, physical deletion succeeds, or validation could touch real financial data.

- [ ] Stop validation and preserve the observed error and timestamp without copying real data into the repository.
- [ ] Reapply the pre-deployment Rules source from the private release record to the same user-confirmed project, using the user-approved operator.
- [ ] Reopen the Rules view and verify that the restored source matches the private backup.
- [ ] Repeat only synthetic/blank denial checks after rollback, notify the user, and require new explicit authorization before any retry.
