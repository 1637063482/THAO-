import { calculateActualSavings, calculateSavingsProgress } from "../../domain/savings-goal.ts";
import { bindVndInputFormatting, formatVndInputValue as formatVndInputValueBase } from "../../js/vnd-input.js";
import { formatCurrencyInput, formatVndForCurrencyInput, isValidCurrencyRate } from "../../js/currency-view.js";
import { readSavingsGoals, writeAnnualSavingsGoal, writeMonthlySavingsGoal } from "./store.js";
import { requestAppConfirmation } from "../../components/feedback/confirmation-dialog.js";
/** @typedef {import("../../types/app-state").AppLocale} AppLocale */
/** @typedef {import("../../types/app-state").SavingsViewModel} SavingsViewModel */
/** @type {"VND" | "CNY"} */
let renderCurrency = "VND";
/** @type {number | null} */
let renderFxRate = null;
/** @param {unknown} value */
function formatVndInputValue(value) { return renderCurrency === "CNY" ? formatVndForCurrencyInput(value, renderCurrency, renderFxRate) : formatVndInputValueBase(value); }
const labels = { vi: { title: "Mục tiêu tiết kiệm", month: "Tháng này", annual: "Cả năm", actual: "Đã tiết kiệm", target: "Mục tiêu", difference: "Còn lại", save: "Lưu", clear: "Xóa mục tiêu", confirmClear: "Bạn có chắc muốn xóa mục tiêu tiết kiệm không?", noGoal: "Chưa đặt mục tiêu", synced: "Đã đồng bộ", syncing: "Đang đồng bộ", queued: "Đang chờ lưu", error: "Lưu thất bại" }, "zh-CN": { title: "储蓄目标", month: "本月", annual: "全年", actual: "实际储蓄", target: "目标", difference: "差额", save: "保存", clear: "清空目标", confirmClear: "确定要清空储蓄目标吗？", noGoal: "未设置目标", synced: "已同步", syncing: "正在同步", queued: "等待保存", error: "保存失败" } };
/** @param {string | undefined} locale @returns {AppLocale} */
function normalizeLocale(locale) { return locale === "zh-CN" ? "zh-CN" : "vi"; }
/** @param {string | undefined} currency @returns {"VND" | "CNY"} */
function normalizeCurrency(currency) { return currency === "CNY" ? "CNY" : "VND"; }
/** @param {number | null | undefined} rate @returns {number | null} */
function normalizeRate(rate) { return isValidCurrencyRate(rate) ? rate : null; }
/** @param {AppLocale} locale @param {keyof typeof labels.vi} key */
function text(locale, key) { return (labels[locale] || labels.vi)[key]; }
/** @param {number | null | undefined} value */
/** @param {number | null | undefined} value @param {((value: number) => string) | undefined} formatMoney */
function money(value, formatMoney) { return typeof formatMoney === "function" ? formatMoney(value || 0) : Number(value || 0).toLocaleString("en-US"); }
/** @param {number} value */
function normalize(value) { return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? Math.round(value) : value; }
/** @param {import("../../types/app-state").SavingsViewModelInput} input @returns {SavingsViewModel} */
export function buildSavingsViewModel({ settings = {}, month, monthlyIncome = 0, monthlyExpense = 0, annualIncome = monthlyIncome, annualExpense = monthlyExpense, locale = "vi", status = "synced", currency = "VND", fxRate = null }) { const goals = readSavingsGoals(settings); const monthlyActual = calculateActualSavings(normalize(monthlyIncome), normalize(monthlyExpense)); const annualActual = calculateActualSavings(normalize(annualIncome), normalize(annualExpense)); renderCurrency = normalizeCurrency(currency); renderFxRate = normalizeRate(fxRate); return { locale, month, goals, currency: renderCurrency, fxRate: renderFxRate, monthlyActual, annualActual, monthly: calculateSavingsProgress(monthlyActual, goals.monthly[month - 1]), annual: calculateSavingsProgress(annualActual, goals.annual), status }; }
/** @param {SavingsViewModel} vm */
/** @param {import("../../types/app-state").SavingsViewModel} vm @param {((value: number) => string) | undefined} formatMoney */
export function renderSavingsSummary(vm, formatMoney) { const goal = vm.monthly; return '<section class="savings-summary card p-4 mb-4" aria-label="' + text(vm.locale, "title") + '"><div class="flex items-center justify-between gap-3"><h2 class="text-sm font-bold text-slate-700">' + text(vm.locale, "title") + '</h2><span class="text-xs text-slate-400">' + text(vm.locale, "month") + '</span></div><div class="mt-3 flex items-end justify-between"><div><p class="text-xs text-slate-500">' + text(vm.locale, "actual") + '</p><p class="text-2xl font-black savings-actual-value blur-sensitive">' + money(vm.monthlyActual, formatMoney) + '</p></div><div class="text-right"><p class="text-xs text-slate-500">' + text(vm.locale, "target") + '</p><p class="font-bold text-slate-700 blur-sensitive">' + (goal.targetVnd === null ? text(vm.locale, "noGoal") : money(goal.targetVnd, formatMoney)) + '</p></div></div><div class="savings-progress mt-3"><div class="savings-progress-bar" style="width:' + (goal.percent || 0) + '%"></div></div><p class="text-xs text-slate-500 mt-2">' + (goal.percent === null ? text(vm.locale, "noGoal") : Math.round(goal.percent) + "%") + '</p></section>'; }
/** @param {SavingsViewModel} vm */
/** @param {import("../../types/app-state").SavingsViewModel} vm @param {((value: number) => string) | undefined} formatMoney */
export function renderSavingsPage(vm, formatMoney) { return '<section class="savings-page card p-4 md:p-6" aria-labelledby="savings-page-title"><div class="flex items-center justify-between gap-3"><h2 id="savings-page-title" class="text-lg font-bold text-slate-800">' + text(vm.locale, "title") + '</h2><span class="savings-sync-status" data-status="' + vm.status + '">' + text(vm.locale, vm.status === "error" ? "error" : vm.status === "queued" ? "queued" : vm.status === "syncing" ? "syncing" : "synced") + '</span></div><div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"><div class="savings-metric"><span>' + text(vm.locale, "month") + '</span><strong class="blur-sensitive">' + money(vm.monthlyActual, formatMoney) + ' / ' + (vm.monthly.targetVnd === null ? "—" : money(vm.monthly.targetVnd, formatMoney)) + '</strong><small class="blur-sensitive">' + text(vm.locale, "difference") + ': ' + (vm.monthly.targetVnd === null ? "—" : money(Math.max(0, vm.monthly.targetVnd - vm.monthlyActual), formatMoney)) + '</small></div><div class="savings-metric"><span>' + text(vm.locale, "annual") + '</span><strong class="blur-sensitive">' + money(vm.annualActual, formatMoney) + ' / ' + (vm.annual.targetVnd === null ? "—" : money(vm.annual.targetVnd, formatMoney)) + '</strong><small class="blur-sensitive">' + text(vm.locale, "difference") + ': ' + (vm.annual.targetVnd === null ? "—" : money(Math.max(0, vm.annual.targetVnd - vm.annualActual), formatMoney)) + '</small></div></div><form class="savings-goal-form mt-5" data-savings-goal-form><label>' + text(vm.locale, "month") + ' ' + vm.month + '<input class="savings-goal-input blur-sensitive" inputmode="numeric" name="monthly" value="' + formatVndInputValue(vm.goals.monthly[vm.month - 1]) + '" aria-label="' + text(vm.locale, "month") + '"></label><label>' + text(vm.locale, "annual") + '<input class="savings-goal-input blur-sensitive" inputmode="numeric" name="annual" value="' + formatVndInputValue(vm.goals.annual) + '" aria-label="' + text(vm.locale, "annual") + '"></label><div class="flex gap-2 md:col-span-2"><button type="submit" class="btn-primary">' + text(vm.locale, "save") + '</button><button type="button" class="btn-secondary" data-clear-goals>' + text(vm.locale, "clear") + '</button></div></form></section>'; }
/** @param {HTMLElement | null} root @param {string} status */
export function setSavingsStatus(root, status) {
  if (!root) return;
  /** @type {HTMLElement | null} */
  const node = root.querySelector(".savings-sync-status");
  if (!node) return;
  node.dataset.status = status;
  node.textContent = text(
    normalizeLocale(root.dataset.locale),
    status === "error" ? "error" : status === "queued" ? "queued" : status === "syncing" ? "syncing" : "synced",
  );
}
/** @param {HTMLElement} root @param {HTMLElement | null} [syncStatus] */
export function installSavingsSyncBridge(root, syncStatus = document.getElementById("sync-status")) { if (!syncStatus || typeof MutationObserver === "undefined") return () => {}; const update = () => setSavingsStatus(root, syncStatus.className.includes("sync-status-error") ? "error" : syncStatus.className.includes("sync-status-saving") ? "syncing" : "synced"); const observer = new MutationObserver(update); observer.observe(syncStatus, { attributes: true, childList: true, subtree: true }); update(); return () => observer.disconnect(); }
/** @param {HTMLInputElement} input @param {"VND" | "CNY"} currency */
function bindSavingsGoalInputFormatting(input, currency) {
  if (currency === "VND") return bindVndInputFormatting(input);
  const format = () => {
    const formatted = formatCurrencyInput(input.value, currency);
    input.value = formatted;
    if (document.activeElement === input) input.setSelectionRange(formatted.length, formatted.length);
  };
  input.addEventListener("input", format);
  return () => input.removeEventListener("input", format);
}
/** @param {number | null} value @param {string} currency @param {number | null} fxRate */
function parseSavingsGoalValue(value, currency, fxRate) {
  if (value === null) return null;
  if (currency !== "CNY") return Math.round(value);
  if (!isValidCurrencyRate(fxRate)) throw new Error("A valid CNY/VND rate is required for savings goals");
  return Math.round(value * /** @type {number} */ (fxRate));
}
/** @param {HTMLElement} root @param {import("../../types/app-state").SavingsGoalFormOptions} options */
export function bindSavingsGoalForm(root, {
  settings,
  pendingUpdates,
  month,
  locale = normalizeLocale(root.dataset.locale),
  currency = "VND",
  fxRate = null,
  onSave,
  onStatus,
}) {
  /** @type {import("../../types/dom-contracts").SavingsGoalForm | null} */
  const form = root.querySelector("[data-savings-goal-form]");
  if (!form) return () => {};
  const monthlyInput = form.elements.namedItem("monthly");
  const annualInput = form.elements.namedItem("annual");
  if (!(monthlyInput instanceof HTMLInputElement) || !(annualInput instanceof HTMLInputElement)) return () => {};

  /** @param {string} value */
  const parse = (value) => parseSavingsGoalValue(value.trim() === "" ? null : Number(value.replace(/,/g, "")), currency, fxRate);
  /** @param {SubmitEvent} event */
  const submit = (event) => {
    event.preventDefault();
    try {
      onStatus?.("queued");
      writeMonthlySavingsGoal(settings, pendingUpdates, month, parse(monthlyInput.value));
      writeAnnualSavingsGoal(settings, pendingUpdates, parse(annualInput.value));
      onSave?.();
    } catch (error) {
      onStatus?.("error", error);
    }
  };
  const clear = async () => {
    if (await requestAppConfirmation({ message: text(locale, "confirmClear"), title: text(locale, "title"), destructive: true })) {
      writeMonthlySavingsGoal(settings, pendingUpdates, month, null);
      writeAnnualSavingsGoal(settings, pendingUpdates, null);
      onSave?.();
    }
  };
  const clearButton = root.querySelector("[data-clear-goals]");
  const stopMonthlyFormatting = bindSavingsGoalInputFormatting(monthlyInput, currency);
  const stopAnnualFormatting = bindSavingsGoalInputFormatting(annualInput, currency);
  form.addEventListener("submit", submit);
  clearButton?.addEventListener("click", clear);
  return () => {
    stopMonthlyFormatting();
    stopAnnualFormatting();
    form.removeEventListener("submit", submit);
    clearButton?.removeEventListener("click", clear);
  };
}
