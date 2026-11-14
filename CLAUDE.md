# 給 AI 寫程式的規則（Claude Code / 其他 Agent 都適用）

這是安全起手模板。任何修改都必須維持以下規則，對齊 NIST SSDF、OWASP ASVS L3、OWASP Top 10 / LLM Top 10、NIST AI RMF、SLSA。

## 必須遵守

1. **絕不**在程式碼、測試、文件、commit 中寫入金鑰、密碼、token、連線字串。新設定加到 `src/lib/env.ts` 的 schema 與 `.env.example`。
2. 新 API Route 一律用 `secureRoute()` 包起來；需要登入的端點宣告 `permission`，公開端點必須明確寫 `auth: "public"` 並說明理由。
3. 資料查詢用 `ownedBy(user, ...)` 範圍化；不要先用 id 查再比對擁有者，不要信任前端傳來的 ownerId / userId / role。
4. 所有輸入用 zod `strictObject` 驗證（拒絕未知欄位）。禁止 `$queryRawUnsafe`、`$executeRawUnsafe`、字串拼接 SQL、`eval`、`new Function`、`dangerouslySetInnerHTML`。
5. 錯誤只用 `Errors.*` 回應；不要把 `err.message`、stack、SQL 回傳給用戶端。日誌用 `logger`，不要記錄密碼、token、個資。
6. 前端不得加 inline `<script>` 或 `style={{}}`（會被 CSP 擋）；樣式放 CSS 檔。
7. 新增相依套件前確認：維護活躍、下載量足夠、沒有已知漏洞；用 `npm install --save-exact`，並提交 `package-lock.json`。
8. AI Agent 新工具用 `defineTool()`，正確設定 `risk`：刪除、寄信、付款、對外發送、改權限一律 `high`。工具輸出不要繞過 `wrapUntrusted`。新增攻擊手法到 `redteam/llm/payloads.ts`。
9. 新增或修改 API 時同步更新 `redteam/api/openapi.yaml`。
10. 完成變更前做安全自我審查，跑 `npm run check`，並在 PR 的「安全考量」區塊列出風險。

## 高風險操作

付款、刪除資料、寄信、變更權限、部署到正式環境：必須由人確認，不可自動執行。
