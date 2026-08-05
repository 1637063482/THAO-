import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDepositController } from "../../src/features/deposits/controller.js";

function createHarness() {
  document.body.innerHTML = [
    '<div id="deposit-root"></div>',
    '<div id="deposit-form-root">draft</div>',
    '<div id="deposit-reminder-root"></div>',
  ].join("");

  const state = {
    currentUser: null,
    depositDocument: {
      schemaVersion: 1,
      depositsById: {},
      acknowledgementsByKey: {},
      lastMutation: null,
    },
    appState: { entries: {} },
  };
  const repositories = [];
  const unsubscribe = vi.fn();
  const removeRuntimeListener = vi.fn();
  const clearTimer = vi.fn();
  const dependencies = {
    state,
    hosts: {
      root: document.getElementById("deposit-root"),
      form: document.getElementById("deposit-form-root"),
      reminder: document.getElementById("deposit-reminder-root"),
    },
    createRepository: vi.fn(user => {
      const repository = {
        user,
        acknowledge: vi.fn(),
        archive: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
      };
      repositories.push(repository);
      return repository;
    }),
    subscribe: vi.fn(() => unsubscribe),
    getToday: () => "2026-07-27",
    getLocale: () => "vi",
    getNextMidnightDelay: () => 60_000,
    isOnline: () => true,
    isDocumentHidden: () => false,
    queueLegacyInterest: vi.fn(),
    confirm: vi.fn(() => true),
    addRuntimeListener: vi.fn(() => removeRuntimeListener),
    setTimer: vi.fn(() => 41),
    clearTimer,
  };

  return {
    controller: createDepositController(dependencies),
    dependencies,
    repositories,
    removeRuntimeListener,
    state,
    unsubscribe,
    clearTimer,
  };
}

describe("deposit feature controller lifecycle", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("subscribes exactly once for one start", () => {
    const { controller, dependencies, repositories } = createHarness();

    controller.start({ uid: "fixture-user" });

    expect(dependencies.createRepository).toHaveBeenCalledTimes(1);
    expect(repositories[0].user).toEqual({ uid: "fixture-user" });
    expect(dependencies.subscribe).toHaveBeenCalledTimes(1);
  });

  it("stops the snapshot, runtime resources, form, reminder, and UI state", () => {
    const {
      controller,
      dependencies,
      removeRuntimeListener,
      state,
      unsubscribe,
      clearTimer,
    } = createHarness();
    controller.start({ uid: "fixture-user" });
    state.depositDocument.depositsById.fixture = { principalVnd: 1_000_000 };
    dependencies.hosts.form.innerHTML = "open draft";
    dependencies.hosts.reminder.innerHTML = "open reminder";

    controller.stop();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(removeRuntimeListener).toHaveBeenCalledTimes(7);
    expect(clearTimer).toHaveBeenCalledWith(41);
    expect(dependencies.hosts.form.innerHTML).toBe("");
    expect(dependencies.hosts.reminder.innerHTML).toBe("");
    expect(state.depositDocument.depositsById).toEqual({});
    expect(dependencies.hosts.root.textContent).toContain("Thêm khoản tiền gửi");
  });

  it("stops old resources before a repeated start", () => {
    const { controller, dependencies, unsubscribe } = createHarness();

    controller.start({ uid: "fixture-user-a" });
    controller.start({ uid: "fixture-user-b" });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(dependencies.createRepository).toHaveBeenCalledTimes(2);
    expect(dependencies.subscribe).toHaveBeenCalledTimes(2);
    expect(unsubscribe.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.createRepository.mock.invocationCallOrder[1],
    );
  });

  it("opens the add deposit form as a centered body-level FLIP modal", () => {
    const { controller, dependencies } = createHarness();
    controller.start({ uid: "fixture-user" });
    dependencies.subscribe.mock.calls[0][0].onChange();

    const trigger = dependencies.hosts.root.querySelector("[data-add-deposit]");
    trigger.getBoundingClientRect = () => ({ left: 120, top: 40, width: 120, height: 44 });
    trigger.focus();
    trigger.click();

    const backdrop = dependencies.hosts.form.querySelector("[data-deposit-form-backdrop]");
    const dialog = dependencies.hosts.form.querySelector(".deposit-form-sheet");
    expect(dependencies.hosts.form.parentElement).toBe(document.body);
    expect(backdrop.classList.contains("app-global-modal")).toBe(true);
    expect(dialog.classList.contains("app-global-modal-dialog")).toBe(true);
    expect(dialog.classList.contains("app-global-modal-dialog--flip-start")).toBe(true);
    expect(document.body.classList.contains("app-modal-open")).toBe(true);

    backdrop.querySelector("[data-close-deposit-form]").click();
    expect(backdrop.getAttribute("aria-hidden")).toBe("true");
    expect(backdrop.classList.contains("closing")).toBe(true);
    expect(document.body.classList.contains("app-modal-open")).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("uses precise Vietnamese banking wording when retrying interest recording", async () => {
    const { controller, dependencies, state } = createHarness();
    controller.start({ uid: "fixture-user" });
    state.depositDocument.depositsById.done = {
      institutionName: "Fixture Bank", productName: "1Y", principalVnd: 10_000_000,
      annualRatePpm: 55_000, openedOn: "2026-01-01", maturesOn: "2026-07-01",
      expectedInterestVnd: 500_000, actualInterestVnd: 500_000, reminderDays: [30, 7, 1],
      remindersEnabled: true, status: "REDEEMED", redeemedOn: "2026-07-02", rolledOverToDepositId: null,
      note: "", version: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "fixture",
      updatedBy: "fixture", archivedAt: null,
    };
    dependencies.subscribe.mock.calls[0][0].onChange();

    dependencies.hosts.root.querySelector('[data-record-interest="done"]').click();

    await vi.waitFor(() => expect(dependencies.confirm).toHaveBeenCalledWith(
      "Chỉ ghi tiền lãi thực nhận vào thu nhập? Tiền gốc không được ghi nhận là thu nhập.",
    ));
  });
});
