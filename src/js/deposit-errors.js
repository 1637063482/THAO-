import vi from "../locales/vi.js";
import zhCN from "../locales/zh-CN.js";

const messages = { vi, "zh-CN": zhCN };

function errorKey(error) {
  const code = String(error?.code || "");
  if (code === "permission-denied") return "deposit_error_permission";
  if (code === "DEPOSIT_VERSION_CONFLICT") return "deposit_error_conflict";
  if (code.startsWith("INVALID_DEPOSIT_")) return "deposit_error_validation";
  if (["unavailable", "offline", "network-request-failed"].includes(code)) return "deposit_error_offline";
  return "deposit_error_unknown";
}

export function depositErrorMessage(error, locale = "vi", context = "form") {
  void context;
  const copy = messages[locale] || messages.vi;
  return copy[errorKey(error)];
}
