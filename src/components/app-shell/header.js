export function renderHeader(host) {
  if (!host) throw new Error("App header host is required");

  host.className = "sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-amber-100/60 shadow-sm";
  host.innerHTML = `
    <nav data-i18n-aria-label="main_navigation">
      <div class="max-w-[2200px] px-4 md:px-6 py-2.5 flex flex-wrap gap-2 justify-between items-center mx-auto">
        <div class="flex items-center gap-3">
          <span data-icon="wallet" data-icon-class="w-8 h-8 text-amber-500 animate-float"></span>
          <h1 class="text-xl font-black text-slate-800 font-heading flex items-center gap-2">
            <span class="relative inline-flex items-center bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl px-3 py-1.5 transition-colors cursor-pointer group shadow-sm">
              <select id="year-selector" onchange="window.changeYear(this.value)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="" data-i18n="switch_year"></select>
              <span id="display-year-text" class="text-amber-700 font-black text-lg pointer-events-none px-1 tracking-tight"></span>
              <svg class="w-4 h-4 text-amber-500 pointer-events-none group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
            </span>
            <span class="hidden sm:inline text-slate-700" data-i18n="yearly_expense_record"></span>
          </h1>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200/60 shadow-inner">
            <button type="button" id="btn-lang-vi" data-command="language" data-locale="vi" class="month-tab active min-w-[40px] text-xs">VI</button>
            <button type="button" id="btn-lang-zh" data-command="language" data-locale="zh-CN" class="month-tab min-w-[40px] text-xs">中文</button>
          </div>
          <div class="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200/60 shadow-inner">
            <button type="button" id="btn-curr-vnd" onclick="window.switchCurrency('VND')" class="month-tab active min-w-[52px] text-xs">VND</button>
            <button type="button" id="btn-curr-cny" onclick="window.switchCurrency('CNY')" class="month-tab min-w-[52px] text-xs">CNY</button>
          </div>
          <div id="fx-panel" class="hidden items-center gap-2 bg-white/80 rounded-xl px-3 py-1.5 border border-slate-200/60">
            <span class="text-xs text-slate-500 font-medium" data-i18n="fx_label"></span>
            <span id="auto-rate-display" class="text-xs font-bold text-amber-600" data-i18n="fx_loading"></span>
            <span class="flex items-center gap-1 ml-2">
              <button type="button" onclick="window.changeFxMode('auto')" class="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-600 font-semibold" data-i18n="auto"></button>
              <button type="button" onclick="window.changeFxMode('manual')" class="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-medium" data-i18n="manual"></button>
              <input type="number" id="manual-rate-input" class="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1" placeholder="3500" disabled>
              <button type="button" id="btn-apply-rate" onclick="window.applyManualRate()" class="hidden text-xs px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600" data-i18n="apply"></button>
            </span>
          </div>
          <button type="button" data-command="theme" class="btn-icon" title="" data-i18n="toggle_theme" id="btn-theme">
            <span data-icon="moon" data-icon-class="w-5 h-5"></span>
          </button>
          <button type="button" data-command="privacy" class="btn-icon" title="" data-i18n="toggle_privacy" id="btn-privacy">
            <span data-icon="eye" data-icon-class="w-5 h-5"></span>
          </button>
          <button type="button" class="sm:hidden btn-icon relative" id="nav-more-btn" title="" data-i18n="more">
            <span data-icon="dotsHorizontal" data-icon-class="w-5 h-5"></span>
          </button>
          <div class="contents" data-app-command-menu-host></div>
        </div>
      </div>
    </nav>
  `;
  return host;
}
