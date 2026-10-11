import { z } from "zod";
import { aiProcedure, createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { practiceRecords } from "../../db/schema";
import { eq } from "drizzle-orm";
import { evaluateReading, evaluateSpeaking } from "../lib/deepseek";

// 保存练习记录；保存失败不影响把评分结果返回给用户
async function saveRecord(record: typeof practiceRecords.$inferInsert) {
  try {
    await getDb().insert(practiceRecords).values(record);
  } catch (error) {
    console.error("Failed to save practice record:", error instanceof Error ? error.message : error);
  }
}

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

// 原文与识别文本逐词比对，找出漏读和错读（基于真实识别结果计算）
function diffWords(original: string, transcript: string) {
  const norm = (t: string) => t.split(/\s+/).filter(Boolean);
  const key = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
  const orig = norm(original).filter((w) => key(w));
  const heard = norm(transcript).filter((w) => key(w));
  const m = orig.length, n = heard.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = key(orig[i]) === key(heard[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const missedWords: string[] = [];
  const misreadWords: Array<{ expected: string; heard: string }> = [];
  let gapOrig: string[] = [], gapHeard: string[] = [];
  const flush = () => {
    if (gapOrig.length && gapHeard.length) {
      misreadWords.push({ expected: gapOrig.join(" "), heard: gapHeard.join(" ") });
    } else if (gapOrig.length) {
      missedWords.push(gapOrig.join(" "));
    }
    gapOrig = [];
    gapHeard = [];
  };
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && key(orig[i]) === key(heard[j])) {
      flush();
      i++; j++;
    } else if (j >= n || (i < m && dp[i + 1][j] >= dp[i][j + 1])) {
      gapOrig.push(orig[i++]);
    } else {
      gapHeard.push(heard[j++]);
    }
  }
  flush();
  return { missedWords: missedWords.slice(0, 30), misreadWords: misreadWords.slice(0, 30) };
}

// 输入长度限制
const MAX_PASSAGE = 5000;
const MAX_QUESTION = 500;
const MAX_TRANSCRIPT = 3000;

const nonEmptyTranscript = z
  .string()
  .trim()
  .min(1, "未检测到回答内容")
  .max(MAX_TRANSCRIPT, `回答内容过长（最多 ${MAX_TRANSCRIPT} 个字符）`);

export const evaluationRouter = createRouter({
  // 评价朗读表现
  evaluateReading: aiProcedure
    .input(
      z.object({
        passageId: z.number().int().positive(),
        passage: z.string().min(1).max(MAX_PASSAGE),
        transcript: nonEmptyTranscript,
        duration: z.number().int().min(0).max(3600).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 计算内容完整度
      const contentScore = calculateSimilarity(input.passage, input.transcript);

      // 调用 DeepSeek 进行 AI 评价；失败时直接把错误返回给前端，不使用写死的分数
      const wordDiff = diffWords(input.passage, input.transcript);
      const aiResult = await evaluateReading(input.passage, input.transcript, contentScore, wordDiff, input.duration);

      const sessionId = crypto.randomUUID();
      await saveRecord({
        sessionId,
        mode: "reading",
        passageId: input.passageId,
        transcript: input.transcript,
        audioDuration: input.duration,
        contentScore,
        totalScore: aiResult.totalScore,
        fluencyScore: aiResult.fluencyScore,
        aiFeedback: {
          pronunciationScore: aiResult.pronunciationScore,
          paceScore: aiResult.paceScore,
          completenessScore: aiResult.completenessScore,
          feedback: aiResult.feedback,
          suggestions: aiResult.suggestions,
          highlights: aiResult.highlights,
        },
      });

      return {
        success: true,
        sessionId,
        contentScore,
        ...wordDiff,
        ...aiResult,
      };
    }),

  // 评价口语问答表现
  evaluateSpeaking: aiProcedure
    .input(
      z.object({
        question: z.string().trim().min(1).max(MAX_QUESTION),
        transcript: nonEmptyTranscript.refine(
          (t) => /[a-zA-Z]{2,}/.test(t),
          "请用英文回答"
        ),
        duration: z.number().int().min(0).max(3600).optional(),
        category: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const aiResult = await evaluateSpeaking(input.question, input.transcript, input.duration, input.category);

      const sessionId = crypto.randomUUID();
      await saveRecord({
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
          questionType: aiResult.questionType,
          bonusScore: aiResult.bonusScore,
          feedback: aiResult.feedback,
          suggestions: aiResult.suggestions,
          grammarIssues: aiResult.grammarIssues,
          revisedAnswer: aiResult.revisedAnswer,
        },
      });

      return {
        success: true,
        sessionId,
        ...aiResult,
      };
    }),

  // 即兴问答训练：同样使用【问答评分50】
  evaluateAnswer: aiProcedure
    .input(
      z.object({
        question: z.string().trim().min(1).max(MAX_QUESTION),
        transcript: nonEmptyTranscript.refine((t) => /[a-zA-Z]{2,}/.test(t), "请用英文回答"),
        duration: z.number().int().min(0).max(3600).optional(),
        category: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const aiResult = await evaluateSpeaking(input.question, input.transcript, input.duration, input.category);

      const sessionId = crypto.randomUUID();
      await saveRecord({
        sessionId,
        mode: "speaking",
        questionText: input.question,
        transcript: input.transcript,
        audioDuration: input.duration,
        contentScore: aiResult.understandingScore,
        thinkingScore: aiResult.thinkingScore,
        fluencyScore: aiResult.fluencyScore,
        totalScore: aiResult.totalScore,
        aiFeedback: aiResult,
      });

      return { success: true, sessionId, ...aiResult };
    }),

  // 获取练习记录
  getRecord: publicQuery
    .input(z.object({ sessionId: z.string().max(64) }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db
        .select()
        .from(practiceRecords)
        .where(eq(practiceRecords.sessionId, input.sessionId));
      return results[0] || null;
    }),
});
