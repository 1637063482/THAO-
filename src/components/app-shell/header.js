/**
 * @param {import("../../types/dom-contracts").DomHost} host
 */
export function renderHeader(host) {
  if (!host) throw new Error("App header host is required");

  host.className = "app-header safe-area-top";
  host.innerHTML = `
    <nav data-i18n-aria-label="main_navigation">
      <div class="app-header-content max-w-[2200px] px-4 md:px-6 py-2.5 flex gap-2 justify-between items-center mx-auto">
        <div class="app-header-primary flex items-center gap-3 min-w-0">
          <span data-icon="wallet" data-icon-class="w-7 h-7 text-blue-500"></span>
          <h1 class="text-xl font-black text-slate-800 font-heading flex items-center gap-2 min-w-0">
            <span class="app-header-year-control inline-flex items-center cursor-pointer">
              <span class="app-dropdown" id="year-selector" data-app-dropdown>
                <button type="button" class="app-dropdown-trigger" data-app-dropdown-trigger role="combobox" aria-haspopup="listbox" aria-expanded="false" data-i18n-aria-label="switch_year">
                  <span class="app-dropdown-value" data-app-dropdown-value></span>
                  <span class="app-dropdown-chevron" aria-hidden="true"><svg class="app-dropdown-chevron-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
                </button>
                <div class="app-dropdown-menu app-dropdown-menu-year" data-app-dropdown-menu role="listbox" hidden></div>
                <input type="hidden" data-app-dropdown-hidden>
              </span>
            </span>
            <span class="hidden sm:inline text-slate-700" data-i18n="yearly_expense_record"></span>
          </h1>
        </div>
        <div class="app-header-tools flex items-center gap-2 shrink-0">
          <div id="sync-status" class="app-sync-status" role="status" aria-live="polite" aria-atomic="true">
            <span class="app-sync-status-indicator" aria-hidden="true"></span>
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
