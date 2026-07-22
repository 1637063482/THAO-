/**
 * Navigation — responsive app shell controller.
 *
 * Provides 5 navigation destinations, single active-state tracking,
 * keyboard navigation support, and breakpoint-aware layout helpers.
 */

export var NAV_ITEMS = [
  { id: "overview", labelKey: "overview", icon: "home", route: "overview" },
  { id: "add",      labelKey: "quick_add", icon: "plus", route: "add" },
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
 * Set the active navigation item.
 * @param {string} id - One of the NAV_ITEMS ids.
 * @throws {Error} If id is not a valid navigation item.
 * @returns {string} The newly active id.
 */
export function setActive(id) {
  if (VALID_IDS.indexOf(id) === -1) {
    throw new Error("Unknown navigation item: " + id);
  }
  _activeId = id;

  // Update DOM active states
  document.querySelectorAll("[data-nav]").forEach(function (el) {
    el.classList.toggle("active", el.getAttribute("data-nav") === id);
  });

  return _activeId;
}

/**
 * Initialize keyboard navigation on nav elements.
 * Attaches keydown listeners to all [data-nav] elements for Enter/Space.
 */
export function initNavigation() {
  document.querySelectorAll("[data-nav]").forEach(function (el) {
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  });
}
