import type { Config } from "@netlify/functions";
import app from "../../api/app";

export default (req: Request) => app.fetch(req);

export const config: Config = {
  path: "/api/*",
  // 平台级频率限制：每个 IP 每 60 秒最多 40 次接口请求
  rateLimit: {
    windowLimit: 40,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
