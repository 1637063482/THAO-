import { describe, expect, it } from "vitest";
import { buildLegacyCsv, escapeCsvCell } from "../../src/js/export.js";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted && ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === ',') { row.push(cell); cell = ""; }
    else if (!quoted && ch === '\n') { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

describe("CSV export", () => {
  it.each(["=cmd", "+SUM(1)", "-2+3", "@evil", "\tformula", "\rformula"])(
    "neutralizes spreadsheet formula prefix %j",
    (value) => expect(escapeCsvCell(value)).toContain(`'${value}`),
  );

  it("round-trips quotes, commas, CRLF and Unicode", () => {
    const value = '中文, Tiếng Việt "ok"\r\n第二行';
    const parsed = parseCsv(`name\r\n${escapeCsvCell(value)}\r\n`);
    expect(parsed[1][0]).toBe(value);
  });

  it("exports a numeric daily total with a stable column count", () => {
    const categories = [{ id: "food", name: "餐饮" }, { id: "rent", name: "房租" }];
    const csv = buildLegacyCsv({
      year: 2026,
      balances: {},
      entries: {
        "1_1_food": "=100+50",
        "1_1_rent": "200",
        "1_1_income": "=1000",
        "1_1_remark": '=HYPERLINK("https://evil")\n备注',
      },
      categories,
      daysInMonth: () => 1,
      evaluate: (value) => value ? Function(`return (${String(value).replace(/^=/, "")})`)() : 0,
    });
    const rows = parseCsv(csv);
    const headerIndex = rows.findIndex((row) => row[0] === "日期");
    expect(rows[headerIndex]).toHaveLength(6);
    expect(rows[headerIndex + 1]).toHaveLength(6);
    expect(rows[headerIndex + 1][3]).toBe("350");
    expect(rows[headerIndex + 1][4]).toBe("1000");
    expect(rows[headerIndex + 1][5]).toContain("'=HYPERLINK");
  });
});
