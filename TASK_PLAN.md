# MyExpenseApp 后续施工计划（2026-07-18 重排）

> 产品事实：这是为越南籍女朋友定制的私人账本。她是唯一日常记账者，VND 是唯一账务事实币种；项目所有者使用第二个既有 Firebase 账号查看/维护，CNY 仅为显示换算。应用没有注册、成员管理或多家庭需求。线上账号、Rules 和数据已在 Firebase，未经明确授权不得部署、迁移或改动真实权限。

> 执行与交接必须遵循 `AGENT_WORKFLOW.md` 和 `TASK_STATUS.md`。Coder 与 Reviewer 不通过聊天复制结论；每个 Task 必须形成 evidence、仓库 review 文件和状态提交。

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

## 新执行顺序

`T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021`

T013/T014 是当前最高优先级。T017 需要线上 Rules 信息；T019 已由项目所有者选择方案 A：稳定 legacy 年度矩阵并移出 T011/T012 主线。任何任务都不得部署 Firebase 或迁移真实数据，除非用户另行明确授权。
