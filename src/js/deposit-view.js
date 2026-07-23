import { createDeposit, deriveDepositStatus, expectedInterestVnd, summarizeDeposits } from "../domain/deposit.ts";

const copy = {
  vi: {
    title: "Tiền gửi có kỳ hạn", add: "Thêm khoản tiền gửi", first: "Thêm khoản tiền gửi đầu tiên",
    empty: "Ghi lại khoản tiền gửi để biết tổng vốn, lợi nhuận dự kiến và ngày đáo hạn.",
    loading: "Đang tải tiền gửi…", syncing: "Đang lưu thay đổi…", offline: "Ngoại tuyến — đang hiển thị dữ liệu gần nhất",
    error: "Không thể tải tiền gửi. Vui lòng thử lại.", principal: "Tổng tiền gửi",
    interest: "Tổng lợi nhuận dự kiến", maturityTotal: "Tổng khi đáo hạn", nearest: "Đáo hạn gần nhất",
    institution: "Ngân hàng", product: "Sản phẩm", amount: "Số tiền", rate: "Lãi suất",
    opened: "Ngày gửi", matures: "Ngày đáo hạn", status: "Trạng thái", actions: "Thao tác",
    edit: "Sửa", archive: "Lưu trữ", archiveConfirm: "Lưu trữ khoản tiền gửi này? Bạn vẫn có thể xem trong bộ lọc lưu trữ.",
    all: "Tất cả", active: "Đang hoạt động", maturing: "Sắp đáo hạn", matured: "Đã đáo hạn", archived: "Đã lưu trữ",
    ACTIVE: "Đang hoạt động", MATURING: "Sắp đáo hạn", MATURED: "Đã đáo hạn", REDEEMED: "Đã tất toán", ROLLED_OVER: "Đã tái tục",
    noNearest: "Chưa có", vnd: "₫", syncError: "Thao tác thất bại; dữ liệu chưa được đánh dấu là đã đồng bộ.",
  },
  "zh-CN": {
    title: "定期存款", add: "新增存款", first: "添加第一笔存款",
    empty: "记录存款后可查看总本金、预计收益和到期日期。", loading: "正在加载存款…", syncing: "正在保存更改…",
    offline: "当前离线，显示最近一次数据", error: "无法加载存款，请重试。", principal: "存款总额",
    interest: "预计总收益", maturityTotal: "预计到期总额", nearest: "最近到期",
    institution: "银行", product: "产品", amount: "金额", rate: "利率", opened: "存入日期",
    matures: "到期日期", status: "状态", actions: "操作", edit: "编辑", archive: "归档",
    archiveConfirm: "确认归档这笔存款吗？之后仍可在归档筛选中查看。", all: "全部", active: "有效",
    maturing: "即将到期", matured: "已到期", archived: "已归档", ACTIVE: "有效",
    MATURING: "即将到期", MATURED: "已到期", REDEEMED: "已赎回", ROLLED_OVER: "已续存",
    noNearest: "暂无", vnd: "₫", syncError: "操作失败，数据未标记为已同步。",
  },
};

function words(locale) { return copy[locale] || copy.vi; }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function money(value, locale) { return `${Number(value || 0).toLocaleString(locale === "zh-CN" ? "zh-CN" : "vi-VN")} ₫`; }
function toDomain(id, record) {
  return createDeposit({
    id, principalVnd: record.principalVnd, annualRatePpm: record.annualRatePpm,
    startDate: record.openedOn, maturityDate: record.maturesOn, status: record.status,
    expectedInterestVndOverride: record.expectedInterestVnd, actualInterestVnd: record.actualInterestVnd,
  });
}

export function buildDepositViewModel({ document, today, locale = "vi", status = "synced", filter = "all" }) {
  const records = Object.entries(document?.depositsById || {}).map(([id, record]) => {
    const domain = toDomain(id, record);
    return { id, ...record, domain, derivedStatus: deriveDepositStatus(domain, today), calculatedInterestVnd: expectedInterestVnd(domain) };
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
  return { locale, status, filter, visible, summary, totalPrincipalVnd, nearest };
}

function stateMessage(vm, label) {
  return `<div class="deposit-state deposit-state-${vm.status}" role="status">${escapeHtml(label)}</div>`;
}
function statusBadge(item, labels) { return `<span class="deposit-status status-${item.derivedStatus.toLowerCase()}">${escapeHtml(labels[item.derivedStatus])}</span>`; }
function actions(item, labels) {
  if (item.archivedAt !== null) return "";
  return `<div class="deposit-actions"><button type="button" class="btn-ghost" data-edit-deposit="${escapeHtml(item.id)}">${labels.edit}</button><button type="button" class="btn-ghost danger" data-archive-deposit="${escapeHtml(item.id)}">${labels.archive}</button></div>`;
}
function card(item, labels, locale) {
  return `<article class="deposit-card" data-deposit-id="${escapeHtml(item.id)}"><div class="deposit-card-head"><div><strong>${escapeHtml(item.institutionName)}</strong><p>${escapeHtml(item.productName)}</p></div>${statusBadge(item, labels)}</div><p class="deposit-card-amount blur-sensitive">${money(item.principalVnd, locale)}</p><dl><div><dt>${labels.rate}</dt><dd>${(item.annualRatePpm / 10_000).toLocaleString()}%</dd></div><div><dt>${labels.matures}</dt><dd>${escapeHtml(item.maturesOn)}</dd></div><div><dt>${labels.interest}</dt><dd class="blur-sensitive">${money(item.expectedInterestVnd ?? item.calculatedInterestVnd, locale)}</dd></div></dl>${actions(item, labels)}</article>`;
}
function row(item, labels, locale) {
  return `<tr data-deposit-id="${escapeHtml(item.id)}"><td><strong>${escapeHtml(item.institutionName)}</strong><small>${escapeHtml(item.productName)}</small></td><td class="blur-sensitive">${money(item.principalVnd, locale)}</td><td>${(item.annualRatePpm / 10_000).toLocaleString()}%</td><td class="blur-sensitive">${money(item.expectedInterestVnd ?? item.calculatedInterestVnd, locale)}</td><td>${escapeHtml(item.openedOn)}</td><td>${escapeHtml(item.maturesOn)}</td><td>${statusBadge(item, labels)}</td><td>${actions(item, labels)}</td></tr>`;
}

export function renderDepositManagement(vm) {
  const labels = words(vm.locale);
  const banner = vm.status === "loading" ? stateMessage(vm, labels.loading) : vm.status === "syncing" ? stateMessage(vm, labels.syncing) : vm.status === "offline" ? stateMessage(vm, labels.offline) : vm.status === "error" ? stateMessage(vm, labels.error) : "";
  const metrics = `<div class="deposit-metrics"><div><span>${labels.principal}</span><strong class="blur-sensitive">${money(vm.totalPrincipalVnd, vm.locale)}</strong></div><div><span>${labels.interest}</span><strong class="blur-sensitive">${money(vm.summary.expectedInterestVnd, vm.locale)}</strong></div><div><span>${labels.maturityTotal}</span><strong class="blur-sensitive">${money(vm.summary.expectedMaturityTotalVnd, vm.locale)}</strong></div><div><span>${labels.nearest}</span><strong>${vm.nearest ? escapeHtml(vm.nearest.maturesOn) : labels.noNearest}</strong></div></div>`;
  const filter = `<label class="deposit-filter"><span class="sr-only">${labels.status}</span><select data-deposit-filter><option value="all"${vm.filter === "all" ? " selected" : ""}>${labels.all}</option><option value="active"${vm.filter === "active" ? " selected" : ""}>${labels.active}</option><option value="maturing"${vm.filter === "maturing" ? " selected" : ""}>${labels.maturing}</option><option value="matured"${vm.filter === "matured" ? " selected" : ""}>${labels.matured}</option><option value="archived"${vm.filter === "archived" ? " selected" : ""}>${labels.archived}</option></select></label>`;
  let content;
  if (vm.status === "loading" && vm.visible.length === 0) content = "";
  else if (vm.visible.length === 0) content = `<div class="deposit-empty"><p>${labels.empty}</p><button type="button" class="btn-primary" data-add-deposit>${labels.first}</button></div>`;
  else content = `<div class="deposit-card-list">${vm.visible.map(item => card(item, labels, vm.locale)).join("")}</div><div class="deposit-table-wrap"><table class="deposit-table"><thead><tr><th>${labels.institution}</th><th>${labels.amount}</th><th>${labels.rate}</th><th>${labels.interest}</th><th>${labels.opened}</th><th>${labels.matures}</th><th>${labels.status}</th><th>${labels.actions}</th></tr></thead><tbody>${vm.visible.map(item => row(item, labels, vm.locale)).join("")}</tbody></table></div>`;
  return `<section class="deposit-management card" data-deposit-management data-locale="${vm.locale}"><header><div><p class="deposit-eyebrow">${labels.nearest}</p><h2>${labels.title}</h2></div><button type="button" class="btn-primary" data-add-deposit>${labels.add}</button></header>${banner}${metrics}<div class="deposit-toolbar">${filter}</div>${content}<div data-deposit-form-host></div><p class="deposit-operation-error" data-deposit-operation-error hidden>${labels.syncError}</p></section>`;
}

export function bindDepositManagement(root, { onAdd, onEdit, onArchive, onFilter } = {}) {
  const section = root?.querySelector?.("[data-deposit-management]") || (root?.matches?.("[data-deposit-management]") ? root : null);
  if (!section) return;
  section.querySelectorAll("[data-add-deposit]").forEach(button => button.addEventListener("click", () => onAdd?.()));
  section.querySelectorAll("[data-edit-deposit]").forEach(button => button.addEventListener("click", () => onEdit?.(button.dataset.editDeposit)));
  section.querySelectorAll("[data-archive-deposit]").forEach(button => button.addEventListener("click", async () => {
    const labels = words(section.dataset.locale);
    if (globalThis.confirm && !globalThis.confirm(labels.archiveConfirm)) return;
    try { await onArchive?.(button.dataset.archiveDeposit); }
    catch (_) { const error = section.querySelector("[data-deposit-operation-error]"); if (error) error.hidden = false; }
  }));
  section.querySelector("[data-deposit-filter]")?.addEventListener("change", event => onFilter?.(event.target.value));
}
