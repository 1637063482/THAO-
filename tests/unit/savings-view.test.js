import { describe, expect, it } from "vitest";
import { bindSavingsGoalForm, buildSavingsViewModel, renderSavingsPage, renderSavingsSummary } from "../../src/js/savings-view.js";

describe("savings view", () => {
  const input = { settings: { savings_goal_month_3: 300000, savings_goal_annual: 4000000 }, month: 3, monthlyIncome: 500000, monthlyExpense: 200000, annualIncome: 5000000, annualExpense: 2000000 };
  it("renders no goal and progress boundaries without changing domain rules", () => {
    const vm = buildSavingsViewModel({ ...input, settings: {}, locale: "vi" });
    expect(vm.monthly.targetVnd).toBe(null);
    expect(renderSavingsSummary(vm)).toContain("Chưa đặt mục tiêu");
    expect(renderSavingsPage(vm)).toContain("Mục tiêu tiết kiệm");
  });
  it("renders independent monthly and annual progress in Vietnamese and Chinese", () => {
    const vm = buildSavingsViewModel({ ...input, locale: "zh-CN" });
    expect(vm.monthly.percent).toBe(100);
    expect(vm.annual.percent).toBe(75);
    expect(renderSavingsPage(vm)).toContain("储蓄目标");
  });

  it("keeps draft values visible after validation failure", () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.getElementById("root");
    root.innerHTML = renderSavingsPage(buildSavingsViewModel({ ...input }));
    let status = "";
    bindSavingsGoalForm(root, { settings: {}, pendingUpdates: {}, month: 3, onStatus: (value) => { status = value; } });
    root.querySelector('[name="monthly"]').value = "draft-vnd";
    root.querySelector('[name="annual"]').value = "7000000";
    root.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(status).toBe("error");
    expect(root.querySelector('[name="monthly"]').value).toBe("draft-vnd");
    expect(root.querySelector('[name="annual"]').value).toBe("7000000");
  });
});
