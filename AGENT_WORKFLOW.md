# MyExpenseApp 轻量工程工作流

本项目规模较小，默认由一个 Implementer 会话完成“理解、修改、自审、验证、提交”。只有高风险变更才增加独立 Reviewer，避免 Coder/Reviewer 往返重复读取计划、diff 和 evidence。

## 1. 不变的产品与安全边界

- VND 是唯一持久化币种；越南语默认、简体中文可选、无英语。
- 存款本金不是支出，预计利息不是收入。
- 未经用户明确授权，不部署，不修改线上 Firebase Rules/Auth/数据。
- 不接回 T011/T012；ADR-003 的放弃决定继续有效。
- 真实财务数据、邮箱、UID 不进入测试、截图和文档。
- 不 force push，不覆盖未知工作树改动。

## 2. 风险分级

### 常规变更：单会话完成

包括文案、样式、纯展示组件、局部交互、低风险缺陷和测试维护。

Implementer 负责：

1. 从用户症状或当前任务开始，只读取直接相关的代码、测试和计划段落。
2. 先复现或写失败测试，再做最小修复。
3. 运行定向测试；完成前运行与改动范围匹配的门禁。
4. 检查完整 diff、未知工作树改动和敏感信息。
5. 更新必要文档并提交。无需单独 review 文件或 evidence 文件。

### 高风险变更：增加独立 Reviewer

满足任一条件时使用串行独立审查：

- Firestore Rules、Auth、线上数据格式或数据迁移；
- 金额持久化、结算、跨年账本、日期边界；
- 权限、安全、隐私；
- 大范围架构迁移或难以回滚的变更。

Reviewer 只审查本次 base..head、验收标准和受影响路径，不重复通读整个任务计划。Reviewer 一次列全阻断项；Implementer 修复后，复审只检查新增 diff、原阻断项和受影响回归。Reviewer 不修改业务代码。

## 3. 状态记录

`TASK_STATUS.md` 只保存当前工作与简短历史，不保存聊天摘要、重复命令输出或大段 evidence。

推荐状态：

```text
PLANNED → IMPLEMENTING → VERIFIED → DONE
                     ↘ BLOCKED
```

高风险任务可在 `VERIFIED` 后增加 `READY_FOR_REVIEW → APPROVED`。没有正在执行的计划任务时，可直接按用户当前请求维护项目，不需要虚构新 Task。

只有以下情况创建 `docs/task-reviews/<TASK>-R<n>.md`：

- 高风险独立审查；
- 发布前审计；
- 用户明确要求留存正式审查记录。

## 4. 验证门禁

按改动范围运行，不在每次小修后重复跑全量：

```powershell
# 开发中
npx vitest run <related tests>

# 完成前
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

涉及 Firestore Rules 或存款仓储时再运行：

```powershell
npm run test:rules
```

`test:rules` 必须固定使用模拟项目 `demo-no-project`，不得读取本机 Firebase 登录态。已知大于 500 kB 的 bundle 警告应如实记录，但不冒充构建失败。

## 5. 上下文与 Token 控制

- 每次只读取当前症状、相关模块、测试和必要计划段落。
- 不把已有 evidence 或 TASK_STATUS 当作实现正确的证明；以代码、diff 和新鲜测试为准。
- 不在 Coder 与 Reviewer 间复制完整聊天、完整计划或全量日志。
- 常规任务不创建 Reviewer 会话；高风险任务最多一个实现会话和一个审查会话。
- 返修复审不重读不相关文件，不重复运行已被改动范围排除的门禁。
- 文档记录命令、结果和关键结论，不记录未经测量的 Token 节省比例。

## 6. 会话启动模板

常规实现：

```text
按 AGENTS.md 与 AGENT_WORKFLOW.md 处理用户当前请求。保护现有工作树。
从实际症状和相关实现路径开始，先复现/写失败测试，再最小修复。
运行相关门禁，检查完整 diff，更新必要文档并提交；不自行部署。
```

高风险 Reviewer：

```text
独立审查 TASK_STATUS.md 指向的高风险变更。核对 base..head 完整 diff、
验收标准、真实调用路径与相关测试；一次列全阻断项。
只写审查结论和状态，不修改业务代码，不部署。
```
