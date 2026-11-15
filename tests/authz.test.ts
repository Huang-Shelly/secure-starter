import { describe, expect, it } from "vitest";
import { hasPermission, isOwner, ownedBy, type Role } from "@/lib/authz";

describe("authz", () => {
  const user = { id: "u1", role: "USER" as Role };
  const admin = { id: "a1", role: "ADMIN" as Role };

  it("預設拒絕：未登入、未知角色、未授與的權限", () => {
    expect(hasPermission(null, "note:read")).toBe(false);
    expect(hasPermission({ id: "x", role: "HACKER" as Role }, "note:read")).toBe(false);
    expect(hasPermission(user, "admin:audit_read")).toBe(false);
  });

  it("依角色授與權限", () => {
    expect(hasPermission(user, "note:create")).toBe(true);
    expect(hasPermission(admin, "admin:audit_read")).toBe(true);
  });

  it("擁有者檢查與範圍化查詢條件", () => {
    expect(isOwner(user, { ownerId: "u1" })).toBe(true);
    expect(isOwner(user, { ownerId: "u2" })).toBe(false);
    expect(ownedBy(user, { id: "n1", ownerId: "u2" })).toEqual({ id: "n1", ownerId: "u1" });
  });
});
