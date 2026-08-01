import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLedgerYearController } from "../../src/features/ledger/year-controller.js";
import { getAppDropdownValue, renderAppDropdown } from "../../src/components/feedback/app-dropdown.js";

function createHarness() {
  document.body.innerHTML = [
    renderAppDropdown({ id: "year-selector" }),
    '<span id="ui-year-start-label"></span>',
    '<span id="ui-year-end-label"></span>',
    '<div id="months-container">old ledger</div>',
    '<input id="bal-bank" value="1" data-raw="1">',
  ].join("");
  const state = {
    activeYear: 2026,
    activeMonthId: 7,
    isSaving: false,
    isFirstLoad: false,
  };
  const dependencies = {
    state,
    documentRoot: document,
    getToday: () => ({ year: 2027, month: 1, day: 1, dateKey: "2027-01-01" }),
    isOnline: () => true,
    translate: (key, values = {}) => `${key}:${values.year ?? ""}`,
    showBlocked: vi.fn(),
    resetYearState: vi.fn(),
    resubscribe: vi.fn(),
    switchMonth: vi.fn(),
  };
  return {
    controller: createLedgerYearController(dependencies),
    dependencies,
    state,
  };
}

describe("ledger year controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("blocks year switching while an online save is active", () => {
    const { controller, dependencies, state } = createHarness();
    controller.start();
    state.isSaving = true;

    expect(controller.changeYear(2027)).toBe(false);

    expect(state.activeYear).toBe(2026);
    expect(getAppDropdownValue(document.getElementById("year-selector"))).toBe("2026");
    expect(dependencies.resetYearState).not.toHaveBeenCalled();
    expect(dependencies.resubscribe).not.toHaveBeenCalled();
  });

  it("clears the prior year before resubscribing and opens the correct month", () => {
    const { controller, dependencies, state } = createHarness();
    controller.start();

    expect(controller.changeYear(2027)).toBe(true);

    expect(state.activeYear).toBe(2027);
    expect(state.isFirstLoad).toBe(true);
    expect(dependencies.resetYearState).toHaveBeenCalledOnce();
    expect(dependencies.resubscribe).toHaveBeenCalledOnce();
    expect(dependencies.resetYearState.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.resubscribe.mock.invocationCallOrder[0],
    );
    expect(dependencies.switchMonth).toHaveBeenCalledWith(1);
    expect(document.getElementById("months-container").innerHTML).toBe("");
    expect(document.getElementById("bal-bank").value).toBe("");
  });
});
