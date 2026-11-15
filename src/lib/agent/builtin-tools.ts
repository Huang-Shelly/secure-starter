import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { defineTool, ToolRegistry, type AgentTool } from "@/lib/agent/tools";
import type { PendingActionSink } from "@/lib/agent/runner";
import type { Prisma } from "@/generated/prisma/client";

/** 範例工具。每個工具都以 ctx.userId 範圍化查詢，模型無法指定別人的資料。 */
export const searchNotes = defineTool({
  name: "search_notes",
  description: "搜尋目前使用者自己的筆記，回傳標題與內容摘要。",
  input: z.strictObject({ query: z.string().min(1).max(100) }),
  risk: "read",
  permission: "note:read",
  summarize: (i) => `搜尋筆記：${i.query}`,
  run: async (ctx, i) => {
    const notes = await db().note.findMany({
      where: { ownerId: ctx.userId, OR: [{ title: { contains: i.query, mode: "insensitive" } }, { body: { contains: i.query, mode: "insensitive" } }] },
      select: { id: true, title: true, body: true },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });
    return JSON.stringify(notes.map((n) => ({ id: n.id, title: n.title, excerpt: n.body.slice(0, 500) })));
  },
});

export const createNote = defineTool({
  name: "create_note",
  description: "替目前使用者新增一則筆記。",
  input: z.strictObject({ title: z.string().min(1).max(200), body: z.string().max(10_000) }),
  risk: "write",
  permission: "note:create",
  summarize: (i) => `新增筆記「${i.title}」`,
  run: async (ctx, i) => {
    const note = await db().note.create({ data: { ownerId: ctx.userId, title: i.title, body: i.body }, select: { id: true } });
    return JSON.stringify({ created: note.id });
  },
});

export const deleteNote = defineTool({
  name: "delete_note",
  description: "刪除目前使用者的一則筆記。",
  input: z.strictObject({ noteId: z.uuid() }),
  risk: "high",
  permission: "note:delete",
  summarize: (i) => `刪除筆記 ${i.noteId}`,
  run: async (ctx, i) => {
    const res = await db().note.deleteMany({ where: { id: i.noteId, ownerId: ctx.userId } });
    return res.count === 1 ? "已刪除" : "找不到筆記";
  },
});

export const sendEmail = defineTool({
  name: "send_email",
  description: "寄送 Email（範例：尚未串接寄信服務，只記錄請求）。",
  input: z.strictObject({
    to: z.email().max(254),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5_000),
  }),
  risk: "high",
  permission: "agent:run",
  summarize: (i) => `寄信給 ${i.to}，主旨「${i.subject}」`,
  run: async (ctx, i) => {
    // TODO: 串接寄信服務（SES / Resend…）。收件者網域白名單、頻率限制請在此加上。
    logger.info("agent.send_email.stub", { userId: ctx.userId, toDomain: i.to.split("@")[1] });
    return "（範例）已記錄寄信請求，尚未真正寄出。";
  },
});

export const ALL_TOOLS: AgentTool[] = [searchNotes, createNote, deleteNote, sendEmail] as AgentTool[];

/** 這個 Agent 允許使用的工具。新增工具時要明確加入，並在 PR 中說明風險等級。 */
export const DEFAULT_AGENT_ALLOWLIST = ["search_notes", "create_note", "delete_note", "send_email"] as const;

export function defaultRegistry(): ToolRegistry {
  return new ToolRegistry(ALL_TOOLS, DEFAULT_AGENT_ALLOWLIST);
}

export const PENDING_TTL_MS = 10 * 60_000;

export const prismaPendingSink: PendingActionSink = {
  async create({ userId, toolName, input, summary }) {
    const row = await db().pendingAction.create({
      data: {
        userId,
        toolName,
        input: input as Prisma.InputJsonValue,
        summary,
        expiresAt: new Date(Date.now() + PENDING_TTL_MS),
      },
      select: { id: true },
    });
    return row;
  },
};
