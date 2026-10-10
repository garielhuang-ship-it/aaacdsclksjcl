import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
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
} from "lucide-react";

type Phase = "loading" | "ready" | "preparing" | "recording" | "evaluating";

export default function SpeakingPractice() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [tips, setTips] = useState<string[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  const {
    transcript,
    interimTranscript,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const prepTimer = useTimer(30);
  const recordTimer = useTimer(90);

  const { data: generatedData, isLoading, refetch } = trpc.speaking.generate.useQuery();
  const evaluateMutation = trpc.evaluation.evaluateSpeaking.useMutation();

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

  const handleStartPreparing = () => {
    setPhase("preparing");
    prepTimer.reset(30);
    setTimeout(() => prepTimer.start(), 100);
  };

  const handleStartRecording = () => {
    prepTimer.pause();
    resetTranscript();
    setPhase("recording");
    recordTimer.reset(90);
    startListening();
    setTimeout(() => recordTimer.start(), 100);
  };

  const handleStopRecording = useCallback(() => {
    stopListening();
    recordTimer.pause();
    setPhase("evaluating");

    setTimeout(async () => {
      const fullTranscript = transcript + (interimTranscript ? " " + interimTranscript : "");
      if (!fullTranscript.trim()) {
        setEvaluationResult({
          success: true,
          understandingScore: 0,
          thinkingScore: 0,
          fluencyScore: 0,
          totalScore: 0,
          feedback: "未检测到语音输入。请确保麦克风正常工作，并在安静环境中回答。",
          suggestions: ["检查浏览器麦克风权限", "使用 Chrome 或 Edge 浏览器", "回答时尽量靠近麦克风"],
          grammarIssues: [],
        });
        return;
      }

      try {
        const result = await evaluateMutation.mutateAsync({
          question,
          transcript: fullTranscript,
          duration: 90 - recordTimer.timeLeft,
        });
        setEvaluationResult(result);
      } catch (err) {
        console.error("Evaluation error:", err);
        setEvaluationResult({
          success: true,
          understandingScore: 0,
          thinkingScore: 0,
          fluencyScore: 0,
          totalScore: 0,
          feedback: "评价服务暂时不可用，请稍后重试。",
          suggestions: ["检查网络连接", "稍后重新提交"],
          grammarIssues: [],
        });
      }
    }, 500);
  }, [stopListening, transcript, interimTranscript, question, evaluateMutation, recordTimer]);

  const handleRetry = () => {
    resetTranscript();
    setEvaluationResult(null);
    setPhase("ready");
    prepTimer.reset(30);
    recordTimer.reset(90);
  };

  const handleNewQuestion = async () => {
    setEvaluationResult(null);
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
              <span className="font-mono font-bold">{formatTime(recordTimer.timeLeft)}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {phase === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-navy-500 animate-spin" />
            <span className="ml-3 text-navy-500">AI 生成题目中...</span>
          </div>
        )}

        {phase === "ready" && (
          <div className="space-y-6">
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
                比赛规则
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-navy-100 rounded-full flex items-center justify-center text-xs text-navy-500 font-bold shrink-0 mt-0.5">1</span>
                  点击开始后，你将有 30 秒时间准备回答思路
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-navy-100 rounded-full flex items-center justify-center text-xs text-navy-500 font-bold shrink-0 mt-0.5">2</span>
                  准备时间结束后，系统将自动开始录音，请在 1.5 分钟内完成回答
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-navy-100 rounded-full flex items-center justify-center text-xs text-navy-500 font-bold shrink-0 mt-0.5">3</span>
                  回答结束后，AI 将从理解能力、思辨能力、语音语调三个维度给出评价
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button onClick={handleStartPreparing} className="riell-btn-primary flex-1 text-lg py-4">
                <Mic className="w-5 h-5" />
                开始准备
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
                {formatTime(recordTimer.timeLeft)}
              </div>
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
            {!evaluationResult ? (
              <div className="riell-card p-12 text-center">
                <Loader2 className="w-10 h-10 text-navy-500 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-navy-500 mb-2">AI 评价中</h2>
                <p className="text-muted-foreground">正在分析你的回答，请稍候...</p>
              </div>
            ) : (
              <>
                <div className="riell-card-gradient p-8 text-center">
                  <h2 className="text-2xl font-bold mb-6 font-display">问答评价结果</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gold-400 font-mono">
                        {evaluationResult.totalScore}
                      </div>
                      <div className="text-sm text-blue-100/80 mt-1">总分 / 50</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gold-400 font-mono">
                        {evaluationResult.understandingScore}
                      </div>
                      <div className="text-sm text-blue-100/80 mt-1">理解能力 / 20</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gold-400 font-mono">
                        {evaluationResult.thinkingScore}
                      </div>
                      <div className="text-sm text-blue-100/80 mt-1">思辨能力 / 20</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gold-400 font-mono">
                        {evaluationResult.fluencyScore}
                      </div>
                      <div className="text-sm text-blue-100/80 mt-1">语音语调 / 10</div>
                    </div>
                  </div>
                  <p className="text-blue-100/90 leading-relaxed max-w-xl mx-auto">
                    {evaluationResult.feedback}
                  </p>
                </div>

                {evaluationResult.grammarIssues?.length > 0 && (
                  <div className="riell-card p-6">
                    <h3 className="font-semibold text-navy-500 mb-3 flex items-center gap-2">
                      <Ear className="w-5 h-5 text-gold-500" />
                      语法问题与纠正
                    </h3>
                    <div className="space-y-3">
                      {evaluationResult.grammarIssues.map((issue: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-crimson-50 rounded-lg">
                          <span className="w-5 h-5 bg-crimson-100 rounded-full flex items-center justify-center text-xs text-crimson-600 font-bold shrink-0">!</span>
                          <div>
                            <p className="text-sm text-crimson-700">{issue.issue}</p>
                            <p className="text-sm text-green-700 mt-1">→ {issue.correction}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                  <h3 className="font-semibold text-navy-500 mb-3">你的回答转写</h3>
                  <div className="p-4 bg-navy-50/50 rounded-lg text-sm text-navy-600 leading-relaxed">
                    {transcript || "（未检测到语音输入）"}
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
