/**
 * 共用的輸入檢查。PostgreSQL 的 text 欄位不接受 NUL（\u0000），
 * 也常被用來截斷字串繞過檢查，所以在進入 schema 驗證前就整體拒絕。
 */
export function containsNul(value: unknown, depth = 0): boolean {
  if (depth > 32) return true; // 過深的巢狀結構一律視為不合法
  if (typeof value === "string") return value.includes("\u0000");
  if (Array.isArray(value)) return value.some((v) => containsNul(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => k.includes("\u0000") || containsNul(v, depth + 1));
  }
  return false;
}
