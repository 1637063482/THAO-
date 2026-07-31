/**
 * @param {import("../../types/dom-contracts").DomHost} host
 */
export function renderCommandMenu(host) {
  if (!host) throw new Error("App command menu host is required");
  host.innerHTML = `
    <div id="nav-secondary" class="nav-secondary-group">
      <div class="command-menu-group">
        <div class="segmented-control" role="group" aria-label="Language">
          <button type="button" id="btn-lang-vi" data-command="language" data-locale="vi" class="month-tab active min-w-[40px] text-xs">VI</button>
          <button type="button" id="btn-lang-zh" data-command="language" data-locale="zh-CN" class="month-tab min-w-[40px] text-xs">中文</button>
        </div>
        <button type="button" data-command="theme" class="btn-ghost text-xs py-2" title="" data-i18n="toggle_theme" id="btn-theme">
          <span data-icon="moon" data-icon-class="w-4 h-4"></span>
        </button>
        <button type="button" data-command="privacy" class="btn-ghost text-xs py-2" title="" data-i18n="toggle_privacy" id="btn-privacy">
          <span data-icon="eye" data-icon-class="w-4 h-4"></span>
        </button>
      </div>
      <button type="button" data-command="import" class="btn-ghost text-xs py-2" title="" data-i18n="import_label">
        <span data-icon="download" data-icon-class="w-4 h-4"></span>
        <span id="import-label-text" data-i18n="import_label"></span>
      </button>
      <input type="file" id="import-file" class="hidden" accept=".json" onchange="window.importData(event)">
      <button type="button" data-command="share" class="btn-ghost text-xs py-2" title="" data-i18n="share">
        <span data-icon="link" data-icon-class="w-4 h-4"></span>
        <span id="invite-label-text" data-i18n="share"></span>
      </button>
      <button type="button" data-command="export" class="btn-primary text-xs py-2">
        <span data-icon="download" data-icon-class="w-4 h-4"></span>
        <span id="export-label-text" data-i18n="export_csv"></span>
      </button>
      <div class="command-menu-group">
        <div class="segmented-control" role="group" aria-label="Currency">
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
      </div>
    </div>
  `;
  return host;
}

/**
 * @param {Document} [root]
 */
export function bindCommandMenu(root = document) {
  const panel = root.getElementById("nav-secondary");
  const button = root.getElementById("nav-more-btn");
  if (!panel || !button) return () => {};
  const panelElement = panel;
  const buttonElement = button;

  /**
   * @param {boolean} open
   * @param {boolean} [restoreFocus]
   */
  function setOpen(open, restoreFocus = false) {
    panelElement.classList.toggle("open", open);
    buttonElement.setAttribute("aria-expanded", String(open));
    if (open) panelElement.querySelector("button")?.focus();
    if (restoreFocus) buttonElement.focus();
  }

  /** @param {MouseEvent} event */
  function toggle(event) {
    event.stopPropagation();
    setOpen(!panelElement.classList.contains("open"));
  }

  /** @param {MouseEvent} event */
  function closeFromOutside(event) {
    if (!panelElement.classList.contains("open")) return;
    if (
      event.target instanceof Node
      && !panelElement.contains(event.target)
      && !buttonElement.contains(event.target)
    ) {
      setOpen(false);
    }
  }

  /** @param {KeyboardEvent} event */
  function closeFromEscape(event) {
    if (event.key === "Escape" && panelElement.classList.contains("open")) {
      event.preventDefault();
      setOpen(false, true);
    }
  }

  buttonElement.addEventListener("click", toggle);
  root.addEventListener("click", closeFromOutside);
  root.addEventListener("keydown", closeFromEscape);

  return function unbindCommandMenu() {
    buttonElement.removeEventListener("click", toggle);
    root.removeEventListener("click", closeFromOutside);
    root.removeEventListener("keydown", closeFromEscape);
  };
}
