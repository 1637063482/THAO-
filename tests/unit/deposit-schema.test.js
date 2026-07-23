import { describe, expect, it } from "vitest";
import {
  createEmptyDepositDocument,
  serializeDepositBackup,
  validateDepositDocument,
} from "../../src/js/deposit-schema.js";

function record(overrides = {}) {
  return {
    institutionName: "Fixture Bank",
    productName: "12 month deposit",
    principalVnd: 10_000_000,
    annualRatePpm: 55_000,
    openedOn: "2026-01-01",
    maturesOn: "2027-01-01",
    expectedInterestVnd: null,
    actualInterestVnd: null,
    reminderDays: [30, 7, 1],
    remindersEnabled: true,
    status: "ACTIVE",
    redeemedOn: null,
    rolledOverToDepositId: null,
    note: "synthetic fixture",
    version: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    createdBy: "fixture-a",
    updatedBy: "fixture-a",
    archivedAt: null,
    ...overrides,
  };
}

function documentWith(deposit = record()) {
  return {
    schemaVersion: 1,
    depositsById: { "deposit-1": deposit },
    acknowledgementsByKey: {},
    lastMutation: {
      kind: "CREATE_DEPOSIT",
      targetId: "deposit-1",
      actorUid: "fixture-a",
      at: new Date("2026-01-01T00:00:00Z"),
    },
  };
}

describe("deposit storage schema", () => {
  it("accepts the missing-document empty state and a valid round trip", () => {
    expect(validateDepositDocument(createEmptyDepositDocument())).toEqual(createEmptyDepositDocument());
    const value = documentWith();
    expect(validateDepositDocument(value)).toBe(value);
  });

  it.each([
    ["unsafe principal", { principalVnd: Number.MAX_SAFE_INTEGER + 1 }],
    ["negative rate", { annualRatePpm: -1 }],
    ["rate over 100%", { annualRatePpm: 1_000_001 }],
    ["invalid date", { openedOn: "2026-02-30" }],
    ["non-later maturity", { maturesOn: "2026-01-01" }],
    ["derived status", { status: "MATURED" }],
    ["invalid reminder member", { reminderDays: [30, "7"] }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => validateDepositDocument(documentWith(record(overrides)))).toThrow();
  });

  it("rejects unknown fields and oversized maps", () => {
    expect(() => validateDepositDocument({ ...documentWith(), surprise: true })).toThrow(/field/i);
    const depositsById = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`d-${index}`, record()]));
    expect(() => validateDepositDocument({ ...documentWith(), depositsById })).toThrow(/100/);
  });

  it("accepts the five reminder stages and rejects an unknown acknowledgement stage", () => {
    const value = documentWith();
    value.acknowledgementsByKey["deposit-1|2027-01-01|OVERDUE"] = {
      acknowledgedAt: new Date("2027-01-02T00:00:00Z"), acknowledgedBy: "fixture-a",
    };
    expect(validateDepositDocument(value)).toBe(value);
    value.acknowledgementsByKey = {
      "deposit-1|2027-01-01|UNKNOWN": value.acknowledgementsByKey["deposit-1|2027-01-01|OVERDUE"],
    };
    expect(() => validateDepositDocument(value)).toThrow(/acknowledgement/i);
  });

  it("creates a deterministic versioned backup without mutating source data", () => {
    const value = documentWith();
    const before = structuredClone(value);
    const json = serializeDepositBackup(value);
    expect(JSON.parse(json)).toMatchObject({ backupVersion: 1, schemaVersion: 1, depositsById: { "deposit-1": { principalVnd: 10_000_000 } } });
    expect(value).toEqual(before);
  });
});
