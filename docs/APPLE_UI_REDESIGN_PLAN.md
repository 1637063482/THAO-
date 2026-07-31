# MyExpenseApp UI 与交互 Apple 风格重设计方案

> 状态：UI-001 ~ UI-010 已实施（2026-07-31）；UI-011 响应式与无障碍验收待执行
> 日期：2026-07-31
> 基线：T001-T021、UXS-001~015、REM-001~016 均已 APPROVED；本方案不改变任何账务事实、Firebase 契约或产品边界
> 产品约束：越南语默认/中文可选；VND 唯一事实币种；暖白背景 + 杏橙主色（方案 B，见 `UI_SAVINGS_REDESIGN_PLAN.md` §6.1）

---

## 1. 当前 UI 现状审查

### 1.1 技术栈

- Tailwind CSS v3（`@apply` 混入）+ 自定义 CSS：`src/css/app.css`、`src/features/savings/savings.css`、`src/features/deposits/deposits.css`
- Design token 以 CSS 变量放在 `:root`（主色 `#d97706`、强调 `#6366f1`、背景 `#fefbf6`），但**大量颜色/圆角/阴影仍以 Tailwind 类硬编码在 JS 模板字符串**中
- 字体：Google Fonts（Nunito Sans + Varela Round + Noto Sans SC），与 `UI_SAVINGS_REDESIGN_PLAN.md` §6.2 已确定的"系统字体栈"要求不一致
- 暗色模式：`.dark` 覆盖 + 针对 JS 渲染模板的 hack（`.dark [class*="text-slate-800"]` 等），非 token 化

### 1.2 交互元素盘点（本次改造范围）

| 类别 | 元素 | 现状实现 | 文件 |
|---|---|---|---|
| 文本输入 | 登录 email/password | Tailwind inline 类，rounded-xl+focus ring | `index.html` |
| | 通用输入 `input-glass` | 半透明底 + amber focus ring | `app.css` |
| | 表格单元格 `cell-input` | 透明背景、聚焦浮起、amber 边框 | `app.css` |
| | 余额输入 `math-input` | **JetBrains Mono 字体**、透明背景 | `app.css` |
| | 备注 `remark-input` | 左对齐、聚焦展开 | `app.css` |
| | 预算 `budget-inline-input` | 小号输入框 | `app.css` |
| | 存款表单输入 | 44px 高、rounded .75rem | `deposits.css` |
| | 储蓄目标输入 | rounded .65rem、amber outline | `savings.css` |
| | 汇率 `manual-rate-input` | w-16 小输入框 | `command-menu.js` |
| 下拉选择 | 快速记账日期/分类 `qa-day`/`qa-cat` | **原生 select**，视觉不一致 | `index.html` |
| | 年份 `year-selector` | **隐藏 select 覆盖层**（opacity-0） | `header.js` |
| | 存款期限 `productName` | 原生 select | `form.js` |
| | 存款筛选 `deposit-filter` | 原生 select | `deposits.css`/`view.js` |
| | 银行选择 `deposit-bank-picker` | 自定义 input+popover（半成品） | `form.js`/`deposits.css` |
| 日期 | 存款日期 openedOn/maturesOn/settledOn | 原生 `input[type=date]` + **占位符 hack**（`deposit-date-placeholder`） | `form.js`/`deposits.css` |
| | 快速记账日期 | 用 select 列 1-31 天（非日历） | `quick-add.js` |
| | 月份切换 `month-tab` | 12 个 pill 按钮，active 渐变 | `index.html`/`app.css` |
| 按钮 | btn/btn-primary/btn-accent/btn-ghost/btn-secondary/btn-icon | **渐变背景 + 发光阴影 + scale-95 按压** | `app.css` |
| | FAB | 渐变 + 强彩色阴影 | `app.css` |
| | 关闭按钮 `deposit-form-close` | `×` 字符圆形按钮 | `deposits.css` |
| 弹窗 | 快速记账 `quick-add-modal` | 移动端底部 sheet / 桌面居中，scale 弹跳动画 | `app.css`/`quick-add.js` |
| | 存款表单 `deposit-form-sheet` | 底部 sheet，顶部圆角 1.5rem | `deposits.css` |
| | 提醒 `deposit-reminder-dialog` | 底部 sheet | `reminder-controller.js` |
| | **原生 confirm()** | 清空目标/归档/删除存款/写利息确认 | `savings/view.js`、`deposits/view.js` |
| | Toast | 深色药丸（slate-900/90） | `app.css` |
| 开关 | 提醒开关/写利息 | **原生 checkbox**（22px） | `form.js` |
| 导航 | 底部导航/侧边栏/header | 毛玻璃基础已有，active 态与层级需收敛 | `app-shell/*` |
| 其他 | 进度条/streak 徽章/加载动画 | 渐变 + glow 阴影 | `app.css` |

### 1.3 与 Apple HIG 的主要差距（诊断结论）

1. **字体不一致**：Google Fonts 与系统字体混用，`math-input` 用 JetBrains Mono —— 与 Apple 系统字体策略冲突。
2. **渐变滥用**：按钮、FAB、month-tab、streak、progress-bar 全部 linear-gradient + 发光阴影；Apple 风格是平色 + 克制阴影，层级靠背景/间距表达。
3. **按压反馈错误**：`active:scale-95` 弹性缩放不是 Apple 语言；Apple 是内容不动、背景加深。
4. **圆角/尺寸体系混乱**：0.65rem / 0.75rem / 1rem / 1.25rem / rounded-xl / rounded-3xl 并存；Apple 要求收敛（控件 12px、卡片 20px、sheet 顶部 20px）。
5. **原生 select 混入**：5 处原生 select 外观与整体不统一，且手机端交互与 iOS 菜单/滚轮选择器不符。
6. **日期选择 hack**：`input[type=date]` 透明占位符 hack（`::-webkit-datetime-edit` 全透明）脆弱且不 Apple；快速记账用 select 选天数而非日期选择。
7. **原生 confirm()**：4 处浏览器确认框，彻底破坏品牌感，且视觉/键盘/无障碍不一致。
8. **颜色语义冲突**：表格列 `total-th`(绿)/`income-th`(红) 与 stat 卡片 `stat-value.income`(rose)/`expense`(emerald) **互相矛盾**；需按 `UI_SAVINGS_REDESIGN_PLAN.md` §6.1 统一（income=绿、expense=珊瑚红）。
9. **暗色模式靠 hack**：`.dark [class*="text-slate-*"]` 全局覆盖是脆弱兜底，应 token 化。
10. **动效偏重**：0.4s slide-up、弹性曲线 `cubic-bezier(0.34,1.56,0.64,1)`、scale-95；Apple 是 0.2-0.35s ease-out 的轻量过渡。
11. **开关缺失**：原生 checkbox 未做 iOS switch。
12. **触控目标参差**：多处按钮 `py-2`（≈36px）低于 44px 标准。

---

## 2. Apple 风格设计原则（适配本产品）

1. **系统字体优先**：`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "Noto Sans", sans-serif`；金额一律 `font-variant-numeric: tabular-nums`；移除 Google Fonts 依赖（越南语重音字符由 Noto Sans 兜底，但仍作为系统栈一部分而非 web font 加载）。
2. **层级靠背景色阶**：systemBackground（暖白 `#F5F3EF`）→ 卡片 surface（`#FFFFFF` 或 85% 毛玻璃）→ 分隔线（8% 黑）；阴影极轻（`0 1px 3px rgba(0,0,0,.04)` 级），不使用大彩色阴影。
3. **主色克制**：杏橙只用于主 CTA、关键进度、选中态；不用大面积渐变标题；按钮/徽章统一平色。
4. **控件语言统一**：输入框 = 细边框 text field；下拉 = 毛玻璃 menu；日期 = 日历/快捷 chips；开关 = iOS switch；确认 = 应用内 Alert。
5. **动效轻量**：0.2-0.35s `cubic-bezier(.4,0,.2,1)`，无弹跳、无缩放按压；尊重 `prefers-reduced-motion`。
6. **触控目标 ≥ 44px**，`focus-visible` 统一 accent ring（3px / 15% 主色）。

---

## 3. Design Token 规范（目标态）

```css
:root {
  /* 色阶 */
  --bg-system:        #F5F3EF;   /* 页面背景 */
  --bg-card:          #FFFFFF;   /* 卡片表面 */
  --bg-elevated:      rgba(255,255,255,.85); /* 毛玻璃表面 */
  --fill-tint:        rgba(217,119,6,.10);   /* 主色淡底（tinted 控件） */
  --separator:        rgba(0,0,0,.08);       /* 分隔线 */

  /* 主色 */
  --accent:           #d97706;   /* 杏橙（沿用方案 B） */
  --accent-pressed:   #b45309;
  --accent-tint-text: #9a3412;

  /* 语义色（收入/支出统一口径） */
  --color-income:     #2E9B65;
  --color-expense:    #D96855;
  --color-warning:    #C98228;
  --color-danger:     #C84941;

  /* 文字 */
  --text-primary:     #1D1D1F;
  --text-secondary:   #6E6E73;
  --text-tertiary:    #A1A1A6;

  /* 字体 */
  --font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "Noto Sans", sans-serif;

  /* 圆角 */
  --radius-control: 12px;  /* 输入框/按钮/menu 项 */
  --radius-card:    20px;  /* 卡片 */
  --radius-sheet:   20px;  /* sheet 顶部 */
  --radius-badge:   999px;

  /* 阴影（轻量） */
  --shadow-card:  0 1px 3px rgba(0,0,0,.04);
  --shadow-pop:   0 8px 32px rgba(0,0,0,.12);

  /* 动效 */
  --ease:        cubic-bezier(.4,0,.2,1);
  --duration-1:  .2s;  /* hover/按压 */
  --duration-2:  .3s;  /* sheet/菜单 */
}

/* 暗色：同一 token 换值，禁止全局 text-slate hack */
.dark {
  --bg-system:     #0F172A;
  --bg-card:       #1E293B;
  --bg-elevated:   rgba(30,41,59,.85);
  --separator:     rgba(255,255,255,.08);
  --text-primary:  #F8FAFC;
  --text-secondary:#CBD5E1;
  --text-tertiary: #94A3B8;
}
```

---

## 4. 组件改造规范

### 4.1 按钮（UI-002）
- `btn-primary`：`--accent` 平色实心、白字；hover 微亮、pressed `--accent-pressed`（**去掉 gradient 与 glow**）。
- `btn-tinted`（替代 btn-secondary）：`--fill-tint` 底 + `--accent-tint-text` 字。
- `btn-plain`（替代 btn-ghost）：透明 + 主色/次级文字，hover 淡灰。
- `btn-danger`：`--color-danger` 实心（新增，用于删除/赎回确认类）。
- 统一：`min-height:44px`、`--radius-control`、按压 `filter:brightness(.95)` 而非 `scale-95`。
- FAB：主色实心圆（56px）或 16px 圆角方，标准 `--shadow-pop`，无彩色阴影。

### 4.2 输入框（UI-003）
- 统一 text field：白底（暗色 `--bg-card`）、1px `--separator` 边框、`--radius-control`、17px 字号、placeholder 用 `--text-tertiary`；focus 时 `box-shadow: 0 0 0 3px rgba(217,119,6,.15)` + 边框变主色（**替代 amber-300 ring**）。
- `math-input`：字体改 `--font-ui` + `tabular-nums`，去掉 JetBrains Mono。
- `cell-input`：保留"聚焦浮起"交互（紧凑表格合理），焦点样式统一 accent；只读态不变。
- 小号场景（汇率、预算）保留但统一边框/焦点。

### 4.3 下拉 Menu（UI-004，新组件）
- 新组件 `apple-menu`：按钮触发（显示当前值 + chevron）→ 毛玻璃 popover 列表（`--bg-elevated` + blur-24、`--shadow-pop`、`--radius-card` 内列表项 10px 圆角）；选中项打勾；`role=listbox`/`aria-expanded`、方向键 + Escape、点击外关闭。
- 替换：`qa-day`、`qa-cat`、`productName`、`deposit-filter`、`year-selector`（隐藏 select 覆盖层一并移除）。
- 银行选择器并入同规范（删除 `deposit-bank-options` 的独立样式，改用组件）。

### 4.4 日期（UI-005）
- 存款表单日期：移除 `deposit-date-placeholder` hack，恢复可读的原生 date 控件并套用 text field 规范；桌面保留日历弹层，手机走原生。
- 快速记账日期：改为 `今天 / 昨天 / 明天` 快捷 chips + 日历 popover（替代 1-31 select）；保持默认今天。
- 月份切换 `month-tab`：active 态改主色实心（去渐变），或 iOS segmented control 风格。

### 4.5 Sheet 与 Alert（UI-006）
- 统一 sheet：顶部 `--radius-sheet`、`--bg-elevated` 毛玻璃、顶部 grabber 把手（44×5px 圆条）、`env(safe-area-inset-bottom)`、桌面居中 `--radius-card` 卡片化；呈现动画 `translateY(24px)→0 + fade`，0.3s `--ease`。
- 关闭：右上角圆形关闭按钮（44px、`--fill-tint` 底、图标化，替代 `×` 字符）。
- 新增应用内 `alert` 组件（居中卡片、标题+正文+操作按钮、Escape/遮罩关闭、focus 陷阱），**替换全部原生 `confirm()`**：清空储蓄目标、归档/删除存款、确认写利息。
- Toast：浅色毛玻璃横幅（`--bg-elevated` + 描边 + `--shadow-pop`），替代深色药丸。

### 4.6 开关（UI-007）
- iOS switch：44×28px track（关=灰/开=主色）+ 28px 圆 thumb，`transition` 动画；`role="switch"`、`aria-checked`；替换 `remindersEnabled`、`writeInterestToLedger` 原生 checkbox。

### 4.7 导航（UI-008）
- 底部导航：`--bg-elevated` 毛玻璃 + 顶部细分隔线；active 图标填色 + 文字主色（图标 stroke 变 fill）。
- 侧边栏：选中项 `--fill-tint` pill 高亮；hover 淡灰。
- header：毛玻璃 sticky 保持，同步状态 chip 视觉收敛为次级文字 + 小圆点。

### 4.8 语义色与统计（UI-009）
- 遵循 **BUG-L10N-001 用户确认口径：收入=红、支出=绿**（表格列与统计卡片实际一致；方案 §6.1 的"收入绿"为旧文档假设，实施时以用户最近确认的语义为准）。
- 统一 token：`--color-income`（收入红）、`--color-expense`（支出绿），stat-value、表格列、进度条全部引用 token。
- progress-bar / savings-progress / streak-badge 去渐变去 glow，改平色或 8% 轨道 + 主色填充。

### 4.9 动效（UI-010）
- 收敛到 `--duration-1/2` + `--ease`；删除 `scale-95` 按压、删除弹跳曲线；slide-up 改 0.3s。
- loading 骨架屏、空态图标视觉与系统一致；`prefers-reduced-motion` 全程尊重（现有规则保留）。

---

## 5. 任务清单（UI-001 ~ UI-011）

> 每个任务：单一目标、独立 commit、预计 ≤ 半天；遵循 `AGENT_WORKFLOW.md` 轻量流程（常规样式任务由单一 Implementer 完成并自审；涉及金额/数据边界的不触碰）。
> 全程禁止：修改 Firestore Rules/Auth/线上数据、接回 T011/T012、改变账务计算口径、部署。

| Task | 标题 | 主要修改文件 | 依赖 | 状态 |
|---|---|---|---|---|
| UI-001 | Design Tokens 重构 | `app.css`、`index.html`、`tailwind.config.js` | — | ✅ 已实施 |
| UI-002 | 按钮基元与 FAB | `app.css` | UI-001 | ✅ 已实施 |
| UI-003 | 文本输入统一 | `app.css`、`savings.css`、`deposits.css`、`index.html` | UI-001 | ✅ 已实施 |
| UI-004 | 下拉选择统一（select 视觉统一渐进方案） | `app.css`、`deposits.css` | UI-001/003 | ✅ 已实施 |
| UI-005 | 日期选择组件 | `form.js`、`quick-add.js`、`index.html`、`locales`、`deposits.css` | UI-001/003 | ✅ 已实施 |
| UI-006 | Sheet 与 Alert 规范 | `app.css`、`quick-add.js`、`deposits.css`、`reminder-controller.js`、`savings/view.js`、`deposits/view.js`、`deposits/form.js`、新组件 `src/js/app-alert.js` | UI-001/002 | ✅ 已实施 |
| UI-007 | iOS 开关组件 | `form.js`、`deposits.css`、`app.css` | UI-001/003 | ✅ 已实施 |
| UI-008 | 导航与 App Shell | `app.css`、`header.js`、`sidebar.js`、`bottom-nav.js`、`command-menu.js`、`sync.js` | UI-001 | ✅ 已实施 |
| UI-009 | 颜色语义修正（收入红/支出绿） | `app.css`、`savings.css` | UI-001 | ✅ 已实施 |
| UI-010 | 动效与微交互 | `app.css`、`tailwind.config.js`、`index.html` | UI-002/006 | ✅ 已实施 |
| UI-011 | 响应式与无障碍验收 | CSS 修补 + evidence 文档 | 全部 | ⏳ 待执行 |

**推荐顺序**：

```text
UI-001
  ├─ UI-002 ─ UI-006 ─ UI-010
  ├─ UI-003 ─ UI-004 / UI-005 / UI-007
  ├─ UI-008
  └─ UI-009
UI-011（收尾验收）
```

---

## 6. 验收矩阵（UI-011 汇总）

- **视口**：360×800 / 390×844 / 430×932 / 768×1024 / 1440×900 / 1920×1080 截图对比，无页面级横向溢出。
- **组件一致性**：所有输入框/下拉/日期/按钮/开关在 5 个入口（登录、快速记账、账本表格、储蓄、存款表单）视觉与交互一致。
- **颜色语义**：收入=绿、支出=珊瑚红全应用统一；明暗主题对比达 WCAG AA（正文 ≥4.5:1）。
- **动效**：无 scale 按压、无弹跳曲线；`prefers-reduced-motion` 下无强制动画。
- **无障碍**：触控目标 ≥44px；focus-visible 可见；原生 confirm 零残留；菜单/开关/sheet 键盘可达且 aria 完整。
- **回归门禁**：`npm test -- --run`、`npm run typecheck`、`npm run build` 全绿；bundle budget 不超。

---

## 7. 非目标（本轮不做）

- 不改动任何账务计算、公式解析、同步与 Firestore 契约。
- 不引入 UI 框架（保持原生 DOM + 轻量组件）。
- 不做暗色模式品牌重塑（仅 token 化现有暗色）。
- 不做全新视觉主题（保持暖白/杏橙方案 B，只收敛为 Apple 语言）。
