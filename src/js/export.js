import { t } from "./i18n.js";

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

export function escapeCsvCell(value) {
  let text = value === undefined || value === null ? "" : String(value);
  if (FORMULA_PREFIX_RE.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) text = '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function row(values) {
  return values.map(escapeCsvCell).join(",");
}

export function buildLegacyCsv({ year, balances, entries, categories, daysInMonth, evaluate }) {
  const lines = [row([`--- ${year}年Thao的云端开支账本 ---`]), "", row(["--- 年初资产 ---"]), row(["账户类型", "金额"])];
  const accountRows = [
    ["银行卡", "bal-bank"], ["支付宝", "bal-alipay"], ["微信钱包", "bal-wechat"], ["现金及其他", "bal-other"],
  ];
  accountRows.forEach(([name, key]) => lines.push(row([name, evaluate(balances[key])])));
  lines.push("");

  for (let month = 1; month <= 12; month++) {
    lines.push(row([t("year_display", { year: year }) + " " + t("month_display", { month: month })]));
    lines.push(row([t("date"), ...categories.map((category) => t(category.nameKey)), t("daily_total_expense"), t("income_total"), t("remark")]));
    for (let day = 1; day <= daysInMonth(year, month); day++) {
      const categoryValues = categories.map((category) => evaluate(entries[`${month}_${day}_${category.id}`]));
      const dailyExpense = categoryValues.reduce((sum, value) => sum + value, 0);
      lines.push(row([
        `${month}月${day}日`,
        ...categoryValues,
        dailyExpense,
        evaluate(entries[`${month}_${day}_income`]),
        entries[`${month}_${day}_remark`] || "",
      ]));
    }
    lines.push("");
  }

  lines.push(row(["--- 年末资产 ---"]), row(["账户类型", "金额"]));
  const endingRows = [
    ["银行卡", "end-bal-bank"], ["支付宝", "end-bal-alipay"], ["微信钱包", "end-bal-wechat"], ["现金及其他", "end-bal-other"],
  ];
  endingRows.forEach(([name, key]) => lines.push(row([name, evaluate(balances[key])])));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
