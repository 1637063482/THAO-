/**
 * Navigation — responsive app shell controller.
 *
 * Provides 3 navigation destinations, single active-state tracking,
 * keyboard navigation support, and breakpoint-aware layout helpers.
 */

export var NAV_ITEMS = [
  { id: "overview", labelKey: "overview", icon: "home", route: "overview" },
  { id: "savings",  labelKey: "savings", icon: "piggyBank", route: "savings" },
  { id: "stats",    labelKey: "stats", icon: "chartBar", route: "stats" },
];

var VALID_IDS = NAV_ITEMS.map(function (item) { return item.id; });
var _activeId = "overview";
var _router = null;
var _cleanup = null;

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
      el.setAttribute("aria-current", "page");
    } else {
      el.classList.remove("active");
      el.setAttribute("aria-current", "false");
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
  if (!_router || typeof _router.navigate !== "function") {
    throw new Error("App router is not initialized");
  }
  _router.navigate(id);
  return setActive(id);
}

/**
 * Initialize navigation: configure click and keyboard handlers.
 */
export function initNavigation(router, root = document) {
  if (!router || typeof router.navigate !== "function") {
    throw new Error("App router is required");
  }
  if (_cleanup) _cleanup();
  _router = router;
  var bindings = [];

  root.querySelectorAll("[data-nav]").forEach(function (el) {
    function clickHandler() {
      var id = el.getAttribute("data-nav");
      if (id) navigateTo(id);
    }

    function keydownHandler(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    }

    el.addEventListener("click", clickHandler);
    el.addEventListener("keydown", keydownHandler);
    bindings.push(function () {
      el.removeEventListener("click", clickHandler);
      el.removeEventListener("keydown", keydownHandler);
    });
  });

  _cleanup = function cleanupNavigation() {
    bindings.forEach(function (unbind) { unbind(); });
    bindings = [];
    _cleanup = null;
    _router = null;
  };
  return _cleanup;
}
