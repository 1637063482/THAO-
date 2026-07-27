import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensions = ["", ".js", ".mjs", ".ts", ".tsx", ".jsx", ".css"];

export const DEPRECATED_MODULES = [
  "src/domain/account.ts",
  "src/domain/transaction.ts",
  "src/domain/money.ts",
  "src/application/accounts/manage-account.ts",
  "src/application/transactions/create-transaction.ts",
  "src/application/transactions/update-transaction.ts",
  "src/infrastructure/firebase/account-repository.ts",
];

function toProjectPath(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

async function existingFile(file) {
  try {
    await access(file);
    return file;
  } catch {
    return null;
  }
}

async function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("/src/")) return null;

  const unresolved = specifier.startsWith("/")
    ? path.join(projectRoot, specifier)
    : path.resolve(path.dirname(fromFile), specifier);
  for (const extension of extensions) {
    const resolved = await existingFile(unresolved + extension);
    if (resolved) return resolved;
  }
  return null;
}

function staticSpecifiers(source) {
  const matches = source.matchAll(/(?:import|export)\\s+(?:[^"']*?\\s+from\\s+)?["']([^"']+)["']/g);
  return [...matches].map((match) => match[1]);
}

async function entryFiles() {
  const index = await readFile(path.join(projectRoot, "index.html"), "utf8");
  const scripts = [...index.matchAll(/<script\\b[^>]*\\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("/src/"));
  return ["src/js/main.js", ...scripts.map((specifier) => specifier.slice(1))];
}

export async function collectProductionImportGraph() {
  const reachable = new Set();
  const pending = (await entryFiles()).map((entry) => path.join(projectRoot, entry));

  while (pending.length > 0) {
    const current = pending.pop();
    const relative = toProjectPath(current);
    if (reachable.has(relative)) continue;

    reachable.add(relative);
    const source = await readFile(current, "utf8");
    for (const specifier of staticSpecifiers(source)) {
      const resolved = await resolveImport(current, specifier);
      if (resolved) pending.push(resolved);
    }
  }

  return [...reachable].sort();
}

export async function assertNoDeprecatedProductionImports() {
  const graph = await collectProductionImportGraph();
  const reachableDeprecatedModules = DEPRECATED_MODULES.filter((module) => graph.includes(module));
  if (reachableDeprecatedModules.length > 0) {
    throw new Error(`Production import graph reaches deprecated modules: ${reachableDeprecatedModules.join(", ")}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await assertNoDeprecatedProductionImports();
  console.log("Production import graph does not reach deprecated account or transaction modules.");
}
