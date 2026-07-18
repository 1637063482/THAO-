# Task Workflow Status

> 本文件由 Coder 和 Reviewer 按 `AGENT_WORKFLOW.md` 更新。聊天摘要不是状态事实源。

## Current Task

| Field | Value |
|---|---|
| Task ID | T014 |
| Title | 从 legacy entries 派生连续记账并修复奖励 |
| State | APPROVED |
| Branch | fix/streak-t013-t014 |
| Base SHA | 1d4903c40205cef48c241e4313fe97ebf574dbb5 |
| Implementation Head | c1eadecf1cef2d2dc87f07bac2d628dd76d6c573 |
| Review Round | 2 |
| Evidence | `docs/review-evidence/T014_GREEN.md` |
| Latest Review | `docs/task-reviews/T014-R2.md` — APPROVED；审查实现 `c1eadec` |
| Next Task | T015 |

## Reviewer Attention

- 必须核对纯收入、纯支出、混合记录、直接编辑、快速记账、云端快照和奖励去重。
- R2 必须重点复核 Dec 31 到 Jan 1 连续性是否来自上一年度 entries，而不是旧 `expense_streak`。
- R2 必须重点复核远端 snapshot 是否走统一 streak refresh，并且 7/30 milestone 按日期+阈值去重。
- `src/js/quick-add.js` 仍未在 R2 修改；应检查既有调用链是否确实已统一，而不是只检查文件是否修改。

## History

| Task | Final State | Approved Head | Review |
|---|---|---|---|
| T013 | APPROVED | `1d4903c` | T013 Review PASS（T014 开始前已完成；旧流程未生成仓库 review 文件） |
