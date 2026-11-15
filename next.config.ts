import type { NextConfig } from "next";
import { STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false, // 不暴露 X-Powered-By
  reactStrictMode: true,
  output: "standalone", // 供最小化容器映像使用
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/:path*", headers: STATIC_SECURITY_HEADERS }];
  },
};

export default nextConfig;
