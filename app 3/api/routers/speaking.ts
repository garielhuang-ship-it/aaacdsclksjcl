import { z } from "zod";
import { aiProcedure, createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { speakingTopics } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateSpeakingQuestion } from "../lib/deepseek";

export const speakingRouter = createRouter({
  // 随机获取一道题库中的口语题
  getRandom: publicQuery.query(async () => {
    const db = getDb();
    const topics = await db.select().from(speakingTopics);
    const randomIndex = Math.floor(Math.random() * topics.length);
    return topics[randomIndex] || null;
  }),

  // 按分类获取口语题
  getByCategory: publicQuery
    .input(z.object({ category: z.string().max(100) }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(speakingTopics)
        .where(eq(speakingTopics.category, input.category));
    }),

  // 获取所有分类
  getCategories: publicQuery.query(async () => {
    const db = getDb();
    const results = await db
      .select({ category: speakingTopics.category })
      .from(speakingTopics)
      .groupBy(speakingTopics.category);
    return results.map((r) => r.category);
  }),

  // AI生成新题目
  generate: aiProcedure
    .input(
      z.object({
        category: z.string().trim().max(50).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const question = await generateSpeakingQuestion(
          input?.category,
          input?.difficulty
        );
        return {
          success: true,
          question,
        };
      } catch (error) {
        console.error("Generate question failed:", error instanceof Error ? error.message : error);
        // 降级：从题库随机返回一道真实题目，并告知前端 AI 出题失败
        let topic: typeof speakingTopics.$inferSelect | undefined;
        try {
          const topics = await getDb().select().from(speakingTopics);
          topic = topics[Math.floor(Math.random() * topics.length)];
        } catch (dbError) {
          console.error("Question bank fallback failed:", dbError instanceof Error ? dbError.message : dbError);
        }
        // 题库也取不到时，把 AI 出题失败的真实原因告诉用户
        if (!topic) throw error;
        return {
          success: false,
          question: {
            question: topic.question,
            category: topic.category,
            tips: [] as string[],
          },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // 获取所有题库题目
  getAll: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(speakingTopics);
  }),
});
