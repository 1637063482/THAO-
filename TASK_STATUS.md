# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | UXS-010 |
| Title | Implement deposit and interest domain model |
| State | CHANGES_REQUESTED |
| Branch | task/uxs-010-deposit-domain |
| Base SHA | 15f59029f965361cf69003cfcaa9863373393285 |
| Implementation Head | d97eb2c94440e3749f60d423961e52f0e1bd5137 |
| Review Round | 2 |
| Evidence | `docs/review-evidence/UXS-010.md` |
| Latest Review | `docs/task-reviews/UXS-010-R2.md` - CHANGES_REQUESTED |
| Next Task | UXS-011 |

## Reviewer Attention

- R2 confirms the two R1 code changes but finds three accepted ADR-004 contract violations: persisted/derived status separation, aggregate population, and fixed-365 interest basis.
- Coder must read `docs/task-reviews/UXS-010-R2.md`, repair only its blocking items, then submit a new READY_FOR_REVIEW head.

## History

Completed-task history is stored in `docs/TASK_HISTORY.md` and is not part of the default context.
