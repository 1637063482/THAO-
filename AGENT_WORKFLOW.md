# Coder–Terra 交付工作流

## 1. 目标

本流程用仓库文件代替人工复制聊天结论。Git commit、`TASK_STATUS.md`、evidence 和 review 文件共同构成唯一交接事实源。

推荐模型：

| 角色 | 默认模型 | 默认思考强度 | 提升条件 |
|---|---|---|---|
| Coder | DeepSeek V4 Flash | 使用产品提供的最高可用思考档；若没有思考档则按默认 | 不得在 evidence 中虚构不存在的推理档位；复杂任务依靠更细 Task 和门禁控制 |
| Reviewer | GPT-5.6 Terra | High | P0、跨年/并发/安全或第二轮仍有争议时使用 Extra High |

使用 Standard speed。每个 Task 使用独立或清理过的线程。每轮必须读取精简状态，但不再默认读取完整计划和本文件。

默认入口：

```powershell
npm run context:coder     # Coder
npm run context:reviewer  # Reviewer
```

两个命令的输出已经包含 `docs/CODEX_CONTEXT.md` 与 `TASK_STATUS.md`，不得在正常回合预先重复打开。

只有 context 命令报错、状态/Task 缺失、规则冲突、计划变更或安全边界不清时，才读取本文件、完整 `TASK_PLAN.md`、`REVIEW_PLAN.md`、`docs/AGENTS_FULL.md` 或 `docs/TASK_HISTORY.md`。本文件保留完整解释和故障恢复流程，不属于正常回合的默认输入。

## 2. 唯一状态机

允许状态：

```text
PLANNED
  -> IMPLEMENTING
  -> READY_FOR_REVIEW
  -> APPROVED
  -> 下一个 Task 的 PLANNED

READY_FOR_REVIEW
  -> CHANGES_REQUESTED
  -> IMPLEMENTING
  -> READY_FOR_REVIEW

READY_FOR_REVIEW
  -> BLOCKED
```

状态权限：

| 状态变化 | 唯一允许角色 |
|---|---|
| `PLANNED -> IMPLEMENTING` | Coder |
| `CHANGES_REQUESTED -> IMPLEMENTING` | Coder |
| `IMPLEMENTING -> READY_FOR_REVIEW` | Coder |
| `READY_FOR_REVIEW -> APPROVED` | Reviewer |
| `READY_FOR_REVIEW -> CHANGES_REQUESTED` | Reviewer |
| `READY_FOR_REVIEW -> BLOCKED` | Reviewer |
| `APPROVED -> 下一 Task PLANNED` | 下一次启动的 Coder，按 `TASK_PLAN.md` 固定顺序执行 |

任何角色发现状态不允许自己行动时必须停止，不得越权推进。

## 3. 仓库交接物

### 3.1 `TASK_STATUS.md`

保存当前 Task、状态、基线、实现提交、审查轮次、review 文件和下一 Task。每次角色提交必须同步更新。

### 3.2 Coder evidence

路径：`docs/review-evidence/<TASK>_<PHASE>.md`。

至少记录：

- Task ID、base SHA、实现 SHA；
- RED 命令、预期失败、实际失败和退出码；
- GREEN/全量门禁命令、摘要和退出码；
- 修改文件与明确未修改范围；
- 已知警告、限制或与计划的偏差。

不能在包含 evidence 的同一个 commit 内预先写“self-referential SHA”冒充确定提交。允许先写 `pending`，提交后立刻追加一个只修正 evidence SHA 的小提交，并把最终 implementation head 写入状态文件。

### 3.3 Terra review

路径：`docs/task-reviews/<TASK>-R<轮次>.md`。

Reviewer 必须亲自读取 diff、生产代码和测试并运行门禁。review 文件至少包含：

- base SHA、reviewed head、review round；
- `APPROVED`、`CHANGES_REQUESTED` 或 `BLOCKED`；
- 按严重度排序且带文件/行号的 findings；
- Task 完成标准逐项判定；
- 亲自运行的命令、退出码和关键输出；
- 若失败，给出最小返修要求；
- 明确未修改任何业务代码。

Reviewer 只允许修改 review 文件和 `TASK_STATUS.md`，并以独立 commit 提交审查记录。

## 4. Coder 执行循环

Coder 每次启动只执行以下算法：

1. 运行 `npm run context:coder`；其输出包含精简规则、状态和行动 Task，正常时不得预读这些文件或再读完整计划。
2. 执行 `git status --short`，非干净工作树必须先判断来源；不得覆盖未知改动。context 命令失败或输出冲突时才升级读取完整文档。
3. 根据状态行动：
   - `APPROVED`：读取 `TASK_PLAN.md` 的下一 Task，建立 `task/<id>-<slug>` 分支，把状态初始化为 `PLANNED` 后开始。
   - `PLANNED`：转为 `IMPLEMENTING`，执行当前 Task。
   - `CHANGES_REQUESTED`：读取状态指向的最新 review 文件，只修阻断项，转为 `IMPLEMENTING`。
   - `READY_FOR_REVIEW`：停止并提示启动 Terra。
   - `BLOCKED`：停止，列出仓库内记录的阻塞条件。
4. 写失败测试并亲自确认 RED；失败必须来自目标行为，不得来自环境或语法。
5. 写最小生产实现，确认定向 GREEN。
6. 运行 Task 特定测试和通用门禁。
7. 写/更新 evidence。
8. 自审 `git diff`，确认没有越界。
9. 提交代码和 evidence；更新 `TASK_STATUS.md` 为 `READY_FOR_REVIEW`，记录精确 head SHA 和 review round，然后提交状态更新。
10. 停止。不得自动进入下一 Task。

DeepSeek V4 Flash 额外约束：

- 不得重新规划整个 UI 或把多个 UXS Task 合并实施；
- 不得因为模型认为“顺手更合理”而修改当前 Task 之外的文件；
- 视觉 Task 必须保存规定尺寸的合成数据截图或明确记录无法截图的环境限制，不能使用真实账务数据；
- 若 `TASK_PLAN.md`、`UI_SAVINGS_REDESIGN_PLAN.md` 与当前代码存在实质冲突，先写 evidence 的 `Plan conflict` 并停止，不得自行选择解释；
- 完成摘要只写入 evidence 和状态文件，聊天输出不是交接依据。

返修时必须保留旧 review 文件，新增 evidence 或在原 evidence 的 Rework 小节追加证据；不得改写 Reviewer 的历史结论。

## 5. Terra 审查循环

Terra 每次启动只执行以下算法：

1. 运行 `npm run context:reviewer`；该命令提供精简规则、状态、当前 Task、专项标准、evidence 和适用的前轮 review。
2. 只有状态为 `READY_FOR_REVIEW` 才开始；否则停止。
3. 以状态记录的 `base_sha..implementation_head` 为完整审查范围；返修轮还需检查上一 reviewed head 到新 head 的增量。
4. 不能只读 evidence 摘要，必须读实际代码、测试和完整 diff。
5. 亲自运行定向测试、全量测试、typecheck、build、diff check；适用时运行 Rules 测试。
6. 核对任务要求、产品边界、安全、性能、回归、证据真实性和越界修改。
7. 判定：
   - 所有完成标准都有证据且无阻断 finding：`APPROVED`。
   - 存在可由 Coder 修复的问题：`CHANGES_REQUESTED`。
   - 缺少外部信息/权限且无法安全继续：`BLOCKED`。
8. 新建 review 文件并更新 `TASK_STATUS.md`。
9. 只提交 review 文件和状态文件，commit message 使用 `review(<task>): approve`、`review(<task>): request changes` 或 `review(<task>): blocked`。
10. 停止，不修代码，不启动下一 Task。

构建成功不是批准理由。Task 计划要求未满足，即使全部自动测试通过也必须 `CHANGES_REQUESTED`，除非用户先正式修改计划或批准例外。

## 6. 进入下一 Task

只有 `TASK_STATUS.md` 为 `APPROVED` 时，下一次 Coder 才能：

1. 将已批准 Task 追加到状态文件历史表；
2. 按 `TASK_PLAN.md` 顺序选择下一 Task，不得跳号；
3. 以上一个已批准 head 为新 base；
4. 建立新分支；
5. 初始化 review round 为 `1`；
6. 读取新 Task 相关代码后开始 TDD；
7. 完成后再次停在 `READY_FOR_REVIEW`。

`BLOCKED` 不等于失败，也不能跳到下一 Task。必须由用户提供缺失信息或正式调整任务计划。

## 7. 分支与提交

- 一个 Task 一个分支，例如 `task/uxs-004-mobile-dashboard`。
- 一个 Task 可以有多个实现/返修 commit，但不得夹带其他 Task。
- Reviewer 的审查记录 commit 位于同一 Task 分支，作为下一轮的正式输入。
- `CHANGES_REQUESTED` 后 Coder 在同一分支追加修复，不改写历史、不 force push。
- `APPROVED` 后才合并或以该 approved head 作为下一 Task 基线。
- UXS-001～UXS-015 每个 Task 必须使用独立分支；不得把 UI、储蓄目标和存款功能堆进一个长分支。

## 8. 固定启动语句

### 启动 Coder

```text
你是 DeepSeek V4 Flash Coder。运行 npm run context:coder，只按输出处理一个状态动作。命令已包含精简规则与状态，不要重复打开；报错或冲突时才读完整 workflow/plan。完成后提交实现、evidence 和状态，停在 READY_FOR_REVIEW。
```

### 启动 Terra

```text
你是 GPT-5.6 Terra Reviewer。运行 npm run context:reviewer；命令已包含精简规则与状态，不要重复打开。仅在 READY_FOR_REVIEW 时按输出独立审查实际 commit/diff 并亲自运行门禁；禁止修改业务代码。提交 review 与状态后停止。
```

这两条启动语句在所有后续 Task 中保持不变。Task 细节由 context 命令从仓库事实源按需提取，不再嵌入聊天 Prompt，也不再默认加载完整计划。
