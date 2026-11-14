"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, apiPost } from "@/lib/client/api";

interface Note { id: string; title: string; body: string }
interface Pending { id: string; toolName: string; summary: string }

export function Dashboard() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [n, p] = await Promise.all([
        apiGet<{ notes: Note[] }>("/api/notes"),
        apiGet<{ items: Pending[] }>("/api/agent/pending"),
      ]);
      setNotes(n.notes);
      setPending(p.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初次載入資料
    void refresh();
  }, [refresh]);

  const run = (fn: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失敗");
    }
  };

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}

      <section className="card">
        <strong>筆記（示範擁有者授權）</strong>
        <label htmlFor="title">標題</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <label htmlFor="body">內容</label>
        <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} rows={3} />
        <button onClick={run(async () => { await apiPost("/api/notes", { title, body }); setTitle(""); setBody(""); })}>新增</button>
        <ul className="plain">
          {notes.map((n) => (
            <li key={n.id}>
              {/* React 會自動編碼輸出，防 XSS；不要改用 dangerouslySetInnerHTML */}
              <strong>{n.title}</strong>
              <div className="muted">{n.body}</div>
              <button className="danger" onClick={run(() => apiDelete(`/api/notes/${encodeURIComponent(n.id)}`))}>刪除</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <strong>AI 助理（示範 Prompt Injection 防護與人工確認）</strong>
        <label htmlFor="prompt">想請助理做什麼？</label>
        <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={4000} rows={3} />
        <button onClick={run(async () => { const r = await apiPost<{ reply: string }>("/api/agent", { message: prompt }); setReply(r.reply); })}>送出</button>
        {reply && <p className="muted">{reply}</p>}

        {pending.length > 0 && (
          <>
            <p><strong>待你確認的高風險操作</strong></p>
            <ul className="plain">
              {pending.map((p) => (
                <li key={p.id}>
                  <div>{p.summary}</div>
                  <div className="row">
                    <button onClick={run(() => apiPost("/api/agent/confirm", { id: p.id, decision: "approve" }))}>核准執行</button>
                    <button className="secondary" onClick={run(() => apiPost("/api/agent/confirm", { id: p.id, decision: "reject" }))}>拒絕</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <div className="row">
          <button className="secondary" onClick={run(async () => { await apiPost("/api/auth/logout", {}); router.push("/login"); })}>登出</button>
          <button className="danger" onClick={run(async () => { await apiPost("/api/auth/sessions/revoke-all", {}); router.push("/login"); })}>登出所有裝置</button>
        </div>
      </section>
    </>
  );
}
