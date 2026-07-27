import { describe, expect, it, vi } from "vitest";
import { createDepositId } from "../../src/js/deposit-id.js";

describe("createDepositId", () => {
  it("creates 1,000 unique IDs matching the deposit schema", () => {
    const ids = Array.from({ length: 1_000 }, () => createDepositId());

    expect(new Set(ids)).toHaveLength(1_000);
    expect(ids.every(id => /^deposit-[A-Za-z0-9_-]{1,72}$/.test(id))).toBe(true);
  });

  it("does not reuse a caller-provided value", () => {
    expect(createDepositId("user-supplied-id")).not.toBe("user-supplied-id");
  });

  it("uses a schema-safe fallback when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const ids = [createDepositId(), createDepositId()];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    expect(new Set(ids)).toHaveLength(2);
    expect(ids.every(id => /^deposit-[A-Za-z0-9_-]{1,72}$/.test(id))).toBe(true);
  });
});
