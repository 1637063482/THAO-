const copy = {
  vi: { add: "Thêm khoản tiền gửi", edit: "Sửa khoản tiền gửi", institution: "Ngân hàng", product: "Sản phẩm", term: "Kỳ hạn", principal: "Số tiền gửi (VND)", rate: "Lãi suất năm (%)", opened: "Ngày gửi", matures: "Ngày đáo hạn", expected: "Lợi nhuận dự kiến (không bắt buộc)", note: "Ghi chú", reminders: "Nhắc trước ngày đáo hạn", save: "Lưu khoản tiền gửi", cancel: "Hủy", saveError: "Không thể lưu. Bản nháp vẫn được giữ lại.", invalid: "Vui lòng kiểm tra dữ liệu đã nhập.", termBlank: "-- Chọn kỳ hạn --", term3M: "3 tháng", term6M: "6 tháng", term1Y: "1 năm", term2Y: "2 năm", term3Y: "3 năm", term5Y: "5 năm", productAuto: "Tiền gửi {term}" },
  "zh-CN": { add: "新增存款", edit: "编辑存款", institution: "银行", product: "产品", term: "期限", principal: "存款金额（VND）", rate: "年利率（%）", opened: "存入日期", matures: "到期日期", expected: "预计收益（可选）", note: "备注", reminders: "到期前提醒", save: "保存存款", cancel: "取消", saveError: "保存失败，草稿已保留。", invalid: "请检查输入内容。", termBlank: "-- 请选择期限 --", term3M: "3个月", term6M: "6个月", term1Y: "1年", term2Y: "2年", term3Y: "3年", term5Y: "5年", productAuto: "{term}定期" },
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

const TERM_OPTIONS = [
  { value: "3M", months: 3 },
  { value: "6M", months: 6 },
  { value: "1Y", months: 12 },
  { value: "2Y", months: 24 },
  { value: "3Y", months: 36 },
  { value: "5Y", months: 60 },
];

const TERM_LABEL_KEYS = {
  "3M": "term3M", "6M": "term6M", "1Y": "term1Y",
  "2Y": "term2Y", "3Y": "term3Y", "5Y": "term5Y",
};

const VIETNAM_BANKS = [
  "Vietcombank", "VietinBank", "BIDV", "Agribank",
  "Techcombank", "MB Bank", "ACB", "VPBank",
  "Sacombank", "HDBank", "MSB", "VIB",
  "SHB", "TPBank", "OCB", "LienVietPostBank",
  "SeABank", "Bac A Bank", "Nam A Bank", "PVcomBank",
];

function words(locale) { return copy[locale] || copy.vi; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function parseVnd(value, optional = false) {
  const normalized = String(value ?? "").trim().replace(/[,.\s]/g, "");
  if (optional && normalized === "") return null;
  if (!/^\d+$/.test(normalized)) throw new Error("VND amount must be an integer");
  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("VND amount is outside the safe range");
  return amount;
}
export function parseAnnualRateToPpm(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d{1,3}(?:\.\d{1,4})?$/.test(normalized)) throw new Error("Annual rate must have at most four decimals");
  const [whole, fraction = ""] = normalized.split(".");
  const ppm = Number(whole) * 10_000 + Number(fraction.padEnd(4, "0"));
  if (!Number.isSafeInteger(ppm) || ppm > 1_000_000) throw new Error("Annual rate must be between 0 and 100 percent");
  return ppm;
}
function formValue(form, name) { return form.elements[name]?.value ?? ""; }
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
function addMonths(dateStr, months) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + months, day));
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}
function termLabel(labels, termValue) {
  const key = TERM_LABEL_KEYS[termValue];
  return key ? labels[key] : "";
}

export function parseDepositForm(form) {
  const openedOn = formValue(form, "openedOn"); const maturesOn = formValue(form, "maturesOn");
  if (!validDate(openedOn) || !validDate(maturesOn) || maturesOn <= openedOn) throw new Error("maturity date must be later than opening date");
  const institutionName = formValue(form, "institutionName").trim(); const productName = formValue(form, "productName").trim();
  if (!institutionName || !productName || institutionName.length > 120 || productName.length > 120) throw new Error("Institution and product are required");
  const reminderDays = [30, 7, 1];
  return {
    id: form.dataset.depositId,
    institutionName, productName,
    principalVnd: parseVnd(formValue(form, "principalVnd")),
    annualRatePpm: parseAnnualRateToPpm(formValue(form, "annualRatePercent")),
    openedOn, maturesOn,
    expectedInterestVnd: parseVnd(formValue(form, "expectedInterestVnd"), true),
    actualInterestVnd: form.dataset.actualInterestVnd ? Number(form.dataset.actualInterestVnd) : null,
    reminderDays,
    remindersEnabled: Boolean(form.elements.remindersEnabled?.checked),
    status: form.dataset.status || "ACTIVE",
    redeemedOn: form.dataset.redeemedOn || null,
    rolledOverToDepositId: form.dataset.rolledOverToDepositId || null,
    note: formValue(form, "note").trim(),
  };
}

export function renderDepositForm({ locale = "vi", id, deposit = null } = {}) {
  const labels = words(locale); const editing = Boolean(deposit);
  const rate = deposit ? String(deposit.annualRatePpm / 10_000) : "";
  const bankOptions = VIETNAM_BANKS.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
  const termOptions = `<option value="">${escapeHtml(labels.termBlank)}</option>` +
    TERM_OPTIONS.map(t => `<option value="${t.value}">${escapeHtml(labels[TERM_LABEL_KEYS[t.value]])}</option>`).join("");
  return `<div class="deposit-form-backdrop" data-deposit-form-backdrop><section class="deposit-form-sheet safe-area-bottom" role="dialog" aria-modal="true" aria-labelledby="deposit-form-title"><header><h3 id="deposit-form-title">${editing ? labels.edit : labels.add}</h3><button type="button" class="deposit-form-close" data-close-deposit-form aria-label="${labels.cancel}">×</button></header><form data-deposit-form data-deposit-id="${escapeHtml(id)}" data-version="${deposit?.version || 0}" data-status="${deposit?.status || "ACTIVE"}" data-actual-interest-vnd="${deposit?.actualInterestVnd ?? ""}" data-redeemed-on="${deposit?.redeemedOn ?? ""}" data-rolled-over-to-deposit-id="${deposit?.rolledOverToDepositId ?? ""}"><div class="deposit-form-grid"><label>${labels.institution}<input name="institutionName" list="bank-list-${escapeHtml(id)}" required maxlength="120" autocomplete="organization" value="${escapeHtml(deposit?.institutionName)}"><datalist id="bank-list-${escapeHtml(id)}">${bankOptions}</datalist></label><label>${labels.product}<input name="productName" required maxlength="120" value="${escapeHtml(deposit?.productName)}"></label><label>${labels.term}<select name="termDuration" data-term-select>${termOptions}</select></label><label>${labels.principal}<input name="principalVnd" required inputmode="numeric" pattern="[0-9,. ]+" value="${escapeHtml(deposit?.principalVnd)}"></label><label>${labels.rate}<input name="annualRatePercent" required inputmode="decimal" value="${escapeHtml(rate)}"></label><label>${labels.opened}<input name="openedOn" required type="date" value="${escapeHtml(deposit?.openedOn)}"></label><label>${labels.matures}<input name="maturesOn" required type="date" value="${escapeHtml(deposit?.maturesOn)}"></label><label>${labels.expected}<input name="expectedInterestVnd" inputmode="numeric" value="${escapeHtml(deposit?.expectedInterestVnd)}"></label><label class="deposit-reminder-toggle"><input name="remindersEnabled" type="checkbox"${deposit?.remindersEnabled === false ? "" : " checked"}><span>${labels.reminders} · D-30 / D-7 / D-1 / D0</span></label><label class="deposit-note-field">${labels.note}<textarea name="note" maxlength="1000">${escapeHtml(deposit?.note)}</textarea></label></div><p class="deposit-form-error" data-form-error role="alert"></p><div class="deposit-form-actions"><button type="button" class="btn-secondary" data-close-deposit-form>${labels.cancel}</button><button type="submit" class="btn-primary">${labels.save}</button></div></form></section></div>`;
}

export function bindDepositForm(root, { onSubmit, onClose, locale = "vi" } = {}) {
  const form = root?.querySelector?.("[data-deposit-form]"); if (!form) return;
  root.querySelectorAll("[data-close-deposit-form]").forEach(button => button.addEventListener("click", () => onClose?.()));
  root.querySelector("[data-deposit-form-backdrop]")?.addEventListener("click", event => { if (event.target === event.currentTarget) onClose?.(); });
  bindDialogKeyboard(root, onClose);

  const labels = words(locale);
  const termSelect = form.querySelector("[data-term-select]");
  const openedInput = form.elements.openedOn;
  const maturesInput = form.elements.maturesOn;
  const productInput = form.elements.productName;

  function recalcMaturity() {
    const termValue = termSelect?.value;
    const opened = openedInput?.value;
    if (termValue && opened) {
      const term = TERM_OPTIONS.find(t => t.value === termValue);
      if (term) {
        const maturity = addMonths(opened, term.months);
        if (maturesInput) maturesInput.value = maturity;
      }
    }
  }

  function autoFillProduct() {
    const termValue = termSelect?.value;
    if (termValue && productInput) {
      const tLabel = termLabel(labels, termValue);
      if (tLabel) productInput.value = labels.productAuto.replace("{term}", tLabel);
    }
  }

  termSelect?.addEventListener("change", function () {
    recalcMaturity();
    autoFillProduct();
  });
  openedInput?.addEventListener("change", recalcMaturity);

  form.addEventListener("submit", async event => {
    event.preventDefault(); const errorNode = form.querySelector("[data-form-error]"); const submit = form.querySelector("button[type=submit]");
    if (errorNode) errorNode.textContent = ""; submit.disabled = true;
    try { await onSubmit?.(parseDepositForm(form), { expectedVersion: Number(form.dataset.version || 0) }); }
    catch (error) {
      const loc = locale || (document.documentElement.lang === "zh-Hans" ? "zh-CN" : "vi");
      if (errorNode) errorNode.textContent = words(loc).saveError;
    }
    finally { submit.disabled = false; }
  });
  form.elements.institutionName?.focus();
}

function bindDialogKeyboard(root, onClose) {
  root.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); onClose?.(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...root.querySelectorAll("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter(element => !element.disabled && element.getAttribute("aria-hidden") !== "true");
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

export function renderDepositSettlementForm({ locale = "vi", deposit, mode = "redeem", today }) {
  const labels = settlementCopy[locale] || settlementCopy.vi;
  const rollover = mode === "rollover";
  const nextFields = rollover ? `<label>${labels.nextInstitution}<input name="institutionName" required maxlength="120" value="${escapeHtml(deposit.institutionName)}"></label><label>${labels.nextProduct}<input name="productName" required maxlength="120" value="${escapeHtml(deposit.productName)}"></label><label>${labels.nextPrincipal}<input name="principalVnd" required inputmode="numeric" value="${escapeHtml(deposit.principalVnd)}"></label><label>${labels.nextRate}<input name="annualRatePercent" required inputmode="decimal"></label><label>${labels.nextOpened}<input name="openedOn" required type="date" value="${escapeHtml(today)}"></label><label>${labels.nextMatures}<input name="maturesOn" required type="date"></label><label>${labels.nextExpected}<input name="expectedInterestVnd" inputmode="numeric"></label>` : `<label>${labels.settledOn}<input name="settledOn" required type="date" value="${escapeHtml(today)}" min="${escapeHtml(deposit.maturesOn)}"></label>`;
  return `<div class="deposit-form-backdrop" data-deposit-form-backdrop><section class="deposit-form-sheet safe-area-bottom" role="dialog" aria-modal="true" aria-labelledby="deposit-settlement-title"><header><h3 id="deposit-settlement-title">${rollover ? labels.rollover : labels.redeem}</h3><button type="button" class="deposit-form-close" data-close-deposit-form aria-label="${labels.cancel}">×</button></header><form data-deposit-settlement-form data-mode="${mode}" data-deposit-id="${escapeHtml(deposit.id)}"><div class="deposit-form-grid">${nextFields}<label>${labels.actualInterest}<input name="actualInterestVnd" inputmode="numeric"></label><label class="deposit-reminder-toggle"><input name="writeInterestToLedger" type="checkbox"><span>${labels.writeInterest}</span></label><p class="deposit-principal-warning" role="note">${labels.principalWarning}</p></div><p class="deposit-form-error" data-form-error role="alert"></p><div class="deposit-form-actions"><button type="button" class="btn-secondary" data-close-deposit-form>${labels.cancel}</button><button type="submit" class="btn-primary">${rollover ? labels.saveRollover : labels.saveRedeem}</button></div></form></section></div>`;
}

export function parseDepositSettlementForm(form) {
  const actualInterestVnd = parseVnd(formValue(form, "actualInterestVnd"), true);
  const writeInterestToLedger = Boolean(form.elements.writeInterestToLedger?.checked);
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

export function bindDepositSettlementForm(root, { locale = "vi", onSubmit, onClose } = {}) {
  const form = root?.querySelector?.("[data-deposit-settlement-form]"); if (!form) return;
  root.querySelectorAll("[data-close-deposit-form]").forEach(button => button.addEventListener("click", () => onClose?.()));
  root.querySelector("[data-deposit-form-backdrop]")?.addEventListener("click", event => { if (event.target === event.currentTarget) onClose?.(); });
  bindDialogKeyboard(root, onClose);
  form.addEventListener("submit", async event => {
    event.preventDefault(); const errorNode = form.querySelector("[data-form-error]"); const submit = form.querySelector("button[type=submit]");
    if (errorNode) errorNode.textContent = ""; submit.disabled = true;
    try {
      const parsed = parseDepositSettlementForm(form);
      if (parsed.writeInterestToLedger && globalThis.confirm && !globalThis.confirm((settlementCopy[locale] || settlementCopy.vi).confirmInterest)) return;
      await onSubmit?.(parsed);
    } catch (_) { if (errorNode) errorNode.textContent = (settlementCopy[locale] || settlementCopy.vi).saveError; }
    finally { submit.disabled = false; }
  });
  form.querySelector("input")?.focus();
}
