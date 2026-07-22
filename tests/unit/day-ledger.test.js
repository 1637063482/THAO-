import { describe, expect, it } from "vitest";
import { buildDailyLedger, setDailyLedgerCell } from "../../src/js/day-ledger.js";

const categories = [
  { id: "dining", label: "Ăn uống" },
  { id: "transport", label: "Di chuyển" },
];

describe("derived daily ledger", () => {
  it("maps expense, income, remark and source keys without creating transaction ids", () => {
    const result = buildDailyLedger({
      year: 2026,
      month: 3,
      entries: {
        "3_1_dining": "100000",
        "3_1_transport": "50000",
        "3_1_income": "200000",
        "3_1_remark": "Ăn trưa",
      },
      categories,
      daysInMonth: 31,
    });

    expect(result.days).toHaveLength(1);
    expect(result.days[0]).toMatchObject({ day: 1, dateKey: "2026-03-01", income: 200000, expenseTotal: 150000, remark: "Ăn trưa" });
    expect(result.days[0].cells).toEqual([
      { categoryId: "dining", label: "Ăn uống", value: 100000, sourceKey: "3_1_dining" },
      { categoryId: "transport", label: "Di chuyển", value: 50000, sourceKey: "3_1_transport" },
    ]);
    expect(result.days[0].transactionId).toBeUndefined();
  });

  it("omits empty days but preserves an explicit empty result", () => {
    const result = buildDailyLedger({ year: 2026, month: 2, entries: {}, categories, daysInMonth: 28 });
    expect(result.days).toEqual([]);
    expect(result.empty).toBe(true);
  });

  it("writes an edited daily cell back through the original legacy key", () => {
    const entries = { "3_1_dining": "100000" };
    const cell = { sourceKey: "3_1_dining" };
    expect(setDailyLedgerCell(entries, cell, "125000")).toBe("3_1_dining");
    expect(entries).toEqual({ "3_1_dining": "125000" });
    expect(Object.keys(entries)).toEqual(["3_1_dining"]);
  });
});
