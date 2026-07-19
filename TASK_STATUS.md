# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | T017 |
| Title | Verify online Firebase access contract |
| State | READY_FOR_REVIEW |
| Branch | task/t017-rules-contract |
| Base SHA | c2a726ed6a1a3f335c1f4ca55ed9edb035bf0f48 |
| Implementation Head | 1a2bf9e9e91b22265bc3292f1ebf2bdaabe1c4a5 |
| Review Round | 2 |
| Evidence | `docs/review-evidence/T017.md` |
| Latest Review | `docs/task-reviews/T017-R1.md` - R1 changes addressed; ready for Terra R2 review |
| Next Task | T018 |

## Reviewer Attention

- Scrub real-account-identifying email patterns from T017 evidence and record secret-scan evidence without values.
- Correct the T017 evidence base SHA to `c2a726ed6a1a3f335c1f4ca55ed9edb035bf0f48`.
- Preserve the verified Rules scope: no deploy, Firebase Auth change, production-data operation, client role UI, or T011/T012 expansion.

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
| T013 | APPROVED | `1d4903c` | T013 Review PASS; legacy workflow did not generate a repository review file |
| T014 | APPROVED | `c1eadec` | `docs/task-reviews/T014-R2.md` |
| T015 | APPROVED | `a926da7` | `docs/task-reviews/T015-R2.md` |
| T016 | APPROVED | `ed73457` | `docs/task-reviews/T016-R3.md` |
