# GPT-5.6 Terra 审查方案

> 角色：Terra 是独立审查者，不替施工 Agent 补需求，也不因“构建成功”批准。每个 Task 必须按其 commit 单独审查；先读取 `PROJECT_ANALYSIS.md`、`BUG_REPORT.md`、`FRD.md`、`ARCHITECTURE_PLAN.md` 和对应 Task，再看 diff 与新鲜测试输出。

> 审查交接遵循 `AGENT_WORKFLOW.md`：Terra 禁止修改业务代码，但必须把结论写入 `docs/task-reviews/<TASK>-R<轮次>.md`、更新 `TASK_STATUS.md` 并提交，不能只在聊天中返回 PASS/FAIL。

最新产品边界：女朋友是唯一日常记账者，VND 是事实币种；项目所有者第二账号主要查看/维护，CNY 仅展示；无注册、成员管理或多家庭。任何引入通用多币账、角色系统或默认迁移 T011/T012 的提交都属于越界。

## 1. 审查结论格式

每个任务输出：

```text
Task ID:
结论: APPROVE / REQUEST_CHANGES / BLOCKED
范围核对:
功能正确性:
代码质量:
架构一致性:
性能:
安全:
测试证据:
数据兼容/迁移:
发现项: [Critical/High/Medium/Low + 文件:行 + 可复现证据]
必须修复:
可后续处理:
```

`BLOCKED` 只用于缺少必要外部信息/环境（例如线上 Rules 未提供），不能用来代替代码审查。存在 Critical/High 或任务完成标准未证明时必须 `REQUEST_CHANGES`。

## 2. 通用审查门禁

### 2.1 功能正确性

- diff 中每一行是否能追溯到该 Task，是否出现越界功能。
- 先看失败测试是否确实因缺少目标行为而失败，再看实现后通过证据。
- 金额是否全程使用 minor integer；舍入是否唯一、明确且有边界测试。
- 日期是否使用账本时区；是否覆盖跨午夜、月末、闰年。
- 写入是否幂等；并发、失败和重试是否保留用户数据。
- UI 的“已同步/成功”是否只在服务端确认后出现。

### 2.2 代码质量

- Domain 不得依赖 DOM、Firebase、localStorage、fetch 或 Chart.js。
- UI 不得直接拼 Firestore 路径或修改持久对象。
- runtime schema 在外部输入边界执行；TypeScript strict 下不得用 `any`/非空断言掩盖问题。
- 错误采用稳定 code/fieldErrors，不把第三方原始 message 直接展示。
- 新抽象必须服务当前任务，禁止为假想未来引入框架。

### 2.3 架构一致性

- 依赖方向 `ui → application → domain`，infrastructure 实现 port。
- 所有业务资源必须落在固定共享账本命名空间；uid 只能来自认证上下文，不能由表单伪造。
- 当前运行系统以 VND `entries` 为事实源；streak 是可重建派生值。T019/ADR-003 已明确不迁移到 Transaction，任何 UXS Task 都不得接回 T011/T012。
- legacy 代码只存在于明确 adapter/feature flag，不扩散到新模型。
- schema 变更是否同步更新 converter、Rules、indexes、migration 和 ADR。

### 2.4 性能

- 列表必须 cursor 分页；禁止无界读取或 offset。
- Firestore 查询是否命中明确索引，是否产生每行额外查询/N+1。
- 输入路径是否触发全年全量重算、整页重建或重复监听。
- 新依赖与 bundle 变化是否有构建数据；非首屏模块是否按需加载。
- 大输入/1 万交易场景是否有至少基准测试或复杂度说明。

### 2.5 安全

- Rules 默认拒绝，且同时验证 UID 属于固定双人授权集合、字段类型/大小、不可变字段。
- 必须用匿名、授权账号 A、授权账号 B 和第三 UID 直接 SDK 访问，而非只点 UI。
- 用户文本不得进入 `innerHTML`；CSV/JSON/URL/日志边界均需编码/校验。
- 不把 Firebase web apiKey误判为服务端秘密，但要检查 API 限制与真实秘密是否只在服务端。
- operationId、错误日志不得泄漏财务数据或认证凭证。
- 导入/恢复等危险操作是否有重认证、审计和回滚。

### 2.6 测试覆盖

- 单元测试：纯领域规则、边界值、确定性 clock/fetch/id。
- 集成测试：Firestore Emulator、repository round-trip、并发、outbox。
- Rules 测试：每个 allow 都有 deny；未登录/第三 UID/非法字段；两个既有账号按已核对的线上权限分别验证，不预设同权。
- E2E：真实用户流程与错误恢复，不只检查元素存在。
- 测试不得过度 mock 核心逻辑；不得只做 snapshot。
- 审查者必须自己运行相关测试与 `npm run build`，读取完整 exit code。

## 3. 各 Task 专项检查

| Task | Terra 必查功能点 | 重点风险与拒绝条件 | 最低验证证据 |
|---|---|---|---|
| T001 | Vitest/jsdom/TS strict 基线可在干净安装运行 | 一次性把 legacy JS 纳入 strict 造成噪音；脚本在 Windows 不可用 | `npm ci` 后 test/typecheck/build 全绿 |
| T002 | characterization 与当前 `safeEval` 完全一致 | 测试偷偷把错误现状写成未来规范；漏非法文本/非有限数 | 15+ 表驱动用例，未改生产代码 |
| T003 | raw/remark 只作为文本值，不形成节点或属性 | 仅替换 `<`、漏引号/换行；仍在别处拼用户数据 innerHTML | 恶意 payload DOM 断言 + 月切换回归 |
| T004 | timeout、reject、多批、离开状态正确 | timeout 仍清 pending/显示 synced；旧批完成覆盖新批状态 | fake timer 状态机 + delayed reject + two batches |
| T005 | 固定列数、日支出、RFC 4180、公式文本化 | 只处理 `=`，漏 `+ - @ tab CR`；导出原始公式 | 独立 CSV parser round-trip 测试 |
| T006 | 所有导入分支终止，写前 schema/大小验证 | Promise pending；未知字段/XSS/超长文本通过 | 合法/非法/边界 fixture，无 emulator 写入 |
| T007 | Rules 候选基线、默认 deny、emulator 可重复 | 使用 auth-only；规则与实际路径不匹配；把候选规则误称线上事实 | 未登录/授权 UID/第三 UID/非法字段 Rules 测试 |
| T008 | Money/rate 全整数且舍入唯一 | 内部偷偷转 Number 浮点；超出 safe integer；货币精度写死 | VND/CNY/JPY、半值、溢出测试 |
| T009 | 单账本/主记账者边界与文档一致 | 残留“双人同权”、Household、角色或邀请设计 | `rg` 范围检查 + 文档一致性 |
| T010 | 注册入口确实移除，权限不超出线上事实 | 测试擅自假设两账号同权；把真实 UID 写入仓库 | 登录入口静态测试 + 候选 Rules 说明 |
| T011 | 冻结状态，不得接入运行路径 | 未经 T019 决策继续创建账户 UI/生产集合 | `rg` 证明无 legacy UI import/实例化 |
| T012 | 冻结状态，不得接入运行路径 | 把 CNY/JPY/FX snapshot 当当前需求继续扩张 | `rg` 证明未接线；原单测仍绿 |
| T013 | RED 确实复现 streak=1 与入口不一致，且证据可追溯 | 测试直接断言实现细节；未控制 clock/timezone；失败来自环境；RED 被单独合并到 main | 核对 `T013_RED.md`、基线 SHA、完整失败输出，连续两天预期 2 实际非 2 |
| T014 | entries 派生、收入和支出都计入、所有入口一致、奖励去重 | 仍写/信任 streak 数字；漏算收入；同日收入和支出重复计天或重复奖励 | 纯收入/纯支出/混合、1/2/7/8/30/31、缺口、删除、两入口测试 |
| T015 | 越南午夜/月末/年末自动刷新 | 继续使用模块级 TODAY；按设备时区漂移 | fake clock + Asia/Ho_Chi_Minh 边界 |
| T016 | VND 是唯一持久事实，CNY 只改 ViewModel | 切换/聚焦时改写 raw/pending；反复换算累计误差 | state/pending 深度不变 + 100 次切换 |
| T017 | 仓库权限契约忠于线上 Rules | 无线上内容仍宣称验证；擅自部署/改账号 | 两账号按实际权限 + 第三 UID/匿名 deny |
| T018 | 覆盖导入前恢复点真实可用 | 先覆盖后备份；备份失败仍继续；日志含财务数据 | 四终态 + 恢复文件 schema/hash |
| T019 | ADR 明确 T011/T012 去留且有所有者选择 | Agent 静默选择迁移；以沉没成本为理由继续 | 两方案成本/风险/价值与签字结论 |
| T020 | FX 故障不阻塞 VND 记账 | 失败写 0；缓存无时间；改动历史 entries | timeout/bad JSON/cache + VND 不变 |
| T021 | CI test/type/rules/build 均阻断且不部署 | secret/真实 UID 泄漏；失败被 `continue-on-error` 吞掉 | 一次红→绿 CI 证据 |

### 3.1 UXS 通用视觉审查门禁

Terra 不得只看 DOM snapshot 或 Coder 的聊天摘要。凡 Task 改变可见 UI，必须读取仓库 evidence 和合成数据截图，并亲自核对适用尺寸：360×800、390×844、430×932、768×1024、1440×900、1920×1080。至少检查：

- 越南语默认且无截断，中文切换无缺键，无英语选择入口；
- 手机无页面级横向滚动，Bottom Navigation、键盘和 safe area 不遮挡内容；
- 桌面信息密度合理，完整表格和所有编辑入口仍可达；
- Apple Warm Token 一致，正文对比、焦点、触控目标和 reduced-motion 合格；
- 截图/fixture/evidence 只含合成数据，不含真实邮箱、UID、余额、存款或银行名；
- 视觉变化没有改写 `appState`、pendingUpdates、legacy key 或 Firebase 路径。

缺少应有截图时不得凭描述 APPROVE；若执行环境确实无法截图，review 必须标记缺失证据和明确阻断项，而不是把限制解释成通过。

### 3.2 UXS-001～UXS-015 专项检查

| Task | Terra 必查功能点 | 重点风险与拒绝条件 | 最低验证证据 |
|---|---|---|---|
| UXS-001 | ADR-004 与 PRD/FRD/架构统一 | 仍等待 T019；引入 Transaction/多币账/外部通知；存款路径含糊 | 定向 `rg`、五文档一致性、`git diff --check` |
| UXS-002 | vi 默认、zh-CN 切换、动态文案全覆盖 | 字典值充当数据 key；切换触发云写；Firebase 英文原错直出 | 缺键/插值/lang/persistence/state 不变测试 + 硬编码扫描 |
| UXS-003 | Token、Sidebar/Bottom Nav、safe area、键盘 | 两套导航同时可聚焦；业务 DOM/事件丢失；页面横向溢出 | 六尺寸截图 + navigation/app-shell tests |
| UXS-004 | hero 为本月预算剩余；分类/streak/日聚合可追溯 | 把日分类单元格称为逐笔交易；复制/改变预算规则；假数据 | ViewModel 边界 tests + 六尺寸截图 |
| UXS-005 | 收入/支出 Bottom Sheet 复用 legacy 写入 | 新建 transaction；重复提交；失败清空输入；键盘遮挡 | 收入/支出/失败/离线/焦点 tests + 手机/桌面截图 |
| UXS-006 | 日视图和完整表格编辑同一 legacy cell | 合成伪 ID；完整表格退化；切换丢输入；页面级溢出 | 映射/双入口/远端快照 tests + 横屏/多尺寸截图 |
| UXS-007 | `income-expense`、月年独立、VND 整数 | 存款本金/预计利息计入实际；Domain 依赖 DOM/Firebase；NaN | 0/负/超额/safe integer/年月边界 domain tests |
| UXS-008 | 13 个 settings key round-trip、切年、旧文档 | 自建 goals collection；改 Rules；CNY/locale 触发写；导入破坏兼容 | store/schema/旧快照 tests + full gates |
| UXS-009 | 首页/储蓄页目标编辑、清空、同步状态 | UI 重算领域逻辑；历史年被覆盖；失败伪成功 | 状态/render tests + 390/768/1440 截图 |
| UXS-010 | ppm/BigInt 利息、状态、日期、汇总 | 浮点持久事实；MATURING 被存储；本金计收入；日期按设备漂移 | 利息/舍入/闰年/override/状态/汇总 domain tests |
| UXS-011 | 固定 savings 文档、schema、版本、Rules deny | 写年度 doc；宽松 auth-only；部署线上；泄露真实账号/数据 | unit/integration/rules、每 allow 对应 deny、emulator exit code |
| UXS-012 | 手机卡片/桌面表格 CRUD、汇总、隐私 | UI 自算利息；归档即硬删除；错误丢表单；隐私漏金额 | form/view tests + 六尺寸/隐私截图 |
| UXS-013 | 打开/恢复提醒、最紧迫阶段、去重、snooze | 引入 Push/Cron；错过阶段连环弹；数据未加载先弹；离线冒充最新 | fake clock/lifecycle tests + dialog 截图 |
| UXS-014 | 赎回、续存、实际利息幂等收入 | 本金算收入；覆写旧存款；重复写 income；部分失败伪完成 | 重复点击/失败注入/版本冲突/use-case tests |
| UXS-015 | PWA、全尺寸、offline/update、a11y、隐私回归 | 用真实数据截图；新增功能掩盖缺陷；未经授权部署；Critical/High 遗留 | 完整截图索引、PWA smoke、全量门禁及已知限制 |

## 4. 关键跨任务审查

### 4.1 T003–T007 止血发布

Terra 要检查这些任务能否独立发布到当前 legacy 架构，且没有依赖尚未完成的新数据模型。重点复测：

- 恶意备注经直接输入、快速记账、导入、云端快照四条路径都不能执行；
- 3 秒以上延迟不会显示已同步；刷新/切年不能清掉待确认数据；
- CSV 在常见表格软件中不执行公式；
- Rules 的线上现状尚未核实时，不能宣称“数据隔离已修复”。

### 4.2 T008–T012 冻结的新事实模型

T011/T012 当前只允许保持隔离和测试绿色，不允许继续接 repository/UI/生产路径。T008 的 VND 整数可复用，但 CNY/JPY 支持不能被解释为当前产品需要多币事实模型。

### 4.3 T013–T016 当前主链路

优先证明并修复真实 streak Bug。Terra 必须检查直接表格、快速记账和云端快照三条路径；连续天数必须从 entries 日期派生，不能通过把 `expense_streak += 1` 修补。CNY 审查重点是切换显示前后持久 state 完全不变。

### 4.4 T017–T021 权限、恢复与决策

线上权限无法从仓库猜测；缺少现行 Rules 时 T017 应 BLOCKED。T019/ADR-003 已拒绝 Transaction 迁移，因此任何 UXS 中接回 Transaction repository/迁移的提交都应拒绝。任何生产 Firebase 写入或部署仍需用户另行授权。

## 5. 缺陷严重度与处置时限

- Critical：立即停止合并/发布；说明数据是否已暴露或损坏，先遏制再修复。
- High：阻断当前 Task；同一提交修复或拆成前置 P0 Task 后再审。
- Medium：若直接违反完成标准则阻断；否则登记明确 Task ID、负责人和期限。
- Low：可批准但必须记录，不允许用大量 Low 掩盖系统性问题。

## 6. 最终发布审查清单

只有以下全部有新鲜证据时，Terra 才能建议发布：

- 相关 unit/integration/rules/e2e 全绿且构建成功；
- npm 生产依赖审计使用可用的官方 endpoint；
- Firestore Rules diff 与测试一致，未使用宽泛 auth-only；
- 无用户数据 `innerHTML`、CSV injection、客户端服务端秘密；
- 金额守恒、时区边界、并发幂等、离线恢复通过；
- schema 变更有 migration/backup/rollback；
- 包体和关键路径性能没有超预算；
- 未修改任务“禁止修改”范围；
- 没有未授权的部署、生产迁移、账号/Rules 修改或外部数据写入。

如果外部配置无法验证，最终结论必须写“代码已通过，生产安全/部署仍 BLOCKED”，不得把仓库测试外推为线上事实。
