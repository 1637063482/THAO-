# GPT-5.6 Terra 审查方案

> 角色：Terra 是独立审查者，不替施工 Agent 补需求，也不因“构建成功”批准。每个 Task 必须按其 commit 单独审查；先读取 `PROJECT_ANALYSIS.md`、`BUG_REPORT.md`、`FRD.md`、`ARCHITECTURE_PLAN.md` 和对应 Task，再看 diff 与新鲜测试输出。

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
- transaction 是事实源；聚合/预算/streak 是可重建派生值。
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
- Rules 测试：每个 allow 都有 deny；未登录/第三 UID/非法字段，并证明两个授权账号同权。
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
| T009 | 固定双人单账本 ADR 与全部文档一致 | 残留 Household/Membership/角色/邀请设计；误动 Firebase | `rg` 范围检查 + 全量测试/构建 |
| T010 | 两个授权账号同权，第三 UID 拒绝 | 把真实 UID 写进客户端；擅自部署线上 Rules；创建成员系统 | A/B 两账号 allow + 第三 UID/匿名 deny |
| T011 | account 版本、归档、币种和期初余额 | 硬删有交易账户；余额用浮点；归档丢历史 | round-trip、版本冲突、双账号授权测试 |
| T012 | transaction 不变量、时区日、soft delete | type 用金额正负表达；缺 createdBy/version/fx snapshot | income/expense/invalid/timezone/version 测试 |
| T013 | 幂等、cursor、事务版本更新和 Rules | operationId 只在客户端去重；并发覆盖；无界 query | emulator 并发 + 重复提交 + 分页 + Rules |
| T014 | 旧公式拆分确定，汇总差异为 0 | 解析失败按 0 静默吞；备注被任意猜分；浮点迁移 | 闰年/异常公式 fixture + 差异报告 |
| T015 | dry-run 绝不写、失败 exit non-zero、源哈希 | 脚本默认指向 prod；报告含明文金额/备注 | emulator 写计数不变 + 三种退出码 |
| T016 | feature flag off/on 完全隔离，新路径幂等 | 双写造成重复；失败清表单；历史记录误打卡 | 两分支 E2E/integration + duplicate click |
| T017 | 分页列表、编辑版本、软删恢复、冲突 UI | 列表 N+1；冲突静默覆盖；用户内容 innerHTML | E2E happy/error/conflict/mobile |
| T018 | 过去/当前/未来预算语义、clock 注入 | 调用 `new Date()`；软删交易仍计入；跨币漂移 | 月边界/时区/零/超支测试 |
| T019 | 报表守恒、转账/删除排除、bucket 可下钻 | 聚合用显示金额；bucket 总和不等总额 | 属性测试 + 多币/跨月 fixtures |
| T020 | 超时、schema、缓存日期/来源、历史不变 | `@latest` 覆盖历史交易；失败回退 0；无 abort | fake fetch timeout/bad JSON/cache tests |
| T021 | IndexedDB 重启恢复、幂等、权限失败终止 | 内存队列冒充持久化；无限重试 403；多消费者重复发 | browser 集成：断网→重启→联网仅一笔 |
| T022 | streak 按交易日/账本时区派生 | 直接写 streak；历史补录算今天；产品未决项被擅自选 | 跨午夜/删除/历史/并发测试 |
| T023 | 图表/烟花真按需，首屏包体下降 | manualChunks 只隐藏警告未减少首屏；离线缺 chunk | 构建前后尺寸 + network/lazy E2E |
| T024 | CI 在干净环境执行全部门禁 | audit 继续使用不支持 endpoint；secret 写日志；测试失败不阻断 | 一次故意红→修复绿的运行链接/日志 |
| T025 | 仅获批 staging 账本，备份/双读/回滚 | 无明确授权即运行；差异非零仍切换；报告泄漏数据 | 授权记录、哈希、0 差异、回滚演练 |

## 4. 关键跨任务审查

### 4.1 T003–T007 止血发布

Terra 要检查这些任务能否独立发布到当前 legacy 架构，且没有依赖尚未完成的新数据模型。重点复测：

- 恶意备注经直接输入、快速记账、导入、云端快照四条路径都不能执行；
- 3 秒以上延迟不会显示已同步；刷新/切年不能清掉待确认数据；
- CSV 在常见表格软件中不执行公式；
- Rules 的线上现状尚未核实时，不能宣称“数据隔离已修复”。

### 4.2 T008–T013 新事实模型

必须做一次架构一致性审查：所有 persisted amount 都是 minor integer，所有资源都在固定共享账本命名空间下，所有写入带 actor/audit/version/idempotency，Rules 与 converter 字段完全一致。发现 UI 传入任意 ledger path、把真实 UID 硬编码进客户端，或 Rules 使用宽泛 `request.auth != null` 应拒绝。

### 4.3 T014–T017 迁移切换

迁移最重要的是“不猜”。旧公式可拆项，但旧备注无法可靠分配到每笔交易；报告必须保留不确定性。功能开关开启前需要逐月、逐分类、全年三层守恒证明。新旧双写不是默认方案；若施工 Agent引入双写，必须有单独 ADR、幂等和回滚设计，否则拒绝。

### 4.4 T018–T022 派生能力

预算、报表、streak 都必须从 transaction 事实计算，不能维护多个可独立修改的真相。Terra 应随机抽取 fixture 手算，并验证下钻 IDs 的金额和等于展示 bucket。

### 4.5 T023–T025 发布准备

性能只接受可复现的前后数据；CI 只接受干净环境输出；迁移只接受明确环境与账本授权。任何生产写入都超出普通代码任务授权范围。

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
