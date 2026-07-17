import { doc, getDoc, runTransaction, type DocumentData, type Firestore } from "firebase/firestore";
import { archiveAccount, createAccount, updateAccount, type Account, type CreateAccountInput, type UpdateAccountInput } from "../../domain/account";
import { DomainError } from "../../domain/errors";
import { createMoney } from "../../domain/money";

const SHARED_LEDGER_ID = "shared_ledger";

function assertPathSegment(value: string, field: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new DomainError("INVALID_PATH_SEGMENT", `${field} is invalid`);
}

function encode(account: Account): DocumentData {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    openingBalanceMinor: account.openingBalance.amountMinor,
    openingDate: account.openingDate,
    version: account.version,
    archivedAt: account.archivedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function decode(data: DocumentData): Account {
  return Object.freeze({
    id: data.id,
    name: data.name,
    type: data.type,
    currency: data.currency,
    openingBalance: createMoney(data.openingBalanceMinor, data.currency),
    openingDate: data.openingDate,
    version: data.version,
    archivedAt: data.archivedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class AccountRepository {
  constructor(private readonly db: Firestore, private readonly projectId: string) {
    assertPathSegment(projectId, "projectId");
  }

  private ref(id: string) {
    assertPathSegment(id, "account id");
    return doc(this.db, "artifacts", this.projectId, "public", "data", "ledgers", SHARED_LEDGER_ID, "accounts", id);
  }

  async create(input: CreateAccountInput, now: string): Promise<Account> {
    const account = createAccount(input, now);
    await runTransaction(this.db, async (transaction) => {
      const reference = this.ref(account.id);
      if ((await transaction.get(reference)).exists()) {
        throw new DomainError("ACCOUNT_ALREADY_EXISTS", "Account already exists");
      }
      transaction.set(reference, encode(account));
    });
    return account;
  }

  async get(id: string): Promise<Account | null> {
    const snapshot = await getDoc(this.ref(id));
    return snapshot.exists() ? decode(snapshot.data()) : null;
  }

  async update(id: string, expectedVersion: number, changes: UpdateAccountInput, now: string): Promise<Account> {
    return runTransaction(this.db, async (transaction) => {
      const reference = this.ref(id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new DomainError("ACCOUNT_NOT_FOUND", "Account not found");
      const updated = updateAccount(decode(snapshot.data()), expectedVersion, changes, now);
      transaction.set(reference, encode(updated));
      return updated;
    });
  }

  async archive(id: string, expectedVersion: number, now: string): Promise<Account> {
    return runTransaction(this.db, async (transaction) => {
      const reference = this.ref(id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new DomainError("ACCOUNT_NOT_FOUND", "Account not found");
      const archived = archiveAccount(decode(snapshot.data()), expectedVersion, now);
      transaction.set(reference, encode(archived));
      return archived;
    });
  }
}
