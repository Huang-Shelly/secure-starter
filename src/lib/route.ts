import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { Errors, HttpError, errorResponse, internalErrorResponse } from "@/lib/http";
import { logger } from "@/lib/logger";
import { rateLimit, type RateLimitRule, RATE_LIMITS } from "@/lib/rate-limit";
import { SAFE_METHODS, clientIp, isSameOrigin } from "@/lib/request";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/authz";
import { audit } from "@/lib/audit";

const MAX_JSON_BYTES = 64 * 1024;

type AuthMode = { auth: "public" } | { auth: "required"; permission: Permission };

export type RouteOptions<
  A extends AuthMode,
  B extends z.ZodType | undefined,
  P extends z.ZodType | undefined,
> = A & {
  rateLimit?: RateLimitRule;
  /** 稽核用的動作名稱，例如 note.delete */
  action: string;
  body?: B;
  params?: P;
};

export interface RouteContext<U, B, P> {
  req: NextRequest;
  /** auth: "required" 時保證不為 null */
  user: U;
  body: B;
  params: P;
  ip: string;
  requestId: string;
}

type Infer<T> = T extends z.ZodType ? z.infer<T> : undefined;

/**
 * 每個 API Route 的安全外殼。依序執行：
 *   速率限制 → CSRF(Origin) → Content-Type/大小限制 → 身分驗證 → 權限 → schema 驗證 → handler
 * 任何一步失敗都 fail closed，並以一致、不洩露內部資訊的格式回應。
 * 預設需要登入；公開端點必須明確寫 auth: "public"。
 */
type UserFor<A> = A extends { auth: "required" } ? SessionUser : SessionUser | null;

export function secureRoute<
  A extends AuthMode,
  B extends z.ZodType | undefined = undefined,
  P extends z.ZodType | undefined = undefined,
>(
  opts: RouteOptions<A, B, P>,
  handler: (ctx: RouteContext<UserFor<A>, Infer<B>, Infer<P>>) => Promise<Response>,
) {
  return async (req: NextRequest, segment: { params: Promise<unknown> }): Promise<Response> => {
    const requestId = randomUUID();
    const cfg = env();
    const ip = clientIp(req.headers, cfg.TRUSTED_PROXY_HOPS);
    let user: SessionUser | null = null;
    try {
      // 1. 速率限制（以 IP + 動作為鍵；登入後再加上使用者鍵）
      //    取不到可信 IP 時（未設定 TRUSTED_PROXY_HOPS），改用放寬 50 倍的全域桶做洪水防護，
      //    避免所有使用者共用同一個小額度而互相鎖死。正式環境請設定可信代理。
      const base = opts.rateLimit ?? RATE_LIMITS.api;
      const rule = cfg.RATE_LIMIT_SCALE === 1 ? base : { ...base, limit: base.limit * cfg.RATE_LIMIT_SCALE };
      const ipRule = ip === "unknown" ? { limit: rule.limit * 50, windowMs: rule.windowMs } : rule;
      const rl = await rateLimit(`ip:${ip}:${opts.action}`, ipRule);
      if (!rl.allowed) {
        logger.security("rate_limited", { ip, action: opts.action });
        return errorResponse(Errors.tooManyRequests(), {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        });
      }

      // 2. CSRF：非安全方法必須同源
      if (!SAFE_METHODS.has(req.method) && !isSameOrigin(req.headers, cfg.APP_ORIGIN)) {
        await audit({ action: `${opts.action}.csrf_block`, outcome: "denied", ip });
        throw Errors.forbidden();
      }

      // 3. 身分驗證與授權（預設拒絕）
      if (opts.auth === "required") {
        user = await getSessionUser();
        if (!user) throw Errors.unauthorized();
        const userRl = await rateLimit(`user:${user.id}:${opts.action}`, rule);
        if (!userRl.allowed) throw Errors.tooManyRequests();
        if (!hasPermission(user, opts.permission)) {
          await audit({ actorId: user.id, action: opts.action, outcome: "denied", ip, meta: { reason: "permission" } });
          throw Errors.forbidden();
        }
      }

      // 4. 路徑參數驗證
      let params: unknown = undefined;
      if (opts.params) {
        const parsed = opts.params.safeParse(await segment.params);
        if (!parsed.success) throw Errors.notFound();
        params = parsed.data;
      }

      // 5. Body：只接受 JSON、限制大小、schema 驗證（拒絕未知欄位由 schema 的 strictObject 負責）
      let body: unknown = undefined;
      if (opts.body) {
        const ct = req.headers.get("content-type") ?? "";
        if (!ct.toLowerCase().startsWith("application/json")) throw Errors.unsupportedMediaType();
        const raw = await req.text();
        if (Buffer.byteLength(raw, "utf8") > MAX_JSON_BYTES) throw Errors.payloadTooLarge();
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          throw Errors.badRequest();
        }
        const parsed = opts.body.safeParse(json);
        if (!parsed.success) {
          throw Errors.badRequest(parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.code })));
        }
        body = parsed.data;
      }

      const res = await handler({
        req,
        user: user as UserFor<A>,
        body: body as Infer<B>,
        params: params as Infer<P>,
        ip,
        requestId,
      });
      res.headers.set("Cache-Control", "no-store");
      res.headers.set("X-Request-Id", requestId);
      return res;
    } catch (err) {
      if (err instanceof HttpError) {
        if (err.status === 401 || err.status === 403) {
          logger.security("access_denied", { action: opts.action, status: err.status, ip, userId: user?.id });
        }
        return errorResponse(err);
      }
      logger.error("route.unhandled", { requestId, action: opts.action, err: err instanceof Error ? err.message : String(err) });
      return internalErrorResponse(requestId);
    }
  };
}

export function json(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}
