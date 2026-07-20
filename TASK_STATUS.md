# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | UXS-002 |
| Title | Establish Vietnamese-first complete i18n baseline |
| State | CHANGES_REQUESTED |
| Branch | task/uxs-002-i18n |
| Base SHA | 460d337018106118b19c74fb3ca66ea33e07fa37 |
| Implementation Head | cf1144dbee341b5f0233d298ba5b42a47e5771b6 |
| Review Round | 2 |
| Evidence | `docs/review-evidence/UXS-002.md` |
| Latest Review | `docs/task-reviews/UXS-002-R2.md` - CHANGES_REQUESTED |
| Next Task | UXS-003 |

## Reviewer Attention

- UXS-002 R2 has CHANGES_REQUESTED in `docs/task-reviews/UXS-002-R2.md`. The R1 scope blocker is resolved by the amended plan, but direct user-visible Chinese strings remain in allowed `render.js`, `budget.js`, and `auth.js`; CSV/currency-test diffs are still outside the amended scope; and the actual-state invariance test/evidence are incomplete.
- User specifically chose to keep Chinese firework barrages and add equivalent Vietnamese barrages in `fireworks.js`, with fireworks not managed through the i18n dictionary. Preserve this amended boundary while fixing R2 findings.
- Preserve ADR-003 boundaries: no T011/T012 reconnect, no general transaction/account migration, no English UI, and no external notifications.

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
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
