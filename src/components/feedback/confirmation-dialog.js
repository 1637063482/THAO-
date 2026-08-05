import { t } from "../../js/i18n.js";
import { createGlobalModalController } from "./global-modal.js";

/** @type {{ host: HTMLElement, close: (accepted: boolean) => void } | null} */
let activeDialog = null;

/**
 * Shows an application-owned confirmation dialog and resolves to the user's choice.
 * @param {{ message: string, title?: string, confirmLabel?: string, cancelLabel?: string, destructive?: boolean }} options
 * @returns {Promise<boolean>}
 */
export function requestAppConfirmation({ message, title = t("confirmation_title"), confirmLabel = t("confirm_action"), cancelLabel = t("cancel"), destructive = false }) {
  if (activeDialog) activeDialog.close(false);
  return new Promise(resolve => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const host = document.createElement("div");
    host.className = "app-confirmation-backdrop app-global-modal";
    host.innerHTML = `<section class="app-confirmation-dialog app-global-modal-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-confirmation-title" aria-describedby="app-confirmation-message"><h2 id="app-confirmation-title"></h2><p id="app-confirmation-message"></p><footer><button type="button" class="btn-secondary" data-confirm-cancel></button><button type="button" class="btn-primary" data-confirm-accept></button></footer></section>`;
    const dialog = /** @type {HTMLElement} */ (host.firstElementChild);
    const titleNode = /** @type {HTMLElement} */ (host.querySelector("#app-confirmation-title"));
    const messageNode = /** @type {HTMLElement} */ (host.querySelector("#app-confirmation-message"));
    const cancelButton = /** @type {HTMLButtonElement} */ (host.querySelector("[data-confirm-cancel]"));
    const acceptButton = /** @type {HTMLButtonElement} */ (host.querySelector("[data-confirm-accept]"));
    titleNode.textContent = title;
    messageNode.textContent = message;
    cancelButton.textContent = cancelLabel;
    acceptButton.textContent = confirmLabel;
    if (destructive) acceptButton.className = "btn-danger";

    /** @type {ReturnType<typeof createGlobalModalController> | null} */
    let modalController = null;
    let settled = false;
    /** @param {boolean} accepted */
    const close = accepted => {
      if (activeDialog?.host !== host || settled) return;
      settled = true;
      activeDialog = null;
      modalController?.close();
      resolve(accepted);
    };
    activeDialog = { host, close };
    host.addEventListener("click", event => { if (event.target === host) close(false); });
    cancelButton.addEventListener("click", () => close(false));
    acceptButton.addEventListener("click", () => close(true));
    host.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); close(false); return; }
      if (event.key !== "Tab") return;
      const focusables = [cancelButton, acceptButton];
      const index = focusables.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
      if (event.shiftKey && index === 0) { event.preventDefault(); acceptButton.focus(); }
      else if (!event.shiftKey && index === focusables.length - 1) { event.preventDefault(); cancelButton.focus(); }
    });
    document.body.append(host);
    modalController = createGlobalModalController({
      root: host,
      dialog,
      trigger: opener,
      targetWidth: 352,
      onClosed: () => host.remove(),
    });
    modalController.open();
  });
}
