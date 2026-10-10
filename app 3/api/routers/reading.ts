import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { readingPassages } from "@db/schema";
import { eq } from "drizzle-orm";

export const readingRouter = createRouter({
  // 随机获取一篇朗读文章
  getRandom: publicQuery.query(async () => {
    const db = getDb();
    const passages = await db.select().from(readingPassages);
    const randomIndex = Math.floor(Math.random() * passages.length);
    return passages[randomIndex] || null;
  }),

  // 按ID获取朗读文章
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db
        .select()
        .from(readingPassages)
        .where(eq(readingPassages.id, input.id));
      return results[0] || null;
    }),

  // 获取所有朗读文章分类
  getCategories: publicQuery.query(async () => {
    const db = getDb();
    const results = await db
      .select({ category: readingPassages.category })
      .from(readingPassages)
      .groupBy(readingPassages.category);
    return results.map((r) => r.category);
  }),

  // 按分类获取文章列表
  getByCategory: publicQuery
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(readingPassages)
        .where(eq(readingPassages.category, input.category));
    }),

  // 获取所有朗读文章
  getAll: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(readingPassages);
  }),
});
