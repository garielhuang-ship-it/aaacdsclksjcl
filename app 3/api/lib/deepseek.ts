// AI API 配置 - 支持 DeepSeek 及其他兼容 OpenAI 格式的 API
// 用户可通过环境变量更换 API 提供商
const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.DEFAULT_AI_API_KEY || "";
const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const {
    model = AI_MODEL,
    temperature = 0.7,
    maxTokens = 2000,
    jsonMode = false,
  } = options;

  if (!AI_API_KEY) {
    throw new Error("AI API Key not configured. Please set DEEPSEEK_API_KEY or DEFAULT_AI_API_KEY environment variable.");
  }

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: jsonMode ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  return data.choices[0]?.message?.content || "";
}

// 生成即兴问答题
export async function generateSpeakingQuestion(
  category?: string,
  difficulty?: string
): Promise<{
  question: string;
  category: string;
  tips: string[];
}> {
  const systemPrompt = `你是外研社杯全国中学生外语素养大赛的口语考官。请根据以下要求生成一道高质量的即兴英语口语题目。

要求：
1. 题目应符合高中生的认知水平和表达能力
2. 题目应具有思辨性，能考察学生的逻辑思维
3. 题目格式为直接提问，简洁明了
4. 同时提供3-4个答题提示，帮助学生构建回答思路
5. 返回JSON格式

评分标准参考：
- 理解能力(20分)：对问题透彻理解，能准确归纳要点
- 思辨能力(20分)：能够合理分析及回应，逻辑严谨
- 语音语调(10分)：语音正确，语速适宜，语言流畅

返回格式：
{
  "question": "题目内容",
  "category": "题目分类",
  "tips": ["提示1", "提示2", "提示3"]
}`;

  const userPrompt = category
    ? `请生成一道"${category}"类别的${difficulty || "中等"}难度即兴问答题。`
    : `请随机生成一道即兴问答题，可以从以下类别中选择：日常生活与个人表达、学校与学习、兴趣与个人选择、综合思辨类、深度思考、比较与权衡、问题分析与解决、社会现象与观点判断、文化与交流、人与社会、健康的生活方式、科技与生活、时间管理与成长。`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.8, jsonMode: true }
  );

  try {
    const result = JSON.parse(content);
    return {
      question: result.question || "What do you think is the key to success?",
      category: result.category || category || "综合思辨类",
      tips: Array.isArray(result.tips) ? result.tips : ["Think about your personal experience", "Provide specific examples", "Keep a clear structure"],
    };
  } catch {
    return {
      question: content.replace(/^.*?{.*}$/s, "").trim() || "What do you think is the key to success?",
      category: category || "综合思辨类",
      tips: ["Think about your personal experience", "Provide specific examples", "Keep a clear structure"],
    };
  }
}

// 评价朗读表现
export async function evaluateReading(
  passage: string,
  transcript: string,
  contentScore: number
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
- 请基于文本差异推断可能的朗读问题

请从以下维度给出评价：
1. 内容完整度分析（漏词、错词、添词情况）
2. 流畅度推断（基于文本连贯性）
3. 改进建议（具体、可操作）
4. 整体评语（鼓励性为主）

返回JSON格式：
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

请给出专业评价。`;

  const content = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.5, jsonMode: true }
  );

  try {
    const result = JSON.parse(content);
    return {
      totalScore: Math.min(50, Math.max(0, result.totalScore || contentScore)),
      fluencyScore: Math.min(50, Math.max(0, result.fluencyScore || 35)),
      feedback: result.feedback || "朗读完成，继续努力提升语音准确度。",
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : ["注意单词发音准确性", "保持适当语速", "注意停顿和节奏"],
      highlights: Array.isArray(result.highlights) ? result.highlights : ["完成了全文朗读"],
    };
  } catch {
    return {
      totalScore: contentScore,
      fluencyScore: Math.round(contentScore * 0.9),
      feedback: "朗读已完成。建议多听标准音频模仿，注意单词重音和句子节奏。",
      suggestions: ["注意单词发音准确性", "保持适当语速", "注意停顿和节奏"],
      highlights: ["完成了全文朗读"],
    };
  }
}

// 评价口语问答表现
export async function evaluateSpeaking(
  question: string,
  transcript: string
): Promise<{
  understandingScore: number;
  thinkingScore: number;
  fluencyScore: number;
  totalScore: number;
  feedback: string;
  suggestions: string[];
  grammarIssues: Array<{ issue: string; correction: string }>;
}> {
  const systemPrompt = `你是外研社杯全国中学生外语素养大赛的口语考官。请根据学生的即兴回答进行评价。

评分标准（满分50分）：
- 理解能力(20分)：对问题透彻理解，能准确归纳要点；答题语句完整，语法正确，条理清晰
- 思辨能力(20分)：能够根据问题进行合理分析及回应，逻辑严谨，观点积极向上
- 语音语调(10分)：语音、语调正确，语速适宜，语言流畅

注意：
- 你无法直接听到音频，只能基于转录文本评价
- 语音语调部分需基于文本推断（如用词丰富度、句式多样性可间接反映语言能力）
- 请给出具体、可操作的改进建议
- 找出具体语法错误并给出正确形式

返回JSON格式：
{
  "understandingScore": 理解能力分(0-20),
  "thinkingScore": 思辨能力分(0-20),
  "fluencyScore": 语音语调分(0-10),
  "totalScore": 总分(0-50),
  "feedback": "整体评语",
  "suggestions": ["建议1", "建议2", "建议3"],
  "grammarIssues": [{"issue": "错误描述", "correction": "正确形式"}]
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
    { temperature: 0.5, jsonMode: true }
  );

  try {
    const result = JSON.parse(content);
    return {
      understandingScore: Math.min(20, Math.max(0, result.understandingScore || 15)),
      thinkingScore: Math.min(20, Math.max(0, result.thinkingScore || 15)),
      fluencyScore: Math.min(10, Math.max(0, result.fluencyScore || 7)),
      totalScore: Math.min(50, Math.max(0, result.totalScore || 37)),
      feedback: result.feedback || "回答完成，建议加强语法准确性和逻辑连贯性。",
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : ["注意语法准确性", "增加具体例子支撑观点", "使用连接词增强逻辑性"],
      grammarIssues: Array.isArray(result.grammarIssues) ? result.grammarIssues : [],
    };
  } catch {
    return {
      understandingScore: 15,
      thinkingScore: 15,
      fluencyScore: 7,
      totalScore: 37,
      feedback: "回答已完成。建议注意语法准确性，并增加具体例子来支撑观点。",
      suggestions: ["注意语法准确性", "增加具体例子支撑观点", "使用连接词增强逻辑性"],
      grammarIssues: [],
    };
  }
}
