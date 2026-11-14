import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { Permission, Role } from "@/lib/authz";

/**
 * 工具定義與白名單（OWASP LLM06 Excessive Agency）。
 *
 * - 每個工具都必須宣告：輸入 schema、風險等級、需要的 permission。
 * - risk = "high" 的工具（刪除、寄信、付款、對外發送…）永遠不會由模型直接執行，
 *   只會建立「待確認操作」，由使用者在介面上核准後才執行。
 * - Agent 只能看到並呼叫 allowlist 內的工具；其他名稱一律拒絕。
 */
export type RiskLevel = "read" | "write" | "high";

export interface ToolContext {
  userId: string;
  role: Role;
}

export interface AgentTool<I = unknown> {
  name: string;
  description: string;
  input: z.ZodType<I>;
  risk: RiskLevel;
  permission: Permission;
  /** 給使用者看的操作摘要（用於人工確認畫面） */
  summarize: (input: I) => string;
  run: (ctx: ToolContext, input: I) => Promise<string>;
}

export function defineTool<S extends z.ZodType>(t: {
  name: string;
  description: string;
  input: S;
  risk: RiskLevel;
  permission: Permission;
  summarize: (input: z.infer<S>) => string;
  run: (ctx: ToolContext, input: z.infer<S>) => Promise<string>;
}): AgentTool<z.infer<S>> {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(t.name)) throw new Error(`Invalid tool name: ${t.name}`);
  return t as AgentTool<z.infer<S>>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  constructor(all: AgentTool[], allowlist: readonly string[]) {
    const allowed = new Set(allowlist);
    for (const t of all) {
      if (!allowed.has(t.name)) continue;
      if (this.tools.has(t.name)) throw new Error(`Duplicate tool: ${t.name}`);
      this.tools.set(t.name, t);
    }
    for (const name of allowed) {
      if (!this.tools.has(name)) throw new Error(`Allowlisted tool not defined: ${name}`);
    }
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  /** 轉成 Claude API 的工具定義（JSON Schema 由 zod 產生，與伺服器端驗證同源） */
  definitions(): Anthropic.Beta.Messages.BetaTool[] {
    return [...this.tools.values()].map((t) => {
      const schema = z.toJSONSchema(t.input) as Record<string, unknown>;
      delete schema.$schema;
      return {
        name: t.name,
        description: `${t.description}${t.risk === "high" ? "（高風險：只會建立待確認請求，需使用者核准後才執行）" : ""}`,
        input_schema: schema as Anthropic.Beta.Messages.BetaTool["input_schema"],
        strict: true,
      };
    });
  }
}
