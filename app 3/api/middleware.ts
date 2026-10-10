import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { enforceAiRateLimit } from "./lib/rateLimit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  // 未预期的服务器错误不把内部细节（SQL、堆栈等）返回给浏览器
  errorFormatter({ shape, error }) {
    const isUnexpected = error.code === "INTERNAL_SERVER_ERROR" && error.cause !== undefined;
    if (!isUnexpected) {
      return { ...shape, data: { ...shape.data, stack: undefined } };
    }
    const cause = error.cause as { message?: string; cause?: { message?: string } } | undefined;
    console.error("Unexpected server error:", cause?.message, cause?.cause?.message ?? "");
    return {
      ...shape,
      message: "服务器内部错误，请稍后重试。",
      data: { ...shape.data, stack: undefined },
    };
  },
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// 会调用 DeepSeek 的接口：额外按 IP 限制频率
export const aiProcedure = t.procedure.use(async ({ ctx, next }) => {
  await enforceAiRateLimit(ctx.clientIp);
  return next();
});
