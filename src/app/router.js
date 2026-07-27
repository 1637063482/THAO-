export const APP_ROUTES = [
  { id: "overview", elementId: "overview-content" },
  { id: "savings", elementId: "savings-view" },
  { id: "stats", elementId: "analysis-view" },
];

export function createAppRouter(options = {}) {
  const root = options.root || document;
  const routes = options.routes || APP_ROUTES;
  const lifecycle = options.lifecycle || {};
  const routesById = new Map(routes.map((route) => [route.id, route]));
  let activeId = null;
  let started = false;

  function getElement(route) {
    return root.getElementById(route.elementId);
  }

  function setVisibleRoute(routeId) {
    routes.forEach((route) => {
      const element = getElement(route);
      if (element) element.style.display = route.id === routeId ? "" : "none";
    });
  }

  function runLifecycle(routeId, phase, transition) {
    const callback = lifecycle[routeId]?.[phase];
    if (callback) callback(transition);
  }

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
