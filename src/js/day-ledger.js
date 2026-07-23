import { safeEval } from "./utils.js";

let ledgerView = "table";

function readEntry(entries, key) {
  const raw = entries[key];
  if (raw === undefined || raw === null || raw === "") return null;
  const value = safeEval(String(raw));
  return Number.isFinite(value) ? value : 0;
}

export function buildDailyLedger({ year, month, entries, categories, daysInMonth }) {
  const days = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const cells = categories.map((category) => {
      const sourceKey = `${month}_${day}_${category.id}`;
      return { categoryId: category.id, label: category.label, value: readEntry(entries, sourceKey), sourceKey };
    }).filter((cell) => cell.value !== null && cell.value !== 0);
    const incomeKey = `${month}_${day}_income`;
    const income = readEntry(entries, incomeKey);
    const remarkKey = `${month}_${day}_remark`;
    const remark = entries[remarkKey] || "";
    if (!cells.length && income === null && !remark) continue;
    days.push({
      day,
      dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      cells,
      income: income || 0,
      expenseTotal: cells.reduce((total, cell) => total + cell.value, 0),
      remark,
    });
  }
  return { days, empty: days.length === 0 };
}

export function setDailyLedgerCell(entries, cell, value) {
  entries[cell.sourceKey] = value;
  return cell.sourceKey;
}

export function createLedgerViewState(width, options = {}) {
  return { view: width < 768 ? "daily" : "table", pendingUpdates: options.pendingUpdates || {} };
}

export function toggleLedgerView(viewState) {
  return { ...viewState, view: viewState.view === "daily" ? "table" : "daily" };
}

export function getLedgerView() {
  if (!ledgerView) ledgerView = createLedgerViewState(typeof window !== "undefined" ? window.innerWidth : 1024).view;
  return ledgerView;
}

export function setLedgerView(view) {
  ledgerView = view === "table" ? "table" : "daily";
  return ledgerView;
}
