/**
 * Apple-style date picker — replaces every native <input type="date">.
 *
 * Markup contract (produced by renderAppDatePicker):
 *
 *   <span class="app-datepicker" data-app-datepicker>
 *     <button type="button" class="app-datepicker-trigger" data-app-datepicker-trigger
 *             role="combobox" aria-haspopup="dialog" aria-expanded="false">
 *       <span class="app-datepicker-value" data-app-datepicker-value></span>
 *       <span class="app-datepicker-chevron" aria-hidden="true">…svg…</span>
 *     </button>
 *     <div class="app-datepicker-calendar app-dropdown-menu"
 *          data-app-datepicker-calendar role="dialog" hidden></div>
 *     <input type="hidden" data-app-datepicker-hidden>
 *   </span>
 *
 * Value contract: the hidden input always stores `YYYY-MM-DD` (the format the
 * deposit writers expect); the trigger displays a localized date format.
 * Selecting a day fires a bubbling `change` event on the host with
 * `event.detail.value` set to the `YYYY-MM-DD` string.
 *
 * The calendar is reparented to <body> and positioned as a fixed viewport
 * layer, mirroring app-dropdown.js — a menu inside a scroll container gets
 * clipped the moment it overflows.
 */

const CALENDARS = new WeakMap();
let datePickerSequence = 0;

const CHEVRON_SVG = '<svg class="app-datepicker-chevron-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';

/**
 * @typedef {{ months: string[], weekdays: string[], title: (year: number, month: number) => string, format: (year: number, month: number, day: number) => string, previous: string, next: string }} DateLocale
 * @type {Record<string, DateLocale>}
 */
const LOCALES = {
  vi: {
    months: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
    weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    title: (year, month) => `Tháng ${month} ${year}`,
    format: (year, month, day) => `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
    previous: "Tháng trước",
    next: "Tháng sau",
  },
  "zh-CN": {
    months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    weekdays: ["一", "二", "三", "四", "五", "六", "日"],
    title: (year, month) => `${year}年${month}月`,
    format: (year, month, day) => `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
    previous: "上个月",
    next: "下个月",
  },
};

/** @param {unknown} value */
function escapeHtml(value) {
  /** @type {Record<string, string>} */
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => entities[char] || char);
}

/** @param {string} value @returns {{ year: number, month: number, day: number } | null} */
function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

/** @param {{ year: number, month: number, day: number }} d @returns {string} */
function toIso(d) {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

/** @param {string} iso @param {number} offsetMonths @returns {{ year: number, month: number, day: number }} */
function shiftMonth(iso, offsetMonths) {
  const parsed = parseIsoDate(iso) || (() => {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
  })();
  const d = new Date(Date.UTC(parsed.year, parsed.month - 1 + offsetMonths, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: 1 };
}

/**
 * @param {{
 *   id?: string, name?: string, value?: string, placeholder?: string,
 *   locale?: string, minDate?: string,
 * }} [options]
 * @returns {string} date picker markup
 */
export function renderAppDatePicker({
  id = "", name = "", value = "", placeholder = "", locale = "vi", minDate = "",
} = {}) {
  const labels = LOCALES[locale] || LOCALES.vi;
  const parsed = parseIsoDate(value);
  const label = parsed ? labels.format(parsed.year, parsed.month, parsed.day) : placeholder;
  const calendarDate = parsed || (() => { const now = new Date(); return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() }; })();
  const calendarId = id ? `${id}-calendar` : `app-datepicker-calendar-${++datePickerSequence}`;
  return `<span class="app-datepicker" data-app-datepicker${id ? ` id="${escapeHtml(id)}"` : ""}><button type="button" class="app-datepicker-trigger" data-app-datepicker-trigger role="combobox" aria-haspopup="dialog" aria-expanded="false" aria-controls="${escapeHtml(calendarId)}" data-app-datepicker-placeholder="${escapeHtml(placeholder)}"${minDate ? ` data-app-datepicker-min="${escapeHtml(minDate)}"` : ""}><span class="app-datepicker-value${parsed ? "" : " is-placeholder"}" data-app-datepicker-value>${escapeHtml(label)}</span>${CHEVRON_SVG}</button><div id="${escapeHtml(calendarId)}" class="app-datepicker-calendar app-dropdown-menu" data-app-datepicker-calendar role="dialog" aria-label="${escapeHtml(labels.title(calendarDate.year, calendarDate.month))}" hidden></div><input type="hidden" data-app-datepicker-hidden${name ? ` name="${escapeHtml(name)}"` : ""}${value ? ` value="${escapeHtml(String(value))}"` : ""}></span>`;
}

/** @param {Element | null} host */
export function getAppDatePickerValue(host) {
  const hidden = (host && CALENDARS.get(host)?.hidden) ?? host?.querySelector("[data-app-datepicker-hidden]");
  return hidden instanceof HTMLInputElement ? hidden.value : "";
}

/** @param {Element} host @param {DateLocale} labels @param {{ year: number, month: number, day: number }} d @param {string} iso @param {string} minDate */
function renderCalendar(host, labels, d, iso, minDate) {
  const calendar = CALENDARS.get(host)?.calendar;
  if (!calendar) return;
  const first = new Date(Date.UTC(d.year, d.month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // week starts Monday
  const daysInMonth = new Date(Date.UTC(d.year, d.month, 0)).getUTCDate();
  const todayIso = (() => {
    const now = new Date();
    return toIso({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() });
  })();
  const minIso = String(minDate || "");

  let cells = "";
  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - offset + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const cellIso = inMonth ? toIso({ year: d.year, month: d.month, day: dayNumber }) : "";
    const isSelected = inMonth && cellIso === iso;
    const isToday = inMonth && cellIso === todayIso;
    const disabled = inMonth && minIso !== "" && cellIso < minIso;
    const classes = ["app-datepicker-day"];
    if (!inMonth) classes.push("is-outside");
    if (isSelected) classes.push("is-selected");
    if (isToday) classes.push("is-today");
    if (disabled) classes.push("is-disabled");
    cells += `<button type="button" class="${classes.join(" ")}" data-app-datepicker-day="${escapeHtml(cellIso)}"${inMonth ? ` role="option" aria-selected="${isSelected ? "true" : "false"}" aria-label="${escapeHtml(labels.format(d.year, d.month, dayNumber))}"${disabled ? " disabled" : ""}` : ' disabled aria-hidden="true" tabindex="-1"'}>${inMonth ? dayNumber : ""}</button>`;
  }

  const weekdays = labels.weekdays.map(w => `<span class="app-datepicker-weekday">${escapeHtml(w)}</span>`).join("");
  calendar.setAttribute("aria-label", labels.title(d.year, d.month));
  calendar.innerHTML = `<div class="app-datepicker-calendar-header"><button type="button" class="app-datepicker-nav" data-app-datepicker-prev aria-label="${escapeHtml(labels.previous)}">‹</button><span class="app-datepicker-calendar-title">${escapeHtml(labels.title(d.year, d.month))}</span><button type="button" class="app-datepicker-nav" data-app-datepicker-next aria-label="${escapeHtml(labels.next)}">›</button></div><div class="app-datepicker-weekdays">${weekdays}</div><div class="app-datepicker-grid" role="listbox">${cells}</div>`;
}

/** @param {Element | null} host @param {string} minDate */
export function setAppDatePickerMinDate(host, minDate) {
  if (!host) return;
  const trigger = host.querySelector("[data-app-datepicker-trigger]");
  if (!trigger) return;
  if (minDate) trigger.setAttribute("data-app-datepicker-min", String(minDate));
  else trigger.removeAttribute("data-app-datepicker-min");
}

/** @param {Element | null} host @param {string} value */
export function setAppDatePickerValue(host, value) {
  if (!host) return;
  const hidden = CALENDARS.get(host)?.hidden ?? host.querySelector("[data-app-datepicker-hidden]");
  if (hidden) hidden.value = String(value);
  syncDateLabel(host, String(value));
}

/** @param {Element} host @param {string} value */
function syncDateLabel(host, value) {
  const labelNode = host.querySelector("[data-app-datepicker-value]");
  if (!labelNode) return;
  const parsed = parseIsoDate(value);
  if (parsed) {
    const labels = CALENDARS.get(host)?.labels || LOCALES.vi;
    labelNode.textContent = labels.format(parsed.year, parsed.month, parsed.day);
    labelNode.classList.remove("is-placeholder");
  } else {
    const placeholder = host.querySelector("[data-app-datepicker-trigger]")?.getAttribute("data-app-datepicker-placeholder") ?? "";
    labelNode.textContent = placeholder;
    labelNode.classList.add("is-placeholder");
  }
}

/**
 * Wire up open/close, calendar navigation, and day selection for one host.
 * @param {Element | null} host
 * @param {{ onChange?: (value: string) => void, locale?: string, minDate?: string, portal?: boolean }} [bindings]
 * @returns {() => void} unbind
 */
export function bindAppDatePicker(host, { onChange, locale = "vi", minDate = "", portal = true } = {}) {
  if (!host || CALENDARS.has(host)) return () => {};
  const trigger = host.querySelector("[data-app-datepicker-trigger]");
  const calendar = /** @type {HTMLElement | null} */ (host.querySelector("[data-app-datepicker-calendar]"));
  const hidden = /** @type {HTMLInputElement | null} */ (host.querySelector("[data-app-datepicker-hidden]"));
  if (!(trigger instanceof HTMLButtonElement) || !calendar || !hidden) return () => {};
  const labels = LOCALES[locale] || LOCALES.vi;
  const hostEl = host;
  const triggerEl = trigger;
  const calendarEl = calendar;
  const hiddenEl = hidden;
  const currentMinIso = () => String(minDate || triggerEl.getAttribute("data-app-datepicker-min") || "");
  if (!calendarEl.id) calendarEl.id = `app-datepicker-calendar-${++datePickerSequence}`;
  triggerEl.setAttribute("aria-controls", calendarEl.id);
  CALENDARS.set(hostEl, { trigger: triggerEl, calendar: calendarEl, hidden: hiddenEl, labels });

  // Global surfaces use a body portal to escape scroll-container clipping.
  // Local forms can keep the calendar in their dialog's positioning context.
  if (portal) {
    calendarEl.classList.add("app-dropdown-menu-portal");
    if (calendarEl.parentElement !== hostEl.ownerDocument.body) {
      hostEl.ownerDocument.body.appendChild(calendarEl);
    }
  } else {
    calendarEl.classList.remove("app-dropdown-menu-portal");
  }

  let view = (() => {
    const parsed = parseIsoDate(hiddenEl.value);
    if (parsed) return parsed;
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
  })();

  const isOpen = () => !calendarEl.hidden;
  const selectedIso = () => hiddenEl.value;

  /** @param {Event} _event */
  function onScrollClose(_event) {
    if (isOpen()) close();
  }

  function positionCalendar() {
    if (!portal) return;
    const triggerRect = triggerEl.getBoundingClientRect();
    const doc = hostEl.ownerDocument;
    const win = doc.defaultView;
    const viewportHeight = win?.innerHeight || doc.documentElement.clientHeight;
    const viewportWidth = win?.innerWidth || doc.documentElement.clientWidth;
    calendarEl.classList.add("app-dropdown-menu-fixed");
    calendarEl.style.left = `${Math.max(8, Math.min(triggerRect.left, viewportWidth - 8))}px`;
    // The calendar matches the trigger field width, like the dropdown menus.
    calendarEl.style.width = `${Math.max(triggerRect.width, 240)}px`;
    const calendarHeight = calendarEl.offsetHeight;
    const below = triggerRect.bottom + 6;
    const above = triggerRect.top - calendarHeight - 6;
    let top;
    if (below + calendarHeight <= viewportHeight - 8) top = below;
    else if (above >= 8) top = above;
    else top = Math.max(8, viewportHeight - calendarHeight - 8);
    calendarEl.style.top = `${top}px`;
    if (win) win.addEventListener("scroll", onScrollClose, { once: true, passive: true });
  }

  function open() {
    if (triggerEl.disabled) return;
    const parsed = parseIsoDate(hiddenEl.value);
    if (parsed) view = parsed;
    // Read the min date fresh on every open so callers can tighten it
    // dynamically (e.g. maturity cannot precede the opening date).
    renderCalendar(hostEl, labels, view, selectedIso(), currentMinIso());
    calendarEl.hidden = false;
    triggerEl.setAttribute("aria-expanded", "true");
    positionCalendar();
    const selectedCell = /** @type {HTMLElement | null} */ (calendarEl.querySelector('[data-app-datepicker-day][aria-selected="true"]')
      || calendarEl.querySelector('[data-app-datepicker-day]:not(.is-outside):not([disabled])'));
    selectedCell?.focus({ preventScroll: true });
  }

  function close() {
    calendarEl.hidden = true;
    calendarEl.classList.remove("app-dropdown-menu-fixed");
    triggerEl.setAttribute("aria-expanded", "false");
  }

  /** @param {string} value */
  function select(value) {
    hiddenEl.value = value;
    syncDateLabel(hostEl, value);
    close();
    hostEl.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value } }));
    onChange?.(value);
    triggerEl.focus();
  }

  function onTriggerClick() {
    if (isOpen()) close();
    else open();
  }

  /** @param {MouseEvent} event */
  function onCalendarClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-app-datepicker-prev]")) {
      // Rendering the new month replaces the clicked button, so the event
      // would otherwise bubble to the document and read as an outside click.
      event.stopPropagation();
      view = shiftMonth(toIso(view), -1);
      renderCalendar(hostEl, labels, view, selectedIso(), currentMinIso());
      /** @type {HTMLElement | null} */ (calendarEl.querySelector("[data-app-datepicker-prev]"))?.focus();
      return;
    }
    if (target.closest("[data-app-datepicker-next]")) {
      event.stopPropagation();
      view = shiftMonth(toIso(view), 1);
      renderCalendar(hostEl, labels, view, selectedIso(), currentMinIso());
      /** @type {HTMLElement | null} */ (calendarEl.querySelector("[data-app-datepicker-next]"))?.focus();
      return;
    }
    const day = target.closest("[data-app-datepicker-day]");
    if (day instanceof HTMLButtonElement && day.getAttribute("data-app-datepicker-day")) {
      select(day.getAttribute("data-app-datepicker-day") || "");
    }
  }

  /** @param {KeyboardEvent} event */
  function onCalendarKeydown(event) {
    if (!isOpen()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerEl.focus();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerEl.focus();
      return;
    }
    /** @type {Record<string, number>} */
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const cells = /** @type {HTMLElement[]} */ ([...calendarEl.querySelectorAll("[data-app-datepicker-day]:not(.is-outside):not([disabled])")]);
    if (!cells.length) return;
    const index = cells.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    const next = index === -1 ? 0 : (index + moves[event.key] + cells.length) % cells.length;
    cells[next].focus();
  }

  /** @param {KeyboardEvent} event */
  function onTriggerKeydown(event) {
    if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
    if (isOpen()) return;
    event.preventDefault();
    event.stopPropagation();
    open();
  }

  /** @param {MouseEvent} event */
  function onOutsideClick(event) {
    if (!isOpen()) return;
    if (event.target instanceof Node && !hostEl.contains(event.target) && !calendarEl.contains(event.target)) close();
  }

  triggerEl.addEventListener("click", onTriggerClick);
  triggerEl.addEventListener("keydown", onTriggerKeydown);
  calendarEl.addEventListener("click", onCalendarClick);
  calendarEl.addEventListener("keydown", /** @type {EventListener} */ (onCalendarKeydown));
  /** @type {Document} */ (hostEl.ownerDocument).addEventListener("click", onOutsideClick);

  return function unbindAppDatePicker() {
    CALENDARS.delete(hostEl);
    triggerEl.removeEventListener("click", onTriggerClick);
    triggerEl.removeEventListener("keydown", onTriggerKeydown);
    calendarEl.removeEventListener("click", onCalendarClick);
    calendarEl.removeEventListener("keydown", /** @type {EventListener} */ (onCalendarKeydown));
    /** @type {Document} */ (hostEl.ownerDocument).removeEventListener("click", onOutsideClick);
    calendarEl.classList.remove("app-dropdown-menu-portal");
    if (calendarEl.parentElement !== hostEl) hostEl.appendChild(calendarEl);
  };
}
