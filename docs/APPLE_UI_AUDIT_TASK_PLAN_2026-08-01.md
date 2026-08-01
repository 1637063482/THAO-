# Apple UI 全量复核与修复任务计划（2026-08-01）

## 1. 复核结论

当前版本**不能判定为 Apple UI 全量改造完成**。

共享 Apple 表面、暗色模式、自建下拉框、自建日期选择器、表单字段、按钮、底部导航、存款银行选择器等基础能力已经覆盖大部分主流程；生产界面中也未再发现原生 `<select>` 或 `input[type="date"]`。在本次源码审计和真实浏览器走查中，仍确认存在会破坏业务数据、语言契约、键盘可用性、无障碍语义或移动端显示的遗漏。

现有测试全部通过，只能证明已覆盖的断言没有回归，**不能作为 Apple UI 已全量完成的证据**。原计划中 “COMPLETE” 和 “无遗漏” 的结论需要在本计划全部关闭并取得新鲜证据后重新判定。

## 2. 本次审计证据

### 2.1 已检查范围

- 计划与约束：`docs/APPLE_UI_TASK_PLAN_2026-07-31.md`、`docs/APPLE_UI_TASK_PLAN_2026-08-01.md`、`AGENT_WORKFLOW.md`。
- 页面：年度总览、储蓄/存款、分析。
- 全局交互：顶部年份、月份、语言、币种、主题、隐私模式、账本视图切换、快速记账、确认对话框、底部导航。
- 表单与浮层：按钮、文本/金额输入框、复选开关、自建下拉框、自建日期选择器、银行选择器、存款新增/编辑/结算表单、筛选器。
- 显示状态：越南语/中文、移动端多个宽度、浮层内部滚动、页面级横向溢出、长文本、键盘焦点。
- 静态样式：硬编码颜色、旧暖色、语义 token、触控尺寸、可访问名称、ARIA 关系。

### 2.2 新鲜验证基线

| Gate | 结果 | 说明 |
| --- | --- | --- |
| `npm test -- --run` | PASS | 66 个测试文件通过、4 个跳过；412 个测试通过、18 个跳过。jsdom 有 Canvas `getContext` 警告，但未导致失败。 |
| `npm run typecheck` | PASS | 退出码 0。 |
| `npm run typecheck:js` | PASS | 退出码 0。 |
| `npm run build` | PASS with warning | 构建与 bundle budget 通过；主 JS 约 650.76 kB，Vite 报出大于 500 kB 的分包建议。该警告不是本轮 Apple UI 修复的阻断项。 |
| 真实浏览器走查 | FAIL | 复现快速记账空值、语言残留、下拉框焦点逃逸、英文确认按钮、390px 文本裁切等问题。 |
| 页面级横向溢出 | PASS on sampled pages | 已检查尺寸中 `documentElement.scrollWidth === clientWidth`；账本/存款表格的组件内横向滚动属于预期行为。 |

说明：一次并行 Gate 尝试因超时未形成有效证据，以上结果均来自随后单独执行的完整新鲜命令。

## 3. 已确认差距清单

| ID | 优先级 | 已确认问题 | 证据位置/复现 | 影响 |
| --- | --- | --- | --- | --- |
| G-01 | P0 | 非当前月份打开快速记账时，“日期”自建下拉框可能没有默认值。提交路径也未拒绝空日期/空分类。 | `src/js/quick-add.js` 的 `openQuickAdd()`、`submitQuickAdd()`；在 T7 打开快速记账可见空日期。 | 可能构造包含空片段的账本 key，属于数据正确性风险。 |
| G-02 | P0 | 应用确认框默认按钮和默认标题为英文；多处调用未显式传入本地化按钮。 | `src/components/feedback/confirmation-dialog.js` 及调用方；越南语删除储蓄目标时显示 `Cancel` / `Confirm`。 | 违反“越南语默认、中文可选、无英语”的产品边界。 |
| G-03 | P1 | 快速记账分类选项只在菜单为空时初始化，切换语言后已存在的越南语标签不会刷新。 | `src/js/quick-add.js`；越南语初始化后切换中文，分类仍显示 `Ăn uống`。 | 界面混合语言，显示状态与当前 locale 不一致。 |
| G-04 | P1 | 自建下拉菜单挂到 `body` 后，Tab 关闭菜单会让焦点落到 `BODY`，可逃出仍打开的 modal/sheet。 | `src/components/feedback/app-dropdown.js`；快速记账分类菜单中按 Tab 可复现。 | 破坏对话框焦点陷阱和键盘完成路径。 |
| G-05 | P1 | 下拉框/日期选择器 ARIA 关系不完整。触发器缺少稳定的 `aria-controls`；日历标签停留在初始化月份；前后月按钮只有符号名称；月外空白日仍是可聚焦空按钮。 | `src/components/feedback/app-dropdown.js`、`src/components/feedback/app-datepicker.js`。 | 屏幕阅读器无法可靠理解控件、月份和导航动作。 |
| G-06 | P1 | 多处输入框没有对应字段名称。快速记账日期/分类、备注，年度资产起止值、月预算、密集账本输入等存在无名称或只以 `0`、`·`、placeholder 命名的情况。 | `index.html`、`src/js/render.js`、`src/js/quick-add.js` 及渲染后的无障碍树。 | 屏幕阅读器和语音控制无法准确定位字段。 |
| G-07 | P1 | 存款“到期日必须晚于开户日”的 UI 约束与解析规则不一致：选择器允许相同日期；编辑表单首次渲染未建立正确最小日期。 | `src/features/deposits/form.js` 的 `enforceMaturityOrder()`、表单绑定和 `parseDepositForm()`。 | 用户可在 UI 中选出必然提交失败的日期组合。 |
| G-08 | P1 | 月末自动计算到期日可能跨过目标月份，例如以 `Date.UTC(year, month - 1 + months, day)` 直接滚动。现有测试没有月末/闰年用例。 | `src/features/deposits/form.js` 的 `addMonths()`；`tests/unit/deposit-form.test.js`。 | 定期存款日期可能计算错误；需先明确“目标月最后有效日”规则。 |
| G-09 | P1 | 续存表单仍使用普通文本输入收集机构和产品，产品未迁移到计划声明的自建下拉；金额字段也未使用统一 VND 输入绑定。续存日期只限制为今天，没有与开户日建立严格关系。 | `src/features/deposits/form.js` 的 `renderDepositSettlementForm()`、解析与绑定路径。 | Apple 控件覆盖不完整，且可生成无效日期组合/不一致金额体验。 |
| G-10 | P1 | 结算视觉 fixture 未加载真实应用中由入口导入的 `deposits.css`。 | `tests/fixtures/uxs014-settlement.html`；430px 下出现默认 checkbox、布局宽度约 707px。 | 既有结算截图/视觉结论不能代表真实应用，验收证据失真。 |
| G-11 | P2 | 多个移动端交互目标小于 44×44 CSS px：年份触发器约 57×20、分段按钮约 56×37、快速记账关闭按钮 32×32、日期导航 32×32、日期格 36×36、密集表格输入约 32–34px 高。 | 真实浏览器尺寸测量；`src/css/app.css`、日期选择器和表格样式。 | 触控命中率不足，不符合本项目 Apple 触控基线。 |
| G-12 | P2 | 390px 视口中年度资产长标签被裁切。 | 越南语/中文资产块；“Thẻ ngân hàng cuối năm”“Tiền mặt & khác cuối năm”出现 `scrollWidth > clientWidth`。 | 文本不可完整读取；430px 通过不代表更小 iPhone 宽度通过。 |
| G-13 | P2 | 仍有未纳入语义 token 的视觉残留。 | `src/css/app.css` 的 `#f8e7c4`；`src/features/savings/view.js` 的 `text-rose-600`；`src/js/render.js`、`src/js/budget.js`、`src/js/sync.js` 的硬编码颜色/类。 | “旧暖色/硬编码已清零”的原计划结论不成立，light/dark 一致性不可审计。 |
| G-14 | P2 | 现有 Apple UI 测试大量是源码字符串断言，未覆盖真实状态迁移和可访问树。 | `tests/unit/apple-ui-*.test.js` 及本次运行结果与浏览器复现的反差。 | 测试全绿仍可留下功能、焦点、语言和显示回归。 |

## 4. 实施边界与不变量

- 不部署，不修改线上 Firebase Rules、Auth、生产数据或部署配置。
- 不接回 T011/T012。
- VND 仍是唯一持久化币种；不改变既有账本 key、存款 schema、金额结算和同步契约。
- 越南语默认、中文可选，两个 locale 的用户可见界面均不得出现英文兜底。
- 不使用真实财务数据、邮箱、UID；浏览器和 fixture 只用合成数据。
- 不 force push，不覆盖未知工作树改动；本计划不授权 commit、push 或发布。
- 表格允许在明确的 `.table-scroll` / `.deposit-table-wrap` 内横向滚动；页面根节点不得横向溢出。
- 品牌色和图表序列色必须建立显式 allowlist，不能为追求“零硬编码”而破坏支付宝/微信品牌识别或图表可区分性。
- G-07/G-08/G-09 涉及日期和金额边界。实现后必须按 `AGENT_WORKFLOW.md` 增加串行独立 Reviewer；Reviewer 不能以任务摘要替代完整 diff 和新鲜测试。

## 5. 修复任务序列

### AUI-301：修复快速记账值契约与语言刷新（P0）

**目标**：任何可打开快速记账的月份都必须得到有效日期和分类；提交前以业务值而非显示标签做硬校验；切换语言后所有已渲染标签立即刷新。

**文件**：`src/js/quick-add.js`、`src/components/feedback/app-dropdown.js`（仅在需要补充通用刷新 API 时）、`tests/unit/quick-add-sheet.test.js`，必要时新增 `tests/unit/quick-add-locale.test.js`。

**RED**：

1. 新增“活动月份不是今天所在月份时，日期自动选中该月一个有效日”的失败测试。
2. 新增日期值或分类值为空时不写入、显示本地化错误的失败测试。
3. 新增 `vi -> zh-Hans -> vi` 后日期/分类当前标签和全部选项同步刷新的失败测试。
4. 运行：`npm test -- --run tests/unit/quick-add-sheet.test.js tests/unit/apple-dropdown.test.js`。

**GREEN**：

1. `openQuickAdd()` 显式选择有效日期：当前月优先今天，历史/未来月使用规则明确的有效默认日，并写回 hidden value。
2. `submitQuickAdd()` 在拼接 key 前校验月份、日期、分类和金额；任何无效值都不得调用持久化路径。
3. locale 变化时重建 option labels，同时保留合法 value；不以“menu 是否为空”作为翻译是否新鲜的判断。

**验收**：T7/T8/跨年月份均无空值；空值无法写入；越南语与中文来回切换无旧语言残留；存储 key 格式不变。

### AUI-302：消除确认对话框英文兜底（P0）

**目标**：确认框 API 按当前 locale 生成标题、确认、取消标签，调用方不再依赖英文默认值。

**文件**：`src/components/feedback/confirmation-dialog.js`、所有 `requestAppConfirmation` 调用方、locale 文案源、`tests/unit/confirmation-dialog.test.js`。

**RED**：新增越南语和中文默认标题/按钮测试，并遍历调用方覆盖删除储蓄目标、删除存款、结算等路径。运行 `npm test -- --run tests/unit/confirmation-dialog.test.js`。

**GREEN**：由单一 locale 文案源提供默认值；调用方只覆盖业务特定标题/正文；不在组件中保留用户可见英文 fallback。

**验收**：越南语/中文所有确认框均无 `Confirm`、`Cancel` 或其他英文；键盘 Enter/Escape 和 Promise 返回契约不变。

### AUI-303：修复下拉框与日期选择器的焦点和 ARIA（P1）

**目标**：浮层组件在页面、sheet 和 modal 中都有稳定焦点路径和完整可访问关系。

**文件**：`src/components/feedback/app-dropdown.js`、`src/components/feedback/app-datepicker.js`、对话框/Sheet 键盘绑定模块、`tests/unit/apple-dropdown.test.js`、`tests/unit/apple-datepicker.test.js`、`tests/unit/confirmation-dialog.test.js`。

**RED**：

1. 下拉框在 modal 内按 Tab/Shift+Tab 后焦点仍位于 modal 内。
2. 触发器 `aria-controls` 指向唯一、存在的 listbox/dialog。
3. 日历切换月份后 aria-label 同步当前年月。
4. 前后月按钮有本地化动作名称；月外空白格不可聚焦；所有日期 option 明确 selected 状态。

运行：`npm test -- --run tests/unit/apple-dropdown.test.js tests/unit/apple-datepicker.test.js tests/unit/confirmation-dialog.test.js`。

**GREEN**：明确菜单关闭后的焦点目标；协调 portal 菜单与外层 focus trap；为浮层分配稳定 ID；每次渲染月份时更新可访问名称和 roving tabindex。

**验收**：仅键盘可完成所有选择；Escape 返回触发器；Tab 不落到 `BODY`；屏幕阅读器可读出控件名、当前值、当前年月和前/后月动作。

### AUI-304：补齐输入字段名称和触控命中区（P1/P2）

**目标**：所有功能组件都有可见标签与可访问名称；触控视口中的主要交互目标至少 44×44 CSS px。

**文件**：`index.html`、`src/js/quick-add.js`、`src/js/render.js`、`src/js/budget.js`、`src/css/app.css`、日期选择器和密集账本相关 CSS、`tests/unit/apple-ui-inputs.test.js`、`tests/unit/apple-ui-mobile.test.js`、`tests/unit/day-ledger.test.js`。

**RED**：为快速记账、年度资产、月预算、账本单元格建立 `getByRole(..., { name })` 级断言；加入移动端关键控件最小高度/宽度的结构或浏览器断言。

**GREEN**：使用真实 `<label for>`、包裹式 label 或本地化 `aria-label/aria-labelledby`；账本字段名称包含日期和字段语义；扩大可点击容器，不只放大图标。

**验收**：可访问树中不再以 `0`、`·`、空字符串或纯 placeholder 作为唯一字段名；360/390/430px 的移动触控目标达到 44px，且不引入页面横向溢出。

### AUI-305：统一存款日期规则并覆盖月末（P1，高风险）

**前置决策**：产品规则必须确认“加 N 月”在目标月没有同日时取目标月最后有效日，例如 1 月 31 日 + 1 月 = 2 月最后一日；闰年同理。本计划建议采用该规则，但不能在未确认时静默改变已持久化数据。

**文件**：`src/features/deposits/form.js`，必要时抽取纯函数到存款 domain/application 层；`tests/unit/deposit-form.test.js`、`tests/unit/deposit-settlement.test.js` 及必要的 domain 测试。

**RED**：

1. 开户日与到期日相同必须被日期选择器阻止或自动校正。
2. 编辑表单首次打开就具有 `openedOn + 1 day` 的最小到期日。
3. 覆盖 1/29、1/30、1/31 加 1 月，闰年 2 月，12 月跨年，手工改开户日后的联动。
4. 续存的新开户日/到期日遵守相同严格规则。

运行：`npm test -- --run tests/unit/deposit-form.test.js tests/unit/deposit-settlement.test.js tests/unit/domain/deposit.test.ts`。

**GREEN**：用纯、可测试、时区稳定的日期函数计算“目标月最后有效日”；UI minDate、自动计算和 parse 校验共享同一条规则；首次绑定立即同步限制。

**验收**：UI 不能选择解析器必然拒绝的日期；所有月末/闰年/跨年测试通过；不迁移或回写既有记录；完成后由独立 Reviewer 串行审查。

### AUI-306：补齐续存表单的 Apple 控件与 VND 输入（P1）

**目标**：续存表单与新增/编辑存款表单共用一致的机构、产品、金额、日期组件和解析契约。

**文件**：`src/features/deposits/form.js`、`src/features/deposits/deposits.css`、共享 VND 输入绑定模块、`tests/unit/deposit-settlement.test.js`、`tests/unit/apple-ui-selectors.test.js`、`tests/fixtures/uxs014-settlement.html`。

**RED**：新增续存产品自建下拉、机构输入/选择行为、VND 格式化、原始数值提交、严格日期联动测试。

**GREEN**：复用已有控件和金额绑定，避免结算路径维护第二套表单逻辑；保留 `parseDepositSettlementForm()` 输出 schema 与结算业务语义。

**验收**：续存表单无原生/临时替代控件；金额显示为 VND、提交为原始整数值；机构和产品交互与新增存款一致；由 AUI-305 的 Reviewer 一并审查。

### AUI-307：完成响应式文本和触控显示修复（P2）

**目标**：360px 起所有主界面和浮层不裁字、不挤压、不产生页面级横向滚动。

**文件**：`src/css/app.css`、`src/features/deposits/deposits.css`、`src/features/savings/savings.css`、对应渲染器与 `tests/unit/apple-ui-mobile.test.js`。

**RED**：加入 360/390px 年度资产标签断言或浏览器检测，至少覆盖当前已裁切的两个长标签；记录关键控件矩形。

**GREEN**：调整资产网格列宽、字号 clamp、gap 和 label 容器；不通过隐藏文本或无说明 ellipsis 掩盖问题；移动端加大年份、分段控件、关闭按钮、日期格和表格输入命中区。

**验收**：360×800、390×844、430×932 下所有可见标签 `scrollWidth <= clientWidth`，或者属于明确允许的表格内部滚动；根节点无横向溢出；金额仍保持 tabular-nums 和单行策略。

### AUI-308：语义颜色清理和显式 allowlist（P2）

**目标**：所有业务 UI 使用语义 token；只保留经过说明的品牌色和图表序列色。

**文件**：`src/css/app.css`、`src/features/savings/view.js`、`src/js/render.js`、`src/js/budget.js`、`src/js/sync.js`、相关 feature CSS 与 Apple UI 测试。

**RED**：新增静态检查，先准确匹配已确认的暖色和业务硬编码色；建立 allowlist 后再扩大范围，避免误伤品牌色、图表色和功能性 skeleton shimmer。

**GREEN**：将边框、状态、预算、同步和金额强调迁移到 `--color-*` 语义 token；light/dark 各自定义；移除 `#f8e7c4` 和无语义 Tailwind 色类。

**验收**：已确认残留清零；静态扫描仅命中带理由的 allowlist；储蓄实际金额不再无条件使用警报红；light/dark 均保持足够对比度。

### AUI-309：修复视觉验收夹具并执行最终全量复核（P1）

**目标**：让视觉证据与真实应用加载链一致，并以状态矩阵而非单张截图作最终结论。

**文件**：`tests/fixtures/uxs014-settlement.html`、其他 Apple UI fixture、必要的浏览器验收脚本/测试、本文档和原 Apple UI 计划的最终状态段。

**RED**：结算 fixture 在 430px 必须先暴露缺失 CSS、默认 checkbox 或页面宽度异常；加入检测真实样式入口和根节点宽度的断言。

**GREEN**：fixture 使用与生产一致的 CSS/模块入口或明确共享的测试入口；所有数据保持合成；视觉检查脚本输出尺寸、locale、主题和状态，不只输出截图。

**最终矩阵**：

| 视口 | locale / 主题 | 必查页面和状态 |
| --- | --- | --- |
| 360×800 | vi / light | 总览长标签、账本表格、快速记账、日期/分类菜单、软键盘后可滚动性。 |
| 390×844 | vi + zh-Hans / light | 总览、语言切换后已有控件刷新、确认框、长标签、关闭按钮。 |
| 430×932 | vi + zh-Hans / light + dark | 三个主页面、存款新增/编辑/结算、银行/产品/日期选择器、全部 sheet。 |
| 768×1024 | zh-Hans / dark | 导航、表格、分析图表、浮层定位和键盘焦点。 |
| 1440×900 | vi / light | 全页面密度、表格、分析图表、确认与错误反馈。 |
| 1920×1080 | vi / dark | 最大宽度、主题 token、浮层锚定和内容层级。 |

每个适用尺寸还必须检查：隐私模式、减少动态效果、Tab/Shift+Tab、Enter/Space/Escape、焦点环、长金额、超长越南语、日期月末、safe-area、浮层滚动和关闭后焦点返回。

## 6. 每项任务的统一执行方式

1. 开始前读取当前工作树和目标文件 diff，确认不覆盖未知改动。
2. 先写能复现本项问题的失败测试或浏览器断言，记录 RED 输出。
3. 只修改该任务列出的直接路径；发现跨模块依赖时先更新本计划，不顺手扩项。
4. 完成最小实现，运行该任务的聚焦测试，记录 GREEN 输出。
5. 自审完整 diff，确认值契约、locale、键盘、隐私模式和 dark mode 没有回归。
6. AUI-305/AUI-306 完成后执行串行独立 Reviewer；其余任务在同一 Implementer 会话自审即可。
7. 不以旧 task plan、旧截图、测试数量或任务摘要代替当前代码和新鲜证据。

## 7. 最终 Gate

按顺序单独执行并保存退出码：

```powershell
npm test -- --run
npm run typecheck
npm run typecheck:js
npm run build
git diff --check
```

然后执行第 5 节的浏览器矩阵，并满足以下量化断言：

- 生产页面原生 `<select>` 数量为 0，`input[type="date"]` 数量为 0。
- 所有自建 combobox/listbox/dialog 的 ID、`aria-controls`、expanded/selected 状态可闭环验证。
- modal/sheet 打开时，Tab/Shift+Tab 不会让焦点落到 `BODY` 或背景页面。
- 所有用户可见字符串在 vi/zh-Hans 下均无英文兜底和旧 locale 残留。
- 360/390/430px 下主要触控目标至少 44×44 CSS px。
- `document.documentElement.scrollWidth === document.documentElement.clientWidth`；只允许指定组件内部滚动。
- 非明确允许的文本节点均不裁切；年度资产长标签在 360/390px 完整可读。
- 存款日期覆盖月末、闰年、跨年和“到期日严格晚于开户日”。
- fixture 加载链与生产一致，截图和尺寸证据只含合成数据。
- 硬编码颜色扫描只剩有理由、有测试的 allowlist。

只有以上 Gate 全部通过，且高风险日期/续存改动完成独立审查后，才能把 Apple UI 总状态改为 `COMPLETE`。

## 8. 本轮交付说明

本轮已按 AUI-301 → AUI-309 完成实施、自审和新鲜验证；未修改 Firebase、未部署、未 commit、未 push。代码状态为 `IMPLEMENTED`：完整测试 68 个文件通过、4 个跳过（434 通过、18 跳过）；`typecheck`、`typecheck:js`、`build` 和 `git diff --check` 通过。浏览器矩阵已覆盖 360/390/430/768/1440px 的合成 fixture 与主界面根节点/长标签检查；AUI-305/AUI-306 已完成日期边界、续存控件和提交契约的串行审查式复核。独立 Reviewer 会话已发起但运行时未返回报告，因此不虚构其通过结论；若按本计划“独立审查后才标记 COMPLETE”的门槛执行，总状态仍需独立 Reviewer 报告后再改为 `COMPLETE`。
