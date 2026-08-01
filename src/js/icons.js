// ==========================================
// icons.js — SVG 图标库 (Lucide-inspired)
// 替代全站 Emoji，支持主题化、缩放、动画
// ==========================================

// 基础 SVG 属性
const BASE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/**
 * 生成 icon SVG HTML 字符串
 * @param {string} inner — SVG 内部路径
 * @param {string} className — 额外 CSS class
 * @param {string} size — 尺寸，如 "w-5 h-5"
 * @returns {string}
 */
function icon(inner, className = '', size = 'w-5 h-5') {
  const cls = `${size} inline-block shrink-0 ${className}`.trim();
  return `<svg class="${cls}" ${BASE} viewBox="0 0 24 24">${inner}</svg>`;
}

export const Icons = {
  // 财务/资金
  wallet: (cls, sz) => icon('<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 1-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>', cls, sz),
  coin: (cls, sz) => icon('<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>', cls, sz),
  bank: (cls, sz) => icon('<path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/>', cls, sz),
  piggyBank: (cls, sz) => icon('<circle cx="11" cy="3" r="1.5"/><path d="M4 13c0-4 3-7 8-7h2l2-2v3c2 1 3 2.5 3.5 4H22v4h-2.5c-.5 1.5-1.5 2.5-3 3.2V21h-3v-2H9v2H6v-3c-1.3-1.2-2-2.9-2-5Z"/><path d="M4 11H2V8"/><path d="M10 9h4"/><path d="M16 11h.01"/><path d="M6 18v3"/>', cls, sz),

  // 图表/分析
  chart: (cls, sz) => icon('<path d="M3 3v18h18"/><path d="M7 16h2"/><path d="M11 11h2"/><path d="M15 6h2"/><path d="M19 9h2"/>', cls, sz),
  chartBar: (cls, sz) => icon('<path d="M3 3v18h18"/><path d="M7 16V8"/><path d="M11 16v-4"/><path d="M15 16v-2"/><path d="M19 16v-6"/>', cls, sz),
  trendingUp: (cls, sz) => icon('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>', cls, sz),
  target: (cls, sz) => icon('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', cls, sz),

  // 操作
  plus: (cls, sz) => icon('<path d="M5 12h14"/><path d="M12 5v14"/>', cls, sz),
  xMark: (cls, sz) => icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', cls, sz),
  check: (cls, sz) => icon('<path d="M20 6 9 17l-5-5"/>', cls, sz),
  download: (cls, sz) => icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>', cls, sz),
  link: (cls, sz) => icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', cls, sz),
  zap: (cls, sz) => icon('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>', cls, sz),

  // 电子支付
  smartphone: (cls, sz) => icon('<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/>', cls, sz),
  creditCard: (cls, sz) => icon('<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>', cls, sz),

  // 导航/UI
  menu: (cls, sz) => icon('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>', cls, sz),
  chevronDown: (cls, sz) => icon('<polyline points="6 9 12 15 18 9"/>', cls, sz),
  dotsHorizontal: (cls, sz) => icon('<circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/>', cls, sz),
  search: (cls, sz) => icon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', cls, sz),
  lock: (cls, sz) => icon('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', cls, sz),
  eye: (cls, sz) => icon('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', cls, sz),
  eyeOff: (cls, sz) => icon('<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>', cls, sz),
  settings: (cls, sz) => icon('<circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/>', cls, sz),
  user: (cls, sz) => icon('<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>', cls, sz),
  logOut: (cls, sz) => icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>', cls, sz),
  calendar: (cls, sz) => icon('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>', cls, sz),
  home: (cls, sz) => icon('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', cls, sz),

  // 主题
  sun: (cls, sz) => icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>', cls, sz),
  moon: (cls, sz) => icon('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', cls, sz),

  // 反馈/状态
  alertCircle: (cls, sz) => icon('<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>', cls, sz),
  info: (cls, sz) => icon('<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/>', cls, sz),
  checkCircle: (cls, sz) => icon('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>', cls, sz),

  tag: (cls, sz) => icon('<path d="M12 2H2v10l9.17 9.17a2 2 0 0 0 2.83 0l7-7a2 2 0 0 0 0-2.83L12 2Z"/><path d="M7 7h.01"/>', cls, sz),
  // 杂项
  flame: (cls, sz) => icon('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>', cls, sz),
  pencil: (cls, sz) => icon('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>', cls, sz),
  share: (cls, sz) => icon('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>', cls, sz),
  fileText: (cls, sz) => icon('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>', cls, sz),
};

/**
 * 直接在 DOM 中替换带 data-icon 属性的元素内容为 SVG 图标
 * 用法: <span data-icon="wallet" data-icon-class="w-5 h-5"></span>
 */
export function initIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    const cls = el.dataset.iconClass || 'w-5 h-5';
    const iconFn = Icons[name];
    if (iconFn) {
      // Icons take (className, size); the data-icon-class attribute is the
      // size/utility string, so pass it in the size slot. Passing it as the
      // className instead produced duplicate conflicting size classes
      // (e.g. "w-5 h-5 … w-3.5 h-3.5") that left icons at the default size.
      el.innerHTML = iconFn('', cls);
    }
  });
}
