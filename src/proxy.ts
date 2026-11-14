import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, STATIC_SECURITY_HEADERS } from "@/lib/security-headers";

/**
 * Next.js Proxy（原 middleware）：每個請求產生 CSP nonce 並套用安全標頭。
 * 授權檢查不放在這裡——一律在 API Route / Server Component 內以 secureRoute / getSessionUser 執行，
 * 避免「只靠 middleware 擋」被繞過。
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  for (const { key, value } of STATIC_SECURITY_HEADERS) response.headers.set(key, value);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
