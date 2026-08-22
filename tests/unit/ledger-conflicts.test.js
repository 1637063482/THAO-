import { describe, expect, it } from "vitest";
import { reconcileSettingsSnapshot } from "../../src/domain/ledger-conflicts.js";

describe("settings snapshot reconciliation", () => {
  it("merges remote changes for different keys while retaining the local patch", () => {
    const result = reconcileSettingsSnapshot({
      cloudSettings: { budget_8: 1000, savings_goal_month_8: 3000 },
      pendingSettings: { budget_8: 2000 },
      pendingBases: { budget_8: { present: true, value: 1000 } },
    });

    expect(result.settings).toEqual({ budget_8: 2000, savings_goal_month_8: 3000 });
    expect(result.conflicts).toEqual([]);
  });

  it("keeps the local value but reports a same-key remote change", () => {
    const result = reconcileSettingsSnapshot({
      cloudSettings: { budget_8: 1500 },
      pendingSettings: { budget_8: 2000 },
      pendingBases: { budget_8: { present: true, value: 1000 } },
    });

    expect(result.settings.budget_8).toBe(2000);
    expect(result.conflicts).toEqual([{
      key: "budget_8",
      baseValue: 1000,
      localValue: 2000,
      remoteValue: 1500,
    }]);
  });

  it("does not report a conflict after the remote value converges to local", () => {
    const result = reconcileSettingsSnapshot({
      cloudSettings: { budget_8: 2000 },
      pendingSettings: { budget_8: 2000 },
      pendingBases: { budget_8: { present: true, value: 1000 } },
    });

    expect(result.conflicts).toEqual([]);
  });
});
