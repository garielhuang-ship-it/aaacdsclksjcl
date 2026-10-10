import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

// 前端请求超时（略长于服务器端 DeepSeek 的 25 秒超时）
const REQUEST_TIMEOUT_MS = 40_000;

const queryClient = new QueryClient({
  defaultOptions: {
    // AI 接口有频率限制，避免切换窗口或失败时自动重复请求
    queries: { refetchOnWindowFocus: false, retry: false },
    mutations: { retry: false },
  },
});
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
        const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
        return globalThis.fetch(input, {
          ...(init ?? {}),
          signal,
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// 把接口错误转换成适合展示给用户的中文提示
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || /aborted|timeout/i.test(error.message)) {
      return "请求超时，请检查网络后重试。";
    }
    if (/Failed to fetch|NetworkError|Load failed/i.test(error.message)) {
      return "网络连接失败，请检查网络后重试。";
    }
    const data = (error as { data?: { httpStatus?: number; zodError?: unknown } }).data;
    if (data?.httpStatus === 429) {
      return error.message.startsWith("请求") ? error.message : "请求过于频繁，请稍后再试。";
    }
    if (data?.httpStatus === 400) {
      // 输入校验错误：取第一条中文提示
      try {
        const issues = JSON.parse(error.message) as Array<{ message?: string }>;
        if (issues[0]?.message) return issues[0].message;
      } catch {
        /* 不是 JSON，直接使用原消息 */
      }
    }
    if (error.message && /[\u4e00-\u9fa5]/.test(error.message)) return error.message;
  }
  return "服务暂时不可用，请稍后重试。";
}
