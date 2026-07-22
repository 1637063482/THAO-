# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | UXS-004 |
| Title | Redesign dashboard spending awareness zone |
| State | PLANNED |
| Branch | task/uxs-004-dashboard |
| Base SHA | c252742f93faea7d6be4d0843457507ab54f4e3b |
| Implementation Head | pending |
| Review Round | 1 |
| Evidence | `docs/review-evidence/UXS-004.md` |
| Latest Review | pending |
| Next Task | UXS-005 |

## Reviewer Attention

- UXS-004 is ready for the DeepSeek V4 Flash Coder. Terra must stop until the state is `READY_FOR_REVIEW`.
- UXS-004 redesigns the home page: hero (budget remaining), spending breakdown, categories, streak, recent entries. ViewModel reads from existing balances/entries/settings without duplicating business rules.
- Prohibited: modifying budget口径, legacy entries schema, real accounting data, savings/deposit persistence.
- Preserve the prohibited boundary: no budget/entry/sync calculation, Firestore, or business-schema modifications. No UXS-004 work may start.
- Preserve ADR-003 boundaries: no T011/T012 reconnect, no general transaction/account migration, no English UI, and no external notifications.

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
| UXS-003 | APPROVED | `c252742` | `docs/task-reviews/UXS-003-R4.md` |
| UXS-002 | APPROVED | `a9fc9fc` | `docs/task-reviews/UXS-002-R7.md` |
| UXS-001 | APPROVED | `460d337` | `docs/task-reviews/UXS-001-R4.md` |
| T021 | APPROVED | `311dd41` | `docs/task-reviews/T021-R1.md` |
| T020 | APPROVED | `a4d853e` | `docs/task-reviews/T020-R2.md` |
| T019 | APPROVED | `99b62db` | `docs/task-reviews/T019-R1.md` |
| T018 | APPROVED | `9c404c2` | `docs/task-reviews/T018-R3.md` |
| T017 | APPROVED | `1a2bf9e` | `docs/task-reviews/T017-R2.md` |
| T016 | APPROVED | `ed73457` | `docs/task-reviews/T016-R3.md` |
| T015 | APPROVED | `a926da7` | `docs/task-reviews/T015-R2.md` |
| T014 | APPROVED | `c1eadec` | `docs/task-reviews/T014-R2.md` |
| T013 | APPROVED | `1d4903c` | T013 Review PASS; legacy workflow did not generate a repository review file |
