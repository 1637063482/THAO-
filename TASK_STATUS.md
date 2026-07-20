# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | UXS-002 |
| Title | Establish Vietnamese-first complete i18n baseline |
| State | READY_FOR_REVIEW |
| Branch | task/uxs-002-i18n |
| Base SHA | 460d337018106118b19c74fb3ca66ea33e07fa37 |
| Implementation Head | 8c4f79f41d03d81f6657156cad2cac5116ad7f6b |
| Review Round | 6 |
| Evidence | `docs/review-evidence/UXS-002.md` |
| Latest Review | `docs/task-reviews/UXS-002-R5.md` - CHANGES_REQUESTED |
| Next Task | UXS-003 |

## Reviewer Attention

- UXS-002 R6 is ready for Terra review. R5 findings fixed: budget-heading test now calls real `renderMonthTable()`, asserts actual DOM `#budget-label-month` element and `container.innerHTML` for both locales and switch. Evidence inventories include the test file. 137 tests pass (21 test files).
- User chose Option B (narrowed scope): fireworks.js has both Chinese and Vietnamese barrages; currency-view.js/fx-display.js excluded. Preserve this boundary; no UXS-003 work may start.
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
