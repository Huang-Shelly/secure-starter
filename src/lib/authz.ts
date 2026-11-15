/**
 * 授權（ASVS V4 / OWASP A01）：集中式政策，預設拒絕。
 *
 * 規則：
 * 1. 每個 API 都要明確宣告需要的 permission，沒寫到的動作一律拒絕。
 * 2. 物件層級授權（防 IDOR）：查詢時把 ownerId 放進 where 條件，
 *    不要「先用 id 查出來再比對」，也不要信任前端傳來的 ownerId。
 */

export type Role = "USER" | "ADMIN";

export type Permission =
  | "note:read"
  | "note:create"
  | "note:delete"
  | "agent:run"
  | "agent:confirm"
  | "session:revoke_all"
  | "admin:audit_read";

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  USER: new Set<Permission>([
    "note:read",
    "note:create",
    "note:delete",
    "agent:run",
    "agent:confirm",
    "session:revoke_all",
  ]),
  ADMIN: new Set<Permission>([
    "note:read",
    "note:create",
    "note:delete",
    "agent:run",
    "agent:confirm",
    "session:revoke_all",
    "admin:audit_read",
  ]),
};

export interface Principal {
  id: string;
  role: Role;
}

export function hasPermission(principal: Principal | null | undefined, perm: Permission): boolean {
  if (!principal) return false;
  const perms = ROLE_PERMISSIONS[principal.role];
  return perms ? perms.has(perm) : false; // 未知角色 → 拒絕
}

/** 物件擁有者檢查（用於無法把條件放進查詢的情境） */
export function isOwner(principal: Principal | null | undefined, resource: { ownerId: string } | null): boolean {
  return !!principal && !!resource && resource.ownerId === principal.id;
}

/** 產生擁有者範圍化的 where 條件，讓 IDOR 防護成為預設寫法 */
export function ownedBy(principal: Principal, extra: Record<string, unknown> = {}) {
  return { ...extra, ownerId: principal.id };
}
