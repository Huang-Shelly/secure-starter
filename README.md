# Secure Starter 安全起手模板

未來所有網站、APP 後端、API、AI Agent 都從這個模板開始。安全機制已經內建在程式骨架、CI 與上線流程裡，開發時只要沿用既有寫法，就會自動符合標準。

對齊標準：**NIST SSDF（SP 800-218）**、**OWASP ASVS 4.0 L3**、**OWASP Top 10 / LLM Top 10**、**NIST AI RMF**、**MITRE ATLAS**、**SLSA**。

## 技術選型（業界主流組合）

| 層級 | 選擇 | 理由 |
| --- | --- | --- |
| 框架 | Next.js 16（App Router）+ TypeScript strict | 前後端同一套，生態最大 |
| 資料庫 | PostgreSQL + Prisma 7 | 參數化查詢、型別安全、migration 版本控管 |
| 登入 | Passkey（WebAuthn，`@simplewebauthn`） | 無密碼、抗釣魚，天生多因素 |
| 輸入驗證 | zod | 前後端共用 schema，同時產生 AI 工具的 JSON Schema |
| AI | Claude API（`@anthropic-ai/sdk`） | Agent 模組可換模型，安全層與模型無關 |
| 部署 | 容器（Dockerfile，非 root、digest 釘選） | 任何雲都能跑；GHCR + SBOM + 來源證明 |

## 快速開始

```bash
# 需要 Node.js 22、PostgreSQL 16
cp .env.example .env          # 填入資料庫連線等設定（.env 不會被提交）
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev                   # http://localhost:3000
```

常用指令：

| 指令 | 用途 |
| --- | --- |
| `npm run check` | Lint + 型別檢查 + 單元測試 |
| `npm run build` | 正式建置 |
| `npm run redteam:llm` | 用真模型跑 Prompt Injection 紅隊測試（需 `ANTHROPIC_API_KEY`） |
| `npm run redteam:api` | 對執行中的 App 做 API 模糊測試（需安裝 `schemathesis`，見紅隊手冊） |

> 更新相依套件請使用 npm 11 以上（`npx npm@11 install ...`），舊版 npm 在解析部分 peer dependency 時會出錯。

## 內建的安全機制

| 機制 | 位置 | 對應標準 |
| --- | --- | --- |
| API 安全外殼：速率限制 → CSRF → 大小/型別限制 → 驗證 → 授權 → schema 驗證，預設需要登入 | `src/lib/route.ts` | ASVS V4/V5/V13、A01/A03/A04 |
| 集中授權、預設拒絕、擁有者範圍化查詢（防 IDOR） | `src/lib/authz.ts` | ASVS V4、A01 |
| Passkey 登入、一次性 challenge、要求 user verification | `src/lib/auth/webauthn.ts` | ASVS V2 L3、A07 |
| Session：隨機 token、資料庫只存雜湊、`__Host-` + HttpOnly + Secure + SameSite、閒置/絕對逾時、可撤銷 | `src/lib/auth/session.ts` | ASVS V3 |
| CSP（nonce + strict-dynamic）、HSTS、X-Frame-Options、COOP/CORP 等安全標頭 | `src/proxy.ts`、`src/lib/security-headers.ts` | ASVS V14、A05 |
| 環境變數 schema 驗證、缺少就拒絕啟動；祕密只來自環境變數 | `src/lib/env.ts`、`.env.example` | SSDF PW.1、A05 |
| 錯誤訊息不洩露內部資訊、結構化日誌自動遮蔽個資與金鑰、稽核日誌 | `src/lib/http.ts`、`logger.ts`、`audit.ts`、`redact.ts` | ASVS V7、A09 |
| AI Agent：外部資料隔離、工具白名單、權限檢查、高風險操作人工確認、輸出過濾、迭代與呼叫上限 | `src/lib/agent/` | LLM01/02/05/06/07/10、NIST AI RMF |
| CI：Semgrep / CodeQL（SAST）、npm audit + 簽章驗證（SCA）、gitleaks（Secret）、Dependency Review | `.github/workflows/ci.yml`、`codeql.yml` | SSDF PW.7/PW.8 |
| 紅隊自動化：ZAP DAST、Schemathesis API 模糊測試、LLM Prompt Injection 測試 | `.github/workflows/redteam-*.yml`、`redteam/` | ASVS V1、LLM Top 10、ATLAS |
| 供應鏈：Action 釘選 SHA、套件鎖版本、Dependabot 冷卻期、容器 digest、SBOM、SLSA 來源證明 | `release.yml`、`dependabot.yml`、`.npmrc` | SLSA、SSDF PS.2/PS.3 |

## 文件

- [SECURITY.md](SECURITY.md)：弱點通報方式與安全政策
- [docs/pre-launch-checklist.md](docs/pre-launch-checklist.md)：上線關卡清單（每個產品上線前必過）
- [docs/red-team-playbook.md](docs/red-team-playbook.md)：紅隊測試手冊與定期節奏
- [docs/threat-model-template.md](docs/threat-model-template.md)：威脅建模範本（STRIDE + MITRE ATLAS）
- [docs/github-hardening.md](docs/github-hardening.md)：GitHub 帳號與 repo 必做設定
- [CLAUDE.md](CLAUDE.md)：給 AI 寫程式時遵守的安全規則

## 用這個模板開新專案

1. 在 GitHub 上按 **Use this template** 建立新 repo（或 `gh repo create <名稱> --template Huang-Shelly/secure-starter --private`）。
2. 依 [docs/github-hardening.md](docs/github-hardening.md) 開啟分支保護與 Secret scanning。
3. 複製 `docs/threat-model-template.md` 為新產品的威脅模型，開發前先填。
4. 刪掉範例的「筆記」與 Agent 工具，換成自己的功能——但沿用 `secureRoute`、`ownedBy`、`defineTool` 的寫法。
5. 上線前跑一次 [上線關卡清單](docs/pre-launch-checklist.md)。

## 專案結構

```
src/
  app/                 頁面與 API Route（每個 API 都包在 secureRoute 裡）
  lib/
    route.ts           API 安全外殼
    authz.ts           授權政策
    auth/              Passkey 與 Session
    agent/             AI Agent 安全模組
    env.ts / logger.ts / audit.ts / redact.ts / rate-limit.ts ...
  proxy.ts             CSP nonce 與安全標頭
prisma/                資料模型與 migration
tests/                 單元測試（含 Agent 防護測試）
redteam/
  api/                 OpenAPI 規格 + Schemathesis 設定（DAST / 模糊測試用）
  llm/                 Prompt Injection / 越獄測試語料與測試
  scripts/             測試環境用的種子腳本
docs/                  上線清單、紅隊手冊、威脅建模範本
```

## 部署注意事項

- 正式環境 `APP_ORIGIN` 必須是 https；放在 CDN / Load Balancer 後面時設定 `TRUSTED_PROXY_HOPS`，速率限制才會以真實 IP 計算。
- 多台機器時，把 `src/lib/rate-limit.ts` 的記憶體儲存換成 Redis（實作 `RateLimitStore` 介面）。
- 資料庫 migration 由部署流程以 `npx prisma migrate deploy` 執行，App 使用的資料庫帳號只給 DML 權限。
- 在 CDN / 反向代理層封鎖 `TRACE`、`TRACK` 方法（見紅隊手冊「已知議題」）。
