import { secureRoute } from "@/lib/route";
import { Errors } from "@/lib/http";

// 未定義的 /api/* 路徑：統一回 JSON 404（而非 Next 的 HTML 錯誤頁），
// 讓 API 用戶端與掃描器拿到一致、不洩露框架資訊的錯誤格式。
// auth: "public" 的理由：此路由不提供任何資料，只回 404；仍套用速率限制與 CSRF 檢查。
const notFound = secureRoute({ auth: "public", action: "api.not_found" }, async () => {
  throw Errors.notFound();
});

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
