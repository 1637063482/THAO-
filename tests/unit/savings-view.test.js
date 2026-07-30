import { describe, expect, it, vi } from "vitest";
import { bindSavingsGoalForm, buildSavingsViewModel, installSavingsSyncBridge, renderSavingsPage, renderSavingsSummary } from "../../src/features/savings/view.js";

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

  it("renders and edits savings goals with readable VND separators", () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.getElementById("root");
    root.innerHTML = renderSavingsPage(buildSavingsViewModel({ ...input }));

    const monthly = root.querySelector('[name="monthly"]');
    const annual = root.querySelector('[name="annual"]');
    expect(monthly.value).toBe("300,000");
    expect(annual.value).toBe("4,000,000");

    bindSavingsGoalForm(root, { settings: {}, pendingUpdates: {}, month: 3 });
    monthly.value = "1234567";
    monthly.dispatchEvent(new Event("input", { bubbles: true }));
    expect(monthly.value).toBe("1,234,567");
  });

  it("rounds derived fractional VND totals before applying integer domain rules", () => {
    const vm = buildSavingsViewModel({
      ...input,
      monthlyIncome: 500000,
      monthlyExpense: 200000 / 3,
      annualIncome: 5000000,
      annualExpense: 2000000 / 3,
    });

    expect(vm.monthlyActual).toBe(433333);
    expect(vm.annualActual).toBe(4333333);
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

  it("bridges all real sync indicator states while retaining Chinese locale", async () => {
    document.body.innerHTML = '<div id="root"></div><div id="sync-status"></div>';
    const root = document.getElementById("root");
    root.dataset.locale = "zh-CN";
    root.innerHTML = renderSavingsPage(buildSavingsViewModel({ ...input, locale: "zh-CN" }));
    const sync = document.getElementById("sync-status");
    const stop = installSavingsSyncBridge(root, sync);
    const states = [["", "已同步"], ["bg-yellow-50", "正在同步"], ["bg-red-50", "保存失败"], ["bg-emerald-50", "已同步"]];
    for (const [className, label] of states) {
      sync.className = className;
      await Promise.resolve();
      expect(root.querySelector(".savings-sync-status").textContent).toBe(label);
    }
    stop();
  });

  it("cleans up an existing bridge before installing another and never updates a detached root", async () => {
    document.body.innerHTML = '<div id="root"><span class="savings-sync-status"></span></div><div id="sync-status"></div>';
    const root = document.getElementById("root");
    const sync = document.getElementById("sync-status");
    const disconnect = vi.fn();
    const OriginalObserver = globalThis.MutationObserver;
    globalThis.MutationObserver = class { observe() {} disconnect() { disconnect(); } };
    const first = installSavingsSyncBridge(root, sync);
    first();
    root.remove();
    sync.className = "bg-red-50";
    await Promise.resolve();
    expect(disconnect).toHaveBeenCalledOnce();
    globalThis.MutationObserver = OriginalObserver;
  });

  it.each([["vi", "Bạn có chắc muốn xóa mục tiêu tiết kiệm không?"], ["zh-CN", "确定要清空储蓄目标吗？"]])("uses localized clear confirmation for %s and keeps data on cancel", (locale, prompt) => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.getElementById("root");
    root.dataset.locale = locale;
    const settings = { savings_goal_month_3: 300 };
    const pending = {};
    root.innerHTML = renderSavingsPage(buildSavingsViewModel({ ...input, locale }));
    const originalConfirm = globalThis.confirm;
    let seen = "";
    globalThis.confirm = (message) => { seen = message; return false; };
    bindSavingsGoalForm(root, { settings, pendingUpdates: pending, month: 3, locale });
    root.querySelector("[data-clear-goals]").click();
    globalThis.confirm = originalConfirm;
    expect(seen).toBe(prompt);
    expect(settings.savings_goal_month_3).toBe(300);
    expect(pending).toEqual({});
  });
});
