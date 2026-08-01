export default {
  // App
  app_name: "Thao的账本",
  app_subtitle: "云端协同 · 家人共享 · 数据安全",

  // Auth
  email: "邮箱",
  password: "密码",
  password_placeholder: "请输入密码",
  login: "登录",
  login_hint: "仅限已配置的两个账号登录",
  show_password: "显示密码",
  hide_password: "隐藏密码",
  timeout_message: "长时间未操作，已自动退出登录",

  // Loading
  loading_data: "正在加载云端数据...",
  loading: "加载中...",

  // Nav
  yearly_expense_record: "年开支记录",
  switch_year: "切换年份",
  fx_label: "1 CNY =",
  fx_loading: "(加载中...)",
  auto: "自动",
  manual: "手动",
  apply: "应用",
  toggle_theme: "切换深色/浅色模式",
  toggle_privacy: "隐藏/显示金额",
  more: "更多",

  // Nav actions
  import_label: "导入",
  share: "分享",
  export_csv: "导出CSV",

  // Bottom nav
  overview: "总览",
  quick_add: "记账",
  savings: "储蓄存款",
  close: "关闭",
  main_navigation: "主导航",
  stats: "分析",

  // Quick add
  quick_add_title: "快速记账",
  date: "日期",
  category: "分类",
  amount: "金额",
  remark_optional: "备注 (可选)",
  amount_placeholder: "输入金额",
  confirm: "确认记账",
  confirmation_title: "确认",
  confirm_action: "确认",
  cancel: "取消",

  // Update toast
  update_available: "发现新版本",
  update_now: "立即更新",

  // Year start/end assets
  year_start_assets: "{year}年 年初资产",
  year_end_assets: "{year}年 年末资产盘点",
  bank_card: "银行卡",
  alipay: "支付宝",
  wechat: "微信钱包",
  cash_other: "现金及其他",
  year_end_bank: "年末银行卡",
  year_end_alipay: "年末支付宝",
  year_end_wechat: "年末微信",
  year_end_cash: "年末现金及其他",
  double_verify: "双重验证",

  // Analysis
  yearly_analysis: "年度收支分析",
  yearly_income: "年度总收入",
  yearly_expense: "年度总支出",
  system_balance: "系统结余",
  monthly: "月度",
  monthly_income: "当月收入",
  monthly_expense: "当月支出",
  monthly_balance: "当月结余",

  // Asset reconciliation
  asset_reconciliation: "资产对账",
  initial_assets: "① 期初总资产",
  theoretical_balance: "② 理论应有",
  actual_balance: "③ 实际盘点",
  reconciliation_diff: "对账差异 (③-②)",

  // Categories
  category_dining: "餐饮饮食",
  category_shopping: "服饰购物",
  category_rent: "房租房贷",
  category_transport: "交通出行",
  category_telecom: "话费网费",
  category_utilities: "水电燃气",
  category_entertainment: "休闲娱乐",
  category_health: "医疗健康",
  category_social: "人情社交",
  category_other: "其他支出",
  income_total: "当日总收入",
  daily_total_expense: "当日总支出",
  remark: "备注",

  // Sync status
  synced: "已同步",
  offline: "网络断开",
  saving: "保存中...",
  deposit_error_permission: "您没有权限执行此操作。",
  deposit_error_conflict: "存款已被其他更改更新，请刷新后重试。",
  deposit_error_validation: "请检查存款信息后重试。",
  deposit_error_offline: "当前离线，请恢复网络后重试。",
  deposit_error_unknown: "操作未完成，请重试。",

  // Messages
  login_success: "登录成功",
  login_failed: "登录失败: 账号或密码错误",
  login_unavailable: "无法连接登录服务，请检查网络后重试。",
  login_timeout: "登录等待超时，请检查网络后重试。",
  logout_success: "已安全退出",
  manual_rate_prompt: "请先输入有效的手动汇率数值！",
  manual_rate_applied: "手动汇率已应用",
  syncing_year_switch: "数据正在同步中，请稍后切换年份",
  enter_valid_amount: "请输入有效纯数字金额",
  quick_add_invalid_date: "请选择有效日期",
  quick_add_invalid_category: "请选择分类",
  record_saved: "记录已追加",
  streak_achieved: "恭喜！连续记账{days}天成就达成！",

  // Dialogs
  confirm_logout: "确定要退出账号吗？",
  confirm_import: "警告：导入将覆盖当前云端的所有数据，确定要继续吗？",
  // Chart
  no_data: "暂无数据",

  // Reconciliation
  surplus: "盘盈 · 实际多于账面",
  deficit: "盘亏 · 可能有漏记",
  balanced: "完全平账 ✓",

  // Errors
  fx_unavailable: "汇率不可用，无法换算CNY",

  // Share
  link_copied: "链接已复制！",
  link_copy_failed: "链接复制失败请手动复制浏览器地址",

  // Import
  import_success: "数据导入成功",
  import_file_too_large: "导入文件过大",
  import_dangerous_text: "导入内容包含不安全文本",
  import_format_error: "导入文件格式不受支持",

  // Navigation
  switch_language: "切换语言",

  // Unsaved warning
  unsaved_warning: "数据尚未同步，确定离开吗？",

  // Budget / table headers
  total: "合计",
  budget: "预算",
  used: "已用",
  remaining_days: "剩{days}天",
  daily_available: "日均可用 {amount}",
  year_month_title: "{year}年{month}月",
  balance: "结余",
  expense: "支出",
  income: "收入",

  // Streak
  streak_days: "记账连续天数",
  streak_unit: "天",
  checked_in_today: "今日已打卡",
  not_recorded_yet: "THAO，今天还没记账哦~",
  streak_encouragement: "太棒了！THAO！你已经坚持了 {days} 天，继续保持！",

  // Month tab
  month_tab: "{month}月",

  // Formats
  month_display: "{month}月",
  day_display: "{day}日",
  year_display: "{year}年",
};
