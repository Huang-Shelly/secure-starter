import { describe, expect, it } from "vitest";
import { redactAll, redactObject, redactPII, redactSecrets } from "@/lib/redact";

describe("redactSecrets", () => {
  it("遮蔽常見金鑰格式", () => {
    const fakeAnthropic = "sk-ant-" + "api03-" + "A".repeat(40);
    const fakeGithub = "ghp_" + "a".repeat(36);
    const fakeAws = "AKIA" + "ABCDEFGHIJKLMNOP";
    const out = redactSecrets(`k1=${fakeAnthropic} k2 ${fakeGithub} ${fakeAws}`);
    expect(out).not.toContain(fakeAnthropic);
    expect(out).not.toContain(fakeGithub);
    expect(out).not.toContain(fakeAws);
  });

  it("遮蔽資料庫連線字串中的帳密", () => {
    const out = redactSecrets("postgres://admin:hunter2pass@db.internal:5432/app");
    expect(out).not.toContain("hunter2pass");
    expect(out).toContain("postgres://[REDACTED_CREDENTIALS]@");
  });

  it("遮蔽 private key 區塊", () => {
    const pem = ["-----BEGIN PRIVATE KEY-----", "MIIEv...", "-----END PRIVATE KEY-----"].join("\n");
    expect(redactSecrets(pem)).toBe("[REDACTED_PRIVATE_KEY]");
  });
});

describe("redactPII", () => {
  it("遮蔽 Email、台灣身分證、手機", () => {
    const out = redactPII("聯絡 amy@example.com，身分證 A123456789，手機 0912-345-678");
    expect(out).toContain("[REDACTED_EMAIL]");
    expect(out).toContain("[REDACTED_TW_ID]");
    expect(out).toContain("[REDACTED_PHONE]");
  });

  it("只遮蔽通過 Luhn 檢查的卡號", () => {
    expect(redactPII("卡號 4111 1111 1111 1111")).toContain("[REDACTED_CARD]");
    expect(redactPII("訂單 1234 5678 9012 3456")).toContain("1234 5678 9012 3456");
  });
});

describe("redactObject", () => {
  it("依欄位名稱遮蔽並遞迴處理", () => {
    const out = redactObject({ password: "x", nested: { apiKey: "y", note: "mail me: a@b.co" } }) as Record<string, unknown>;
    expect(out.password).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).apiKey).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).note).toContain("[REDACTED_EMAIL]");
  });

  it("redactAll 同時處理金鑰與個資", () => {
    expect(redactAll("token=abcdef123456 a@b.co")).not.toMatch(/abcdef123456|a@b\.co/);
  });
});
