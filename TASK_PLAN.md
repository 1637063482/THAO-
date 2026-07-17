# GPT-5.4 mini 施工任务计划

> 执行原则：严格按依赖顺序；每个 Task 单一目标、单独 commit、预计不超过半天。先写失败测试并看到预期失败，再写最小实现。任何任务不得顺手重构相邻代码。涉及 Firebase 的任务只在 emulator/dev project 验证；未获得生产项目授权不得部署、迁移或修改线上 Rules。

## Task 001：建立测试与类型检查基线

- Task ID: T001
- 目标: 为现有 JS 建立 Vitest/jsdom 测试入口，并启用渐进式 TypeScript strict。
- 修改文件: `package.json`、`package-lock.json`、`vitest.config.js`（新建）、`tsconfig.json`（新建）、`tests/setup.js`（新建）、`tests/unit/smoke.test.js`（新建）、`tests/typecheck.ts`（新建）
- 涉及模块: 工程基础设施
- 详细步骤: 添加 `test/test:watch/typecheck` 脚本；配置 jsdom；写一个导入 `safeEval` 的 smoke test；配置 TS 仅检查后续 `.ts` 和声明文件，不一次性检查 legacy JS。添加 `tests/typecheck.ts`（仅 `export {};`）避免 tsc 在零 .ts 输入时无实质性检查。
- 禁止修改: `src/js` 业务行为、Firebase 配置、构建输出。
- 完成标准: `npm test -- --run`、`npm run typecheck`、`npm run build` 均 exit 0。
- 测试要求: smoke test 必须先因测试环境缺失失败，再在配置完成后通过。RED 阶段证据因初始提交 (870c731) 将配置与测试一次性加入而缺失。重建式 RED 复现（非原始历史）于 2026-07-17 在 commit 82f2dbe（pre-T001）执行：`npm test` → "Missing script: test" exit 1；`npm run typecheck` → "Missing script: typecheck" exit 1。GREEN 阶段见下方验证输出。

## Task 002：锁定现有金额解析行为

- Task ID: T002
- 目标: 用 characterization tests 固化 `safeEval` 当前合法与异常输入行为，暴露未来改造边界。
- 修改文件: `tests/unit/utils.safe-eval.test.js`（新建）
- 涉及模块: `src/js/utils.js`
- 详细步骤: 覆盖空值、四则运算、除零、指数、超长、尾随运算符、非法文本、负数和浮点；明确哪些是当前行为而非目标行为。
- 禁止修改: `src/js/utils.js`、金额存储格式。
- 完成标准: 测试精确记录当前输出，无随机/时区依赖。
- 测试要求: 至少 15 个表驱动用例；`npm test -- --run tests/unit/utils.safe-eval.test.js` 通过。

## Task 003：消除表格渲染的持久化 XSS

- Task ID: T003
- 目标: 用户输入不再通过 HTML 字符串进入属性。
- 修改文件: `src/js/render.js`、`tests/unit/render-xss.test.js`（新建）
- 涉及模块: 表格渲染、安全
- 详细步骤: 先用恶意 raw/remark 构造失败测试；保留静态表格骨架生成，但输入元素创建后用 `.value` 和 `.dataset.raw` 赋用户数据，或完全用 DOM API 创建；验证重渲染不产生额外元素/事件属性。
- 禁止修改: 表格视觉样式、Firestore schema、分类清单。
- 完成标准: 恶意 payload 只作为输入框文本出现；现有月表格布局不变。
- 测试要求: 覆盖双引号、`<img onerror>`、换行、Unicode；相关测试与构建通过。

## Task 004：修复当前同步状态的伪成功

- Task ID: T004
- 目标: Firestore 未确认时绝不显示“已同步”，失败数据可重试。
- 修改文件: `src/js/sync.js`、`src/js/state.js`、`tests/unit/sync-state.test.js`（新建）
- 涉及模块: 同步、状态管理
- 详细步骤: 抽出可测试 save executor；给每批写入状态和 promise；超时只标记 delayed；写成功再 clear 对应 batch；失败 merge back；多批并发时只有全部确认才显示 synced。
- 禁止修改: Firestore 文档路径、数据模型、UI CSS。
- 完成标准: success/timeout/reject/第二批排队四种状态转移确定；切年/离开可检测所有未确认写入。
- 测试要求: fake timers；覆盖延迟后失败、先后两批、重试不丢字段。

## Task 005：修复当前 CSV 导出

- Task ID: T005
- 目标: CSV 符合字段转义规则、补齐日支出且不触发表格公式。
- 修改文件: `src/js/export.js`（新建）、`src/js/main.js`、`tests/unit/csv-export.test.js`（新建）
- 涉及模块: 导出、安全
- 详细步骤: 抽出纯函数 `escapeCsvCell/buildLegacyCsv`；导出解析后的数值；文本前缀防公式注入；正确处理引号/逗号/CRLF；计算每日总支出；main 只负责下载。
- 禁止修改: 页面文案、Firestore 数据、JSON 导入。
- 完成标准: Excel/通用解析器可稳定得到固定列数；危险公式保持文本。
- 测试要求: 中文、越南文、逗号、双引号、换行、`=+-@`、空值、日合计。

## Task 006：为 legacy JSON 导入增加 schema 与终态

- Task ID: T006
- 目标: 非法导入明确失败，合法导入在确认前完成本地校验。
- 修改文件: `src/js/import-schema.js`（新建）、`src/js/sync.js`、`src/js/main.js`、`tests/unit/import-schema.test.js`（新建）
- 涉及模块: 导入、安全、同步
- 详细步骤: 定义允许的 balances/entries/settings 键、类型、长度、总文件大小；所有 Promise 分支 resolve/reject；输出结构化错误；拒绝未知危险字段和超长文本。
- 禁止修改: 导入仍覆盖当前年度的产品语义（备份/预览在后续任务）、线上数据。
- 完成标准: 缺 entries、错误类型、超限、危险文本均在写云端前拒绝；UI 显示稳定错误。
- 测试要求: 合法样本、每类非法结构、Promise 完成性、边界长度。

## Task 007：把 Firestore Rules 和 Emulator 纳入仓库

- Task ID: T007
- 目标: 建立默认拒绝的安全规则事实源与测试入口。
- 修改文件: `firebase.json`（新建）、`firestore.rules`（新建）、`firestore.indexes.json`（新建）、`tests/rules/legacy-ledger.rules.test.js`（新建）、`package.json`、`package-lock.json`
- 涉及模块: Firebase 安全
- 详细步骤: 配置 emulator；在未完成 household 迁移前把 legacy path 规则参数化为明确 allowlist/membership 临时策略；禁止仅以“已登录”作为全部授权；测试未登录、非成员、成员读写和非法字段。
- 禁止修改: 生产 Rules、客户端数据路径、真实 Firebase 项目。
- 完成标准: 本地规则测试可重复；默认未匹配路径 deny。
- 测试要求: 每个 allow 至少有一个对称 deny；直接 SDK 越权测试通过。

## Task 008：建立 Money 定点值对象

- Task ID: T008
- 目标: 新模型所有金额和汇率计算不使用二进制浮点事实值。
- 修改文件: `src/domain/money.ts`（新建）、`src/domain/currency.ts`（新建）、`src/domain/errors.ts`（新建）、`tests/unit/domain/money.test.ts`（新建）
- 涉及模块: Domain
- 详细步骤: 定义 ISO currency metadata、minor integer 校验、加减、同币约束、格式化输入解析、scaled rate 换算和明确舍入策略。
- 禁止修改: legacy `safeEval`、UI、Firestore。
- 完成标准: API 不接受 NaN/Infinity/小数 minor unit；跨币结果可复现。
- 测试要求: VND/CNY/JPY、边界值、负值策略、溢出、0.1 类误差、舍入半值。

## Task 009：建立 Household 与 Membership 领域模型

- Task ID: T009
- 目标: 定义账本租户、角色与权限矩阵的纯领域模型。
- 修改文件: `src/domain/household.ts`（新建）、`src/domain/membership.ts`（新建）、`tests/unit/domain/membership.test.ts`（新建）、`docs/adr/001-household-boundary.md`（新建）
- 涉及模块: Domain、架构决策
- 详细步骤: 定义 Owner/Admin/Member/Viewer 能力；最后 Owner、移除成员、角色变更规则；ADR 记录多家庭边界。
- 禁止修改: Firebase、页面、现有共享文档。
- 完成标准: 权限决策为纯函数且没有 Firebase 依赖。
- 测试要求: 全角色×能力矩阵、最后 Owner、不活跃成员。

## Task 010：建立新 Firestore household repository 与 Rules

- Task ID: T010
- 目标: 在 emulator 中创建/读取隔离的 household 和 member 资源。
- 修改文件: `src/infrastructure/firebase/household-repository.ts`（新建）、`src/infrastructure/firebase/converters.ts`（新建）、`firestore.rules`、`tests/integration/household-repository.test.ts`（新建）、`tests/rules/household.rules.test.js`（新建）
- 涉及模块: Infrastructure、Rules
- 详细步骤: 实现 typed converter；创建者成为 Owner；所有查询带 householdId；Rules 通过 member 文档校验；加入跨 household 测试。
- 禁止修改: 线上项目、legacy 文档、邀请流程。
- 完成标准: A 家庭成员不能读取 B 家庭任何资源；repository 不暴露任意路径拼接。
- 测试要求: emulator 集成 + Rules 权限矩阵；不存在成员文档时 deny。

## Task 011：建立 Account 模型与 repository

- Task ID: T011
- 目标: 支持账户创建、更新和归档。
- 修改文件: `src/domain/account.ts`（新建）、`src/application/accounts/manage-account.ts`（新建）、`src/infrastructure/firebase/account-repository.ts`（新建）、`firestore.rules`、`tests/unit/domain/account.test.ts`（新建）、`tests/integration/account-repository.test.ts`（新建）
- 涉及模块: Accounts、Rules
- 详细步骤: 账户字段/版本校验；应用用例；Firestore converter；归档而非硬删；按角色限制配置。
- 禁止修改: 旧余额字段、交易模型、UI。
- 完成标准: account round-trip 字段无漂移；归档账户仍可读且不可用于新交易（后续交易用例验证）。
- 测试要求: 币种、opening balance、版本冲突、跨账本、角色。

## Task 012：建立 Transaction 模型

- Task ID: T012
- 目标: 定义独立收入/支出交易及其不变量。
- 修改文件: `src/domain/transaction.ts`（新建）、`src/application/transactions/create-transaction.ts`（新建）、`src/application/transactions/update-transaction.ts`（新建）、`tests/unit/domain/transaction.test.ts`（新建）、`docs/adr/002-transaction-and-money.md`（新建）
- 涉及模块: Transactions、Domain
- 详细步骤: 定义 ID、kind、Money、account/category、occurredAt/localDate、fx snapshot、audit metadata、version、soft delete；实现创建/更新命令验证。
- 禁止修改: Firestore、legacy entries、转账。
- 完成标准: 无效金额、日期、币种/汇率、归档引用被领域错误拒绝。
- 测试要求: 收入/支出、时区本地日、版本、软删/恢复、幂等键字段。

## Task 013：实现 Transaction repository 与权限规则

- Task ID: T013
- 目标: 在 emulator 中幂等创建、分页读取、版本更新交易。
- 修改文件: `src/infrastructure/firebase/transaction-repository.ts`（新建）、`src/infrastructure/firebase/converters.ts`、`firestore.rules`、`firestore.indexes.json`、`tests/integration/transaction-repository.test.ts`（新建）、`tests/rules/transaction.rules.test.js`（新建）
- 涉及模块: Transactions、Firestore、Rules
- 详细步骤: transaction/converter；cursor query；operationId 去重策略；transaction/precondition 版本更新；软删；字段类型与不可变字段 Rules。
- 禁止修改: UI、legacy writer、生产索引。
- 完成标准: 两个并发 create 都保留；相同 operationId 只产生一笔；旧 version 更新冲突。
- 测试要求: 并发、幂等、分页无重复/遗漏、权限、非法字段直写拒绝。

## Task 014：实现 Legacy 迁移解析器

- Task ID: T014
- 目标: 把一个旧年度文档确定性转换为迁移交易草稿和校验报告。
- 修改文件: `src/legacy/parse-legacy-ledger.ts`（新建）、`src/legacy/legacy-schema.ts`（新建）、`tests/unit/legacy/parse-legacy-ledger.test.ts`（新建）、`docs/adr/003-legacy-migration.md`（新建）
- 涉及模块: Migration、Domain
- 详细步骤: 解析 keys 和安全算术项；收入/支出映射；记录无法分配的日备注；输出每月旧/新合计与 rejected items；ADR 固化公式拆分规则。
- 禁止修改: 任何云端数据、旧代码写路径、UI。
- 完成标准: 对合法 fixture 每月/分类/全年合计差异为 0 minor unit；异常项不静默吞掉。
- 测试要求: 闰年、负数/非法公式、空格、长公式、备注、CNY 历史信息缺失标记。

## Task 015：增加迁移 dry-run 命令

- Task ID: T015
- 目标: 只读生成旧账迁移报告，不写新集合。
- 修改文件: `scripts/migrate-legacy-dry-run.mjs`（新建）、`tests/integration/migration-dry-run.test.js`（新建）、`package.json`、`MIGRATION_RUNBOOK.md`（新建）
- 涉及模块: Migration、运维
- 详细步骤: 从 emulator/导出 fixture 读取；调用 parser；输出 JSON/Markdown 报告；记录源哈希、条目数、拒绝项和差异；runbook 明确禁用生产写。
- 禁止修改: Firestore 数据、生产凭证、legacy parser 规则。
- 完成标准: 相同输入产生确定性报告；发现任一非零差异时 exit non-zero。
- 测试要求: 成功/差异/损坏输入三种退出码。

## Task 016：让快速记账写入新 Transaction 用例（功能开关）

- Task ID: T016
- 目标: 测试账本可通过快速记账创建独立交易，旧用户行为不被强制切换。
- 修改文件: `src/application/feature-flags.ts`（新建）、`src/ui/transactions/quick-add-controller.ts`（新建）、`src/js/quick-add.js`、`tests/integration/quick-add-transaction.test.ts`（新建）
- 涉及模块: UI、Transactions、Migration
- 详细步骤: 以 household feature flag 选择 legacy/new path；新入口统一解析金额/日期/账户/分类并调用 create use case；显示 queued/confirmed；失败保留表单。
- 禁止修改: 未开启 flag 的旧写入行为、表格 UI、线上 flag。
- 完成标准: flag off 完全走旧路径；flag on 只创建 transaction，不写旧 entries。
- 测试要求: 两分支、重复点击幂等、验证错误、离线 queued、历史日期不误算今天。

## Task 017：实现交易列表最小 UI

- Task ID: T017
- 目标: 新模型交易可分页查看并下钻编辑。
- 修改文件: `src/ui/transactions/transaction-list.ts`（新建）、`src/ui/transactions/transaction-form.ts`（新建）、`src/css/app.css`、`index.html`、`tests/e2e/transaction-list.spec.ts`（新建）
- 涉及模块: UI、Transactions
- 详细步骤: 加 feature-flag 页面；cursor 加载；显示时间/账户/分类/原币/创建人/同步状态；编辑带 version；冲突显示，不覆盖。
- 禁止修改: 旧月矩阵、图表、预算。
- 完成标准: 可创建→列表出现→编辑→软删→恢复；分页顺序稳定。
- 测试要求: Playwright happy path、空态、加载失败、冲突、键盘/移动端基本可用性。

## Task 018：重建预算纯函数与新数据适配

- Task ID: T018
- 目标: 预算计算从 DOM 脱离，并正确区分过去/当前/未来月。
- 修改文件: `src/domain/budget.ts`（新建）、`src/application/budgets/build-budget-status.ts`（新建）、`tests/unit/domain/budget.test.ts`（新建）、`src/ui/budgets/budget-view-model.ts`（新建）
- 涉及模块: Budget、Reports
- 详细步骤: 输入月、账本时区、整数限额和有效交易；输出 spent/remaining/pct/periodState/dailyAllowance；UI adapter 只格式化。
- 禁止修改: 旧 `budget.js`，直到 feature flag 接线任务另行批准。
- 完成标准: 纯函数无 DOM/Date.now；所有状态可由注入 clock 重现。
- 测试要求: 月首/月末/闰年/跨时区、零预算、超支、删除交易、未来/过去月。

## Task 019：重建报表聚合纯函数

- Task ID: T019
- 目标: 从 transaction 列表生成可下钻的月度汇总。
- 修改文件: `src/application/reports/build-summary.ts`（新建）、`src/application/reports/report-types.ts`（新建）、`tests/unit/reports/build-summary.test.ts`（新建）
- 涉及模块: Reports、Transactions
- 详细步骤: 过滤 soft-deleted；按本地日/分类/账户/成员聚合；排除转账；每个 bucket 保留 transaction IDs；断言总额守恒。
- 禁止修改: Chart.js、旧 `calculateAll`、Firestore projection。
- 完成标准: summary 总收入/支出与逐笔整数求和一致，bucket 可下钻。
- 测试要求: 多币基准金额、跨月边界、删除、空数据、大整数、守恒属性测试。

## Task 020：修正汇率 adapter

- Task ID: T020
- 目标: 汇率请求有超时、日期、来源与缓存，不改变历史交易事实。
- 修改文件: `src/infrastructure/fx/fx-provider.ts`（新建）、`src/infrastructure/fx/fx-cache.ts`（新建）、`tests/unit/fx/fx-provider.test.ts`（新建）、`src/js/auth.js`
- 涉及模块: FX、UI
- 详细步骤: 注入 fetch/clock；AbortController 超时；runtime schema；缓存指定日期 rate；legacy UI 只消费 adapter 展示值；错误显示最后有效值与时间。
- 禁止修改: 已保存 legacy entries、新 Transaction fx snapshot、第三方供应商（除非产品所有者批准）。
- 完成标准: 慢/坏响应不会永久加载；展示来源与更新时间；失败不写 0 汇率。
- 测试要求: timeout、HTTP 错误、畸形 JSON、cache hit/stale、手动 rate。

## Task 021：实现可靠 IndexedDB outbox

- Task ID: T021
- 目标: 页面重启和断网后仍能幂等补传交易命令。
- 修改文件: `src/application/sync/sync-outbox.ts`（新建）、`src/infrastructure/storage/indexeddb-outbox.ts`（新建）、`src/ui/shared/sync-indicator.ts`（新建）、`tests/integration/outbox.test.ts`（新建）、`docs/adr/004-sync-outbox.md`（新建）
- 涉及模块: Sync、Offline
- 详细步骤: 持久化 operation；状态机；单消费者顺序 flush；指数退避；权限/validation 失败停止自动重试；冲突保留；确认后删除。
- 禁止修改: Service Worker 缓存策略、legacy pending queue、生产数据。
- 完成标准: 断网创建→关闭→重开→联网只产生一笔；UI 状态与 outbox 一致。
- 测试要求: 重启、重复 flush、乱序网络、401/403、validation、冲突、网络恢复。

## Task 022：修正 streak 为派生指标

- Task ID: T022
- 目标: 连续天数由交易发生日和账本时区计算，不能直接写数字。
- 修改文件: `src/application/reports/build-streak.ts`（新建）、`src/ui/reports/streak-view-model.ts`（新建）、`tests/unit/reports/build-streak.test.ts`（新建）
- 涉及模块: Reports、Gamification
- 详细步骤: 明确合格 transaction kind；按 localDate 去重；从 today 向前连续计算；删除/恢复自然回算；UI feature flag 使用新结果。
- 禁止修改: 产品未确认前不得决定收入是否算打卡；旧 settings 数据不得删除。
- 完成标准: 历史补录不改变今天状态；直接录入和快速录入结果一致。
- 测试要求: 跨午夜、时区、昨天缺口、同日多笔、删除唯一交易、历史补录。

## Task 023：拆分首屏包体

- Task ID: T023
- 目标: Chart.js 和烟花按需加载，消除当前 500 kB 主包警告或给出证据化预算。
- 修改文件: `src/js/main.js`、`src/js/charts.js`、`src/js/render.js`、`vite.config.js`、`tests/e2e/lazy-load.spec.ts`（新建）
- 涉及模块: Build、Performance
- 详细步骤: dynamic import 图表与烟花；只在分析面板/动画触发加载；设置 chunk budget；对比构建产物。
- 禁止修改: 图表数据口径、动画视觉、依赖大版本。
- 完成标准: 初始 chunk 小于约定预算且功能按需可用；构建无当前大 chunk 警告，或 ADR 记录经批准的例外。
- 测试要求: 构建产物断言、图表打开、离线缓存后按需加载、无 JS 错误。

## Task 024：建立 CI 质量门禁

- Task ID: T024
- 目标: 每个提交自动验证类型、测试、Rules、构建、依赖和包体。
- 修改文件: `.github/workflows/ci.yml`（新建）、`package.json`、`scripts/check-bundle-size.mjs`（新建）、`SECURITY.md`（新建）
- 涉及模块: CI、Security、Release
- 详细步骤: 固定 Node LTS；npm ci；typecheck；unit/integration/rules；e2e smoke；build；npm audit official registry；bundle budget；上传失败报告但不上传敏感数据。
- 禁止修改: 自动部署、生产凭证、分支保护设置（需仓库管理员操作）。
- 完成标准: 故意失败的测试/Rules/包体能阻断 CI；绿色运行包含完整证据。
- 测试要求: 在 PR 分支验证一次红→绿；记录每个 job 的实际退出码。

## Task 025：执行首次迁移灰度（需单独授权）

- Task ID: T025
- 目标: 仅在指定 staging 测试账本执行备份、迁移、双读和回滚演练。
- 修改文件: `MIGRATION_RUNBOOK.md`、`migration-reports/<approved-test-ledger-id>.md`（运行时新建；不得包含明文财务数据）
- 涉及模块: Migration、Release
- 详细步骤: 获取书面账本 ID/环境授权；导出备份并哈希；dry-run；写 staging 新集合；逐月比较；模拟回滚；记录结果。
- 禁止修改: 未明确批准的账本、生产默认开关、旧文档内容、真实用户权限。
- 完成标准: 每月/分类/全年差异为 0 minor unit；回滚恢复原读路径；所有拒绝项由所有者签字处理。
- 测试要求: 备份可恢复、迁移可重入、第二次执行不重复、故障中断后可继续。

## 提交顺序与门禁

- 止血：T001 → T002 → T003/T004/T005/T006 → T007。
- 新模型：T008 → T009 → T010 → T011 → T012 → T013。
- 迁移与 UI：T014 → T015 → T016 → T017 → T018/T019/T020/T022。
- 可靠性：T021、T023、T024。
- T025 必须最后且需要项目所有者单独授权，不能由 Agent 自行触发。

每个任务提交信息建议使用 `test: ...`、`fix: ...`、`feat: ...` 或 `chore: ...`，不得把多个 Task 合并为一个 commit。
