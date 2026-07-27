# Task Workflow Status

> 只记录当前工作与简短历史。以代码、完整 diff 和新鲜测试为事实源。

## Current Work

| Field | Value |
|---|---|
| Work ID | REM-008 |
| Scope | 提取可挂载/卸载的存款功能控制器 |
| State | APPROVED |
| Branch | `main` |
| Plan | `docs/MAINTENANCE_TASK_PLAN_2026-07-27.md` |
| Implementer | Sol / high |
| Reviewer | 独立 Terra / high；`docs/task-reviews/REM-008-R1.md` |
| Result | 已批准：存款 controller lifecycle 已独立，Auth 重登不叠加订阅 |
| Verification | 定向 41/41；Rules 16/16（`demo-no-project`）；全量 334 passed / 20 skipped；typecheck、build、diff check 通过 |
| Previous Work | REM-001 已完成，提交 `6ee88e8` |
| Deployment | 未部署；未修改线上 Firebase/Auth/数据 |

UXS-001 至 UXS-015 均已批准，历史详见 `docs/TASK_HISTORY.md` 与已有 review 文件。

## Bug Fixes (post-approval)

| Bug ID | Title | Head SHA | Status |
|---|---|---|---|
| BUG-L10N-001 | Fix language switching partial update & analysis panel disappearance | 293334a | fixed |
| BUG-L10N-001 | Fix income/expense color semantics (income=red, expense=green) | 04bfa2d | fixed |
| BUG-L10N-001 | Separate analysis view from home page | 6f197bc | fixed |
| BUG-L10N-001 | Fix savings/dashboard colors and month tab i18n | 01d3e09 | fixed |
| BUG-L10N-001 | Fix login Enter key + deposit form (banks/terms/auto-date) | 3ccd239 | fixed |
| BUG-L10N-001 | Auto-calc interest, dark mode text, privacy toggle, refresh bugs | a3de8e7 | fixed |
| BUG-L10N-001 | Ledger toggle single-language label, default table view | b3d27e0 | fixed |

## History

Completed-task history is stored in `docs/TASK_HISTORY.md` and is not part of the default context.
