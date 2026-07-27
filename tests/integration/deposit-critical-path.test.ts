import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createDepositEmulatorFixture,
  submitRenderedDepositForm,
  syntheticDepositInput,
  syntheticDepositFormValues,
  vietnameseLegacyTerm,
  type DepositEmulatorFixture,
} from "../helpers/deposit-emulator-fixture";

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("deposit critical path", () => {
  let fixture: DepositEmulatorFixture;

  beforeAll(async () => {
    fixture = await createDepositEmulatorFixture();
  });
  beforeEach(async () => fixture.clear());
  afterAll(async () => fixture?.env.cleanup());

  it("creates the first deposit through the delivered form and repository", async () => {
    await submitRenderedDepositForm({
      repository: fixture.repository,
      id: "synthetic-deposit-1",
      locale: "vi",
      values: syntheticDepositFormValues(),
    });

    const document = await fixture.repository.getDocument();
    expect(Object.keys(document.depositsById)).toEqual(["synthetic-deposit-1"]);
  });

  it("creates a second deposit without replacing the first", async () => {
    await submitRenderedDepositForm({
      repository: fixture.repository,
      id: "synthetic-deposit-1",
      locale: "vi",
      values: syntheticDepositFormValues(),
    });
    await submitRenderedDepositForm({
      repository: fixture.repository,
      id: "synthetic-deposit-2",
      locale: "vi",
      values: syntheticDepositFormValues({
        institutionName: "Synthetic Bank B",
        productName: "6M",
        principalVnd: "7000000",
        openedOn: "2026-03-10",
      }),
    });

    const document = await fixture.repository.getDocument();
    expect(Object.keys(document.depositsById).sort()).toEqual([
      "synthetic-deposit-1",
      "synthetic-deposit-2",
    ]);
    expect(document.depositsById["synthetic-deposit-1"].institutionName).toBe("Synthetic Bank A");
    expect(document.depositsById["synthetic-deposit-2"].institutionName).toBe("Synthetic Bank B");
  });

  it("reads both deposits after creating a fresh repository instance", async () => {
    await submitRenderedDepositForm({
      repository: fixture.repository,
      id: "synthetic-deposit-1",
      locale: "vi",
      values: syntheticDepositFormValues(),
    });
    await submitRenderedDepositForm({
      repository: fixture.repository,
      id: "synthetic-deposit-2",
      locale: "vi",
      values: syntheticDepositFormValues({
        institutionName: "Synthetic Bank B",
        productName: "3M",
        openedOn: "2026-04-20",
      }),
    });

    const reloaded = await fixture.freshRepository().getDocument();
    expect(Object.keys(reloaded.depositsById).sort()).toEqual([
      "synthetic-deposit-1",
      "synthetic-deposit-2",
    ]);
    expect(reloaded.depositsById["synthetic-deposit-1"].productName).toBe("1Y");
    expect(reloaded.depositsById["synthetic-deposit-2"].productName).toBe("3M");
  });

  it("edits a Vietnamese legacy term while the UI is Chinese", async () => {
    const legacyLabel = vietnameseLegacyTerm("1Y");
    const legacy = await fixture.repository.create(syntheticDepositInput({
      productName: legacyLabel,
    }));
    expect(legacy.productName).toBe(legacyLabel);
    expect(legacy.productName).not.toBe("1Y");

    await submitRenderedDepositForm({
      repository: fixture.repository,
      id: legacy.id,
      locale: "zh-CN",
      deposit: legacy,
      values: syntheticDepositFormValues({
        institutionName: legacy.institutionName,
        productName: undefined,
        principalVnd: String(legacy.principalVnd),
        annualRatePercent: String(legacy.annualRatePpm / 10_000),
        openedOn: legacy.openedOn,
        note: "synthetic Chinese UI edit",
      }),
    });

    const reloaded = await fixture.freshRepository().get(legacy.id);
    expect(reloaded).toMatchObject({
      productName: "1Y",
      version: 2,
      note: "synthetic Chinese UI edit",
    });
  });
});
