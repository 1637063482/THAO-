import { depositTermMonths, depositTermOptions, normalizeDepositTermCode } from "./terms.js";
import { depositErrorMessage } from "../../js/deposit-errors.js";
import { bindVndInputFormatting, formatVndInputValue } from "../../js/vnd-input.js";
import { showConfirmAlert } from "../../js/app-alert.js";

const copy = {
  vi: { add: "Thêm khoản tiền gửi", edit: "Sửa khoản tiền gửi", institution: "Ngân hàng", chooseBank: "Chọn ngân hàng", term: "Kỳ hạn", principal: "Số tiền gửi (VND)", rate: "Lãi suất năm (%)", opened: "Ngày gửi", matures: "Ngày đáo hạn", datePlaceholder: "ngày/tháng/năm", expected: "Lợi nhuận dự kiến (không bắt buộc)", note: "Ghi chú", reminders: "Nhắc trước ngày đáo hạn", save: "Lưu khoản tiền gửi", cancel: "Hủy", saveError: "Không thể lưu. Bản nháp vẫn được giữ lại.", invalid: "Vui lòng kiểm tra dữ liệu đã nhập.", termBlank: "-- Chọn kỳ hạn --" },
  "zh-CN": { add: "新增存款", edit: "编辑存款", institution: "银行", chooseBank: "选择银行", term: "期限", principal: "存款金额（VND）", rate: "年利率（%）", opened: "存入日期", matures: "到期日期", datePlaceholder: "年/月/日", expected: "预计收益（可选）", note: "备注", reminders: "到期前提醒", save: "保存存款", cancel: "取消", saveError: "保存失败，草稿已保留。", invalid: "请检查输入内容。", termBlank: "-- 请选择期限 --" },
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
function addMonths(dateStr, months) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + months, day));
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
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
  const bankOptions = VIETNAM_BANKS.map(b => `<button type="button" role="option" data-bank-option="${escapeHtml(b)}">${escapeHtml(b)}</button>`).join("");
  const bankInputId = `deposit-bank-${escapeHtml(id)}`;
  const bankOptionsId = `deposit-bank-options-${escapeHtml(id)}`;
  const dateLang = normalizeLocale(locale) === "vi" ? "vi" : "zh-CN";
  const selectedTerm = normalizeDepositTermCode(deposit?.productName);
  const customProduct = deposit?.productName && !selectedTerm
    ? `<option value="${escapeHtml(deposit.productName)}" selected>${escapeHtml(deposit.productName)}</option>`
    : "";
  const productOptions = `<option value="">${escapeHtml(labels.termBlank)}</option>` +
    customProduct +
    depositTermOptions(locale).map(term => {
      const selected = selectedTerm === term.code ? " selected" : "";
      return `<option value="${term.code}"${selected}>${escapeHtml(term.label)}</option>`;
    }).join("");
  return `<div class="deposit-form-backdrop" data-deposit-form-backdrop><section class="deposit-form-sheet safe-area-bottom" role="dialog" aria-modal="true" aria-labelledby="deposit-form-title" tabindex="-1"><header><h3 id="deposit-form-title">${editing ? labels.edit : labels.add}</h3><button type="button" class="deposit-form-close" data-close-deposit-form aria-label="${labels.cancel}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg></button></header><form data-deposit-form data-deposit-id="${escapeHtml(id)}" data-version="${deposit?.version || 0}" data-status="${deposit?.status || "ACTIVE"}" data-actual-interest-vnd="${deposit?.actualInterestVnd ?? ""}" data-redeemed-on="${deposit?.redeemedOn ?? ""}" data-rolled-over-to-deposit-id="${deposit?.rolledOverToDepositId ?? ""}"><div class="deposit-form-grid"><div class="deposit-form-field"><label for="${bankInputId}">${labels.institution}</label><div class="deposit-bank-picker"><div class="deposit-bank-control"><input id="${bankInputId}" name="institutionName" required maxlength="120" autocomplete="organization" value="${escapeHtml(deposit?.institutionName)}"><button type="button" class="deposit-bank-toggle" data-bank-picker-toggle aria-label="${labels.chooseBank}" aria-expanded="false" aria-controls="${bankOptionsId}">⌄</button></div><div id="${bankOptionsId}" class="deposit-bank-options" data-bank-picker-options role="listbox" hidden>${bankOptions}</div></div></div><label>${labels.term}<select name="productName" required>${productOptions}</select></label><label>${labels.principal}<input name="principalVnd" required inputmode="numeric" pattern="[0-9,. ]+" value="${escapeHtml(formatVndInputValue(deposit?.principalVnd))}"></label><label>${labels.rate}<input name="annualRatePercent" required inputmode="decimal" value="${escapeHtml(rate)}"></label><label>${labels.opened}<span class="deposit-date-control"><input name="openedOn" required type="date" lang="${dateLang}" value="${escapeHtml(deposit?.openedOn)}"><span class="deposit-date-placeholder" aria-hidden="true">${labels.datePlaceholder}</span></span></label><label>${labels.matures}<span class="deposit-date-control"><input name="maturesOn" required type="date" lang="${dateLang}" value="${escapeHtml(deposit?.maturesOn)}"><span class="deposit-date-placeholder" aria-hidden="true">${labels.datePlaceholder}</span></span></label><label>${labels.expected}<input name="expectedInterestVnd" readonly class="deposit-calc-input" value=""></label><label class="deposit-reminder-toggle"><span class="app-switch"><input name="remindersEnabled" type="checkbox"${deposit?.remindersEnabled === false ? "" : " checked"}><span class="app-switch-track"><span class="app-switch-thumb"></span></span></span><span>${labels.reminders} · D-30 / D-7 / D-1 / D0</span></label><label class="deposit-note-field">${labels.note}<textarea name="note" maxlength="1000">${escapeHtml(deposit?.note)}</textarea></label></div><p class="deposit-form-error" data-form-error role="alert"></p><div class="deposit-form-actions"><button type="button" class="btn-secondary" data-close-deposit-form>${labels.cancel}</button><button type="submit" class="btn-primary">${labels.save}</button></div></form></section></div>`;
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

  productSelect?.addEventListener("change", onFieldChange);
  openedInput?.addEventListener("change", onFieldChange);
  if (principalInput instanceof HTMLInputElement) bindVndInputFormatting(principalInput, recalcExpected);
  rateInput?.addEventListener("input", recalcExpected);
  maturesInput?.addEventListener("change", recalcExpected);

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
  const bankInput = formControl(form, "institutionName");
  const bankToggle = /** @type {HTMLButtonElement | null} */ (form.querySelector("[data-bank-picker-toggle]"));
  const bankOptions = /** @type {HTMLElement | null} */ (form.querySelector("[data-bank-picker-options]"));
  /** @param {boolean} open */
  const setBankPickerOpen = (open) => {
    if (!bankToggle || !bankOptions) return;
    bankOptions.hidden = !open;
    bankToggle.setAttribute("aria-expanded", String(open));
  };
  bankToggle?.addEventListener("click", () => setBankPickerOpen(Boolean(bankOptions?.hidden)));
  bankOptions?.addEventListener("click", event => {
    const option = event.target instanceof Element ? event.target.closest("[data-bank-option]") : null;
    if (!option || !bankInput) return;
    bankInput.value = option.getAttribute("data-bank-option") || "";
    bankInput.dispatchEvent(new Event("input", { bubbles: true }));
    setBankPickerOpen(false);
    bankInput.focus();
  });
  bankInput?.addEventListener("input", () => setBankPickerOpen(false));
  root.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest(".deposit-bank-picker")) setBankPickerOpen(false);
  });
  root.addEventListener("keydown", event => {
    if (event.key === "Escape" && bankOptions && !bankOptions.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setBankPickerOpen(false);
      bankToggle?.focus();
    }
  }, true);
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

/** @param {import("../../types/app-state").DepositSettlementRenderOptions} options */
export function renderDepositSettlementForm({ locale = "vi", deposit, mode = "redeem", today }) {
  const labels = settlementCopy[locale] || settlementCopy.vi;
  const rollover = mode === "rollover";
  const nextFields = rollover ? `<label>${labels.nextInstitution}<input name="institutionName" required maxlength="120" value="${escapeHtml(deposit.institutionName)}"></label><label>${labels.nextProduct}<input name="productName" required maxlength="120" value="${escapeHtml(deposit.productName)}"></label><label>${labels.nextPrincipal}<input name="principalVnd" required inputmode="numeric" value="${escapeHtml(deposit.principalVnd)}"></label><label>${labels.nextRate}<input name="annualRatePercent" required inputmode="decimal"></label><label>${labels.nextOpened}<input name="openedOn" required type="date" value="${escapeHtml(today)}"></label><label>${labels.nextMatures}<input name="maturesOn" required type="date"></label><label>${labels.nextExpected}<input name="expectedInterestVnd" inputmode="numeric"></label>` : `<label>${labels.settledOn}<input name="settledOn" required type="date" value="${escapeHtml(today)}" min="${escapeHtml(deposit.maturesOn)}"></label>`;
  return `<div class="deposit-form-backdrop" data-deposit-form-backdrop><section class="deposit-form-sheet safe-area-bottom" role="dialog" aria-modal="true" aria-labelledby="deposit-settlement-title"><header><h3 id="deposit-settlement-title">${rollover ? labels.rollover : labels.redeem}</h3><button type="button" class="deposit-form-close" data-close-deposit-form aria-label="${labels.cancel}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg></button></header><form data-deposit-settlement-form data-mode="${mode}" data-deposit-id="${escapeHtml(deposit.id)}"><div class="deposit-form-grid">${nextFields}<label>${labels.actualInterest}<input name="actualInterestVnd" inputmode="numeric"></label><label class="deposit-reminder-toggle"><span class="app-switch"><input name="writeInterestToLedger" type="checkbox"><span class="app-switch-track"><span class="app-switch-thumb"></span></span></span><span>${labels.writeInterest}</span></label><p class="deposit-principal-warning" role="note">${labels.principalWarning}</p></div><p class="deposit-form-error" data-form-error role="alert"></p><div class="deposit-form-actions"><button type="button" class="btn-secondary" data-close-deposit-form>${labels.cancel}</button><button type="submit" class="btn-primary">${rollover ? labels.saveRollover : labels.saveRedeem}</button></div></form></section></div>`;
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
export function bindDepositSettlementForm(root, { locale = "vi", onSubmit, onClose, confirm } = {}) {
  const form = /** @type {HTMLFormElement | null} */ (root.querySelector("[data-deposit-settlement-form]")); if (!form) return;
  const settlementLabels = settlementCopy[locale] || settlementCopy.vi;
  /** @param {string} message */
  const ask = (message) => (confirm
    ? Promise.resolve(Boolean(confirm(message)))
    : showConfirmAlert({
        message,
        confirmLabel: form.dataset.mode === "rollover" ? settlementLabels.saveRollover : settlementLabels.saveRedeem,
        cancelLabel: settlementLabels.cancel,
        tone: "destructive",
      }));
  /** @type {NodeListOf<HTMLElement>} */
  const closeButtons = root.querySelectorAll("[data-close-deposit-form]");
  closeButtons.forEach(button => button.addEventListener("click", () => onClose?.()));
  root.querySelector("[data-deposit-form-backdrop]")?.addEventListener("click", event => { if (event.target === event.currentTarget) onClose?.(); });
  bindDialogKeyboard(root, onClose);
  form.addEventListener("submit", async event => {
    event.preventDefault(); const errorNode = form.querySelector("[data-form-error]"); const submit = /** @type {HTMLButtonElement | null} */ (form.querySelector("button[type=submit]"));
    if (!submit) return;
    if (errorNode) errorNode.textContent = ""; submit.disabled = true;
    try {
      const parsed = parseDepositSettlementForm(form);
      if (parsed.writeInterestToLedger && !(await ask(settlementLabels.confirmInterest))) return;
      await onSubmit?.(parsed);
    } catch (_) { if (errorNode) errorNode.textContent = settlementLabels.saveError; }
    finally { submit.disabled = false; }
  });
  form.querySelector("input")?.focus();
}
