import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { trpc, getErrorMessage } from "@/providers/trpc";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTimer, formatTime } from "@/hooks/useTimer";
import {
  Mic,
  Square,
  RotateCcw,
  ArrowRight,
  Timer,
  AlertCircle,
  Loader2,
  MessageCircle,
  Lightbulb,
  Brain,
  Ear,
  PenLine,
} from "lucide-react";

const MAX_TRANSCRIPT_LENGTH = 3000;
const MAX_RECORD_SECONDS = 180;

type Phase = "loading" | "ready" | "preparing" | "recording" | "evaluating";

export default function SpeakingPractice() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [tips, setTips] = useState<string[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [submittedTranscript, setSubmittedTranscript] = useState("");

  const {
    transcript,
    interimTranscript,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    getTranscript,
  } = useSpeechRecognition();

  const prepTimer = useTimer(30);
  const recordTimer = useTimer(MAX_RECORD_SECONDS);

  const {
    data: generatedData,
    isLoading,
    isError: isGenerateError,
    error: generateError,
    refetch,
  } = trpc.speaking.generate.useQuery(undefined, { staleTime: Infinity });
  const evaluateMutation = trpc.evaluation.evaluateAnswer.useMutation();

  useEffect(() => {
    if (generatedData && !isLoading) {
      setQuestion(generatedData.question.question);
      setCategory(generatedData.question.category);
      setTips(generatedData.question.tips);
      setPhase("ready");
    }
  }, [generatedData, isLoading]);

  useEffect(() => {
    if (phase === "preparing" && prepTimer.isExpired) {
      handleStartRecording();
    }
  }, [prepTimer.isExpired, phase]);

  useEffect(() => {
    if (phase === "recording" && recordTimer.isExpired) {
      handleStopRecording();
    }
  }, [recordTimer.isExpired, phase]);


  const handleStartRecording = () => {
    prepTimer.pause();
    resetTranscript();
    setPhase("recording");
    recordTimer.reset(MAX_RECORD_SECONDS);
    startListening();
    setTimeout(() => recordTimer.start(), 100);
  };

  const submitEvaluation = async (answer: string, duration?: number) => {
    setEvaluationResult(null);
    setEvaluationError(null);

    // 输入校验
    if (!answer) {
      setEvaluationError("未检测到语音输入。请检查浏览器麦克风权限，并在安静环境中靠近麦克风回答。");
      return;
    }
    if (!/[a-zA-Z]{2,}/.test(answer)) {
      setEvaluationError("没有识别到英文内容，请用英文回答。");
      return;
    }
    if (answer.length > MAX_TRANSCRIPT_LENGTH) {
      setEvaluationError(`回答内容过长（最多 ${MAX_TRANSCRIPT_LENGTH} 个字符），请精简后重新回答。`);
      return;
    }

    try {
      const result = await evaluateMutation.mutateAsync({ question, transcript: answer, duration });
      setEvaluationResult(result);
    } catch (err) {
      setEvaluationError(getErrorMessage(err));
    }
  };

  const handleStopRecording = useCallback(() => {
    stopListening();
    recordTimer.pause();
    setPhase("evaluating");

    setTimeout(() => {
      const fullTranscript = getTranscript();
      setSubmittedTranscript(fullTranscript);
      submitEvaluation(fullTranscript, MAX_RECORD_SECONDS - recordTimer.timeLeft);
    }, 500);
  }, [stopListening, getTranscript, question, evaluateMutation, recordTimer]);

  const handleRetry = () => {
    resetTranscript();
    setEvaluationResult(null);
    setEvaluationError(null);
    setPhase("ready");
    prepTimer.reset(30);
    recordTimer.reset(MAX_RECORD_SECONDS);
  };

  const handleNewQuestion = async () => {
    setEvaluationResult(null);
    setEvaluationError(null);
    setPhase("loading");
    resetTranscript();
    await refetch();
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-riell-subtle flex items-center justify-center p-6">
        <div className="riell-card max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-crimson-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-navy-500 mb-2">浏览器不支持</h2>
          <p className="text-muted-foreground mb-6">
            您的浏览器不支持语音识别功能。请使用 Chrome 或 Edge 浏览器访问本页面。
          </p>
          <button onClick={() => navigate("/")} className="riell-btn-primary">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-riell-subtle">
      {/* Header */}
      <header className="bg-white border-b border-navy-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-navy-400 hover:text-navy-500 transition-colors">
              <MessageCircle className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-bold text-navy-500 font-display">问答训练</h1>
              <p className="text-xs text-muted-foreground">外研社杯地区预赛 · 英文问答</p>
            </div>
          </div>
          {phase === "preparing" && (
            <div className="flex items-center gap-2 text-gold-600 bg-gold-50 px-3 py-1.5 rounded-lg">
              <Timer className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(prepTimer.timeLeft)}</span>
            </div>
          )}
          {phase === "recording" && (
            <div className="flex items-center gap-2 text-crimson-500 bg-crimson-50 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 bg-crimson-500 rounded-full recording-pulse" />
              <span className="font-mono font-bold">{formatTime(MAX_RECORD_SECONDS - recordTimer.timeLeft)}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {phase === "loading" && !isGenerateError && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-navy-500 animate-spin" />
            <span className="ml-3 text-navy-500">AI 生成题目中...</span>
          </div>
        )}

        {phase === "loading" && isGenerateError && (
          <div className="riell-card p-8 text-center">
            <AlertCircle className="w-10 h-10 text-crimson-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-navy-500 mb-2">题目加载失败</h2>
            <p className="text-muted-foreground mb-6">{getErrorMessage(generateError)}</p>
            <button onClick={handleNewQuestion} className="riell-btn-primary">
              <RotateCcw className="w-4 h-4" />
              重试
            </button>
          </div>
        )}

        {phase === "ready" && (
          <div className="space-y-6">
            {generatedData && !generatedData.success && (
              <div className="flex items-start gap-2 p-4 bg-gold-50 rounded-lg text-sm text-gold-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>AI 出题暂时不可用，已从题库中抽取一道题目。{generatedData.error ? `（原因：${generatedData.error}）` : ""}</span>
              </div>
            )}
            <div className="riell-card p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="riell-badge">{category || "即兴问答"}</span>
              </div>

              <h2 className="text-2xl font-bold text-navy-500 font-display mb-6">
                {question}
              </h2>

              {tips.length > 0 && (
                <div className="bg-gold-50/50 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gold-700 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    答题思路提示
                  </h4>
                  <ul className="space-y-2">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gold-800">
                        <span className="w-5 h-5 bg-gold-200 rounded-full flex items-center justify-center text-xs text-gold-700 font-bold shrink-0">{i + 1}</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="riell-card p-6">
              <h3 className="font-semibold text-navy-500 mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-gold-500" />
                答题说明
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-navy-100 rounded-full flex items-center justify-center text-xs text-navy-500 font-bold shrink-0 mt-0.5">1</span>
                  阅读题目，想好思路后点击“开始回答”，系统立即开始录音
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-navy-100 rounded-full flex items-center justify-center text-xs text-navy-500 font-bold shrink-0 mt-0.5">2</span>
                  用英文作答，页面会实时显示语音识别文本；说完点击“结束回答”（最长 3 分钟）
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-navy-100 rounded-full flex items-center justify-center text-xs text-navy-500 font-bold shrink-0 mt-0.5">3</span>
                  AI 将从内容切题、逻辑完整、语法、词汇、表达自然度五个维度评分，并给出参考答案
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button onClick={handleStartRecording} className="riell-btn-primary flex-1 text-lg py-4">
                <Mic className="w-5 h-5" />
                开始回答
              </button>
              <button onClick={handleNewQuestion} className="riell-btn-outline">
                <RotateCcw className="w-4 h-4" />
                换一题
              </button>
            </div>
          </div>
        )}

        {phase === "preparing" && (
          <div className="space-y-6">
            <div className="riell-card-gradient p-8 text-center">
              <h2 className="text-2xl font-bold mb-2 font-display">准备时间</h2>
              <p className="text-blue-100/80 mb-6">整理思路，构思回答要点</p>
              <div className="text-6xl font-bold font-mono text-gold-400 mb-6">
                {formatTime(prepTimer.timeLeft)}
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gold-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${prepTimer.progress}%` }}
                />
              </div>
            </div>

            <div className="riell-card p-8">
              <h3 className="text-xl font-bold text-navy-500 font-display mb-4">{question}</h3>
              {tips.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">答题提示：</p>
                  {tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-navy-600">
                      <span className="w-5 h-5 bg-gold-100 rounded-full flex items-center justify-center text-xs text-gold-600 font-bold shrink-0">{i + 1}</span>
                      {tip}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleStartRecording} className="riell-btn-primary w-full text-lg py-4">
              <Mic className="w-5 h-5" />
              提前开始回答
            </button>
          </div>
        )}

        {phase === "recording" && (
          <div className="space-y-6">
            <div className="riell-card p-8 text-center border-crimson-200">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-4 h-4 bg-crimson-500 rounded-full recording-pulse" />
                <h2 className="text-2xl font-bold text-crimson-500 font-display">正在录音</h2>
              </div>
              <div className="text-6xl font-bold font-mono text-navy-500 mb-6">
                {formatTime(MAX_RECORD_SECONDS - recordTimer.timeLeft)}
              </div>
              <p className="text-sm text-muted-foreground -mt-4 mb-6">已录音时长 · 最长 {MAX_RECORD_SECONDS / 60} 分钟，到时自动结束</p>
              <div className="w-full bg-navy-100 rounded-full h-2">
                <div
                  className="bg-crimson-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${recordTimer.progress}%` }}
                />
              </div>
            </div>

            <div className="riell-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">题目</h3>
              <p className="text-lg font-medium text-navy-500 mb-4">{question}</p>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">实时转写</h3>
              <div className="min-h-[100px] p-4 bg-navy-50/50 rounded-lg text-navy-600">
                {transcript}
                {interimTranscript && (
                  <span className="text-navy-400"> {interimTranscript}</span>
                )}
                {!transcript && !interimTranscript && (
                  <span className="text-muted-foreground italic">等待语音输入...</span>
                )}
              </div>
              {speechError && (
                <div className="mt-3 flex items-center gap-2 text-sm text-crimson-500">
                  <AlertCircle className="w-4 h-4" />
                  {speechError}
                </div>
              )}
            </div>

            <button
              onClick={handleStopRecording}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-crimson-500 hover:bg-crimson-600 text-white font-medium rounded-lg transition-all"
            >
              <Square className="w-5 h-5" />
              结束回答
            </button>
          </div>
        )}

        {phase === "evaluating" && (
          <div className="space-y-6">
            {evaluationError ? (
              <div className="riell-card p-8 text-center">
                <AlertCircle className="w-10 h-10 text-crimson-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-navy-500 mb-2">评价未完成</h2>
                <p className="text-muted-foreground mb-6">{evaluationError}</p>
                <div className="flex gap-4 justify-center">
                  <button onClick={handleRetry} className="riell-btn-outline">
                    <RotateCcw className="w-4 h-4" />
                    重新回答
                  </button>
                  {submittedTranscript && /[a-zA-Z]{2,}/.test(submittedTranscript) && submittedTranscript.length <= MAX_TRANSCRIPT_LENGTH && (
                    <button
                      onClick={() => submitEvaluation(submittedTranscript, MAX_RECORD_SECONDS - recordTimer.timeLeft)}
                      className="riell-btn-primary"
                    >
                      重新提交评价
                    </button>
                  )}
                </div>
              </div>
            ) : !evaluationResult ? (
              <div className="riell-card p-12 text-center">
                <Loader2 className="w-10 h-10 text-navy-500 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-navy-500 mb-2">AI 评价中</h2>
                <p className="text-muted-foreground">正在分析你的回答，请稍候...</p>
              </div>
            ) : (
              <>
                <div className="riell-card-gradient p-8 text-center">
                  <h2 className="text-2xl font-bold mb-6 font-display">问答评价结果</h2>
                  <div className="text-5xl font-bold text-gold-400 font-mono">{evaluationResult.totalScore}</div>
                  <div className="text-sm text-blue-100/80 mt-1 mb-6">总分 / 50（升华加分另计，最高 +5）</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      ["理解能力", evaluationResult.understandingScore, 20],
                      ["思辨能力", evaluationResult.thinkingScore, 20],
                      ["语音语调", evaluationResult.fluencyScore, 10],
                      ["升华加分", evaluationResult.bonusScore, 5],
                    ].map(([label, value, max]) => (
                      <div key={label} className="text-center">
                        <div className="text-3xl font-bold text-gold-400 font-mono">{value}</div>
                        <div className="text-sm text-blue-100/80 mt-1">{label} / {max}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-blue-100/90 leading-relaxed max-w-xl mx-auto">
                    {evaluationResult.feedback}
                  </p>
                </div>

                {evaluationResult.strengths?.length > 0 && (
                  <div className="riell-card p-6">
                    <h3 className="font-semibold text-navy-500 mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-gold-500" />
                      优点
                    </h3>
                    <ul className="space-y-2">
                      {evaluationResult.strengths.map((t: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-navy-600">
                          <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-700 font-bold shrink-0">✓</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluationResult.grammarIssues?.length > 0 && (
                  <div className="riell-card p-6">
                    <h3 className="font-semibold text-navy-500 mb-3 flex items-center gap-2">
                      <Ear className="w-5 h-5 text-gold-500" />
                      待改进
                    </h3>
                    <div className="space-y-3">
                      {evaluationResult.grammarIssues.map((item: { issue: string; correction: string; explanation?: string }, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-crimson-50 rounded-lg">
                          <span className="w-5 h-5 bg-crimson-100 rounded-full flex items-center justify-center text-xs text-crimson-600 font-bold shrink-0">!</span>
                          <div>
                            <p className="text-sm text-crimson-700">“{item.issue}”</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.explanation}</p>
                            <p className="text-sm text-green-700 mt-1">→ {item.correction}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluationResult.revisedAnswer && (
                  <div className="riell-card p-6">
                    <h3 className="font-semibold text-navy-500 mb-3 flex items-center gap-2">
                      <PenLine className="w-5 h-5 text-gold-500" />
                      修改后的参考答案
                    </h3>
                    <p className="p-4 bg-green-50 rounded-lg text-sm text-navy-600 leading-relaxed whitespace-pre-line">
                      {evaluationResult.revisedAnswer}
                    </p>
                  </div>
                )}

                {evaluationResult.suggestions?.length > 0 && (
                  <div className="riell-card p-6">
                    <h3 className="font-semibold text-navy-500 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-gold-500" />
                      改进建议
                    </h3>
                    <ul className="space-y-2">
                      {evaluationResult.suggestions.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-navy-600">
                          <span className="w-5 h-5 bg-navy-100 rounded-full flex items-center justify-center text-xs text-navy-500 font-bold shrink-0">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="riell-card p-6">
                  <h3 className="font-semibold text-navy-500 mb-3">题目</h3>
                  <p className="text-navy-600 mb-4 font-medium">{question}</p>
                  <h3 className="font-semibold text-navy-500 mb-3">语音识别文本</h3>
                  <div className="p-4 bg-navy-50/50 rounded-lg text-sm text-navy-600 leading-relaxed">
                    {submittedTranscript || "（未检测到语音输入）"}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleRetry} className="riell-btn-outline flex-1">
                    <RotateCcw className="w-4 h-4" />
                    重新练习
                  </button>
                  <button onClick={handleNewQuestion} className="riell-btn-primary flex-1">
                    下一题
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
