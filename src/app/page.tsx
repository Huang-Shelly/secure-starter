import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getSessionUser().catch(() => null);
  return (
    <main>
      <h1>Secure Starter</h1>
      <p className="muted">內建 Passkey 登入、安全標頭、速率限制、授權檢查與 AI Agent 防護的起手模板。</p>
      <div className="card">
        {user ? (
          <p>
            已登入：{user.displayName}。<Link href="/dashboard">前往控制台</Link>
          </p>
        ) : (
          <p>
            <Link href="/login">使用 Passkey 登入或註冊</Link>
          </p>
        )}
      </div>
    </main>
  );
}
