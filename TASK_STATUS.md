# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | T019 |
| Title | Decide T011/T012 account and transaction scope ADR |
| State | IMPLEMENTING |
| Branch | task/t019-account-transaction-adr |
| Base SHA | ea94b388cd6c5b7ffae178abe879ef76335c3987 |
| Implementation Head | pending |
| Review Round | 1 |
| Evidence | `docs/review-evidence/T019.md` |
| Latest Review | pending |
| Next Task | T020 |

## Reviewer Attention

- T019 is an ADR-only product/architecture decision task.
- Coder must compare stabilizing the existing legacy matrix versus migrating to standalone transactions.
- Coder must not silently choose a migration path or modify business code, Firestore schema, or production data.

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
| T013 | APPROVED | `1d4903c` | T013 Review PASS; legacy workflow did not generate a repository review file |
| T014 | APPROVED | `c1eadec` | `docs/task-reviews/T014-R2.md` |
| T015 | APPROVED | `a926da7` | `docs/task-reviews/T015-R2.md` |
| T016 | APPROVED | `ed73457` | `docs/task-reviews/T016-R3.md` |
| T017 | APPROVED | `1a2bf9e` | `docs/task-reviews/T017-R2.md` |
| T018 | APPROVED | `9c404c2` | `docs/task-reviews/T018-R3.md` |
