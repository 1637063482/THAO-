# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | UXS-003 |
| Title | Establish Apple Warm Design Tokens and responsive App Shell |
| State | PLANNED |
| Branch | task/uxs-003-apple-warm-tokens |
| Base SHA | a9fc9fcf67e04b15f2ffc99347896f55dbc55bed |
| Implementation Head | pending |
| Review Round | 1 |
| Evidence | `docs/review-evidence/UXS-003.md` |
| Latest Review | pending |
| Next Task | UXS-004 |

## Reviewer Attention

- UXS-003 is ready for the DeepSeek V4 Flash Coder. Terra must stop until the state is `READY_FOR_REVIEW`.
- UXS-003 establishes Apple Warm Design Tokens (<768px bottom nav, >=768px sidebar), PWA safe-area, keyboard/accessibility navigation.
- Prohibited: modifying budget/entry/sync calculations, Firestore, business schema.
- Preserve ADR-003 boundaries: no T011/T012 reconnect, no general transaction/account migration, no English UI, and no external notifications.

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
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
