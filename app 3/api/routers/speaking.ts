import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { speakingTopics } from "@db/schema";
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
    .input(z.object({ category: z.string() }))
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
  generate: publicQuery
    .input(
      z.object({
        category: z.string().optional(),
        difficulty: z.string().optional(),
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
        console.error("Generate question failed:", error);
        // 降级：从题库随机返回
        const db = getDb();
        const topics = await db.select().from(speakingTopics);
        const randomIndex = Math.floor(Math.random() * topics.length);
        const topic = topics[randomIndex];
        return {
          success: false,
          question: {
            question: topic?.question || "What do you think is the key to success?",
            category: topic?.category || "综合思辨类",
            tips: ["Think about your personal experience", "Provide specific examples"],
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
