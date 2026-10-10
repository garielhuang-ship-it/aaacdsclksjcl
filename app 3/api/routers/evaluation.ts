import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { practiceRecords } from "@db/schema";
import { eq } from "drizzle-orm";
import { evaluateReading, evaluateSpeaking } from "../lib/deepseek";

// 计算文本相似度（基于编辑距离）
function calculateSimilarity(original: string, transcript: string): number {
  const origWords = original.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const transWords = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);

  if (origWords.length === 0) return 0;
  if (transWords.length === 0) return 0;

  // 使用最长公共子序列(LCS)计算相似度
  const m = origWords.length;
  const n = transWords.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === transWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLength = dp[m][n];
  // 内容完整度 = LCS长度 / 原文长度 * 满分50
  return Math.round((lcsLength / m) * 50);
}

export const evaluationRouter = createRouter({
  // 评价朗读表现
  evaluateReading: publicQuery
    .input(
      z.object({
        passageId: z.number(),
        passage: z.string(),
        transcript: z.string(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 计算内容完整度
      const contentScore = calculateSimilarity(input.passage, input.transcript);

      try {
        // 调用 DeepSeek 进行 AI 评价
        const aiResult = await evaluateReading(
          input.passage,
          input.transcript,
          contentScore
        );

        // 保存记录
        const db = getDb();
        const sessionId = crypto.randomUUID();
        await db.insert(practiceRecords).values({
          sessionId,
          mode: "reading",
          passageId: input.passageId,
          transcript: input.transcript,
          audioDuration: input.duration,
          contentScore,
          totalScore: aiResult.totalScore,
          fluencyScore: aiResult.fluencyScore,
          aiFeedback: {
            feedback: aiResult.feedback,
            suggestions: aiResult.suggestions,
            highlights: aiResult.highlights,
          },
        });

        return {
          success: true,
          sessionId,
          contentScore,
          totalScore: aiResult.totalScore,
          fluencyScore: aiResult.fluencyScore,
          feedback: aiResult.feedback,
          suggestions: aiResult.suggestions,
          highlights: aiResult.highlights,
        };
      } catch (error) {
        console.error("Reading evaluation failed:", error);
        // 降级返回基础评分
        const sessionId = crypto.randomUUID();
        const db = getDb();
        await db.insert(practiceRecords).values({
          sessionId,
          mode: "reading",
          passageId: input.passageId,
          transcript: input.transcript,
          audioDuration: input.duration,
          contentScore,
          totalScore: contentScore,
          fluencyScore: Math.round(contentScore * 0.9),
          aiFeedback: {
            feedback: "朗读已完成。基于文本比对的内容完整度评分如下。",
            suggestions: ["注意单词发音准确性", "保持适当语速", "注意停顿和节奏"],
            highlights: ["完成了全文朗读"],
          },
        });

        return {
          success: true,
          sessionId,
          contentScore,
          totalScore: contentScore,
          fluencyScore: Math.round(contentScore * 0.9),
          feedback: "朗读已完成。基于文本比对的内容完整度评分如下。",
          suggestions: ["注意单词发音准确性", "保持适当语速", "注意停顿和节奏"],
          highlights: ["完成了全文朗读"],
        };
      }
    }),

  // 评价口语问答表现
  evaluateSpeaking: publicQuery
    .input(
      z.object({
        question: z.string(),
        transcript: z.string(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const aiResult = await evaluateSpeaking(input.question, input.transcript);

        // 保存记录
        const db = getDb();
        const sessionId = crypto.randomUUID();
        await db.insert(practiceRecords).values({
          sessionId,
          mode: "speaking",
          questionText: input.question,
          transcript: input.transcript,
          audioDuration: input.duration,
          contentScore: aiResult.understandingScore,
          thinkingScore: aiResult.thinkingScore,
          fluencyScore: aiResult.fluencyScore,
          totalScore: aiResult.totalScore,
          aiFeedback: {
            feedback: aiResult.feedback,
            suggestions: aiResult.suggestions,
            grammarIssues: aiResult.grammarIssues,
          },
        });

        return {
          success: true,
          sessionId,
          understandingScore: aiResult.understandingScore,
          thinkingScore: aiResult.thinkingScore,
          fluencyScore: aiResult.fluencyScore,
          totalScore: aiResult.totalScore,
          feedback: aiResult.feedback,
          suggestions: aiResult.suggestions,
          grammarIssues: aiResult.grammarIssues,
        };
      } catch (error) {
        console.error("Speaking evaluation failed:", error);
        // 降级返回
        const sessionId = crypto.randomUUID();
        const db = getDb();
        await db.insert(practiceRecords).values({
          sessionId,
          mode: "speaking",
          questionText: input.question,
          transcript: input.transcript,
          audioDuration: input.duration,
          contentScore: 15,
          thinkingScore: 15,
          fluencyScore: 7,
          totalScore: 37,
          aiFeedback: {
            feedback: "回答已完成。建议加强语法准确性和逻辑连贯性。",
            suggestions: ["注意语法准确性", "增加具体例子支撑观点", "使用连接词增强逻辑性"],
            grammarIssues: [],
          },
        });

        return {
          success: true,
          sessionId,
          understandingScore: 15,
          thinkingScore: 15,
          fluencyScore: 7,
          totalScore: 37,
          feedback: "回答已完成。建议加强语法准确性和逻辑连贯性。",
          suggestions: ["注意语法准确性", "增加具体例子支撑观点", "使用连接词增强逻辑性"],
          grammarIssues: [],
        };
      }
    }),

  // 获取练习记录
  getRecord: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db
        .select()
        .from(practiceRecords)
        .where(eq(practiceRecords.sessionId, input.sessionId));
      return results[0] || null;
    }),
});
