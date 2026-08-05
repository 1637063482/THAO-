/**
 * Apple-style custom dropdown — replaces every native <select> in the app.
 *
 * Markup contract (produced by renderAppDropdown, or hand-written in
 * index.html where the shell owns the markup):
 *
 *   <span class="app-dropdown" data-app-dropdown id="...">
 *     <button type="button" class="app-dropdown-trigger" data-app-dropdown-trigger
 *             role="combobox" aria-haspopup="listbox" aria-expanded="false">
 *       <span class="app-dropdown-value" data-app-dropdown-value></span>
 *       <span class="app-dropdown-chevron" aria-hidden="true">…svg…</span>
 *     </button>
 *     <div class="app-dropdown-menu" data-app-dropdown-menu role="listbox" hidden>
 *       <button type="button" role="option" class="app-dropdown-option"
 *               data-app-dropdown-option="VALUE" aria-selected="true|false">LABEL</button>
 *     </div>
 *     <input type="hidden" data-app-dropdown-hidden>
 *   </span>
 *
 * The hidden input carries an optional `name` so existing form serialization
 * and `form.elements.namedItem(name)` keep working unchanged.
 *
 * Value contract: option values are plain strings; selecting an option stores
 * the exact string in the hidden input and fires a bubbling `change` event on
 * the host with `event.detail.value` set to that string.
 */

const BOUND = new WeakSet();
let dropdownSequence = 0;

/**
 * Parts lookup for hosts whose menu was reparented to document.body.
 * A menu inside a scroll container (quick-add sheet, deposit form sheet) gets
 * clipped the moment it overflows the container — fixed positioning does not
 * escape ancestor overflow clipping. Reparenting the menu to <body> escapes
 * every container; the WeakMap keeps the parts reachable afterwards.
 */
const PARTS = new WeakMap();

const CHEVRON_SVG = '<svg class="app-dropdown-chevron-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';

/** @param {unknown} value */
function escapeHtml(value) {
  /** @type {Record<string, string>} */
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => entities[char] || char);
}

/** @param {{ value: string, label: string, selected?: boolean }} option @param {boolean} selected */
function optionMarkup(option, selected) {
  return `<button type="button" role="option" class="app-dropdown-option" data-app-dropdown-option="${escapeHtml(String(option.value))}" aria-selected="${selected ? "true" : "false"}"><span class="app-dropdown-option-label">${escapeHtml(option.label)}</span></button>`;
}

/**
 * @param {{
 *   id?: string, name?: string, value?: string, placeholder?: string,
 *   disabled?: boolean, className?: string, ariaLabel?: string,
 *   options?: Array<{ value: string, label: string, selected?: boolean }>,
 * }} [options]
 * @returns {string} dropdown markup
 */
export function renderAppDropdown({
  id = "", name = "", value = "", placeholder = "", disabled = false,
  className = "", ariaLabel = "", options = [],
} = {}) {
  const selected = options.find(option => String(option.value) === String(value));
  const label = selected ? selected.label : (value ? String(value) : placeholder);
  const optionHtml = options.map(option => optionMarkup(option, String(option.value) === String(value))).join("");
  const menuId = id ? `${id}-menu` : `app-dropdown-menu-${++dropdownSequence}`;
  return `<span class="app-dropdown${className ? ` ${className}` : ""}" data-app-dropdown${id ? ` id="${escapeHtml(id)}"` : ""}><button type="button" class="app-dropdown-trigger" data-app-dropdown-trigger role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeHtml(menuId)}"${disabled ? " disabled" : ""}${ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : ""} data-app-dropdown-placeholder="${escapeHtml(placeholder)}"><span class="app-dropdown-value${value ? "" : " is-placeholder"}" data-app-dropdown-value>${escapeHtml(label)}</span>${CHEVRON_SVG}</button><div id="${escapeHtml(menuId)}" class="app-dropdown-menu" data-app-dropdown-menu role="listbox" hidden>${optionHtml}</div><input type="hidden" data-app-dropdown-hidden${name ? ` name="${escapeHtml(name)}"` : ""}${value ? ` value="${escapeHtml(String(value))}"` : ""}></span>`;
}

/** @param {Element} host @returns {HTMLElement | null} the option menu (possibly reparented to <body>) */
export function getAppDropdownMenu(host) {
  return PARTS.get(host)?.menu ?? host?.querySelector("[data-app-dropdown-menu]") ?? null;
}

/** @param {Element} host */
export function getAppDropdownValue(host) {
  const hidden = PARTS.get(host)?.hidden ?? host?.querySelector("[data-app-dropdown-hidden]");
  return hidden instanceof HTMLInputElement ? hidden.value : "";
}

/** @param {Element} host @param {string} value */
function syncSelected(host, value) {
  const menu = getAppDropdownMenu(host);
  if (!menu) return;
  menu.querySelectorAll("[data-app-dropdown-option]").forEach(option => {
    option.setAttribute("aria-selected", String(option.getAttribute("data-app-dropdown-option") === String(value)));
  });
}

/** @param {Element} host @param {string} value */
function syncLabel(host, value) {
  const labelNode = host.querySelector("[data-app-dropdown-value]");
  if (!labelNode) return;
  const menu = getAppDropdownMenu(host);
  const match = menu ? [...menu.querySelectorAll("[data-app-dropdown-option]")]
    .find(option => option.getAttribute("data-app-dropdown-option") === String(value)) : null;
  if (match) {
    labelNode.textContent = match.querySelector(".app-dropdown-option-label")?.textContent ?? String(value);
    labelNode.classList.remove("is-placeholder");
  } else {
    const placeholder = host.querySelector("[data-app-dropdown-trigger]")?.getAttribute("data-app-dropdown-placeholder") ?? "";
    labelNode.textContent = value ? String(value) : placeholder;
    labelNode.classList.toggle("is-placeholder", !value);
  }
}

/**
 * Replace the option list. By default keeps the current value when it matches
 * an option; with preserveValue:false always reselects the marked `selected`
 * option (or the first one with autoSelectFirst). Falls back to clearing the
 * value when nothing applies.
 * @param {Element | null} host
 * @param {Array<{ value: string, label: string, selected?: boolean }>} options
 * @param {{ autoSelectFirst?: boolean, preserveValue?: boolean }} [settings]
 */
export function setAppDropdownOptions(host, options, { autoSelectFirst = false, preserveValue = true } = {}) {
  if (!host) return;
  const menu = getAppDropdownMenu(host);
  const hidden = PARTS.get(host)?.hidden ?? /** @type {HTMLInputElement | null} */ (host.querySelector("[data-app-dropdown-hidden]"));
  if (!menu || !hidden) return;
  const current = hidden.value;
  let next;
  if (preserveValue && options.some(option => String(option.value) === current)) next = current;
  else next = options.find(option => option.selected)?.value;
  if (next === undefined && autoSelectFirst && options.length > 0) next = String(options[0].value);
  next = next ?? "";
  menu.innerHTML = options.map(option => optionMarkup(option, String(option.value) === String(next))).join("");
  hidden.value = next;
  syncLabel(host, next);
}

/** @param {Element | null} host @param {string} value */
export function setAppDropdownValue(host, value) {
  if (!host) return;
  const hidden = PARTS.get(host)?.hidden ?? /** @type {HTMLInputElement | null} */ (host.querySelector("[data-app-dropdown-hidden]"));
  if (hidden) hidden.value = String(value);
  syncLabel(host, String(value));
  syncSelected(host, String(value));
}

/**
 * Wire up open/close, keyboard navigation, and option selection for one host.
 * @param {Element | null} host
 * @param {{ onChange?: (value: string) => void, portal?: boolean }} [bindings]
 * @returns {() => void} unbind
 */
export function bindAppDropdown(host, { onChange, portal = true } = {}) {
  if (!host || BOUND.has(host)) return () => {};
  const trigger = host.querySelector("[data-app-dropdown-trigger]");
  const menu = /** @type {HTMLElement | null} */ (host.querySelector("[data-app-dropdown-menu]"));
  const hidden = /** @type {HTMLInputElement | null} */ (host.querySelector("[data-app-dropdown-hidden]"));
  if (!(trigger instanceof HTMLButtonElement) || !menu || !hidden) return () => {};
  // TS7 does not propagate outer narrowing into nested closures, so pin the
  // non-null references into aliases before defining the handlers.
  const hostEl = host;
  const triggerEl = trigger;
  const menuEl = menu;
  const hiddenEl = hidden;
  if (!menuEl.id) menuEl.id = `app-dropdown-menu-${++dropdownSequence}`;
  triggerEl.setAttribute("aria-controls", menuEl.id);
  // Global surfaces use a body portal to escape scroll-container clipping.
  // Local forms can keep the menu in their dialog's positioning context.
  if (portal) {
    menuEl.classList.add("app-dropdown-menu-portal");
    if (menuEl.parentElement !== hostEl.ownerDocument.body) {
      hostEl.ownerDocument.body.appendChild(menuEl);
    }
  } else {
    menuEl.classList.remove("app-dropdown-menu-portal");
  }
  PARTS.set(hostEl, { trigger: triggerEl, menu: menuEl, hidden: hiddenEl });
  BOUND.add(hostEl);

  let activeIndex = -1;

  /** @returns {HTMLButtonElement[]} */
  const options = () => /** @type {HTMLButtonElement[]} */ ([...menuEl.querySelectorAll("[data-app-dropdown-option]")]);
  const isOpen = () => !menuEl.hidden;

  /** @param {HTMLButtonElement} option */
  function select(option) {
    const value = option.getAttribute("data-app-dropdown-option") || "";
    hiddenEl.value = value;
    syncLabel(hostEl, value);
    syncSelected(hostEl, value);
    close();
    hostEl.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value } }));
    onChange?.(value);
    triggerEl.focus();
  }

  function open() {
    if (triggerEl.disabled) return;
    menuEl.hidden = false;
    triggerEl.setAttribute("aria-expanded", "true");
    positionMenu();
    const list = options();
    const selectedIndex = list.findIndex(option => option.getAttribute("aria-selected") === "true");
    activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    list[activeIndex]?.focus({ preventScroll: true });
  }

  function close() {
    menuEl.hidden = true;
    menuEl.classList.remove("app-dropdown-menu-fixed");
    triggerEl.setAttribute("aria-expanded", "false");
  }

  /** @param {Event} _event */
  function onScrollClose(_event) {
    if (isOpen()) close();
  }

  /**
   * Anchor the menu as a fixed viewport layer. An absolutely positioned menu
   * inside a scroll container (quick-add sheet, deposit form sheet) gets
   * clipped when it overflows the container — upward overflow can never be
   * scrolled back into view. A fixed layer escapes the container entirely and
   * stays fully visible by flipping below/above the trigger as needed.
   */
  function positionMenu() {
    if (!portal) return;
    const triggerRect = triggerEl.getBoundingClientRect();
    const doc = hostEl.ownerDocument;
    const win = doc.defaultView;
    const viewportHeight = win?.innerHeight || doc.documentElement.clientHeight;
    const viewportWidth = win?.innerWidth || doc.documentElement.clientWidth;
    menuEl.classList.add("app-dropdown-menu-fixed");
    menuEl.style.left = `${Math.max(8, Math.min(triggerRect.left, viewportWidth - 8))}px`;
    menuEl.style.width = `${Math.min(triggerRect.width, viewportWidth - 16)}px`;
    const menuHeight = menuEl.offsetHeight;
    const below = triggerRect.bottom + 6;
    const above = triggerRect.top - menuHeight - 6;
    let top;
    if (below + menuHeight <= viewportHeight - 8) top = below;
    else if (above >= 8) top = above;
    else top = Math.max(8, viewportHeight - menuHeight - 8);
    menuEl.style.top = `${top}px`;
    // Close on window scroll so the fixed layer never drifts away from its
    // trigger. Window-level only: inner scroll containers (sheets, panels)
    // must not close the menu, and capture would catch those too.
    if (win) win.addEventListener("scroll", onScrollClose, { once: true, passive: true });
  }

  /** @param {number} delta */
  function move(delta) {
    const list = options();
    if (!list.length) return;
    activeIndex = (activeIndex + delta + list.length) % list.length;
    list[activeIndex].focus();
  }

  function onTriggerClick() {
    if (isOpen()) close();
    else open();
  }

  /** @param {KeyboardEvent} event */
  function onTriggerKeydown(event) {
    if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return;
    if (isOpen()) return; // open menu: the host handler manages navigation
    event.preventDefault();
    event.stopPropagation();
    open();
  }

  /** @param {KeyboardEvent} event */
  function onHostKeydown(event) {
    if (!isOpen()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerEl.focus();
    } else if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerEl.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const list = options();
      if (list[activeIndex]) select(list[activeIndex]);
    }
  }

  /** @param {MouseEvent} event */
  function onMenuClick(event) {
    const option = event.target instanceof Element ? event.target.closest("[data-app-dropdown-option]") : null;
    if (option instanceof HTMLButtonElement) select(option);
  }

  /** @param {MouseEvent} event */
  function onOutsideClick(event) {
    if (!isOpen()) return;
    if (event.target instanceof Node && !hostEl.contains(event.target)) close();
  }

  triggerEl.addEventListener("click", onTriggerClick);
  triggerEl.addEventListener("keydown", onTriggerKeydown);
  hostEl.addEventListener("keydown", /** @type {EventListener} */ (onHostKeydown));
  // The menu is reparented to <body>, so option key events no longer pass
  // through the host — listen on the menu itself for navigation/close keys.
  menuEl.addEventListener("keydown", /** @type {EventListener} */ (onHostKeydown));
  menuEl.addEventListener("click", onMenuClick);
  /** @type {Document} */ (hostEl.ownerDocument).addEventListener("click", /** @type {EventListener} */ (onOutsideClick));

  return function unbindAppDropdown() {
    BOUND.delete(hostEl);
    PARTS.delete(hostEl);
    triggerEl.removeEventListener("click", onTriggerClick);
    triggerEl.removeEventListener("keydown", onTriggerKeydown);
    hostEl.removeEventListener("keydown", /** @type {EventListener} */ (onHostKeydown));
    menuEl.removeEventListener("keydown", /** @type {EventListener} */ (onHostKeydown));
    menuEl.removeEventListener("click", onMenuClick);
    /** @type {Document} */ (hostEl.ownerDocument).removeEventListener("click", /** @type {EventListener} */ (onOutsideClick));
    // Return the menu to its host so re-rendered DOM does not orphan it.
    menuEl.classList.remove("app-dropdown-menu-portal");
    if (menuEl.parentElement !== hostEl) hostEl.appendChild(menuEl);
  };
}
