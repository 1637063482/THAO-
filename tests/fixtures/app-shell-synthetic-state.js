import { renderCommandMenu } from "../../src/components/app-shell/command-menu.js";
import { renderHeader } from "../../src/components/app-shell/header.js";

export function mountSyntheticAppShell(host) {
  renderHeader(host);
  renderCommandMenu(host.querySelector("[data-app-command-menu-host]"));

  host.querySelector("#display-year-text").textContent = "2026";
  host.querySelector("#sync-status-text").textContent = "Đã đồng bộ";
  return host;
}
