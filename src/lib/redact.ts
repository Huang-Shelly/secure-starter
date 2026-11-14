/**
 * 個資與金鑰過濾：用在日誌與 AI 輸出，避免敏感資料外洩。
 * 規則刻意偏保守（寧可多遮），需要時再依產品調整。
 */

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]"],
  [/\bsk-ant-[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_API_KEY]"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_API_KEY]"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, "[REDACTED_AWS_KEY]"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, "[REDACTED_GOOGLE_KEY]"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, "[REDACTED_SLACK_TOKEN]"],
  [/\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g, "[REDACTED_STRIPE_KEY]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_JWT]"],
  [/\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@/gi, "$1://[REDACTED_CREDENTIALS]@"],
  [/\b(password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]\s*["']?[^\s"',;]{6,}/gi, "$1=[REDACTED]"],
];

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]"],
  // 台灣身分證字號 / 居留證
  [/\b[A-Z][1289]\d{8}\b/g, "[REDACTED_TW_ID]"],
  // 台灣手機
  [/(?<!\d)(?:\+886[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}(?!\d)/g, "[REDACTED_PHONE]"],
];

const CARD_CANDIDATE = /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g;

function luhnValid(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function redactSecrets(text: string): string {
  let out = text;
  for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
  return out;
}

export function redactPII(text: string): string {
  let out = text;
  for (const [re, rep] of PII_PATTERNS) out = out.replace(re, rep);
  out = out.replace(CARD_CANDIDATE, (m) => {
    const digits = m.replace(/[ -]/g, "");
    return digits.length >= 13 && luhnValid(digits) ? "[REDACTED_CARD]" : m;
  });
  return out;
}

export function redactAll(text: string): string {
  return redactPII(redactSecrets(text));
}

const SENSITIVE_KEYS = /pass(word)?|secret|token|api[-_]?key|authorization|cookie|session|credential|private|challenge/i;

/** 遞迴遮蔽物件中的敏感欄位（用於結構化日誌） */
export function redactObject(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (typeof value === "string") return redactAll(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactObject(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "[REDACTED]" : redactObject(v, depth + 1);
    }
    return out;
  }
  return value;
}
