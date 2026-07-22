# MyExpenseApp Agent Router

默认不要逐个打开大型文档。按角色运行一个命令；其输出已包含 `docs/CODEX_CONTEXT.md`、`TASK_STATUS.md` 和当前行动所需片段：

```powershell
npm run context:coder
npm run context:reviewer
```

命令输出是当前回合的最小绑定上下文。只有命令报错、规则冲突、状态异常、计划变更或输出明确要求时，才读取完整的 `AGENT_WORKFLOW.md`、`TASK_PLAN.md`、`REVIEW_PLAN.md`、`docs/AGENTS_FULL.md` 或历史文件。

不可违反：Coder/Reviewer 串行；一次只处理 `TASK_STATUS.md` 指向的 Task；Reviewer 不改业务代码，Coder 不自批；未经用户明确授权不得部署、修改线上 Firebase Rules/Auth 或真实数据；不得接回 T011/T012；真实财务数据、邮箱和 UID 不得进入测试、截图或 evidence。
