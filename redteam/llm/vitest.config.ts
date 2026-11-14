import { defineConfig } from "vitest/config";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "server-only": path.join(root, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    root,
    environment: "node",
    include: ["redteam/llm/**/*.redteam.ts"],
    // 依序執行，避免同時打太多 API 請求
    fileParallelism: false,
    reporters: ["default", "junit"],
    outputFile: { junit: "reports/llm-redteam.xml" },
  },
});
