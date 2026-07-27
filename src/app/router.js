/** @typedef {import("../types/app-state").AppRoute} AppRoute */
/** @typedef {import("../types/app-state").AppRouteTransition} AppRouteTransition */
/** @typedef {import("../types/app-state").AppRouterOptions} AppRouterOptions */

/** @type {readonly AppRoute[]} */
export const APP_ROUTES = [
  { id: "overview", elementId: "overview-content" },
  { id: "savings", elementId: "savings-view" },
  { id: "stats", elementId: "analysis-view" },
];

/**
 * @param {AppRouterOptions} [options]
 */
export function createAppRouter(options = {}) {
  const root = options.root || document;
  const routes = options.routes || APP_ROUTES;
  const lifecycle = options.lifecycle || {};
  const routesById = new Map(routes.map((route) => [route.id, route]));
  /** @type {string | null} */
  let activeId = null;
  let started = false;

  /** @param {AppRoute} route */
  function getElement(route) {
    return root.getElementById(route.elementId);
  }

  /** @param {string | null} routeId */
  function setVisibleRoute(routeId) {
    routes.forEach((route) => {
      const element = getElement(route);
      if (element) element.style.display = route.id === routeId ? "" : "none";
    });
  }

  /**
   * @param {string} routeId
   * @param {"enter" | "leave"} phase
   * @param {AppRouteTransition} transition
   */
  function runLifecycle(routeId, phase, transition) {
    const callback = lifecycle[routeId]?.[phase];
    if (callback) callback(transition);
  }

  /** @param {string} routeId */
  function navigate(routeId) {
    if (!routesById.has(routeId)) {
      throw new Error("Unknown app route: " + routeId);
    }
    if (activeId === routeId) {
      setVisibleRoute(routeId);
      return false;
    }

    const previousId = activeId;
    if (previousId) {
      runLifecycle(previousId, "leave", { from: previousId, to: routeId });
    }
    setVisibleRoute(routeId);
    activeId = routeId;
    started = true;
    runLifecycle(routeId, "enter", { from: previousId, to: routeId });
    return true;
  }

  /** @param {string} [initialRoute] */
  function start(initialRoute = "overview") {
    if (started && activeId) return false;
    return navigate(initialRoute);
  }

  function stop() {
    if (!started) return false;
    const previousId = activeId;
    if (previousId) {
      runLifecycle(previousId, "leave", { from: previousId, to: null });
    }
    setVisibleRoute(null);
    activeId = null;
    started = false;
    return true;
  }

  return {
    getActive: () => activeId,
    navigate,
    start,
    stop,
  };
}
