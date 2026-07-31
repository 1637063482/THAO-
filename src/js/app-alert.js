/**
 * App Alert — 应用内确认弹窗，替代原生 confirm()。
 * Apple 风格：居中毛玻璃卡片、Escape/遮罩取消、自动聚焦确认键。
 */

/** @param {unknown} value */
function escapeHtml(value) {
  /** @type {Record<string, string>} */
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => entities[char] || char);
}

/**
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} options.message
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {"default" | "destructive"} [options.tone]
 * @returns {Promise<boolean>}
 */
export function showConfirmAlert({
  title = "",
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  tone = "default",
}) {
  return new Promise(resolve => {
    document.querySelector(".app-alert-backdrop")?.remove();
    const backdrop = document.createElement("div");
    backdrop.className = "app-alert-backdrop";
    backdrop.innerHTML =
      '<section class="app-alert" role="alertdialog" aria-modal="true" aria-labelledby="app-alert-title">'
      + (title ? '<h3 id="app-alert-title" class="app-alert-title">' + escapeHtml(title) + '</h3>' : '')
      + '<p class="app-alert-message">' + escapeHtml(message) + '</p>'
      + '<div class="app-alert-actions">'
      + '<button type="button" class="btn-plain" data-alert-cancel>' + escapeHtml(cancelLabel) + '</button>'
      + '<button type="button" class="' + (tone === "destructive" ? "btn-danger" : "btn-primary") + '" data-alert-confirm>' + escapeHtml(confirmLabel) + '</button>'
      + '</div>'
      + '</section>';

    /** @param {boolean} result */
    const close = (result) => {
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    /** @param {KeyboardEvent} event */
    const onKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(false); return; }
      if (event.key !== "Tab") return;
      const focusable = [...backdrop.querySelectorAll("button")].filter(button => !button.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    backdrop.querySelector("[data-alert-cancel]")?.addEventListener("click", () => close(false));
    backdrop.querySelector("[data-alert-confirm]")?.addEventListener("click", () => close(true));
    backdrop.addEventListener("click", event => { if (event.target === backdrop) close(false); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(backdrop);
    const confirmButton = backdrop.querySelector("[data-alert-confirm]");
    if (confirmButton instanceof HTMLButtonElement) confirmButton.focus();
  });
}
