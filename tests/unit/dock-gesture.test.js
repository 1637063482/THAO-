import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function setRect(element, left, width, top = 0, height = 64) {
  element.getBoundingClientRect = () => ({
    left,
    right: left + width,
    top,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON() { return {}; },
  });
}

function dispatchPointer(target, type, values = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.entries({
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: 70,
    clientY: 24,
    timeStamp: 0,
    ...values,
  }).forEach(([key, value]) => Object.defineProperty(event, key, { value }));
  target.dispatchEvent(event);
  return event;
}

async function setupNavigation() {
  const bottomNav = document.querySelector("#bottom-nav");
  const { renderBottomNav } = await import("../../src/components/app-shell/bottom-nav.js");
  renderBottomNav(bottomNav);
  expect(bottomNav.querySelector("[data-bottom-nav-lens]")).not.toBeNull();

  const buttons = Array.from(bottomNav.querySelectorAll(".bottom-nav-item"));
  setRect(bottomNav, 20, 300);
  buttons.forEach((button, index) => {
    setRect(button, 20 + index * 100, 100);
    button.setPointerCapture = vi.fn();
    button.releasePointerCapture = vi.fn();
  });

  const navigation = await import("../../src/js/navigation.js");
  const router = { navigate: vi.fn() };
  const cleanup = navigation.initNavigation(router);
  return { bottomNav, buttons, navigation, router, cleanup };
}

describe("bottom navigation dock gesture", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    localStorage.clear();
    document.body.innerHTML = '<nav id="bottom-nav"></nav><aside id="sidebar"></aside>';
  });

  it("renders the lens surface above the bottom-navigation track", async () => {
    const { renderBottomNav } = await import("../../src/components/app-shell/bottom-nav.js");
    const bottomNav = document.querySelector("#bottom-nav");
    renderBottomNav(bottomNav);

    expect(bottomNav.querySelector("[data-bottom-nav-lens]")).not.toBeNull();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("tracks a horizontal drag without navigating until release, then commits once", async () => {
    const { bottomNav, buttons, navigation, router } = await setupNavigation();
    const lens = bottomNav.querySelector("[data-bottom-nav-lens]");
    expect(lens.getAttribute("aria-hidden")).toBe("true");

    dispatchPointer(buttons[0], "pointerdown", { clientX: 70, timeStamp: 10 });
    dispatchPointer(buttons[0], "pointermove", { clientX: 170, timeStamp: 110 });

    expect(navigation.getActive()).toBe("overview");
    expect(router.navigate).not.toHaveBeenCalled();
    expect(buttons[0].getAttribute("aria-current")).toBe("page");
    expect(buttons[2].getAttribute("aria-current")).toBe("false");
    expect(lens.style.getPropertyValue("--dock-lens-x")).toBe("100px");

    dispatchPointer(buttons[0], "pointerup", { clientX: 170, timeStamp: 120 });

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith("stats");
    expect(navigation.getActive()).toBe("stats");
    expect(buttons[2].getAttribute("aria-current")).toBe("page");
  });

  it("restores the committed item after vertical movement or pointer cancellation", async () => {
    const { bottomNav, buttons, navigation, router } = await setupNavigation();
    const lens = bottomNav.querySelector("[data-bottom-nav-lens]");

    dispatchPointer(buttons[0], "pointerdown", { clientX: 70, clientY: 24, timeStamp: 10 });
    dispatchPointer(buttons[0], "pointermove", { clientX: 76, clientY: 46, timeStamp: 100 });
    expect(buttons[0].releasePointerCapture).toHaveBeenCalledWith(1);
    expect(navigation.getActive()).toBe("overview");

    dispatchPointer(buttons[0], "pointerdown", { clientX: 70, timeStamp: 200 });
    dispatchPointer(buttons[0], "pointermove", { clientX: 180, timeStamp: 280 });
    dispatchPointer(buttons[0], "lostpointercapture", { clientX: 180, timeStamp: 290 });

    expect(navigation.getActive()).toBe("overview");
    expect(lens.style.getPropertyValue("--dock-lens-x")).toBe("0px");

    dispatchPointer(buttons[0], "pointerdown", { clientX: 70, timeStamp: 300 });
    dispatchPointer(buttons[0], "pointermove", { clientX: 180, timeStamp: 380 });
    dispatchPointer(buttons[0], "pointercancel", { clientX: 180, timeStamp: 390 });

    expect(router.navigate).not.toHaveBeenCalled();
    expect(navigation.getActive()).toBe("overview");
    expect(lens.style.getPropertyValue("--dock-lens-x")).toBe("0px");
  });

  it("settles on the held destination after a drag comes to rest", async () => {
    const { buttons, navigation, router } = await setupNavigation();
    dispatchPointer(buttons[0], "pointerdown", { clientX: 70, timeStamp: 10 });
    dispatchPointer(buttons[0], "pointermove", { clientX: 170, timeStamp: 90 });
    dispatchPointer(buttons[0], "pointerup", { clientX: 170, timeStamp: 390 });

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.getActive()).toBe("savings");
  });

  it("moves the lens only when an inactive tap commits, including on a rapid reverse tap", async () => {
    const { bottomNav, buttons, navigation, router } = await setupNavigation();
    const lens = bottomNav.querySelector("[data-bottom-nav-lens]");
    const lensX = () => lens.style.getPropertyValue("--dock-lens-x");
    const lensScaleY = () => lens.style.getPropertyValue("--dock-lens-scale-y");
    const click = (button) => button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    expect(lensX()).toBe("0px");
    expect(lensScaleY()).toBe("1");

    dispatchPointer(buttons[2], "pointerdown", { clientX: 270, timeStamp: 10 });
    expect(lensX()).toBe("0px");
    expect(lensScaleY()).toBe("1");
    dispatchPointer(buttons[2], "pointerup", { clientX: 270, timeStamp: 20 });
    expect(lensX()).toBe("0px");
    expect(lensScaleY()).toBe("1");
    expect(router.navigate).not.toHaveBeenCalled();

    click(buttons[2]);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenLastCalledWith("stats");
    expect(navigation.getActive()).toBe("stats");
    expect(lensX()).toBe("200px");
    expect(bottomNav.classList.contains("dock-lens-settling")).toBe(true);

    dispatchPointer(buttons[0], "pointerdown", { clientX: 70, timeStamp: 30 });
    expect(lensX()).toBe("200px");
    expect(lensScaleY()).toBe("1");
    expect(bottomNav.classList.contains("dock-lens-settling")).toBe(true);
    dispatchPointer(buttons[0], "pointerup", { clientX: 70, timeStamp: 40 });
    expect(lensX()).toBe("200px");
    expect(bottomNav.classList.contains("dock-lens-settling")).toBe(true);

    click(buttons[0]);
    expect(router.navigate).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenLastCalledWith("overview");
    expect(navigation.getActive()).toBe("overview");
    expect(lensX()).toBe("0px");
    expect(bottomNav.classList.contains("dock-lens-settling")).toBe(true);
  });

  it("suppresses the drag-generated click but keeps the next tap and keyboard activation", async () => {
    const { buttons, navigation, router } = await setupNavigation();

    dispatchPointer(buttons[0], "pointerdown", { clientX: 70, timeStamp: 10 });
    dispatchPointer(buttons[0], "pointermove", { clientX: 270, timeStamp: 110 });
    dispatchPointer(buttons[0], "pointerup", { clientX: 270, timeStamp: 120 });
    buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.getActive()).toBe("stats");

    dispatchPointer(buttons[1], "pointerdown", { clientX: 170, timeStamp: 200 });
    dispatchPointer(buttons[1], "pointerup", { clientX: 170, timeStamp: 210 });
    buttons[1].dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    buttons[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    buttons[1].dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

    expect(router.navigate.mock.calls.map(([id]) => id)).toEqual(["stats", "savings", "overview", "savings"]);
  });

  it("syncs programmatic active changes and releases gesture handlers on cleanup", async () => {
    const { bottomNav, buttons, navigation, router, cleanup } = await setupNavigation();
    const lens = bottomNav.querySelector("[data-bottom-nav-lens]");

    navigation.setActive("savings");
    expect(lens.style.getPropertyValue("--dock-lens-x")).toBe("100px");

    setRect(bottomNav, 20, 0);
    buttons.forEach((button, index) => setRect(button, 20 + index * 120, 0));
    window.dispatchEvent(new Event("resize"));
    expect(bottomNav.classList.contains("dock-lens-ready")).toBe(false);

    setRect(bottomNav, 20, 360);
    buttons.forEach((button, index) => setRect(button, 20 + index * 120, 120));
    window.dispatchEvent(new Event("resize"));
    expect(bottomNav.classList.contains("dock-lens-ready")).toBe(true);
    expect(lens.style.getPropertyValue("--dock-lens-x")).toBe("120px");

    cleanup();
    navigation.setActive("stats");
    dispatchPointer(buttons[1], "pointerdown", { clientX: 170, timeStamp: 10 });
    dispatchPointer(buttons[1], "pointermove", { clientX: 70, timeStamp: 110 });
    dispatchPointer(buttons[1], "pointerup", { clientX: 70, timeStamp: 120 });

    expect(router.navigate).not.toHaveBeenCalled();
    expect(navigation.getActive()).toBe("stats");
    expect(lens.style.getPropertyValue("--dock-lens-x")).toBe("120px");
  });

  it("keeps horizontal selection without lift or stretch for reduced motion", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: true }));
    const { bottomNav, buttons, router } = await setupNavigation();
    const lens = bottomNav.querySelector("[data-bottom-nav-lens]");

    dispatchPointer(buttons[0], "pointerdown", { clientX: 70, timeStamp: 10 });
    dispatchPointer(buttons[0], "pointermove", { clientX: 170, timeStamp: 110 });

    expect(lens.style.getPropertyValue("--dock-lens-scale-y")).toBe("1");
    expect(lens.style.getPropertyValue("--dock-lens-scale-x")).toBe("1");

    dispatchPointer(buttons[0], "pointerup", { clientX: 170, timeStamp: 120 });
    expect(bottomNav.classList.contains("dock-lens-settling")).toBe(false);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    window.matchMedia = originalMatchMedia;
  });

  it("installs a backdrop displacement filter for the lens and removes it on cleanup", async () => {
    vi.stubGlobal("CSS", { supports: vi.fn(() => true) });
    class TestResizeObserver {
      constructor(callback) {
        this.callback = callback;
        TestResizeObserver.instances = [...(TestResizeObserver.instances || []), this];
      }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
      resize(width, height) {
        this.callback([{
          target: this.target,
          borderBoxSize: [{ inlineSize: width, blockSize: height }],
          contentRect: { width, height },
        }]);
      }
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; },
      putImageData: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,dGVzdA==");

    const { bottomNav, cleanup } = await setupNavigation();
    const lens = bottomNav.querySelector("[data-bottom-nav-lens]");
    const resizeObserver = TestResizeObserver.instances?.at(-1);
    resizeObserver?.resize(100, 50);
    const image = document.querySelector("feImage");

    expect(bottomNav.classList.contains("dock-refraction-ready")).toBe(true);
    expect(lens.style.getPropertyValue("--dock-refraction-filter")).toMatch(/^url\(#dock-refraction-/);
    expect(document.querySelector("svg[data-dock-refraction-defs]")).not.toBeNull();
    expect(document.querySelector("feDisplacementMap").getAttribute("in2")).toBe("displacement-map");
    expect(image.getAttribute("x")).toBe("0");
    expect(image.getAttribute("y")).toBe("0");
    expect(image.getAttribute("width")).toBe("100");
    expect(image.getAttribute("height")).toBe("50");

    resizeObserver?.resize(100.25, 50.25);
    expect(image.getAttribute("width")).toBe("100.25");
    expect(image.getAttribute("height")).toBe("50.25");

    cleanup();
    expect(bottomNav.classList.contains("dock-refraction-ready")).toBe(false);
    expect(lens.style.getPropertyValue("--dock-refraction-filter")).toBe("");
    expect(document.querySelector("svg[data-dock-refraction-defs]")).toBeNull();
    expect(resizeObserver?.disconnected).toBe(true);
  });

  it("keeps the CSS blur fallback when SVG backdrop filters are unsupported", async () => {
    vi.stubGlobal("CSS", { supports: vi.fn(() => false) });
    const { bottomNav, cleanup } = await setupNavigation();

    expect(bottomNav.classList.contains("dock-refraction-ready")).toBe(false);
    expect(document.querySelector("svg[data-dock-refraction-defs]")).toBeNull();
    cleanup();
  });
});
