/**
 * @param {import("../../types/dom-contracts").DomHost} host
 */
export function renderHeader(host) {
  if (!host) throw new Error("App header host is required");

  host.className = "safe-area-top sticky top-0 z-50 app-header";
  host.innerHTML = `
    <nav data-i18n-aria-label="main_navigation">
      <div class="app-header-content max-w-[2200px] px-4 md:px-6 py-2.5 flex gap-2 justify-between items-center mx-auto">
        <div class="app-header-primary flex items-center gap-3 min-w-0">
          <span data-icon="wallet" data-icon-class="w-8 h-8 text-amber-500"></span>
          <h1 class="text-xl font-black text-slate-800 font-heading flex items-center gap-2 min-w-0">
            <span class="relative inline-flex items-center bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl px-3 py-1.5 transition-colors cursor-pointer group shadow-sm">
              <select id="year-selector" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="" data-i18n="switch_year"></select>
              <span id="display-year-text" class="text-amber-700 font-black text-lg pointer-events-none px-1 tracking-tight"></span>
              <svg class="w-4 h-4 text-amber-500 pointer-events-none group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
            </span>
            <span class="hidden sm:inline text-slate-700" data-i18n="yearly_expense_record"></span>
          </h1>
        </div>
        <div class="app-header-tools flex items-center gap-2 shrink-0">
          <div id="sync-status" class="sync-status-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors">
            <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span></span>
            <span id="sync-status-text" data-i18n="loading"></span>
          </div>
          <button type="button" class="btn-icon relative" id="nav-more-btn" title="" data-i18n="more" data-i18n-aria-label="more" aria-haspopup="true" aria-controls="nav-secondary" aria-expanded="false">
            <span data-icon="dotsHorizontal" data-icon-class="w-5 h-5"></span>
          </button>
          <div class="contents" data-app-command-menu-host></div>
        </div>
      </div>
    </nav>
  `;
  return host;
}
