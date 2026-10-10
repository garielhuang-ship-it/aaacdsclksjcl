import "dotenv/config";

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  // DeepSeek API Key 只在服务器端读取，变量名必须与 Netlify 环境变量完全一致
  get deepseekApiKey(): string {
    return process.env.fdsfhkjs ?? "";
  },
};
