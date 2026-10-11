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

// 出题比例：日常话题类 60%，辩证观点类 40%。每 10 题按 6:4 洗牌后依次抽取，连续出多题时比例稳定
let typeDeck: boolean[] = [];
function nextIsDaily() {
  if (!typeDeck.length) {
    typeDeck = Array.from({ length: 10 }, (_, i) => i < 6);
    for (let i = typeDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [typeDeck[i], typeDeck[j]] = [typeDeck[j], typeDeck[i]];
    }
  }
  return typeDeck.pop()!;
}

// 判断问答题型：优先用出题时的分类；题库题目等无分类时按题干是否给出对立观点判断
export type QuestionType = "daily" | "debate";
export function questionTypeOf(question: string, category?: string): QuestionType {
  if (category === "日常话题类") return "daily";
  if (category === "辩证观点类") return "debate";
  return /some (people|students)|others (think|believe|say|argue)|agree|disagree|for or against|pros and cons/i.test(question)
    ? "debate"
    : "daily";
}

// 生成即兴问答题
export async function generateSpeakingQuestion(
  category?: string,
  difficulty?: Difficulty,
): Promise<{
  question: string;
  category: string;
  tips: string[];
}> {
  const isDaily = nextIsDaily();
  const typeRule = isDaily
    ? "日常话题类：询问学生的梦想、习惯、喜欢做的事、个人经历或选择等，要求说明做什么＋为什么。示例：What do you usually do after school? Why? / What is your favourite way to relax at weekends? Why?"
    : "辩证观点类：在题目中给出两种对立观点，要求学生表明立场并论证。";

  const systemPrompt = `你是外研社杯全国中学生外语素养大赛的口语考官，请生成一道英文即兴问答题。

本题题型：${typeRule}

要求：
- 回答时长 1.5 分钟 ≈ 120～180 词，题目难度据此把握，适合中国高中生
- 参考作答结构 Point → Explain → Example → Extend，仅用于把握难度，不作硬性要求，也不要写进题目
- 禁止：是非题（能用 yes/no 回答的题）、需要专业知识才能回答的题、政治／宗教／伦理争议题
- 输出只有 Question 一句英文，不加任何标签、说明、提示或展开点
- 每次生成不同的题目

只返回JSON：{"question": "英文题目"}`;

  const level = DIFFICULTY_LABEL[difficulty ?? "medium"];
  // 话题方向也由代码随机抽取，避免模型反复出同类题
  const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
  const angle = isDaily ? `，切入点：${pick(["梦想与目标", "习惯", "喜欢做的事", "个人经历", "个人选择", "身边的人或地方"])}` : "";
  const userPrompt = `请围绕"${category || pick(SPEAKING_CATEGORIES)}"相关话题生成一道${level}难度的题目${angle}。`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 1.0, maxTokens: 300 },
  );

  const result = parseAiJson(content, questionSchema);
  return {
    // 去掉模型可能附加的 "Question:" 等标签，只保留题目一句
    question: result.question.replace(/^\s*(question|q)\s*[:：]\s*/i, "").split(/\n/)[0].trim(),
    category: category || (isDaily ? "日常话题类" : "辩证观点类"),
    // 出题规范：只输出题目本身，不再附带答题提示
    tips: [],
  };
}

// 总体校准：放在评分 system prompt 开头
const CALIBRATION = "选手为高中生，按高中英语口语水平评分，不以母语者或范文标准打分。";

// 评分规范（完整写入评分接口的 system prompt；朗读与问答各用各自评分表）
const EXAM_SPEC = `【考试结构】线上，朗读：准备1分钟，限时2分钟，50分；问答：准备30秒，限时1.5分钟，50分＋升华加分≤5，总分≤100。朗读全程屏幕显示原文。

【朗读评分50】语音语调20：音素准确、重音合理、语调自然，个别单词发音不准但整体可听懂的不扣重分；语速10：快慢适中；流畅度15：连贯、少停顿回读；完整度5：不漏词跳句。

【语法底线（问答两类通用）】语法与用词以「不影响理解」为底线，少量时态、单复数、介词等错误不扣分或轻扣，只有影响理解的错误才明显扣分。

【日常话题类问答评分50】理解切题20：准确回答问题、语句完整、条理清晰；语言运用20：词汇语法恰当、表达自然、细节具体；语音语调10：语音语调正确、语速适宜、流畅。此类考真实经历与表达，不以论证逻辑打分，没有论证或例证不扣分；无升华加分。

【辩证观点类问答评分50】理解能力20：准确归纳要点并切题，条理清晰、语言得体；思辨能力20：观点→理由→例证，只看观点明确、有理由、有例子，理由和例子合理即给高分，不要求深度、独特见解或复杂论证，结巴、简单句不影响思辨分；语音语调10：语音语调正确、语速适宜、流畅。升华加分≤5：结尾有个人思考或价值提升且贴切自然，酌情1～5分；喊口号不加分。

【时间违规】超时自动截断不计；辩证观点类问答不足1分钟思辨分最高一半。

【出题规范】朗读题：说明文、记叙性说明文、议论文、演讲，130～180词，中国高中课标内，生词率≤2%，简单句并列句为主，2分钟内可读完。问答题：日常话题类（做什么＋为什么）或辩证观点类（对立观点表态论证），1.5分钟≈120～180词，禁是非题与政治宗教争议题。参考结构Point→Explain→Example→Extend，不作硬性要求。出题只输出题目本身。`;

const FEEDBACK_RULES = `改进建议要求：
- languageSuggestions：语言层面（语音、词汇、语法、句式等）2-3 条
- contentSuggestions：内容逻辑层面（意群与停顿、结构、论证、衔接等）2-3 条
- 每条必须具体、可操作，引用学生实际出现的问题并给出改法；禁止“继续努力”“多加练习”之类空泛评价
- 你只能看到语音识别文本，无法听到音频；涉及语音的分项需基于识别结果与时长合理推断，评分严格依据实际表现`;

// 将两类建议合并为一个列表，保证“语言层面＋内容逻辑层面”都出现
const mergeSuggestions = (lang: string[], content: string[]) => [
  ...lang.map((s) => `【语言】${s}`),
  ...content.map((s) => `【内容逻辑】${s}`),
];

const readingSchema = z.object({
  pronunciationScore: score(20),
  paceScore: score(10),
  fluencyScore: score(15),
  completenessScore: score(5),
  feedback: z.string().min(1),
  languageSuggestions: stringList,
  contentSuggestions: stringList,
  highlights: stringList,
});

// 评价朗读表现（仅使用【朗读评分50】）
export async function evaluateReading(
  passage: string,
  transcript: string,
  contentScore: number,
  wordDiff?: { missedWords: string[]; misreadWords: Array<{ expected: string; heard: string }> },
  duration?: number,
) {
  const systemPrompt = `${CALIBRATION}

你是外研社杯全国中学生外语素养大赛的朗读评委。以下是完整评分规范：

${EXAM_SPEC}

本次评的是【朗读】，只能使用【朗读评分50】：语音语调(0-20)、语速(0-10)、流畅度(0-15)、完整度(0-5)。不得使用问答评分表的任何分项，不得给升华加分。

${FEEDBACK_RULES}

只返回JSON，字段顺序即输出结构（总分由系统按分项相加）：
{
  "pronunciationScore": 语音语调(0-20),
  "paceScore": 语速(0-10),
  "fluencyScore": 流畅度(0-15),
  "completenessScore": 完整度(0-5),
  "feedback": "一两句总体评语",
  "languageSuggestions": ["语言层面建议"],
  "contentSuggestions": ["内容逻辑层面建议"],
  "highlights": ["基于原文的亮点"]
}`;

  const words = passage.split(/\s+/).filter(Boolean).length;
  const userPrompt = `【原文】（${words} 词）
${passage}

【学生朗读转录】
${transcript}

【朗读用时】${duration != null ? `${duration} 秒（限时 120 秒，超时部分已截断不计）` : "未知"}

【文本相似度参考】${contentScore}/50

【系统比对结果】
漏读：${wordDiff?.missedWords.join(" | ") || "无"}
错读（原文 → 识别）：${wordDiff?.misreadWords.map((w) => `${w.expected} → ${w.heard}`).join(" | ") || "无"}`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 1500 },
  );

  const r = parseAiJson(content, readingSchema);
  return {
    totalScore: r.pronunciationScore + r.paceScore + r.fluencyScore + r.completenessScore,
    pronunciationScore: r.pronunciationScore,
    paceScore: r.paceScore,
    fluencyScore: r.fluencyScore,
    completenessScore: r.completenessScore,
    feedback: r.feedback,
    suggestions: mergeSuggestions(r.languageSuggestions, r.contentSuggestions),
    highlights: r.highlights,
  };
}

const speakingSchema = z.object({
  understandingScore: score(20),
  thinkingScore: score(20).optional(),
  languageScore: score(20).optional(),
  fluencyScore: score(10),
  bonusScore: score(5).optional(),
  feedback: z.string().min(1),
  languageSuggestions: stringList,
  contentSuggestions: stringList,
  strengths: stringList,
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

// 评价口语问答表现：日常话题类与辩证观点类各用各自评分表，不混用
export async function evaluateSpeaking(question: string, transcript: string, duration?: number, category?: string) {
  const short = duration != null && duration < 60;
  const questionType = questionTypeOf(question, category);
  const daily = questionType === "daily";
  const systemPrompt = `${CALIBRATION}

你是外研社杯全国中学生外语素养大赛的口语考官。以下是完整评分规范：

${EXAM_SPEC}

${
    daily
      ? `本次评的是【日常话题类问答】，只能使用【日常话题类问答评分50】：理解切题(0-20)、语言运用(0-20)、语音语调(0-10)。不得使用辩证观点类或朗读评分表的任何分项，不按论证逻辑打分，没有理由论证不扣分，不给升华加分。
- 回答很短、跑题或几乎没有内容时要给低分`
      : `本次评的是【辩证观点类问答】，只能使用【辩证观点类问答评分50】：理解能力(0-20)、思辨能力(0-20)、语音语调(0-10)，另加升华加分(0-5)。不得使用日常话题类或朗读评分表的任何分项。
- 回答很短、跑题或几乎没有内容时要给低分
- 升华加分只给结尾贴切自然的个人思考或价值提升，喊口号或没有则给 0
- 回答不足 1 分钟时，思辨能力最高 10 分`
  }

${FEEDBACK_RULES}
- grammarIssues：逐条列出回答中真实存在的语法、用词错误，issue 引用学生原句片段，correction 给出正确形式，explanation 用中文解释
- revisedAnswer：保留学生观点，给出一段润色后的英文参考答案（120-180 词）

只返回JSON，字段顺序即输出结构（总分由系统按分项相加）：
{
${
    daily
      ? `  "understandingScore": 理解切题(0-20),
  "languageScore": 语言运用(0-20),
  "fluencyScore": 语音语调(0-10),`
      : `  "understandingScore": 理解能力(0-20),
  "thinkingScore": 思辨能力(0-20),
  "fluencyScore": 语音语调(0-10),
  "bonusScore": 升华加分(0-5),`
  }
  "feedback": "一两句总体评语",
  "languageSuggestions": ["语言层面建议"],
  "contentSuggestions": ["内容逻辑层面建议"],
  "strengths": ["基于原文的优点"],
  "grammarIssues": [{"issue": "原句片段", "correction": "正确形式", "explanation": "错误原因"}],
  "revisedAnswer": "英文参考答案"
}`;

  const userPrompt = `【题目】
${question}

【学生回答（语音识别文本）】
${transcript}

【回答用时】${duration != null ? `${duration} 秒（限时 90 秒，超时部分已截断不计）${short ? "，不足 1 分钟" : ""}` : "未知"}`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 2000 },
  );

  const r = parseAiJson(content, speakingSchema);
  const second = daily ? r.languageScore : r.thinkingScore;
  if (second == null) throw new TRPCError({ code: "BAD_GATEWAY", message: "AI 返回格式有误，请重试。" });
  // 第二个 20 分项：日常类为语言运用，辩证类为思辨能力（时间违规：不足 1 分钟思辨分最高一半）
  const thinkingScore = !daily && short ? Math.min(second, 10) : second;
  const bonusScore = daily ? 0 : (r.bonusScore ?? 0);
  return {
    questionType,
    totalScore: r.understandingScore + thinkingScore + r.fluencyScore + bonusScore,
    understandingScore: r.understandingScore,
    thinkingScore,
    fluencyScore: r.fluencyScore,
    bonusScore,
    feedback: r.feedback,
    suggestions: mergeSuggestions(r.languageSuggestions, r.contentSuggestions),
    strengths: r.strengths,
    grammarIssues: r.grammarIssues,
    revisedAnswer: r.revisedAnswer,
  };
}
