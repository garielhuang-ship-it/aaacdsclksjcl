import { TRPCError } from "@trpc/server";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { aiRequestLog } from "../../db/schema";

// AI 接口（会调用 DeepSeek 计费）的频率限制，按客户端 IP 统计，数据存在数据库中，
// 所以多个函数实例之间共享同一份计数。
const LIMITS = [
  { windowMs: 60 * 1000, max: 6, label: "1 分钟" },
  { windowMs: 60 * 60 * 1000, max: 60, label: "1 小时" },
];
const RETENTION_MS = 24 * 60 * 60 * 1000;

export async function enforceAiRateLimit(clientIp: string) {
  try {
    await checkAndRecord(clientIp);
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    // 数据库暂时不可用时不阻断 AI 功能，仍有函数级别的平台频率限制兜底
    console.error("AI rate limit check skipped:", error instanceof Error ? error.message : error);
  }
}

async function checkAndRecord(clientIp: string) {
  const db = getDb();
  const now = Date.now();

  for (const limit of LIMITS) {
    const [row] = await db
      .select({ value: count() })
      .from(aiRequestLog)
      .where(
        and(
          eq(aiRequestLog.clientKey, clientIp),
          gt(aiRequestLog.createdAt, new Date(now - limit.windowMs)),
        ),
      );
    if ((row?.value ?? 0) >= limit.max) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `请求过于频繁：每 ${limit.label}最多 ${limit.max} 次 AI 请求，请稍后再试。`,
      });
    }
  }

  await db.insert(aiRequestLog).values({ clientKey: clientIp });

  // 偶尔清理过期记录，避免表无限增长
  if (Math.random() < 0.05) {
    await db.delete(aiRequestLog).where(lt(aiRequestLog.createdAt, new Date(now - RETENTION_MS)));
  }
}
