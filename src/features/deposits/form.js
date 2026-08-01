import { depositTermMonths, depositTermOptions, normalizeDepositTermCode } from "./terms.js";
import { depositErrorMessage } from "../../js/deposit-errors.js";
import { bindVndInputFormatting, formatVndInputValue } from "../../js/vnd-input.js";
import { requestAppConfirmation } from "../../components/feedback/confirmation-dialog.js";
import { bindAppDropdown, renderAppDropdown } from "../../components/feedback/app-dropdown.js";
import { bindAppDatePicker, renderAppDatePicker, setAppDatePickerMinDate, setAppDatePickerValue } from "../../components/feedback/app-datepicker.js";

const copy = {
  vi: { add: "Thêm khoản tiền gửi", edit: "Sửa khoản tiền gửi", institution: "Ngân hàng", chooseBank: "-- Chọn ngân hàng --", term: "Kỳ hạn", principal: "Số tiền gửi (VND)", rate: "Lãi suất năm (%)", opened: "Ngày gửi", matures: "Ngày đáo hạn", datePlaceholder: "ngày/tháng/năm", expected: "Lợi nhuận dự kiến (không bắt buộc)", note: "Ghi chú", reminders: "Nhắc trước ngày đáo hạn", save: "Lưu khoản tiền gửi", cancel: "Hủy", saveError: "Không thể lưu. Bản nháp vẫn được giữ lại.", invalid: "Vui lòng kiểm tra dữ liệu đã nhập.", termBlank: "-- Chọn kỳ hạn --" },
  "zh-CN": { add: "新增存款", edit: "编辑存款", institution: "银行", chooseBank: "-- 请选择银行 --", term: "期限", principal: "存款金额（VND）", rate: "年利率（%）", opened: "存入日期", matures: "到期日期", datePlaceholder: "年/月/日", expected: "预计收益（可选）", note: "备注", reminders: "到期前提醒", save: "保存存款", cancel: "取消", saveError: "保存失败，草稿已保留。", invalid: "请检查输入内容。", termBlank: "-- 请选择期限 --" },
};

const settlementCopy = {
  vi: {
    redeem: "Tất toán tiền gửi", rollover: "Tái tục tiền gửi", settledOn: "Ngày tất toán",
    actualInterest: "Tiền lãi thực nhận (VND)", writeInterest: "Ghi tiền lãi thực nhận vào thu nhập",
    principalWarning: "Tiền gốc không bao giờ được ghi là thu nhập.", confirmInterest: "Chỉ ghi tiền lãi thực nhận vào thu nhập?",
    nextInstitution: "Ngân hàng mới", nextProduct: "Sản phẩm mới", nextPrincipal: "Tiền gốc kỳ mới (VND)",
    nextRate: "Lãi suất kỳ mới (%)", nextOpened: "Ngày bắt đầu kỳ mới", nextMatures: "Ngày đáo hạn kỳ mới",
    nextExpected: "Lợi nhuận dự kiến kỳ mới", saveRedeem: "Xác nhận tất toán", saveRollover: "Xác nhận tái tục",
    cancel: "Hủy", saveError: "Không thể hoàn tất. Dữ liệu đã nhập vẫn được giữ lại.",
  },
  "zh-CN": {
    redeem: "赎回存款", rollover: "续存", settledOn: "赎回日期", actualInterest: "实收利息（VND）",
    writeInterest: "将实收利息记入收入", principalWarning: "本金绝不会记作收入。", confirmInterest: "确认只将实收利息记入收入？",
    nextInstitution: "新银行", nextProduct: "新产品", nextPrincipal: "新一期本金（VND）", nextRate: "新一期年利率（%）",
    nextOpened: "新一期开立日期", nextMatures: "新一期到期日期", nextExpected: "新一期预计收益",
    saveRedeem: "确认赎回", saveRollover: "确认续存", cancel: "取消", saveError: "操作未完成，已保留当前输入。",
  },
};

const VIETNAM_BANKS = [
  "Vietcombank", "VietinBank", "BIDV", "Agribank",
  "Techcombank", "MB Bank", "ACB", "VPBank",
  "Sacombank", "HDBank", "MSB", "VIB",
  "SHB", "TPBank", "OCB", "LienVietPostBank",
  "SeABank", "Bac A Bank", "Nam A Bank", "PVcomBank",
];

/** @param {string | undefined} locale @returns {import("../../types/app-state").AppLocale} */
function normalizeLocale(locale) { return locale === "zh-CN" ? "zh-CN" : "vi"; }
/** @param {import("../../types/app-state").AppLocale} locale */
function words(locale) { return copy[locale] || copy.vi; }
/** @param {unknown} value */
function escapeHtml(value) {
  /** @type {Record<string, string>} */
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => entities[char] || char);
}

/** @param {{ inputId: string, optionsId: string, placeholder: string, value?: unknown }} options */
function renderBankPicker({ inputId, optionsId, placeholder, value = "" }) {
  const bankOptions = VIETNAM_BANKS.map(bank => `<button type="button" role="option" aria-selected="false" data-bank-option="${escapeHtml(bank)}">${escapeHtml(bank)}</button>`).join("");
  return `<div class="deposit-bank-picker"><div class="deposit-bank-control"><input id="${escapeHtml(inputId)}" name="institutionName" required maxlength="120" autocomplete="organization" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${escapeHtml(optionsId)}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}"><span class="deposit-bank-chevron" aria-hidden="true"><svg class="app-dropdown-chevron-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></span></div><div id="${escapeHtml(optionsId)}" class="deposit-bank-options" data-bank-picker-options role="listbox" hidden>${bankOptions}</div></div>`;
}
/** @overload @param {unknown} value @param {true} optional @returns {number | null} */
/** @overload @param {unknown} value @param {false} [optional] @returns {number} */
/** @param {unknown} value @param {boolean} [optional] @returns {number | null} */
function parseVnd(value, optional = false) {
  const normalized = String(value ?? "").trim().replace(/[,.\s]/g, "");
  if (optional && normalized === "") return null;
  if (!/^\d+$/.test(normalized)) throw new Error("VND amount must be an integer");
  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("VND amount is outside the safe range");
  return amount;
}
/** @param {unknown} value */
export function parseAnnualRateToPpm(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d{1,3}(?:\.\d{1,4})?$/.test(normalized)) throw new Error("Annual rate must have at most four decimals");
  const [whole, fraction = ""] = normalized.split(".");
  const ppm = Number(whole) * 10_000 + Number(fraction.padEnd(4, "0"));
  if (!Number.isSafeInteger(ppm) || ppm > 1_000_000) throw new Error("Annual rate must be between 0 and 100 percent");
  return ppm;
}
/**
 * @param {HTMLFormElement} form
 * @param {string} name
 * @returns {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null}
 */
function formControl(form, name) {
  const control = form.elements.namedItem(name);
  return control instanceof HTMLInputElement
    || control instanceof HTMLSelectElement
    || control instanceof HTMLTextAreaElement
    ? control
    : null;
}
/** @param {HTMLFormElement} form @param {string} name */
function formValue(form, name) { return formControl(form, name)?.value ?? ""; }
/** @param {string} value */
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
/** @param {string} dateStr @param {number} months */
export function addMonths(dateStr, months) {
  if (!validDate(dateStr)) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  return target.getUTCFullYear() + "-" + String(target.getUTCMonth() + 1).padStart(2, "0") + "-" + String(clampedDay).padStart(2, "0");
}

/** @param {string} dateStr @param {number} days */
export function addDays(dateStr, days) {
  if (!validDate(dateStr)) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.getUTCFullYear() + "-" + String(result.getUTCMonth() + 1).padStart(2, "0") + "-" + String(result.getUTCDate()).padStart(2, "0");
}
/**
 * @param {unknown} principalVnd
 * @param {unknown} annualRatePercent
 * @param {string} openedOn
 * @param {string} maturesOn
 */
function calculateExpectedInterest(principalVnd, annualRatePercent, openedOn, maturesOn) {
  const principal = Number(String(principalVnd ?? "").replace(/[,.\s]/g, ""));
  const rate = Number(String(annualRatePercent ?? "").replace(",", "."));
  if (!principal || !rate || !validDate(openedOn) || !validDate(maturesOn)) return null;
  if (principal <= 0 || rate <= 0) return null;
  const opened = new Date(openedOn); const matured = new Date(maturesOn);
  const days = Math.floor((matured.getTime() - opened.getTime()) / 86400000);
  if (days <= 0) return null;
  // interest = principal * rate% * days / 365 = principal * rate * days / 36500
  return Math.round(principal * rate * days / 36500);
}
/** @param {HTMLFormElement} form @returns {import("../../types/app-state").DepositInput} */
export function parseDepositForm(form) {
  const openedOn = formValue(form, "openedOn"); const maturesOn = formValue(form, "maturesOn");
  if (!validDate(openedOn) || !validDate(maturesOn) || maturesOn <= openedOn) throw new Error("maturity date must be later than opening date");
  const institutionName = formValue(form, "institutionName").trim(); const productName = formValue(form, "productName").trim();
  if (!institutionName || !productName || institutionName.length > 120 || productName.length > 120) throw new Error("Institution and product are required");
  const reminderDays = [30, 7, 1];
  return {
    id: /** @type {string} */ (form.dataset.depositId),
    institutionName, productName,
    principalVnd: parseVnd(formValue(form, "principalVnd")),
    annualRatePpm: parseAnnualRateToPpm(formValue(form, "annualRatePercent")),
    openedOn, maturesOn,
    expectedInterestVnd: parseVnd(formValue(form, "expectedInterestVnd"), true),
    actualInterestVnd: form.dataset.actualInterestVnd ? Number(form.dataset.actualInterestVnd) : null,
    reminderDays,
    remindersEnabled: (() => {
      const reminders = formControl(form, "remindersEnabled");
      return reminders instanceof HTMLInputElement && reminders.checked;
    })(),
    status: /** @type {import("../../infrastructure/firebase/deposit-repository").PersistedDepositStatus} */ (form.dataset.status || "ACTIVE"),
    redeemedOn: form.dataset.redeemedOn || null,
    rolledOverToDepositId: form.dataset.rolledOverToDepositId || null,
    note: formValue(form, "note").trim(),
  };
}

/** @param {import("../../types/app-state").DepositFormRenderOptions} options */
export function renderDepositForm({ locale = "vi", id, deposit = null }) {
  const labels = words(locale); const editing = Boolean(deposit);
  const rate = deposit ? String(deposit.annualRatePpm / 10_000) : "";
  const bankOptions = VIETNAM_BANKS.map(b => `<button type="button" role="option" aria-selected="false" data-bank-option="${escapeHtml(b)}">${escapeHtml(b)}</button>`).join("");
  const bankInputId = `deposit-bank-${escapeHtml(id)}`;
  const bankOptionsId = `deposit-bank-options-${escapeHtml(id)}`;
  const dateLang = normalizeLocale(locale) === "vi" ? "vi" : "zh-CN";
  const selectedTerm = normalizeDepositTermCode(deposit?.productName);
  const termOptions = [];
  if (deposit?.productName && !selectedTerm) termOptions.push({ value: deposit.productName, label: deposit.productName, selected: true });
  depositTermOptions(locale).forEach(term => { termOptions.push({ value: term.code, label: term.label, selected: selectedTerm === term.code }); });
  const termDropdown = renderAppDropdown({
    id: `deposit-term-${escapeHtml(id)}`,
    name: "productName",
    value: selectedTerm || (deposit?.productName && !selectedTerm ? deposit.productName : ""),
    placeholder: labels.termBlank,
    ariaLabel: labels.term,
    options: termOptions,
  });
  return `<div class="deposit-form-backdrop" data-deposit-form-backdrop><section class="deposit-form-sheet safe-area-bottom" role="dialog" aria-modal="true" aria-labelledby="deposit-form-title" tabindex="-1"><header><h3 id="deposit-form-title">${editing ? labels.edit : labels.add}</h3><button type="button" class="deposit-form-close" data-close-deposit-form aria-label="${labels.cancel}">×</button></header><form data-deposit-form data-deposit-id="${escapeHtml(id)}" data-version="${deposit?.version || 0}" data-status="${deposit?.status || "ACTIVE"}" data-actual-interest-vnd="${deposit?.actualInterestVnd ?? ""}" data-redeemed-on="${deposit?.redeemedOn ?? ""}" data-rolled-over-to-deposit-id="${deposit?.rolledOverToDepositId ?? ""}"><div class="deposit-form-grid"><div class="deposit-form-field"><label for="${bankInputId}">${labels.institution}</label><div class="deposit-bank-picker"><div class="deposit-bank-control"><input id="${bankInputId}" name="institutionName" required maxlength="120" autocomplete="organization" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${bankOptionsId}" placeholder="${escapeHtml(labels.chooseBank)}" value="${escapeHtml(deposit?.institutionName)}"><span class="deposit-bank-chevron" aria-hidden="true"><svg class="app-dropdown-chevron-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></span></div><div id="${bankOptionsId}" class="deposit-bank-options" data-bank-picker-options role="listbox" hidden>${bankOptions}</div></div></div><label>${labels.term}${termDropdown}</label><label>${labels.principal}<input name="principalVnd" required inputmode="numeric" pattern="[0-9,. ]+" value="${escapeHtml(formatVndInputValue(deposit?.principalVnd))}"></label><label>${labels.rate}<input name="annualRatePercent" required inputmode="decimal" value="${escapeHtml(rate)}"></label><label>${labels.opened}${renderAppDatePicker({ name: "openedOn", value: deposit?.openedOn, placeholder: labels.datePlaceholder, locale: normalizeLocale(locale) })}</label><label>${labels.matures}${renderAppDatePicker({ name: "maturesOn", value: deposit?.maturesOn, placeholder: labels.datePlaceholder, locale: normalizeLocale(locale) })}</label><label>${labels.expected}<input name="expectedInterestVnd" readonly class="deposit-calc-input" value=""></label><label class="deposit-reminder-toggle"><input name="remindersEnabled" type="checkbox"${deposit?.remindersEnabled === false ? "" : " checked"}><span>${labels.reminders} · D-30 / D-7 / D-1 / D0</span></label><label class="deposit-note-field">${labels.note}<textarea name="note" maxlength="1000">${escapeHtml(deposit?.note)}</textarea></label></div><p class="deposit-form-error" data-form-error role="alert"></p><div class="deposit-form-actions"><button type="button" class="btn-secondary" data-close-deposit-form>${labels.cancel}</button><button type="submit" class="btn-primary">${labels.save}</button></div></form></section></div>`;
}

/** @param {HTMLElement} root @param {import("../../types/app-state").DepositFormBindings} [bindings] */
export function bindDepositForm(root, { onSubmit, onClose, locale = "vi" } = {}) {
  const form = /** @type {HTMLFormElement | null} */ (root.querySelector("[data-deposit-form]")); if (!form) return;
  /** @type {NodeListOf<HTMLElement>} */
  const closeButtons = root.querySelectorAll("[data-close-deposit-form]");
  closeButtons.forEach(button => button.addEventListener("click", () => onClose?.()));
  root.querySelector("[data-deposit-form-backdrop]")?.addEventListener("click", event => { if (event.target === event.currentTarget) onClose?.(); });
  bindDialogKeyboard(root, onClose);

  const labels = words(locale);
  const productSelect = formControl(form, "productName");
  const openedInput = formControl(form, "openedOn");
  const maturesInput = formControl(form, "maturesOn");
  /** @type {Map<string, HTMLElement>} */
  const dateHosts = new Map();
  form.querySelectorAll("[data-app-datepicker]").forEach(dateHost => {
    const dateName = dateHost.querySelector("[data-app-datepicker-hidden]")?.getAttribute("name") || "";
    if (dateName) dateHosts.set(dateName, /** @type {HTMLElement} */ (dateHost));
  });
  const openedHost = dateHosts.get("openedOn") || null;
  const maturesHost = dateHosts.get("maturesOn") || null;

  /** 到期日期不能早于存入日期：动态收紧到期日历的最小日期，并修正已选早日期。 */
  function enforceMaturityOrder() {
    const opened = openedInput?.value || "";
    const matures = maturesInput?.value || "";
    const minimumMaturity = opened ? addDays(opened, 1) : "";
    if (maturesHost) setAppDatePickerMinDate(maturesHost, minimumMaturity);
    if (minimumMaturity && matures && matures < minimumMaturity && maturesHost) {
      setAppDatePickerValue(maturesHost, minimumMaturity);
    }
  }

  form.querySelectorAll("[data-app-datepicker]").forEach(dateHost => {
    const dateName = dateHost.querySelector("[data-app-datepicker-hidden]")?.getAttribute("name") || "";
    bindAppDatePicker(dateHost, {
      locale: normalizeLocale(locale),
      onChange: dateName === "maturesOn"
        // 手动选到期日不重算期限，但不得早于存入日。
        ? () => { enforceMaturityOrder(); recalcExpected(); }
        : () => { enforceMaturityOrder(); onFieldChange(); },
    });
  });
  enforceMaturityOrder();

  const principalInput = formControl(form, "principalVnd");
  const rateInput = formControl(form, "annualRatePercent");
  const expectedInput = formControl(form, "expectedInterestVnd");

  function recalcMaturity() {
    const termValue = productSelect?.value;
    const opened = openedInput?.value;
    if (termValue && opened) {
      const months = depositTermMonths(termValue);
      if (months !== null) {
        const maturity = addMonths(opened, months);
        if (maturesInput) maturesInput.value = maturity;
        // 同步日期选择器的显示标签（此前只更新 hidden input，界面不刷新）。
        if (maturesHost) setAppDatePickerValue(maturesHost, maturity);
      }
    }
  }

  function recalcExpected() {
    if (!expectedInput) return;
    const interest = calculateExpectedInterest(
      principalInput?.value, rateInput?.value,
      openedInput?.value || "", maturesInput?.value || "",
    );
    expectedInput.value = interest !== null ? Number(interest).toLocaleString("en-US") : "";
  }

  function onFieldChange() {
    recalcMaturity();
    recalcExpected();
  }

  const termHost = form.querySelector("[data-app-dropdown]");
  if (termHost) bindAppDropdown(termHost, { onChange: onFieldChange });
  productSelect?.addEventListener("change", onFieldChange);
  if (principalInput instanceof HTMLInputElement) bindVndInputFormatting(principalInput, recalcExpected);
  rateInput?.addEventListener("input", recalcExpected);

  // Initial calculation for edit mode
  setTimeout(recalcExpected, 50);

  form.addEventListener("submit", async event => {
    event.preventDefault(); const errorNode = form.querySelector("[data-form-error]"); const submit = /** @type {HTMLButtonElement | null} */ (form.querySelector("button[type=submit]"));
    if (!submit) return;
    if (errorNode) errorNode.textContent = ""; submit.disabled = true;
    try { await onSubmit?.(parseDepositForm(form), { expectedVersion: Number(form.dataset.version || 0) }); }
    catch (error) {
      const loc = normalizeLocale(locale || (document.documentElement.lang === "zh-Hans" ? "zh-CN" : "vi"));
      if (errorNode) errorNode.textContent = depositErrorMessage(error, loc, "form");
    }
    finally { submit.disabled = false; }
  });
  const bankInput = /** @type {HTMLInputElement | null} */ (formControl(form, "institutionName"));
  const bankOptions = /** @type {HTMLElement | null} */ (form.querySelector("[data-bank-picker-options]"));
  /** @param {boolean} open */
  const setBankPickerOpen = (open) => {
    if (!bankInput || !bankOptions) return;
    bankOptions.hidden = !open;
    bankInput.setAttribute("aria-expanded", String(open));
    if (open) {
      const current = bankInput.value.trim();
      bankOptions.querySelectorAll("[data-bank-option]").forEach(option => {
        option.setAttribute("aria-selected", String(option.getAttribute("data-bank-option") === current));
      });
    }
  };
  // 点击银行输入框在打开/收起之间切换；手动输入时收起（仍可输入自定义银行名）。
  bankInput?.addEventListener("click", () => setBankPickerOpen(Boolean(bankOptions?.hidden)));
  bankOptions?.addEventListener("click", event => {
    const option = event.target instanceof Element ? event.target.closest("[data-bank-option]") : null;
    if (!option || !bankInput) return;
    bankInput.value = option.getAttribute("data-bank-option") || "";
    bankInput.dispatchEvent(new Event("input", { bubbles: true }));
    setBankPickerOpen(false);
    bankInput.focus();
  });
  bankInput?.addEventListener("input", () => setBankPickerOpen(false));
  /** @param {KeyboardEvent} event */
  function onBankInputKeydown(event) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setBankPickerOpen(true);
    const list = /** @type {HTMLElement[]} */ (bankOptions ? [...bankOptions.querySelectorAll("[data-bank-option]")] : []);
    if (list.length) list[event.key === "ArrowUp" ? list.length - 1 : 0].focus();
  }
  /** @param {KeyboardEvent} event */
  function onBankOptionsKeydown(event) {
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); setBankPickerOpen(false); bankInput?.focus(); return; }
    if (event.key === "Tab") { setBankPickerOpen(false); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const list = /** @type {HTMLElement[]} */ (bankOptions ? [...bankOptions.querySelectorAll("[data-bank-option]")] : []);
    if (!list.length) return;
    const index = list.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    let next = 0;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = list.length - 1;
    else if (event.key === "ArrowDown") next = index === -1 ? 0 : (index + 1) % list.length;
    else next = index === -1 ? list.length - 1 : (index - 1 + list.length) % list.length;
    list[next].focus();
  }
  bankInput?.addEventListener("keydown", onBankInputKeydown);
  bankOptions?.addEventListener("keydown", onBankOptionsKeydown);
  root.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest(".deposit-bank-picker")) setBankPickerOpen(false);
  });
  /** @param {KeyboardEvent} event */
  function onRootBankEscape(event) {
    if (event.key === "Escape" && bankOptions && !bankOptions.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setBankPickerOpen(false);
      bankInput?.focus();
    }
  }
  root.addEventListener("keydown", onRootBankEscape, true);
  const dialog = /** @type {HTMLElement | null} */ (root.querySelector(".deposit-form-sheet"));
  if (dialog) {
    try { dialog.focus({ preventScroll: true }); }
    catch { dialog.focus(); }
  }
}

/** @param {HTMLElement} root @param {(() => void) | undefined} onClose */
function bindDialogKeyboard(root, onClose) {
  root.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); onClose?.(); return; }
    if (event.key !== "Tab") return;
    /** @type {HTMLElement[]} */
    const focusable = [.../** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll("button, input, select, textarea, [tabindex]:not([tabindex='-1'])"))]
      .filter(element => !("disabled" in element) || !element.disabled)
      .filter(element => element.getAttribute("aria-hidden") !== "true");
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

/** @param {HTMLElement} root */
function bindSettlementBankPicker(root) {
  const form = /** @type {HTMLFormElement | null} */ (root.querySelector("form"));
  const bankInput = /** @type {HTMLInputElement | null} */ (form ? formControl(form, "institutionName") : null);
  const bankOptions = /** @type {HTMLElement | null} */ (form?.querySelector("[data-bank-picker-options]"));
  if (!bankInput || !bankOptions) return;
  /** @param {boolean} open */
  const setBankPickerOpen = (open) => {
    bankOptions.hidden = !open;
    bankInput.setAttribute("aria-expanded", String(open));
    if (open) {
      const current = bankInput.value.trim();
      bankOptions.querySelectorAll("[data-bank-option]").forEach(option => {
        option.setAttribute("aria-selected", String(option.getAttribute("data-bank-option") === current));
      });
    }
  };
  bankInput.addEventListener("click", () => setBankPickerOpen(Boolean(bankOptions.hidden)));
  bankOptions.addEventListener("click", event => {
    const option = event.target instanceof Element ? event.target.closest("[data-bank-option]") : null;
    if (!option) return;
    bankInput.value = option.getAttribute("data-bank-option") || "";
    bankInput.dispatchEvent(new Event("input", { bubbles: true }));
    setBankPickerOpen(false);
    bankInput.focus();
  });
  bankInput.addEventListener("input", () => setBankPickerOpen(false));
  bankInput.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setBankPickerOpen(true);
    const list = /** @type {HTMLElement[]} */ ([...bankOptions.querySelectorAll("[data-bank-option]")]);
    list[event.key === "ArrowUp" ? list.length - 1 : 0]?.focus();
  });
  bankOptions.addEventListener("keydown", /** @param {KeyboardEvent} event */ event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); setBankPickerOpen(false); bankInput.focus(); return; }
    if (event.key === "Tab") { setBankPickerOpen(false); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const list = /** @type {HTMLElement[]} */ ([...bankOptions.querySelectorAll("[data-bank-option]")]);
    if (!list.length) return;
    const index = list.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    const next = event.key === "Home" ? 0 : event.key === "End" ? list.length - 1 : event.key === "ArrowDown" ? (index + 1 + list.length) % list.length : (index - 1 + list.length) % list.length;
    list[next].focus();
  });
  root.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest(".deposit-bank-picker")) setBankPickerOpen(false);
  });
  root.addEventListener("keydown", /** @param {KeyboardEvent} event */ event => {
    if (event.key === "Escape" && !bankOptions.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setBankPickerOpen(false);
      bankInput.focus();
    }
  }, true);
}

/** @param {import("../../types/app-state").DepositSettlementRenderOptions} options */
export function renderDepositSettlementForm({ locale = "vi", deposit, mode = "redeem", today }) {
  const labels = settlementCopy[locale] || settlementCopy.vi;
  const rollover = mode === "rollover";
  const datePlaceholder = words(locale).datePlaceholder;
  const nextMaturityMin = addDays(today, 1);
  const settlementBankInputId = `settlement-bank-${escapeHtml(deposit.id)}`;
  const settlementBankOptionsId = `settlement-bank-options-${escapeHtml(deposit.id)}`;
  const selectedTerm = normalizeDepositTermCode(deposit.productName);
  const productValue = selectedTerm || deposit.productName || "";
  const productOptions = [];
  if (deposit.productName && !selectedTerm) productOptions.push({ value: deposit.productName, label: deposit.productName, selected: true });
  depositTermOptions(locale).forEach(term => productOptions.push({ value: term.code, label: term.label, selected: selectedTerm === term.code }));
  const productDropdown = renderAppDropdown({
    id: `settlement-product-${escapeHtml(deposit.id)}`,
    name: "productName",
    value: productValue,
    placeholder: labels.nextProduct,
    ariaLabel: labels.nextProduct,
    options: productOptions,
  });
  const nextFields = rollover ? `<label>${labels.nextInstitution}${renderBankPicker({ inputId: settlementBankInputId, optionsId: settlementBankOptionsId, placeholder: labels.nextInstitution, value: deposit.institutionName })}</label><label>${labels.nextProduct}${productDropdown}</label><label>${labels.nextPrincipal}<input name="principalVnd" data-vnd-input required inputmode="numeric" value="${escapeHtml(formatVndInputValue(deposit.principalVnd))}"></label><label>${labels.nextRate}<input name="annualRatePercent" required inputmode="decimal"></label><label>${labels.nextOpened}${renderAppDatePicker({ name: "openedOn", value: today, placeholder: datePlaceholder, locale: normalizeLocale(locale) })}</label><label>${labels.nextMatures}${renderAppDatePicker({ name: "maturesOn", value: "", placeholder: datePlaceholder, locale: normalizeLocale(locale), minDate: nextMaturityMin })}</label><label>${labels.nextExpected}<input name="expectedInterestVnd" inputmode="numeric"></label>` : `<label>${labels.settledOn}${renderAppDatePicker({ name: "settledOn", value: today, placeholder: datePlaceholder, locale: normalizeLocale(locale), minDate: deposit.maturesOn })}</label>`;
  return `<div class="deposit-form-backdrop" data-deposit-form-backdrop><section class="deposit-form-sheet safe-area-bottom" role="dialog" aria-modal="true" aria-labelledby="deposit-settlement-title"><header><h3 id="deposit-settlement-title">${rollover ? labels.rollover : labels.redeem}</h3><button type="button" class="deposit-form-close" data-close-deposit-form aria-label="${labels.cancel}">×</button></header><form data-deposit-settlement-form data-mode="${mode}" data-deposit-id="${escapeHtml(deposit.id)}"><div class="deposit-form-grid">${nextFields}<label>${labels.actualInterest}<input name="actualInterestVnd" data-vnd-input inputmode="numeric"></label><label class="deposit-reminder-toggle"><input name="writeInterestToLedger" type="checkbox"><span>${labels.writeInterest}</span></label><p class="deposit-principal-warning" role="note">${labels.principalWarning}</p></div><p class="deposit-form-error" data-form-error role="alert"></p><div class="deposit-form-actions"><button type="button" class="btn-secondary" data-close-deposit-form>${labels.cancel}</button><button type="submit" class="btn-primary">${rollover ? labels.saveRollover : labels.saveRedeem}</button></div></form></section></div>`;
}

/** @param {HTMLFormElement} form @returns {import("../../types/app-state").DepositSettlementInput} */
export function parseDepositSettlementForm(form) {
  const actualInterestVnd = parseVnd(formValue(form, "actualInterestVnd"), true);
  const writeInterestControl = formControl(form, "writeInterestToLedger");
  const writeInterestToLedger = Boolean(writeInterestControl instanceof HTMLInputElement && writeInterestControl.checked);
  if (writeInterestToLedger && (!actualInterestVnd || actualInterestVnd <= 0)) throw new Error("Confirmed interest requires a positive actual amount");
  if (form.dataset.mode === "redeem") {
    const settledOn = formValue(form, "settledOn");
    if (!validDate(settledOn)) throw new Error("Settlement date is invalid");
    return { mode: "redeem", settledOn, actualInterestVnd, writeInterestToLedger };
  }
  const openedOn = formValue(form, "openedOn"); const maturesOn = formValue(form, "maturesOn");
  if (!validDate(openedOn) || !validDate(maturesOn) || maturesOn <= openedOn) throw new Error("Rollover dates are invalid");
  const institutionName = formValue(form, "institutionName").trim(); const productName = formValue(form, "productName").trim();
  if (!institutionName || !productName || institutionName.length > 120 || productName.length > 120) throw new Error("Rollover institution and product are required");
  return { mode: "rollover", actualInterestVnd, writeInterestToLedger, rollover: {
    institutionName, productName, principalVnd: parseVnd(formValue(form, "principalVnd")),
    annualRatePpm: parseAnnualRateToPpm(formValue(form, "annualRatePercent")), openedOn, maturesOn,
    expectedInterestVnd: parseVnd(formValue(form, "expectedInterestVnd"), true), actualInterestVnd: null,
    reminderDays: [30, 7, 1], remindersEnabled: true, status: "ACTIVE", redeemedOn: null,
    rolledOverToDepositId: null, note: "",
  } };
}

/** @param {HTMLElement} root @param {import("../../types/app-state").DepositSettlementBindings} [bindings] */
export function bindDepositSettlementForm(root, { locale = "vi", onSubmit, onClose, confirm = message => requestAppConfirmation({ message, destructive: true }) } = {}) {
  const form = /** @type {HTMLFormElement | null} */ (root.querySelector("[data-deposit-settlement-form]")); if (!form) return;
  /** @type {NodeListOf<HTMLElement>} */
  const closeButtons = root.querySelectorAll("[data-close-deposit-form]");
  closeButtons.forEach(button => button.addEventListener("click", () => onClose?.()));
  root.querySelector("[data-deposit-form-backdrop]")?.addEventListener("click", event => { if (event.target === event.currentTarget) onClose?.(); });
  bindDialogKeyboard(root, onClose);
  const openedInput = formControl(form, "openedOn");
  const maturesInput = formControl(form, "maturesOn");
  const openedHost = form.querySelector('[data-app-datepicker-hidden][name="openedOn"]')?.closest("[data-app-datepicker]");
  const maturesHost = form.querySelector('[data-app-datepicker-hidden][name="maturesOn"]')?.closest("[data-app-datepicker]");
  const enforceRolloverMaturity = () => {
    const opened = openedInput?.value || "";
    const minimumMaturity = opened ? addDays(opened, 1) : "";
    if (maturesHost) setAppDatePickerMinDate(maturesHost, minimumMaturity);
    if (minimumMaturity && maturesInput?.value && maturesInput.value < minimumMaturity && maturesHost) {
      setAppDatePickerValue(maturesHost, minimumMaturity);
    }
  };
  form.querySelectorAll("[data-app-datepicker]").forEach(dateHost => {
    const dateName = dateHost.querySelector("[data-app-datepicker-hidden]")?.getAttribute("name") || "";
    bindAppDatePicker(dateHost, {
      locale: normalizeLocale(locale),
      onChange: dateName === "openedOn" || dateName === "maturesOn" ? enforceRolloverMaturity : undefined,
    });
  });
  if (openedHost || maturesHost) enforceRolloverMaturity();
  const productHost = form.querySelector("[data-app-dropdown]");
  if (productHost) bindAppDropdown(productHost);
  form.querySelectorAll("[data-vnd-input]").forEach(input => {
    if (input instanceof HTMLInputElement) bindVndInputFormatting(input);
  });
  bindSettlementBankPicker(root);
  form.addEventListener("submit", async event => {
    event.preventDefault(); const errorNode = form.querySelector("[data-form-error]"); const submit = /** @type {HTMLButtonElement | null} */ (form.querySelector("button[type=submit]"));
    if (!submit) return;
    if (errorNode) errorNode.textContent = ""; submit.disabled = true;
    try {
      const parsed = parseDepositSettlementForm(form);
      if (parsed.writeInterestToLedger && confirm && !(await confirm((settlementCopy[locale] || settlementCopy.vi).confirmInterest))) return;
      await onSubmit?.(parsed);
    } catch (_) { if (errorNode) errorNode.textContent = (settlementCopy[locale] || settlementCopy.vi).saveError; }
    finally { submit.disabled = false; }
  });
  form.querySelector("input")?.focus();
}
