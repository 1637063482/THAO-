import { buildDepositReminders } from "../application/deposits/build-reminders.ts";

const STORAGE_KEY = "myExpenseApp.depositReminderSnoozes.v1";
const copy = {
  vi: {
    title: "Nhắc nhở đáo hạn tiền gửi", intro: "Kiểm tra các khoản tiền gửi cần xử lý.",
    offline: "Dữ liệu ngoại tuyến, có thể chưa phải mới nhất.", close: "Đóng", acknowledge: "Đã biết",
    snooze: "Nhắc lại sau", saveError: "Không thể lưu xác nhận. Vui lòng thử lại.",
    D30: "Còn trong vòng 30 ngày", D7: "Còn trong vòng 7 ngày", D1: "Đáo hạn ngày mai",
    D0: "Đáo hạn hôm nay", OVERDUE: "Đã quá hạn",
  },
  "zh-CN": {
    title: "存款到期提醒", intro: "请检查以下需要处理的存款。", offline: "离线数据，可能不是最新。",
    close: "关闭", acknowledge: "知道了", snooze: "稍后提醒", saveError: "无法保存确认，请重试。",
    D30: "30天内到期", D7: "7天内到期", D1: "明天到期", D0: "今天到期", OVERDUE: "已经逾期",
  },
};

function words(locale) { return copy[locale] || copy.vi; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }

function readSnoozes(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => key.length <= 120 && Number.isFinite(value)));
  } catch (_) { return {}; }
}

function writeSnooze(storage, key, until, nowMs) {
  if (!storage) throw new Error("Reminder storage is unavailable");
  const current = readSnoozes(storage);
  const active = Object.fromEntries(Object.entries(current).filter(([, value]) => value > nowMs).slice(-499));
  active[key] = until;
  storage.setItem(STORAGE_KEY, JSON.stringify(active));
}

function renderReminderDialog(reminders, locale, offline) {
  const labels = words(locale);
  const items = reminders.map(reminder => `<li class="deposit-reminder-item" data-reminder-key="${escapeHtml(reminder.key)}"><div><strong>${escapeHtml(reminder.institutionName)}</strong><p>${escapeHtml(reminder.productName)}</p><span>${escapeHtml(labels[reminder.stage])} · ${escapeHtml(reminder.maturesOn)}</span></div><div class="deposit-reminder-actions"><button type="button" class="btn-secondary" data-snooze-reminder>${labels.snooze}</button><button type="button" class="btn-primary" data-acknowledge-reminder>${labels.acknowledge}</button></div><p class="deposit-reminder-item-error" data-reminder-error role="alert"></p></li>`).join("");
  return `<div class="deposit-reminder-backdrop" data-reminder-backdrop><section class="deposit-reminder-dialog safe-area-bottom" role="dialog" aria-modal="true" aria-labelledby="deposit-reminder-title" tabindex="-1"><header><div><p class="deposit-eyebrow">${labels.D0}</p><h2 id="deposit-reminder-title">${labels.title}</h2><p>${labels.intro}</p></div><button type="button" class="deposit-form-close" data-close-reminders aria-label="${labels.close}">×</button></header>${offline ? `<p class="deposit-reminder-offline" role="status">${labels.offline}</p>` : ""}<ul>${items}</ul><footer><button type="button" class="btn-secondary" data-close-reminders>${labels.close}</button></footer></section></div>`;
}

export function createDepositReminderController({
  root,
  getDocument,
  getToday,
  getLocale,
  isAuthenticated,
  isReady,
  isOffline,
  acknowledge,
  storage = globalThis.localStorage,
  now = () => Date.now(),
  snoozeMs = 4 * 60 * 60 * 1000,
}) {
  const sessionSuppressed = new Set();
  let visibleKeys = [];

  function hide() {
    visibleKeys = [];
    if (root) root.innerHTML = "";
  }

  function close() { hide(); }

  function check() {
    if (!root || !isAuthenticated() || !isReady()) { hide(); return []; }
    const document = getDocument();
    const reminders = buildDepositReminders({
      depositsById: document?.depositsById || {},
      acknowledgementsByKey: document?.acknowledgementsByKey || {},
      today: getToday(),
      snoozedUntilByKey: readSnoozes(storage),
      nowMs: now(),
    }).filter(reminder => !sessionSuppressed.has(reminder.key));
    if (reminders.length === 0) { hide(); return []; }
    visibleKeys = reminders.map(reminder => reminder.key);
    root.innerHTML = renderReminderDialog(reminders, getLocale(), isOffline());
    const dialog = root.querySelector('[role="dialog"]');
    dialog?.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    dialog?.focus();
    root.querySelectorAll("[data-close-reminders]").forEach(button => button.addEventListener("click", close));
    root.querySelector("[data-reminder-backdrop]")?.addEventListener("click", event => { if (event.target === event.currentTarget) close(); });
    root.querySelectorAll("[data-reminder-key]").forEach(item => {
      const key = item.dataset.reminderKey;
      item.querySelector("[data-snooze-reminder]")?.addEventListener("click", () => {
        const errorNode = item.querySelector("[data-reminder-error]");
        try {
          writeSnooze(storage, key, now() + snoozeMs, now());
          check();
        } catch (_) { if (errorNode) errorNode.textContent = words(getLocale()).saveError; }
      });
      item.querySelector("[data-acknowledge-reminder]")?.addEventListener("click", async event => {
        const errorNode = item.querySelector("[data-reminder-error]");
        const button = event.currentTarget;
        button.disabled = true;
        if (errorNode) errorNode.textContent = "";
        try {
          await acknowledge(key);
          sessionSuppressed.add(key);
          check();
        } catch (_) {
          button.disabled = false;
          if (errorNode) errorNode.textContent = words(getLocale()).saveError;
        }
      });
    });
    return reminders;
  }

  function destroy() { sessionSuppressed.clear(); hide(); }
  return { check, close, destroy, getVisibleKeys: () => [...visibleKeys] };
}
