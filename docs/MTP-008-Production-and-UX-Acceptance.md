# MTP-008 生产契约与人工 UX 验收记录

状态：`PREPARED / PENDING OWNER`

本文件只准备发布前证据和人工验收表，不代表线上 Rules 已部署、账号已
provision，也不授权执行 Firebase 部署或生产数据操作。

## 本地候选证据

| 项目 | 当前证据 |
|---|---|
| Rules 候选源 | `firestore.rules` |
| 本地 Emulator 项目 | `demo-no-project` |
| 当前候选 Rules SHA-256 | `FAFA6F804F9E3F66994D1109AF90F48170E45B87DA8AA494423632345228C720` |
| 本地 Rules 回归 | `npm run test:rules`：通过；5 个文件、23 个测试 |
| 生产部署 | 未执行 |
| 生产 Rules 生效状态 | 未核验 |
| 生产 member 文档 | 未核验 |

Rules 的授权契约是服务器管理的：

```text
artifacts/{appId}/public/data/members/{uid}
access == "shared-ledger"
```

真实项目 ID、真实 UID、邮箱和生产 Rules 导出只能由 Owner 在私有发布记录
中保存，不写入仓库、测试、截图或本文件。

## Owner 生产核验表

以下项目必须在明确授权后由 Owner 或授权操作员完成；当前均为
`PENDING OWNER`。

| 核验项 | 结果 | 私有证据要求 |
|---|---|---|
| 确认目标 Firebase 项目、候选 revision、发布窗口 | PENDING OWNER | 私有发布单 |
| 导出当前线上 Rules 并与候选源逐条比较 | PENDING OWNER | 私有 rollback record |
| 两个既有账号对应 member 文档存在且值为 `shared-ledger` | PENDING OWNER | 仅记录存在性，不记录 UID |
| 发布后重新读取 Rules 页面并核对候选源 | PENDING OWNER | 线上 Rules hash/时间 |
| 使用合成或空白验证账号检查 allow/deny 矩阵 | PENDING OWNER | 不访问真实账本 |
| 验证 client 无法读写 members、无法删除 ledger | PENDING OWNER | 私有验证日志 |
| 记录回滚负责人、停止条件和恢复源 | PENDING OWNER | 私有 rollback record |

发布前必须同时满足：目标、候选版本、授权窗口和回滚源均已确认；否则
停止，不执行部署。

## 人工 UX 验收矩阵

Owner 使用本地候选构建或已授权的验证环境，所有截图和演示数据必须是
合成数据。每一行填写 `PASS`、`FAIL` 或 `BLOCKED`，并附时间和短证据。

| 场景 | vi | zh-CN | light | dark | 视口 | 通过标准 | 结果/证据 |
|---|---|---|---|---|---|---|---|
| 登录、切换语言、刷新页面 |  |  |  |  | 360/390/430 | 文案完整，`document.lang` 正确，无英文 UI | PENDING OWNER |
| Quick Add 记账 |  |  |  |  | 390/430 | 10 秒内完成；金额、分类、日期和备注可见；重复提交不产生重复事实 | PENDING OWNER |
| 月预算保存与同步状态 |  |  |  |  | 390/430/1440 | 保存中、延迟、失败、已同步状态可区分；刷新不丢 pending | PENDING OWNER |
| 直接账本输入 |  |  |  |  | 390/430 | 触控目标可操作；横向滚动不造成页面级溢出；备注不被截断 | PENDING OWNER |
| 储蓄目标 |  |  |  |  | 390/430/1440 | 保存/清空确认、金额显示和状态反馈完整 | PENDING OWNER |
| 存款创建、编辑、归档 |  |  |  |  | 390/430/1440 | 日期、状态、归档反馈明确；终态不可被误改 | PENDING OWNER |
| 存款提醒与 acknowledgement |  |  |  |  | 390/430 | 弹层可滚动、关闭可恢复焦点，离线提示可见 | PENDING OWNER |
| Analytics / Dashboard |  |  |  |  | 390/430/1440 | 同一合成账本的金额、预算、分类和 streak 一致 | PENDING OWNER |
| confirmation-dialog 快速开关 |  |  |  |  | 390/430/1440 | 打开/关闭/再次打开连续，Escape、遮罩和焦点行为正确 | PENDING OWNER |
| 双账号/双标签 settings 并发 |  |  |  |  | 390/430/1440 | 不同 key 合并；同 key 出现明确冲突提示，不静默覆盖 | PENDING OWNER |

建议至少覆盖 `360×800`、`390×844`、`430×932`、`768×1024` 和
`1440×900`；如使用其他设备，记录实际 CSS viewport，而不是设备商品名。

## 签字

```text
Owner: ____________________
验证环境/候选 revision: ____________________
验证日期（含时区）: ____________________
生产 Rules release identifier（仅私有记录）: ____________________
结论: PASS / FAIL / BLOCKED
```

相关发布边界和回滚步骤见
[`FIREBASE_RULES_RELEASE_CHECKLIST.md`](FIREBASE_RULES_RELEASE_CHECKLIST.md)。
