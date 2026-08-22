import { describe, expect, it } from "vitest";
import { validateLegacyImport } from "../../src/js/import-schema.js";

const valid = () => ({
  balances: { "bal-bank": "=100+200" },
  entries: { "1_1_dining": "=10+20", "1_1_remark": "早餐,午餐" },
    settings: { budget_1: 15000000, savings_goal_month_1: 500000, savings_goal_annual: null, expense_last_date: "2026-07-17" },
});

describe("legacy import schema", () => {
  it("accepts a valid legacy ledger", () => {
    expect(validateLegacyImport(valid())).toEqual({ ok: true, data: valid() });
  });

  it("accepts persistent deposit-interest operation records", () => {
    const input = {
      ...valid(),
      operationsById: {
        "deposit-interest-fixture-2026": {
          kind: "DEPOSIT_INTEREST", dateKey: "2026-08-01", amountVnd: 550000, status: "COMPLETED",
        },
      },
    };
    expect(validateLegacyImport(input, { year: 2026 })).toEqual({ ok: true, data: input });
  });

  it.each([
    [{ balances: {} }, "MISSING_ENTRIES"],
    [{ ...valid(), unknown: {} }, "UNKNOWN_TOP_LEVEL_FIELD"],
    [{ ...valid(), entries: [] }, "INVALID_SECTION"],
    [{ ...valid(), entries: { bad_key: "1" } }, "INVALID_ENTRY_KEY"],
    [{ ...valid(), entries: { "1_1_dining": "1;alert(1)" } }, "INVALID_AMOUNT"],
    [{ ...valid(), entries: { "1_1_remark": '<img onerror="alert(1)">' } }, "DANGEROUS_TEXT"],
    [{ ...valid(), entries: { "1_1_remark": "x".repeat(1001) } }, "TEXT_TOO_LONG"],
    [{ ...valid(), balances: { "other-key": "1" } }, "INVALID_BALANCE_KEY"],
    [{ ...valid(), settings: { admin: true } }, "INVALID_SETTING_KEY"],
    [{ ...valid(), settings: { savings_goal_month_1: 1.5 } }, "INVALID_SETTING"],
    [{ ...valid(), settings: { savings_goal_month_13: 1 } }, "INVALID_SETTING_KEY"],
    [{ ...valid(), entries: { "2_31_dining": 1 } }, "INVALID_ENTRY_DATE"],
    [{ ...valid(), entries: { "2_29_dining": 1 } }, "INVALID_ENTRY_DATE"],
    [{ ...valid(), balances: { "bal-bank": -1 } }, "INVALID_AMOUNT"],
    [{ ...valid(), balances: { "bal-bank": 1.5 } }, "INVALID_AMOUNT"],
    [{ ...valid(), balances: { "bal-bank": "1e6" } }, "INVALID_AMOUNT"],
    [{ ...valid(), settings: { budget_1: 1.5 } }, "INVALID_SETTING"],
  ])("rejects invalid input with %s", (input, code) => {
    expect(validateLegacyImport(input, { year: 2026 })).toMatchObject({ ok: false, code });
  });

  it("rejects a serialized payload above the configured size", () => {
    expect(validateLegacyImport(valid(), { serializedBytes: 901000 })).toMatchObject({ ok: false, code: "FILE_TOO_LARGE" });
  });
});
