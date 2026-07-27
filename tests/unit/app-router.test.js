import { beforeEach, describe, expect, it, vi } from "vitest";

describe("app router", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = [
      '<section id="overview-content"></section>',
      '<section id="savings-view"></section>',
      '<section id="analysis-view"></section>',
    ].join("");
  });

  it("switches overview, savings, and stats through their page contracts", async () => {
    const { createAppRouter } = await import("../../src/app/router.js");
    const router = createAppRouter({ root: document });

    router.start("overview");
    expect(document.getElementById("overview-content").style.display).toBe("");
    expect(document.getElementById("savings-view").style.display).toBe("none");
    expect(document.getElementById("analysis-view").style.display).toBe("none");

    router.navigate("savings");
    expect(document.getElementById("overview-content").style.display).toBe("none");
    expect(document.getElementById("savings-view").style.display).toBe("");

    router.navigate("stats");
    expect(document.getElementById("savings-view").style.display).toBe("none");
    expect(document.getElementById("analysis-view").style.display).toBe("");
  });

  it("rejects an unknown route without changing the active page", async () => {
    const { createAppRouter } = await import("../../src/app/router.js");
    const router = createAppRouter({ root: document });
    router.start("overview");

    expect(() => router.navigate("unknown")).toThrow("Unknown app route: unknown");
    expect(router.getActive()).toBe("overview");
    expect(document.getElementById("overview-content").style.display).toBe("");
  });

  it("only runs the leave and enter callbacks for the pages in the transition", async () => {
    const { createAppRouter } = await import("../../src/app/router.js");
    const lifecycle = {
      overview: { enter: vi.fn(), leave: vi.fn() },
      savings: { enter: vi.fn(), leave: vi.fn() },
      stats: { enter: vi.fn(), leave: vi.fn() },
    };
    const router = createAppRouter({ root: document, lifecycle });

    router.start("overview");
    router.navigate("savings");

    expect(lifecycle.overview.enter).toHaveBeenCalledTimes(1);
    expect(lifecycle.overview.leave).toHaveBeenCalledTimes(1);
    expect(lifecycle.savings.enter).toHaveBeenCalledTimes(1);
    expect(lifecycle.savings.leave).not.toHaveBeenCalled();
    expect(lifecycle.stats.enter).not.toHaveBeenCalled();
    expect(lifecycle.stats.leave).not.toHaveBeenCalled();

    router.stop();
    expect(lifecycle.savings.leave).toHaveBeenCalledTimes(1);
    expect(router.getActive()).toBeNull();
  });
});
