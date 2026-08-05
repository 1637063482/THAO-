import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindAppDatePicker, getAppDatePickerValue, renderAppDatePicker } from "../../src/components/feedback/app-datepicker.js";

function mount(html) {
  document.body.innerHTML = html;
  return document.body.firstElementChild;
}

function openCalendar(host) {
  host.querySelector("[data-app-datepicker-trigger]").click();
  return document.querySelector("[data-app-datepicker-calendar]");
}

describe("Apple date picker", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a trigger, a named hidden input, and a hidden calendar", () => {
    const host = mount(renderAppDatePicker({ name: "openedOn", value: "2026-08-15", placeholder: "ngày/tháng/năm", locale: "vi" }));
    const trigger = host.querySelector("[data-app-datepicker-trigger]");
    const calendar = document.querySelector("[data-app-datepicker-calendar]");
    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(trigger.getAttribute("aria-controls")).toBe(calendar.id);
    expect(host.querySelector("[data-app-datepicker-hidden]").getAttribute("name")).toBe("openedOn");
    expect(host.querySelector("[data-app-datepicker-hidden]").value).toBe("2026-08-15");
    expect(host.querySelector("[data-app-datepicker-value]").textContent).toBe("15/08/2026");
    expect(calendar.hidden).toBe(true);
  });

  it("localizes the displayed value and placeholder", () => {
    const zh = mount(renderAppDatePicker({ name: "maturesOn", value: "2027-01-01", placeholder: "年/月/日", locale: "zh-CN" }));
    expect(zh.querySelector("[data-app-datepicker-value]").textContent).toBe("2027/01/01");
    const empty = mount(renderAppDatePicker({ name: "openedOn", placeholder: "年/月/日", locale: "zh-CN" }));
    expect(empty.querySelector("[data-app-datepicker-value]").textContent).toBe("年/月/日");
    expect(empty.querySelector("[data-app-datepicker-value]").classList.contains("is-placeholder")).toBe(true);
  });

  it("opens a fixed-layer calendar with the correct month title", () => {
    const host = mount(renderAppDatePicker({ name: "openedOn", value: "2026-08-15", placeholder: "ngày/tháng/năm", locale: "vi" }));
    bindAppDatePicker(host, { locale: "vi" });
    const calendar = openCalendar(host);
    expect(calendar.hidden).toBe(false);
    expect(calendar.classList.contains("app-dropdown-menu-fixed")).toBe(true);
    expect(calendar.classList.contains("app-dropdown-menu-portal")).toBe(true);
    expect(calendar.getAttribute("aria-label")).toBe("Tháng 8 2026");
    expect(calendar.querySelector(".app-datepicker-calendar-title").textContent).toBe("Tháng 8 2026");
    expect(calendar.querySelector('[data-app-datepicker-day="2026-08-15"]').getAttribute("aria-selected")).toBe("true");
    expect(calendar.querySelector('[data-app-datepicker-day="2026-08-15"]').classList.contains("is-selected")).toBe(true);
  });

  it("keeps the calendar inside its host when portal mode is disabled", () => {
    document.body.innerHTML = `<section class="app-global-modal-dialog">${renderAppDatePicker({ name: "openedOn", value: "2026-08-15", placeholder: "ngày/tháng/năm", locale: "vi" })}</section>`;
    const host = document.querySelector("[data-app-datepicker]");
    bindAppDatePicker(host, { locale: "vi", portal: false });
    const trigger = host.querySelector("[data-app-datepicker-trigger]");
    const calendar = host.querySelector("[data-app-datepicker-calendar]");

    trigger.click();

    expect(calendar.parentElement).toBe(host);
    expect(calendar.classList.contains("app-dropdown-menu-portal")).toBe(false);
    expect(calendar.classList.contains("app-dropdown-menu-fixed")).toBe(false);
  });

  it("selects a day: updates the value, label, fires change, and closes", () => {
    const onChange = vi.fn();
    const host = mount(renderAppDatePicker({ name: "openedOn", value: "2026-08-15", placeholder: "ngày/tháng/năm", locale: "vi" }));
    bindAppDatePicker(host, { locale: "vi", onChange });
    const calendar = openCalendar(host);
    calendar.querySelector('[data-app-datepicker-day="2026-08-20"]').click();
    expect(getAppDatePickerValue(host)).toBe("2026-08-20");
    expect(host.querySelector("[data-app-datepicker-value]").textContent).toBe("20/08/2026");
    expect(onChange).toHaveBeenCalledWith("2026-08-20");
    expect(calendar.hidden).toBe(true);
  });

  it("navigates months with the prev/next buttons without closing the calendar", () => {
    const host = mount(renderAppDatePicker({ name: "openedOn", value: "2026-08-15", placeholder: "ngày/tháng/năm", locale: "zh-CN" }));
    bindAppDatePicker(host, { locale: "zh-CN" });
    const calendar = openCalendar(host);
    expect(calendar.querySelector(".app-datepicker-calendar-title").textContent).toBe("2026年8月");
    calendar.querySelector("[data-app-datepicker-next]").click();
    expect(calendar.hidden).toBe(false);
    expect(calendar.querySelector(".app-datepicker-calendar-title").textContent).toBe("2026年9月");
    expect(calendar.getAttribute("aria-label")).toBe("2026年9月");
    expect(calendar.querySelector("[data-app-datepicker-prev]").getAttribute("aria-label")).toBe("上个月");
    expect(calendar.querySelector("[data-app-datepicker-next]").getAttribute("aria-label")).toBe("下个月");
    calendar.querySelector("[data-app-datepicker-prev]").click();
    calendar.querySelector("[data-app-datepicker-prev]").click();
    expect(calendar.hidden).toBe(false);
    expect(calendar.querySelector(".app-datepicker-calendar-title").textContent).toBe("2026年7月");
  });

  it("disables days before the min date", () => {
    const host = mount(renderAppDatePicker({ name: "settledOn", value: "2026-08-01", placeholder: "ngày/tháng/năm", locale: "vi", minDate: "2026-08-10" }));
    bindAppDatePicker(host, { locale: "vi" });
    const calendar = openCalendar(host);
    expect(calendar.querySelector('[data-app-datepicker-day="2026-08-09"]').disabled).toBe(true);
    expect(calendar.querySelector('[data-app-datepicker-day="2026-08-10"]').disabled).toBe(false);
  });

  it("closes with Escape and restores focus to the trigger", () => {
    const host = mount(renderAppDatePicker({ name: "openedOn", placeholder: "ngày/tháng/năm", locale: "vi" }));
    bindAppDatePicker(host, { locale: "vi" });
    const trigger = host.querySelector("[data-app-datepicker-trigger]");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const calendar = document.querySelector("[data-app-datepicker-calendar]");
    expect(calendar.hidden).toBe(false);
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(calendar.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it("does not focus outside-month cells and restores focus on Tab", () => {
    const host = mount(renderAppDatePicker({ name: "openedOn", value: "2026-08-15", placeholder: "ngày/tháng/năm", locale: "vi" }));
    bindAppDatePicker(host, { locale: "vi" });
    const trigger = host.querySelector("[data-app-datepicker-trigger]");
    const calendar = openCalendar(host);
    const outsideCell = [...calendar.querySelectorAll("[data-app-datepicker-day]")].find(cell => cell.classList.contains("is-outside"));
    expect(outsideCell.disabled).toBe(true);
    expect(outsideCell.getAttribute("aria-hidden")).toBe("true");
    expect([...calendar.querySelectorAll("[data-app-datepicker-day]:not(.is-outside)")].every(cell => cell.hasAttribute("aria-selected"))).toBe(true);
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(calendar.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it("moves between days with arrow keys", () => {
    const host = mount(renderAppDatePicker({ name: "openedOn", value: "2026-08-15", placeholder: "ngày/tháng/năm", locale: "vi" }));
    bindAppDatePicker(host, { locale: "vi" });
    openCalendar(host);
    const selected = document.querySelector('[data-app-datepicker-day="2026-08-15"]');
    expect(document.activeElement).toBe(selected);
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(document.querySelector('[data-app-datepicker-day="2026-08-16"]'));
  });
});
