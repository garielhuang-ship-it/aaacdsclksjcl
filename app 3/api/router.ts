import { createRouter, publicQuery } from "./middleware";
import { readingRouter } from "./routers/reading";
import { speakingRouter } from "./routers/speaking";
import { evaluationRouter } from "./routers/evaluation";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  reading: readingRouter,
  speaking: speakingRouter,
  evaluation: evaluationRouter,
});

export type AppRouter = typeof appRouter;
