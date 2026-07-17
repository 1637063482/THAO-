import { describe, expect, it } from "vitest";
import { addMoney, convertMoney, createMoney, parseMajorAmount, subtractMoney } from "../../../src/domain/money";

describe("Money", () => {
  it("stores only safe integer minor units", () => {
    expect(createMoney(123, "VND")).toEqual({ amountMinor: 123, currency: "VND" });
    expect(() => createMoney(1.2, "VND")).toThrowError(/integer/);
    expect(() => createMoney(Number.MAX_SAFE_INTEGER + 1, "VND")).toThrowError(/safe/);
    expect(() => createMoney(Number.NaN, "CNY")).toThrow();
  });

  it("parses currency-specific decimal precision without floating point", () => {
    expect(parseMajorAmount("12.34", "CNY").amountMinor).toBe(1234);
    expect(parseMajorAmount("12", "VND").amountMinor).toBe(12);
    expect(() => parseMajorAmount("12.3", "VND")).toThrowError(/precision/);
  });

  it("adds and subtracts only the same currency", () => {
    expect(addMoney(createMoney(100, "CNY"), createMoney(25, "CNY")).amountMinor).toBe(125);
    expect(subtractMoney(createMoney(100, "CNY"), createMoney(125, "CNY")).amountMinor).toBe(-25);
    expect(() => addMoney(createMoney(1, "CNY"), createMoney(1, "VND"))).toThrowError(/currency/);
  });

  it("converts with scaled integer rates and half-away-from-zero rounding", () => {
    const cny = createMoney(1, "CNY");
    expect(convertMoney(cny, "VND", 350000000000, 100000000).amountMinor).toBe(35);
    expect(convertMoney(createMoney(-1, "CNY"), "VND", 350000000000, 100000000).amountMinor).toBe(-35);
    expect(convertMoney(createMoney(1, "CNY"), "JPY", 150000000, 100000000).amountMinor).toBe(0);
  });
});
