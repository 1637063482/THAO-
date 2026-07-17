import { DomainError } from "./errors";

export type Role = "owner" | "admin" | "member" | "viewer";
export type MemberStatus = "active" | "invited" | "removed";
export type Capability = "read_ledger" | "create_transaction" | "update_own_transaction" | "manage_accounts" | "manage_budgets" | "manage_members" | "transfer_ownership";

export interface Member {
  readonly uid: string;
  readonly role: Role;
  readonly status: MemberStatus;
}

const CAPABILITIES: Record<Role, ReadonlySet<Capability>> = {
  owner: new Set(["read_ledger", "create_transaction", "update_own_transaction", "manage_accounts", "manage_budgets", "manage_members", "transfer_ownership"]),
  admin: new Set(["read_ledger", "create_transaction", "update_own_transaction", "manage_accounts", "manage_budgets", "manage_members"]),
  member: new Set(["read_ledger", "create_transaction", "update_own_transaction"]),
  viewer: new Set(["read_ledger"]),
};

export function can(member: Member | undefined, capability: Capability): boolean {
  return member?.status === "active" && CAPABILITIES[member.role].has(capability);
}

function assertNotLastOwner(members: readonly Member[], uid: string) {
  const target = members.find((member) => member.uid === uid);
  const owners = members.filter((member) => member.status === "active" && member.role === "owner");
  if (target?.status === "active" && target.role === "owner" && owners.length === 1) {
    throw new DomainError("LAST_OWNER", "The last owner cannot be removed or demoted");
  }
}

export function changeMemberRole(members: readonly Member[], uid: string, role: Role): Member[] {
  const target = members.find((member) => member.uid === uid);
  if (!target) throw new DomainError("MEMBER_NOT_FOUND", "Member not found");
  if (target.role === "owner" && role !== "owner") assertNotLastOwner(members, uid);
  return members.map((member) => member.uid === uid ? { ...member, role } : member);
}

export function removeMember(members: readonly Member[], uid: string): Member[] {
  if (!members.some((member) => member.uid === uid)) throw new DomainError("MEMBER_NOT_FOUND", "Member not found");
  assertNotLastOwner(members, uid);
  return members.map((member) => member.uid === uid ? { ...member, status: "removed" } : member);
}
