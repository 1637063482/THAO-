import { calculateActualSavings, calculateSavingsProgress } from "../domain/savings-goal.ts";
import { readSavingsGoals, writeAnnualSavingsGoal, writeMonthlySavingsGoal } from "./savings-goal-store.js";

const labels = {
  vi: { title: "Mục tiêu tiết kiệm", month: "Tháng này", annual: "Cả năm", actual: "Đã tiết kiệm", target: "Mục tiêu", difference: "Còn lại", save: "Lưu", clear: "Xóa mục tiêu", noGoal: "Chưa đặt mục tiêu", synced: "Đã đồng bộ", queued: "Đang chờ lưu", error: "Lưu thất bại" },
  "zh-CN": { title: "储蓄目标", month: "本月", annual: "全年", actual: "实际储蓄", target: "目标", difference: "差额", save: "保存", clear: "清空目标", noGoal: "未设置目标", synced: "已同步", queued: "等待保存", error: "保存失败" },
};

function text(locale, key) { return (labels[locale] || labels.vi)[key]; }
function money(value) { return Number(value || 0).toLocaleString("en-US"); }

export function buildSavingsViewModel({ settings = {}, month, monthlyIncome = 0, monthlyExpense = 0, annualIncome = monthlyIncome, annualExpense = monthlyExpense, locale = "vi", status = "synced" }) {
  const goals = readSavingsGoals(settings);
  const monthlyActual = calculateActualSavings(monthlyIncome, monthlyExpense);
  const annualActual = calculateActualSavings(annualIncome, annualExpense);
  return { locale, month, goals, monthlyActual, annualActual, monthly: calculateSavingsProgress(monthlyActual, goals.monthly[month - 1]), annual: calculateSavingsProgress(annualActual, goals.annual), status };
}

export function renderSavingsSummary(vm) {
  const goal = vm.monthly;
  return '<section class="savings-summary card p-4 mb-4" aria-label="' + text(vm.locale, "title") + '">' +
    '<div class="flex items-center justify-between gap-3"><h2 class="text-sm font-bold text-slate-700">' + text(vm.locale, "title") + '</h2><span class="text-xs text-slate-400">' + text(vm.locale, "month") + '</span></div>' +
    '<div class="mt-3 flex items-end justify-between"><div><p class="text-xs text-slate-500">' + text(vm.locale, "actual") + '</p><p class="text-2xl font-black text-emerald-600 blur-sensitive">' + money(vm.monthlyActual) + '</p></div><div class="text-right"><p class="text-xs text-slate-500">' + text(vm.locale, "target") + '</p><p class="font-bold text-slate-700 blur-sensitive">' + (goal.targetVnd === null ? text(vm.locale, "noGoal") : money(goal.targetVnd)) + '</p></div></div>' +
    '<div class="savings-progress mt-3"><div class="savings-progress-bar" style="width:' + (goal.percent || 0) + '%"></div></div><p class="text-xs text-slate-500 mt-2">' + (goal.percent === null ? text(vm.locale, "noGoal") : Math.round(goal.percent) + "%") + '</p></section>';
}

export function renderSavingsPage(vm) {
  return '<section class="savings-page card p-4 md:p-6" aria-labelledby="savings-page-title"><div class="flex items-center justify-between gap-3"><h2 id="savings-page-title" class="text-lg font-bold text-slate-800">' + text(vm.locale, "title") + '</h2><span class="savings-sync-status" data-status="' + vm.status + '">' + text(vm.locale, vm.status === "error" ? "error" : vm.status === "queued" ? "queued" : "synced") + '</span></div>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"><div class="savings-metric"><span>' + text(vm.locale, "month") + '</span><strong class="blur-sensitive">' + money(vm.monthlyActual) + ' / ' + (vm.monthly.targetVnd === null ? "—" : money(vm.monthly.targetVnd)) + '</strong><small>' + text(vm.locale, "difference") + ': ' + (vm.monthly.targetVnd === null ? "—" : money(Math.max(0, vm.monthly.targetVnd - vm.monthlyActual))) + '</small></div><div class="savings-metric"><span>' + text(vm.locale, "annual") + '</span><strong class="blur-sensitive">' + money(vm.annualActual) + ' / ' + (vm.annual.targetVnd === null ? "—" : money(vm.annual.targetVnd)) + '</strong><small>' + text(vm.locale, "difference") + ': ' + (vm.annual.targetVnd === null ? "—" : money(Math.max(0, vm.annual.targetVnd - vm.annualActual))) + '</small></div></div>' +
    '<form class="savings-goal-form mt-5" data-savings-goal-form><label>' + text(vm.locale, "month") + ' ' + vm.month + '<input inputmode="numeric" name="monthly" value="' + (vm.goals.monthly[vm.month - 1] ?? "") + '" aria-label="' + text(vm.locale, "month") + '"></label><label>' + text(vm.locale, "annual") + '<input inputmode="numeric" name="annual" value="' + (vm.goals.annual ?? "") + '" aria-label="' + text(vm.locale, "annual") + '"></label><div class="flex gap-2 md:col-span-2"><button type="submit" class="btn-primary">' + text(vm.locale, "save") + '</button><button type="button" class="btn-secondary" data-clear-goals>' + text(vm.locale, "clear") + '</button></div></form></section>';
}

export function bindSavingsGoalForm(root, { settings, pendingUpdates, month, onSave, onStatus } = {}) {
  const form = root?.querySelector("[data-savings-goal-form]");
  if (!form) return;
  const parse = (value) => value.trim() === "" ? null : Number(value.replace(/,/g, ""));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      onStatus?.("queued");
      writeMonthlySavingsGoal(settings, pendingUpdates, month, parse(form.monthly.value));
      writeAnnualSavingsGoal(settings, pendingUpdates, parse(form.annual.value));
      onSave?.();
    } catch (error) { onStatus?.("error", error); }
  });
  root.querySelector("[data-clear-goals]")?.addEventListener("click", () => {
    if (!globalThis.confirm || globalThis.confirm("Clear savings goals?")) {
      writeMonthlySavingsGoal(settings, pendingUpdates, month, null);
      writeAnnualSavingsGoal(settings, pendingUpdates, null);
      onSave?.();
    }
  });
}
