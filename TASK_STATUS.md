# Task Workflow Status

> This file is maintained by Coder and Reviewer following `AGENT_WORKFLOW.md`. Chat summaries are not the source of truth.

## Current Task

| Field | Value |
|---|---|
| Task ID | T020 |
| Title | Make FX display adapter reliable |
| State | READY_FOR_REVIEW |
| Branch | task/t020-fx-display-reliability |
| Base SHA | 27776b994d558faa2e3ccd13ac91e443932f6000 |
| Implementation Head | a4d853e34f5a094f8528c7cad5f85325788cad57 |
| Review Round | 2 |
| Evidence | `docs/review-evidence/T020.md` |
| Latest Review | `docs/task-reviews/T020-R1.md` - CHANGES_REQUESTED |
| Next Task | T021 |

## Reviewer Attention

- Automatic FX unavailability must not leave the default/unverified rate usable for CNY conversion.
- Reject malformed cache timestamps rather than reporting them as fresh cache values.
- Add production-path coverage for unavailable automatic FX, valid/stale cache and malformed cache timestamps; preserve no-deploy/no-T021 boundaries.

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
| T013 | APPROVED | `1d4903c` | T013 Review PASS; legacy workflow did not generate a repository review file |
| T014 | APPROVED | `c1eadec` | `docs/task-reviews/T014-R2.md` |
| T015 | APPROVED | `a926da7` | `docs/task-reviews/T015-R2.md` |
| T016 | APPROVED | `ed73457` | `docs/task-reviews/T016-R3.md` |
| T017 | APPROVED | `1a2bf9e` | `docs/task-reviews/T017-R2.md` |
| T018 | APPROVED | `9c404c2` | `docs/task-reviews/T018-R3.md` |
| T019 | APPROVED | `99b62db` | `docs/task-reviews/T019-R1.md` |
