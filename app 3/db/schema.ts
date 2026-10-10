import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const practiceModeEnum = pgEnum("practice_mode", ["reading", "speaking", "full"]);

// 朗读文章题库
export const readingPassages = pgTable("reading_passages", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  content: text("content").notNull(),
  trainingFocus: text("training_focus"),
  wordCount: integer("word_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 口语题库分类与示例题目
export const speakingTopics = pgTable("speaking_topics", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 255 }).notNull(),
  question: text("question").notNull(),
  difficulty: difficultyEnum("difficulty").default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 练习记录
export const practiceRecords = pgTable("practice_records", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  mode: practiceModeEnum("mode").notNull(),
  passageId: integer("passage_id"),
  questionText: text("question_text"),
  transcript: text("transcript"),
  audioDuration: integer("audio_duration"),
  contentScore: integer("content_score"), // 内容完整度 / 理解能力
  thinkingScore: integer("thinking_score"), // 思辨能力
  fluencyScore: integer("fluency_score"), // 语音语调/流畅度
  totalScore: integer("total_score"),
  aiFeedback: jsonb("ai_feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI 生成题目缓存
export const generatedQuestions = pgTable("generated_questions", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 255 }).notNull(),
  question: text("question").notNull(),
  difficulty: difficultyEnum("difficulty").default("medium"),
  used: integer("used").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI 接口调用记录（用于按 IP 限制请求频率）
export const aiRequestLog = pgTable(
  "ai_request_log",
  {
    id: serial("id").primaryKey(),
    clientKey: varchar("client_key", { length: 128 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ai_request_log_client_created_idx").on(t.clientKey, t.createdAt)],
);
