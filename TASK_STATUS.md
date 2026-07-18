# Task Workflow Status

> 本文件由 Coder 和 Reviewer 按 `AGENT_WORKFLOW.md` 更新。聊天摘要不是状态事实源。

## Current Task

| Field | Value |
|---|---|
| Task ID | T015 |
| Title | 修复 PWA 跨午夜日期陈旧 |
| State | CHANGES_REQUESTED |
| Branch | task/t015-vietnam-clock |
| Base SHA | 85a2d680e0db9e3f536db7481842329ec675a26c |
| Implementation Head | 5f911a766801d9176063c3befa0e02de2dd247ae |
| Review Round | 1 |
| Evidence | `docs/review-evidence/T015_GREEN.md` |
| Latest Review | `docs/task-reviews/T015-R1.md` - CHANGES_REQUESTED: continuously visible PWA does not refresh at Vietnam midnight |
| Next Task | T016 |

## Reviewer Attention

- 必须核对账本日期使用 `Asia/Ho_Chi_Minh`，不跟随设备时区。
- 必须核对跨越越南午夜后，今日行、快速记账默认日和 streak 自动刷新。
- 必须覆盖月末、年末、闰年和中国/越南设备时区 fake clock。

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
| T013 | APPROVED | `1d4903c` | T013 Review PASS（T014 开始前已完成；旧流程未生成仓库 review 文件） |
| T014 | APPROVED | `c1eadec` | `docs/task-reviews/T014-R2.md` |
