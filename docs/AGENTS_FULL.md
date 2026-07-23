# MyExpenseApp Agent Instructions — Full Reference

> 本文件是异常、争议和流程维护时使用的详细参考，不属于默认回合上下文。默认绑定入口见 `AGENTS.md` 和 `docs/CODEX_CONTEXT.md`。

本仓库采用双角色串行交付：DeepSeek V4 Flash Coder 实现，GPT-5.6 Terra Reviewer 独立审查。所有 Agent 不得依赖聊天中转述的结论。

## 完整读取顺序

仅在精简上下文无法安全决定动作时读取：

1. `docs/CODEX_CONTEXT.md`
2. `TASK_STATUS.md`
3. `AGENT_WORKFLOW.md`
4. `TASK_PLAN.md` 中当前 Task
5. `REVIEW_PLAN.md` 中当前 Task
6. 当前 Task 对应 evidence、review、生产代码和测试

## 产品事实

- 女朋友是唯一日常记账者，VND 是唯一账务事实币种。
- 项目所有者使用第二个既有 Firebase 账号查看/维护，实际权限以线上 Rules 为准。
- CNY 仅为只读显示换算。
- 收入和支出都算有效记账；同日多笔只计一个记账日。
- 应用通过 Cloudflare 部署，是网址访问并可安装的 PWA；浏览器与 standalone 模式都必须可用。
- 默认语言是越南语，可切换中文，不提供英语。
- 手机以快速记账为主，完整 legacy 月表仍须可查看和编辑；电脑端保留完整表格。
- UI 使用暖白、杏橙、克制的 Apple 风格；首页最大数字是本月预算剩余。
- 月度与年度储蓄目标可调整；存款本金不是支出，预计利息不是已实现收入。
- 存款提醒只在应用打开、恢复前台或跨越越南日期时弹窗；不做 Web Push、系统通知或 Cron。
- 不做注册、成员管理、多家庭、邀请或通用多币账。

## 强制规则

- 同一时间只能有一个角色修改工作树；Coder 与 Reviewer 禁止并行运行。
- 一次只处理 `TASK_STATUS.md` 指向的一个 Task。
- Coder 不得自行标记 `APPROVED`；Reviewer 不得修改业务代码或测试来让审查通过。
- Reviewer 必须把结论写入 `docs/task-reviews/` 并提交；Coder 必须从 review 文件读取返修要求。
- 未经用户明确授权，不得部署 Firebase、修改线上 Rules/Auth 账号或迁移真实数据。
- T019 已选择稳定 legacy 年度矩阵；T011/T012 必须保持断开，除非未来新的用户批准 ADR 推翻该决定。
- Coder 必须严格执行当前 Task 的修改文件和禁止修改；必须扩展范围时停止并记录 BLOCKED。
- UI Task 必须验证其计划规定的响应式尺寸，不能只凭构建成功声称视觉完成。
- 用户可见文案必须同时提供越南语与中文；真实财务数据、邮箱和 UID 不得进入截图、测试或 evidence。
- 修改遵循测试先行、最小范围、单 Task 单独提交。

## 通用门禁

```powershell
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Rules 相关 Task 还必须运行 `npm run test:rules`。成功声明必须附实际退出码；已知构建包体警告不能伪装成新错误，也不能被静默省略。
