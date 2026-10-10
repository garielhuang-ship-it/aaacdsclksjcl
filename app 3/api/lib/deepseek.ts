import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "./env";

// DeepSeek API 配置（仅服务器端使用）
// API Key 从环境变量 fdsfhkjs 读取，绝不返回给浏览器、也不写入日志
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
// 官方文档当前可用模型：deepseek-flash / deepseek-v4-pro。出题和评分选用速度快、成本低的 deepseek-flash
const DEEPSEEK_MODEL = "deepseek-flash";
const REQUEST_TIMEOUT_MS = 25_000;

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null };
  }>;
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2000 } = options;

  const apiKey = env.deepseekApiKey;
  if (!apiKey) {
    console.error("DeepSeek API key missing: environment variable fdsfhkjs is not set");
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI 服务未配置：服务器缺少环境变量 fdsfhkjs，请联系管理员。",
    });
  }

  let response: Response;
  try {
    response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        // 关闭思考模式：响应更快，且 temperature 只在非思考模式下生效
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      console.error(`DeepSeek request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      throw new TRPCError({ code: "TIMEOUT", message: "AI 响应超时，请稍后重试。" });
    }
    console.error("DeepSeek network error:", error instanceof Error ? error.message : "unknown");
    throw new TRPCError({ code: "BAD_GATEWAY", message: "无法连接 AI 服务，请稍后重试。" });
  }

  if (!response.ok) {
    // 只记录状态码，不记录请求头（含密钥）
    console.error(`DeepSeek API error: HTTP ${response.status}`);
    const messageByStatus: Record<number, string> = {
      401: "AI 服务密钥无效，请检查环境变量 fdsfhkjs 的值。",
      402: "AI 服务账户余额不足，请充值后再试。",
      429: "AI 服务繁忙（请求过多），请稍后再试。",
    };
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: messageByStatus[response.status] ?? `AI 服务暂时不可用（HTTP ${response.status}），请稍后重试。`,
    });
  }

  const data = (await response.json()) as DeepSeekResponse;
  const choice = data.choices?.[0];
  const content = choice?.message?.content?.trim();
  if (!content || choice?.finish_reason === "length") {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "AI 返回内容不完整，请重试。" });
  }
  return content;
}

// 解析并校验 AI 返回的 JSON，格式不符时报错（不使用写死的替代数据）
function parseAiJson<T>(content: string, schema: z.ZodType<T>): T {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "AI 返回格式有误，请重试。" });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error("DeepSeek JSON did not match schema:", result.error.issues.map((i) => i.path.join(".")).join(", "));
    throw new TRPCError({ code: "BAD_GATEWAY", message: "AI 返回格式有误，请重试。" });
  }
  return result.data;
}

// 兼容模型返回 38、"38"、"38/50" 等不同格式的分数
const score = (max: number) =>
  z
    .preprocess((v) => (typeof v === "string" ? parseFloat(v.match(/-?\d+(\.\d+)?/)?.[0] ?? "") : v), z.number())
    .transform((n) => Math.round(Math.min(max, Math.max(0, n))));
const stringList = z.array(z.coerce.string()).default([]);

export const SPEAKING_CATEGORIES = [
  "日常生活与个人表达",
  "学校与学习",
  "兴趣与个人选择",
  "综合思辨类",
  "深度思考",
  "比较与权衡",
  "问题分析与解决",
  "社会现象与观点判断",
  "文化与交流",
  "人与社会",
  "健康的生活方式",
  "科技与生活",
  "时间管理与成长",
] as const;

const DIFFICULTY_LABEL = { easy: "简单", medium: "中等", hard: "较难" } as const;
export type Difficulty = keyof typeof DIFFICULTY_LABEL;

const questionSchema = z.object({
  question: z.string().min(5),
  category: z.string().optional(),
  tips: stringList,
});

// 生成即兴问答题
export async function generateSpeakingQuestion(
  category?: string,
  difficulty?: Difficulty,
): Promise<{
  question: string;
  category: string;
  tips: string[];
}> {
  const systemPrompt = `你是外研社杯全国中学生外语素养大赛的口语考官。请根据以下要求生成一道高质量的即兴英语口语题目。

要求：
1. 题目应符合中国高中生的认知水平和英语表达能力
2. 题目应具有思辨性，能考察学生的逻辑思维
3. 题目用英文，格式为直接提问，简洁明了
4. 同时提供3-4个中文答题提示，帮助学生构建回答思路
5. 每次生成不同的题目，避免陈词滥调
6. 只返回JSON

评分标准参考：
- 理解能力(20分)：对问题透彻理解，能准确归纳要点
- 思辨能力(20分)：能够合理分析及回应，逻辑严谨
- 语音语调(10分)：语音正确，语速适宜，语言流畅

返回JSON格式：
{
  "question": "英文题目内容",
  "category": "题目分类",
  "tips": ["提示1", "提示2", "提示3"]
}`;

  const level = DIFFICULTY_LABEL[difficulty ?? "medium"];
  const userPrompt = category
    ? `请生成一道"${category}"类别的${level}难度即兴问答题。`
    : `请随机生成一道${level}难度的即兴问答题，从以下类别中任选一个：${SPEAKING_CATEGORIES.join("、")}。`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 1.0, maxTokens: 600 },
  );

  const result = parseAiJson(content, questionSchema);
  return {
    question: result.question.trim(),
    category: result.category?.trim() || category || "综合思辨类",
    tips: result.tips.slice(0, 4),
  };
}

const readingSchema = z.object({
  fluencyScore: score(50),
  totalScore: score(50),
  feedback: z.string().min(1),
  suggestions: stringList,
  highlights: stringList,
});

// 评价朗读表现
export async function evaluateReading(
  passage: string,
  transcript: string,
  contentScore: number,
  wordDiff?: { missedWords: string[]; misreadWords: Array<{ expected: string; heard: string }> },
): Promise<{
  totalScore: number;
  fluencyScore: number;
  feedback: string;
  suggestions: string[];
  highlights: string[];
}> {
  const systemPrompt = `你是外研社杯全国中学生外语素养大赛的朗读评委。请根据学生的朗读转录文本和原文进行对比分析，给出专业评价。

评分标准（满分50分）：
- 朗读技能(50分)：语音、语调正确，语速适宜，朗读流畅

当前技术限制说明：
- 系统暂通过语音识别(ASR)文本与原文的相似度来计算"内容完整度"分数
- 你无法直接听到音频，只能基于转录文本进行评价
- 请基于文本差异推断可能的朗读问题，并具体指出漏读、错读、添读的单词

请从以下维度给出评价：
1. 内容完整度分析（漏词、错词、添词情况）
2. 流畅度推断（基于文本连贯性）
3. 改进建议（具体、可操作）
4. 整体评语（鼓励性为主）

只返回JSON：
{
  "totalScore": 总分(0-50),
  "fluencyScore": 流畅度分数(0-50),
  "feedback": "整体评语",
  "suggestions": ["建议1", "建议2", "建议3"],
  "highlights": ["亮点1", "亮点2"]
}`;

  const userPrompt = `【原文】
${passage}

【学生朗读转录】
${transcript}

【内容完整度得分】
${contentScore}/50

【系统比对结果】
漏读：${wordDiff?.missedWords.join(" | ") || "无"}
错读（原文 → 识别）：${wordDiff?.misreadWords.map((w) => `${w.expected} → ${w.heard}`).join(" | ") || "无"}

请结合比对结果给出专业评价，建议要针对具体的漏读、错读内容。`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 1500 },
  );

  return parseAiJson(content, readingSchema);
}

const speakingSchema = z.object({
  understandingScore: score(20),
  thinkingScore: score(20),
  fluencyScore: score(10),
  feedback: z.string().min(1),
  suggestions: stringList,
  grammarIssues: z
    .array(
      z.object({
        issue: z.coerce.string(),
        correction: z.coerce.string(),
        explanation: z.coerce.string().optional(),
      }),
    )
    .default([]),
  revisedAnswer: z.string().default(""),
});

// 评价口语问答表现
export async function evaluateSpeaking(
  question: string,
  transcript: string,
): Promise<{
  understandingScore: number;
  thinkingScore: number;
  fluencyScore: number;
  totalScore: number;
  feedback: string;
  suggestions: string[];
  grammarIssues: Array<{ issue: string; correction: string; explanation?: string }>;
  revisedAnswer: string;
}> {
  const systemPrompt = `你是外研社杯全国中学生外语素养大赛的口语考官。请根据学生的即兴回答（语音识别转写文本）进行评价。

评分标准（满分50分）：
- 理解能力(20分)：对问题透彻理解，能准确归纳要点；答题语句完整，语法正确，条理清晰
- 思辨能力(20分)：能够根据问题进行合理分析及回应，逻辑严谨，观点积极向上
- 语音语调(10分)：语音、语调正确，语速适宜，语言流畅

注意：
- 你无法直接听到音频，只能基于转录文本评价
- 语音语调部分需基于文本推断（如用词丰富度、句式多样性、是否流畅连贯可间接反映语言能力）
- 评分必须严格依据学生的实际回答；回答很短、跑题或几乎没有内容时要给低分
- 逐条找出回答中真实存在的语法、用词错误：issue 引用学生原句片段，correction 给出正确形式，explanation 用中文解释原因
- revisedAnswer：在保留学生原有观点的基础上，给出一段修改润色后的英文参考答案（约 120-180 词）
- suggestions：3-4 条具体、可操作的中文改进建议
- feedback：中文整体评语，指出优点与主要不足

只返回JSON：
{
  "understandingScore": 理解能力分(0-20),
  "thinkingScore": 思辨能力分(0-20),
  "fluencyScore": 语音语调分(0-10),
  "feedback": "整体评语",
  "suggestions": ["建议1", "建议2", "建议3"],
  "grammarIssues": [{"issue": "原句片段", "correction": "正确形式", "explanation": "错误原因"}],
  "revisedAnswer": "修改后的英文参考答案"
}`;

  const userPrompt = `【题目】
${question}

【学生回答】
${transcript}

请给出专业评价。`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 2000 },
  );

  const result = parseAiJson(content, speakingSchema);
  return {
    ...result,
    // 总分由各项相加，保证与分项一致
    totalScore: result.understandingScore + result.thinkingScore + result.fluencyScore,
  };
}

const impromptuSchema = z.object({
  relevanceScore: score(20),
  logicScore: score(20),
  grammarScore: score(20),
  vocabularyScore: score(20),
  naturalnessScore: score(20),
  feedback: z.string().min(1),
  strengths: stringList,
  improvements: z
    .array(
      z.object({
        quote: z.coerce.string(),
        problem: z.coerce.string(),
        suggestion: z.coerce.string(),
      }),
    )
    .default([]),
  suggestions: stringList,
  revisedAnswer: z.string().default(""),
});

// 即兴提问训练：五个维度评分（每项 20 分，满分 100）
export async function evaluateImpromptu(question: string, transcript: string) {
  const systemPrompt = `你是一名经验丰富的中国高中英语口语老师。学生针对题目做了即兴英文口头回答，下面是语音识别得到的文本。请严格依据学生实际说出的内容评分。

评分维度（每项 0-20 分）：
- relevanceScore 内容切题程度：是否紧扣题目、回答了题目要求
- logicScore 表达逻辑与完整性：结构是否清晰、观点是否有理由和例子支撑、是否完整
- grammarScore 语法准确度
- vocabularyScore 词汇丰富度：用词是否多样、准确，是否有高中阶段较好的表达
- naturalnessScore 表达自然度：是否地道、连贯，是否有中式英语

注意：
- 你只能看到语音识别文本，无法听到发音；不要评价发音
- 回答很短、跑题或几乎没有内容时各项都要给低分
- strengths：用中文指出回答中实际做得好的地方（1-3 条，必须基于原文，没有就返回空数组）
- improvements：逐条列出待改进问题，quote 必须原样引用学生回答中的片段，problem 用中文说明问题，suggestion 给出修改后的英文写法
- suggestions：2-4 条中文改进建议
- revisedAnswer：根据题目生成一段自然、完整、符合中国高中生水平的英文参考答案（120-180 词），尽量保留学生的观点
- feedback：一两句中文总体评价

只返回JSON：
{
  "relevanceScore": 0-20,
  "logicScore": 0-20,
  "grammarScore": 0-20,
  "vocabularyScore": 0-20,
  "naturalnessScore": 0-20,
  "feedback": "总体评价",
  "strengths": ["优点"],
  "improvements": [{"quote": "原文片段", "problem": "问题说明", "suggestion": "修改后的写法"}],
  "suggestions": ["建议"],
  "revisedAnswer": "英文参考答案"
}`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `【题目】\n${question}\n\n【学生回答（语音识别文本）】\n${transcript}` },
    ],
    { temperature: 0.3, maxTokens: 2000 },
  );

  const r = parseAiJson(content, impromptuSchema);
  return {
    ...r,
    totalScore: r.relevanceScore + r.logicScore + r.grammarScore + r.vocabularyScore + r.naturalnessScore,
  };
}
