import { NextResponse } from "next/server";

// 健康檢查：不回傳版本、主機名稱等可供偵察的資訊
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
