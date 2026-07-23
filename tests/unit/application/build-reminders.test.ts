import { describe, expect, it } from "vitest";
import { buildDepositReminders } from "../../../src/application/deposits/build-reminders";

function deposit(overrides: Record<string, unknown> = {}) {
  return {
    institutionName: "Fixture Bank", productName: "Synthetic term deposit",
    maturesOn: "2026-07-31", reminderDays: [30, 7, 1], remindersEnabled: true,
    status: "ACTIVE", archivedAt: null, ...overrides,
  };
}

describe("buildDepositReminders", () => {
  it.each([
    ["2026-07-01", "D30"],
    ["2026-07-24", "D7"],
    ["2026-07-30", "D1"],
    ["2026-07-31", "D0"],
    ["2026-08-01", "OVERDUE"],
  ])("selects the most urgent reached stage on %s", (today, stage) => {
    const reminders = buildDepositReminders({ depositsById: { fixture: deposit() }, acknowledgementsByKey: {}, today });
    expect(reminders).toMatchObject([{ depositId: "fixture", stage, key: `fixture|2026-07-31|${stage}` }]);
  });

  it("does not replay missed stages and respects configured advance days", () => {
    expect(buildDepositReminders({ depositsById: { fixture: deposit({ reminderDays: [7, 1] }) }, acknowledgementsByKey: {}, today: "2026-07-10" })).toEqual([]);
    expect(buildDepositReminders({ depositsById: { fixture: deposit({ reminderDays: [30, 7, 1] }) }, acknowledgementsByKey: {}, today: "2026-07-30" })[0].stage).toBe("D1");
  });

  it("suppresses the current acknowledgement but not one for an old maturity date", () => {
    const currentKey = "fixture|2026-07-31|D7";
    expect(buildDepositReminders({ depositsById: { fixture: deposit() }, acknowledgementsByKey: { [currentKey]: {} }, today: "2026-07-24" })).toEqual([]);
    expect(buildDepositReminders({ depositsById: { fixture: deposit() }, acknowledgementsByKey: { "fixture|2026-06-30|OVERDUE": {} }, today: "2026-07-24" })[0].key).toBe(currentKey);
  });

  it("merges and sorts multiple eligible deposits while excluding inactive records", () => {
    const reminders = buildDepositReminders({
      depositsById: {
        later: deposit({ maturesOn: "2026-08-01" }),
        sooner: deposit({ maturesOn: "2026-07-25" }),
        archived: deposit({ archivedAt: new Date() }),
        redeemed: deposit({ status: "REDEEMED" }),
        disabled: deposit({ remindersEnabled: false }),
      },
      acknowledgementsByKey: {}, today: "2026-07-24",
    });
    expect(reminders.map(item => item.depositId)).toEqual(["sooner", "later"]);
  });

  it("filters a local snooze only until its timestamp expires", () => {
    const key = "fixture|2026-07-31|D7";
    const base = { depositsById: { fixture: deposit() }, acknowledgementsByKey: {}, today: "2026-07-24", nowMs: 1_000 };
    expect(buildDepositReminders({ ...base, snoozedUntilByKey: { [key]: 2_000 } })).toEqual([]);
    expect(buildDepositReminders({ ...base, nowMs: 2_000, snoozedUntilByKey: { [key]: 2_000 } })).toHaveLength(1);
  });
});
