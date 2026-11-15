/** 前端呼叫 API 的小工具：同源、帶 Cookie、只送 JSON，錯誤只顯示伺服器給的一般訊息 */
export async function apiPost<T = unknown>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  return request<T>(url, { method: "GET" });
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  return request<T>(url, { method: "DELETE" });
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  if (!url.startsWith("/")) throw new Error("只允許呼叫同源 API");
  const res = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? "請求失敗");
  return data as T;
}
