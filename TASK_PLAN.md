# MyExpenseApp 施工计划（T001-T021 完成；UXS-001～UXS-015）

> **当前计划入口（2026-07-27）**：T001～T021 与 UXS-001～UXS-015 已结束。本文件以下内容作为历史规格保留；新的整改与模块化任务 REM-001～REM-016 见 `docs/MAINTENANCE_TASK_PLAN_2026-07-27.md`，执行流程以当前 `AGENT_WORKFLOW.md` 为准。

> 产品事实：这是为越南籍女朋友定制的私人账本。她是唯一日常记账者，VND 是唯一账务事实币种；项目所有者使用第二个既有 Firebase 账号查看/维护，CNY 仅为显示换算。应用没有注册、成员管理或多家庭需求。线上账号、Rules 和数据已在 Firebase，未经明确授权不得部署、迁移或改动真实权限。

> 历史任务中关于 Coder/Reviewer、evidence 和 review 文件的要求只记录当时流程，不再自动适用于新任务；当前执行与交接只遵循现行 `AGENT_WORKFLOW.md`、`TASK_STATUS.md` 和新的 REM 计划。

## 已完成 T001–T012 回顾

| Task | 结论 | 处理要求 |
|---|---|---|
| T001 测试/类型基线 | 保留 | 与产品范围无冲突，是后续修 Bug 的必要门禁。 |
| T002 `safeEval` 特征测试 | 保留 | 锁定 legacy 金额公式行为，不代表鼓励继续扩展公式存储。 |
| T003 XSS 修复 | 保留 | 私人应用仍会同步备注和导入数据，安全边界有效。 |
| T004 同步状态修复 | 保留 | Firebase 云同步是核心链路。 |
| T005 CSV 修复 | 保留 | 数据可携带与公式注入防护仍必要。 |
| T006 JSON 导入校验 | 保留，但仍需备份/预览 | 当前只解决格式与安全，覆盖式导入仍是高风险。 |
| T007 Rules/Emulator 基线 | 条件保留 | 仓库 Rules 只是候选规则，不等于线上配置；不得部署。测试需从“双账号同权”改为“按线上权限契约验证”。 |
| T008 Money 定点模型 | 保留、缩小范围 | VND 整数能力正确；CNY/JPY 只作为库能力，当前产品不得据此引入多币事实账。 |
| T009 单账本边界 | 修改文档后保留 | 保留“唯一账本/无 Household”，删除“双人同权记账”假设；女朋友主记账，第二账号权限以线上 Rules 为准。 |
| T010 移除注册入口 | 保留 | 完全符合最新信息；Rules 测试中的两个账号同权假设需在 T017 核对。 |
| T011 Account 模型/repository | T019 选择 A，移出主线 | 未接入 UI/线上路径；不得继续接线。后续只能在单独 cleanup task 中删除或隔离，除非新的 owner-approved ADR 重新批准 VND-only 设计。 |
| T012 Transaction 模型 | T019 选择 A，移出主线 | 未接入运行路径；不得默认进入 Transaction repository 或迁移。原币/FX snapshot 不符合当前 VND-only 产品边界。 |

结论：T001–T010 不需要回滚；T009/T010 文档语义已修正。ADR-003 已选择稳定 legacy 年度矩阵，T011/T012 从施工主线移除；后续只能删除/隔离，或在新的 owner-approved ADR 后重新设计为 VND-only。

## Task 013：用失败测试复现连续记账长期为 1 天

- Task ID: T013
- 目标: 把用户已观察到的 streak 故障固化为可重复测试，并明确当前两个事实源的冲突。
- 修改文件: `tests/unit/legacy-streak.test.js`（新建）、`src/js/render.js`（仅导出/抽取测试入口，不改变行为）、`docs/review-evidence/T013_RED.md`（新建）
- 涉及模块: Legacy streak、日期
- 详细步骤: 先记录当前基线门禁；注入 clock；构造连续两天 entries（覆盖收入、支出及二者混合）、云端 settings 与 localStorage 不一致、直接编辑、快速记账、历史补录场景；运行定向测试并确认失败原因分别命中“未触发”和“状态源不一致”；把命令、完整输出、退出码、预期失败断言及基线 commit 写入 `docs/review-evidence/T013_RED.md`。
- 禁止修改: Firestore 数据、奖励阈值、UI 文案、T011/T012。
- 完成标准: RED 输出能稳定证明连续两天仍得不到 2，且不是测试环境/时区错误。
- 测试要求: 修改前先证明 `npm test -- --run`、`npm run typecheck`、`npm run build` 通过；修改后 `npm test -- --run tests/unit/legacy-streak.test.js` 必须因 streak 行为断言失败，而不是导入、语法、环境或时区错误。T013 的失败测试提交只允许留在 `fix/streak-t013-t014` 分支，禁止单独合并到 `main`。

## Task 014：从 legacy entries 派生连续记账并修复奖励

- Task ID: T014
- 目标: 直接编辑和快速记账都得到相同连续天数，连续 7/30 天奖励准确且不重复。
- 修改文件: `src/js/streak.js`（新建）、`src/js/render.js`、`src/js/main.js`、`src/js/quick-add.js`、`tests/unit/legacy-streak.test.js`、`docs/review-evidence/T014_GREEN.md`（新建）
- 涉及模块: Streak、Gamification、Legacy entries
- 详细步骤: 实现纯函数 `buildLegacyStreak(entries, year, today, timezone)`；从可计算且非零的收入和支出 entries 提取日期并去重；从越南本地 today 向前连续计算；所有收入/支出录入、删除和远端快照后统一重算；里程碑事件按日期+阈值去重；旧 `expense_streak/expense_last_date` 只读兼容且停止作为计算依据。
- 禁止修改: 删除旧云端 settings、生产数据、烟花视觉、交易新模型。
- 完成标准: 收入、支出或混合记录均可形成连续天数；连续两天=2；连续七天触发一次 7 天奖励；当天多笔不重复；断一天后从 1 开始；直接/快速入口一致。
- 测试要求: RED→GREEN；覆盖纯收入、纯支出、收入支出混合、1/2/6/7/8/29/30/31 天、同日多笔、昨天缺口、历史补录、删除当天唯一有效记录、非法公式、跨年边界；在 `docs/review-evidence/T014_GREEN.md` 记录 T013 RED commit、T014 GREEN commit、定向测试和全量门禁的完整命令、摘要及退出码。

## Task 015：修复 PWA 跨午夜日期陈旧

- Task ID: T015
- 目标: 应用跨过越南午夜后，今日日期、快速记账默认日和 streak 自动刷新。
- 修改文件: `src/js/clock.js`（新建）、`src/js/config.js`、`src/js/quick-add.js`、`src/js/render.js`、`src/js/main.js`、`tests/unit/local-date.test.js`（新建）
- 涉及模块: Clock、时区、PWA 生命周期
- 详细步骤: 以 `Asia/Ho_Chi_Minh` 计算本地日期；移除模块加载时固定 TODAY 的业务依赖；`visibilitychange`/重新聚焦时检测日期边界并刷新。
- 禁止修改: 用户设备时区、Firestore 时间、历史 entries。
- 完成标准: 不刷新页面跨午夜也切换到正确日期；月末/年末正确。
- 测试要求: 越南午夜前后、中国/越南设备时区、闰年、月末、年末 fake clock。

## Task 016：锁定 VND 事实与 CNY 只读展示

- Task ID: T016
- 目标: 切换 CNY 查看绝不改变 Firestore 待写或已存 VND 值。
- 修改文件: `tests/unit/currency-view.test.js`（新建）、`src/js/currency-view.js`（新建）、`src/js/main.js`、`src/js/quick-add.js`
- 涉及模块: Currency ViewModel、Legacy entries
- 详细步骤: 抽取 VND→CNY 格式化纯函数；所有输入保存契约明确为 VND；若保留 CNY 输入，必须先经单一转换边界写 VND；测试切换前后 state/pendingUpdates 深度相等。
- 禁止修改: 历史云端金额、引入多基准币、T012 FX snapshot、汇率供应商。
- 完成标准: CNY 切换只改变 DOM/ViewModel；VND round-trip 无漂移。
- 测试要求: 大额/零/小数显示、反复切换 100 次、手动/自动汇率、pending 数据不变。

## Task 017：核对线上 Firebase 权限契约

- Task ID: T017
- 目标: 让仓库 Rules 测试与项目所有者已经配置的线上规则语义一致。
- 修改文件: `docs/firebase-access-contract.md`、`tests/rules/legacy-ledger.rules.test.js`、`firestore.rules`（仅候选规则；是否修改取决于核对结果）
- 涉及模块: Firebase Auth/Rules
- 详细步骤: 由项目所有者提供/确认当前线上 Rules；记录女朋友账号与项目所有者账号分别需要 read/write 哪些路径；Emulator 使用假 UID 重现同一权限；第三 UID 和匿名拒绝。
- 禁止修改: 真实 UID、Firebase Auth 账号、线上 Rules、生产数据、客户端角色 UI。
- 完成标准: 文档明确两个账号各自权限，测试不再无依据假设同权；若没有线上 Rules 内容，只能标记 BLOCKED。
- 测试要求: 每个 allow 有对应 deny；直接 SDK 覆盖 read/create/update/delete。

## Task 018：为覆盖式导入增加恢复点

- Task ID: T018
- 目标: 导入 JSON 前可恢复当前年度账本。
- 修改文件: `src/js/sync.js`、`src/js/import-schema.js`、`tests/unit/import-backup.test.js`（新建）、`IMPORT_RECOVERY.md`（新建）
- 涉及模块: Import、Backup
- 详细步骤: 写入前读取当前快照并生成本地下载备份及哈希；只有备份成功才允许覆盖；失败保持原数据；记录恢复流程。
- 禁止修改: 自动写生产备份集合、真实数据、导入 schema 之外的重构。
- 完成标准: 取消/备份失败/写失败均不破坏原账；恢复文件可通过现有 schema。
- 测试要求: 四个终态、哈希一致、无敏感日志、重复操作。

## Task 019：决定 T011/T012 去留并形成 ADR

- Task ID: T019
- 目标: 基于真实需求决定冻结代码是改为 VND-only 继续，还是删除并保持 legacy 矩阵。
- 修改文件: `docs/adr/003-account-transaction-scope.md`（新建）、`ARCHITECTURE_PLAN.md`、`TASK_PLAN.md`
- 涉及模块: Product/Architecture
- 详细步骤: 比较方案 A“修稳现有矩阵”和方案 B“迁移独立交易”的用户价值、迁移风险、维护成本；列出 T011/T012 可复用与必须删除字段；由项目所有者选定后再排施工。
- 禁止修改: 业务代码、Firestore schema、生产数据。
- 完成标准: ADR 明确选项、依据、后果和后续 Task；项目所有者已选择方案 A，不得默认继续 Transaction repository。
- 测试要求: 文档一致性检查；无代码测试要求。

## Task 020：汇率显示 adapter 可靠性

- Task ID: T020
- 目标: CNY 辅助显示在汇率服务慢/坏时可理解地降级，不影响 VND 记账。
- 修改文件: `src/js/fx-display.js`（新建）、`src/js/auth.js`、`tests/unit/fx-display.test.js`（新建）
- 涉及模块: FX Display
- 详细步骤: 加超时、响应校验、最后有效缓存、来源与更新时间；失败继续显示 VND，不写入 0 或改动 entries。
- 禁止修改: 历史金额、第三方供应商、交易事实模型。
- 完成标准: FX 完全不可用时 VND 记账仍正常；CNY 显示明确为不可用/缓存值。
- 测试要求: timeout、HTTP 错误、畸形 JSON、cache hit/stale、VND 写入不变。

## Task 021：建立 CI 门禁

- Task ID: T021
- 目标: 每次提交自动验证普通测试、类型、Rules 和构建。
- 修改文件: `.github/workflows/ci.yml`（新建）、`package.json`、`SECURITY.md`（新建）
- 涉及模块: CI、Release
- 详细步骤: 固定 Node LTS/JDK；`npm ci`；test/typecheck/test:rules/build；不自动部署；失败日志不含财务数据或真实 UID。
- 禁止修改: 生产凭证、自动部署、线上 Rules。
- 完成标准: 任一门禁失败阻断；Windows 本地与 CI 命令语义一致。
- 测试要求: 保存一次红→绿运行证据；所有退出码明确。

## T013-T021 完成结论

T013-T021 均已通过独立审查。T019/ADR-003 已选择稳定 legacy 年度矩阵并移出 T011/T012 主线。以下 UXS 任务必须继续遵守该结论；任何任务都不得部署 Cloudflare/Firebase、修改线上 Rules/Auth 或迁移真实数据，除非用户另行明确授权。

## OPS-001：降低 Agent 重复上下文 Token

- Task ID: OPS-001
- 目标: 将默认读取从完整 workflow/plan/review 文档改为精简上下文与当前 Task 自动提取，同时保留完整规则供异常时按需读取。
- 前置条件/基线: UXS-005 R4 APPROVED；批准 review commit `4c39dd0`；UXS-006 尚未开始。
- 修改文件: `AGENTS.md`、`AGENT_WORKFLOW.md`、`TASK_PLAN.md`、`REVIEW_PLAN.md`、`TASK_STATUS.md`、`package.json`、`docs/CODEX_CONTEXT.md`（新建）、`docs/AGENTS_FULL.md`（新建）、`docs/TASK_HISTORY.md`（新建）、`scripts/task-context.mjs`（新建）、`tests/unit/task-context.test.js`（新建）、`docs/review-evidence/OPS-001.md`（新建）。
- 涉及模块: Agent context loading、workflow state machine、documentation tooling。
- 详细步骤:
  1. RED 验证当前不存在 `context:coder/context:reviewer`，且无法只提取当前/下一 Task。
  2. 将详细 AGENTS 内容归档到 `docs/AGENTS_FULL.md`，把自动注入的 `AGENTS.md` 缩为只含入口、不可违反的安全边界和异常升级条件。
  3. 创建 `docs/CODEX_CONTEXT.md`，集中稳定产品事实、状态动作、禁止事项、门禁和提交规范；其内容为默认绑定规则。
  4. 创建 `scripts/task-context.mjs`：解析 `TASK_STATUS.md`，Coder 根据状态输出当前或下一 Task；Reviewer 只在 `READY_FOR_REVIEW` 输出审查包；按需包含最新 review/evidence，不输出无关 Task。
  5. 添加两个 npm scripts，并用纯函数测试覆盖 PLANNED、APPROVED、CHANGES_REQUESTED、READY_FOR_REVIEW、非法状态/角色和 Task 缺失。
  6. 将历史表移到 `docs/TASK_HISTORY.md`，让 `TASK_STATUS.md` 只保存当前状态；更新完整 workflow 为“默认运行上下文命令，异常时才读全文”。
  7. 比较优化前后默认字符数并记录 evidence。
- 禁止修改: 业务代码、UI、Firebase/Cloudflare 配置、线上资源、全局 `engineering-workflow` Skill、UXS-006 实现。
- 完成标准: 默认 Coder/Reviewer 不需要读取完整 `AGENT_WORKFLOW.md`、`TASK_PLAN.md`、`REVIEW_PLAN.md`；命令只输出行动所需片段；详细规则仍可追溯；无关 Task 不进入输出。
- 测试要求: `npm test -- --run tests/unit/task-context.test.js`；实际运行两个 context 命令；通用门禁；记录输出字符数与降幅。
- Evidence: `docs/review-evidence/OPS-001.md`。
- 建议提交: `chore: add token-efficient agent context loader`。

## BUG-LOGIN-001：登录后初始账本加载失败时退出加载遮罩

- Task ID: BUG-LOGIN-001
- 目标: Firebase 登录成功但首个 Firestore snapshot 失败时，应用必须退出全屏加载状态并显示同步错误，而不是永久卡住。
- 前置条件/基线: UXS-010 APPROVED；用户已在真实 PWA 观察到点击登录后长期停留在加载界面。
- 修改文件: `src/js/sync.js`、`tests/unit/sync-state.test.js`、`TASK_PLAN.md`、`REVIEW_PLAN.md`、`TASK_STATUS.md`、`docs/TASK_HISTORY.md`、`docs/review-evidence/BUG-LOGIN-001.md`（新建）。
- 涉及模块: Firebase Auth handoff、Firestore snapshot、loading overlay、sync status。
- 详细步骤:
  1. RED 模拟登录后的首个当前年度 snapshot error，证明 loading overlay 保持显示且 `isFirstLoad` 不结束。
  2. 抽取首载结束函数，让 snapshot success/error 都清理 loading overlay 和 `isFirstLoad`；error 继续保留同步错误状态。
  3. 验证 snapshot success、error、重复 listener 均不会留下遮罩或伪报 synced。
  4. 运行全量门禁并记录已知构建警告。
- 禁止修改: Firebase 线上 Rules/Auth、真实账号/数据、登录凭证、业务账务、存款实现、UXS-011。
- 完成标准: 登录成功后的 Firestore read error 不会永久遮挡 UI；失败仍明确显示 offline/error；成功路径行为不回退。
- 测试要求: 定向 sync/auth 测试；全量门禁；不需要 Rules 测试。
- Evidence: `docs/review-evidence/BUG-LOGIN-001.md`。
- 建议提交: `fix: release loading overlay on ledger read failure`。

## BUG-LOGIN-002：本地登录后渲染异常与无响应等待不得永久阻塞应用

- Task ID: BUG-LOGIN-002
- 目标: 修复 `http://localhost:3000/` 登录成功、Firestore 快照已返回后仍永久显示加载遮罩的问题，并为 Auth/Firestore 无响应增加有限等待兜底。
- 前置条件/基线: BUG-LOGIN-001 APPROVED；本地运行现场可稳定观察到储蓄目标渲染抛出非整数 VND `DomainError`，异常发生在首次加载完成调用之前。
- 修改文件: `src/js/auth.js`、`src/js/sync.js`、`src/js/savings-view.js`、`src/locales/vi.js`、`src/locales/zh-CN.js`、对应 unit tests、`BUG_REPORT.md`、工作流状态/evidence/review 文档。
- 涉及模块: Firebase Auth handoff、Firestore snapshot、Savings ViewModel、loading overlay、vi/zh 错误恢复。
- 详细步骤:
  1. RED 覆盖派生金额含小数、快照渲染抛错、Auth promise 永不结束、Firestore 首次监听永不回调四条路径。
  2. 在 Savings ViewModel 边界按 VND 最小单位舍入派生汇总，不放宽领域层 safe-integer 规则，也不改写云端原始账务。
  3. 快照 UI 刷新使用 `try/catch/finally`，任何子模块异常都必须退出首载遮罩且不得伪报 synced。
  4. Auth 和首次账本监听增加 15 秒 UI 恢复守卫；成功、失败、登出和 teardown 均清理 timer。
  5. 在干净 localhost 标签页重新走认证恢复与真实快照读取，只记录非敏感 DOM 状态和控制台错误计数。
- 禁止修改: Firebase 线上 Rules/Auth、真实账号/数据、登录凭证、存款实现、VND 领域精度规则、Cloudflare 部署。
- 完成标准: localhost 登录恢复后加载遮罩隐藏、认证遮罩隐藏、同步状态正常；渲染异常或后端无响应时也能退出无限等待并给出 vi/zh 提示。
- 测试要求: 定向 auth/sync/savings tests；全量 unit/typecheck/build/diff；localhost 干净标签页运行复验。
- Evidence: `docs/review-evidence/BUG-LOGIN-002.md`。
- 建议提交: `fix: recover local login initialization`。

## UXS 通用施工约束

- 执行 Coder：DeepSeek V4 Flash；Reviewer：GPT-5.6 Terra。两者严格串行。
- 每次只执行 `TASK_STATUS.md` 的当前 Task；一个 Task、一个分支、一个实现提交、一个 evidence 文件。
- 每个 Task 先写能够因目标行为缺失而失败的测试或检查（RED），再实现并记录 GREEN。纯文档任务使用可重复的 `rg`/一致性检查作为 RED。
- 全量门禁：`npm test -- --run`、`npm run typecheck`、`npm run build`、`git diff --check`；修改 `firestore.rules` 的 Task 额外运行 `npm run test:rules`。
- UI Task 使用合成财务数据验证，不得把真实邮箱、UID、余额、存款或银行信息写入截图、fixture、日志和 evidence。
- 响应式最低矩阵：手机 360×800、390×844、430×932；平板 768×1024；桌面 1440×900、1920×1080。Task 仅需验证与其界面有关的尺寸，但 UXS-015 必须全覆盖。
- 越南语默认、中文可切换、无英语入口；VND 是唯一持久化账务币种，CNY 只读换算。
- UI 视觉采用 Apple Warm：暖白背景、杏橙主强调、系统字体、轻层级、克制动效、清晰焦点与 safe-area 支持。

## UXS-001：固化 UI、储蓄与存款架构边界

- Task ID: UXS-001
- 目标: 将已确认的 PWA、双语、首页、储蓄目标、存款及应用内提醒决策固化为后续施工的唯一产品/架构合同。
- 前置条件/基线: T021 APPROVED；T019/ADR-003 为 Accepted，legacy `entries` 是账务事实源。
- 修改文件: `UI_SAVINGS_REDESIGN_PLAN.md`、`PRD.md`、`FRD.md`、`ARCHITECTURE_PLAN.md`、`docs/adr/004-ui-savings-boundary.md`（新建）、`docs/review-evidence/UXS-001.md`（新建）。
- 涉及模块: Product、Architecture、PWA、i18n、Savings、Deposits。
- 业务/架构规则: 月/年目标存入对应 `shared_ledger_<year>.settings`；存款使用 `shared_ledger_savings` 固定文档；移动日视图由 legacy 单元格派生；提醒只在应用打开/恢复时发生。
- 详细步骤:
  1. 用 `rg` 记录文档中仍存在的“等待 T019”“Transaction 迁移”“英语界面”“外部通知”冲突作为 RED。
  2. 写 ADR-004，明确上下文、决策、数据边界、备选方案、后果、非目标和未来变更需 owner-approved ADR。
  3. 统一 PRD/FRD/架构文档中的术语、字段、公式、提醒生命周期、PWA 和隐私要求。
  4. 在 evidence 记录 Base SHA、RED/GREEN 命令、匹配摘要及退出码。
- 禁止修改: 生产代码、测试、Firebase/Cloudflare 配置、线上资源、T011/T012。
- 完成标准: 五份文档对语言、币种、事实源、目标 key、存款文档、提醒和非目标无冲突；ADR 状态为 Accepted。
- 测试要求: 定向 `rg` 一致性检查；`git diff --check`；全量门禁可记录为无代码变更基线。
- Evidence: `docs/review-evidence/UXS-001.md`。
- 建议提交: `docs: define UI savings architecture boundary`。

## UXS-002：建立越南语默认的完整 i18n 基线

- Task ID: UXS-002
- 目标: 所有当前可达静态/动态用户文案由字典提供，默认越南语，可切换简体中文，不提供英语入口。
- 修改文件: `src/js/i18n.js`（新建）、`src/locales/vi.js`（新建）、`src/locales/zh-CN.js`（新建）、`index.html`、`src/js/auth.js`、`src/js/budget.js`、`src/js/charts.js`、`src/js/config.js`、`src/js/fireworks.js`（仅新增越南语弹幕）、`src/js/main.js`、`src/js/quick-add.js`、`src/js/render.js`、`src/js/sync.js`、`tests/unit/i18n.test.js`（新建）、`tests/unit/legacy-streak.test.js`（仅语言兼容性正则）、`tests/unit/local-date.test.js`（仅语言兼容性断言）、`tests/unit/currency-view.test.js`（仅预期 toast 文案适配）、`tests/unit/budget-heading-i18n.test.js`（新建，预算标题渲染与切换验证）、`docs/review-evidence/UXS-002.md`。
- 涉及模块: UI 文案、locale persistence、HTML language metadata、烟花弹幕。
- 详细步骤:
  1. RED 覆盖默认 locale、缺键回退、插值、`document.lang`、切换持久化和切换前后 `appState/pendingUpdates` 深度相等。
  2. 建立稳定 message key；分类/状态使用 key 映射，不把越南语文本当数据值。
  3. 替换所有可达硬编码文案，包括 toast、验证、同步、空态、图表和认证错误；Firebase 原始错误不得直出。`src/js/fireworks.js` 中的烟花弹幕文案保留中文并增加等量越南语，不纳入字典管理。
  4. 语言选择仅含 `vi`/`zh-CN`，首次无偏好默认 `vi`，选择保存在本机显示偏好中。
  5. evidence 列出硬编码扫描结果及门禁退出码。
- 禁止修改: entries/settings schema、金额/日期规则、Firebase 路径、真实数据、设计重构；`src/js/currency-view.js`、`src/js/fx-display.js` 的文案不在本 Task 范围内。
- 完成标准: 允许文件范围内的所有可达文案由字典提供；两种语言无缺键；切换无需刷新且不触发云写；越南语重音正确；无用户可见英语。
- 测试要求: `npm test -- --run tests/unit/i18n.test.js`；扫描可达英文/中文硬编码；全量门禁。
- Evidence: `docs/review-evidence/UXS-002.md`。
- 建议提交: `feat: add Vietnamese-first interface localization`。

## UXS-003：建立 Apple Warm Design Tokens 与响应式 App Shell

- Task ID: UXS-003
- 目标: 建立统一视觉 Token、桌面 Sidebar、移动 Bottom Navigation、PWA safe area 和响应式页面骨架。
- 修改文件: `index.html`、`src/css/app.css`、`src/js/navigation.js`（新建）、`src/js/main.js`、`tests/unit/navigation.test.js`（新建）、`tests/unit/app-shell.test.js`（新建）、`docs/review-evidence/UXS-003.md`。
- 涉及模块: Layout、Navigation、Design Tokens、Accessibility。
- 详细步骤:
  1. RED 锁定 5 个导航目的地、单一 active 状态、键盘导航、viewport/safe-area 和宽度切换语义。
  2. 定义颜色、间距、圆角、阴影、字号、触控尺寸、焦点和动效 Token；正文保持高对比。
  3. `<768px` 使用底部导航和中央快速记账入口；`>=768px` 使用侧栏；不得同时暴露两套可聚焦导航。
  4. 保留现有业务 DOM id/事件入口，页面切换不得重置 state、年份、locale 或 pendingUpdates。
  5. 使用合成数据截图验证 360/390/430/768/1440/1920；记录横向溢出、焦点、reduced-motion 和 standalone 结果。
- 禁止修改: 预算/记账/同步计算、Firestore、业务 schema、功能文案范围外逻辑。
- 完成标准: 无页面级横向滚动；底部导航不遮挡内容；键盘与屏幕阅读器可识别；现有功能仍可达。
- 测试要求: 定向 unit；六尺寸视觉 evidence；全量门禁。
- Evidence: `docs/review-evidence/UXS-003.md`（截图存 `docs/review-evidence/assets/UXS-003/`）。
- 建议提交: `feat: establish Apple Warm responsive app shell`。

## UXS-004：重构首页消费认知区

- Task ID: UXS-004
- 目标: 首页首先回答“本月预算还剩多少、今天/本月花了多少、钱花到哪里”，同时保留习惯激励入口。
- 修改文件: `src/js/dashboard-view-model.js`（新建）、`src/js/dashboard.js`（新建）、`src/js/main.js`、`index.html`、`src/css/app.css`、`tests/unit/dashboard-view-model.test.js`（新建）、`tests/unit/dashboard.test.js`（新建）、`docs/review-evidence/UXS-004.md`。
- 涉及模块: Dashboard、Budget、Category aggregation、Streak。
- 详细步骤:
  1. RED 覆盖预算剩余、超支、今日支出、本月支出、收入、前三分类、连续天数、无数据和大额 VND。
  2. ViewModel 只读取现有 balances/entries/settings 和已验证派生函数；不得复制金额/日期/streak 规则。
  3. Hero 最大数字显示“本月可花余额”，超支时明确负值；随后显示预算进度、支出去向、今日摘要、streak 和最近记账日聚合。
  4. “最近记录”必须标注为按日/分类汇总，不能称为逐笔交易。
  5. 验证 360/390/430/768/1440/1920 的信息优先级、长越南语和隐私遮罩。
- 禁止修改: 预算口径、legacy entries schema、真实账务、储蓄/存款持久化。
- 完成标准: 每个数字能追溯到事实源；无目标功能用空态/占位而非假数据；手机首屏看见 hero 与快速记账入口。
- 测试要求: 定向 unit/render、六尺寸截图、全量门禁。
- Evidence: `docs/review-evidence/UXS-004.md`。
- 建议提交: `feat: redesign spending awareness dashboard`。

## UXS-005：实现快速记账 Bottom Sheet

- Task ID: UXS-005
- 目标: 手机端以 Bottom Sheet 在 10 秒内完成收入或支出录入，桌面端保持可用弹层。
- 修改文件: `index.html`、`src/css/app.css`、`src/js/quick-add.js`、`src/js/main.js`、`tests/unit/quick-add-sheet.test.js`（新建）、现有 quick-add/currency/streak/local-date 测试、`docs/review-evidence/UXS-005.md`。
- 涉及模块: Quick Add、Keyboard、Validation、Legacy writer。
- 详细步骤:
  1. RED 覆盖收入/支出切换、VND 输入、分类、越南业务日、备注、焦点陷阱、Escape/遮罩关闭和保存失败保留输入。
  2. 复用现有 legacy 写入、同步、streak 与 VND 契约，不建立 transaction 对象。
  3. 主路径只展示必要字段；高级字段渐进展开；保存中禁止重复提交，成功后才清空并关闭。
  4. 移动键盘不得遮挡主按钮；Bottom Sheet 支持 safe area，桌面表现为居中 sheet/dialog。
  5. 验证离线/排队/失败/成功状态和 vi/zh 文案。
- 禁止修改: streak 算法、同步状态机、金额事实、Firestore schema、完整表格编辑。
- 完成标准: 收入和支出都计有效记账；重复点击不产生重复写；失败数据不丢失；可完全键盘操作。
- 测试要求: 定向 unit + 390/430/1440 截图；全量门禁。
- Evidence: `docs/review-evidence/UXS-005.md`。
- 建议提交: `feat: add responsive quick-entry bottom sheet`。

## UXS-006：实现手机按日账本与完整表格切换

- Task ID: UXS-006
- 目标: 手机默认显示易读的按日/分类账本，同时保留现有完整年度表格的查看和编辑能力。
- 修改文件: `src/js/day-ledger.js`（新建）、`src/js/render.js`、`src/js/main.js`、`index.html`、`src/css/app.css`、`tests/unit/day-ledger.test.js`（新建）、`tests/unit/ledger-view-toggle.test.js`（新建）、`docs/review-evidence/UXS-006.md`。
- 涉及模块: Legacy Matrix、Derived daily view、Editable table。
- 详细步骤:
  1. RED 固定 entries 单元格到日期/分类汇总的无损映射、收入/支出、空日、备注和视图切换状态。
  2. 日视图必须保留源 key 引用；编辑仍写回同一个 legacy cell，禁止合成不可追踪的逐笔 ID。
  3. 手机默认按日卡片；提供明确入口打开完整表格；桌面默认完整表格并可切换。
  4. 完整表格保持所有现有编辑能力，窄屏使用局部横向滚动和固定标题，不造成页面级溢出。
  5. 验证直接编辑、快速记账、远端快照后三种入口在两视图一致。
- 禁止修改: legacy key/schema、生成伪 transaction、同步协议、金额规则。
- 完成标准: 两视图指向同一事实；切换不丢未保存输入；完整表格功能零回退。
- 测试要求: 定向 unit/render + 360/390/768/1440 和横屏截图；全量门禁。
- Evidence: `docs/review-evidence/UXS-006.md`。
- 建议提交: `feat: add derived daily ledger view`。

## UXS-007：实现储蓄目标领域纯函数

- Task ID: UXS-007
- 目标: 定义月度/年度目标、实际储蓄和进度的唯一可测试规则。
- 修改文件: `src/domain/savings-goal.ts`（新建）、`tests/unit/domain/savings-goal.test.ts`（新建）、`docs/review-evidence/UXS-007.md`。
- 涉及模块: Domain、Money、Period aggregation。
- 详细步骤:
  1. RED 覆盖 `actual = income - expense`、月/年独立、0/负/超额目标、无目标、safe integer 和越南年月边界。
  2. 所有持久/计算金额为 VND 整数；比例只为展示派生值，定义统一夹取和格式化规则。
  3. 存款本金和预计利息不进入实际储蓄；已确认且写入 legacy income 的实际利息自然计入。
  4. 纯函数不得访问 DOM、Firebase、localStorage、clock 全局或 CNY adapter。
- 禁止修改: UI、Firestore、legacy entries、T011/T012。
- 完成标准: 规则有命名类型和错误结果；输入不被改变；边界无 NaN/Infinity/浮点持久化。
- 测试要求: 定向 domain test；全量门禁。
- Evidence: `docs/review-evidence/UXS-007.md`。
- 建议提交: `feat: define savings goal domain rules`。

## UXS-008：持久化月度与年度储蓄目标

- Task ID: UXS-008
- 目标: 在现有年度文档 `settings` 中安全保存可调整的 12 个月目标和年度目标。
- 修改文件: `src/js/savings-goal-store.js`（新建）、`src/js/import-schema.js`、`src/js/state.js`（仅必要默认值）、`src/js/sync.js`（仅复用待写机制所需）、`tests/unit/savings-goal-store.test.js`（新建）、`tests/unit/import-schema.test.js`、`docs/review-evidence/UXS-008.md`。
- 涉及模块: Annual settings、Import validation、Sync adapter。
- 详细步骤:
  1. RED 覆盖 `savings_goal_month_1..12`、`savings_goal_annual` 的读取、写入、清空、非法值、切年和旧快照。
  2. 复用当前年度文档与 pending/sync 状态；不得建立 goals collection 或修改 Rules。
  3. runtime/import schema 仅接受 safe VND integer 或明确空值；未知/畸形字段拒绝或按既定 schema 策略处理。
  4. CNY 视图和语言切换不得改变目标值或触发写入。
  5. 证明旧年度文档没有新 key 时仍可正常加载。
- 禁止修改: firestore.rules、线上 Rules、真实数据、目标 UI、Account/Transaction。
- 完成标准: 目标 round-trip、切年隔离、导入恢复兼容、同步失败可重试且不伪成功。
- 测试要求: 定向 store/schema tests；全量门禁。
- Evidence: `docs/review-evidence/UXS-008.md`。
- 建议提交: `feat: persist annual savings goal settings`。

## UXS-009：实现储蓄目标 UI

- Task ID: UXS-009
- 目标: 首页和储蓄页展示月/年目标进度，并允许设置、修改和清空目标。
- 修改文件: `src/js/savings-view.js`（新建）、`src/js/dashboard.js`、`src/js/main.js`、`index.html`、`src/css/app.css`、`tests/unit/savings-view.test.js`（新建）、`docs/review-evidence/UXS-009.md`。
- 涉及模块: Savings page、Dashboard cards、Form states。
- 详细步骤:
  1. RED 覆盖无目标、0、负实际、完成、超额、编辑、清空、同步失败和 vi/zh。
  2. 只调用 UXS-007 规则和 UXS-008 store；UI 不自行计算或拼 settings key。
  3. 首页提供精简进度卡；储蓄页提供当前月、年度、实际值、差额和可调表单。
  4. 保存状态区分 queued/syncing/synced/error；清空须确认；失败保留输入。
  5. 验证隐私遮罩、键盘、长越南语和响应式布局。
- 禁止修改: 目标公式、Firestore 路径、存款功能、真实数据。
- 完成标准: 月/年目标独立可调；历史年份不被静默覆盖；所有状态可理解且可恢复。
- 测试要求: 定向 unit/render + 390/768/1440 截图；全量门禁。
- Evidence: `docs/review-evidence/UXS-009.md`。
- 建议提交: `feat: add adjustable savings goal interface`。

## UXS-010：实现存款领域模型与收益计算

- Task ID: UXS-010
- 目标: 定义 Deposit、状态、利率、预期/实际收益及汇总规则。
- 修改文件: `src/domain/deposit.ts`（新建）、`tests/unit/domain/deposit.test.ts`（新建）、`docs/review-evidence/UXS-010.md`。
- 涉及模块: Domain、Money、Vietnam business dates。
- 详细步骤:
  1. RED 覆盖本金、`annualRatePpm`、起息/到期日、实际天数、闰年、override、舍入、状态转换和总计。
  2. 使用整数/BigInt 中间计算，最终按唯一规则舍入 VND；禁止用 JS 浮点作为持久事实。
  3. 支持 ACTIVE、MATURED、REDEEMED、ROLLED_OVER；MATURING 为当前日期派生状态，不持久化。
  4. 定义预计收益覆盖值、实际收益、当前本金、预计总收益和预计到期总额。
  5. 日期按 `Asia/Ho_Chi_Minh` 的 `YYYY-MM-DD`，非法反向日期和状态转换返回稳定错误。
- 禁止修改: UI、Firebase、legacy entries、外部银行/利率 API。
- 完成标准: 纯领域、输入不可变、无 NaN/Infinity/精度漂移；边界规则可读。
- 测试要求: 定向 domain test；全量门禁。
- Evidence: `docs/review-evidence/UXS-010.md`。
- 建议提交: `feat: define deposit and interest domain model`。

## UXS-011：实现存款固定文档同步与候选 Rules

- Task ID: UXS-011
- 目标: 通过 `shared_ledger_savings` 固定文档安全读写存款和 reminder acknowledgement，并保持现有账本不迁移。
- 修改文件: `src/infrastructure/firebase/deposit-repository.ts`（新建）、`src/js/deposit-sync.js`（新建）、`src/js/deposit-schema.js`（新建）、`src/js/state.js`、`firestore.rules`、`tests/unit/deposit-schema.test.js`（新建）、`tests/integration/deposit-repository.test.ts`（新建）、`tests/rules/deposit.rules.test.js`（新建）、`docs/review-evidence/UXS-011.md`。
- 涉及模块: Firestore adapter、Runtime schema、Rules、Conflict handling。
- 详细步骤:
  1. RED 覆盖空文档、round-trip、非法金额/利率/日期/状态、第三账号、匿名、delete、超大 map 和版本冲突。
  2. repository 固定解析 ADR-004 路径；UI 不接触路径；无文档视为合法空态。
  3. 文档包含 schemaVersion、`depositsById`、`acknowledgementsByKey`；写入做完整 runtime validation、版本检查和服务端审计字段。
  4. 候选 Rules 按 T017 已确认的两个账号契约限制 read/create/update，默认 deny，禁止 delete 和非法字段/类型/尺寸。
  5. 提供可下载的版本化存款 JSON 备份纯函数/入口所需底层数据，但不得自动上传或写真实数据。
  6. 仅运行 Emulator；不得部署 Rules 或初始化线上文档。
- 禁止修改: 线上 Rules/Auth、真实数据、legacy 年度文档、T011/T012、Cloudflare 部署。
- 完成标准: 空态/CRUD/归档/ack/并发可审计；每个 allow 有 deny；旧账本路径行为不变。
- 测试要求: unit/integration；`npm run test:rules`；全量门禁；记录 emulator 退出码。
- Evidence: `docs/review-evidence/UXS-011.md`。
- 建议提交: `feat: add validated deposit storage adapter`。

## UXS-012：实现存款列表、表单与汇总 UI

- Task ID: UXS-012
- 目标: 在储蓄页用手机卡片和桌面表格管理存款，并显示总本金、预计总收益和最近到期。
- 修改文件: `src/js/deposit-view.js`（新建）、`src/js/deposit-form.js`（新建）、`src/js/main.js`、`index.html`、`src/css/app.css`、`tests/unit/deposit-view.test.js`（新建）、`tests/unit/deposit-form.test.js`（新建）、`docs/review-evidence/UXS-012.md`。
- 涉及模块: Savings page、Deposit CRUD UI、Privacy mode。
- 详细步骤:
  1. RED 覆盖空/加载/离线/错误、ACTIVE/MATURED/归档、总额、排序、表单验证和 vi/zh。
  2. 新增/编辑字段严格对应 ADR-004；利率输入在边界转换为 ppm；金额只输入 VND。
  3. 手机显示可扫描卡片，桌面显示完整表格和详情；默认按到期日排序，提供状态筛选。
  4. 显示当前存款总额、预计总收益、预计到期总额；归档/删除语义必须与 repository 一致且需确认。
  5. 隐私模式遮挡所有本金/收益；失败保留表单；同步状态不得伪成功。
- 禁止修改: 利息/汇总领域规则、Firestore 路径、日常账务、真实数据。
- 完成标准: CRUD/归档可恢复；空态指导明确；移动和桌面无功能差异。
- 测试要求: 定向 unit/render + 360/390/430/768/1440/1920 截图；全量门禁。
- Evidence: `docs/review-evidence/UXS-012.md`。
- 建议提交: `feat: add responsive deposit management interface`。

## UXS-013：实现应用内到期提醒引擎

- Task ID: UXS-013
- 目标: 应用打开或恢复时生成当前有效提醒，支持阶段去重、稍后提醒和多笔合并。
- 修改文件: `src/application/deposits/build-reminders.ts`（新建）、`src/js/deposit-reminder-controller.js`（新建）、`src/js/main.js`、`index.html`、`src/css/app.css`、`tests/unit/application/build-reminders.test.ts`（新建）、`tests/unit/deposit-reminder-controller.test.js`（新建）、`docs/review-evidence/UXS-013.md`。
- 涉及模块: Deposit reminders、PWA lifecycle、Local snooze。
- 详细步骤:
  1. RED 覆盖 D-30/D-7/D-1/D0/OVERDUE、错过阶段、跨午夜、到期日修改、多笔和已处理存款。
  2. 纯函数选择每笔当前最紧迫阶段；不得在重开时连续补弹所有错过阶段。
  3. controller 仅在认证且数据加载完成、`visibilitychange` 恢复、越南日期变化、存款修改或用户进入储蓄页时检查。
  4. acknowledgement 写云端固定文档；`snoozeUntil` 仅存当前设备 localStorage；key 包含 depositId、maturesOn、stage。
  5. 多笔合并为一个可访问 dialog；离线快照提醒必须标注可能不是最新。
- 禁止修改: Notification API、Web Push、Service Worker push、Cloudflare Cron、邮件/短信、后台定时服务。
- 完成标准: 应用未打开时不承诺提醒；同一事件不重复轰炸；逾期持续可见直到处理。
- 测试要求: fake clock/lifecycle unit + 390/1440 弹窗截图；全量门禁。
- Evidence: `docs/review-evidence/UXS-013.md`。
- 建议提交: `feat: add in-app deposit maturity reminders`。

## UXS-014：实现到期赎回、实际利息与续存流程

- Task ID: UXS-014
- 目标: 用户可人工确认赎回或续存，并可选择把实际利息幂等写入日常收入。
- 修改文件: `src/application/deposits/settle-deposit.ts`（新建）、`src/js/deposit-view.js`、`src/js/deposit-form.js`、`src/js/deposit-sync.js`、`src/js/quick-add.js`（仅复用 legacy writer 所需）、`tests/unit/application/settle-deposit.test.ts`（新建）、`tests/unit/deposit-settlement.test.js`（新建）、`docs/review-evidence/UXS-014.md`。
- 涉及模块: Deposit lifecycle、Legacy income bridge、Idempotency。
- 详细步骤:
  1. RED 覆盖赎回、续存、实际利息为空/零/正值、重复点击、网络失败、版本冲突和部分成功。
  2. 赎回只改变存款状态并记录实际收益；本金返回不是收入，不写入支出/收入。
  3. 用户二次确认后，实际利息可通过统一 legacy writer 作为收入写入；使用稳定 operationId 防重复。
  4. 续存创建新 depositId 并引用旧记录；旧本金、利率、日期和审计历史不可覆写。
  5. 定义跨文档非原子失败的可恢复顺序和 UI 状态，不能展示虚假完成。
- 禁止修改: 自动赎回、自动续存、把本金算收入、Transaction repository、真实数据。
- 完成标准: 历史可追溯；重复操作幂等；失败可安全重试；收入路径仍触发正确 streak/同步。
- 测试要求: 定向 use-case/integration；重复和失败注入；全量门禁。
- Evidence: `docs/review-evidence/UXS-014.md`。
- 建议提交: `feat: add safe deposit settlement workflow`。

## UXS-015：完成 PWA、视觉、无障碍与回归验收

- Task ID: UXS-015
- 目标: 对完整 UXS 体验做跨尺寸、安装模式、离线、更新、隐私和无障碍闭环，不增加新产品功能。
- 修改文件: `index.html`、`src/css/app.css`、`manifest.json`、`sw.js`、必要的现有 UI 测试、`tests/unit/pwa-shell.test.js`（新建）、`docs/review-evidence/UXS-015.md`（新建）、`docs/review-evidence/assets/UXS-015/`。
- 涉及模块: PWA shell、Responsive QA、Accessibility、Regression。
- 详细步骤:
  1. RED 建立最终验收清单并记录当前失败：manifest、缓存资源、offline shell、update prompt、safe area、焦点、对比、reduced motion、越南语截断。
  2. 只修复验收发现的 UI/PWA 缺口；新缺陷若需要业务/schema 重构则停止并登记新 Task。
  3. 使用合成数据逐一验证 360×800、390×844、430×932、768×1024、1440×900、1920×1080，以及至少一个 mobile landscape。
  4. 验证浏览器与 standalone、在线/离线/恢复、service worker 更新、键盘、屏幕阅读语义、隐私遮罩和快速记账/完整表格/储蓄/存款/提醒主流程。
  5. evidence 为每个尺寸提供截图索引、浏览器/环境、检查结果、已知限制和所有门禁退出码；不得使用真实财务数据。
- 禁止修改: 未经批准的新功能、线上部署、线上 Rules/Auth、真实数据、T011/T012。
- 完成标准: 所有矩阵项 PASS 或有用户接受的明确非阻断限制；无 Critical/High；Cloudflare/Firebase 未被自动部署。
- 测试要求: 全量 unit/typecheck/build/diff；若规则未改无需重跑 Rules，但需引用 UXS-011 最新通过证据；PWA smoke 与完整视觉矩阵。
- Evidence: `docs/review-evidence/UXS-015.md`。
- 建议提交: `test: close UXS PWA and visual acceptance`。

## UXS 执行顺序

`UXS-001 → UXS-002 → UXS-003 → UXS-004 → UXS-005 → UXS-006 → UXS-007 → UXS-008 → UXS-009 → UXS-010 → UXS-011 → UXS-012 → UXS-013 → UXS-014 → UXS-015`

只有当前 Task 获得 Terra 的仓库内 `APPROVED` review 提交，并由状态提交把 `TASK_STATUS.md` 推进到下一 Task 后，DeepSeek V4 Flash 才能开始下一项。
