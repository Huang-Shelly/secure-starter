import { randomBytes } from "node:crypto";

/**
 * Prompt Injection 隔離（OWASP LLM01）。
 *
 * 所有「不是使用者本人、也不是系統」寫的內容（網頁、檔案、Email、資料庫內容、工具輸出）
 * 都必須先經過 wrapUntrusted 再交給模型：
 * - 用每次隨機產生的 nonce 標記邊界，攻擊者無法預先偽造結束標籤。
 * - 中和內容中出現的同名標籤，避免「提前關閉」資料區塊。
 * - 限制長度，避免以超長內容稀釋系統指令。
 * 這是縱深防禦的一層；真正的安全邊界在工具白名單、權限檢查與人工確認。
 */
export const UNTRUSTED_TAG = "untrusted_data";

export function wrapUntrusted(content: string, source: string, maxChars = 20_000): string {
  const nonce = randomBytes(8).toString("hex");
  let body = content.length > maxChars ? content.slice(0, maxChars) + "\n[...內容已截斷]" : content;
  // 中和任何看起來像我們邊界標籤的字串（含大小寫與空白變形）
  body = body.replace(/<\s*\/?\s*untrusted_data/gi, (m) => m.replace(/</g, "＜"));
  const safeSource = source.replace(/[^\w:.\-/]/g, "_").slice(0, 64);
  return `<${UNTRUSTED_TAG} nonce="${nonce}" source="${safeSource}">\n${body}\n</${UNTRUSTED_TAG} nonce="${nonce}">`;
}

/**
 * 啟發式偵測常見注入語句。只用於記錄與告警（偵測訊號），
 * 不能當作唯一防線——攻擊者可以輕易改寫措辭。
 */
const INJECTION_SIGNALS: Array<[string, RegExp]> = [
  ["ignore_instructions", /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules)/i],
  ["ignore_instructions_zh", /(忽略|無視|忘記)(之前|先前|以上|上面)?的?(所有)?(指示|指令|規則|設定)/],
  ["role_override", /\b(you are now|act as|pretend to be|from now on you)\b/i],
  ["system_prompt_probe", /(system prompt|系統提示|系統指令|reveal your instructions)/i],
  ["fake_role_tokens", /<\|?(im_start|im_end|system|assistant)\|?>|\[\/?INST\]/i],
  ["tool_coercion", /(call|use|invoke|執行|呼叫)\s*(the\s+)?(tool|工具)?\s*`?(delete|send_email|transfer|刪除|寄信|轉帳)/i],
  ["exfil_markdown", /!\[[^\]]*\]\(https?:\/\/[^)]+\?[^)]*=/i],
];

export function detectInjectionSignals(text: string): string[] {
  return INJECTION_SIGNALS.filter(([, re]) => re.test(text)).map(([name]) => name);
}
