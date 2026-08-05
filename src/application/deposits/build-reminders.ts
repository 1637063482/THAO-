export type DepositReminderStage = "D30" | "D7" | "D1" | "D0" | "OVERDUE";

export interface ReminderDepositRecord {
  readonly institutionName: string;
  readonly productName: string;
  readonly principalVnd: number;
  readonly maturesOn: string;
  readonly reminderDays: readonly number[];
  readonly remindersEnabled: boolean;
  readonly status: string;
  readonly archivedAt: unknown | null;
}

export interface DepositReminder {
  readonly key: string;
  readonly depositId: string;
  readonly institutionName: string;
  readonly productName: string;
  readonly principalVnd: number;
  readonly maturesOn: string;
  readonly stage: DepositReminderStage;
  readonly daysUntilMaturity: number;
}

interface BuildReminderInput {
  readonly depositsById: Record<string, ReminderDepositRecord>;
  readonly acknowledgementsByKey: Record<string, unknown>;
  readonly today: string;
  readonly snoozedUntilByKey?: Record<string, number>;
  readonly nowMs?: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const advanceStages: ReadonlyArray<readonly [number, DepositReminderStage]> = [[1, "D1"], [7, "D7"], [30, "D30"]];

function dateValue(value: string): number {
  if (!DATE_RE.test(value)) throw new Error("Reminder date must use YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const parsed = Date.UTC(year, month - 1, day);
  const check = new Date(parsed);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error("Reminder date is invalid");
  return parsed;
}

function selectStage(daysUntilMaturity: number, reminderDays: readonly number[]): DepositReminderStage | null {
  if (daysUntilMaturity < 0) return "OVERDUE";
  if (daysUntilMaturity === 0) return "D0";
  const enabled = new Set(reminderDays);
  return advanceStages.find(([days]) => enabled.has(days) && daysUntilMaturity <= days)?.[1] ?? null;
}

export function buildDepositReminders({
  depositsById,
  acknowledgementsByKey,
  today,
  snoozedUntilByKey = {},
  nowMs = Date.now(),
}: BuildReminderInput): DepositReminder[] {
  const todayValue = dateValue(today);
  const reminders: DepositReminder[] = [];

  for (const [depositId, record] of Object.entries(depositsById)) {
    if (record.archivedAt !== null || record.status !== "ACTIVE" || !record.remindersEnabled) continue;
    const daysUntilMaturity = Math.floor((dateValue(record.maturesOn) - todayValue) / 86_400_000);
    const stage = selectStage(daysUntilMaturity, record.reminderDays);
    if (!stage) continue;
    const key = `${depositId}|${record.maturesOn}|${stage}`;
    if (Object.hasOwn(acknowledgementsByKey, key)) continue;
    if (Number.isFinite(snoozedUntilByKey[key]) && snoozedUntilByKey[key] > nowMs) continue;
    reminders.push({
      key,
      depositId,
      institutionName: record.institutionName,
      productName: record.productName,
      principalVnd: record.principalVnd,
      maturesOn: record.maturesOn,
      stage,
      daysUntilMaturity,
    });
  }

  return reminders.sort((a, b) => a.maturesOn.localeCompare(b.maturesOn) || a.depositId.localeCompare(b.depositId));
}
