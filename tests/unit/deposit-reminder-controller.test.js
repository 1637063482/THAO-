import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDepositReminderController } from "../../src/js/deposit-reminder-controller.js";

function documentWith(depositsById, acknowledgementsByKey = {}) {
  return { schemaVersion: 1, depositsById, acknowledgementsByKey, lastMutation: null };
}
function deposit(overrides = {}) {
  return { institutionName: "Fixture Bank", productName: "Synthetic deposit", maturesOn: "2026-07-31", reminderDays: [30, 7, 1], remindersEnabled: true, status: "ACTIVE", archivedAt: null, ...overrides };
}
function harness(overrides = {}) {
  document.body.innerHTML = '<div id="reminder-root"></div>';
  const state = { authenticated: true, ready: true, offline: false, locale: "vi", today: "2026-07-24", data: documentWith({ fixture: deposit() }) };
  const acknowledge = vi.fn().mockResolvedValue(undefined);
  const controller = createDepositReminderController({
    root: document.getElementById("reminder-root"),
    getDocument: () => state.data, getToday: () => state.today, getLocale: () => state.locale,
    isAuthenticated: () => state.authenticated, isReady: () => state.ready, isOffline: () => state.offline,
    acknowledge, storage: localStorage, now: () => 1_000, snoozeMs: 4_000, ...overrides,
  });
  return { state, acknowledge, controller, root: document.getElementById("reminder-root") };
}

describe("deposit reminder controller", () => {
  beforeEach(() => localStorage.clear());

  it("does not render before authentication and the first deposit snapshot", () => {
    const h = harness(); h.state.ready = false;
    expect(h.controller.check()).toEqual([]); expect(h.root.innerHTML).toBe("");
    h.state.ready = true; h.state.authenticated = false;
    expect(h.controller.check()).toEqual([]); expect(h.root.innerHTML).toBe("");
  });

  it("merges multiple reminders into one accessible localized dialog and marks offline data", () => {
    const h = harness(); h.state.locale = "zh-CN"; h.state.offline = true;
    h.state.data = documentWith({ first: deposit(), second: deposit({ institutionName: "Second Fixture", maturesOn: "2026-07-25" }) });
    expect(h.controller.check()).toHaveLength(2);
    expect(h.root.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(document.activeElement).toBe(h.root.querySelector('[role="dialog"]'));
    expect(h.root.querySelectorAll("[data-reminder-key]")).toHaveLength(2);
    expect(h.root.textContent).toContain("存款到期提醒");
    expect(h.root.textContent).toContain("离线数据，可能不是最新");
  });

  it("acknowledges one stable key and keeps the dialog with an error when the write fails", async () => {
    const h = harness(); h.acknowledge.mockRejectedValueOnce(new Error("offline")); h.controller.check();
    h.root.querySelector("[data-acknowledge-reminder]").click();
    await vi.waitFor(() => expect(h.acknowledge).toHaveBeenCalledWith("fixture|2026-07-31|D7"));
    await vi.waitFor(() => expect(h.root.textContent).toContain("Không thể lưu xác nhận"));
    expect(h.root.querySelector("[data-reminder-key]")).not.toBeNull();
  });

  it("suppresses an acknowledged item for the current session and lets a plain close reappear next lifecycle check", async () => {
    const acknowledged = harness(); acknowledged.controller.check();
    acknowledged.root.querySelector("[data-acknowledge-reminder]").click();
    await vi.waitFor(() => expect(acknowledged.acknowledge).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(acknowledged.root.querySelector("[role=dialog]")).toBeNull());
    expect(acknowledged.controller.check()).toEqual([]);

    const closed = harness(); closed.controller.check(); closed.controller.close();
    expect(closed.root.querySelector("[role=dialog]")).toBeNull();
    expect(closed.controller.check()).toHaveLength(1);
  });

  it("stores snooze locally and only shows it after the snooze expires", () => {
    let now = 1_000; const h = harness({ now: () => now, snoozeMs: 4_000 }); h.controller.check();
    h.root.querySelector("[data-snooze-reminder]").click();
    expect(h.root.querySelector("[role=dialog]")).toBeNull();
    expect(localStorage.getItem("myExpenseApp.depositReminderSnoozes.v1")).toContain("5000");
    expect(h.controller.check()).toEqual([]);
    now = 5_000;
    expect(h.controller.check()).toHaveLength(1);
  });
});
