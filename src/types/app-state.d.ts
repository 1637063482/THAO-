export interface AppRoute {
  id: string;
  elementId: string;
}

export interface AppRouteTransition {
  from: string | null;
  to: string | null;
}

export type AppRouteLifecycle = Record<
  string,
  Partial<Record<"enter" | "leave", (transition: AppRouteTransition) => void | Promise<void>>>
>;

export interface AppRouterOptions {
  root?: Document;
  routes?: readonly AppRoute[];
  lifecycle?: AppRouteLifecycle;
}

export interface AppRouter {
  getActive(): string | null;
  navigate(routeId: string): boolean;
  start(initialRoute?: string): boolean;
  stop(): boolean;
}

export type AppLocale = "vi" | "zh-CN";
export type LedgerSettingValue = string | number | boolean | null | undefined;
export type LedgerSettings = Record<string, LedgerSettingValue>;
export type LedgerValue = string | number;
export type LedgerEntries = Record<string, LedgerValue | Record<string, LedgerValue>>;

export interface LedgerDocumentState {
  balances: Record<string, LedgerValue>;
  entries: LedgerEntries;
  settings: LedgerSettings;
}

export interface PendingLedgerUpdates {
  balances: Record<string, LedgerValue>;
  entries: LedgerEntries;
  settings: LedgerSettings;
}

export interface LedgerDate {
  year: number;
  month: number;
  day: number;
  dateKey: string;
}

export interface AuthUser {
  uid: string;
}

export interface ApplicationState {
  activeYear: number;
  activeMonthId: number;
  currentCurrency: "VND" | "CNY";
  fxMode: "auto" | "manual";
  fxRateAuto: number | null;
  fxRateManual: number;
  isSaving: boolean;
  isFirstLoad: boolean;
  currentUser: AuthUser | null;
  appState: LedgerDocumentState;
  depositDocument: import("../infrastructure/firebase/deposit-repository").DepositStorageDocument;
  previousYearEntries: LedgerEntries;
  pendingUpdates: PendingLedgerUpdates;
  yearlyCatSums: Record<string, number>;
  monthlyCatSums: Record<string, number>;
  totalRecords: number;
  currentStreak: number;
  monthsUnderBudget: number;
  categoriesUsed: number;
  unlockedAchievements: string[];
}

export interface SavingsState {
  settings: LedgerSettings;
  pendingUpdates: LedgerSettings;
  month: number;
}

export interface DashboardViewModel {
  totalIncome: number;
  totalSpending: number;
}

export interface SavingsControllerDependencies {
  root?: HTMLElement | null;
  getSavingsState?: () => SavingsState;
  getLocale?: () => AppLocale;
  getDashboardViewModel?: (month: number) => DashboardViewModel;
  triggerCloudSave?: () => void;
}

export interface SavingsViewModelInput {
  settings?: LedgerSettings;
  month: number;
  monthlyIncome?: number;
  monthlyExpense?: number;
  annualIncome?: number;
  annualExpense?: number;
  locale?: AppLocale;
  status?: string;
}

export interface SavingsViewModel {
  locale: AppLocale;
  month: number;
  goals: {
    monthly: Array<number | null>;
    annual: number | null;
  };
  monthlyActual: number;
  annualActual: number;
  monthly: import("../domain/savings-goal").SavingsProgress;
  annual: import("../domain/savings-goal").SavingsProgress;
  status: string;
}

export interface SavingsGoalFormOptions {
  settings: LedgerSettings;
  pendingUpdates: LedgerSettings;
  month: number;
  locale?: AppLocale;
  onSave?: () => void;
  onStatus?: (status: string, error?: unknown) => void;
  confirm?: (message: string) => boolean;
}

export type Translate = (
  key: string,
  replacements?: Record<string, string | number>,
) => string;

export interface LifecycleController {
  start(): void;
  stop(): void;
}

export interface LedgerYearController extends LifecycleController {
  changeYear(value: string | number): boolean;
  refreshLabels(): void;
}

export interface LedgerSyncController {
  start(callbacks: {
    onSnapshotApplied: () => void;
    onStreakRefresh: () => void;
  }): void;
  stop(): void;
}

export interface LedgerClock {
  getToday(): LedgerDate;
  getNextMidnightDelay(): number;
}

export interface LedgerControllerDependencies {
  state: ApplicationState;
  documentRoot: Document;
  windowRoot: Window;
  inputController: LifecycleController;
  yearController: LedgerYearController;
  sync: LedgerSyncController;
  clock: LedgerClock;
  renderLedger: () => void;
  softRenderLedger: () => void;
  renderStreak: () => void;
  updateStreakFromSnapshot: (options: { launchDefaultFireworks: boolean }) => void;
  refreshDashboardForMonth: () => void;
  refreshDashboard: () => void;
  refreshSavings: () => void;
  scheduleIcons: () => void;
  notifyDomRebuilt: () => void;
  translate: Translate;
  setTimer?: (callback: () => void, delay: number) => number;
  clearTimer?: (timer: number) => void;
}

export interface CurrencyParseOptions {
  currency: "VND" | "CNY";
  rate: number;
  previousRawVnd?: string;
  previousViewValue?: string;
  evaluate: (value: string) => string | number;
}

export interface LedgerInputControllerDependencies {
  state: ApplicationState;
  root: Document | HTMLElement;
  windowRoot: Window;
  getActiveRate: () => number | null;
  isValidCurrencyRate: (rate: number | null) => rate is number;
  parseCurrencyInputToVnd: (value: string, options: CurrencyParseOptions) => string;
  formatVndForCurrencyInput: (
    value: string | undefined,
    currency: "VND" | "CNY",
    rate: number | null,
  ) => string;
  formatDisplay: (value: string | number) => string;
  evaluate: (value: string) => string | number;
  updateActivity: () => void;
  triggerSave: () => void;
  refreshCalculatedViews: () => void;
  refreshDashboard: () => void;
  updateStreak: () => void;
  showFxUnavailable: () => void;
  isOnline?: () => boolean;
  getUnsavedWarning?: () => string;
  setTimer?: (callback: () => void, delay: number) => number;
  clearTimer?: (timer: number) => void;
}

export interface LedgerYearControllerDependencies {
  state: ApplicationState;
  documentRoot: Document;
  getToday: () => LedgerDate;
  isOnline: () => boolean;
  translate: Translate;
  showBlocked: (message: string) => void;
  resetYearState: () => void;
  resubscribe: () => void;
  switchMonth: (month: number) => boolean;
}

export type StoredDeposit = import(
  "../infrastructure/firebase/deposit-repository"
).StoredDeposit;
export type DepositInput = import(
  "../infrastructure/firebase/deposit-repository"
).DepositInput;
export type DepositChanges = import(
  "../infrastructure/firebase/deposit-repository"
).DepositChanges;
export type DepositStorageDocument = import(
  "../infrastructure/firebase/deposit-repository"
).DepositStorageDocument;
export type DepositRepository = import(
  "../infrastructure/firebase/deposit-repository"
).DepositRepository;
export type DepositFilter = "all" | "active" | "maturing" | "matured" | "archived";
export type DepositUiStatus = "loading" | "syncing" | "synced" | "offline" | "error";

export interface DepositViewItem extends StoredDeposit {
  domain: import("../domain/deposit").Deposit;
  derivedStatus: import("../domain/deposit").DerivedDepositStatus;
  calculatedInterestVnd: number;
  interestRecorded: boolean;
}

export interface DepositViewModelInput {
  document: DepositStorageDocument;
  today: string;
  locale?: AppLocale;
  status?: DepositUiStatus;
  errorMessage?: string;
  filter?: DepositFilter;
  ledgerEntries?: LedgerEntries;
}

export interface DepositViewModel {
  locale: AppLocale;
  status: DepositUiStatus;
  errorMessage: string;
  filter: DepositFilter;
  visible: DepositViewItem[];
  summary: import("../domain/deposit").DepositSummary;
  totalPrincipalVnd: number;
  nearest: DepositViewItem | null;
  acknowledgementCount: number;
}

export type DepositLabels = Record<string, string>;

export interface DepositRenderOptions {
  locale: AppLocale;
  labels: DepositLabels;
  money: (value: number | null | undefined, locale: AppLocale) => string;
  productLabel: (value: unknown, locale: AppLocale) => string;
  escape: (value: unknown) => string;
}

export interface DepositManagementBindings {
  onAdd?: () => void;
  onEdit?: (id: string) => void;
  onArchive?: (id: string) => Promise<void> | void;
  onFilter?: (filter: DepositFilter) => void;
  onRedeem?: (id: string) => void;
  onRollover?: (id: string) => void;
  onRecordInterest?: (id: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  confirm?: (message: string) => boolean;
}

export interface DepositFormRenderOptions {
  locale?: AppLocale;
  id: string;
  deposit?: Omit<StoredDeposit, "id"> | null;
}

export interface DepositFormBindings {
  locale?: AppLocale;
  onSubmit?: (
    input: DepositInput,
    metadata: { expectedVersion: number },
  ) => Promise<void> | void;
  onClose?: () => void;
}

export type DepositSettlementInput =
  | {
      mode: "redeem";
      settledOn: string;
      actualInterestVnd: number | null;
      writeInterestToLedger: boolean;
    }
  | {
      mode: "rollover";
      actualInterestVnd: number | null;
      writeInterestToLedger: boolean;
      rollover: Omit<import("../application/deposits/settle-deposit").RolloverInput, "id">;
    };

export interface DepositSettlementRenderOptions {
  locale?: AppLocale;
  deposit: StoredDeposit;
  mode?: "redeem" | "rollover";
  today: string;
}

export interface DepositSettlementBindings {
  locale?: AppLocale;
  onSubmit?: (input: DepositSettlementInput) => Promise<void> | void;
  onClose?: () => void;
  confirm?: (message: string) => boolean;
}

export interface DepositSnapshotCallbacks {
  onChange?: (
    document: DepositStorageDocument,
    metadata: { fromCache?: boolean },
  ) => void;
  onError?: (error: unknown) => void;
}

export interface DepositControllerDependencies {
  state: ApplicationState;
  hosts: {
    root: HTMLElement | null;
    form: HTMLElement | null;
    reminder: HTMLElement | null;
  };
  createRepository: (user: AuthUser) => DepositRepository;
  subscribe: (callbacks: DepositSnapshotCallbacks) => () => void;
  getToday: () => string;
  getNextMidnightDelay: () => number;
  getLocale: () => AppLocale;
  queueLegacyInterest: (input: {
    amountVnd: number;
    dateKey: string;
    operationId: string;
  }) => Promise<unknown> | unknown;
  confirm: (message: string) => boolean;
  isOnline: () => boolean;
  isDocumentHidden: () => boolean;
  addRuntimeListener: (
    target: "document" | "window",
    type: string,
    listener: EventListener,
  ) => () => void;
  setTimer: (callback: () => void, delay: number) => number;
  clearTimer: (timer: number) => void;
}

export interface DepositDependenciesInput {
  db: import("firebase/firestore").Firestore;
  projectId: string;
  state: ApplicationState;
  getToday: () => string;
  getNextMidnightDelay: () => number;
  getLocale: () => AppLocale;
  queueLegacyInterest: DepositControllerDependencies["queueLegacyInterest"];
  documentRoot?: Document;
  windowRoot?: Window;
  confirm?: (message: string) => boolean;
}

export interface DepositReminderControllerDependencies {
  root: HTMLElement | null;
  getDocument: () => DepositStorageDocument;
  getToday: () => string;
  getLocale: () => AppLocale;
  isAuthenticated: () => boolean;
  isReady: () => boolean;
  isOffline: () => boolean;
  acknowledge: (key: string) => Promise<unknown> | unknown;
  storage?: Storage | null;
  now?: () => number;
  snoozeMs?: number;
}
