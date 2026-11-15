/**
 * 取得用戶端 IP。只有在明確設定 TRUSTED_PROXY_HOPS 時才採用 X-Forwarded-For，
 * 否則攻擊者可以偽造標頭（X-Forwarded-For / X-Real-IP）輪換 IP 來繞過速率限制。
 * 無法判斷時回傳 "unknown"，由呼叫端改用較寬鬆的全域限流。
 */
export function clientIp(headers: Headers, trustedProxyHops: number): string {
  if (trustedProxyHops <= 0) return "unknown";
  const xff = headers.get("x-forwarded-for");
  if (!xff) return "unknown";
  const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
  // 最右邊 N 個是我們信任的代理加上的；取「代理看到的用戶端」那一格
  const ip = parts[parts.length - trustedProxyHops];
  return ip && /^[0-9a-fA-F:.]{2,64}$/.test(ip) ? ip : "unknown";
}

/**
 * CSRF 防護：所有會改變狀態的請求必須來自本站 Origin。
 * 搭配 SameSite=Lax/Strict Cookie 與只接受 JSON，形成多層防禦。
 */
export function isSameOrigin(headers: Headers, appOrigin: string): boolean {
  const origin = headers.get("origin");
  if (origin) return origin === appOrigin;
  // 沒有 Origin 時退回 Sec-Fetch-Site（現代瀏覽器都會送）
  const site = headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  // 兩者皆無：非瀏覽器用戶端。預設拒絕（需要機器對機器 API 時請改用 token 驗證的獨立端點）
  return false;
}

export const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
