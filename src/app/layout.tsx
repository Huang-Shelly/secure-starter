import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secure Starter",
  description: "安全起手模板",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 讀取 headers 讓頁面動態渲染，Next.js 才會把 CSP nonce 套用到它的 script
  await headers();
  return (
    <html lang="zh-Hant-TW">
      <body>{children}</body>
    </html>
  );
}
