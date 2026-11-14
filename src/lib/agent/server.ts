import "server-only";
import { env } from "@/lib/env";
import { createClaudeLlm } from "@/lib/agent/claude";
import type { LlmCall } from "@/lib/agent/runner";

let cached: LlmCall | undefined;

/** 伺服器端取得 Agent 使用的模型；沒有設定 API Key 時回傳 null（端點回 503） */
export function agentLlm(): LlmCall | null {
  const cfg = env();
  if (!cfg.ANTHROPIC_API_KEY) return null;
  cached ??= createClaudeLlm(cfg.ANTHROPIC_API_KEY, cfg.AGENT_MODEL);
  return cached;
}
