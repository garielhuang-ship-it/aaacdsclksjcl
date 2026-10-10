import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTimer, formatTime } from "@/hooks/useTimer";
import {
  Layers,
  Mic,
  Square,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  Loader2,
  BookOpen,
  MessageCircle,
  CheckCircle2,
  Award,
} from "lucide-react";

type Stage = "loading" | "intro" | "reading-prep" | "reading-record" | "reading-eval" | "speaking-prep" | "speaking-record" | "speaking-eval" | "complete";

export default function FullSimulation() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("loading");
  const [passageId, setPassageId] = useState(0);
  const [passage, setPassage] = useState("");
  const [passageTitle, setPassageTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [readingResult, setReadingResult] = useState<any>(null);
  const [speakingResult, setSpeakingResult] = useState<any>(null);

  const {
    transcript,
    interimTranscript,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const readingPrepTimer = useTimer(60);
  const readingRecordTimer = useTimer(120);
  const speakingPrepTimer = useTimer(30);
  const speakingRecordTimer = useTimer(90);

  const { data: passageData, isLoading: passageLoading } = trpc.reading.getRandom.useQuery();
  const { data: questionData, isLoading: questionLoading } = trpc.speaking.generate.useQuery();
  const evaluateReadingMutation = trpc.evaluation.evaluateReading.useMutation();
  const evaluateSpeakingMutation = trpc.evaluation.evaluateSpeaking.useMutation();

  useEffect(() => {
    if (passageData && questionData && !passageLoading && !questionLoading) {
      setPassageId(passageData.id);
      setPassage(passageData.content);
      setPassageTitle(passageData.title);
      setQuestion(questionData.question.question);
      setCategory(questionData.question.category);
      setStage("intro");
    }
  }, [passageData, questionData, passageLoading, questionLoading]);

  // Reading timers
  useEffect(() => {
    if (stage === "reading-prep" && readingPrepTimer.isExpired) {
      startReadingRecording();
    }
  }, [readingPrepTimer.isExpired, stage]);

  useEffect(() => {
    if (stage === "reading-record" && readingRecordTimer.isExpired) {
      stopReadingRecording();
    }
  }, [readingRecordTimer.isExpired, stage]);

  // Speaking timers
  useEffect(() => {
    if (stage === "speaking-prep" && speakingPrepTimer.isExpired) {
      startSpeakingRecording();
    }
  }, [speakingPrepTimer.isExpired, stage]);

  useEffect(() => {
    if (stage === "speaking-record" && speakingRecordTimer.isExpired) {
      stopSpeakingRecording();
    }
  }, [speakingRecordTimer.isExpired, stage]);

  const startReadingPrep = () => {
    setStage("reading-prep");
    readingPrepTimer.reset(60);
    setTimeout(() => readingPrepTimer.start(), 100);
  };

  const startReadingRecording = () => {
    readingPrepTimer.pause();
    resetTranscript();
    setStage("reading-record");
    readingRecordTimer.reset(120);
    startListening();
    setTimeout(() => readingRecordTimer.start(), 100);
  };

  const stopReadingRecording = useCallback(() => {
    stopListening();
    readingRecordTimer.pause();
    setStage("reading-eval");

    setTimeout(async () => {
      const fullTranscript = transcript + (interimTranscript ? " " + interimTranscript : "");
      if (!fullTranscript.trim()) {
        setReadingResult({
          success: true, contentScore: 0, totalScore: 0, fluencyScore: 0,
          feedback: "未检测到语音输入。", suggestions: ["检查麦克风权限"], highlights: [],
        });
        return;
      }
      try {
        const result = await evaluateReadingMutation.mutateAsync({
          passageId, passage, transcript: fullTranscript,
          duration: 120 - readingRecordTimer.timeLeft,
        });
        setReadingResult(result);
      } catch {
        setReadingResult({
          success: true, contentScore: 0, totalScore: 0, fluencyScore: 0,
          feedback: "评价失败，请继续下一环节。", suggestions: [], highlights: [],
        });
      }
    }, 500);
  }, [stopListening, transcript, interimTranscript, passageId, passage, evaluateReadingMutation, readingRecordTimer]);

  const proceedToSpeaking = () => {
    resetTranscript();
    setStage("speaking-prep");
    speakingPrepTimer.reset(30);
    setTimeout(() => speakingPrepTimer.start(), 100);
  };

  const startSpeakingRecording = () => {
    speakingPrepTimer.pause();
    resetTranscript();
    setStage("speaking-record");
    speakingRecordTimer.reset(90);
    startListening();
    setTimeout(() => speakingRecordTimer.start(), 100);
  };

  const stopSpeakingRecording = useCallback(() => {
    stopListening();
    speakingRecordTimer.pause();
    setStage("speaking-eval");

    setTimeout(async () => {
      const fullTranscript = transcript + (interimTranscript ? " " + interimTranscript : "");
      if (!fullTranscript.trim()) {
        setSpeakingResult({
          success: true, understandingScore: 0, thinkingScore: 0, fluencyScore: 0, totalScore: 0,
          feedback: "未检测到语音输入。", suggestions: [], grammarIssues: [],
        });
        setStage("complete");
        return;
      }
      try {
        const result = await evaluateSpeakingMutation.mutateAsync({
          question, transcript: fullTranscript,
          duration: 90 - speakingRecordTimer.timeLeft,
        });
        setSpeakingResult(result);
      } catch {
        setSpeakingResult({
          success: true, understandingScore: 0, thinkingScore: 0, fluencyScore: 0, totalScore: 0,
          feedback: "评价失败。", suggestions: [], grammarIssues: [],
        });
      }
      setStage("complete");
    }, 500);
  }, [stopListening, transcript, interimTranscript, question, evaluateSpeakingMutation, speakingRecordTimer]);

  const handleRestart = () => {
    window.location.reload();
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
              <Layers className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-bold text-navy-500 font-display">完整模拟</h1>
              <p className="text-xs text-muted-foreground">外研社杯地区预赛 · 全流程模拟</p>
            </div>
          </div>
          {stage === "reading-prep" && (
            <div className="flex items-center gap-2 text-gold-600 bg-gold-50 px-3 py-1.5 rounded-lg">
              <BookOpen className="w-4 h-4" />
              <span className="font-mono font-bold text-sm">{formatTime(readingPrepTimer.timeLeft)}</span>
            </div>
          )}
          {stage === "reading-record" && (
            <div className="flex items-center gap-2 text-crimson-500 bg-crimson-50 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 bg-crimson-500 rounded-full recording-pulse" />
              <span className="font-mono font-bold text-sm">{formatTime(readingRecordTimer.timeLeft)}</span>
            </div>
          )}
          {stage === "speaking-prep" && (
            <div className="flex items-center gap-2 text-gold-600 bg-gold-50 px-3 py-1.5 rounded-lg">
              <MessageCircle className="w-4 h-4" />
              <span className="font-mono font-bold text-sm">{formatTime(speakingPrepTimer.timeLeft)}</span>
            </div>
          )}
          {stage === "speaking-record" && (
            <div className="flex items-center gap-2 text-crimson-500 bg-crimson-50 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 bg-crimson-500 rounded-full recording-pulse" />
              <span className="font-mono font-bold text-sm">{formatTime(speakingRecordTimer.timeLeft)}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress indicator */}
        {!["loading", "intro", "complete"].includes(stage) && (
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
              ["reading-prep", "reading-record", "reading-eval"].includes(stage)
                ? "bg-navy-500 text-white"
                : readingResult ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
            }`}>
              <BookOpen className="w-3 h-3" />
              朗读
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
              ["speaking-prep", "speaking-record", "speaking-eval", "complete"].includes(stage)
                ? speakingResult || stage === "complete" ? "bg-green-100 text-green-700" : "bg-navy-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}>
              <MessageCircle className="w-3 h-3" />
              问答
            </div>
          </div>
        )}

        {stage === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-navy-500 animate-spin" />
            <span className="ml-3 text-navy-500">加载题目中...</span>
          </div>
        )}

        {stage === "intro" && (
          <div className="space-y-6">
            <div className="riell-card-gradient p-8 text-center">
              <Layers className="w-12 h-12 text-gold-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 font-display">完整模拟考试</h2>
              <p className="text-blue-100/80">本模式将连续完成朗读和问答两个环节</p>
            </div>

            <div className="riell-card p-6">
              <h3 className="font-semibold text-navy-500 mb-4">考试流程</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-navy-500 rounded-lg flex items-center justify-center text-white font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-medium text-navy-500">英文朗读</h4>
                    <p className="text-sm text-muted-foreground">准备 1 分钟 → 朗读 2 分钟</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-navy-500 rounded-lg flex items-center justify-center text-white font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-medium text-navy-500">英文问答</h4>
                    <p className="text-sm text-muted-foreground">准备 30 秒 → 回答 1.5 分钟</p>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={startReadingPrep} className="riell-btn-primary w-full text-lg py-4">
              <Layers className="w-5 h-5" />
              开始模拟
            </button>
          </div>
        )}

        {stage === "reading-prep" && (
          <div className="space-y-6">
            <div className="riell-card-gradient p-8 text-center">
              <h2 className="text-2xl font-bold mb-2 font-display">朗读准备</h2>
              <p className="text-blue-100/80 mb-6">请快速浏览短文，注意生词和断句</p>
              <div className="text-6xl font-bold font-mono text-gold-400 mb-6">
                {formatTime(readingPrepTimer.timeLeft)}
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-gold-400 h-2 rounded-full transition-all duration-300" style={{ width: `${readingPrepTimer.progress}%` }} />
              </div>
            </div>
            <div className="riell-card p-8">
              <h3 className="text-xl font-bold text-navy-500 font-display mb-4">{passageTitle}</h3>
              <div className="text-lg leading-relaxed text-navy-600">{passage}</div>
            </div>
            <button onClick={startReadingRecording} className="riell-btn-primary w-full text-lg py-4">
              <Mic className="w-5 h-5" />
              提前开始朗读
            </button>
          </div>
        )}

        {stage === "reading-record" && (
          <div className="space-y-6">
            <div className="riell-card p-8 text-center border-crimson-200">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-4 h-4 bg-crimson-500 rounded-full recording-pulse" />
                <h2 className="text-2xl font-bold text-crimson-500 font-display">正在朗读录音</h2>
              </div>
              <div className="text-6xl font-bold font-mono text-navy-500 mb-6">
                {formatTime(readingRecordTimer.timeLeft)}
              </div>
              <div className="w-full bg-navy-100 rounded-full h-2">
                <div className="bg-crimson-500 h-2 rounded-full transition-all duration-300" style={{ width: `${readingRecordTimer.progress}%` }} />
              </div>
            </div>
            <div className="riell-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">实时转写</h3>
              <div className="min-h-[80px] p-4 bg-navy-50/50 rounded-lg text-navy-600">
                {transcript}
                {interimTranscript && <span className="text-navy-400"> {interimTranscript}</span>}
                {!transcript && !interimTranscript && <span className="text-muted-foreground italic">等待语音输入...</span>}
              </div>
              {speechError && (
                <div className="mt-3 flex items-center gap-2 text-sm text-crimson-500">
                  <AlertCircle className="w-4 h-4" /> {speechError}
                </div>
              )}
            </div>
            <button onClick={stopReadingRecording} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-crimson-500 hover:bg-crimson-600 text-white font-medium rounded-lg transition-all">
              <Square className="w-5 h-5" />
              结束朗读
            </button>
          </div>
        )}

        {stage === "reading-eval" && (
          <div className="space-y-6">
            {!readingResult ? (
              <div className="riell-card p-12 text-center">
                <Loader2 className="w-10 h-10 text-navy-500 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-navy-500 mb-2">AI 评价朗读中</h2>
                <p className="text-muted-foreground">请稍候...</p>
              </div>
            ) : (
              <>
                <div className="riell-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <h2 className="text-xl font-bold text-navy-500 font-display">朗读环节完成</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-navy-50 rounded-lg">
                      <div className="text-3xl font-bold text-navy-500 font-mono">{readingResult.totalScore}</div>
                      <div className="text-xs text-muted-foreground mt-1">总分 / 50</div>
                    </div>
                    <div className="text-center p-4 bg-navy-50 rounded-lg">
                      <div className="text-3xl font-bold text-navy-500 font-mono">{readingResult.contentScore}</div>
                      <div className="text-xs text-muted-foreground mt-1">内容完整度</div>
                    </div>
                    <div className="text-center p-4 bg-navy-50 rounded-lg">
                      <div className="text-3xl font-bold text-navy-500 font-mono">{readingResult.fluencyScore}</div>
                      <div className="text-xs text-muted-foreground mt-1">流畅度</div>
                    </div>
                  </div>
                </div>
                <button onClick={proceedToSpeaking} className="riell-btn-primary w-full text-lg py-4">
                  进入问答环节
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        )}

        {stage === "speaking-prep" && (
          <div className="space-y-6">
            <div className="riell-card-gradient p-8 text-center">
              <h2 className="text-2xl font-bold mb-2 font-display">问答准备</h2>
              <p className="text-blue-100/80 mb-6">整理思路，构思回答要点</p>
              <div className="text-6xl font-bold font-mono text-gold-400 mb-6">
                {formatTime(speakingPrepTimer.timeLeft)}
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-gold-400 h-2 rounded-full transition-all duration-300" style={{ width: `${speakingPrepTimer.progress}%` }} />
              </div>
            </div>
            <div className="riell-card p-8">
              <span className="riell-badge mb-4 inline-block">{category}</span>
              <h3 className="text-xl font-bold text-navy-500 font-display">{question}</h3>
            </div>
            <button onClick={startSpeakingRecording} className="riell-btn-primary w-full text-lg py-4">
              <Mic className="w-5 h-5" />
              提前开始回答
            </button>
          </div>
        )}

        {stage === "speaking-record" && (
          <div className="space-y-6">
            <div className="riell-card p-8 text-center border-crimson-200">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-4 h-4 bg-crimson-500 rounded-full recording-pulse" />
                <h2 className="text-2xl font-bold text-crimson-500 font-display">正在回答录音</h2>
              </div>
              <div className="text-6xl font-bold font-mono text-navy-500 mb-6">
                {formatTime(speakingRecordTimer.timeLeft)}
              </div>
              <div className="w-full bg-navy-100 rounded-full h-2">
                <div className="bg-crimson-500 h-2 rounded-full transition-all duration-300" style={{ width: `${speakingRecordTimer.progress}%` }} />
              </div>
            </div>
            <div className="riell-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">题目</h3>
              <p className="text-lg font-medium text-navy-500 mb-4">{question}</p>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">实时转写</h3>
              <div className="min-h-[80px] p-4 bg-navy-50/50 rounded-lg text-navy-600">
                {transcript}
                {interimTranscript && <span className="text-navy-400"> {interimTranscript}</span>}
                {!transcript && !interimTranscript && <span className="text-muted-foreground italic">等待语音输入...</span>}
              </div>
            </div>
            <button onClick={stopSpeakingRecording} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-crimson-500 hover:bg-crimson-600 text-white font-medium rounded-lg transition-all">
              <Square className="w-5 h-5" />
              结束回答
            </button>
          </div>
        )}

        {stage === "speaking-eval" && (
          <div className="riell-card p-12 text-center">
            <Loader2 className="w-10 h-10 text-navy-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-navy-500 mb-2">AI 评价问答中</h2>
            <p className="text-muted-foreground">请稍候...</p>
          </div>
        )}

        {stage === "complete" && (
          <div className="space-y-6">
            <div className="riell-card-gradient p-8 text-center">
              <Award className="w-12 h-12 text-gold-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 font-display">模拟考试完成</h2>
              <p className="text-blue-100/80 mb-6">以下是你在两个环节中的表现</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold text-gold-400 font-mono">
                    {((readingResult?.totalScore || 0) + (speakingResult?.totalScore || 0))}
                  </div>
                  <div className="text-sm text-blue-100/80 mt-1">总分 / 100</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold text-gold-400 font-mono">{readingResult?.totalScore || 0}</div>
                  <div className="text-sm text-blue-100/80 mt-1">朗读 / 50</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold text-gold-400 font-mono">{speakingResult?.totalScore || 0}</div>
                  <div className="text-sm text-blue-100/80 mt-1">问答 / 50</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold text-gold-400 font-mono">
                    {Math.round(((readingResult?.totalScore || 0) + (speakingResult?.totalScore || 0)))}
                  </div>
                  <div className="text-sm text-blue-100/80 mt-1">综合得分</div>
                </div>
              </div>
            </div>

            {/* Reading Result */}
            {readingResult && (
              <div className="riell-card p-6">
                <h3 className="font-semibold text-navy-500 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-navy-400" />
                  朗读环节详情
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-navy-50 rounded-lg">
                    <div className="text-xl font-bold text-navy-500">{readingResult.contentScore}</div>
                    <div className="text-xs text-muted-foreground">内容完整度</div>
                  </div>
                  <div className="text-center p-3 bg-navy-50 rounded-lg">
                    <div className="text-xl font-bold text-navy-500">{readingResult.fluencyScore}</div>
                    <div className="text-xs text-muted-foreground">流畅度</div>
                  </div>
                  <div className="text-center p-3 bg-navy-50 rounded-lg">
                    <div className="text-xl font-bold text-navy-500">{readingResult.totalScore}</div>
                    <div className="text-xs text-muted-foreground">总分</div>
                  </div>
                </div>
                <p className="text-sm text-navy-600 mb-3">{readingResult.feedback}</p>
                {readingResult.suggestions?.length > 0 && (
                  <div className="space-y-1">
                    {readingResult.suggestions.map((s: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-gold-500">•</span> {s}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Speaking Result */}
            {speakingResult && (
              <div className="riell-card p-6">
                <h3 className="font-semibold text-navy-500 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-navy-400" />
                  问答环节详情
                </h3>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 bg-navy-50 rounded-lg">
                    <div className="text-xl font-bold text-navy-500">{speakingResult.understandingScore}</div>
                    <div className="text-xs text-muted-foreground">理解能力 / 20</div>
                  </div>
                  <div className="text-center p-3 bg-navy-50 rounded-lg">
                    <div className="text-xl font-bold text-navy-500">{speakingResult.thinkingScore}</div>
                    <div className="text-xs text-muted-foreground">思辨能力 / 20</div>
                  </div>
                  <div className="text-center p-3 bg-navy-50 rounded-lg">
                    <div className="text-xl font-bold text-navy-500">{speakingResult.fluencyScore}</div>
                    <div className="text-xs text-muted-foreground">语音语调 / 10</div>
                  </div>
                  <div className="text-center p-3 bg-navy-50 rounded-lg">
                    <div className="text-xl font-bold text-navy-500">{speakingResult.totalScore}</div>
                    <div className="text-xs text-muted-foreground">总分 / 50</div>
                  </div>
                </div>
                <p className="text-sm text-navy-600 mb-3">{speakingResult.feedback}</p>
                {speakingResult.grammarIssues?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-navy-500 mb-2">语法纠正</h4>
                    {speakingResult.grammarIssues.map((issue: any, i: number) => (
                      <div key={i} className="text-sm p-2 bg-crimson-50 rounded mb-1">
                        <span className="text-crimson-600">{issue.issue}</span>
                        <span className="text-green-600 ml-2">→ {issue.correction}</span>
                      </div>
                    ))}
                  </div>
                )}
                {speakingResult.suggestions?.length > 0 && (
                  <div className="space-y-1">
                    {speakingResult.suggestions.map((s: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-gold-500">•</span> {s}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={handleRestart} className="riell-btn-primary flex-1">
                <RotateCcw className="w-4 h-4" />
                再来一次
              </button>
              <button onClick={() => navigate("/")} className="riell-btn-outline flex-1">
                返回首页
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
