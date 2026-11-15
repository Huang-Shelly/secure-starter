## 這個 PR 做了什麼

## 安全考量（必填）
<!-- 每次程式變更都要做安全自我審查，沒有影響也請寫「無」並說明理由 -->
- [ ] 新增 / 修改的 API 都使用 `secureRoute`，並宣告了正確的 permission
- [ ] 資料查詢以登入使用者範圍化（`ownedBy`），沒有 IDOR
- [ ] 所有輸入都有 zod schema 驗證；沒有字串拼接 SQL、`$queryRawUnsafe`、`dangerouslySetInnerHTML`、`eval`
- [ ] 沒有寫入任何金鑰 / 密碼；新的設定已加到 `.env.example`
- [ ] 錯誤訊息與日誌不含敏感資料
- [ ] 新增的相依套件已鎖版本，且確認來源可信、維護活躍
- [ ] AI Agent 新工具已設定風險等級，高風險操作需人工確認，並更新 `redteam/llm/payloads.ts`
- [ ] 新端點已加入 `redteam/api/openapi.yaml`（讓 DAST / 模糊測試涵蓋）

**風險說明：**

## 測試
