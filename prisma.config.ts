import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // 只從環境變數讀取；不要把連線字串寫進程式碼
    url: process.env.DATABASE_URL ?? "",
  },
});
