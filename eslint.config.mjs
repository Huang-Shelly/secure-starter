import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "src/generated/**", "coverage/**", "next-env.d.ts"],
  },
  {
    rules: {
      // 安全相關：禁止動態執行程式碼
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      // 避免把未清理的 HTML 直接塞進 DOM
      "react/no-danger": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];

export default config;
