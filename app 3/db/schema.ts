import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  json,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// 朗读文章题库
export const readingPassages = mysqlTable("reading_passages", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  content: text("content").notNull(),
  trainingFocus: text("training_focus"),
  wordCount: int("word_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 口语题库分类与示例题目
export const speakingTopics = mysqlTable("speaking_topics", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 255 }).notNull(),
  question: text("question").notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 练习记录
export const practiceRecords = mysqlTable("practice_records", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  mode: mysqlEnum("mode", ["reading", "speaking", "full"]).notNull(),
  passageId: int("passage_id"),
  questionText: text("question_text"),
  transcript: text("transcript"),
  audioDuration: int("audio_duration"),
  contentScore: int("content_score"), // 内容完整度 / 理解能力
  thinkingScore: int("thinking_score"), // 思辨能力
  fluencyScore: int("fluency_score"), // 语音语调/流畅度
  totalScore: int("total_score"),
  aiFeedback: json("ai_feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI 生成题目缓存
export const generatedQuestions = mysqlTable("generated_questions", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 255 }).notNull(),
  question: text("question").notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium"),
  used: int("used").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
