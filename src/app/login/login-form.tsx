"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { apiPost } from "@/lib/client/api";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login() {
    setError(null);
    setBusy(true);
    try {
      const optionsJSON = await apiPost<PublicKeyCredentialRequestOptionsJSON>("/api/auth/login/options", {});
      const response = await startAuthentication({ optionsJSON });
      await apiPost("/api/auth/login/verify", { response });
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登入失敗");
    } finally {
      setBusy(false);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const optionsJSON = await apiPost<PublicKeyCredentialCreationOptionsJSON>("/api/auth/register/options", {
        username,
        displayName,
      });
      const response = await startRegistration({ optionsJSON });
      await apiPost("/api/auth/register/verify", { response });
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "註冊失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <button onClick={login} disabled={busy}>
          使用 Passkey 登入
        </button>
      </div>
      <form className="card" onSubmit={register}>
        <strong>建立新帳號</strong>
        <label htmlFor="username">帳號名稱（3–32 個英數字）</label>
        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username webauthn" required maxLength={32} />
        <label htmlFor="displayName">顯示名稱</label>
        <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={100} />
        <button type="submit" className="secondary" disabled={busy}>
          建立 Passkey
        </button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}
