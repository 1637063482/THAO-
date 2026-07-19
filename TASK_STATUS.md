# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | T017 |
| Title | Verify online Firebase access contract |
| State | READY_FOR_REVIEW |
| Branch | task/t017-rules-contract |
| Base SHA | c2a726e9f8d68d7f80a523ff8d79fd3ac76ecb5f |
| Implementation Head | 73b02e470354707bade80e6fc56fa8cc42849ce2 |
| Review Round | 1 |
| Evidence | `docs/review-evidence/T017.md` |
| Latest Review | pending Terra R1 review |
| Next Task | T018 |

## Reviewer Attention

- Verify repository Rules tests match the owner-confirmed online Firebase Rules semantics, not historical assumptions.
- Confirm girlfriend and project owner account permissions by role description only; do not write real UID values to the repository.
- Verify third UID and anonymous access are denied.

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
| T013 | APPROVED | `1d4903c` | T013 Review PASS; legacy workflow did not generate a repository review file |
| T014 | APPROVED | `c1eadec` | `docs/task-reviews/T014-R2.md` |
| T015 | APPROVED | `a926da7` | `docs/task-reviews/T015-R2.md` |
| T016 | APPROVED | `ed73457` | `docs/task-reviews/T016-R3.md` |
