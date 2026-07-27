import { NAV_ITEMS } from "../../js/navigation.js";

/**
 * @param {import("../../types/dom-contracts").DomHost} host
 */
export function renderBottomNav(host) {
  if (!host) throw new Error("App bottom navigation host is required");
  host.setAttribute("role", "navigation");
  host.setAttribute("data-i18n-aria-label", "main_navigation");
  host.innerHTML = NAV_ITEMS.map((item, index) => `
    <button type="button" class="bottom-nav-item${index === 0 ? " active" : ""}" data-nav="${item.id}" aria-current="${index === 0 ? "page" : "false"}">
      <span data-icon="${item.icon}" data-icon-class="w-5 h-5"></span>
      <span data-i18n="${item.labelKey}"></span>
    </button>
  `).join("");
  return host;
}
