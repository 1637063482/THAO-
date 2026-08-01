import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindAppDropdown, getAppDropdownValue, renderAppDropdown,
  setAppDropdownOptions, setAppDropdownValue,
} from "../../src/components/feedback/app-dropdown.js";

function mount(html) {
  document.body.innerHTML = html;
  return document.body.firstElementChild;
}

describe("Apple custom dropdown", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a combobox trigger, listbox menu, and a named hidden input", () => {
    const html = renderAppDropdown({
      id: "term", name: "productName", value: "1Y", placeholder: "Choose",
      ariaLabel: "Term",
      options: [
        { value: "", label: "-- Choose --" },
        { value: "1Y", label: "12 months" },
        { value: "2Y", label: "24 months" },
      ],
    });
    const host = mount(html);
    const trigger = host.querySelector("[data-app-dropdown-trigger]");
    const menu = document.querySelector("[data-app-dropdown-menu]");
    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe(menu.id);
    expect(menu.getAttribute("role")).toBe("listbox");
    expect(host.querySelector("[data-app-dropdown-hidden]").getAttribute("name")).toBe("productName");
    expect(host.querySelector("[data-app-dropdown-hidden]").value).toBe("1Y");
    expect(host.querySelector("[data-app-dropdown-value]").textContent).toBe("12 months");
    expect(document.querySelector('[data-app-dropdown-option="1Y"]').getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(true);
  });

  it("shows the placeholder label when no value matches an option", () => {
    const host = mount(renderAppDropdown({ placeholder: "Chọn kỳ hạn", options: [{ value: "1M", label: "1 tháng" }] }));
    expect(host.querySelector("[data-app-dropdown-value]").textContent).toBe("Chọn kỳ hạn");
    expect(host.querySelector("[data-app-dropdown-value]").classList.contains("is-placeholder")).toBe(true);
  });

  it("reads and writes the value through the hidden input", () => {
    const host = mount(renderAppDropdown({ name: "term", value: "1Y", placeholder: "Choose" }));
    expect(getAppDropdownValue(host)).toBe("1Y");
    setAppDropdownValue(host, "3M");
    expect(getAppDropdownValue(host)).toBe("3M");
    expect(host.querySelector("[data-app-dropdown-value]").textContent).toBe("3M");
  });

  it("replaces options while preserving a matching value", () => {
    const host = mount(renderAppDropdown({ name: "year", value: "2026" }));
    setAppDropdownOptions(host, [
      { value: "2025", label: "2025" },
      { value: "2026", label: "2026" },
      { value: "2027", label: "2027" },
    ]);
    expect(getAppDropdownValue(host)).toBe("2026");
    expect(document.querySelector('[data-app-dropdown-option="2026"]').getAttribute("aria-selected")).toBe("true");
  });

  it("picks the marked-selected option when the stored value is absent", () => {
    const host = mount(renderAppDropdown({ name: "day" }));
    setAppDropdownOptions(host, [
      { value: "1", label: "Tháng 7 1", selected: true },
      { value: "2", label: "Tháng 7 2" },
    ]);
    expect(getAppDropdownValue(host)).toBe("1");
    expect(host.querySelector("[data-app-dropdown-value]").textContent).toBe("Tháng 7 1");
  });

  it("auto-selects the first option only when requested", () => {
    const auto = mount(renderAppDropdown({ name: "cat" }));
    setAppDropdownOptions(auto, [{ value: "dining", label: "Dining" }, { value: "income", label: "Income" }], { autoSelectFirst: true });
    expect(getAppDropdownValue(auto)).toBe("dining");

    const plain = mount(renderAppDropdown({ name: "term", placeholder: "Choose" }));
    setAppDropdownOptions(plain, [{ value: "1M", label: "1 month" }, { value: "3M", label: "3 months" }]);
    expect(getAppDropdownValue(plain)).toBe("");
    expect(plain.querySelector("[data-app-dropdown-value]").textContent).toBe("Choose");
  });

  it("opens on click, selects an option, fires change with the value, and closes", () => {
    const onChange = vi.fn();
    const host = mount(renderAppDropdown({ name: "term", placeholder: "Choose", options: [{ value: "1M", label: "1 tháng" }, { value: "3M", label: "3 tháng" }] }));
    bindAppDropdown(host, { onChange });
    const trigger = host.querySelector("[data-app-dropdown-trigger]");
    const menu = document.querySelector("[data-app-dropdown-menu]");

    trigger.click();
    expect(menu.hidden).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const option = document.querySelector('[data-app-dropdown-option="3M"]');
    option.click();
    expect(getAppDropdownValue(host)).toBe("3M");
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).toHaveBeenCalledWith("3M");
    expect(host.querySelector("[data-app-dropdown-value]").textContent).toBe("3 tháng");
    expect(trigger).toBe(document.activeElement);
  });

  it("closes when the user clicks outside the dropdown", () => {
    const host = mount(renderAppDropdown({ name: "term", options: [{ value: "1M", label: "1 tháng" }] }));
    bindAppDropdown(host);
    host.querySelector("[data-app-dropdown-trigger]").click();
    expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(false);
    document.body.click();
    expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(true);
  });

  it("supports arrow navigation and Enter selection from the keyboard", () => {
    const onChange = vi.fn();
    const host = mount(renderAppDropdown({ name: "term", options: [{ value: "1M", label: "1 tháng" }, { value: "3M", label: "3 tháng" }] }));
    bindAppDropdown(host, { onChange });
    const trigger = host.querySelector("[data-app-dropdown-trigger]");

    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const options = [...document.querySelectorAll("[data-app-dropdown-option]")];
    expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(false);
    expect(document.activeElement).toBe(options[0]);

    options[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(options[1]);

    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(getAppDropdownValue(host)).toBe("3M");
    expect(onChange).toHaveBeenCalledWith("3M");
    expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(true);
  });

  it("closes with Escape, restores focus to the trigger, and stops propagation", () => {
    const onOuterEscape = vi.fn();
    document.addEventListener("keydown", onOuterEscape);
    try {
      const host = mount(renderAppDropdown({ name: "term", options: [{ value: "1M", label: "1 tháng" }] }));
      bindAppDropdown(host);
      const trigger = host.querySelector("[data-app-dropdown-trigger]");
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(false);
      const callsBeforeEscape = onOuterEscape.mock.calls.length;
      document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(true);
      expect(document.activeElement).toBe(trigger);
      expect(onOuterEscape).toHaveBeenCalledTimes(callsBeforeEscape);
    } finally {
      document.removeEventListener("keydown", onOuterEscape);
    }
  });

  it("closes on Tab and keeps focus on the trigger instead of escaping to BODY", () => {
    const host = mount(renderAppDropdown({ name: "term", options: [{ value: "1M", label: "1 tháng" }] }));
    bindAppDropdown(host);
    const trigger = host.querySelector("[data-app-dropdown-trigger]");
    trigger.click();
    const option = document.querySelector("[data-app-dropdown-option]");
    option.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

    expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it("never opens when disabled and guards against double binding", () => {
    const host = mount(renderAppDropdown({ name: "term", disabled: true, options: [{ value: "1M", label: "1 tháng" }] }));
    const first = bindAppDropdown(host);
    const second = bindAppDropdown(host);
    host.querySelector("[data-app-dropdown-trigger]").click();
    expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(true);
    second();
    first();
  });

  it("re-binds a host after unbinding", () => {
    const host = mount(renderAppDropdown({ name: "term", options: [{ value: "1M", label: "1 tháng" }] }));
    const unbind = bindAppDropdown(host);
    unbind();
    bindAppDropdown(host);
    host.querySelector("[data-app-dropdown-trigger]").click();
    expect(document.querySelector("[data-app-dropdown-menu]").hidden).toBe(false);
  });

  it("moves the selected mark to the chosen option and keeps it on re-open", () => {
    const host = mount(renderAppDropdown({ name: "term", value: "1M", options: [{ value: "1M", label: "1 tháng", selected: true }, { value: "3M", label: "3 tháng" }] }));
    bindAppDropdown(host);
    host.querySelector("[data-app-dropdown-trigger]").click();
    document.querySelector('[data-app-dropdown-option="3M"]').click();
    expect(document.querySelector('[data-app-dropdown-option="3M"]').getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-app-dropdown-option="1M"]').getAttribute("aria-selected")).toBe("false");

    // Re-open: the mark must follow the stored value, not the initial render.
    host.querySelector("[data-app-dropdown-trigger]").click();
    expect(document.querySelector('[data-app-dropdown-option="3M"]').getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-app-dropdown-option="1M"]').getAttribute("aria-selected")).toBe("false");
  });

  it("anchors the open menu as a fixed layer so scroll containers cannot clip it", () => {
    const host = mount(renderAppDropdown({ name: "term", options: [{ value: "1M", label: "1 tháng" }, { value: "3M", label: "3 tháng" }] }));
    bindAppDropdown(host);
    const trigger = host.querySelector("[data-app-dropdown-trigger]");
    const menu = document.querySelector("[data-app-dropdown-menu]");

    trigger.click();
    expect(menu.hidden).toBe(false);
    expect(menu.classList.contains("app-dropdown-menu-fixed")).toBe(true);
    expect(menu.style.top).toBeTruthy();
    expect(menu.style.left).toBeTruthy();

    menu.querySelector('[data-app-dropdown-option="3M"]').click();
    expect(menu.classList.contains("app-dropdown-menu-fixed")).toBe(false);
    expect(menu.hidden).toBe(true);
  });
});
