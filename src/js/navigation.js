/**
 * Navigation — responsive app shell controller.
 *
 * Provides 5 navigation destinations, single active-state tracking,
 * keyboard navigation support, and breakpoint-aware layout helpers.
 */

export var NAV_ITEMS = [
  { id: "overview", labelKey: "overview", icon: "home", route: "overview" },
  { id: "savings",  labelKey: "savings", icon: "piggyBank", route: "savings" },
  { id: "stats",    labelKey: "stats", icon: "chartBar", route: "stats" },
  { id: "import",   labelKey: "import_label", icon: "download", route: "import" },
  { id: "export",   labelKey: "export_csv", icon: "download", route: "export" },
];

var VALID_IDS = NAV_ITEMS.map(function (item) { return item.id; });
var _activeId = "overview";

/**
 * Get the currently active navigation item ID.
 * @returns {string}
 */
export function getActive() {
  return _activeId;
}

/**
 * Set the active navigation item (visual only).
 * @param {string} id - One of the NAV_ITEMS ids.
 * @throws {Error} If id is not a valid navigation item.
 * @returns {string} The newly active id.
 */
export function setActive(id) {
  if (VALID_IDS.indexOf(id) === -1) {
    throw new Error("Unknown navigation item: " + id);
  }
  _activeId = id;

  // Update active state on ALL [data-nav] elements (bottom nav + sidebar)
  document.querySelectorAll("[data-nav]").forEach(function (el) {
    if (el.getAttribute("data-nav") === id) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  return _activeId;
}

/**
 * Navigate to a destination: sets active state and invokes the action.
 * Called by both bottom-nav and sidebar click/keyboard handlers.
 * @param {string} id - Navigation destination id.
 */
export function navigateTo(id) {
  switch (id) {
    case "overview":
      window.switchMobileView("overview");
      setActive("overview");
      break;
    case "savings":
      window.switchMobileView("savings");
      setActive("savings");
      break;
    case "stats":
      window.switchMobileView("stats");
      setActive("stats");
      break;
    case "import":
      var fileInput = document.getElementById("import-file");
      if (fileInput) fileInput.click();
      break;
    case "export":
      window.exportToCSV();
      break;
  }
}

/**
 * Initialize navigation: configure click and keyboard handlers.
 */
export function initNavigation() {
  document.querySelectorAll("[data-nav]").forEach(function (el) {
    // Unified click handler
    el.addEventListener("click", function (e) {
      var id = el.getAttribute("data-nav");
      if (id) navigateTo(id);
    });

    // Keyboard: Enter/Space trigger the same unified handler
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  });
}
