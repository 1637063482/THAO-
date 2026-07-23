# MyExpenseApp Compact Agent Context

本文件是每个 Coder/Reviewer 回合默认读取的绑定规则。详细解释仅在异常时查阅 `AGENT_WORKFLOW.md` 和 `docs/AGENTS_FULL.md`。

## 产品边界

- 私人 PWA：女朋友是唯一日常记账者；项目所有者使用第二个既有 Firebase 账号查看/维护。
- VND 是唯一持久化账务币种；CNY 仅只读换算。收入和支出都算记账，同日多笔只计一天。
- 默认越南语，可切换中文，无英语；手机快速记账优先，legacy 完整月表必须保留可看可改。
- Apple Warm UI；首页主数字为本月预算剩余。储蓄目标可调；存款本金不是支出，预计利息不是收入。
- 提醒只在应用打开、恢复前台或跨越越南日期时出现；无 Push、系统通知、Cron。
- 不做注册、成员、多家庭、邀请、通用多币账。ADR-003 已拒绝 T011/T012 迁移。

## 状态动作

| 状态 | Coder | Reviewer |
|---|---|---|
| `PLANNED` | 转 `IMPLEMENTING`，按当前 Task TDD | STOP |
| `IMPLEMENTING` | 继续当前 Task | STOP |
| `READY_FOR_REVIEW` | STOP | 独立审查 |
| `CHANGES_REQUESTED` | 只修最新 review 阻断项 | STOP |
| `APPROVED` | 初始化 `Next Task`，一个新分支 | STOP |
| `BLOCKED` | STOP，报告仓库阻塞 | STOP |

状态权限：Coder 只能开始/返修/提交审查；Reviewer 只能把 `READY_FOR_REVIEW` 改为 `APPROVED`、`CHANGES_REQUESTED` 或 `BLOCKED`。两角色禁止并行，聊天摘要不是事实源。

## 默认工作方式

1. 每轮只运行一次 `npm run context:coder` 或 `npm run context:reviewer`；输出已包含本文件、`TASK_STATUS.md` 及所需 Task/review/evidence，不要事先重复打开它们。
2. 检查 `git status --short`，只使用 context 命令输出的当前行动资料。
3. 每个 Task 使用独立分支、最小改动、测试先行。Coder 完成后停在 `READY_FOR_REVIEW`；Reviewer提交仓库 review 后停止。
4. 仅当命令失败、Task 找不到、状态不合法、文件冲突、计划需变更或安全边界不清时读取完整文档。

## 禁止事项

- 未经用户明确授权：不得部署 Cloudflare/Firebase、修改线上 Rules/Auth、迁移或写真实数据。
- 不接回 T011/T012，不建立通用 Account/Transaction、多家庭或多币账。
- Reviewer 不改业务代码/测试；Coder 不自批、不改历史 review、不越过当前 Task。
- 不覆盖未知工作树改动；不 force push；不把真实财务数据、邮箱、UID 或凭证写入日志、fixture、截图、evidence。
- UI Task 使用合成数据，并完成 Task 指定的响应式、键盘、safe-area、vi/zh 验证。

## Evidence、提交与门禁

- Coder evidence：`docs/review-evidence/<TASK>.md`；Reviewer：`docs/task-reviews/<TASK>-R<轮次>.md`。
- Evidence 必须记录 base/head、RED/GREEN、实际退出码、修改/未修改范围、警告和偏差。
- Reviewer 亲自检查 `base..implementation_head`、定向测试、完整 diff 和 evidence；只提交 review 与状态。
- 通用门禁：`npm test -- --run`、`npm run typecheck`、`npm run build`、`git diff --check`；Rules Task 加 `npm run test:rules`。
- 已知 500 kB chunk 警告必须报告但不冒充失败。完整历史只在需要时读 `docs/TASK_HISTORY.md`。
