import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const MAIN_ENTRY_BUDGET_BYTES = 650_000;
export const FEATURE_CHUNK_BUDGET_BYTES = 350_000;

/**
 * @param {{ distDir?: string }} [options]
 */
export async function checkBundleBudget(options = {}) {
  const distDir = options.distDir || resolve("dist");
  const manifestPath = resolve(distDir, ".vite", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const entries = Object.values(manifest).filter((chunk) => chunk.isEntry && chunk.file.endsWith(".js"));
  if (entries.length !== 1) throw new Error(`Expected one JavaScript main entry in ${manifestPath}; found ${entries.length}`);

  const [entry] = entries;
  const entrySize = (await stat(resolve(distDir, entry.file))).size;
  if (entrySize >= MAIN_ENTRY_BUDGET_BYTES) {
    throw new Error(`Main entry ${entry.file} is ${entrySize} B; budget is less than ${MAIN_ENTRY_BUDGET_BYTES} B`);
  }

  const chunks = await Promise.all(Object.values(manifest)
    .filter((chunk) => chunk.isDynamicEntry && chunk.file.endsWith(".js"))
    .map(async (chunk) => ({ file: chunk.file, size: (await stat(resolve(distDir, chunk.file))).size })));
  const oversized = chunks.find((chunk) => chunk.size >= FEATURE_CHUNK_BUDGET_BYTES);
  if (oversized) {
    throw new Error(`Feature chunk ${oversized.file} is ${oversized.size} B; budget is less than ${FEATURE_CHUNK_BUDGET_BYTES} B`);
  }

  return { entry: { file: entry.file, size: entrySize }, chunks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await checkBundleBudget();
    console.log(`Bundle budget passed: main ${result.entry.file} ${result.entry.size} B; ${result.chunks.length} feature chunks checked.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
