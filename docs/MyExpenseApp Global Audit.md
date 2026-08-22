# MyExpenseApp Global Audit

审计基线：`ca77d79`，`main...origin/main`，工作树 clean。审计期间 HEAD 从 `c584441` 外部推进到仅修改 PRD/FRD 的 `ca77d79`；本审计未执行任何 Git 写操作，也未修改源码、配置、文档、依赖或生产状态。

## 1. Executive Verdict

当前系统已达到“功能较完整、工程门禁健康”的阶段，但还不能被认定为完全可信的私人财务账本。

- 整体成熟度：中等偏上。核心账本、预算、分析、streak、储蓄目标、存款、双语、PWA 均已实现。
- 可信使用结论：在修复 P0 前，不应把 UI 中的金额与“已同步”状态无条件视为可靠事实。
- 最大风险：多个写入入口没有统一金额契约；离线切年可丢失待保存数据；同步状态可能早于服务端确认；存款利息幂等依赖可编辑备注。
- 下一阶段：暂停新功能，先完成数据与同步 hardening。
- 当前架构无需推倒重做；`shared_ledger_<year>` 仍适合两名固定用户的产品规模。

## 2. Current System Map

```text
index.html / 账本、快速记账、预算、储蓄、存款、分析 UI
                         │
                         ▼
                 全局可变 state
          appState + pendingUpdates
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
shared_ledger_<year>             shared_ledger_savings
entries/balances/settings        存款固定文档 + transaction
          │                             │
          ▼                             ▼
800ms debounce + setDoc merge     DepositRepository
          │
          ▼
Firestore snapshot → 覆盖本地 state → 重新派生并渲染
          │
          ├─ Dashboard / Budget / Charts / Analytics
          ├─ Streak（含上一年度 entries）
          └─ Savings progress
```

存款本金不进入日常收入；只有用户确认的实际利息可通过桥接写入年度账本。这个边界与 ADR-003/004 基本一致。

## 3. PRD / FRD / ADR Consistency

| 分类 | 审计结论 |
|---|---|
| 已正确实现 | 两个既有 Firebase 账号模型；VND 事实币种、CNY 辅助显示；按月预算键；Analytics 只读派生；Vietnam 时区 streak；移动账本横向滚动和备注列 128px；存款独立固定文档 |
| 部分实现 | 保存状态、离线可靠性、存款结算恢复、双账号并发、导入完整性、移动端触控规范 |
| 文档落后代码 | `TASK_STATUS.md` 仍反映较早阶段；架构/旧 Bug 文档没有完整覆盖当前 analytics、modal、Rules 和存款实现 |
| 代码违反契约 | VND 整数边界、服务端确认语义、`expectedInterestVnd` null/override 语义、派生模块对同一 ledger 值的解释 |
| Out-of-Scope 残留 | FRD 中通用 outbox、Account/Transaction、审计系统等仍只是未来描述，当前未实现；这符合边界，不是缺陷 |
| 生产环境未知 | 仓库 Rules 已实现成员文档授权，但无法证明生产 Rules 已部署或两个 member 文档已正确配置 |

## 4. P0 Findings

### AUD-P0-01 — 离线切年会清空未保存账目

- Severity：P0
- Status：VERIFIED
- Area：Ledger lifecycle / data loss
- Finding：切年只在“正在保存且在线”时阻止；离线时继续切年，而年度重置会清空 `pendingUpdates`。
- Why it matters：用户可在离线记账后切年，未上传的 entries、balances、settings 随即丢失。
- Evidence：[year-controller.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/features/ledger/year-controller.js:64)、[state.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/state.js:64)。
- Failure scenario：离线编辑 → 状态进入 pending/syncing → 切换年度 → `resetLedgerYearState()` → pending 被清空。
- Recommended direction：只要存在 pending 或 active write 就阻止切年；若允许放弃，必须明确确认。
- Regression test required：离线 pending、失败后 pending、写入中、明确放弃四种切年测试。

### AUD-P0-02 — 直接表格、余额和预算入口可写入非法 VND

- Severity：P0
- Status：VERIFIED
- Area：Financial integrity
- Finding：直接表格和余额输入在每次 `input` 时保存原始字符串；预算接受 `safeEval` 结果，未验证非负、安全整数，CNY 转 VND 后也未取整。
- Why it matters：负数、小数、部分公式、指数表达式或超安全整数可进入 pending 和 Firestore，产生错账。
- Evidence：[input-controller.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/features/ledger/input-controller.js:43)、[budget.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/budget.js:44)、[utils.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/utils.js:10)。
- Failure scenario：输入 `-1`、`1.5`、`1e6` 或尚未完成的公式 → 立即进入事实状态并排队上传。
- Recommended direction：建立唯一的 VND 金额解析/校验函数；只有验证通过的 canonical 值才能进入 ledger mutation。
- Regression test required：所有入口统一覆盖负数、小数、NaN、Infinity、指数、溢出、部分公式和 CNY 舍入。

### AUD-P0-03 — 导入校验允许破坏账务契约后整文档覆盖

- Severity：P0
- Status：VERIFIED
- Area：Import / destructive overwrite
- Finding：导入金额只要求 finite number 或字符白名单；允许负数、小数、指数和不安全整数。日期允许所有月份的 31 日，预算也未要求安全整数。通过后使用 `{merge:false}` 覆盖年度账本。
- Why it matters：一个“schema 校验通过”的文件仍可污染全部年度事实。
- Evidence：[import-schema.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/import-schema.js:6)、[sync.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/sync.js:284)。
- Failure scenario：导入含 `2_31_dining`、负金额、fractional budget 或超安全整数的文件 → 备份成功 → 云端年度文档被替换。
- Existing mitigation：下载并在 localStorage 验证恢复文件；这降低可恢复性风险，但不能使非法导入合法。
- Recommended direction：导入必须复用 canonical ledger validator，并先显示拒绝原因和定位。
- Regression test required：真实日历、VND 安全整数、所有 setting 类型、跨模块解释一致性。

### AUD-P0-04 — UI 可在服务端尚未确认时显示“已同步”

- Severity：P0
- Status：VERIFIED
- Area：Synchronization feedback
- Finding：年度 snapshot 回调忽略 `metadata.hasPendingWrites`，每次都设置 `synced`；`triggerCloudSave()` 不返回可等待的 Promise。存款利息桥接因而只能等待“已排队”，随后可标记 synced。
- Why it matters：符合目标文件对 P0 的明确定义——实际未确认持久化，却告诉用户已同步。
- Evidence：[sync.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/sync.js:124)、[sync.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/sync.js:172)、[quick-add.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/quick-add.js:31)、[controller.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/features/deposits/controller.js:291)。
- Failure scenario：本地 latency-compensated snapshot 先到 → UI 显示 synced → 后端写入随后失败或页面关闭。
- Recommended direction：区分 local/queued/sending/confirmed/failed；最小方案是 awaitable save handle 加 `hasPendingWrites` 判定，不必立即建设通用 outbox。
- Regression test required：本地 snapshot、后端确认、权限失败、离线恢复、刷新/关闭、连续两批写入。

### AUD-P0-05 — 存款利息幂等可被普通备注编辑破坏

- Severity：P0
- Status：VERIFIED
- Area：Deposit settlement / duplicate accounting
- Finding：是否已记利息完全由普通备注中的 `[#op:...]` 字符串决定。
- Why it matters：用户删除或修改备注后，收入仍在，但幂等证据消失；“补记实收利息”可再次增加同一笔收入。
- Evidence：[quick-add.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/quick-add.js:43)、[view.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/features/deposits/view.js:67)。
- Failure scenario：结算并写入利息 → 编辑当日备注删除 marker → 再次补记 → 收入重复。
- Recommended direction：把稳定 operation 状态保存在不可由备注编辑破坏的结构中；备注只用于显示。
- Regression test required：备注修改/删除、跨日搜索、重复重试、部分成功恢复。

## 5. P1 Findings

### AUD-P1-01 — settings 同步使用整张 map，存在并发覆盖

- Status：VERIFIED
- Finding：一个 setting 变更会复制整个 `appState.settings`；snapshot 又会无条件替换整张 map。
- Evidence：[state.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/state.js:50)、[sync.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/sync.js:174)。
- Failure scenario：账号 A 改 8 月预算，账号 B 改储蓄目标；snapshot 与 debounce 交错后，某一方可重发旧 settings 或丢失本地值。
- Direction：按 changed keys 建 patch；snapshot 应与 pending 合并，而不是直接覆盖。
- Test：双账号、双标签、乱序 snapshot、不同 setting key 和同 key 冲突。

### AUD-P1-02 — 存款结算和年度利息不是原子事务

- Status：VERIFIED
- Finding：先完成存款状态 transaction，再排队写年度利息。第二步失败时存款已赎回/续存。
- Evidence：[settle-deposit.ts](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/application/deposits/settle-deposit.ts:80)。
- Impact：状态可恢复，但用户必须理解并执行补记；与虚假同步反馈组合后风险升高。
- Direction：保留跨文档非原子边界，但增加持久、不可编辑的 pending-interest operation 与明确恢复状态。
- Test：每个步骤后的失败、刷新、重试、重复点击和目标存款已创建情形。

### AUD-P1-03 — 自动计算利息被当成显式 override 持久化

- Status：VERIFIED
- Finding：表单把预计利息设为只读并自动填充，提交时仍解析和持久化该值。
- Contract：ADR-004 要求 `null` 表示没有用户 override，由 UI 派生计算值。
- Evidence：[form.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/features/deposits/form.js:150)、[ADR-004](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/docs/adr/004-ui-savings-boundary.md:101)。
- Direction：自动参考值不写入；只有明确允许并由用户修改的 override 才持久化。
- Test：新增、编辑、期限/利率变化、显式 override、null aggregate。

### AUD-P1-04 — 同一 ledger facts 被多个模块不同解释

- Status：VERIFIED
- Finding：
  - Dashboard 只计算字符串 entry；导入允许数字，而 Analytics/Budget 可计算数字。
  - Dashboard 把未知字段算作支出；Analytics 忽略未知字段。
  - Analytics 对数值 0 的已记录日和备注日有自己的语义。
  - 非法 budget 在 Dashboard、Budget、Analytics 中的 fallback 不一致。
- Evidence：[dashboard-view-model.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/dashboard-view-model.js:33)、[analytics/model.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/features/analytics/model.js:93)、[budget.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/budget.js:131)。
- Impact：同一份 Firestore 数据可以在页面间显示不同总额。
- Direction：建立只读 canonical ledger interpreter，Dashboard、Budget、Analytics、Streak、Savings 共用。
- Test：数字/字符串、未知字段、0、非法值、负值、remark-only、闰日和预算 fallback。

### AUD-P1-05 — Rules 保护身份，但未保护 legacy 账本内容

- Status：VERIFIED
- Finding：任一 provisioned member 可创建或更新任意非 savings ledger 文档；Rules 不限制年度 ID、entries、balances、settings、金额或日期结构。
- Evidence：[firestore.rules](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/firestore.rules:169)。
- Impact：客户端缺陷或直接 SDK 写入可绕过所有 runtime 财务校验。
- Direction：至少限定 `shared_ledger_<year>`、允许字段和安全值；避免建立复杂 RBAC。
- Test：匿名、两个 member、第三 UID，以及非法 key、金额、日期、setting、整文档覆盖。

### AUD-P1-06 — 存款 Rules 没有完整业务状态机

- Status：VERIFIED
- Finding：日期只验证字符串格式和字典序；没有真实日历校验。`UPDATE_DEPOSIT` 可在满足新字段形状时重写历史状态；reminderDays 不拒绝重复值。
- Evidence：[firestore.rules](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/firestore.rules:39)、[firestore.rules](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/firestore.rules:92)。
- Direction：补真实可表达的 Rules 约束；Rules 做不到的状态机由 repository transaction 强制，并测试直接 SDK 绕过。
- Test：非法日历、状态回退、终态字段改写、重复 reminderDays、archive 后更新。

### AUD-P1-07 — archive 成功后可能被后续读取误报为失败

- Status：VERIFIED
- Finding：archive transaction 成功后执行额外 `get(id)`；若网络在两者之间失败，UI 报错，但归档已经提交。
- Evidence：[deposit-repository.ts](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/infrastructure/firebase/deposit-repository.ts:105)。
- Direction：像 create/update 一样直接返回 transaction 内构造的结果，或明确区分 committed-but-refresh-failed。
- Test：archive commit 成功、follow-up read 失败。当前 create/update 已有该测试，archive 没有。

### AUD-P1-08 — 储蓄进度的零目标和超额语义不符合 UI contract

- Status：VERIFIED
- Finding：目标为 0 时返回 100%；超额完成被裁剪为 100%，无法保留真实百分比。
- Evidence：[savings-goal.ts](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/domain/savings-goal.ts:43)、[savings/view.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/features/savings/view.js:32)。
- Direction：条形图可裁剪，文本保留真实比例；Owner 决定目标 0 是“未设置”还是特殊目标。
- Test：null、0、负实际、100%、150%、安全整数边界。

## 6. P2 Findings

- **VERIFIED — 隐私恢复数据无限保留。** 每次导入恢复把完整年度账本写入独立 localStorage key，没有 retention 或清除 UI。[sync.js](C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp/src/js/sync.js:243)
- **VERIFIED — 无 CSP。** 仓库没有 Content-Security-Policy，且仍有 inline event handlers；现有 escaping/XSS 测试降低风险，但不能替代 CSP。
- **VERIFIED — i18n 碎片化。** 核心 locale 文件之外，Savings、Deposits、Reminder、Settlement 各自维护 vi/zh map，增加漏翻和术语漂移概率。
- **SUSPECTED — 部分触控目标不足 44px。** CSS 中仍有 31px/42px 控件；因 Owner 选择人工核验，本审计不声称真实浏览器尺寸已失败。
- **VERIFIED — 图表颜色语义存在合同漂移。** 当前收入/支出色彩与绑定 UI 计划中的约定不一致，属于表达一致性问题，不影响金额。
- **VERIFIED — `safeEval`/formula 解释分散。** 多模块直接调用并形成不同 fallback，是长期回归热点。
- **VERIFIED — 状态文档滞后。** `TASK_STATUS.md` 和若干旧架构/审计材料不是当前实现事实。
- **SUSPECTED — 依赖漏洞状态未知。** 默认 npm 镜像不支持 audit API；官方 registry 请求在 120 秒内超时。本轮不能确认当前漏洞清单。

## 7. Hidden Regression Risks

最近 50 个提交的高频文件显示明显热点：

| 文件/区域 | 近 50 提交修改次数 | 风险 |
|---|---:|---|
| `src/css/app.css` | 16 | 全局样式、移动端、modal、输入、表格相互影响 |
| `src/js/main.js` / `TASK_STATUS.md` | 15 | 入口持续拆分；状态文档易落后 |
| `command-menu.js` / `index.html` | 10 | 全局 portal、焦点、响应式外壳 |
| deposit view/form/tests | 7–10 | 表单、状态、结算、i18n、高风险财务路径 |
| locales / savings view | 8 | 双语及金额显示回归 |
| `sync.js` / `quick-add.js` | 5 | 保存、snapshot、恢复和实际 ledger mutation |

此外，`c584441` 一次性修改 21 个文件，新增约 1,448 行 analytics/budget 代码。当前测试通过，但它扩大了“同一 ledger 规则被多处解释”的表面积。

最容易再发生的回归是：

1. 修好一个写入口，其他入口仍接受不同金额。
2. modal/CSS 修改修复桌面却破坏移动端或反向动画。
3. analytics 与 dashboard 对新字段、数字值和预算 fallback 产生分歧。
4. 同步错误在单账号测试通过，但双账号/多标签下覆盖数据。
5. 存款结算部分成功后，UI 状态与实际两个文档不一致。

## 8. Data Integrity Assessment

| 数据领域 | 当前可信度 | 结论 |
|---|---|---|
| Entries | 低至中 | Quick Add 校验较强；直接表格、导入缺乏统一整数契约 |
| Balances | 低至中 | 直接输入可保存原始公式、负数、小数和部分值 |
| Budget | 低 | 按月隔离正确，但金额验证、CNY 舍入和并发 settings 有缺口 |
| Savings goals | 中高 | store/domain 强制非负安全整数；进度显示语义仍有问题 |
| Deposits | 中高 | repository transaction、版本号和 Rules 较强；expected interest、archive、状态机仍有缺口 |
| Analytics | 中 | 正常数据的聚合实现完整；输入污染及与 Dashboard 的解释差异会影响结果 |
| Currency | 中高 | 显示切换不污染事实、Quick Add 单次换算有测试；预算 CNY 边界仍不安全 |
| Streak | 高 | Vietnam 时区、删除、历史补录、收入/支出、跨年均有确定性测试；跨年度产品语义仍应正式确认 |
| Sync | 低 | 写 Promise 本身存在，但 UI confirmation 语义、pending 生命周期和并发冲突不可信 |

直接回答：当前账里的数字不能被无条件相信。由 Quick Add、Savings store 和 Deposit repository 创建的规范数据较可信；直接表格、余额、预算或导入产生的数据必须先经过完整性扫描。

## 9. Synchronization Reliability Assessment

当前链路：

1. UI 先修改 `appState` 和 `pendingUpdates`。
2. 800ms debounce 后复制 batch 并立即清空 pending。
3. `setDoc(..., merge:true)` 成功时 queue 才认为该 batch 完成；失败则 merge back。
4. 同时运行的 realtime snapshot 可覆盖本地 `appState`。
5. snapshot 无条件把 UI 标为 synced。

“confirmed”的实际含义目前不统一：

- Queue 内部的 `synced`：所有 active `setDoc` Promise 已 resolve。
- Snapshot 中的 `synced`：只代表收到一次 snapshot，不代表 `hasPendingWrites === false`。
- Savings/Deposits 的 synced：各自控制器的本地 UI 状态，未必等于年度 ledger 已确认。
- Quick Add 的“记录成功”：实际只证明本地 mutation 和排队调用没有同步抛错。

主要 races：

- snapshot 覆盖仍未 flush 的本地值；
- settings 整张 map 旧值重发；
- 两个账号无版本控制的 last-write-wins；
- 页面关闭前 debounce 尚未 flush；
- 离线切年清空 pending；
- 存款状态已提交但利息仍在年度队列；
- latency-compensated snapshot 提前显示 synced。

因此，当前确实可能出现虚假同步状态。

## 10. Architecture Assessment

最大的架构问题不是 legacy matrix，而是 business rule fragmentation。

`shared_ledger_<year>` 对两名固定用户、按日×分类记账仍然简单、可审计、成本低。它的限制主要是逐笔追踪、复杂转账和账户级 reconciliation；这些当前都不属于产品需求。

值得建立的边界：

```text
UI command
   ↓
Canonical amount/date/ledger validation
   ↓
Legacy ledger mutation adapter
   ↓
pending patch + awaitable save result
   ↓
Firestore
```

派生侧应形成：

```text
Canonical read-only ledger interpreter
   ├─ Dashboard
   ├─ Budget
   ├─ Analytics
   ├─ Streak
   └─ Savings
```

不值得建立的抽象：

- 通用 Account/Transaction 平台
- 泛化 RBAC、organization、household 框架
- 微服务或额外 backend
- 任意插件系统
- 在当前规模下的通用事件溯源/企业审计系统
- 未先解决确认语义就建设复杂全功能 offline engine

## 11. Firebase / Security Assessment

- **Authentication：** 只有 email/password 登录，没有注册和成员管理 UI。登录失败按 Firebase error code 区分凭证错误与服务不可用。
- **Authorization：** 仓库 Rules 以不可由客户端读写的 member 文档作为真正安全边界；匿名和第三 UID 被拒绝。客户端 UI 不是安全边界。
- **两个账号：** 仓库 Rules 允许所有 provisioned member 读写共享账本；第二账号实际生产权限仍需 Owner/生产环境核验。
- **Legacy Rules：** 身份保护有效，但没有内容 schema。
- **Deposit Rules：** fixed document、版本、server timestamps、单目标 mutation 做得较强，但完整日历和状态历史仍不足。
- **XSS：** 多处使用 `innerHTML`，但动态内容通常经过 escaping；已有 render-XSS、CSV injection、dangerous import text 测试。未发现已确认的当前可利用 DOM XSS。
- **CSP：** 缺失；inline handlers 会增加落地严格 CSP 的工作量。
- **Import/export：** CSV 注入已有保护测试；JSON 导入的财务语义校验不足。
- **Secrets：** Firebase Web API key 是正常公开客户端配置，不应机械认定为 secret 泄漏；未发现私钥或服务账号凭证。
- **Logging：** 导入恢复测试明确避免输出财务内容；现有 console error 主要输出错误对象，仍应持续避免把 note、email、token 放入日志。
- **Dependencies：** build 使用锁定依赖成功；本轮在线漏洞扫描未形成有效结果。

生产 Rules 是否已部署、member 文档是否正确 provision，只能标记为：**需要 Owner / 生产环境 Rules 核验**。

## 12. UX / Mobile Assessment

代码和自动化证据表明：

- Quick Add 支持金额自动格式化、VND/CNY、焦点进入、Escape、焦点恢复、重复提交保护、失败保留草稿。
- 移动账本采用横向滚动，备注列最小宽度为 128px，符合正式 contract。
- 全局 modal 使用 body-level portal、焦点恢复、scroll lock 和可中断 FLIP。
- 大部分核心按钮采用约 44px touch target。
- 保存/同步反馈不可靠仍是最严重 UX 问题，因为它影响用户对数据是否已上云的判断。
- 直接表格在每次按键时即写入事实状态，对手机误触和部分输入不够稳健。
- 存款、分析和表格的密集界面仍有移动端裁切/触控风险。

按 Owner 指示，本轮没有进行真实浏览器核验。因此以下内容保持未确认：

- 是否能稳定在约 10 秒内完成一笔手机记账；
- 390px/窄屏长标签是否裁切；
- 实际 touch target、软键盘和焦点行为；
- modal 动画和快速中断的视觉连续性；
- 深浅色和双语真实布局。

这些由 Owner 人工核查，不计为本轮 VERIFIED 视觉结论。

## 13. Internationalization Assessment

- 默认语言为 Vietnamese，支持 Simplified Chinese；非法 locale 回退 vi，不存在英文 UI 模式。
- central dictionaries、动态 shell、Quick Add 分类刷新、确认框、日期选择器均有双语测试。
- 日期选择器和 `document.lang` 能随 locale 更新。
- 未发现当前核心 UI 被系统性切换为英文。
- 技术异常内部仍使用英文 message，但多数经 `depositErrorMessage` 或 locale toast 转换后显示。
- 主要风险是实现分散：Deposits、Savings、Reminder、Settlement 各自持有 vi/zh 对照表，central locale 的 key parity 测试无法保护它们。
- 术语、tooltip、empty/error state 未来应逐步收敛到统一目录，但不需要引入第三种语言或复杂翻译平台。

## 14. Test Coverage Assessment

本轮新鲜验证：

| Gate | 结果 |
|---|---|
| `npm test -- --run` | 76 files passed、4 skipped；507 tests passed、18 skipped |
| `npm run typecheck` | 通过 |
| `npm run typecheck:js` | 通过 |
| `npm run build` | 通过；bundle budget 通过 |
| `npm run test:rules` | 4 files、18 tests 全部通过 |
| `git diff --check` | 通过 |
| 最终 Git status | clean，`main...origin/main` |
| npm audit | 镜像 API 不支持；官方端点超时，未确认 |

构建仅有一个非阻断 warning：`charts.js` 同时被动态和静态 import，无法完全独立分块。

自动化保护较好的领域：

- Quick Add 有效/无效金额、重复提交、焦点和语言；
- currency 切换不修改 VND facts；
- streak 的时区、删除、历史补录、同日、跨年；
- Savings/Deposit domain 安全整数；
- Deposit repository/Roles/critical path；
- 导入恢复的备份、hash 和失败顺序；
- analytics 正常聚合、month budget、empty/no-income、remark-only；
- modal、confirmation、响应式 CSS contract。

实际缺少保护的核心逻辑：

1. 直接表格/余额的非法金额。
2. Budget 负数、小数、溢出和 CNY 舍入。
3. 导入的真实日历和 VND 财务语义。
4. Snapshot `hasPendingWrites` 与服务端确认。
5. 离线切年保存 pending。
6. settings 的多账号/多标签并发。
7. 用户删除存款利息 marker 后的重复补记。
8. archive commit 成功但 follow-up read 失败。
9. Dashboard/Analytics 对数字值、未知字段和非法预算的一致性。
10. Rules 的完整 legacy schema 和存款状态转换。
11. 真实浏览器/移动端验收——本轮由 Owner 人工执行。

测试全绿证明当前已编码行为稳定，不证明缺失的业务契约正确。

## 15. Technical Debt / Dead Code

真正值得处理的债务：

- 全局可变 `state` 使 snapshot、pending 和 UI 派生状态相互覆盖。
- `application-runtime.js`、deposit controller/form、`app.css` 是高修改频率集中点。
- `monthlyBudget` 与 `thao_monthly_budget` 仍作为兼容 fallback，增加预算解释分支。
- `safeEval` 和 legacy key 解析重复分布于多个模块。
- per-feature i18n maps 难以统一审计。
- 存款结算 operation 状态没有独立持久事实。
- `TASK_STATUS.md` 和历史计划不能代表当前实现。
- import recovery localStorage 没有生命周期管理。

未发现必须立即删除的独立“废弃系统”。兼容代码应在有数据迁移证据后逐步移除，不能把旧字段直接删掉。

## 16. Recommended Architecture Evolution

### Current Hardening

- 统一 VND、日期、预算、entry、balance、import validation。
- 让保存 API 返回 awaitable result，并严格区分 queued 与 confirmed。
- pending 与 snapshot 做 merge/rebase；禁止离线切年丢 pending。
- 固化存款利息 operation，不再依赖备注。
- 补 legacy Firestore schema Rules。
- 先做只读数据健康扫描，再决定是否修复现有数据。

### Incremental Cleanup

- 建立 canonical ledger interpreter 和 mutation adapter。
- 让 Dashboard/Budget/Analytics/Streak/Savings 共用同一规则。
- settings 改为 changed-key patch。
- 收敛 feature i18n dictionaries。
- 将高频 controller/form 拆为少量 use cases 和纯函数，不做大规模目录迁移。
- 为 import recovery 增加可见 retention/clear 能力。
- 渐进落地 CSP，并移除 inline handlers。

### Future ADR Candidates

只有出现明确产品需求时，才考虑：

- Account/Transaction/Transfer 模型；
- 通用离线 operation outbox；
- 账户级 reconciliation；
- 更完整的跨文档事务/后端协调。

这些都不是当前版本的施工前置条件。

## 17. Do Not Build

当前阶段不应继续建设：

- 开放注册、成员管理、organization/family/multi-household；
- 通用 RBAC；
- Account/Transaction 或复式记账迁移；
- T011/T012；
- 微服务、额外 backend、通用插件架构；
- 企业审计平台；
- 复杂通用离线同步引擎；
- AI 财务建议、银行同步、外部通知；
- 分类预算或其他新 analytics 指标；
- 在 P0 修复前继续扩大 ledger 写入入口。

## 18. New Master Task Plan

| ID | Priority | Task | Why | Scope | Verification | Suggested Executor |
|---|---|---|---|---|---|---|
| MTP-001 | P0 | 统一财务写入与导入契约 | 阻止非法 VND、日期和预算进入事实数据 | Direct edit、balance、budget、Quick Add、import 共用 validator/mutation adapter | 每个入口的负数、小数、溢出、日期、公式、CNY 边界测试；全量门禁 | Luna（Sol 串行审查） |
| MTP-002 | P0 | 修复保存确认和年度生命周期 | 消除离线丢数据与虚假 synced | awaitable save、snapshot metadata、pending merge、切年/关闭保护 | 离线、延迟、失败、乱序 snapshot、切年、刷新、多 batch 测试 | Luna（Sol 串行审查） |
| MTP-003 | P0 | 固化存款利息 operation 与恢复 | 防止重复收入及部分成功误导 | operation 状态、结算恢复、archive false failure、UI 状态 | marker 删除、重复重试、每步失败、刷新、archive read failure | Luna（Sol 串行审查） |
| MTP-004 | P1 | 建立 canonical ledger interpreter | 确保所有页面显示同一总额 | Dashboard、Budget、Analytics、Streak、Savings 共用 entries/budget 解释 | 同一 fixture 跨五模块 golden tests | Luna |
| MTP-005 | P1 | 加固 Firestore Rules | 客户端缺陷不能绕过财务契约 | legacy schema；deposit 日历、状态历史、reminder；保留两 member 模型 | Emulator allow/deny 回归；release checklist | Luna（Sol 串行审查） |
| MTP-006 | P1 | 验证双账号/多标签并发 | 当前 last-write 行为没有可审计保障 | settings patch、同 key 冲突提示、不同 key 合并 | 双客户端 Emulator/integration 测试 | Sol |
| MTP-007 | P2 | 隐私、CSP 与维护收敛 | 降低本地账本残留和 XSS 影响面 | recovery retention/clear、逐步 CSP、移除 inline handlers、i18n 收敛 | CSP report-only、XSS/CSV 回归、storage lifecycle 测试 | Luna |
| MTP-008 | P1 | 生产契约与人工 UX 验收 | 仓库无法证明线上 Rules 和真实移动体验 | 核验 Rules/member 文档；Owner 执行移动端/双语/modal 清单；授权前只读 | 生产 Rules hash/时间证据；签字式 viewport matrix | Human/Owner |
| MTP-009 | P2 | 文档和兼容路径清理 | 防止 DONE/旧 fallback 继续误导 | 更新状态文档；记录 superseded ADR；评估 monthlyBudget/localStorage 移除条件 | 文档与 current HEAD、tests、Rules 对照 | Luna |

## 19. Recommended Execution Order

### Phase 0 — 冻结与证据保护

- 暂停新增 ledger 写入口和 analytics 功能。
- Owner 核验生产 Rules/member provisioning。
- 运行只读年度数据健康扫描；先输出异常清单，不自动改数据。
- 保留现有备份和恢复证据。

### Phase 1 — P0 hardening

执行 MTP-001、MTP-002、MTP-003。每项完成后独立运行全量测试、typecheck、build、Rules tests，并由 Sol 串行审查高风险财务变更。

### Phase 2 — 一致性与安全边界

执行 MTP-004、MTP-005、MTP-006。目标是同一事实在所有页面一致、两个账号并发可预测、Rules 能拒绝非法事实。

### Phase 3 — 隐私、维护与人工验收

执行 MTP-007、MTP-008、MTP-009；完成 Owner 的真实移动端、双语和生产环境核验。

在 MTP-001～003 完成并通过回归前，不应继续开发新功能。生产 Rules 未核验前，不应宣称授权边界已在生产生效。

## 20. Owner Decisions Needed

仅以下事项真正需要 Owner：

1. 生产环境当前部署的 Rules 版本，以及两个 member 文档是否正确存在。
2. 只读扫描发现历史非法金额/日期后，是否授权单独的数据修复任务。
3. Streak 是否正式跨年度连续；当前代码支持跨年，但产品语义需固定。
4. 储蓄目标 `0` 应表示“未设置”还是有效零目标。
5. Analytics 的“有记录天数”是否包含 remark-only 日和金额为 0 的日。
6. import recovery 在 localStorage 保留多久、是否提供一键清除。
7. Owner 按本轮约定完成人工浏览器/移动端验收并记录结果。

其余技术问题无需推给 Owner，可由工程任务直接解决。

## 21. Final Verdict

### Q1

如果今天停止继续开发，最大的三个剩余风险是：

1. 非法金额、预算或导入数据仍可进入账本，导致不同页面计算出不同结果。
2. 离线切年、snapshot/pending race 和虚假 synced 会造成数据丢失或错误信任。
3. 存款利息幂等与跨文档结算不够稳固，可能漏记、重复记或显示错误完成状态。

### Q2

如果只允许再完成 5 个 Task，最值得完成的是：

1. MTP-001：统一财务写入与导入契约。
2. MTP-002：修复保存确认和年度生命周期。
3. MTP-003：固化存款利息 operation 与恢复。
4. MTP-004：建立 canonical ledger interpreter。
5. MTP-005：加固 Firestore Rules。

### Q3

**B. 暂停新功能，先进行 hardening。**

原因不是需要重大重构，而是现有产品功能已经足够，剩余最高风险集中在账务合法性、同步确认和规则一致性。继续增加功能会继续扩大同一 business rule 的实现副本。

本次审计未实施任何建议。最终工作树 clean。Goal 用量：488,211 tokens，约 53 分 15 秒。