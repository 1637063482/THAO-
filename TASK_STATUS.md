# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | T016 |
| Title | Lock VND fact with CNY read-only view |
| State | APPROVED |
| Branch | task/t016-vnd-currency-view |
| Base SHA | f363b2b454924926fbb98240670c0487e967737a |
| Implementation Head | ed734572fb2fa16892617d07185ebb4060073bb8 |
| Review Round | 3 |
| Evidence | `docs/review-evidence/T016_GREEN.md` |
| Latest Review | `docs/task-reviews/T016-R3.md` - APPROVED |
| Next Task | T017 |

## Reviewer Attention

- Verify VND remains the only persisted accounting fact; CNY switching may only change DOM/ViewModel and must not rewrite `state.appState` or `state.pendingUpdates`.
- Cover 100 repeated switches without drift, auto/manual exchange rates, and large/zero/decimal display cases.
- Verify Quick Add CNY input converts exactly once at submit boundary and writes VND.

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
| T013 | APPROVED | `1d4903c` | T013 Review PASS; legacy workflow did not generate a repository review file |
| T014 | APPROVED | `c1eadec` | `docs/task-reviews/T014-R2.md` |
| T015 | APPROVED | `a926da7` | `docs/task-reviews/T015-R2.md` |
