# GPT-5.6 Terra 审查方案

> 角色：Terra 是独立审查者，不替施工 Agent 补需求，也不因“构建成功”批准。每个 Task 必须按其 commit 单独审查；先读取 `PROJECT_ANALYSIS.md`、`BUG_REPORT.md`、`FRD.md`、`ARCHITECTURE_PLAN.md` 和对应 Task，再看 diff 与新鲜测试输出。

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
- 当前运行系统以 VND `entries` 为事实源；streak 是可重建派生值。只有 T019 批准迁移后 transaction 才能成为事实源。
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
| T013 | RED 确实复现 streak=1 与入口不一致 | 测试直接断言实现细节；未控制 clock/timezone | 完整失败输出，连续两天预期 2 实际非 2 |
| T014 | entries 派生、所有入口一致、奖励去重，收入规则已有产品结论 | 仍写/信任 streak 数字；收入规则被擅自决定；同日重复奖励 | 1/2/7/8/30/31、缺口、删除、两入口及合格分类策略测试 |
| T015 | 越南午夜/月末/年末自动刷新 | 继续使用模块级 TODAY；按设备时区漂移 | fake clock + Asia/Ho_Chi_Minh 边界 |
| T016 | VND 是唯一持久事实，CNY 只改 ViewModel | 切换/聚焦时改写 raw/pending；反复换算累计误差 | state/pending 深度不变 + 100 次切换 |
| T017 | 仓库权限契约忠于线上 Rules | 无线上内容仍宣称验证；擅自部署/改账号 | 两账号按实际权限 + 第三 UID/匿名 deny |
| T018 | 覆盖导入前恢复点真实可用 | 先覆盖后备份；备份失败仍继续；日志含财务数据 | 四终态 + 恢复文件 schema/hash |
| T019 | ADR 明确 T011/T012 去留且有所有者选择 | Agent 静默选择迁移；以沉没成本为理由继续 | 两方案成本/风险/价值与签字结论 |
| T020 | FX 故障不阻塞 VND 记账 | 失败写 0；缓存无时间；改动历史 entries | timeout/bad JSON/cache + VND 不变 |
| T021 | CI test/type/rules/build 均阻断且不部署 | secret/真实 UID 泄漏；失败被 `continue-on-error` 吞掉 | 一次红→绿 CI 证据 |

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

线上权限无法从仓库猜测；缺少现行 Rules 时 T017 应 BLOCKED。T019 之前任何 Transaction repository/迁移提交都应拒绝。任何生产 Firebase 写入或部署仍需用户另行授权。

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
