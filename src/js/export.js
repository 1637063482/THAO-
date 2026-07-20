const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

export function escapeCsvCell(value) {
  let text = value === undefined || value === null ? "" : String(value);
  if (FORMULA_PREFIX_RE.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) text = '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function row(values) {
  const safe = values.map(escapeCsvCell);
  return safe.join(",");
}

export function buildLegacyCsv({ year, balances, entries, categories, daysInMonth, evaluate }) {
  const lines = [];

  for (let month = 1; month <= 12; month++) {
    lines.push(row([`--- ${year}年${month}月 ---`]));
    lines.push(row(["日期", ...categories.map((category) => category.name), "当日总支出", "当日收入", "备注"]));
    for (let day = 1; day <= daysInMonth(year, month); day++) {
      const col = [String(day)];
      let totalExpense = 0;
      categories.forEach((cat) => {
        const raw = entries[`${month}_${day}_${cat.id}`];
        const val = raw ? evaluate(raw) : 0;
        col.push(val > 0 ? String(val) : "");
        totalExpense += val;
      });
      const incomeRaw = entries[`${month}_${day}_income`];
      const income = incomeRaw ? evaluate(incomeRaw) : 0;
      col.push(totalExpense > 0 ? String(totalExpense) : "");
      col.push(income > 0 ? String(income) : "");
      col.push(entries[`${month}_${day}_remark`] || "");
      lines.push(row(col));
    }
  }
  lines.push("");
  return lines.join("\n");
}
