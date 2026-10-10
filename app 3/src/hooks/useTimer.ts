import { useState, useRef, useCallback, useEffect } from "react";

interface UseTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  isExpired: boolean;
  progress: number;
  start: () => void;
  pause: () => void;
  reset: (newDuration?: number) => void;
}

export function useTimer(initialSeconds: number): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning || timeLeft <= 0) return;
    setIsRunning(true);
    setIsExpired(false);
    startTimeRef.current = Date.now() - (initialSeconds - timeLeft) * 1000;

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, initialSeconds - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        setIsRunning(false);
        clearTimer();
      }
    }, 100);
  }, [isRunning, timeLeft, initialSeconds, clearTimer]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimer();
    pausedTimeRef.current = timeLeft;
  }, [clearTimer, timeLeft]);

  const reset = useCallback(
    (newDuration?: number) => {
      clearTimer();
      const duration = newDuration ?? initialSeconds;
      setTimeLeft(duration);
      setIsRunning(false);
      setIsExpired(false);
      pausedTimeRef.current = 0;
    },
    [clearTimer, initialSeconds]
  );

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const progress = initialSeconds > 0 ? (timeLeft / initialSeconds) * 100 : 0;

  return {
    timeLeft,
    isRunning,
    isExpired,
    progress,
    start,
    pause,
    reset,
  };
}

// 格式化时间显示 mm:ss
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
