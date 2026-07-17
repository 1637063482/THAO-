# ADR-001：Household 是强制租户边界

- 状态：Accepted
- 日期：2026-07-17

## 决策

所有账户、交易、分类、预算、对账和审计资源必须位于 `households/{householdId}` 下。用户只有存在 active membership 时才能访问该 household。角色为 Owner、Admin、Member、Viewer；最后一个 Owner 不能退出或被降级。

## 原因

旧模型按项目和年份共享文档，无法隔离多个家庭。把 uid 直接作为账本 ID 又无法表达家庭协作。显式 Household + Membership 同时提供租户边界与协作授权。

## 后果

UI 权限只改善体验，Firestore Rules 和受信服务端仍必须逐次验证 membership。跨 household 引用一律拒绝。
