import { readFileSync } from "node:fs";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import {
  DepositRepository,
  type DepositInput,
  type StoredDeposit,
} from "../../src/infrastructure/firebase/deposit-repository";
// @ts-expect-error Delivered JavaScript form module intentionally has no declaration file.
import { bindDepositForm, renderDepositForm } from "../../src/features/deposits/form.js";
// @ts-expect-error Delivered JavaScript term module intentionally has no declaration file.
import { depositTermOptions } from "../../src/features/deposits/terms.js";

export const FIREBASE_PROJECT_ID = "demo-no-project";
export const APP_PROJECT_ID = "synthetic-expense-app";
export const ACTOR_UID = "synthetic-deposit-owner";

const auth = {
  uid: ACTOR_UID,
  email: "owner.fixture@example.invalid",
};

export interface DepositEmulatorFixture {
  env: RulesTestEnvironment;
  repository: DepositRepository;
  clear(): Promise<void>;
  freshRepository(): DepositRepository;
}

function repositoryFor(env: RulesTestEnvironment): DepositRepository {
  const db = env.authenticatedContext(auth.uid, { email: auth.email }).firestore() as unknown as Firestore;
  return new DepositRepository(db, APP_PROJECT_ID, auth.uid);
}

export async function createDepositEmulatorFixture(): Promise<DepositEmulatorFixture> {
  const env = await initializeTestEnvironment({
    projectId: FIREBASE_PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });

  return {
    env,
    repository: repositoryFor(env),
    clear: () => env.clearFirestore(),
    freshRepository: () => repositoryFor(env),
  };
}

export interface SyntheticDepositFormValues {
  institutionName: string;
  productName?: string;
  principalVnd: string;
  annualRatePercent: string;
  openedOn: string;
  note: string;
}

export function syntheticDepositFormValues(
  overrides: Partial<SyntheticDepositFormValues> = {},
): SyntheticDepositFormValues {
  return {
    institutionName: "Synthetic Bank A",
    productName: "1Y",
    principalVnd: "12000000",
    annualRatePercent: "4.75",
    openedOn: "2026-02-01",
    note: "synthetic critical-path fixture",
    ...overrides,
  };
}

export function syntheticDepositInput(overrides: Partial<DepositInput> = {}): DepositInput {
  return {
    id: "synthetic-deposit-legacy",
    institutionName: "Synthetic Bank Legacy",
    productName: "1Y",
    principalVnd: 9_000_000,
    annualRatePpm: 42_500,
    openedOn: "2025-05-15",
    maturesOn: "2026-05-15",
    expectedInterestVnd: null,
    actualInterestVnd: null,
    reminderDays: [30, 7, 1],
    remindersEnabled: true,
    status: "ACTIVE",
    redeemedOn: null,
    rolledOverToDepositId: null,
    note: "synthetic legacy term fixture",
    ...overrides,
  };
}

export function vietnameseLegacyTerm(code: string): string {
  const term = depositTermOptions("vi").find((option: { code: string }) => option.code === code);
  if (!term) throw new Error(`Unknown synthetic term code: ${code}`);
  return term.label;
}

function field(form: HTMLFormElement, name: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const element = form.elements.namedItem(name);
  if (!(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLSelectElement) &&
      !(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Delivered deposit form is missing ${name}`);
  }
  return element;
}

function setField(
  form: HTMLFormElement,
  name: string,
  value: string,
  eventType: "input" | "change",
): void {
  const element = field(form, name);
  element.value = value;
  element.dispatchEvent(new Event(eventType, { bubbles: true }));
}

export async function submitRenderedDepositForm(options: {
  repository: DepositRepository;
  id: string;
  locale: "vi" | "zh-CN";
  values: SyntheticDepositFormValues;
  deposit?: StoredDeposit;
}): Promise<StoredDeposit> {
  const root = document.createElement("div");
  document.body.append(root);
  root.innerHTML = renderDepositForm({
    locale: options.locale,
    id: options.id,
    deposit: options.deposit ?? null,
  });

  const form = root.querySelector<HTMLFormElement>("[data-deposit-form]");
  if (!form) throw new Error("Delivered deposit form did not render");

  let submitReachedRepository = false;
  const completed = new Promise<StoredDeposit>((resolve, reject) => {
    bindDepositForm(root, {
      locale: options.locale,
      async onSubmit(input: DepositInput, { expectedVersion }: { expectedVersion: number }) {
        submitReachedRepository = true;
        try {
          const { id, ...changes } = input;
          const stored = options.deposit
            ? await options.repository.update(id, expectedVersion, changes)
            : await options.repository.create(input);
          resolve(stored);
        } catch (error) {
          reject(error);
          throw error;
        }
      },
    });
  });

  setField(form, "institutionName", options.values.institutionName, "input");
  if (options.values.productName !== undefined) {
    setField(form, "productName", options.values.productName, "change");
  }
  setField(form, "principalVnd", options.values.principalVnd, "input");
  setField(form, "annualRatePercent", options.values.annualRatePercent, "input");
  setField(form, "openedOn", options.values.openedOn, "change");
  setField(form, "note", options.values.note, "input");
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await Promise.resolve();

  const formError = form.querySelector<HTMLElement>("[data-form-error]")?.textContent?.trim();
  if (formError) throw new Error(`Delivered deposit form rejected synthetic input: ${formError}`);
  if (!submitReachedRepository) throw new Error("Delivered deposit form did not reach the repository");
  return completed;
}
