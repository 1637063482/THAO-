# MyExpenseApp 整改与模块化任务计划

日期：2026-07-27

来源：`docs/PROJECT_CODE_AUDIT_2026-07-27.md`

状态：已规划，尚未开始实施

## 0. 上下文读取规则

- Implementer 先读本文件第 0～2 节，再搜索当前 `REM-*` 标题，只读取该标题到下一个 `## REM-*` 之前的内容。
- 不要为了执行一个任务通读其他 15 个任务，也不要读取旧 `TASK_PLAN.md` 的历史任务正文。
- Reviewer 只读当前任务段、`TASK_STATUS.md`、base..head diff 和受影响测试。
- 返修只读原阻断项、修复 diff 和受影响路径，不重复加载完整计划或旧 evidence。

## 1. 执行策略

如果整套任务只能选择一种配置，使用：

> **Implementer：Sol / high**

原因：计划同时涉及 Firestore Rules、存款持久化、Auth/监听器生命周期、账本金钱和日期边界、真实渲染验收及跨模块重构。使用 Terra / medium 一次性完成整套计划，容易在局部代码正确但端到端契约、资源卸载或数据边界上漏项。

推荐的成本优化方案：

| 任务类型 | Implementer | Effort | Reviewer |
|---|---|---:|---|
| 局部 UI、CSS、错误文案、单一监听器修复 | Terra | medium | 不需要独立 Reviewer |
| 已有边界内的中等规模模块提取 | Terra | high | 按风险决定 |
| Rules、金额/日期、数据一致性、跨模块架构 | Sol | high | Terra / high |
| 最终验收、完整 diff 与真实渲染复核 | Terra | high | Reviewer 身份，只审不改 |

任务分配总览：

| 配置 | 任务 |
|---|---|
| Sol / high | REM-001、REM-006、REM-008、REM-012、REM-014 |
| Terra / high | REM-003、REM-004、REM-007、REM-011、REM-013、REM-015、REM-016 |
| Terra / medium | REM-002、REM-005、REM-009、REM-010 |
| 独立 Terra Reviewer / high | REM-004、REM-006、REM-008、REM-012、REM-014、REM-016 |

规则：

- 每次只执行一个 `REM-*` 任务，不把 16 个任务塞进同一会话。
- 常规任务由一个 Implementer 完成；标记“独立审查：是”的任务才增加 Reviewer。
- 高风险 Reviewer 只读取该任务的验收标准、base..head diff 和受影响路径。
- 任何任务都不得自动部署 Firebase、修改线上 Auth/Rules/数据。
- 所有数据夹具必须是合成数据，不得出现真实邮箱、UID 或财务值。

## 2. 依赖与执行顺序

```text
REM-001
  ├─ REM-002
  ├─ REM-003
  ├─ REM-004
  └─ REM-005 ─ REM-006 ─ REM-007
REM-003 + REM-006
  └─ REM-008 ─ REM-009
REM-010 ─ REM-011
REM-006 ─ REM-012
REM-008 + REM-011 + REM-012
  └─ REM-013 ─ REM-014 ─ REM-015 ─ REM-016
```

执行批次：

1. 稳定数据链路：REM-001～REM-004。
2. 拆分 App Shell：REM-005～REM-007。
3. 拆分存款功能：REM-008～REM-009。
4. 拆分储蓄与账本：REM-010～REM-012。
5. 清理、类型和性能：REM-013～REM-015。
6. 最终独立验收：REM-016。

---

## REM-001：建立存款真实关键路径测试

| 字段 | 内容 |
|---|---|
| 优先级 | P0 |
| Implementer | Sol |
| Effort | high |
| 独立审查 | 否；REM-004 会统一审查 Rules/仓储边界 |
| 依赖 | 无 |

目标：使用真实表单、真实 `DepositRepository` 和 Firestore Emulator 证明“首次新增、第二次新增、刷新读回、切换语言编辑”完整可用。

创建文件：

- `tests/integration/deposit-critical-path.test.ts`
- `tests/helpers/deposit-emulator-fixture.ts`

修改文件：

- `package.json`

禁止修改：

- `firestore.rules`
- 线上 Firebase 配置
- 业务实现
- 真实账号或真实数据

执行步骤：

1. 在 `deposit-emulator-fixture.ts` 创建固定假 appId、假 UID、合成存款和逐测试清库函数。
2. 写测试 `creates the first deposit through the delivered form and repository`。
3. 运行以下定向模拟器命令，确认因缺少关键路径装配而 RED：

   ```powershell
   firebase emulators:exec --project demo-no-project --only firestore "vitest run tests/integration/deposit-critical-path.test.ts --maxWorkers=1 --no-file-parallelism"
   ```
4. 挂载真实 `renderDepositForm()` / `bindDepositForm()`，把解析结果交给真实 repository。
5. 验证首次新增后固定文档只包含一条记录。
6. 写测试 `creates a second deposit without replacing the first`，先确认 RED，再补测试装配。
7. 写测试 `reads both deposits after creating a fresh repository instance`，验证刷新语义。
8. 写测试 `edits a Vietnamese legacy term while the UI is Chinese`，验证持久化值为稳定代码。
9. 把该测试加入 `test:rules`，保持 `--maxWorkers=1 --no-file-parallelism`。

验收标准：

- 测试使用真实实现，不复制 repository 或 form 逻辑。
- 首次新增、第二次新增、重新实例化读回、双语编辑全部通过。
- 任何失败都能指出是表单、仓储还是 Rules 拒绝。
- 模拟器项目固定为 `demo-no-project`。

验证命令：

```powershell
firebase emulators:exec --project demo-no-project --only firestore "vitest run tests/integration/deposit-critical-path.test.ts --maxWorkers=1 --no-file-parallelism"
npm run test:rules
npm test -- --run
npm run typecheck
git diff --check
```

提交：

```text
test: cover the real deposit persistence path
```

---

## REM-002：存款错误分类与本地化反馈

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| Implementer | Terra |
| Effort | medium |
| 独立审查 | 否 |
| 依赖 | REM-001 |

目标：用户能区分权限拒绝、版本冲突、离线、校验错误和未知错误，不再只看到“保存失败”。

创建文件：

- `src/js/deposit-errors.js`
- `tests/unit/deposit-errors.test.js`

修改文件：

- `src/js/deposit-form.js`
- `src/js/deposit-view.js`
- `src/locales/vi.js`
- `src/locales/zh-CN.js`

执行步骤：

1. 写测试覆盖 `permission-denied`、`DEPOSIT_VERSION_CONFLICT`、`INVALID_DEPOSIT_*`、离线和未知错误。
2. 确认测试因映射模块不存在而 RED。
3. 实现 `depositErrorMessage(error, locale, context)`，只返回稳定消息 key 或安全文案。
4. 表单保存失败时显示分类结果并保留草稿。
5. 列表操作失败时显示具体类别，并保持同步状态为 error。
6. 验证越南语和中文完整，不增加英语 UI。

验收标准：

- 权限失败不显示成输入校验失败。
- 版本冲突提示用户刷新后重试。
- 未知错误不暴露 Firebase 内部路径、邮箱或 UID。
- 失败后表单内容和存款列表保持不变。

验证命令：

```powershell
npx vitest run tests/unit/deposit-errors.test.js tests/unit/deposit-form.test.js tests/unit/deposit-view.test.js
npm test -- --run
npm run build
git diff --check
```

提交：

```text
fix: show actionable deposit errors
```

---

## REM-003：锁定确认记录保留与存款 ID 不复用策略

| 字段 | 内容 |
|---|---|
| 优先级 | P2 |
| Implementer | Terra |
| Effort | high |
| 独立审查 | 否 |
| 依赖 | REM-001 |

目标：不引入 schema v2 或线上迁移，明确确认键作为审计记录保留；确保新存款 ID 由应用生成且不会复用，并在确认记录接近上限时给出可操作预警。

创建文件：

- `src/js/deposit-id.js`
- `tests/unit/deposit-id.test.js`
- `docs/adr/005-deposit-acknowledgement-retention.md`

修改文件：

- `src/js/main.js`
- `src/infrastructure/firebase/deposit-repository.ts`
- `src/js/deposit-schema.js`
- `src/js/deposit-view.js`
- `tests/integration/deposit-repository.test.ts`
- `tests/unit/deposit-view.test.js`

设计决定：

- `acknowledgementsByKey` 在删除存款后继续保留，作为“该提醒曾被确认”的审计记录。
- UI 不允许输入或覆盖 deposit ID；新增 ID 始终由 `createDepositId()` 生成。
- 不在本轮增加 schema v2、tombstone map 或线上迁移。
- 达到 450/500 时显示容量预警；达到 500 时继续由 repository 拒绝新增确认。

执行步骤：

1. 写 `createDepositId()` 格式、1000 次唯一性和无用户输入测试。
2. 确认现有 `newDepositId()` 位于 `main.js` 且不可独立验证，测试 RED。
3. 抽取 ID 生成器，优先 `crypto.randomUUID()`，fallback 仍需满足现有 ID regex。
4. 表单只接收 controller 生成的 ID；编辑时必须保留原 ID。
5. 写 repository 测试：删除后确认键保留，新建存款使用不同 ID。
6. 写 view-model 测试：确认记录数达到 450 时显示 vi/zh 容量预警，但不暴露确认键内容。
7. 在 ADR 记录未采用动态前缀删除的原因：Rules 无法安全遍历任意 map key，schema v2 对当前小项目收益不足以抵消迁移风险。

验收标准：

- 新增 ID 不来自表单或用户输入。
- 删除后确认键保留的行为有测试和 ADR，不再被当作偶然泄漏。
- UI 在 450 条时预警，500 条时 repository 仍安全拒绝。
- 不修改 `firestore.rules`、schemaVersion 或线上数据。

验证命令：

```powershell
npx vitest run tests/unit/deposit-id.test.js tests/unit/deposit-view.test.js
npm run test:rules
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

提交：

```text
refactor: define deposit acknowledgement retention
```

---

## REM-004：建立 Firebase Rules 发布前检查清单

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| Implementer | Terra |
| Effort | high |
| 独立审查 | 是，Terra / high |
| 依赖 | REM-001 |

目标：把“代码已修复”和“线上已生效”明确分开，为将来用户授权部署准备可重复检查；同时独立复核当前候选 Rules 的新增、删除和权限边界。

创建文件：

- `docs/FIREBASE_RULES_RELEASE_CHECKLIST.md`

修改文件：

- `SECURITY.md`（仅补充发布边界和回滚入口）

执行步骤：

1. 记录候选 Rules commit SHA、模拟项目和门禁命令。
2. Reviewer 核对 `firestore.rules`、规则测试和 repository 集成测试完整路径。
3. 写明部署前必须由用户确认的 Firebase project ID，不在文档保存真实 UID/邮箱。
4. 写明导出当前线上 Rules、比较候选 diff、验证两个授权账号契约的方法。
5. 写明部署后仅使用合成/空白验证账号检查的路径和回滚条件。
6. 明确本任务不执行 `firebase deploy`。

验收标准：

- 清单包含部署前、部署中、部署后和回滚四段。
- 明确需要新的用户部署授权。
- 不含真实身份和财务数据。
- 不把模拟器通过描述为线上通过。

验证命令：

```powershell
npm run test:rules
npx vitest run tests/unit/ci-workflow.test.js
git diff --check
```

提交：

```text
docs: define the Firebase Rules release gate
```

---

## REM-005：区分页面导航与一次性命令

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| Implementer | Terra |
| Effort | medium |
| 独立审查 | 否 |
| 依赖 | REM-001 |

目标：`overview/savings/stats` 是 destination；导入、导出、分享、语言、主题和隐私是 command。

创建文件：

- `src/js/commands.js`
- `tests/unit/commands.test.js`

修改文件：

- `src/js/navigation.js`
- `tests/unit/navigation.test.js`
- `index.html`

执行步骤：

1. 写测试断言 `NAV_ITEMS` 只包含三个页面 destination。
2. 写命令测试覆盖 import file click、export、share、language、theme、privacy。
3. 确认现有混合模型导致 RED。
4. 从 `navigation.js` 移除 import/export 分支。
5. 用 `bindCommands(root, dependencies)` 绑定一次性命令。
6. 更新真实 `index.html` 的 `data-nav` / `data-command`。
7. 验证命令执行后当前 destination 不变。

验收标准：

- 侧栏和底栏只表达页面。
- 命令不进入 active route 状态。
- 键盘 Enter/Space 行为一致。
- 不增加新的 `window.*` 全局入口。

验证命令：

```powershell
npx vitest run tests/unit/navigation.test.js tests/unit/commands.test.js tests/unit/app-shell.test.js
npm test -- --run
npm run build
git diff --check
```

提交：

```text
refactor: separate navigation destinations from commands
```

---

## REM-006：提取 App Shell 组件和路由

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| Implementer | Sol |
| Effort | high |
| 独立审查 | 是，Terra / high |
| 依赖 | REM-005 |

目标：把顶部栏、侧栏、底部栏和路由从静态巨型标记及 `main.js` 中拆出，保持功能和 DOM ID 兼容。

创建文件：

- `src/app/router.js`
- `src/components/app-shell/header.js`
- `src/components/app-shell/sidebar.js`
- `src/components/app-shell/bottom-nav.js`
- `src/components/app-shell/command-menu.js`
- `tests/unit/app-router.test.js`
- `tests/unit/app-shell-components.test.js`

修改文件：

- `index.html`
- `src/js/main.js`
- `src/js/navigation.js`
- `src/js/i18n.js`
- `tests/unit/app-shell.test.js`

执行步骤：

1. 为真实 `index.html` 写唯一 host、ARIA landmark 和页面 ID 契约测试。
2. 为 router 写 overview/savings/stats 切换和 unknown route RED 测试。
3. 实现 router，不调用存款、图表等业务逻辑，只触发注入的生命周期回调。
4. 逐个提取 header、sidebar、bottom-nav、command-menu 渲染函数。
5. 保留现有关键 ID，避免同步、年份、登录逻辑断链。
6. 将 `switchMobileView()` 替换为 router。
7. 删除本任务造成的重复静态标记和全局函数。

验收标准：

- `main.js` 不再直接控制三个页面的 display。
- desktop sidebar 和 mobile bottom-nav 由同一 destination 数据生成。
- 每个页面切换只触发自己的 enter/leave 回调。
- 真实 `index.html` 无重复 ID、嵌套 label 或不可达按钮。

验证命令：

```powershell
npx vitest run tests/unit/app-router.test.js tests/unit/app-shell-components.test.js tests/unit/app-shell.test.js tests/unit/navigation.test.js
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Reviewer 必查：

- 是否只是移动代码而未引入双重事件绑定；
- Auth 登录/退出后路由是否仍可初始化和卸载；
- 现有 vi/zh DOM 更新是否仍覆盖新组件。

提交：

```text
refactor: extract the application shell and router
```

---

## REM-007：重新组织顶部工具区与响应式信息层级

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| Implementer | Terra |
| Effort | high |
| 独立审查 | 否 |
| 依赖 | REM-006 |

目标：缩短移动端顶部区域，减少桌面首屏空白，把低频命令归入 command menu。

修改文件：

- `src/components/app-shell/header.js`
- `src/components/app-shell/command-menu.js`
- `src/css/app.css`
- `index.html`（仅 host/无脚本 fallback）
- `tests/unit/app-shell-components.test.js`
- `tests/unit/app-shell.test.js`

创建文件：

- `tests/fixtures/app-shell-synthetic-state.js`

执行步骤：

1. 用合成状态挂载真实 App Shell。
2. 建立 390×844、768×1024、1440×900 的基线检查。
3. 将年份、同步状态保留在一级；导入、导出、分享、语言、主题、隐私移入工具菜单。
4. 调整 header padding、换行和 safe-area。
5. 修正桌面首页内容顺序，消除无业务意义的空白。
6. 验证菜单焦点管理、Escape 关闭和点击外部关闭。

验收标准：

- 390×844 顶部不超过 120px，除非系统 safe-area 更大。
- 三个验收尺寸 `scrollWidth <= clientWidth`。
- command menu 支持键盘操作和可见焦点。
- 截图只使用合成数据并由真实渲染器生成。

验证命令：

```powershell
npx vitest run tests/unit/app-shell-components.test.js tests/unit/app-shell.test.js
npm test -- --run
npm run build
git diff --check
```

提交：

```text
fix: simplify the responsive application header
```

---

## REM-008：提取存款功能控制器

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| Implementer | Sol |
| Effort | high |
| 独立审查 | 是，Terra / high |
| 依赖 | REM-006、REM-003 |

目标：把 `main.js` 中存款订阅、表单、提醒、结算、续存、归档和删除移入一个可挂载/卸载控制器。

创建文件：

- `src/features/deposits/controller.js`
- `src/features/deposits/dependencies.js`
- `tests/unit/deposit-controller.test.js`

移动并调整：

- `src/js/deposit-form.js` → `src/features/deposits/form.js`
- `src/js/deposit-view.js` → `src/features/deposits/view.js`
- `src/js/deposit-terms.js` → `src/features/deposits/terms.js`
- `src/js/deposit-sync.js` → `src/features/deposits/sync.js`
- `src/js/deposit-reminder-controller.js` → `src/features/deposits/reminder-controller.js`

修改文件：

- `src/js/main.js`
- `src/js/state.js`
- `src/infrastructure/firebase/deposit-repository.ts`（保留基础设施边界，仅调整 controller 所需接口）
- `src/application/deposits/build-reminders.ts`
- `src/application/deposits/settle-deposit.ts`
- 所有对应 import 和测试路径

执行步骤：

1. 写 controller `start(user)` 只订阅一次的 RED 测试。
2. 写 `stop()` 取消 snapshot、关闭表单、清理提醒和重置 UI 状态的 RED 测试。
3. 写重复 `start()` 先 stop 旧资源的测试。
4. 注入 repository、clock、ledger writer、locale、confirm 和 DOM hosts。
5. 移动现有函数，不改变存款金额、状态或结算语义。
6. `main.js` 只创建 controller，并在 Auth 回调调用 `start/stop`。
7. 更新测试 import，确认没有旧路径残留。

验收标准：

- `main.js` 不包含存款 CRUD、settlement 或 reminder 分支。
- 登录、退出、重新登录不会叠加 listener。
- controller 测试验证每项资源都有对应 cleanup。
- REM-001 关键路径保持通过。

验证命令：

```powershell
npx vitest run tests/unit/deposit-controller.test.js tests/unit/deposit-form.test.js tests/unit/deposit-view.test.js tests/unit/deposit-reminder-controller.test.js tests/unit/deposit-settlement.test.js
npm run test:rules
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Reviewer 必查：

- Auth 生命周期；
- unsubscribe 和 dialog cleanup；
- 金额/利率/date-only 契约未改变；
- 没有意外写入 legacy 支出或把本金作为收入。

提交：

```text
refactor: isolate the deposit feature lifecycle
```

---

## REM-009：拆分存款样式与视图子组件

| 字段 | 内容 |
|---|---|
| 优先级 | P2 |
| Implementer | Terra |
| Effort | medium |
| 独立审查 | 否 |
| 依赖 | REM-008 |

目标：卡片、表格、表单和提醒拥有独立样式文件，避免继续膨胀 `app.css`。

创建文件：

- `src/features/deposits/deposit-card.js`
- `src/features/deposits/deposit-table.js`
- `src/features/deposits/deposits.css`
- `tests/unit/deposit-card.test.js`
- `tests/unit/deposit-table.test.js`

修改文件：

- `src/features/deposits/view.js`
- `src/features/deposits/form.js`
- `src/css/app.css`
- `src/js/main.js` 或 feature 入口的 CSS import

执行步骤：

1. 为 card/table 相同记录和 action 可见性写 parity 测试。
2. 抽取纯渲染函数并保持 escapeHtml 边界。
3. 移动 `.deposit-*` CSS 到 feature CSS。
4. 删除 `app.css` 中已移动且不再引用的规则。
5. 验证隐私模式选择器覆盖新结构。

验收标准：

- 移动卡片和桌面表格字段、状态、动作一致。
- 终态记录仍没有删除操作。
- CSS 移动前后 390/1440 无布局回归。
- `app.css` 不再包含存款内部组件样式。

验证命令：

```powershell
npx vitest run tests/unit/deposit-card.test.js tests/unit/deposit-table.test.js tests/unit/deposit-view.test.js
npm test -- --run
npm run build
git diff --check
```

提交：

```text
refactor: split deposit views and styles
```

---

## REM-010：修复储蓄同步观察器生命周期

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| Implementer | Terra |
| Effort | medium |
| 独立审查 | 否 |
| 依赖 | 无 |

目标：重复刷新储蓄视图时始终只有一个 `MutationObserver`，退出或卸载后为零。

修改文件：

- `src/js/savings-view.js`
- `src/js/main.js`
- `tests/unit/savings-view.test.js`

执行步骤：

1. 写测试连续安装两次 bridge，并统计前一个 disconnect。
2. 写 logout/unmount 后 sync 状态变化不再更新旧 root 的测试。
3. 确认当前编排无法清理而 RED。
4. 保存 `installSavingsSyncBridge()` 返回的 cleanup。
5. 每次重绘前调用旧 cleanup；Auth logout 时再次 cleanup。
6. cleanup 设计为幂等。

验收标准：

- 任意时刻最多一个 savings sync observer。
- 重绘、切换用户和退出均不会更新已脱离 DOM 的 root。
- 不改变储蓄金额计算或保存语义。

验证命令：

```powershell
npx vitest run tests/unit/savings-view.test.js tests/unit/sync-state.test.js
npm test -- --run
git diff --check
```

提交：

```text
fix: clean up the savings sync observer
```

---

## REM-011：提取储蓄功能模块

| 字段 | 内容 |
|---|---|
| 优先级 | P2 |
| Implementer | Terra |
| Effort | high |
| 独立审查 | 否 |
| 依赖 | REM-010、REM-006 |

目标：储蓄目标使用独立 controller/view/store，对外只提供 `start/update/stop`。

创建文件：

- `src/features/savings/controller.js`
- `src/features/savings/view.js`
- `src/features/savings/store.js`
- `src/features/savings/savings.css`
- `tests/unit/savings-controller.test.js`

修改/移动：

- `src/js/savings-view.js`
- `src/js/savings-goal-store.js`
- `src/domain/savings-goal.ts`
- `src/js/main.js`
- `src/css/app.css`
- 相关测试 import

执行步骤：

1. 写 controller 首次渲染、month update、remote update、stop 的测试。
2. 注入 dashboard view model、settings、pendingUpdates 和 cloud-save callback。
3. 移动 store/view，不改变 VND 整数和目标结构。
4. 将 observer cleanup 收口到 controller。
5. 从 `main.js` 删除 `refreshSavingsView()`。
6. 移动 `.savings-*` 样式。

验收标准：

- `main.js` 不再计算月/年储蓄或直接渲染储蓄 DOM。
- controller stop 后没有 observer 或事件监听器。
- 清空目标的 vi/zh 确认语义不变。
- `settings` 和 `pendingUpdates` 写入契约不变。

验证命令：

```powershell
npx vitest run tests/unit/savings-controller.test.js tests/unit/savings-view.test.js tests/unit/savings-goal-store.test.js tests/unit/domain/savings-goal.test.ts
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

提交：

```text
refactor: isolate the savings feature
```

---

## REM-012：提取账本输入、月份和年份控制器

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| Implementer | Sol |
| Effort | high |
| 独立审查 | 是，Terra / high |
| 依赖 | REM-006 |

目标：把输入保存、月份切换、年份切换、日期刷新和 legacy ledger 生命周期从 `main.js` 移到明确模块，保留年度矩阵。

创建文件：

- `src/features/ledger/controller.js`
- `src/features/ledger/input-controller.js`
- `src/features/ledger/year-controller.js`
- `tests/unit/ledger-controller.test.js`
- `tests/unit/ledger-input-controller.test.js`
- `tests/unit/ledger-year-controller.test.js`

修改文件：

- `src/js/main.js`
- `src/js/render.js`
- `src/js/sync.js`
- `src/js/quick-add.js`
- `src/js/state.js`
- `src/js/day-ledger.js`
- `src/js/clock.js`

执行步骤：

1. 写输入事件测试：input 更新本地状态，focusout 触发 streak/持久化。
2. 写月份切换测试：表格、日视图、预算、dashboard 一致刷新。
3. 写年份切换测试：保存中禁止切换、清理旧状态、重新订阅正确年度。
4. 写越南午夜变化测试：无需刷新页面即可切换 today。
5. 注入 sync、clock、renderer、dashboard 和 savings callbacks。
6. 逐段移动函数，每移动一段运行对应定向测试。
7. 删除由本任务替代的 `window.*` 接口；HTML inline handler 先改为事件绑定。

禁止修改：

- `shared_ledger_<year>` 数据形状
- T011/T012 账户/交易模型
- VND 持久化语义
- 线上数据

验收标准：

- `main.js` 不再直接处理 ledger input、month/year 或 midnight。
- 快速记账和表格直接编辑仍写同一 legacy entries。
- VND/CNY 切换不改变 pending VND。
- 跨年和连续记账回归全部通过。

验证命令：

```powershell
npx vitest run tests/unit/ledger-controller.test.js tests/unit/ledger-input-controller.test.js tests/unit/ledger-year-controller.test.js tests/unit/legacy-streak.test.js tests/unit/local-date.test.js tests/unit/currency-view.test.js
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Reviewer 必查：

- 年度矩阵 key 未改变；
- focusout、quick-add、remote snapshot 三条路径；
- 越南 date-only 和跨年边界；
- CNY 只读展示边界。

提交：

```text
refactor: isolate the legacy ledger lifecycle
```

---

## REM-013：证明并删除废弃账户/交易架构

| 字段 | 内容 |
|---|---|
| 优先级 | P2 |
| Implementer | Terra |
| Effort | high |
| 独立审查 | 否 |
| 依赖 | REM-008、REM-011、REM-012 |
| 状态 | 已完成（2026-07-27） |

目标：在生产入口依赖图证明无引用后，删除 ADR-003 已放弃的 account/transaction 主线代码。

删除候选：

- `src/domain/account.ts`
- `src/domain/transaction.ts`
- `src/domain/money.ts`（删除前必须证明存款/货币模块无引用）
- `src/application/accounts/manage-account.ts`
- `src/application/transactions/create-transaction.ts`
- `src/application/transactions/update-transaction.ts`
- `src/infrastructure/firebase/account-repository.ts`
- `tests/integration/account-repository.test.ts`
- `tests/unit/domain/account.test.ts`
- `tests/unit/domain/transaction.test.ts`
- `tests/unit/domain/money.test.ts`

创建文件：

- `docs/DEAD_CODE_REMOVAL_2026-07-27.md`
- `scripts/check-production-imports.mjs`
- `tests/unit/production-imports.test.js`

执行步骤：

1. 从 `index.html` / `src/js/main.js` 建立静态生产 import 图。
2. 写测试断言废弃模块不在生产可达集合。
3. 全仓搜索动态 import、字符串路径和文档契约。
4. 单独确认 `money.ts` 是否仍被 currency/deposit 使用；有引用则保留并在文档说明。
5. 删除确认不可达的代码和只验证废弃设计的测试。
6. 更新 ADR/计划中的当前状态，不改写历史 review 文件。

验收标准：

- 每个删除文件都有依赖图证据。
- 当前生产和测试无断裂 import。
- 不删除 `currency.ts`、`deposit.ts`、`savings-goal.ts` 或 `errors.ts`。
- 不重新设计 Transaction repository。

验证命令：

```powershell
npx vitest run tests/unit/production-imports.test.js
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

提交：

```text
refactor: remove the abandoned transaction architecture
```

---

## REM-014：让 JavaScript 主链路进入类型门禁

| 字段 | 内容 |
|---|---|
| 优先级 | P2 |
| Implementer | Sol |
| Effort | high |
| 独立审查 | 是，Terra / high |
| 依赖 | REM-013 |

目标：分阶段对主要 JavaScript 开启类型检查，不用一次性 TypeScript 重写。

创建文件：

- `tsconfig.jscheck.json`
- `src/types/app-state.d.ts`
- `src/types/dom-contracts.d.ts`

修改文件：

- `package.json`
- `src/app/**/*.js`
- `src/components/**/*.js`
- `src/features/**/*.js`
- 必要的 `src/js/*.js`

执行步骤：

1. 新增 `typecheck:js`，初始只 include `src/app` 和 `src/components`。
2. 运行并保存首轮错误分类：真实契约错误、缺少 JSDoc、第三方类型问题。
3. 先修真实契约错误，再补最小 JSDoc。
4. 扩大 include 到 `src/features/deposits`、`savings`、`ledger`。
5. 禁止用全文件 `@ts-nocheck` 或大范围 `any` 消除错误。
6. 将 `npm run typecheck:js` 加入 CI 和完成门禁。

验收标准：

- app/components/features 主链路全部在 `checkJs` 范围。
- 没有新增全文件类型忽略。
- DOM host、controller dependencies、state 和 repository 返回值有明确契约。
- 现有 TypeScript `strict` 保持开启。

验证命令：

```powershell
npm run typecheck
npm run typecheck:js
npm test -- --run
npm run build
git diff --check
```

Reviewer 必查：

- 是否用 `any` 掩盖真实错误；
- runtime JS 是否因类型修复改变业务行为；
- CI 是否真正执行新门禁。

提交：

```text
chore: typecheck the JavaScript application path
```

---

## REM-015：按功能动态加载并建立 bundle 预算

| 字段 | 内容 |
|---|---|
| 优先级 | P2 |
| Implementer | Terra |
| Effort | high |
| 独立审查 | 否 |
| 依赖 | REM-014 |

目标：延迟加载非首屏图表、存款结算和动画，并用测试锁定包体积预算。

创建文件：

- `scripts/check-bundle-budget.mjs`
- `tests/unit/bundle-budget.test.js`
- `docs/BUNDLE_BUDGET.md`

修改文件：

- `vite.config.js`
- `package.json`
- `src/app/router.js`
- `src/features/deposits/controller.js`
- `src/js/charts.js`
- `src/js/fireworks.js`

执行步骤：

1. 记录当前 849.32 kB 主 chunk 基线。
2. 写预算脚本读取 `dist/.vite/manifest.json` 和产物大小。
3. 建立初始预算：主入口 minified 小于 650 kB；任何单一业务 chunk 小于 350 kB。
4. stats 路由首次进入时动态 import Chart.js。
5. 存款结算对话框首次打开时动态 import settlement 模块。
6. 达到 streak 奖励时再加载 fireworks。
7. 验证动态加载失败有安全降级，不影响 VND 记账和存款查看。

验收标准：

- 主入口小于 650 kB；若实测可稳定更低，再收紧文档预算。
- overview 首屏不下载 Chart.js 和 fireworks。
- 路由/功能首次加载后不重复下载或重复绑定。
- build 产物预算进入 CI。

验证命令：

```powershell
npm run build
node scripts/check-bundle-budget.mjs
npx vitest run tests/unit/bundle-budget.test.js tests/unit/dashbaord.test.js tests/unit/legacy-streak.test.js
npm test -- --run
git diff --check
```

提交：

```text
perf: lazy-load noncritical application features
```

---

## REM-016：最终真实渲染与回归验收

| 字段 | 内容 |
|---|---|
| 优先级 | P1 |
| 执行者 | Terra Reviewer |
| Effort | high |
| 业务代码修改 | 禁止；发现问题退回对应任务 |
| 依赖 | REM-001～REM-015 |

目标：独立证明整改后的功能、布局、资源生命周期、数据边界和构建门禁满足计划。

创建文件：

- `docs/task-reviews/REM-016-R1.md`

审查范围：

- `main.js` 是否成为薄 composition root；
- App Shell、deposits、savings、ledger 模块边界；
- Rules/repository allow/deny；
- Auth start/stop 和所有 observer/unsubscribe；
- 真实关键路径与双语；
- 390×844、768×1024、1440×900 布局；
- 类型和 bundle 预算；
- 无真实数据、无部署。

执行步骤：

1. 固定 reviewed head SHA，确认工作树干净。
2. 读取本计划各任务验收标准，不读取旧 evidence 全文。
3. 检查 `base..head` 完整 diff 和生产 import 图。
4. 使用合成状态挂载真实渲染器。
5. 运行全部门禁并记录退出码和计数。
6. 一次列出全部阻断项；无阻断项则 APPROVED。

验收标准：

- 全部门禁 exit 0。
- 三个 viewport 无水平溢出、关键控件可见且键盘可达。
- 存款两次新增、读回、双语编辑通过模拟器。
- 登录/退出/重绘后 listener 和 observer 不增长。
- 主入口满足 bundle 预算。
- 无 Firebase deploy、无线上数据修改。

验证命令：

```powershell
npm test -- --run
npm run test:rules
npm run typecheck
npm run typecheck:js
npm run build
node scripts/check-bundle-budget.mjs
git diff --check
```

提交：

```text
review: approve the maintenance remediation
```

## 3. 首个任务启动语句

```text
执行 docs/MAINTENANCE_TASK_PLAN_2026-07-27.md 的 REM-001。
使用 Sol，effort=high。只处理 REM-001，不部署 Firebase。
先确认当前 main 和工作树，再按 RED→GREEN 建立真实存款关键路径测试。
完成定向测试和该任务门禁后更新 TASK_STATUS.md 并提交，随后停止。
```

## 4. 总体完成定义

只有满足以下全部条件，整改计划才算完成：

- REM-001～REM-015 均达到各自验收标准并提交；
- REM-004、REM-006、REM-008、REM-012、REM-014 完成独立审查；
- REM-016 独立审查为 APPROVED；
- `main.js` 仅保留应用装配和启动；
- Rules、仓储、关键 UI 路径具备真实模拟器覆盖；
- app shell、deposits、savings、ledger 可独立挂载/卸载；
- JavaScript 主链路进入类型门禁；
- 主入口满足 bundle 预算；
- 全程没有未经授权的线上部署或真实数据修改。
