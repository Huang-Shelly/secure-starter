import Anthropic from "@anthropic-ai/sdk";
import type { LlmCall } from "@/lib/agent/runner";

/**
 * 建立 Claude API 呼叫函式。API Key 由呼叫端從環境變數 / Secret Manager 取得後傳入。
 * 啟用伺服器端 fallbacks：模型拒答時由 API 自動改用合適的備援模型。
 */
export function createClaudeLlm(apiKey: string, model: string): LlmCall {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  return async ({ system, messages, tools }) =>
    client.beta.messages.create({
      model,
      max_tokens: 16_000,
      system,
      messages,
      tools,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
}
