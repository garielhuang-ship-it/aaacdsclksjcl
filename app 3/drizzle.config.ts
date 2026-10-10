import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  // 迁移文件放在仓库根目录，Netlify 部署时会自动执行
  out: "../netlify/database/migrations",
});
