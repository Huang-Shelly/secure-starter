# 安全政策

## 通報弱點

如果你發現安全弱點，**請不要開公開 Issue**。請使用 GitHub 的 [Private vulnerability reporting](../../security/advisories/new)（Security → Report a vulnerability）私下通報，內容包含：

- 弱點類型與影響範圍
- 重現步驟（請求、參數、截圖）
- 你認為的嚴重程度

我們的處理承諾：

| 階段 | 時限 |
| --- | --- |
| 確認收到 | 3 個工作天內 |
| 初步評估與嚴重度判定 | 7 個工作天內 |
| 嚴重 / 高風險修補 | 嚴重 7 天、高 30 天內 |
| 修補後通知通報者並視情況公開致謝 | 修補完成後 |

請在善意研究範圍內測試：不要存取或修改他人資料、不要做阻斷服務攻擊、不要對正式環境做自動化大量掃描。符合以上原則的研究，我們不會追究法律責任。

## 支援版本

只有 `main` 分支的最新版本會收到安全更新。

## 安全設計摘要

- 登入只使用 Passkey（WebAuthn），不儲存任何密碼。
- Session token 在資料庫只存 SHA-256 雜湊；可隨時撤銷所有裝置。
- 每個 API 都經過速率限制、CSRF 檢查、身分驗證、授權（預設拒絕）與 schema 驗證。
- AI Agent 把所有外部內容視為不可信資料；高風險操作（刪除、寄信、付款）一定需要使用者人工確認。
- 日誌與 AI 輸出會自動遮蔽個資與金鑰。
- CI 每次執行 SAST、SCA、Secret 掃描；每週執行 DAST、API 模糊測試與 LLM 紅隊測試。
- 發佈的容器映像附 SBOM 與 SLSA 建置來源證明。

詳細流程見 [docs/red-team-playbook.md](docs/red-team-playbook.md) 與 [docs/pre-launch-checklist.md](docs/pre-launch-checklist.md)。
