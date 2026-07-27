# MyExpenseApp 代码审查结论与行动方向

日期：2026-07-27

审查基线：用户确认保留的当前 `main` 工作树

审查范围：运行链路、存款、界面布局、模块边界、测试门禁、Firestore Rules、分支与 Agent 工作流

详细实施任务：`docs/MAINTENANCE_TASK_PLAN_2026-07-27.md`

## 1. 结论

项目可以继续维护，但目前属于“功能已经较多，外壳仍是早期单页脚本”的状态。最严重的实际故障不是表单按钮本身，而是 Firestore Rules 只允许在首次创建存款文档时新增存款；文档存在后再新增第二笔会被规则拒绝。因此用户看到的是“新增存款无法保存”，而界面只显示泛化错误。

本次已经完成最小修复和回归保护：

- 允许在已有 `shared_ledger_savings` 文档中新增第二笔及后续存款；
- 新增真实仓储 + Firestore 模拟器集成门禁，防止 UI 单测通过而规则仍拒绝写入；
- 永久删除只允许用于 `ACTIVE` 存款，客户端和规则保持一致；
- 存款期限改为稳定代码（如 `1Y`），显示时再按越南语/中文本地化，兼容既有本地化文本；
- 修复存款下拉框未继承输入框样式造成的高度、边框和间距错乱；
- 修复一个存款表单测试的假阳性：旧测试把不存在的值赋给 `<select>`，提交回调根本未执行；
- 修复“导入/导出动作被当成页面并永久高亮”的导航状态错误；
- 调整旧连续记账测试，使它使用当前真实的 `focusout` 保存语义。

注意：本次没有部署 Firebase。仓库中的 Rules 修复必须在用户单独授权并完成发布检查后，才会影响线上应用。

## 2. 实际功能链路

当前应用是原生 ES Module + Vite 的单页 PWA：

```text
index.html
  └─ src/js/main.js（启动、全局事件、路由、业务编排）
       ├─ auth.js / firebase.js
       ├─ sync.js → 年度账本 shared_ledger_<year>
       ├─ render.js / dashboard.js / budget.js
       ├─ savings-view.js → 储蓄目标
       └─ deposit-* + DepositRepository
            └─ shared_ledger_savings + firestore.rules
```

账本继续使用既有的按年度文档和日期/分类矩阵；存款是独立的固定文档。存款本金没有接入支出，预计利息没有接入收入，符合当前产品边界。

## 3. 已确认问题

### P0：新增第二笔存款被 Rules 拒绝（已修复）

`validSavingsCreate()` 只覆盖第一次创建固定文档；原 `validSavingsUpdate()` 没有 `CREATE_DEPOSIT` 分支。仓储第二次调用 `create()` 时只能执行文档更新，因此被拒绝。

修复位于 `firestore.rules` 的 `validDepositInsert()` 和 `validSavingsUpdate()`。规则测试明确覆盖“已有一笔后再新增第二笔”，仓储集成测试覆盖新增、删除和非法删除。

### P1：存款期限持久化了翻译文本（已修复）

旧表单把“1 năm / 1年”等界面文案直接保存为 `productName`。切换语言后，已有值不再匹配新语言的 `<option>`，编辑时可能变为空值并再次无法保存。

现在 `src/js/deposit-terms.js` 统一保存稳定期限代码并负责本地化显示，同时把旧越南语、中文期限转换为代码；自定义产品仍可编辑和显示。

### P1：存款表单排版不一致（已修复）

真实渲染中，`select` 没有存款输入框的 CSS，移动端高度约为普通文本行，桌面端也缺少边框、圆角和内边距。现在 `input/select/textarea` 使用同一组最小高度和控件样式。

### P1：删除规则与客户端状态约束不一致（已修复）

客户端只允许删除有效存款，但原规则允许删除已赎回或已续存记录。现在 UI 不再给终态记录显示删除按钮，仓储和规则都只接受 `ACTIVE`。

### P1：规则与仓储集成测试没有进入同一门禁（已修复）

旧 `test:rules` 没有运行 `tests/integration/deposit-repository.test.ts`，所以单独的表单测试无法证明真实事务会通过 Rules。加入门禁后又发现多个测试文件共享模拟项目并行清库，已通过禁用文件并行解决。

### P1：`main.js` 是过载的组合根（待拆分）

`src/js/main.js` 同时负责：

- 23 个左右的 `window.*` 全局接口；
- 应用启动与 Auth 生命周期；
- 年/月切换和输入保存；
- 储蓄目标渲染；
- 存款订阅、表单、结算、续存、归档、删除；
- 导入、导出、主题、隐私和导航联动。

这使一个局部功能修改容易触发整页副作用，也迫使测试大量模拟全局 DOM。它应保留为很薄的 composition root，业务控制器移入 feature 模块。

### P1：储蓄同步 MutationObserver 会重复安装（待修复）

`refreshSavingsView()` 每次重绘都会调用 `installSavingsSyncBridge()`，但没有保存并调用返回的 disconnect 函数。实时快照又会触发 `window.softUpdateDOM()` 和储蓄重绘，长时间使用后观察器会累积并重复更新状态。

### P1：真实端到端覆盖不足（待补）

现有 app-shell/navigation 测试主要拼接手写 HTML，不是把真实 `index.html` 和真实控制器一起挂载。它们可以在真实标记或布局已损坏时仍通过。需要增加基于模拟 Auth/Firestore 的关键路径测试：

1. 首次新增存款；
2. 已有记录后新增第二笔；
3. 刷新后读回；
4. 越南语/中文切换后编辑；
5. 移动端与桌面端无水平溢出。

### P2：旧领域模型与当前产品架构并存（待移除）

`src/domain/account.ts`、`transaction.ts`、`money.ts`，`src/application/accounts`、`transactions` 和 `src/infrastructure/firebase/account-repository.ts` 只被它们自己的测试引用，没有进入当前应用运行链路。它们来自已放弃/被替代的账户交易架构，增加认知负担。

不能只按“看起来没用”直接删除。应先生成生产入口依赖图，确认无动态引用，再在独立提交中删除代码、对应测试和无效文档引用。

### P2：JavaScript 主链路没有类型检查（待改进）

`tsconfig.json` 设置 `allowJs: false`、`checkJs: false`。当前多数 UI、同步和编排代码是 JavaScript，因此 `npm run typecheck` 只覆盖 TypeScript 领域/仓储代码，不能证明主运行链路的参数和 DOM 契约正确。

### P2：导航模型混合“页面”和“动作”（部分修复）

导入/导出已修复为不改变当前高亮，但 `NAV_ITEMS` 仍把 route 和 action 放在同一结构中。模块化时应明确区分 `destinations` 与 `commands`，顶部工具区承载命令，侧栏/底栏只承载页面。

### P2：单包体积和首屏耦合（待优化）

当前 Vite 构建没有业务级动态导入或 `manualChunks`，主包超过 500 kB。存款结算、图表、烟花动画等非首屏功能可按功能模块延迟加载。性能优化应在模块拆分之后进行，避免只做人工分包掩盖耦合。

### P2：永久删除遗留提醒确认记录（待设计）

删除存款目前保留 `acknowledgementsByKey`。如果未来复用同一存款 ID，旧确认键可能抑制提醒；确认记录上限也会被无效项占用。建议删除时在同一事务内清理该 ID 前缀的确认键，并为 Rules 增加“只能同步删除目标存款的确认键”约束。

## 4. 界面审查

使用真实应用渲染器分别检查了 390×844 和 1440×900：

- 两个尺寸均未发现页面级水平溢出；
- 移动端侧栏正确隐藏，底部导航可用；
- 桌面端侧栏宽度稳定，主内容区没有挤出视口；
- 移动端顶部区域约占首屏五分之一，信息密度偏低；
- 桌面首页的储蓄/存款内容位于较深位置，中间存在较多纵向空白；
- 存款表单本身可滚动，但旧下拉框明显比其他输入控件矮，已修复；
- 审查未保留任何真实财务值、邮箱、UID 或含真实数据的截图。

布局方向：

- 顶部只保留品牌、同步状态、年份和少量全局命令；
- 桌面侧栏和移动底栏只放“首页、储蓄、分析”等页面；
- 导入、导出、语言、主题、隐私归入工具菜单；
- 首页先放本月摘要和快捷记账，储蓄/存款进入独立页，避免一页无限向下堆叠；
- 表格、卡片、表单分别建立局部 CSS 文件和组件边界。

## 5. 建议模块结构

保持原生模块，不引入新框架，先按功能切开：

```text
src/
  app/
    bootstrap.js
    auth-lifecycle.js
    router.js
  components/
    app-shell/
      header.js
      sidebar.js
      bottom-nav.js
      command-menu.js
  features/
    ledger/
      controller.js
      view.js
      store.js
    dashboard/
      controller.js
      view.js
    savings/
      controller.js
      view.js
      store.js
    deposits/
      controller.js
      form.js
      view.js
      terms.js
      repository.ts
  shared/
    dom/
    i18n/
    format/
    firebase/
```

`main.js` 最终只负责创建依赖、启动 Auth、挂载路由和卸载资源，不直接包含具体表单事务。

## 6. 后续行动顺序

### 工作包 A：线上修复准备

- 在纯模拟器环境完成“两次新增 + 刷新读回 + 双语编辑”的端到端测试；
- 给存款错误建立本地化错误映射，区分权限、版本冲突、校验和离线；
- 单独提交 Rules 发布清单；只有得到用户授权后才部署。

完成标准：模拟器端到端路径通过，线上发布动作与代码提交解耦。

### 工作包 B：先拆 App Shell

- 提取 header/sidebar/bottom-nav/command-menu；
- 页面 destination 与一次性 command 分离；
- 用真实 `index.html` 做 DOM 契约测试；
- 修正移动顶部高度与桌面首屏信息层级。

完成标准：导航和外壳不依赖 23 个 `window.*` 接口，移动/桌面无溢出。

### 工作包 C：拆存款功能

- 把 `main.js` 中存款订阅、表单、结算和提醒生命周期移到 `features/deposits/controller.js`；
- controller 显式提供 `start(user)` / `stop()`；
- 删除确认键随存款清理；
- 表单、卡片、表格 CSS 独立。

完成标准：`main.js` 不再包含存款业务分支，所有仓储写入均有模拟器集成测试。

### 工作包 D：拆储蓄与账本

- 修复并测试 MutationObserver 的卸载；
- 将储蓄目标 controller/store/view 分开；
- 将账本输入保存和月年切换从全局函数迁出；
- 保留既有年度矩阵，不引入已放弃的账户/交易模型。

完成标准：功能模块可独立挂载/卸载，切换用户或页面后无残留监听器。

### 工作包 E：清理与性能

- 删除确认无运行引用的旧 account/transaction/money 代码和测试；
- 为主要 JavaScript 开启 `checkJs`，或按功能逐步迁移 TypeScript；
- 对图表、结算、动画等非首屏模块动态导入；
- 设定可执行的 bundle 预算。

完成标准：生产依赖图无废弃模块，主运行链路进入类型门禁，构建不再依赖单一超大 chunk。

## 7. Agent 工作流审查

旧流程即使已经“轻量化”，仍要求每个小任务都建立 Coder 和 Reviewer 两个会话，双方重复读取状态、计划、完整 diff、测试和证据；同时保留每轮 review 文件。对本项目规模而言，成本高于收益，而且未经测量的 Token 对比数字不能作为流程依据。

`AGENTS.md` 和 `AGENT_WORKFLOW.md` 已改为风险分级：

- 常规改动：一个 Implementer 会话完成复现、TDD、自审、验证和提交；
- Rules/Auth/迁移/金额结算/安全/大架构：才增加独立 Reviewer；
- TASK_STATUS 只保留当前状态，不保存重复 evidence 和聊天摘要；
- Reviewer 首轮一次列全问题，返修只读新增 diff 和受影响路径；
- 全量门禁在完成前运行一次，开发中只跑定向测试；
- 不再写未经测量的 Token 节省比例。

该模式保留了财务应用真正需要的高风险独立审查，同时消除日常 UI/小缺陷的机械往返。

## 8. 本次验证与发布边界

完成提交前必须通过：

- 存款、导航、应用外壳等定向 Vitest；
- 全量 `npm test -- --run`；
- `npm run test:rules`（模拟项目，包含存款仓储集成）；
- `npm run typecheck`；
- `npm run build`；
- `git diff --check`；
- 移动端与桌面端真实渲染复核。

本次允许执行 Git 提交、合并和安全分支清理；不包含 Firebase Hosting/Rules/Auth/数据部署。
