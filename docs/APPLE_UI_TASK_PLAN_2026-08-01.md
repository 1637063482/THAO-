# Apple UI 全面风格化实施计划（第二轮 2026-08-01）

## 背景

第一轮 Apple 风格化（APPLE-UI-001..012，见 `APPLE_UI_TASK_PLAN_2026-07-31.md`）曾提交后回退，
当前工作区为重新应用的未提交版本，已完成：Apple 字体栈、iOS 语义色板 token、暗色模式、
毛玻璃 header/底部导航、Apple 风格开关、应用内确认对话框、VND 格式化输入。

本轮在现有基础上补齐用户明确要求的差距，**不允许破坏现有业务行为与数据契约**。

## 本轮需求（用户原话要点）

1. 全面 Apple 风格化：所有界面的按钮、输入框、下拉框、字体、文字布局。
2. 下拉选项**不用原生自带的**，改为自建 Apple 下拉样式。
3. 存款界面银行选择**不要下拉按钮**，改为**点击输入框进行下拉选择**。
4. 移动设备（如 iPhone 15 Pro Max，430px 视口）上所有文字布局**不压缩、不跨行、无溢出**。
5. 先建 task plan，逐项实施，完成后自行 review。

## 现状差距清单（已通读代码确认）

| 编号 | 差距 | 位置 |
| --- | --- | --- |
| G-1 | 原生 `<select>` 5 处：年份选择、快速记账天/分类、存款期限、存款筛选、续存产品 | `src/components/app-shell/header.js`、`index.html`、`src/features/deposits/form.js`、`src/features/deposits/view.js` |
| G-2 | 银行选择为「输入框 + 独立 ⌄ 按钮」，需改为点输入框弹出 | `src/features/deposits/form.js` `deposit-bank-toggle` |
| G-3 | 遗留暖色/旧风格：存款 amber 系、表格硬编码色、预算条暖底、分析页渐变、month-card、streak 等 | `src/features/deposits/deposits.css`、`src/css/app.css`、`src/features/savings/savings.css` |
| G-4 | 移动端（430px）布局压缩/跨行风险：存款指标、长金额、头部标题、预算条 | `src/css/app.css`、各 feature css |
| G-5 | 自建下拉组件需覆盖所有原生 select 的行为契约（键盘、无障碍、值不变） | 新增共享组件 + 迁移点 |

## 设计决策

1. **自建 Apple 下拉**（本轮核心）：新建共享下拉组件，形态 = Apple 风格的
   「圆角字段 + chevron」按钮式触发，点击弹出锚定列表（毛玻璃浮层、选中打勾、
   hover/焦点态、滚动容器），键盘（↑↓ Enter Escape）与屏幕阅读器（aria-expanded、
   role=listbox/option、aria-selected）完整保留。**option 值与存储/提交格式完全不变**。
   - 年份选择：保留现有"隐藏 select 覆盖层"的辅助作用？**否**——改为完整自建控件，
     由 `year-controller.js` 改为操作新控件（保留同一 `changeYear` 契约，事件仍为 change 语义）。
   - 快速记账（天/分类）、存款期限/筛选/续存产品：换成自建下拉触发字段。
   - 日期 `input[type=date]` 保留原生 iOS 日期选择器（Apple 官方体验，不属于"下拉选项"）。
2. **银行选择**：移除 `deposit-bank-toggle` 按钮，`input` 点击/聚焦即弹出列表；
   输入过滤仍可用（输入自定义银行名时收起列表），点击选项回填并触发 input 事件（契约不变）。
3. **统一 Apple 表面**：全部语义 token 化（`--color-*`、`--radius-*`），消灭遗留 amber/
   硬编码 slate；金额使用 tabular-nums 且允许缩小字号而非压缩（`min-width:0` + 容器滚动）；
   禁用渐变装饰（分析页头改为语义色纯色块）。
4. **移动端优先（430px 基准）**：所有卡片/表单/指标在 430px 下不换行不溢出；
   表格容器内部横向滚动（保留），页面主体无横向溢出（`overflow-x: clip` 兜底仅限已知容器）。
5. 不提交、不推送 git；不改 Firebase 配置/数据契约/隐私模式/键盘可达性。

## 任务序列

### AUI-201: 自建 Apple 下拉组件（共享基础件）

Files: `src/components/feedback/app-dropdown.js`（新）、`src/css/app.css`、相关测试（新增 `tests/unit/apple-dropdown.test.js`）。

1. 实现渲染与绑定原语：`renderAppDropdown({ id, options, value, labelKey, ... })` →
   按钮式触发字段 + 弹出列表；`bindAppDropdown(host, { onChange })` 处理打开/关闭/
   键盘/外部点击/Escape/选中回填。
2. CSS：`.app-dropdown`（触发字段 44pt、圆角 10px、chevron）、`.app-dropdown-menu`
   （毛玻璃浮层、圆角 12px、选项 hover/focus、选中 `✓`）、暗色适配、焦点环。
3. 自测：值契约（change 事件携带与原 select 相同的字符串值）、键盘路径、aria 状态。

Acceptance: 组件无原生 `<select>`；单元测试覆盖选择、键盘、关闭、值回填。

### AUI-202: 迁移 5 处原生 select

Files: `index.html`、`src/components/app-shell/header.js`、`src/features/deposits/form.js`、
`src/features/deposits/view.js`、`src/features/ledger/year-controller.js`、`src/js/quick-add.js`、`src/js/application-runtime.js`、相关测试。

1. 年份选择（header）：自建下拉替换隐藏 select；`year-controller.js` 保持 `changeYear`
   契约，改为操作新控件（populateOptions/refreshLabels 适配）。
2. 快速记账（天/分类）：`openQuickAdd()` 改为填充自建下拉选项；`submitQuickAdd()` 读取
   新控件的值（提交格式不变）。
3. 存款期限（add/edit form）：`productName` 自建下拉；`parseDepositForm` 读取值不变；
   `recalcMaturity` 监听新控件 change。
4. 存款筛选（view）：`data-deposit-filter` 自建下拉；`onFilter` 契约不变。
5. 续存产品（settlement rollover）：自建下拉；`parseDepositSettlementForm` 不变。
6. 同步更新涉及 `querySelector("select")` / `HTMLSelectElement` 的绑定代码。

Acceptance: 源码中不再出现原生 `<select>`（日期输入除外）；所有既有值/提交路径不变；
相关测试全绿。

### AUI-203: 银行选择 = 点击输入框弹出

Files: `src/features/deposits/form.js`、`src/features/deposits/deposits.css`、`tests/unit/apple-ui-selectors.test.js`。

1. 删除 `deposit-bank-toggle` 按钮；输入框 `click`/`focus` 打开列表，输入过滤时仍可输入
   自定义银行名（键入即收起或过滤——取"键入即收起"，保留原行为）。
2. CSS 调整：输入框右侧 chevron 提示（非按钮，纯装饰指针事件穿透）、列表样式沿用
   AUI-201 菜单规格。
3. 键盘：输入框获得焦点后 ↑↓ 在列表中移动、Enter 选择、Escape 关闭并还原焦点。

Acceptance: 无独立下拉按钮；点击/聚焦输入框即出下拉；自定义银行名仍可输入；
`parseDepositForm` 的 `institutionName` 契约不变。

### AUI-204: 遗留暖色/旧风格全面清理

Files: `src/features/deposits/deposits.css`、`src/css/app.css`、`src/features/savings/savings.css`、
`index.html`（分析页头）、`src/js/render.js`（预算条/表格）、`src/js/render/streak.js`、`src/js/dashboard.js`、`src/components/app-shell/*.js`（命令菜单内联样式类）、相关测试。

1. 存款：metrics 卡、卡片、表格、sheet、提醒对话框、warning 提示全部改语义 token
   （`--color-surface*`、`--color-separator`、语义色），去 amber；金额保持语义强调色。
2. 表格：`th/td/tfoot/sticky` 用 `--color-*` token（分组表格质感，表头毛玻璃）；
   行 hover/zebra 用 token。
3. 预算条、month-card、skeleton、empty-state、streak、stat-card、auth 覆盖层：统一 token。
4. 分析页渐变头 → 语义色纯色块（去 `bg-gradient-to-r`）。
5. 命令菜单内联 `bg-slate-100/80` 等 → token 类。

Acceptance: 全局无 amber 渐变/装饰残留（grep 校验）；light/dark 一致；业务行为不变。

### AUI-205: 移动端（iPhone 15 Pro Max 430px）布局修复

Files: `src/css/app.css`、`src/features/deposits/deposits.css`、`src/features/savings/savings.css`、`index.html`、相关渲染器。

1. 存款指标：430px 下 2 列，金额 `overflow-wrap: anywhere` 改 `min-width:0` + 必要时
   tabular 缩小（`.deposit-metrics strong` 允许 `font-size` 自适应到不跨行）。
2. 存款卡 `dl` 3 列 → 430px 保持 3 列但压缩列距，金额单行（不换行）；
   卡片动作区换行改为水平滚动或 2×2 网格。
3. 头部：标题 `text-xl` 与年份控件不互相挤压（`min-w-0` + ellipsis）；
   `#sync-status` 已有截断，复核。
4. 预算条：430px 下换行策略已有 `flex-basis:100%`，复核提示文字不压缩。
5. 快速记账 sheet、存款表单 sheet：430px 下各字段单行、`max-height` 滚动；
   自建下拉菜单在底部 sheet 内不超出视口（`max-height: min(42dvh, 18rem)` 保留）。
6. 全页 `overflow-x` 检查：无页面级横向滚动条。

Acceptance: 430×932 视口下无文字压缩跨行、无页面级横向溢出（人工/代码检查 + 测试）。

### AUI-206: 测试与最终自检 review

Files: 测试文件、按缺陷修复的源码文件、`docs/APPLE_UI_TASK_PLAN_2026-08-01.md`。

1. 新增/调整测试：自建下拉组件、银行输入弹出、迁移点值契约、token 清理（grep 断言）。
2. 运行 `npm test`（全部单元测试）、`npm run typecheck`、`npm run typecheck:js`、
   `npm run build`（含 bundle budget）、`git diff --check`。
3. 代码级 viewport 走查：430/390/768/1024/1440/1920，light/dark，vi/zh-CN，
   隐私模式，键盘路径。
4. 最终 self-review 完整 diff；不 commit、不 push。

Acceptance: 全部 gate 通过；无遗留原生 select（grep）；无 amber/渐变残留（grep）；
430px 无溢出（断言/走查）。

## 验收红线（全程不变）

- VND 唯一持久货币；vi 默认语言，zh-CN 可选。
- 不修改 Firebase Rules/Auth/生产数据/部署配置。
- 保留键盘可达、屏幕阅读器语义、隐私模式、桌面/移动全部功能可达性。
- 不 commit / 不 push。

## 实施状态与最终 self-review（2026-08-01）

| 任务 | 状态 | 验证 |
| --- | --- | --- |
| AUI-201 自建下拉组件 | COMPLETE | `tests/unit/apple-dropdown.test.js` 12 用例（渲染/值契约/键盘/Escape/外部点击/禁用/防重复绑定） |
| AUI-202 迁移 5 处 select | COMPLETE | 源码与 index.html 无 `<select>`（仅组件注释提及）；quick-add/年份/期限/筛选测试全绿 |
| AUI-203 银行点击输入框弹出 | COMPLETE | 独立按钮删除（测试断言 `data-bank-picker-toggle` 为 null）；点击/箭头/Escape 用例新增 |
| AUI-204 暖色/旧风格清理 | COMPLETE | grep 无 amber/渐变/硬编码暖色残留；tailwind 死色板删除；update-toast/命令菜单/fx 面板 token 化 |
| AUI-205 430px 移动端 | COMPLETE | 金额 nowrap+tabular+clamp 字号；动作区 flex-wrap；`tests/unit/apple-ui-mobile.test.js` 锁定 |
| AUI-206 全量验证 | COMPLETE | vitest 382 通过 / typecheck ✓ / typecheck:js 0 错误 / build+budget ✓ / git diff --check ✓ |

### 最终 self-review 记录

1. **值契约**：所有自建下拉的选项值（年份数字、日期数字、期限代码 `1M/1Y…`、筛选 `all/active/…`、分类 id）经 hidden input 传递，
   与迁移前 `<select>` 提交的字符串完全一致；`parseDepositForm`/`parseDepositSettlementForm`/`submitQuickAdd`/`onFilter` 未改语义。
2. **键盘与无障碍**：下拉触发 `role=combobox + aria-expanded + aria-haspopup`，菜单 `role=listbox`，选项 `role=option + aria-selected`；
   ↑↓/Home/End/Enter/Space/Escape/Tab 全覆盖；Escape `stopPropagation` 不影响外层弹层（快速记账/存款表单）。
   银行输入框 `role=combobox + aria-autocomplete=list + aria-controls`。
3. **焦点陷阱兼容**：`bindDialogKeyboard` 的 Tab 循环与下拉菜单共存——菜单展开时 Tab 关闭菜单；选项按钮在 `[hidden]` 内不进 Tab 序列。
4. **隐私模式**：金额输入框的隐私规则未改动；下拉展示内容（年份/日期/期限/筛选）均非敏感。
5. **XSS**：所有下拉 label/value 经 `escapeHtml` 或 `textContent` 输出（含自定义产品名、银行名）。
6. **TS7 特性适配**：`typecheck:js` 暴露 TS7 原生编译器不向闭包传播外层类型窄化，已用守卫后别名（`hostEl/triggerEl/…`）与
   JSDoc 转换修复，0 错误。
7. **移动端**：金额类文字全部 `tabular-nums + white-space: nowrap`（指标卡/存款卡/对账卡），必要时 `clamp()` 缩字号而非压缩；
   表格横向滚动限于 `.table-scroll`/`.deposit-table-wrap` 容器内，无页面级溢出。
8. **未改动**：日期 `input[type=date]` 保留 iOS 原生选择器；Firebase/数据/路由/命令绑定不变；`git diff --check` 干净。

## 布局复查轮（2026-08-01，用户反馈后）

用真实渲染函数生成静态审计页 + Headless Chrome 在 430px（iPhone 15 Pro Max）截图逐区块验证。

### 发现并修复的问题

| 问题 | 修复 |
| --- | --- |
| 越南语 "Số ngày ghi chép liên tục" / "THAO, hôm nay chưa ghi chép nhé~" / "Hôm nay đã điểm danh" 跨行 | streak 面板头部改为 `flex-wrap` + 状态块 `ml-auto`：一行放不下时状态文本整体换行右对齐；标签 `whitespace-nowrap` |
| "Thẻ ngân hàng cuối năm" / "Tiền mặt & khác cuối năm" 标签跨行 | 新增 `.asset-label`（nowrap + flex 居中），≤640px 字号降至 0.75rem，应用到 index.html 全部 8 个资产标签 |
| "Xác minh kép" badge 挤压 | badge 加 `whitespace-nowrap` |
| 中文空状态 "记录存款后可查看总本金、预计收益和到期日期。" 末字+句号孤行 | `.deposit-empty p` 加 `text-wrap: balance` + `max-width: 24rem` + `line-height: 1.5` |
| 存款期限/筛选下拉"非常大" | **（根因修正）** `renderAppDropdown` 输出的 chevron 是裸 `<svg class="app-dropdown-chevron-svg">`，而尺寸规则写成 `.app-dropdown-chevron svg`（要求外层 span 包裹）→ 从未匹配 → SVG 被 flex 撑到 273×273px，把 trigger 按钮一起撑大。修复：直接对 `.app-dropdown-chevron-svg` 设 `width/height: 1rem + flex-shrink: 0`，旋转态与颜色规则同时覆盖裸 svg 与 span 包裹两种输出；撤销了此前误判的"菜单宽度"改动（菜单恢复全宽、选项恢复 44px/0.95rem） |
| 存款卡金额/日期 `overflow-wrap: anywhere` 导致数字中间断行 | 改为 nowrap + ellipsis 兜底（AUI-205 已做，复查确认） |

### 复查结论（430px 截图）

streak 面板、资产卡、存款管理（含下拉展开态）、存款表单、快速记账下拉、储蓄页、月份标签、底部导航、仪表盘英雄区/统计卡——均无压缩、无孤行、无溢出；下拉展开为紧凑 Apple 风格菜单。

### 回归

vitest 398 通过 / typecheck ✓ / typecheck:js 0 错误 / `git diff --check` 干净。

## 交互复查轮 2（2026-08-01）

| 问题 | 修复 |
| --- | --- |
| 银行输入框点击后下拉无法收回 | 点击改为**切换**（`setBankPickerOpen(Boolean(bankOptions?.hidden))`），再点一次即收起 |
| 银行输入框无"选择银行"提示 | 输入框加 `placeholder="${labels.chooseBank}"`（vi: Chọn ngân hàng / zh: 选择银行）；`.deposit-form-grid input::placeholder` 补灰色样式 |
| 快速记账界面高度太低、日期/分类菜单需大量滚动、菜单向上弹出不可见 | **（根因修正）** 绝对定位菜单在滚动容器（面板/sheet）内：向下溢出可滚动可见，但向上溢出容器顶部**永远不可滚动**（scrollTop 不能为负）→ 不可见。修复：展开菜单改为 **fixed 悬浮层**（`.app-dropdown-menu-fixed`，JS 计算 left/width/top），脱离容器裁剪、视口内上下自适应（下方放不下则弹到上方，两处都不够则贴边）、滚动页面自动收起；菜单 `max-height` 提到 `min(56dvh, 24rem)`；面板移动端加 `min-height: 60dvh` |
| 银行输入框"选择银行"提示与期限占位样式不一致 | 内容格式对齐：银行占位改为 `-- Chọn ngân hàng --` / `-- 请选择银行 --`（与期限 `-- Chọn kỳ hạn --` 同格式） |
| 快速记账日期/分类下拉无法打开 | **（根因修正）** fixed 菜单在 DOM 上仍位于面板（overflow 容器）内 → fixed 定位逃不出祖先 overflow 裁剪 → 菜单位置超出面板内容区即被裁剪且不可见。修复：`bindAppDropdown` 将菜单 **reparent 到 `<body>`**（WeakMap `PARTS` 记录 trigger/menu/hidden 供 `setAppDropdownOptions`/`getAppDropdownValue` 等继续使用），`z-index: 120`（高于弹层 z-100/80），unbind 时归还菜单防孤儿节点；选项键盘事件不再经过 host → keydown 监听同时挂到菜单上；window scroll 监听去掉 capture（内部容器滚动不误关菜单）、focus 加 `preventScroll` |
| 图标尺寸 bug：`data-icon-class="w-3.5 h-3.5"` 渲染成 `w-5 h-5 … w-3.5 h-3.5` 冲突（图标恒为 20px） | `initIcons` 改为 `iconFn('', cls)`——`data-icon-class` 传入 size 槽位而非 className 槽位，图标尺寸正确 |

### 回归

vitest 398 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓ / `git diff --check` 干净。

## 预算输入框加大（2026-08-01）

`#monthly-budget-input` 原固定 `width: 90px`，长数字显示不全。改为**内容自适应宽度**：JS（`fitBudgetInputWidth`，budget.js 与 input-controller 各一份镜像实现，避免跨层导入把 src/js 依赖链拉进 jscheck）按 `字符数 × 7.5px + 20px` 动态设置 `style.width`，输入时（input 委托）、保存格式化后（saveBudgetAndCalculate）、渲染后（updateBudgetUI）都会跟随；`font-variant-numeric: tabular-nums`。
- 首轮下限 96px 导致 "1,500,000"（约 80px）被撑宽、数字靠右留出左侧空白——与"自适应"矛盾。
- **修正**：下限降至 48px（防单数字输入时过窄），宽度严格贴合内容（CSS `min-width: 48px` 同步）。截图验证：1,500,000 → 80px 无左侧空白、空值按 placeholder 95px、长数字随内容变宽至上限 160px。

## 年份下拉菜单宽度（2026-08-01）

年份 trigger 仅 ~57px 宽，`positionMenu` 按 trigger 宽度设置菜单 inline width（56.8px），选项数字显示不全需横向滚动。修复：`.app-dropdown-menu` 加 `min-width: 7.5rem`（120px）——min-width 优先于 inline width，其他下拉 trigger 均 ≥120px 不受影响；删除菜单移出后失效的 `.app-header-year-control .app-dropdown-menu` 旧定位规则。截图验证 56.8px inline 宽度下菜单实际渲染 120px，选项完整。

## 年份菜单精简（2026-08-01）

按用户要求：年份选中项去掉 ✓ 标记（`app-dropdown-menu-year` 类隐藏 `.app-dropdown-option-check`），仅保留蓝色高亮；年份菜单 `min-width` 收窄至 `5.5rem`（88px，比全局 7.5rem 小）。截图验证：88px 菜单内 6 个年份选项完整、选中项蓝色显示。

## 登录界面 Apple 风格重设计（2026-08-01）

按用户要求重做登录页（原为"卡片 + 小图标 + 标签输入"的单调布局）：

- **iOS 风格应用图标**：76px 蓝色圆角方块（圆角 22%）+ 白色钱包图标 + 阴影
- **Large Title 标题 + 副标题**：1.75rem 粗体标题、灰色副标题，无卡片背景（内容直接居中于毛玻璃层）
- **分组圆角输入组**：邮箱 + 密码上下贴合（iOS Settings 风格，圆角边框 + 中间分隔线），聚焦字段提亮、整组聚焦蓝框
- **密码可见切换**：组内右侧眼睛按钮（eye/eyeOff 切换，`aria-pressed` + 本地化 aria-label），新增 `show_password`/`hide_password` keys
- **占位符本地化**：i18n 新增 `data-i18n-placeholder` 支持；邮箱/密码输入用 placeholder 提示（label 改 sr-only 保留无障碍）
- **主按钮**：全宽圆角 12px、1.0625rem 加粗；错误提示改为 danger 色调横幅
- 保留测试依赖的 id（auth-overlay/auth-email/auth-password/auth-error）与全部鉴权逻辑

430×932 截图验证亮色布局；暗色由 `--color-*` token 自动适配。回归：vitest 399 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓ / `git diff --check` 干净。

## 汇率面板（fx-panel）修复（2026-08-01）

用户反馈：币种/汇率切换面板显示挤压（汇率标签 + 模式按钮 + 输入框挤在一行），且自动/手动按钮切换无明显变化。

- **布局**：面板改为两行（第一行 `1 CNY = 汇率值`，第二行模式 chips + 手动输入框 + 应用按钮，`flex-wrap` 兜底），输入框/按钮独立类（`.fx-rate-input`/`.fx-apply-btn`）替代内联 tailwind 类
- **模式切换**：`changeFxMode` 现在同步切换 `fx-mode-auto`/`fx-mode-manual` 的 `active` 类（蓝底高亮）——此前从未切换，按钮视觉无变化
- 430px 截图验证 auto/manual 两种状态；回归 vitest 399 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓

## 汇率面板显隐修复（2026-08-01）

用户反馈：币种为 VND 时汇率面板仍显示。根因：`.app-fx-panel` 设置了 `display: flex`，与 Tailwind `.hidden`（display: none）特异性相同且声明更靠后 → 覆盖了 hidden，面板永远显示。

修复：`.app-fx-panel.hidden { display: none; }`（提高特异性）；`switchCurrency` 简化为 `fxPanel.classList.toggle("hidden", curr !== "CNY")`。截图验证：VND 时面板隐藏、CNY 时显示。回归 vitest 399 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓。

## 年份下拉选中态修复（2026-08-01）

用户反馈：年份下拉始终高亮 2026，而非当前选中年份。根因：`select()` 选中年份后只更新 hidden value 与标签，**菜单选项的 `aria-selected` 未同步**——重新打开时高亮仍是初始渲染状态。

修复：新增 `syncSelected(host, value)`（遍历选项按值同步 aria-selected），在 `select()` 与 `setAppDropdownValue()` 中调用；新增测试断言选中后及重新打开时选中标记跟随所选值。回归 vitest 400 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓。

## 自建 Apple 日期选择器 + 原生控件全盘清理（2026-08-01）

用户要求"所有"Apple 风格化：日期选择不能用浏览器原生样式。

### 新增 app-datepicker 组件（`src/components/feedback/app-datepicker.js`）

- **日历弹层**：月标题 + ‹/› 月导航、本地化星期头（vi: T2–CN / zh: 一–日）、42 格日期网格；今天圆形描边、选中蓝色圆形白字、非本月淡出、`minDate` 前日期禁用
- **触发字段**：与 app-dropdown 一致的圆角按钮（显示本地化日期如 `15/08/2026` / `2026/08/15`，空值显示占位 `ngày/tháng/năm` / `年/月/日`）
- **值契约**：hidden input 存 `YYYY-MM-DD`（parseDepositForm 等解析不变），选择后派发 change（recalcMaturity/recalcExpected 自动跟随）
- **悬浮层**：日历 reparent 到 body + fixed 定位（复用 app-dropdown 模式，不被 sheet 裁剪），键盘 ↑↓←→/Enter/Escape、外部点击关闭、滚动收起
- **迁移 5 处日期字段**：存款表单 openedOn/maturesOn、结算 settledOn（minDate=到期日）、续存 openedOn/maturesOn
- 删除废弃的 `.deposit-date-control`/`input[type=date]` 样式；新增 `.app-datepicker-*` 日历样式

### 全盘原生控件扫描结果

| 控件 | 状态 |
| --- | --- |
| `input[type=date]` | ✅ 全部迁移到 app-datepicker（源码 0 残留） |
| `input[type=number]`（qa-amount、fx 汇率） | ✅ 隐藏原生 spinner（appearance: none） |
| `input[type=checkbox]`（提醒/利息开关） | ✅ 已是 Apple switch |
| `<select>` | ✅ 0 残留（此前已全部迁移） |
| `confirm()`/`alert()` | ✅ 全部走应用内确认对话框 |

### 验证

新增 `tests/unit/apple-datepicker.test.js`（9 用例：渲染/本地化/打开/选择/月导航/minDate/Escape/键盘）；`apple-ui-dates.test.js` 重写为自建控件断言。430px 截图验证日历弹层。回归 vitest 409 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓ / `git diff --check` 干净。

## 日期选择器宽度对齐触发字段（2026-08-01）

用户反馈：日历弹层宽度与日期输入框不一致。根因：`positionCalendar` 写死 `width: "auto"` + CSS 17rem（272px）。

修复：`positionCalendar` 设置 `width = Math.max(triggerRect.width, 240)`（与下拉菜单一致：菜单宽 = 触发控件宽）；日期格子由 `border-radius: 50%` 改为 10px 圆角矩形（格子随日历宽度拉伸，避免变椭圆）。430px 截图验证：日历 366px = 输入框 366px。回归 vitest 409 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓。

## 日期选择器切月自动关闭修复（2026-08-01）

用户反馈：点击 ‹/› 切换月份后日历自动关闭。根因：`renderCalendar` 用 `innerHTML` 重建日历，被点击的旧按钮节点被移除 → 事件冒泡到 document 后 `onOutsideClick` 判定"点击发生在外部"（旧节点已不在日历内）→ 关闭。

修复：月导航分支 `event.stopPropagation()`（重建前阻止冒泡）；新增测试断言切月后日历保持打开。回归 vitest 409 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓。

## 存款日期联动与校验修复（2026-08-01）

用户反馈：先选存入日期再选期限时，到期日期可以早于存入日期。

### 根因（三个层面）

1. `recalcMaturity` 只更新 hidden input 的 value，**日期选择器显示标签不同步**（界面仍显示占位符，用户以为没刷新）
2. 到期日期日历**无 minDate 限制**，可手选早于存入日期的日期（只有保存时 parseDepositForm 才报错）
3. 选择到期日期时 `onFieldChange` 会触发 `recalcMaturity`，**覆盖用户手动选择的到期日**

### 修复（form.js + app-datepicker.js）

- `recalcMaturity` 用 `setAppDatePickerValue` 同步日期选择器标签
- 新增 `enforceMaturityOrder()`：存入日期变化时**动态收紧到期日历 minDate**（`setAppDatePickerMinDate`，每次打开日历重新读取），并把已选的早到期日**自动修正为存入日期**
- datepicker 的 `open()`/切月改为每次读取最新 minDate 属性（支持动态收紧）
- 按字段定制 onChange：存入日期 → 重算期限+到期日；到期日期 → 只修正顺序+重算收益（**不再覆盖用户手动选择**）
- 同类问题排查：续存表单的 maturesOn 也加了 `minDate: today`（原可手选早于开立日）；赎回表单 settledOn 的 minDate=到期日已有 ✓

### 测试

新增 3 用例：期限→到期联动且标签同步、到期日历禁用早于存入的日期、续存 maturesOn 最小日期。回归 vitest 412 通过 / typecheck ✓ / typecheck:js 0 错误 / build ✓。

## AUI-301 → AUI-309 审计实施复核（2026-08-01）

本次审计计划已完成代码实施与自审：快速记账值契约/语言刷新、确认弹窗本地化、下拉与日期选择器 ARIA/焦点、输入标签与 44px 触控基线、存款日期边界、续存 Apple 控件/VND 解析、360px 起响应式文本、语义颜色 token、结算 fixture 生产加载链均已落地。新鲜 gates：`npm test -- --run` 为 434 通过/18 跳过，`npm run typecheck`、`npm run typecheck:js`、`npm run build`、`git diff --check` 均通过；浏览器矩阵覆盖 360/390/430/768/1440px 合成数据。高风险日期/续存路径已完成 Implementer 串行审查式复核；独立 Reviewer 运行时未返回报告，故不把该项写成已通过的独立结论。
