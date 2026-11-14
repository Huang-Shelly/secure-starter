# 上線關卡清單（Go / No-Go）

> 每個產品**第一次上線**與**重大改版**前都要跑完這份清單。
> **關卡規則：任何「嚴重 / 高」風險發現未修完，一律不准上線；修完後必須重測驗證並附證據。**
> 對齊：NIST SSDF（PO / PS / PW / RV）、OWASP ASVS L3、OWASP LLM Top 10、NIST AI RMF。

| 欄位 | 內容 |
| --- | --- |
| 產品 / 版本 | |
| 預定上線日 | |
| 檢查者 | |
| 結論 | ☐ Go　☐ No-Go　☐ 有條件 Go（需寫明條件與期限） |

## 1. 威脅建模與設計（SSDF PW.1、ASVS V1）

- [ ] 已依 `docs/threat-model-template.md` 完成威脅模型並經審查
- [ ] 所有「高」風險威脅都有緩解措施，且有對應的驗證方式
- [ ] AI 產品已完成第 5 節（MITRE ATLAS / LLM Top 10）

## 2. 自動化測試全部通過（SSDF PW.7、PW.8）

附上 CI 執行連結：

- [ ] CI：Lint、型別檢查、單元測試、建置 ✅
- [ ] SAST：Semgrep（與 CodeQL，若 repo 為公開）無未處理的高風險發現
- [ ] SCA：`npm audit --audit-level=high` 通過；`npm audit signatures` 通過
- [ ] Secret 掃描：gitleaks 無發現；GitHub Secret scanning 無未處理警示
- [ ] DAST：ZAP Baseline 與 API Scan 無未處理的 FAIL / WARN
- [ ] API 模糊測試：Schemathesis 全部通過
- [ ] AI 產品：`Red Team - LLM Prompt Injection` 全部通過（使用正式環境相同的模型）

## 3. 手動紅隊演練（ASVS L3、LLM Top 10）

依 `docs/red-team-playbook.md` 第 3 節執行，附上報告：

- [ ] 權限繞過 / IDOR：用 A 使用者存取、修改、刪除 B 使用者的每一種資源
- [ ] 商業邏輯：重放、競態（同時送出多次）、負數 / 極值、跳過步驟
- [ ] 身分驗證與 Session：登出後 Session 失效、撤銷全部裝置有效、Cookie 屬性正確
- [ ] AI Agent：被誘導執行危險操作、外洩資料、洩漏系統指令的嘗試全部失敗
- [ ] 所有發現都已登錄、評級、指派

## 4. 設定與部署（ASVS V14、SSDF PO.5）

- [ ] 正式環境 `APP_ORIGIN` 為 https，`WEBAUTHN_RP_ID` 正確
- [ ] 所有祕密來自 Secret Manager；repo、映像、日誌中沒有任何祕密
- [ ] `RATE_LIMIT_SCALE=1`；在代理後方時已設定 `TRUSTED_PROXY_HOPS`；多台機器時速率限制使用共享儲存
- [ ] 資料庫：App 帳號最小權限、啟用 TLS、自動備份且**已實際演練還原**
- [ ] CDN / WAF：封鎖 TRACE/TRACK、啟用 DDoS 防護
- [ ] 安全標頭檢查（例如 securityheaders.com）達 A 以上
- [ ] 容器映像以非 root 執行、映像有 SBOM 與來源證明

## 5. 監控與應變（ASVS V7、SSDF RV.1）

- [ ] 日誌集中收集，設定以下告警：`security.*` 事件暴增、大量 401/403/429、`audit` 中的 `denied`、5xx 比例
- [ ] 稽核日誌保存期限符合法規（個資法 / 產業規範）
- [ ] 有事件應變流程：誰接告警、怎麼撤銷 Session / 金鑰、怎麼通知使用者
- [ ] `SECURITY.md` 的弱點通報管道可用（已開啟 Private vulnerability reporting）

## 6. 隱私與法遵

- [ ] 個資盤點：蒐集哪些、目的、保存期限、刪除方式
- [ ] 隱私權政策與使用條款已上線
- [ ] AI 產品：告知使用者正在與 AI 互動；使用者資料是否送往模型供應商已揭露

## 7. 發現與重測紀錄

| 編號 | 發現 | 嚴重度 | 狀態 | 修補 PR | 重測日期 / 結果 |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

**簽核：** ＿＿＿＿＿＿（日期：＿＿＿＿）
