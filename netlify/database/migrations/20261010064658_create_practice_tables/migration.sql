CREATE TYPE "difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "practice_mode" AS ENUM('reading', 'speaking', 'full');--> statement-breakpoint
CREATE TABLE "ai_request_log" (
	"id" serial PRIMARY KEY,
	"client_key" varchar(128) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_questions" (
	"id" serial PRIMARY KEY,
	"category" varchar(255) NOT NULL,
	"question" text NOT NULL,
	"difficulty" "difficulty" DEFAULT 'medium'::"difficulty",
	"used" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_records" (
	"id" serial PRIMARY KEY,
	"session_id" varchar(64) NOT NULL,
	"mode" "practice_mode" NOT NULL,
	"passage_id" integer,
	"question_text" text,
	"transcript" text,
	"audio_duration" integer,
	"content_score" integer,
	"thinking_score" integer,
	"fluency_score" integer,
	"total_score" integer,
	"ai_feedback" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_passages" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"training_focus" text,
	"word_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_topics" (
	"id" serial PRIMARY KEY,
	"category" varchar(255) NOT NULL,
	"question" text NOT NULL,
	"difficulty" "difficulty" DEFAULT 'medium'::"difficulty",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_request_log_client_created_idx" ON "ai_request_log" ("client_key","created_at");