import { describe, expect, it, vi } from "vitest";
import { downloadRecoveryFile, importLegacyLedgerWithRecovery, sha256Hex } from "../../src/js/sync.js";
import { validateLegacyImport } from "../../src/js/import-schema.js";

const currentLedger = () => ({
  balances: { "bal-bank": "1000" },
  entries: { "1_1_dining": "200", "1_1_remark": "old note" },
  settings: { budget_1: 3000 },
});

const importedLedger = () => ({
  balances: { "bal-bank": "9000" },
  entries: { "1_2_dining": "400" },
  settings: { budget_1: 5000 },
});

function textOf(data) {
  return JSON.stringify(data);
}

function harness(overrides = {}) {
  const written = [];
  const downloads = [];
  const current = currentLedger();
  return {
    current,
    written,
    downloads,
    options: {
      year: 2026,
      importedText: textOf(importedLedger()),
      confirmOverwrite: vi.fn(() => true),
      readCurrentLedger: vi.fn(async () => current),
      downloadRecovery: vi.fn(async (recovery) => downloads.push(recovery)),
      writeLedger: vi.fn(async (ledger) => written.push(ledger)),
      now: vi.fn(() => "2026-07-19T10:00:00.000Z"),
      makeHash: vi.fn(async (serialized) => `hash-${serialized.length}`),
      ...overrides,
    },
  };
}

describe("import recovery backup", () => {
  it("computes a stable SHA-256 hash for recovery content", async () => {
    await expect(sha256Hex("abc")).resolves.toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("cancels before backup or overwrite", async () => {
    const h = harness({ confirmOverwrite: vi.fn(() => false) });

    await expect(importLegacyLedgerWithRecovery(h.options)).resolves.toEqual({ ok: false, reason: "cancelled" });

    expect(h.options.readCurrentLedger).not.toHaveBeenCalled();
    expect(h.options.downloadRecovery).not.toHaveBeenCalled();
    expect(h.options.writeLedger).not.toHaveBeenCalled();
    expect(h.written).toEqual([]);
  });

  it("stops before overwrite when the recovery download fails", async () => {
    const h = harness({ downloadRecovery: vi.fn(async () => { throw new Error("download unavailable"); }) });

    await expect(importLegacyLedgerWithRecovery(h.options)).rejects.toMatchObject({ code: "BACKUP_FAILED" });

    expect(h.options.readCurrentLedger).toHaveBeenCalledTimes(1);
    expect(h.options.writeLedger).not.toHaveBeenCalled();
    expect(h.written).toEqual([]);
  });

  it("stops before overwrite when the current ledger cannot become a valid recovery file", async () => {
    const h = harness({
      readCurrentLedger: vi.fn(async () => ({
        balances: {},
        entries: [],
        settings: {},
      })),
    });

    await expect(importLegacyLedgerWithRecovery(h.options)).rejects.toMatchObject({ code: "BACKUP_FAILED" });

    expect(h.options.downloadRecovery).not.toHaveBeenCalled();
    expect(h.options.writeLedger).not.toHaveBeenCalled();
    expect(h.written).toEqual([]);
  });

  it("does not mutate the imported ledger or log financial data when overwrite write fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const h = harness({ writeLedger: vi.fn(async () => { throw new Error("write failed"); }) });

    await expect(importLegacyLedgerWithRecovery(h.options)).rejects.toThrow("write failed");

    expect(h.options.downloadRecovery).toHaveBeenCalledTimes(1);
    expect(h.options.writeLedger).toHaveBeenCalledWith(importedLedger());
    expect(h.written).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("downloads a schema-valid recovery file with a matching hash before overwrite", async () => {
    const h = harness();

    await expect(importLegacyLedgerWithRecovery(h.options)).resolves.toMatchObject({ ok: true });

    expect(h.downloads).toHaveLength(1);
    const recovery = h.downloads[0];
    expect(recovery.fileName).toBe("my-expense-app-recovery-2026-20260719T100000000Z-hash-116.json");
    expect(recovery.hash).toBe("hash-116");
    expect(recovery.data).toEqual(currentLedger());
    expect(recovery.serialized).toBe(textOf(currentLedger()));
    expect(validateLegacyImport(JSON.parse(recovery.serialized))).toEqual({ ok: true, data: currentLedger() });
    expect(h.written).toEqual([importedLedger()]);
  });

  it("creates a recovery point for each repeated overwrite", async () => {
    let tick = 0;
    const h = harness({
      now: vi.fn(() => `2026-07-19T10:00:0${tick++}.000Z`),
    });

    await importLegacyLedgerWithRecovery(h.options);
    await importLegacyLedgerWithRecovery(h.options);

    expect(h.downloads.map((recovery) => recovery.fileName)).toEqual([
      "my-expense-app-recovery-2026-20260719T100000000Z-hash-116.json",
      "my-expense-app-recovery-2026-20260719T100001000Z-hash-116.json",
    ]);
    expect(h.written).toEqual([importedLedger(), importedLedger()]);
  });

  it("persists and verifies the recovery locally before dispatching the download", async () => {
    const stored = new Map();
    const storage = {
      setItem: vi.fn((key, value) => stored.set(key, value)),
      getItem: vi.fn((key) => stored.get(key)),
    };
    const link = { click: vi.fn() };
    const documentRef = { createElement: vi.fn(() => link) };
    const urlApi = {
      createObjectURL: vi.fn(() => "blob:recovery"),
      revokeObjectURL: vi.fn(),
    };
    const recovery = {
      fileName: "my-expense-app-recovery-2026-test-hash.json",
      hash: "hash",
      serialized: textOf(currentLedger()),
    };

    await expect(downloadRecoveryFile(recovery, { storage, documentRef, urlApi })).resolves.toMatchObject({
      fileName: recovery.fileName,
      hash: recovery.hash,
      storageKey: "myExpenseApp.importRecovery.my-expense-app-recovery-2026-test-hash.json",
    });

    expect(storage.setItem).toHaveBeenCalledWith("myExpenseApp.importRecovery.my-expense-app-recovery-2026-test-hash.json", JSON.stringify({
      fileName: recovery.fileName,
      hash: recovery.hash,
      serialized: recovery.serialized,
    }));
    expect(storage.getItem).toHaveBeenCalledWith("myExpenseApp.importRecovery.my-expense-app-recovery-2026-test-hash.json");
    expect(documentRef.createElement).toHaveBeenCalledWith("a");
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:recovery");
  });

  it("retains each production recovery under a distinct verified local key", async () => {
    const stored = new Map();
    const storage = {
      setItem: vi.fn((key, value) => stored.set(key, value)),
      getItem: vi.fn((key) => stored.get(key)),
    };
    const link = { click: vi.fn() };
    const documentRef = { createElement: vi.fn(() => link) };
    const urlApi = {
      createObjectURL: vi.fn((blob) => `blob:${blob.size}:${urlApi.createObjectURL.mock.calls.length}`),
      revokeObjectURL: vi.fn(),
    };
    const firstRecovery = {
      fileName: "my-expense-app-recovery-2026-first-hash.json",
      hash: "first-hash",
      serialized: textOf(currentLedger()),
    };
    const secondRecovery = {
      fileName: "my-expense-app-recovery-2026-second-hash.json",
      hash: "second-hash",
      serialized: textOf({ ...currentLedger(), settings: { budget_1: 4000 } }),
    };

    await expect(downloadRecoveryFile(firstRecovery, { storage, documentRef, urlApi })).resolves.toMatchObject({
      storageKey: "myExpenseApp.importRecovery.my-expense-app-recovery-2026-first-hash.json",
    });
    await expect(downloadRecoveryFile(secondRecovery, { storage, documentRef, urlApi })).resolves.toMatchObject({
      storageKey: "myExpenseApp.importRecovery.my-expense-app-recovery-2026-second-hash.json",
    });

    expect(stored.get("myExpenseApp.importRecovery.my-expense-app-recovery-2026-first-hash.json")).toBe(JSON.stringify({
      fileName: firstRecovery.fileName,
      hash: firstRecovery.hash,
      serialized: firstRecovery.serialized,
    }));
    expect(stored.get("myExpenseApp.importRecovery.my-expense-app-recovery-2026-second-hash.json")).toBe(JSON.stringify({
      fileName: secondRecovery.fileName,
      hash: secondRecovery.hash,
      serialized: secondRecovery.serialized,
    }));
    expect(link.click).toHaveBeenCalledTimes(2);
  });

  it("refuses the recovery download when local persistence cannot be verified", async () => {
    const storage = {
      setItem: vi.fn(),
      getItem: vi.fn(() => null),
    };
    const link = { click: vi.fn() };
    const documentRef = { createElement: vi.fn(() => link) };
    const urlApi = {
      createObjectURL: vi.fn(() => "blob:recovery"),
      revokeObjectURL: vi.fn(),
    };
    const recovery = {
      fileName: "my-expense-app-recovery-2026-test-hash.json",
      hash: "hash",
      serialized: textOf(currentLedger()),
    };

    await expect(downloadRecoveryFile(recovery, { storage, documentRef, urlApi })).rejects.toMatchObject({ code: "BACKUP_FAILED" });

    expect(link.click).not.toHaveBeenCalled();
    expect(urlApi.createObjectURL).not.toHaveBeenCalled();
  });
});
