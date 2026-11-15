// 只供 CI / 本機的 DAST 與模糊測試使用：建立測試使用者與 session，輸出 cookie token。
// 必須明確設定 ALLOW_TEST_SEED=1 才會執行；絕不要在正式環境的資料庫上執行。
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

if (process.env.ALLOW_TEST_SEED !== "1") {
  console.error("Refusing to run: set ALLOW_TEST_SEED=1 (CI / local only)");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: url });
await client.connect();
const userId = randomUUID();
const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
await client.query(
  `INSERT INTO "User" (id, username, "displayName") VALUES ($1, $2, $3)`,
  [userId, `dast_${userId.slice(0, 8)}`, "DAST Bot"],
);
await client.query(
  `INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt") VALUES ($1, $2, $3, now() + interval '2 hours')`,
  [randomUUID(), tokenHash, userId],
);
await client.end();
process.stdout.write(token);
