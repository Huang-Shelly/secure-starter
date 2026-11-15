import { NextResponse } from "next/server";

/**
 * 統一的錯誤型別與回應格式。
 * 對外只回傳固定代碼與一般訊息，內部細節只進日誌（不洩露堆疊、SQL、路徑）。
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly publicMessage: string,
    public readonly details?: unknown,
  ) {
    super(code);
  }
}

export const Errors = {
  badRequest: (details?: unknown) => new HttpError(400, "bad_request", "請求格式不正確", details),
  unauthorized: () => new HttpError(401, "unauthorized", "請先登入"),
  forbidden: () => new HttpError(403, "forbidden", "沒有權限"),
  // 對「不存在」與「無權存取」一律回 404，避免洩露資源是否存在
  notFound: () => new HttpError(404, "not_found", "找不到資源"),
  payloadTooLarge: () => new HttpError(413, "payload_too_large", "請求內容過大"),
  unsupportedMediaType: () => new HttpError(415, "unsupported_media_type", "只接受 application/json"),
  tooManyRequests: () => new HttpError(429, "rate_limited", "請求過於頻繁，請稍後再試"),
  unavailable: () => new HttpError(503, "unavailable", "服務暫時無法使用"),
};

export function errorResponse(err: HttpError, extraHeaders?: HeadersInit): NextResponse {
  const body: Record<string, unknown> = { error: { code: err.code, message: err.publicMessage } };
  // 只有驗證錯誤會回傳欄位層級的提示（不含使用者輸入值）
  if (err.status === 400 && err.details) body.error = { ...(body.error as object), fields: err.details };
  return NextResponse.json(body, { status: err.status, headers: extraHeaders });
}

export function internalErrorResponse(requestId: string): NextResponse {
  return NextResponse.json(
    { error: { code: "internal_error", message: "系統發生錯誤", requestId } },
    { status: 500 },
  );
}
