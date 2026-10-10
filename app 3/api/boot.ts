// 本地 Node 服务器入口（Vite 开发服务器和 `npm run build:node` 使用）。
// 部署到 Netlify 时由 netlify/functions/api.mts 承载同一个 app。
import app from "./app";
import { env } from "./lib/env";

export default app;

if (env.isProduction && !process.env.NETLIFY) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
