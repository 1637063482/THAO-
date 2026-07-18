# MyExpenseApp Agent Instructions

本仓库采用双角色串行交付：GPT-5.5 Coder 实现，GPT-5.6 Terra Reviewer 独立审查。所有 Agent 每次开始工作必须重新读取仓库状态，不得依赖聊天中转述的结论。

## 必读顺序

1. `TASK_STATUS.md`
2. `AGENT_WORKFLOW.md`
3. `TASK_PLAN.md` 中当前 Task
4. `REVIEW_PLAN.md` 中当前 Task
5. 当前 Task 对应的 evidence、review 文件
6. 与当前 Task 直接相关的生产代码和测试

## 产品事实

- 女朋友是唯一日常记账者，VND 是唯一账务事实币种。
- 项目所有者使用第二个既有 Firebase 账号查看/维护，实际权限以线上 Rules 为准。
- CNY 仅为只读显示换算。
- 收入和支出都算有效记账；同日多笔只计一个记账日。
- 不做注册、成员管理、多家庭、邀请或通用多币账。

## 强制规则

- 同一时间只能有一个角色修改工作树；Coder 与 Reviewer 禁止并行运行。
- 一次只处理 `TASK_STATUS.md` 指向的一个 Task。
- Coder 不得自行标记 `APPROVED`；Reviewer 不得修改业务代码或测试来让审查通过。
- Reviewer 必须把结论写入 `docs/task-reviews/` 并提交，不能只在聊天中输出。
- Coder 必须从 review 文件读取返修要求，不能依据用户复制的摘要猜测。
- 未经用户明确授权，不得部署 Firebase、修改线上 Rules/Auth 账号或迁移真实数据。
- T011/T012 保持冻结，除非 T019 已形成明确 ADR。
- 修改必须遵循测试先行、最小范围、单 Task 单独提交。

## 通用门禁

```powershell
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Rules 相关 Task 还必须运行 `npm run test:rules`。所有成功声明必须附实际退出码；已知构建包体警告不能伪装成新错误，也不能被静默省略。

