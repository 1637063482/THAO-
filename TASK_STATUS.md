# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | UXS-004 |
| Title | Redesign dashboard spending awareness zone |
| State | CHANGES_REQUESTED |
| Branch | task/uxs-004-dashboard |
| Base SHA | c252742f93faea7d6be4d0843457507ab54f4e3b |
| Implementation Head | 30aedafa9faa7b0aa0b1bb5d6aa9adaafa936aff |
| Review Round | 1 |
| Evidence | `docs/review-evidence/UXS-004.md` |
| Latest Review | `docs/task-reviews/UXS-004-R1.md` - CHANGES_REQUESTED |
| Next Task | UXS-005 |

## Reviewer Attention

- UXS-004 R1 is CHANGES_REQUESTED. The dashboard is not wired into `main.js`/`index.html`, today spending incorrectly includes income, and over-budget remaining is clamped to zero. Required six-size screenshots are absent; the ViewModel also duplicates legacy budget/entry derivations and locale-file scope needs resolution.
- Do not start UXS-005. Coder must read `docs/task-reviews/UXS-004-R1.md` and address only its minimum corrections.
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
