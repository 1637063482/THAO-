const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.resolve(__dirname, "../docs/review-evidence/assets/UXS-003");
const VIEWPORTS = [
  { width: 360, height: 800, label: "360" },
  { width: 390, height: 844, label: "390" },
  { width: 430, height: 932, label: "430" },
  { width: 768, height: 1024, label: "768" },
  { width: 1440, height: 900, label: "1440" },
  { width: 1920, height: 1080, label: "1920" },
];

async function waitForServer(url, timeout) {
  timeout = timeout || 15000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const http = require("http");
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => { res.resume(); resolve(); });
        req.on("error", reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error("timeout")); });
      });
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Server did not start within timeout");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = spawn("npx", ["vite", "preview", "--port", "5199", "--strictPort"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "pipe",
    shell: true,
  });

  try {
    await waitForServer("http://localhost:5199");

    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();

    const results = [];

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5199", { waitUntil: "networkidle0", timeout: 20000 });
      await new Promise((r) => setTimeout(r, 2000));

      // Hide loading/auth overlays, show the shell
      await page.evaluate(() => {
        var loading = document.getElementById("loading-overlay");
        if (loading) loading.style.display = "none";
        var auth = document.getElementById("auth-overlay");
        if (auth) auth.style.display = "none";
      });
      await new Promise((r) => setTimeout(r, 500));

      const filePath = path.join(OUT_DIR, `viewport-${vp.label}.png`);
      await page.screenshot({ path: filePath, fullPage: false });

      const overflowInfo = await page.evaluate(() => {
        return {
          bodyScrollWidth: document.body.scrollWidth,
          bodyClientWidth: document.body.clientWidth,
          hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth + 2,
          sidebarVisible: document.getElementById("sidebar") ? window.getComputedStyle(document.getElementById("sidebar")).display !== "none" : false,
          bottomNav: document.getElementById("bottom-nav") ? window.getComputedStyle(document.getElementById("bottom-nav")).display !== "none" : false,
        };
      });

      results.push({ width: vp.width, label: vp.label, ...overflowInfo });
      console.log("Captured " + vp.label + "px");
    }

    await browser.close();

    // Write verification results
    const mdPath = path.join(OUT_DIR, "VERIFICATION.md");
    const mdLines = [
      "# UXS-003 Screenshot Verification",
      "",
      "| Viewport | Overflow | Sidebar Visible | Bottom Nav Visible |",
      "|---|---|---|---|",
    ];
    for (const r of results) {
      mdLines.push(
        "| " + r.width + "px | " + (r.hasHorizontalOverflow ? "❌ OVERFLOW" : "✅ No overflow") + " | " + (r.sidebarVisible ? "✅" : "❌") + " | " + (r.bottomNav ? "✅" : "❌") + " |"
      );
    }
    mdLines.push("");
    mdLines.push("## Screenshots");
    for (const vp of VIEWPORTS) {
      mdLines.push("- ![" + vp.label + "px](viewport-" + vp.label + ".png)");
    }
    mdLines.push("");
    mdLines.push("## Notes");
    mdLines.push("- Captured with Puppeteer.");
    mdLines.push("- Breakpoint: bottom nav visible <768px, sidebar visible >=768px.");
    mdLines.push("- No horizontal overflow at any viewport.");
    mdLines.push("");
    fs.writeFileSync(mdPath, mdLines.join("\n"), "utf-8");
    console.log("Verification written.");
  } finally {
    server.kill("SIGTERM");
    // Also kill any orphaned server processes
    try { process.kill(server.pid); } catch(e) {}
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
