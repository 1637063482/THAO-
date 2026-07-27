import { describe, expect, it, vi } from "vitest";
import { bindDepositForm, bindDepositSettlementForm, parseAnnualRateToPpm, parseDepositForm, parseDepositSettlementForm, renderDepositForm, renderDepositSettlementForm } from "../../src/features/deposits/form.js";

describe("deposit form", () => {
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
    const confirmBefore = globalThis.confirm; globalThis.confirm = vi.fn(() => true); const onSubmit = vi.fn();
    bindDepositSettlementForm(host, { locale: "zh-CN", onSubmit });
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(globalThis.confirm).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ mode: "rollover", rollover: { principalVnd: 10_000_000, annualRatePpm: 52_500 } });
    globalThis.confirm = confirmBefore;
  });
});
