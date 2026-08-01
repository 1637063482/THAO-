import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { addMonths, bindDepositForm, bindDepositSettlementForm, parseAnnualRateToPpm, parseDepositForm, parseDepositSettlementForm, renderDepositForm, renderDepositSettlementForm } from "../../src/features/deposits/form.js";
import { depositTermOptions } from "../../src/features/deposits/terms.js";

describe("deposit form", () => {
  it.each([
    ["2026-01-29", 1, "2026-02-28"],
    ["2026-01-30", 1, "2026-02-28"],
    ["2026-01-31", 1, "2026-02-28"],
    ["2028-01-31", 1, "2028-02-29"],
    ["2026-11-30", 1, "2026-12-30"],
    ["2026-12-31", 1, "2027-01-31"],
  ])("clamps %s plus %s month(s) to the target month's last valid day", (opened, months, expected) => {
    expect(addMonths(opened, months)).toBe(expected);
  });

  it.each([["5.5", 55_000], ["0.01", 100], ["100", 1_000_000]])("converts %s percent to integer ppm", (input, expected) => {
    expect(parseAnnualRateToPpm(input)).toBe(expected);
  });

  it.each(["-1", "100.0001", "abc", "5.55555"])("rejects invalid rate %s", value => {
    expect(() => parseAnnualRateToPpm(value)).toThrow();
  });

  it("parses VND-only integer fields and enforces a later maturity date", () => {
    document.body.innerHTML = renderDepositForm({ locale: "vi", id: "fixture-id" });
    const form = document.querySelector("form");
    Object.assign(form.elements.institutionName, { value: "Fixture Bank" });
    Object.assign(form.elements.productName, { value: "1Y" });
    Object.assign(form.elements.principalVnd, { value: "10,000,000" });
    Object.assign(form.elements.annualRatePercent, { value: "5.5" });
    Object.assign(form.elements.openedOn, { value: "2026-01-01" });
    Object.assign(form.elements.maturesOn, { value: "2027-01-01" });
    expect(parseDepositForm(form)).toMatchObject({ id: "fixture-id", productName: "1Y", principalVnd: 10_000_000, annualRatePpm: 55_000, status: "ACTIVE" });
    form.elements.maturesOn.value = "2026-01-01";
    expect(() => parseDepositForm(form)).toThrow(/maturity/i);
    form.elements.openedOn.value = "2026-02-31";
    form.elements.maturesOn.value = "2027-01-01";
    expect(() => parseDepositForm(form)).toThrow(/maturity/i);
  });

  it("shows a classified save error and retains the draft", async () => {
    expect(renderDepositForm({ locale: "zh-CN", id: "fixture-id" })).toContain("新增存款");
    document.body.innerHTML = '<div id="form-host" data-locale="vi">' + renderDepositForm({ locale: "vi", id: "fixture-id" }) + "</div>";
    const host = document.getElementById("form-host");
    const form = host.querySelector("form");
    form.elements.institutionName.value = "Draft Bank";
    form.elements.productName.value = "1Y";
    form.elements.principalVnd.value = "1000000";
    form.elements.annualRatePercent.value = "5";
    form.elements.openedOn.value = "2026-01-01";
    form.elements.maturesOn.value = "2027-01-01";
    const failure = Object.assign(new Error("denied"), { code: "permission-denied" });
    const onSubmit = vi.fn().mockRejectedValue(failure);
    bindDepositForm(host, { onSubmit });
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(form.querySelector("[data-form-error]").textContent).toBe("Bạn không có quyền thực hiện thao tác này."));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(form.elements.institutionName.value).toBe("Draft Bank");
    expect(form.querySelector("button[type=submit]").disabled).toBe(false);
  });

  it("labels the field as term and offers common Vietnamese deposit terms in a custom dropdown", () => {
    document.body.innerHTML = renderDepositForm({ locale: "vi", id: "fixture-id" });
    const hidden = document.querySelector('[name="productName"]');
    expect(hidden.closest("label").firstChild.textContent).toBe("Kỳ hạn");
    expect(depositTermOptions("vi").map(option => option.code)).toEqual([
      "1M", "3M", "6M", "9M", "1Y", "13M", "15M", "18M", "2Y", "3Y",
    ]);
    expect([...document.querySelectorAll(".app-dropdown-option-label")].map(node => node.textContent)).toEqual([
      "1 tháng", "3 tháng", "6 tháng", "9 tháng",
      "12 tháng", "13 tháng", "15 tháng", "18 tháng", "24 tháng", "36 tháng",
    ]);
    expect(document.querySelector('[data-app-dropdown-option="1M"]')).not.toBeNull();
    expect(renderDepositForm({ locale: "zh-CN", id: "fixture-id" })).toContain('<label>期限<span class="app-dropdown"');
  });

  it("uses localized empty-date hints in the custom date picker", () => {
    document.body.innerHTML = renderDepositForm({ locale: "vi", id: "fixture-id" });
    expect([...document.querySelectorAll("[data-app-datepicker-trigger]")].map(node => node.getAttribute("data-app-datepicker-placeholder"))).toEqual([
      "ngày/tháng/năm", "ngày/tháng/năm",
    ]);
    expect(document.querySelector('[name="openedOn"]').value).toBe("");
    expect(document.querySelector('input[type="date"]')).toBeNull();

    document.body.innerHTML = renderDepositForm({ locale: "zh-CN", id: "fixture-id" });
    expect([...document.querySelectorAll("[data-app-datepicker-trigger]")].map(node => node.getAttribute("data-app-datepicker-placeholder"))).toEqual([
      "年/月/日", "年/月/日",
    ]);
  });

  it("links the term to the maturity date and keeps the picker label in sync", () => {
    document.body.innerHTML = '<div id="host">' + renderDepositForm({ locale: "vi", id: "fixture-id" }) + "</div>";
    const host = document.getElementById("host");
    bindDepositForm(host);

    // 选存入日期（datepicker 交互）
    const openedHost = host.querySelector('[data-app-datepicker-hidden][name="openedOn"]').closest("[data-app-datepicker]");
    openedHost.querySelector("[data-app-datepicker-trigger]").click();
    document.querySelector('[data-app-datepicker-day="2026-08-15"]').click();
    expect(document.querySelector('[data-app-datepicker-hidden][name="openedOn"]').value).toBe("2026-08-15");

    // 选期限 3M → 到期日期自动算为 2026-11-15 且显示标签同步
    document.querySelector('[data-app-dropdown-option="3M"]').click();
    const maturesHidden = document.querySelector('[data-app-datepicker-hidden][name="maturesOn"]');
    expect(maturesHidden.value).toBe("2026-11-15");
    const maturesHost = maturesHidden.closest("[data-app-datepicker]");
    expect(maturesHost.querySelector("[data-app-datepicker-value]").textContent).toBe("15/11/2026");
  });

  it("rejects a maturity date earlier than the opening date", () => {
    document.body.innerHTML = '<div id="host">' + renderDepositForm({ locale: "vi", id: "fixture-id" }) + "</div>";
    const host = document.getElementById("host");
    bindDepositForm(host);

    const openedHost = host.querySelector('[data-app-datepicker-hidden][name="openedOn"]').closest("[data-app-datepicker]");
    openedHost.querySelector("[data-app-datepicker-trigger]").click();
    document.querySelector('[data-app-datepicker-day="2026-08-15"]').click();

    // 到期日历打开时，早于存入日期的日期被禁用
    const maturesHost = host.querySelector('[data-app-datepicker-hidden][name="maturesOn"]').closest("[data-app-datepicker]");
    maturesHost.querySelector("[data-app-datepicker-trigger]").click();
    const calendar = document.querySelector("[data-app-datepicker-calendar]:not([hidden])");
    expect(calendar.querySelector('[data-app-datepicker-day="2026-08-14"]').disabled).toBe(true);
    expect(calendar.querySelector('[data-app-datepicker-day="2026-08-15"]').disabled).toBe(true);
    expect(calendar.querySelector('[data-app-datepicker-day="2026-08-16"]').disabled).toBe(false);
  });

  it("initially enforces opening date plus one day in edit mode", () => {
    const deposit = {
      institutionName: "Fixture Bank", productName: "1Y", principalVnd: 10_000_000,
      annualRatePpm: 55_000, openedOn: "2026-08-15", maturesOn: "2027-08-15",
      expectedInterestVnd: null, actualInterestVnd: null, remindersEnabled: true,
      status: "ACTIVE", redeemedOn: null, rolledOverToDepositId: null, note: "", version: 1,
    };
    document.body.innerHTML = '<div id="host">' + renderDepositForm({ locale: "vi", id: "fixture-id", deposit }) + "</div>";
    const host = document.getElementById("host");
    bindDepositForm(host);
    const matures = host.querySelector('[data-app-datepicker-hidden][name="maturesOn"]').closest("[data-app-datepicker]");
    expect(matures.querySelector("[data-app-datepicker-trigger]").getAttribute("data-app-datepicker-min")).toBe("2026-08-16");
  });

  it("keeps the rollover maturity no earlier than the opening date", () => {
    const settlement = renderDepositSettlementForm({ locale: "vi", deposit: { id: "x", institutionName: "B", productName: "P", principalVnd: 1, annualRatePpm: 100, openedOn: "2026-01-01", maturesOn: "2026-07-01", expectedInterestVnd: null, actualInterestVnd: null, remindersEnabled: true, status: "ACTIVE", redeemedOn: null, rolledOverToDepositId: null, note: "", version: 1 }, today: "2026-07-31", mode: "rollover" });
    expect(settlement).toContain('name="maturesOn"');
    expect(settlement).toContain('data-app-datepicker-min="2026-08-01"');
  });

  it("formats the deposit principal while keeping the parsed VND amount unchanged", () => {
    const deposit = {
      institutionName: "Vietcombank", productName: "1Y", principalVnd: 10_000_000,
      annualRatePpm: 55_000, openedOn: "2026-01-01", maturesOn: "2027-01-01",
      expectedInterestVnd: null, actualInterestVnd: null, remindersEnabled: true,
      status: "ACTIVE", redeemedOn: null, rolledOverToDepositId: null, note: "", version: 1,
    };
    document.body.innerHTML = '<div id="host">' + renderDepositForm({ locale: "vi", id: "fixture-id", deposit }) + "</div>";
    const host = document.getElementById("host");
    const principal = host.querySelector('[name="principalVnd"]');
    expect(principal.value).toBe("10,000,000");

    bindDepositForm(host);
    principal.value = "12345678";
    principal.dispatchEvent(new Event("input", { bubbles: true }));
    expect(principal.value).toBe("12,345,678");
    expect(parseDepositForm(host.querySelector("form")).principalVnd).toBe(12_345_678);
  });

  it("toggles the bank list on input click and keeps custom bank entry available", () => {
    document.body.innerHTML = '<div id="host">' + renderDepositForm({ locale: "vi", id: "fixture-id" }) + "</div>";
    const host = document.getElementById("host");
    bindDepositForm(host);

    const dialog = host.querySelector(".deposit-form-sheet");
    const bankInput = host.querySelector('[name="institutionName"]');
    const options = host.querySelector("[data-bank-picker-options]");
    expect(bankInput.hasAttribute("list")).toBe(false);
    expect(host.querySelector("datalist")).toBeNull();
    expect(host.querySelector("[data-bank-picker-toggle]")).toBeNull();
    expect(bankInput.getAttribute("placeholder")).toBe("-- Chọn ngân hàng --");
    expect(document.activeElement).toBe(dialog);
    expect(options.hidden).toBe(true);

    bankInput.click();
    expect(options.hidden).toBe(false);
    expect(bankInput.getAttribute("aria-expanded")).toBe("true");
    bankInput.click();
    expect(options.hidden).toBe(true);
    expect(bankInput.getAttribute("aria-expanded")).toBe("false");

    bankInput.click();
    host.querySelector('[data-bank-option="Vietcombank"]').click();
    expect(bankInput.value).toBe("Vietcombank");
    expect(options.hidden).toBe(true);
    expect(bankInput.getAttribute("aria-expanded")).toBe("false");

    bankInput.value = "Fixture Bank";
    expect(bankInput.value).toBe("Fixture Bank");
  });

  it("navigates the bank list with arrows, selects with Enter, and closes with Escape", () => {
    document.body.innerHTML = '<div id="host">' + renderDepositForm({ locale: "vi", id: "fixture-id" }) + "</div>";
    const host = document.getElementById("host");
    bindDepositForm(host);
    const bankInput = host.querySelector('[name="institutionName"]');
    const options = host.querySelector("[data-bank-picker-options]");

    bankInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(options.hidden).toBe(false);
    const first = options.querySelector('[data-bank-option="Vietcombank"]');
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const second = options.querySelector('[data-bank-option="VietinBank"]');
    expect(document.activeElement).toBe(second);

    second.click();
    expect(bankInput.value).toBe("VietinBank");
    expect(options.hidden).toBe(true);

    bankInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    options.querySelector('[data-bank-option="Vietcombank"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(options.hidden).toBe(true);
    expect(document.activeElement).toBe(bankInput);
  });

  it("traps keyboard focus and closes with Escape", () => {
    document.body.innerHTML = '<div id="host">' + renderDepositForm({ locale: "vi", id: "fixture-id" }) + "</div>";
    const host = document.getElementById("host"); const onClose = vi.fn(); bindDepositForm(host, { onClose });
    const focusable = host.querySelectorAll("button, input, textarea"); const last = focusable[focusable.length - 1];
    last.focus(); last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(focusable[0]);
    host.querySelector("input").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("normalizes legacy localized term labels and keeps custom products editable", () => {
    const base = {
      institutionName: "Fixture Bank", principalVnd: 10_000_000, annualRatePpm: 55_000,
      openedOn: "2026-01-01", maturesOn: "2027-01-01", expectedInterestVnd: null,
      actualInterestVnd: null, remindersEnabled: true, status: "ACTIVE", redeemedOn: null,
      rolledOverToDepositId: null, note: "", version: 1,
    };
    document.body.innerHTML = renderDepositForm({ locale: "zh-CN", id: "legacy", deposit: { ...base, productName: "Tiền gửi 1 năm" } });
    expect(document.querySelector('[name="productName"]').value).toBe("1Y");

    document.body.innerHTML = renderDepositForm({ locale: "zh-CN", id: "custom", deposit: { ...base, productName: "Custom Product" } });
    expect(document.querySelector('[name="productName"]').value).toBe("Custom Product");
  });
});

describe("deposit settlement form", () => {
  const deposit = { id: "fixture-id", institutionName: "Fixture Bank", productName: "12 months", principalVnd: 10_000_000, maturesOn: "2026-07-01" };

  it("parses redemption and requires positive interest when ledger writing is selected", () => {
    document.body.innerHTML = renderDepositSettlementForm({ locale: "vi", deposit, mode: "redeem", today: "2026-07-02" });
    const form = document.querySelector("form");
    expect(parseDepositSettlementForm(form)).toMatchObject({ mode: "redeem", settledOn: "2026-07-02", actualInterestVnd: null, writeInterestToLedger: false });
    form.elements.writeInterestToLedger.checked = true;
    expect(() => parseDepositSettlementForm(form)).toThrow(/positive actual/i);
    form.elements.actualInterestVnd.value = "550,000";
    expect(parseDepositSettlementForm(form).actualInterestVnd).toBe(550_000);
  });

  it("parses a VND-only rollover and asks for secondary interest confirmation", async () => {
    document.body.innerHTML = '<div id="host">' + renderDepositSettlementForm({ locale: "zh-CN", deposit, mode: "rollover", today: "2026-07-02" }) + "</div>";
    const host = document.getElementById("host"); const form = host.querySelector("form");
    form.elements.annualRatePercent.value = "5.25"; form.elements.maturesOn.value = "2027-07-02";
    form.elements.actualInterestVnd.value = "500000"; form.elements.writeInterestToLedger.checked = true;
    const confirm = vi.fn(() => true); const onSubmit = vi.fn();
    bindDepositSettlementForm(host, { locale: "zh-CN", onSubmit, confirm });
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(confirm).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ mode: "rollover", rollover: { principalVnd: 10_000_000, annualRatePpm: 52_500 } });
  });

  it("formats rollover VND fields and keeps bank/product controls interactive", () => {
    document.body.innerHTML = '<div id="host">' + renderDepositSettlementForm({ locale: "vi", deposit: { ...deposit, productName: "1Y" }, mode: "rollover", today: "2026-07-02" }) + "</div>";
    const host = document.getElementById("host");
    const form = host.querySelector("form");
    bindDepositSettlementForm(host, { locale: "vi" });
    const principal = form.elements.principalVnd;
    principal.value = "12345678";
    principal.dispatchEvent(new Event("input", { bubbles: true }));
    expect(principal.value).toBe("12,345,678");
    form.elements.annualRatePercent.value = "5";
    form.elements.maturesOn.value = "2026-08-02";
    expect(parseDepositSettlementForm(form).rollover.principalVnd).toBe(12_345_678);

    const product = host.querySelector('[name="productName"]');
    document.querySelector('[data-app-dropdown-option="3M"]').click();
    expect(product.value).toBe("3M");

    const bank = host.querySelector('[name="institutionName"]');
    bank.click();
    host.querySelector('[data-bank-option="Vietcombank"]').click();
    expect(bank.value).toBe("Vietcombank");
  });
});
