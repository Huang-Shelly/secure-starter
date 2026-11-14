import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Dashboard } from "./dashboard";

export default async function DashboardPage() {
  // 伺服器端驗證：未登入直接導回登入頁（不依賴前端判斷）
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <main>
      <h1>控制台</h1>
      <p className="muted">嗨，{user.displayName}</p>
      <Dashboard />
    </main>
  );
}
