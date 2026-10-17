import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface UseSpeechRecognitionOptions {
  /** 为 true 时，结束录音后保留麦克风（完整模拟在两个环节之间复用同一路音频流） */
  keepMicrophoneOpen?: boolean;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => Promise<string | null>;
  resetTranscript: () => void;
  /** 读取最新的识别文本（含尚未确定的部分），不受组件闭包过期影响 */
  getTranscript: () => string;
  /** 麦克风权限/设备错误（来自 getUserMedia） */
  micError: string | null;
  /** 须在用户点击中调用：申请麦克风权限，成功返回 true */
  requestMicrophone: () => Promise<boolean>;
  /** 停止录音并释放麦克风 */
  releaseMicrophone: () => void;
}

function describeMicError(err: unknown): string {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "麦克风权限被拒绝。请点击地址栏左侧的图标，允许本网站使用麦克风后重试。";
    case "NotFoundError":
    case "OverconstrainedError":
      return "未检测到麦克风设备。请连接麦克风或耳机后重试。";
    case "NotReadableError":
    case "AbortError":
      return "麦克风无法使用，可能被其他应用占用。请关闭其他使用麦克风的程序后重试。";
    default:
      return `无法打开麦克风${name ? `（${name}）` : ""}，请检查设备和浏览器设置后重试。`;
  }
}

export function useSpeechRecognition(
  { keepMicrophoneOpen = false }: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const wantListeningRef = useRef(false);
  const [micError, setMicError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  // 本次录音结束后得到的本地音频地址（仅保存在浏览器内存中，不上传）
  const audioPromiseRef = useRef<Promise<string | null>>(Promise.resolve(null));
  const audioUrlsRef = useRef<string[]>([]);

  const isSupported = typeof window !== "undefined" && (
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      // 只处理本次新增的结果，避免已确定的句子被重复追加
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        finalRef.current += finalText;
        setTranscript(finalRef.current);
      }
      interimRef.current = interimText;
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setError("麦克风权限被拒绝，请检查浏览器设置。");
      } else if (event.error === "audio-capture") {
        setError("未检测到可用的麦克风，请检查设备连接。");
      } else if (event.error === "no-speech" || event.error === "aborted") {
        return; // 静音或主动停止，onend 中会自动续录
      } else {
        setError(`语音识别错误: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Chrome 在停顿较久时会自动结束识别；用户还没点“结束”时自动续录
      if (wantListeningRef.current) {
        if (interimRef.current) {
          finalRef.current += interimRef.current + " ";
          interimRef.current = "";
          setTranscript(finalRef.current);
        }
        try {
          recognition.start();
          return;
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      // 离开页面时彻底停止，防止 onend 自动续录导致后台继续录音
      wantListeningRef.current = false;
      recognition.abort();
    };
  }, [isSupported]);

  const releaseMicrophone = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const requestMicrophone = useCallback(async () => {
    const live = streamRef.current?.getAudioTracks().some((t) => t.readyState === "live");
    if (live) return true;
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("当前浏览器无法访问麦克风（需要 HTTPS 页面，并使用 Chrome 或 Edge）。");
      return false;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error("getUserMedia error:", err);
      setMicError(describeMicError(err));
      return false;
    }
  }, []);

  // 离开页面时释放麦克风并清理本地音频
  useEffect(() => () => {
    releaseMicrophone();
    audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioUrlsRef.current = [];
  }, [releaseMicrophone]);

  const startRecorder = () => {
    const stream = streamRef.current;
    audioPromiseRef.current = Promise.resolve(null);
    if (!stream || typeof MediaRecorder === "undefined") return;
    try {
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      audioPromiseRef.current = new Promise((resolve) => {
        recorder.onstop = () => {
          if (!chunks.length) return resolve(null);
          const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
          audioUrlsRef.current.push(url);
          resolve(url);
        };
        recorder.onerror = () => resolve(null);
      });
      recorder.start(1000);
      recorderRef.current = recorder;
    } catch (err) {
      // 备份录音失败不影响语音识别
      console.error("MediaRecorder error:", err);
    }
  };

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError("您的浏览器不支持语音识别，请使用 Chrome 或 Edge。");
      return;
    }
    finalRef.current = "";
    interimRef.current = "";
    wantListeningRef.current = true;
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    startRecorder();
    try {
      recognitionRef.current.start();
    } catch {
      // 可能已经在运行，尝试重启
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 100);
      } catch {
        // ignore
      }
    }
  }, []);

  /** 结束录音；返回的 Promise 在本地备份音频就绪后给出播放地址（无备份时为 null） */
  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimTranscript("");

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    const audio = audioPromiseRef.current;
    if (!keepMicrophoneOpen) {
      // 单项练习：等备份音频写完再释放麦克风
      audio.finally(() => {
        if (!recorderRef.current) releaseMicrophone();
      });
    }
    return audio;
  }, [keepMicrophoneOpen, releaseMicrophone]);

  const resetTranscript = useCallback(() => {
    finalRef.current = "";
    interimRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  const getTranscript = useCallback(
    () => (finalRef.current + " " + interimRef.current).replace(/\s+/g, " ").trim(),
    [],
  );

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
    getTranscript,
    micError,
    requestMicrophone,
    releaseMicrophone,
  };
}
