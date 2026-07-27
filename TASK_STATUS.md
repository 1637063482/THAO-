# Task Workflow Status

> 只记录当前工作与简短历史。以代码、完整 diff 和新鲜测试为事实源。

## Current Work

| Field | Value |
|---|---|
| Task ID | REM-016 |
| Current scope | Independent final review of maintenance remediation |
| Scope | Composition root, module and data boundaries, lifecycle, real bilingual path, responsive rendering, types, and bundle budget |
| State | READY_FOR_REVIEW |
| Current result | `main.js` is now a thin startup root; its former runtime behavior is isolated in `src/js/application-runtime.js`, and reviewer context resolves the maintenance plan and review criteria |
| Current verification | RED/GREEN composition-root evidence; 343 passed / 16 skipped; Rules 16/16 using demo-no-project; TypeScript, checkJs, build, and bundle budget passed |
| Branch | `main` |
| Plan | `docs/MAINTENANCE_TASK_PLAN_2026-07-27.md` |
| Evidence | `docs/review-evidence/REM-016-R2.md` |
| Latest Review | `docs/task-reviews/REM-016-R1.md` |
| Implementer | Terra / high |
| Reviewer | 独立 Terra / high；R2 review pending |
| Result | CHANGES_REQUESTED：`main.js` 未达到薄 composition root 要求；reviewer context status contract 在 base 已损坏 |
| Verification | Reviewer：完整 `7f03eed..e24d333` diff、Rules/repository、lifecycle、真实合成渲染和全部 REM-016 门禁；详见 REM-016-R1 |
| Previous Work | REM-015 implementation head `e24d333` |
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
