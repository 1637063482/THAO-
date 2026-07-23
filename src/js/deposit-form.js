const copy = {
  vi: { add: "Thêm khoản tiền gửi", edit: "Sửa khoản tiền gửi", institution: "Ngân hàng", product: "Sản phẩm", principal: "Số tiền gửi (VND)", rate: "Lãi suất năm (%)", opened: "Ngày gửi", matures: "Ngày đáo hạn", expected: "Lợi nhuận dự kiến (không bắt buộc)", note: "Ghi chú", reminders: "Nhắc trước ngày đáo hạn", save: "Lưu khoản tiền gửi", cancel: "Hủy", saveError: "Không thể lưu. Bản nháp vẫn được giữ lại.", invalid: "Vui lòng kiểm tra dữ liệu đã nhập." },
  "zh-CN": { add: "新增存款", edit: "编辑存款", institution: "银行", product: "产品", principal: "存款金额（VND）", rate: "年利率（%）", opened: "存入日期", matures: "到期日期", expected: "预计收益（可选）", note: "备注", reminders: "到期前提醒", save: "保存存款", cancel: "取消", saveError: "保存失败，草稿已保留。", invalid: "请检查输入内容。" },
};
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
  return `<div class="deposit-form-backdrop" data-deposit-form-backdrop><section class="deposit-form-sheet safe-area-bottom" role="dialog" aria-modal="true" aria-labelledby="deposit-form-title"><header><h3 id="deposit-form-title">${editing ? labels.edit : labels.add}</h3><button type="button" class="deposit-form-close" data-close-deposit-form aria-label="${labels.cancel}">×</button></header><form data-deposit-form data-deposit-id="${escapeHtml(id)}" data-version="${deposit?.version || 0}" data-status="${deposit?.status || "ACTIVE"}" data-actual-interest-vnd="${deposit?.actualInterestVnd ?? ""}" data-redeemed-on="${deposit?.redeemedOn ?? ""}" data-rolled-over-to-deposit-id="${deposit?.rolledOverToDepositId ?? ""}"><div class="deposit-form-grid"><label>${labels.institution}<input name="institutionName" required maxlength="120" autocomplete="organization" value="${escapeHtml(deposit?.institutionName)}"></label><label>${labels.product}<input name="productName" required maxlength="120" value="${escapeHtml(deposit?.productName)}"></label><label>${labels.principal}<input name="principalVnd" required inputmode="numeric" pattern="[0-9,. ]+" value="${escapeHtml(deposit?.principalVnd)}"></label><label>${labels.rate}<input name="annualRatePercent" required inputmode="decimal" value="${escapeHtml(rate)}"></label><label>${labels.opened}<input name="openedOn" required type="date" value="${escapeHtml(deposit?.openedOn)}"></label><label>${labels.matures}<input name="maturesOn" required type="date" value="${escapeHtml(deposit?.maturesOn)}"></label><label>${labels.expected}<input name="expectedInterestVnd" inputmode="numeric" value="${escapeHtml(deposit?.expectedInterestVnd)}"></label><label class="deposit-reminder-toggle"><input name="remindersEnabled" type="checkbox"${deposit?.remindersEnabled === false ? "" : " checked"}><span>${labels.reminders} · D-30 / D-7 / D-1 / D0</span></label><label class="deposit-note-field">${labels.note}<textarea name="note" maxlength="1000">${escapeHtml(deposit?.note)}</textarea></label></div><p class="deposit-form-error" data-form-error role="alert"></p><div class="deposit-form-actions"><button type="button" class="btn-secondary" data-close-deposit-form>${labels.cancel}</button><button type="submit" class="btn-primary">${labels.save}</button></div></form></section></div>`;
}

export function bindDepositForm(root, { onSubmit, onClose } = {}) {
  const form = root?.querySelector?.("[data-deposit-form]"); if (!form) return;
  root.querySelectorAll("[data-close-deposit-form]").forEach(button => button.addEventListener("click", () => onClose?.()));
  root.querySelector("[data-deposit-form-backdrop]")?.addEventListener("click", event => { if (event.target === event.currentTarget) onClose?.(); });
  form.addEventListener("submit", async event => {
    event.preventDefault(); const errorNode = form.querySelector("[data-form-error]"); const submit = form.querySelector("button[type=submit]");
    if (errorNode) errorNode.textContent = ""; submit.disabled = true;
    try { await onSubmit?.(parseDepositForm(form), { expectedVersion: Number(form.dataset.version || 0) }); }
    catch (error) {
      const locale = root.closest?.("[data-locale]")?.dataset.locale || (document.documentElement.lang === "zh-Hans" ? "zh-CN" : "vi");
      if (errorNode) errorNode.textContent = words(locale).saveError;
    }
    finally { submit.disabled = false; }
  });
  form.elements.institutionName?.focus();
}
