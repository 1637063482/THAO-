import { describe, expect, it, vi } from "vitest";
import { bindDepositManagement, buildDepositViewModel, renderDepositManagement } from "../../src/features/deposits/view.js";

function deposit(overrides = {}) {
  return {
    institutionName: "Fixture Bank", productName: "Synthetic deposit", principalVnd: 10_000_000,
    annualRatePpm: 55_000, openedOn: "2026-01-01", maturesOn: "2027-01-01",
    expectedInterestVnd: null, actualInterestVnd: null, reminderDays: [30, 7, 1],
    remindersEnabled: true, status: "ACTIVE", redeemedOn: null, rolledOverToDepositId: null,
    note: "", version: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "fixture",
    updatedBy: "fixture", archivedAt: null, ...overrides,
  };
}
function storageDocument(depositsById = {}) { return { schemaVersion: 1, depositsById, acknowledgementsByKey: {}, lastMutation: null }; }

describe("deposit management view", () => {
  it.each([
    ["loading", "Đang tải"], ["syncing", "Đang lưu"], ["offline", "Ngoại tuyến"], ["error", "Không thể tải"],
  ])("renders the Vietnamese %s state", (status, message) => {
    const vm = buildDepositViewModel({ document: storageDocument(), today: "2026-06-01", locale: "vi", status });
    expect(renderDepositManagement(vm)).toContain(message);
  });

  it("renders a guided empty state in Vietnamese and Chinese", () => {
    expect(renderDepositManagement(buildDepositViewModel({ document: storageDocument(), today: "2026-06-01", locale: "vi" }))).toContain("Thêm khoản tiền gửi đầu tiên");
    expect(renderDepositManagement(buildDepositViewModel({ document: storageDocument(), today: "2026-06-01", locale: "zh-CN" }))).toContain("添加第一笔存款");
  });

  it("sorts by maturity, derives states, excludes archived totals and renders card/table parity", () => {
    const vm = buildDepositViewModel({
      document: storageDocument({
        later: deposit({ maturesOn: "2027-05-01", principalVnd: 20_000_000 }),
        soon: deposit({ maturesOn: "2026-06-15" }),
        overdue: deposit({ maturesOn: "2026-05-01", principalVnd: 3_000_000 }),
        archived: deposit({ maturesOn: "2026-01-01", principalVnd: 99_000_000, archivedAt: new Date() }),
      }),
      today: "2026-06-01", locale: "vi",
    });
    expect(vm.visible.map(item => item.id)).toEqual(["overdue", "soon", "later"]);
    expect(vm.visible.map(item => item.derivedStatus)).toEqual(["MATURED", "MATURING", "ACTIVE"]);
    expect(vm.summary.currentPrincipalVnd).toBe(30_000_000);
    expect(vm.totalPrincipalVnd).toBe(33_000_000);
    const html = renderDepositManagement(vm);
    expect(html).toContain("deposit-card");
    expect(html).toContain("deposit-table");
    expect(html.match(/data-edit-deposit="soon"/g)).toHaveLength(2);
    expect(html.match(/blur-sensitive/g).length).toBeGreaterThanOrEqual(15);
  });

  it("renders the supplied safe error message while the sync status is error", () => {
    const vm = buildDepositViewModel({ document: storageDocument(), today: "2026-06-01", locale: "zh-CN", status: "error", errorMessage: "存款已被其他更改更新，请刷新后重试。" });
    expect(renderDepositManagement(vm)).toContain("存款已被其他更改更新，请刷新后重试。");
  });

  it("localizes stable term codes and offers delete only for active records", () => {
    const active = renderDepositManagement(buildDepositViewModel({
      document: storageDocument({ active: deposit({ productName: "1Y" }) }),
      today: "2026-06-01",
      locale: "zh-CN",
    }));
    expect(active).toContain("12个月");
    expect(active).toContain('data-delete-deposit="active"');

    const terminal = renderDepositManagement(buildDepositViewModel({
      document: storageDocument({
        done: deposit({
          productName: "1Y",
          status: "REDEEMED",
          redeemedOn: "2027-01-02",
          actualInterestVnd: 550_000,
        }),
      }),
      today: "2027-01-03",
      locale: "zh-CN",
    }));
    expect(terminal).not.toContain('data-delete-deposit="done"');
  });

  it("shows archived records only under the archived filter", () => {
    const doc = storageDocument({ archived: deposit({ archivedAt: new Date() }), active: deposit() });
    expect(buildDepositViewModel({ document: doc, today: "2026-06-01", filter: "archived" }).visible.map(item => item.id)).toEqual(["archived"]);
  });

  it("binds add, edit, filter and confirmed archive actions", async () => {
    document.body.innerHTML = renderDepositManagement(buildDepositViewModel({ document: storageDocument({ active: deposit() }), today: "2026-06-01" }));
    const onAdd = vi.fn(); const onEdit = vi.fn(); const onArchive = vi.fn(); const onFilter = vi.fn();
    const confirm = vi.fn(() => true);
    bindDepositManagement(document.body, { onAdd, onEdit, onArchive, onFilter, confirm });
    document.querySelector("[data-add-deposit]").click();
    document.querySelector("[data-edit-deposit=active]").click();
    document.querySelector("[data-archive-deposit=active]").click();
    const select = document.querySelector("[data-deposit-filter]"); select.value = "matured"; select.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(onArchive).toHaveBeenCalledWith("active"));
    expect(onAdd).toHaveBeenCalledOnce(); expect(onEdit).toHaveBeenCalledWith("active"); expect(onFilter).toHaveBeenCalledWith("matured");
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("shows a classified error when a list operation fails", async () => {
    document.body.innerHTML = renderDepositManagement(buildDepositViewModel({ document: storageDocument({ active: deposit() }), today: "2026-06-01", locale: "zh-CN" }));
    const failure = Object.assign(new Error("conflict"), { code: "DEPOSIT_VERSION_CONFLICT" });
    const confirm = vi.fn(() => true);
    bindDepositManagement(document.body, { onArchive: vi.fn().mockRejectedValue(failure), confirm });
    document.querySelector("[data-archive-deposit=active]").click();
    await vi.waitFor(() => expect(document.querySelector("[data-deposit-operation-error]").textContent).toBe("存款已被其他更改更新，请刷新后重试。"));
    expect(document.querySelector("[data-deposit-operation-error]").hidden).toBe(false);
  });

  it.each([
    ["vi", "Đã dùng 450/500 bản ghi xác nhận"],
    ["zh-CN", "已使用 450/500 条确认记录"],
  ])("warns at 450 acknowledgement records in %s without rendering acknowledgement keys", (locale, warning) => {
    const acknowledgementsByKey = Object.fromEntries(Array.from({ length: 450 }, (_, index) => [`deposit-${index}|2027-01-01|OVERDUE`, { acknowledgedAt: new Date(), acknowledgedBy: "fixture" }]));
    const html = renderDepositManagement(buildDepositViewModel({ document: { ...storageDocument(), acknowledgementsByKey }, today: "2026-06-01", locale }));

    expect(html).toContain(warning);
    expect(html).not.toContain("deposit-0|2027-01-01|OVERDUE");
  });

  it("offers settlement only for matured active deposits and retry for terminal interest", () => {
    const matured = renderDepositManagement(buildDepositViewModel({ document: storageDocument({ old: deposit({ maturesOn: "2026-05-01" }) }), today: "2026-06-01" }));
    expect(matured).toContain('data-redeem-deposit="old"');
    expect(matured).toContain('data-rollover-deposit="old"');
    const terminal = renderDepositManagement(buildDepositViewModel({ document: storageDocument({ done: deposit({ status: "REDEEMED", redeemedOn: "2026-06-01", maturesOn: "2026-05-01", actualInterestVnd: 500 }) }), today: "2026-06-01" }));
    expect(terminal).toContain('data-record-interest="done"');
    expect(terminal).not.toContain('data-edit-deposit="done"');
    const recorded = renderDepositManagement(buildDepositViewModel({ document: storageDocument({ done: deposit({ status: "REDEEMED", redeemedOn: "2026-06-01", maturesOn: "2026-05-01", actualInterestVnd: 500 }) }), today: "2026-06-01", ledgerEntries: { "6_1_remark": "Interest [#op:deposit-interest-done-2026-05-01]" } }));
    expect(recorded).not.toContain('data-record-interest="done"');
  });

  it("binds redeem, rollover and interest-retry actions", () => {
    document.body.innerHTML = renderDepositManagement(buildDepositViewModel({ document: storageDocument({ old: deposit({ maturesOn: "2026-05-01" }) }), today: "2026-06-01" }));
    const onRedeem = vi.fn(); const onRollover = vi.fn();
    bindDepositManagement(document.body, { onRedeem, onRollover });
    document.querySelector("[data-redeem-deposit=old]").click();
    document.querySelector("[data-rollover-deposit=old]").click();
    expect(onRedeem).toHaveBeenCalledWith("old"); expect(onRollover).toHaveBeenCalledWith("old");
  });
});
