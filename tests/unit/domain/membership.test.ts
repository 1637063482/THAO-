import { describe, expect, it } from "vitest";
import { can, changeMemberRole, removeMember, type Member } from "../../../src/domain/membership";

const members: Member[] = [
  { uid: "owner", role: "owner", status: "active" },
  { uid: "admin", role: "admin", status: "active" },
  { uid: "member", role: "member", status: "active" },
  { uid: "viewer", role: "viewer", status: "active" },
];

describe("membership permissions", () => {
  it("enforces the role capability matrix", () => {
    expect(can(members[0], "manage_members")).toBe(true);
    expect(can(members[1], "manage_accounts")).toBe(true);
    expect(can(members[1], "transfer_ownership")).toBe(false);
    expect(can(members[2], "create_transaction")).toBe(true);
    expect(can(members[2], "manage_members")).toBe(false);
    expect(can(members[3], "read_ledger")).toBe(true);
    expect(can(members[3], "create_transaction")).toBe(false);
    expect(can({ ...members[0], status: "removed" }, "read_ledger")).toBe(false);
  });

  it("does not allow demoting or removing the last owner", () => {
    expect(() => changeMemberRole(members, "owner", "admin")).toThrowError(/last owner/i);
    expect(() => removeMember(members, "owner")).toThrowError(/last owner/i);
  });

  it("allows owner changes when another active owner remains", () => {
    const withTwoOwners = [...members, { uid: "owner-2", role: "owner", status: "active" } satisfies Member];
    expect(changeMemberRole(withTwoOwners, "owner", "admin").find((m) => m.uid === "owner")?.role).toBe("admin");
    expect(removeMember(withTwoOwners, "owner").find((m) => m.uid === "owner")?.status).toBe("removed");
  });
});
