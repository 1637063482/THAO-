# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | UXS-014 |
| Title | Add safe deposit settlement and rollover workflow |
| State | IMPLEMENTING |
| Branch | task/uxs-014-deposit-settlement |
| Base SHA | 6bcef767f82bae405848cefd10b18088d9cbf0ee |
| Implementation Head | - |
| Review Round | 0 |
| Evidence | `docs/review-evidence/UXS-014.md` |
| Latest Review | - |
| Next Task | UXS-015 |

## Reviewer Attention

- UXS-012 must use the approved UXS-010 domain and UXS-011 storage adapter.
- Principal must never be written as legacy income; only confirmed actual interest may be queued.
- Settlement and rollover must be idempotent and recoverable across the deposit and yearly ledger documents.

## History

Completed-task history is stored in `docs/TASK_HISTORY.md` and is not part of the default context.
