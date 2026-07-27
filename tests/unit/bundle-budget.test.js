import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkBundleBudget } from "../../scripts/check-bundle-budget.mjs";

const temporaryDirectories = [];

async function createDist(manifest, files) {
  const distDir = await mkdtemp(join(tmpdir(), "my-expense-bundle-"));
  temporaryDirectories.push(distDir);
  await mkdir(join(distDir, ".vite"));
  await writeFile(join(distDir, ".vite", "manifest.json"), JSON.stringify(manifest));
  await Promise.all(Object.entries(files).map(async ([file, size]) => {
    const output = join(distDir, file);
    await mkdir(join(output, ".."), { recursive: true });
    await writeFile(output, Buffer.alloc(size));
  }));
  return distDir;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("bundle budget", () => {
  it("accepts an entry and feature chunks below the documented byte budgets", async () => {
    const distDir = await createDist({
      "index.html": { file: "assets/index.js", isEntry: true },
      "src/js/fireworks.js": { file: "assets/fireworks.js", isDynamicEntry: true },
    }, {
      "assets/index.js": 649_999,
      "assets/fireworks.js": 349_999,
    });

    await expect(checkBundleBudget({ distDir })).resolves.toEqual({
      entry: { file: "assets/index.js", size: 649_999 },
      chunks: [{ file: "assets/fireworks.js", size: 349_999 }],
    });
  });

  it("rejects an entry or feature chunk at its byte budget", async () => {
    const distDir = await createDist({
      "index.html": { file: "assets/index.js", isEntry: true },
      "src/js/charts.js": { file: "assets/charts.js", isDynamicEntry: true },
    }, {
      "assets/index.js": 650_000,
      "assets/charts.js": 350_000,
    });

    await expect(checkBundleBudget({ distDir })).rejects.toThrow(
      "Main entry assets/index.js is 650000 B; budget is less than 650000 B",
    );
  });
});
