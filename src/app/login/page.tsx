import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main>
      <h1>登入</h1>
      <p className="muted">使用裝置上的 Passkey（Face ID、Touch ID、Windows Hello 或安全金鑰），不需要密碼。</p>
      <LoginForm />
    </main>
  );
}
