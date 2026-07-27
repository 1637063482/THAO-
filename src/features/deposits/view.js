import { createDeposit, deriveDepositStatus, expectedInterestVnd, summarizeDeposits } from "../../domain/deposit.ts";
import { depositProductLabel } from "./terms.js";
import { depositErrorMessage } from "../../js/deposit-errors.js";
import { renderDepositCard } from "./deposit-card.js";
import { renderDepositTable } from "./deposit-table.js";
import { ACKNOWLEDGEMENT_WARNING_THRESHOLD, MAX_ACKNOWLEDGEMENTS } from "../../js/deposit-schema.js";

const copy = {
  vi: {
    title: "Tiền gửi có kỳ hạn", add: "Thêm khoản tiền gửi", first: "Thêm khoản tiền gửi đầu tiên",
    empty: "Ghi lại khoản tiền gửi để biết tổng vốn, lợi nhuận dự kiến và ngày đáo hạn.",
    loading: "Đang tải tiền gửi…", syncing: "Đang lưu thay đổi…", offline: "Ngoại tuyến — đang hiển thị dữ liệu gần nhất",
    error: "Không thể tải tiền gửi. Vui lòng thử lại.", principal: "Tổng tiền gửi",
    interest: "Tổng lợi nhuận dự kiến", maturityTotal: "Tổng khi đáo hạn", nearest: "Đáo hạn gần nhất",
    institution: "Ngân hàng", product: "Sản phẩm", amount: "Số tiền", rate: "Lãi suất",
    opened: "Ngày gửi", matures: "Ngày đáo hạn", status: "Trạng thái", actions: "Thao tác",
    edit: "Sửa", archive: "Lưu trữ", archiveConfirm: "Lưu trữ khoản tiền gửi này? Bạn vẫn có thể xem trong bộ lọc lưu trữ.", delete: "Xóa", deleteConfirm: "Xóa vĩnh viễn khoản tiền gửi này? Hành động này không thể hoàn tác.",
    redeem: "Tất toán", rollover: "Tái tục", recordInterest: "Ghi lại tiền lãi",
    all: "Tất cả", active: "Đang hoạt động", maturing: "Sắp đáo hạn", matured: "Đã đáo hạn", archived: "Đã lưu trữ",
    ACTIVE: "Đang hoạt động", MATURING: "Sắp đáo hạn", MATURED: "Đã đáo hạn", REDEEMED: "Đã tất toán", ROLLED_OVER: "Đã tái tục",
    noNearest: "Chưa có", vnd: "₫", syncError: "Thao tác thất bại; dữ liệu chưa được đánh dấu là đã đồng bộ.",
    acknowledgementCapacityWarning: "Đã dùng {count}/{limit} bản ghi xác nhận. Hãy kiểm tra lời nhắc và liên hệ hỗ trợ nếu cần.",
  },
  "zh-CN": {
    title: "定期存款", add: "新增存款", first: "添加第一笔存款",
    empty: "记录存款后可查看总本金、预计收益和到期日期。", loading: "正在加载存款…", syncing: "正在保存更改…",
    offline: "当前离线，显示最近一次数据", error: "无法加载存款，请重试。", principal: "存款总额",
    interest: "预计总收益", maturityTotal: "预计到期总额", nearest: "最近到期",
    institution: "银行", product: "产品", amount: "金额", rate: "利率", opened: "存入日期",
    matures: "到期日期", status: "状态", actions: "操作", edit: "编辑", archive: "归档",
    archiveConfirm: "确认归档这笔存款吗？之后仍可在归档筛选中查看。", delete: "删除", deleteConfirm: "确认永久删除这笔存款吗？此操作不可撤销。", all: "全部", active: "有效",
    redeem: "赎回", rollover: "续存", recordInterest: "补记实收利息",
    maturing: "即将到期", matured: "已到期", archived: "已归档", ACTIVE: "有效",
    MATURING: "即将到期", MATURED: "已到期", REDEEMED: "已赎回", ROLLED_OVER: "已续存",
    noNearest: "暂无", vnd: "₫", syncError: "操作失败，数据未标记为已同步。",
    acknowledgementCapacityWarning: "已使用 {count}/{limit} 条确认记录。请检查提醒设置，必要时联系支持。",
  },
};

/** @param {string | undefined} locale @returns {import("../../types/app-state").AppLocale} */
function normalizeLocale(locale) { return locale === "zh-CN" ? "zh-CN" : "vi"; }
/** @param {import("../../types/app-state").AppLocale} locale @returns {import("../../types/app-state").DepositLabels} */
function words(locale) { return copy[locale] || copy.vi; }
/** @param {unknown} value */
function escapeHtml(value) {
  /** @type {Record<string, string>} */
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => entities[char] || char);
}
/** @param {number | null | undefined} value @param {import("../../types/app-state").AppLocale} locale */
function money(value, locale) { return `${Number(value || 0).toLocaleString(locale === "zh-CN" ? "zh-CN" : "vi-VN")} ₫`; }
/**
 * @param {string} id
 * @param {Omit<import("../../types/app-state").StoredDeposit, "id">} record
 */
function toDomain(id, record) {
  return createDeposit({
    id, principalVnd: record.principalVnd, annualRatePpm: record.annualRatePpm,
    startDate: record.openedOn, maturityDate: record.maturesOn, status: record.status,
    expectedInterestVndOverride: record.expectedInterestVnd, actualInterestVnd: record.actualInterestVnd,
  });
}

/** @param {import("../../types/app-state").DepositViewModelInput} input @returns {import("../../types/app-state").DepositViewModel} */
export function buildDepositViewModel({ document, today, locale = "vi", status = "synced", errorMessage = "", filter = "all", ledgerEntries = {} }) {
  const ledgerRemarks = Object.entries(ledgerEntries).filter(([key]) => key.endsWith("_remark")).map(([, value]) => String(value || "")).join("\n");
  const records = Object.entries(document?.depositsById || {}).map(([id, record]) => {
    const domain = toDomain(id, record);
    const interestRecorded = ledgerRemarks.includes(`[#op:deposit-interest-${id}-${record.maturesOn}]`);
    return { id, ...record, domain, derivedStatus: deriveDepositStatus(domain, today), calculatedInterestVnd: expectedInterestVnd(domain), interestRecorded };
  });
  const current = records.filter(item => item.archivedAt === null);
  const archived = records.filter(item => item.archivedAt !== null);
  const visible = (filter === "archived" ? archived : current.filter(item => {
    if (filter === "all") return true;
    if (filter === "active") return item.derivedStatus === "ACTIVE";
    if (filter === "maturing") return item.derivedStatus === "MATURING";
    if (filter === "matured") return item.derivedStatus === "MATURED";
    return true;
  })).sort((a, b) => a.maturesOn.localeCompare(b.maturesOn) || a.id.localeCompare(b.id));
  const summary = summarizeDeposits(current.map(item => item.domain), today);
  const totalPrincipal = BigInt(summary.currentPrincipalVnd) + BigInt(summary.pendingMaturedPrincipalVnd);
  const totalPrincipalVnd = Number(totalPrincipal);
  if (!Number.isSafeInteger(totalPrincipalVnd)) throw new Error("Deposit principal summary exceeds the safe integer range");
  const nearest = current.filter(item => item.status === "ACTIVE" && item.maturesOn >= today).sort((a, b) => a.maturesOn.localeCompare(b.maturesOn))[0] || null;
  const acknowledgementCount = Object.keys(document?.acknowledgementsByKey || {}).length;
  return { locale, status, errorMessage, filter, visible, summary, totalPrincipalVnd, nearest, acknowledgementCount };
}

/** @param {import("../../types/app-state").DepositViewModel} vm @param {string} label */
function stateMessage(vm, label) {
  return `<div class="deposit-state deposit-state-${vm.status}" role="status">${escapeHtml(label)}</div>`;
}
/** @param {import("../../types/app-state").DepositViewModel} vm */
export function renderDepositManagement(vm) {
  const labels = words(vm.locale);
  const banner = vm.status === "loading" ? stateMessage(vm, labels.loading) : vm.status === "syncing" ? stateMessage(vm, labels.syncing) : vm.status === "offline" ? stateMessage(vm, labels.offline) : vm.status === "error" ? stateMessage(vm, vm.errorMessage || labels.error) : "";
  const capacityWarning = vm.acknowledgementCount >= ACKNOWLEDGEMENT_WARNING_THRESHOLD
    ? `<p class="deposit-capacity-warning" role="status">${escapeHtml(labels.acknowledgementCapacityWarning.replace("{count}", String(vm.acknowledgementCount)).replace("{limit}", String(MAX_ACKNOWLEDGEMENTS)))}</p>` : "";
  const metrics = `<div class="deposit-metrics"><div><span>${labels.principal}</span><strong class="blur-sensitive">${money(vm.totalPrincipalVnd, vm.locale)}</strong></div><div><span>${labels.interest}</span><strong class="blur-sensitive">${money(vm.summary.expectedInterestVnd, vm.locale)}</strong></div><div><span>${labels.maturityTotal}</span><strong class="blur-sensitive">${money(vm.summary.expectedMaturityTotalVnd, vm.locale)}</strong></div><div><span>${labels.nearest}</span><strong>${vm.nearest ? escapeHtml(vm.nearest.maturesOn) : labels.noNearest}</strong></div></div>`;
  const filter = `<label class="deposit-filter"><span class="sr-only">${labels.status}</span><select data-deposit-filter><option value="all"${vm.filter === "all" ? " selected" : ""}>${labels.all}</option><option value="active"${vm.filter === "active" ? " selected" : ""}>${labels.active}</option><option value="maturing"${vm.filter === "maturing" ? " selected" : ""}>${labels.maturing}</option><option value="matured"${vm.filter === "matured" ? " selected" : ""}>${labels.matured}</option><option value="archived"${vm.filter === "archived" ? " selected" : ""}>${labels.archived}</option></select></label>`;
  let content;
  if (vm.status === "loading" && vm.visible.length === 0) content = "";
  else if (vm.visible.length === 0) content = `<div class="deposit-empty"><p>${labels.empty}</p><button type="button" class="btn-primary" data-add-deposit>${labels.first}</button></div>`;
  else { const options = { locale: vm.locale, labels, money, productLabel: depositProductLabel, escape: escapeHtml }; content = `<div class="deposit-card-list">${vm.visible.map(item => renderDepositCard(item, options)).join("")}</div>${renderDepositTable(vm.visible, options)}`; }
  return `<section class="deposit-management card" data-deposit-management data-locale="${vm.locale}"><header><div><p class="deposit-eyebrow">${labels.nearest}</p><h2>${labels.title}</h2></div><button type="button" class="btn-primary" data-add-deposit>${labels.add}</button></header>${banner}${capacityWarning}${metrics}<div class="deposit-toolbar">${filter}</div>${content}<p class="deposit-operation-error" data-deposit-operation-error hidden>${labels.syncError}</p></section>`;
}

/**
 * @param {HTMLElement} root
 * @param {import("../../types/app-state").DepositManagementBindings} [bindings]
 */
export function bindDepositManagement(root, { onAdd, onEdit, onArchive, onFilter, onRedeem, onRollover, onRecordInterest, onDelete, confirm = globalThis.confirm } = {}) {
  const section = /** @type {HTMLElement | null} */ (
    root.querySelector("[data-deposit-management]")
    || (root.matches("[data-deposit-management]") ? root : null)
  );
  if (!section) return;
  /** @param {string} selector */
  const buttons = (selector) => /** @type {NodeListOf<HTMLElement>} */ (section.querySelectorAll(selector));
  buttons("[data-add-deposit]").forEach(button => button.addEventListener("click", () => onAdd?.()));
  buttons("[data-edit-deposit]").forEach(button => button.addEventListener("click", () => { if (button.dataset.editDeposit) onEdit?.(button.dataset.editDeposit); }));
  buttons("[data-redeem-deposit]").forEach(button => button.addEventListener("click", () => { if (button.dataset.redeemDeposit) onRedeem?.(button.dataset.redeemDeposit); }));
  buttons("[data-rollover-deposit]").forEach(button => button.addEventListener("click", () => { if (button.dataset.rolloverDeposit) onRollover?.(button.dataset.rolloverDeposit); }));
  buttons("[data-record-interest]").forEach(button => button.addEventListener("click", async () => {
    try { if (button.dataset.recordInterest) await onRecordInterest?.(button.dataset.recordInterest); }
    catch (cause) { const error = /** @type {HTMLElement | null} */ (section.querySelector("[data-deposit-operation-error]")); if (error) { error.textContent = depositErrorMessage(cause, normalizeLocale(section.dataset.locale), "list"); error.hidden = false; } }
  }));
  buttons("[data-archive-deposit]").forEach(button => button.addEventListener("click", async () => {
    const labels = words(normalizeLocale(section.dataset.locale));
    if (confirm && !confirm(labels.archiveConfirm)) return;
    try { if (button.dataset.archiveDeposit) await onArchive?.(button.dataset.archiveDeposit); }
    catch (cause) { const error = /** @type {HTMLElement | null} */ (section.querySelector("[data-deposit-operation-error]")); if (error) { error.textContent = depositErrorMessage(cause, normalizeLocale(section.dataset.locale), "list"); error.hidden = false; } }
  }));
  buttons("[data-delete-deposit]").forEach(button => button.addEventListener("click", async () => {
    const labels = words(normalizeLocale(section.dataset.locale));
    if (confirm && !confirm(labels.deleteConfirm)) return;
    try { if (button.dataset.deleteDeposit) await onDelete?.(button.dataset.deleteDeposit); }
    catch (cause) { const error = /** @type {HTMLElement | null} */ (section.querySelector("[data-deposit-operation-error]")); if (error) { error.textContent = depositErrorMessage(cause, normalizeLocale(section.dataset.locale), "list"); error.hidden = false; } }
  }));
  section.querySelector("[data-deposit-filter]")?.addEventListener("change", event => {
    if (event.target instanceof HTMLSelectElement) {
      onFilter?.(/** @type {import("../../types/app-state").DepositFilter} */ (event.target.value));
    }
  });
}
