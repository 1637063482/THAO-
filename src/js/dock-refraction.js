const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const DISPLACEMENT_SCALE = 30;
let nextFilterId = 0;

/**
 * Build a symmetric capsule displacement map. Channels are centered on neutral 128.
 * @param {number} width
 * @param {number} height
 * @returns {Uint8ClampedArray}
 */
export function createDisplacementPixels(width, height) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const radius = height / 2;
  const straightHalf = Math.max(0, width / 2 - radius);
  const edgeRange = Math.max(1, height * 0.12);
  const channelFor = (/** @type {number} */ offset) => Math.max(0, Math.min(255, Math.round(128 + offset * 255 / DISPLACEMENT_SCALE)));

  for (let y = 0; y < height; y += 1) {
    const py = y + 0.5;
    const dy = py - radius;
    for (let x = 0; x < width; x += 1) {
      const px = x + 0.5;
      const dx = px - width / 2;
      const capX = Math.max(-straightHalf, Math.min(straightHalf, dx));
      const normalXDistance = dx - capX;
      const distance = Math.hypot(normalXDistance, dy);
      const signedDistance = distance - radius;
      const normalX = distance ? normalXDistance / distance : 0;
      const normalY = distance ? dy / distance : 0;
      const bevel = Math.exp(-Math.abs(signedDistance) / edgeRange) * 2.8;
      const refractX = dx / Math.max(1, width / 2) * 1.6 + normalX * bevel;
      const refractY = dy / Math.max(1, radius) * 0.65 + normalY * bevel;
      const offset = (y * width + x) * 4;
      pixels[offset] = channelFor(refractX);
      pixels[offset + 1] = channelFor(refractY);
      pixels[offset + 2] = 128;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

/**
 * Add an SVG backdrop displacement filter to the dock lens when this browser supports it.
 * @param {HTMLElement} bottomNav
 * @param {HTMLElement} lens
 * @returns {{ setEngaged: (engaged: boolean) => void, refresh: (width?: number, height?: number) => void, cleanup: () => void }}
 */
export function initDockRefraction(bottomNav, lens) {
  const noOp = { setEngaged() {}, refresh() {}, cleanup() {} };
  const doc = bottomNav.ownerDocument;
  const view = doc.defaultView;
  const css = typeof CSS !== "undefined" ? CSS : null;
  if (!view || !css || typeof css.supports !== "function" || typeof view.SVGElement === "undefined" || typeof view.SVGSVGElement === "undefined") {
    return noOp;
  }

  const filterId = `dock-refraction-${++nextFilterId}`;
  const filterUrl = `url(#${filterId})`;
  if (!css.supports("backdrop-filter", filterUrl) && !css.supports("-webkit-backdrop-filter", filterUrl)) {
    return noOp;
  }

  const canvas = doc.createElement("canvas");
  if (typeof canvas.getContext !== "function" || typeof canvas.toDataURL !== "function") return noOp;
  /** @type {CanvasRenderingContext2D | null} */
  let context = null;
  try {
    context = canvas.getContext("2d", { willReadFrequently: true });
  } catch (_error) {
    return noOp;
  }
  if (!context) return noOp;
  const canvasContext = context;

  const svg = doc.createElementNS(SVG_NS, "svg");
  const defs = doc.createElementNS(SVG_NS, "defs");
  const filter = doc.createElementNS(SVG_NS, "filter");
  const image = doc.createElementNS(SVG_NS, "feImage");
  const displacement = doc.createElementNS(SVG_NS, "feDisplacementMap");
  svg.setAttribute("data-dock-refraction-defs", "");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.overflow = "hidden";
  svg.style.pointerEvents = "none";

  filter.setAttribute("id", filterId);
  filter.setAttribute("color-interpolation-filters", "sRGB");
  image.setAttribute("preserveAspectRatio", "none");
  image.setAttribute("x", "0%");
  image.setAttribute("y", "0%");
  image.setAttribute("width", "100%");
  image.setAttribute("height", "100%");
  image.setAttribute("result", "displacement-map");
  displacement.setAttribute("in", "SourceGraphic");
  displacement.setAttribute("in2", "displacement-map");
  displacement.setAttribute("scale", String(DISPLACEMENT_SCALE));
  displacement.setAttribute("xChannelSelector", "R");
  displacement.setAttribute("yChannelSelector", "G");
  displacement.setAttribute("color-interpolation-filters", "sRGB");
  defs.append(filter);
  filter.append(image, displacement);
  svg.append(defs);

  let renderedWidth = 0;
  let renderedHeight = 0;
  /** @param {number} width @param {number} height */
  function renderMap(width, height) {
    if (!(width > 0 && height > 0)) return;
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("width", String(width));
    image.setAttribute("height", String(height));
    const mapWidth = Math.max(48, Math.min(192, Math.round(width)));
    const mapHeight = Math.max(24, Math.min(64, Math.round(height)));
    if (mapWidth === renderedWidth && mapHeight === renderedHeight) return;
    renderedWidth = mapWidth;
    renderedHeight = mapHeight;
    canvas.width = mapWidth;
    canvas.height = mapHeight;
    const imageData = canvasContext.createImageData(mapWidth, mapHeight);
    imageData.data.set(createDisplacementPixels(mapWidth, mapHeight));
    canvasContext.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    image.setAttribute("href", dataUrl);
    image.setAttributeNS(XLINK_NS, "xlink:href", dataUrl);
  }

  renderMap(120, 50);
  doc.body.append(svg);
  lens.style.setProperty("--dock-refraction-filter", filterUrl);
  bottomNav.classList.add("dock-refraction-ready");

  /** @param {number} [width] @param {number} [height] */
  function refresh(width, height) {
    if (width === undefined || height === undefined) {
      width = lens.offsetWidth;
      height = lens.offsetHeight;
    }
    renderMap(width, height);
  }

  let resizeObserver = null;
  if (typeof view.ResizeObserver === "function") {
    resizeObserver = new view.ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const borderBox = entry.borderBoxSize?.[0];
        if (borderBox) refresh(borderBox.inlineSize, borderBox.blockSize);
        else refresh(lens.offsetWidth, lens.offsetHeight);
      });
    });
    resizeObserver.observe(lens);
  }

  return {
    setEngaged(engaged) {
      displacement.setAttribute("scale", String(engaged ? 42 : DISPLACEMENT_SCALE));
    },
    refresh,
    cleanup() {
      resizeObserver?.disconnect();
      svg.remove();
      lens.style.removeProperty("--dock-refraction-filter");
      bottomNav.classList.remove("dock-refraction-ready");
    },
  };
}
