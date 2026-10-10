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

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  /** 读取最新的识别文本（含尚未确定的部分），不受组件闭包过期影响 */
  getTranscript: () => string;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const wantListeningRef = useRef(false);

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

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

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
  };
}
