/**
 * @param {import("../../types/dom-contracts").DomHost} host
 */
export function renderCommandMenu(host) {
  if (!host) throw new Error("App command menu host is required");
  const documentRef = host.ownerDocument || document;
  host.innerHTML = "";
  documentRef.getElementById("nav-secondary")?.remove();
  const panel = documentRef.createElement("div");
  panel.id = "nav-secondary";
  panel.className = "nav-secondary-group app-command-menu app-confirmation-backdrop";
  panel.innerHTML = `
      <section class="app-command-menu-dialog app-confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="nav-secondary-title">
        <header class="app-command-menu-header">
          <div>
            <p class="app-command-menu-eyebrow" data-i18n="command_menu_eyebrow"></p>
            <h2 id="nav-secondary-title" data-i18n="more"></h2>
          </div>
          <button type="button" id="nav-secondary-close" class="app-icon-btn" title="" data-i18n-aria-label="close">
            <span data-icon="xMark" data-icon-class="w-5 h-5"></span>
          </button>
        </header>
        <div class="app-command-menu-content">
          <section class="app-command-menu-section" aria-labelledby="command-menu-preferences-title">
            <h3 id="command-menu-preferences-title" class="app-command-menu-section-title" data-i18n="command_menu_preferences"></h3>
            <div class="app-command-menu-preferences">
              <div class="app-segment">
                <button type="button" id="btn-lang-vi" data-command="language" data-locale="vi" class="month-tab active min-w-[40px] text-xs">VI</button>
                <button type="button" id="btn-lang-zh" data-command="language" data-locale="zh-CN" class="month-tab min-w-[40px] text-xs">中文</button>
              </div>
              <button type="button" data-command="theme" class="btn-ghost text-xs py-2" title="" data-i18n="toggle_theme" data-i18n-aria-label="toggle_theme" id="btn-theme">
                <span data-icon="moon" data-icon-class="w-4 h-4"></span>
                <span data-i18n="toggle_theme"></span>
              </button>
              <button type="button" data-command="privacy" class="btn-ghost text-xs py-2" title="" data-i18n="toggle_privacy" data-i18n-aria-label="toggle_privacy" id="btn-privacy">
                <span data-icon="eye" data-icon-class="w-4 h-4"></span>
                <span data-i18n="toggle_privacy"></span>
              </button>
            </div>
          </section>
          <section class="app-command-menu-section" aria-labelledby="command-menu-actions-title">
            <h3 id="command-menu-actions-title" class="app-command-menu-section-title" data-i18n="command_menu_actions"></h3>
            <div class="app-command-menu-actions">
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
                <span data-icon="upload" data-icon-class="w-4 h-4"></span>
                <span id="export-label-text" data-i18n="export_csv"></span>
              </button>
              <button type="button" id="btn-logout" data-command="logout" class="btn-danger text-xs py-2">
                <span data-icon="logOut" data-icon-class="w-4 h-4"></span>
                <span data-i18n="logout"></span>
              </button>
            </div>
          </section>
          <section class="app-command-menu-section" aria-labelledby="command-menu-currency-title">
            <h3 id="command-menu-currency-title" class="app-command-menu-section-title" data-i18n="command_menu_currency"></h3>
            <div class="app-command-menu-currency">
              <div class="app-segment">
                <button type="button" id="btn-curr-vnd" onclick="window.switchCurrency('VND')" class="month-tab active min-w-[52px] text-xs">VND</button>
                <button type="button" id="btn-curr-cny" onclick="window.switchCurrency('CNY')" class="month-tab min-w-[52px] text-xs">CNY</button>
              </div>
              <div id="fx-panel" class="app-fx-panel hidden rounded-xl px-3 py-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-xs font-medium shrink-0" data-i18n="fx_label"></span>
                  <span id="auto-rate-display" class="text-xs font-bold text-[var(--color-primary)] truncate" data-i18n="fx_loading"></span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <button type="button" id="fx-mode-auto" onclick="window.changeFxMode('auto')" class="fx-chip active" data-i18n="auto"></button>
                  <button type="button" id="fx-mode-manual" onclick="window.changeFxMode('manual')" class="fx-chip" data-i18n="manual"></button>
                  <input type="number" id="manual-rate-input" class="fx-rate-input hidden" value="3700" placeholder="3700" disabled>
                  <button type="button" id="btn-apply-rate" onclick="window.applyManualRate()" class="fx-apply-btn hidden" data-i18n="apply"></button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
  `;
  documentRef.body.append(panel);
  return panel;
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
  const closeButton = root.getElementById("nav-secondary-close");
  /** @type {HTMLElement|null} */
  const dialogElement = panelElement.querySelector(".app-command-menu-dialog");
  const windowRef = panelElement.ownerDocument.defaultView;
  /** @type {number|null} */
  let flipFrame = null;
  /** @type {number|null} */
  let closeTimer = null;
  let flipSequence = 0;
  const closeDuration = 1200;
  panelElement.setAttribute("aria-hidden", "true");
  const body = panelElement.ownerDocument.body;

  /** @param {(timestamp: number) => void} callback */
  function requestFrame(callback) {
    if (windowRef?.requestAnimationFrame) return windowRef.requestAnimationFrame(callback);
    return setTimeout(callback, 0);
  }

  /** @param {number|null} frame */
  function cancelFrame(frame) {
    if (frame === null || frame === undefined) return;
    if (windowRef?.cancelAnimationFrame) windowRef.cancelAnimationFrame(frame);
    else clearTimeout(frame);
  }

  function cancelFlip() {
    flipSequence += 1;
    cancelFrame(flipFrame);
    flipFrame = null;
  }

  function cancelClose() {
    if (closeTimer !== null) {
      if (windowRef?.clearTimeout) windowRef.clearTimeout(closeTimer);
      else clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function setFlipGeometry() {
    if (!dialogElement) return;
    const viewportWidth = windowRef?.innerWidth || panelElement.ownerDocument.documentElement.clientWidth || 560;
    const viewportHeight = windowRef?.innerHeight || panelElement.ownerDocument.documentElement.clientHeight || 768;
    const triggerRect = buttonElement.getBoundingClientRect();
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;
    const targetWidth = Math.min(560, Math.max(viewportWidth - 32, 1));
    const scale = Math.max(Math.min(triggerRect.width / targetWidth, 0.5), 0.3);

    dialogElement.style.setProperty("--nav-secondary-flip-x", `${triggerCenterX - viewportWidth / 2}px`);
    dialogElement.style.setProperty("--nav-secondary-flip-y", `${triggerCenterY - viewportHeight / 2}px`);
    dialogElement.style.setProperty("--nav-secondary-flip-scale", String(scale));
  }

  function prepareFlip() {
    if (!dialogElement) return;
    setFlipGeometry();
    dialogElement.style.setProperty("transition", "none");
    dialogElement.classList.add("app-command-menu-dialog--flip-start");
  }

  function playFlip() {
    if (!dialogElement) return;
    const sequence = flipSequence;
    flipFrame = requestFrame(() => {
      flipFrame = requestFrame(() => {
        flipFrame = null;
        if (sequence === flipSequence) {
          dialogElement.style.removeProperty("transition");
          void dialogElement.offsetWidth;
          dialogElement.classList.remove("app-command-menu-dialog--flip-start");
        }
      });
    });
  }

  /**
   * @param {boolean} open
   * @param {boolean} [restoreFocus]
   */
  function setOpen(open, restoreFocus = false) {
    cancelFlip();
    cancelClose();
    if (open) {
      dialogElement?.classList.remove("app-command-menu-dialog--flip-close");
      panelElement.style.removeProperty("transition");
      panelElement.classList.remove("closing");
      prepareFlip();
      panelElement.classList.add("open");
    } else if (panelElement.classList.contains("open")) {
      dialogElement?.classList.remove("app-command-menu-dialog--flip-start");
      dialogElement?.style.removeProperty("transition");
      setFlipGeometry();
      dialogElement?.style.setProperty("transition", `transform ${closeDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`);
      dialogElement?.classList.add("app-command-menu-dialog--flip-close");
      panelElement.style.setProperty("transition", `opacity ${closeDuration}ms ease-out`);
      panelElement.classList.remove("open");
      panelElement.classList.add("closing");
      closeTimer = /** @type {number} */ ((windowRef?.setTimeout || window.setTimeout)(() => {
        closeTimer = null;
        dialogElement?.classList.remove("app-command-menu-dialog--flip-close");
        panelElement.classList.remove("closing");
        panelElement.style.removeProperty("transition");
      }, closeDuration));
    } else {
      dialogElement?.classList.remove("app-command-menu-dialog--flip-start", "app-command-menu-dialog--flip-close");
      dialogElement?.style.removeProperty("transition");
      panelElement.classList.remove("closing");
      panelElement.style.removeProperty("transition");
    }
    buttonElement.setAttribute("aria-expanded", String(open));
    panelElement.setAttribute("aria-hidden", String(!open));
    body.classList.toggle("app-modal-open", open);
    if (open) playFlip();
    if (open) panelElement.querySelector("button")?.focus({ preventScroll: true });
    if (restoreFocus) buttonElement.focus();
  }

  /** @param {MouseEvent} event */
  function toggle(event) {
    event.stopPropagation();
    setOpen(!panelElement.classList.contains("open"));
  }

  function closeFromButton() {
    setOpen(false, true);
  }

  /** @param {MouseEvent} event */
  function closeFromBackdrop(event) {
    if (event.target === panelElement) setOpen(false, true);
  }

  /** @param {KeyboardEvent} event */
  function closeFromEscape(event) {
    if (event.key === "Escape" && panelElement.classList.contains("open")) {
      event.preventDefault();
      setOpen(false, true);
    }
  }

  buttonElement.addEventListener("click", toggle);
  closeButton?.addEventListener("click", closeFromButton);
  panelElement.addEventListener("click", closeFromBackdrop);
  root.addEventListener("keydown", closeFromEscape);

  return function unbindCommandMenu() {
    cancelFlip();
    cancelClose();
    dialogElement?.classList.remove("app-command-menu-dialog--flip-start");
    dialogElement?.classList.remove("app-command-menu-dialog--flip-close");
    dialogElement?.style.removeProperty("transition");
    panelElement.style.removeProperty("transition");
    buttonElement.removeEventListener("click", toggle);
    closeButton?.removeEventListener("click", closeFromButton);
    panelElement.removeEventListener("click", closeFromBackdrop);
    root.removeEventListener("keydown", closeFromEscape);
    body.classList.remove("app-modal-open");
  };
}
