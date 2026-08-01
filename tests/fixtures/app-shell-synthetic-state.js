import { renderCommandMenu } from "../../src/components/app-shell/command-menu.js";
import { renderHeader } from "../../src/components/app-shell/header.js";
import { setAppDropdownValue } from "../../src/components/feedback/app-dropdown.js";

export function mountSyntheticAppShell(host) {
  renderHeader(host);
  renderCommandMenu(host.querySelector("[data-app-command-menu-host]"));

  setAppDropdownValue(host.querySelector("#year-selector"), "2026");
  host.querySelector("#sync-status-text").textContent = "Đã đồng bộ";
  return host;
}
