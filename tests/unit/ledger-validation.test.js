import { describe, expect, it } from "vitest";
import { isValidCalendarDate, parseCurrencyAmountToVnd, parseVndAmount } from "../../src/js/ledger-validation.js";

describe("ledger financial input contract", () => {
  it.each(["-1", "1.5", "1e6", "1+", "1/0", "9007199254740992", "NaN", "Infinity"])(
    "rejects unsafe VND input %s",
    (value) => {
      expect(parseVndAmount(value)).toMatchObject({ ok: false, code: "INVALID_AMOUNT" });
    },
  );

  it("accepts a complete integer formula and returns a canonical persisted value", () => {
    expect(parseVndAmount("=100 + 200")).toEqual({ ok: true, value: 300, serialized: "=100+200" });
  });

  it("supports decimal CNY input only before conversion and rounds to an integer VND fact", () => {
    expect(parseCurrencyAmountToVnd("0.333", { currency: "CNY", rate: 3500 })).toEqual({
      ok: true,
      value: 1166,
      serialized: "1166",
    });
  });

  it.each([
    ["2026-02-29", false],
    ["2024-02-29", true],
    ["2026-04-31", false],
    ["2026-12-31", true],
  ])("validates real calendar dates: %s", (value, expected) => {
    expect(isValidCalendarDate(value)).toBe(expected);
  });
});
