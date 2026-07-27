# Task Workflow Status

> 只记录当前工作与简短历史。以代码、完整 diff 和新鲜测试为事实源。

## Current Work

| Field | Value |
|---|---|
| Work ID | MAINT-2026-07-27 |
| Scope | 项目审查、存款保存/UI 修复、工作流精简 |
| State | DONE |
| Branch | `main` |
| Audit | `docs/PROJECT_CODE_AUDIT_2026-07-27.md` |
| Tests | Vitest 305 passed / 16 skipped；Rules + repository 12 passed |
| Gates | typecheck、build、diff check 通过 |
| Known warning | 主 JS chunk 849.32 kB（gzip 240.45 kB），超过 500 kB |
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
