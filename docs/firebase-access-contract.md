# Firebase 固定双人访问契约

## 已确认产品事实

- 应用只供项目所有者和女朋友两个既有 Firebase Auth 账号使用。
- 两个账号共同读写唯一账本，业务权限相同。
- 应用不提供注册、邀请、成员管理、角色管理或新建账本。
- 账号和线上登录/授权规则已由项目所有者在 Firebase 中配置。

## 客户端契约

- 登录只调用 `signInWithEmailAndPassword`，不调用 Firebase 账号创建 API。
- 当前年度账本路径保持为 `artifacts/{projectId}/public/data/ledgers/shared_ledger_{year}`，本任务不迁移线上数据。
- 客户端不能把“登录成功”当作账本授权成功；Firestore 拒绝时必须显示无权限/同步失败。
- 真实邮箱、UID、密码或 token 不得写入源码、测试 fixture、日志或文档。

## Rules 契约

仓库中的 `firestore.rules` 是供 Emulator 验证的候选规则，不自动代表 Firebase 控制台中的线上规则。它目前通过服务端维护的授权文档确认 UID，而不是在客户端硬编码 UID。

最低行为：

| 身份 | 固定共享账本读写 |
|---|---|
| 未登录 | 拒绝 |
| 授权账号 A | 允许合法字段读写 |
| 授权账号 B | 允许合法字段读写 |
| 任意第三 UID | 拒绝 |

删除整个年度账本、写入未知顶层字段和访问未匹配路径必须拒绝。

## 上线核对门禁

在项目所有者提供 Firebase 控制台当前 Rules 的导出内容，并明确授权部署前：

1. 不运行 `firebase deploy`。
2. 不修改 Firebase Auth 中的两个真实账号。
3. 不声称 Emulator 测试已经证明线上安全。
4. 若线上规则使用 UID 直白名单，只核对两个 UID 且不把真实值提交到仓库。
5. 若线上规则使用授权文档，确认只有两个目标 UID 的文档存在，且客户端不能自行创建或修改这些文档。
