import { useState, useEffect, useRef, useCallback } from "react";

interface UseCountdownOptions {
  onExpire?: () => void;
  warningThreshold?: number; // seconds remaining to trigger warning state
}

export function useCountdown(options: UseCountdownOptions = {}) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const expiresAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(options.onExpire);
  onExpireRef.current = options.onExpire;

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const startFromExpiry = useCallback(
    (expiresAt: number) => {
      stop();
      expiresAtRef.current = expiresAt;
      setIsRunning(true);

      const tick = () => {
        const remaining = Math.max(
          0,
          Math.floor((expiresAt - Date.now()) / 1000),
        );
        setRemainingSeconds(remaining);
        if (remaining <= 0) {
          stop();
          onExpireRef.current?.();
        }
      };

      tick();
      timerRef.current = setInterval(tick, 1000);
    },
    [stop],
  );

  const startFromDuration = useCallback(
    (durationSeconds: number) => {
      const expiresAt = Date.now() + durationSeconds * 1000;
      startFromExpiry(expiresAt);
    },
    [startFromExpiry],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const warning =
    options.warningThreshold !== undefined &&
    remainingSeconds <= options.warningThreshold &&
    remainingSeconds > 0;

  return {
    remainingSeconds,
    formattedTime: formatTime(remainingSeconds),
    isRunning,
    isExpired: remainingSeconds === 0 && !isRunning && expiresAtRef.current > 0,
    warning,
    startFromExpiry,
    startFromDuration,
    stop,
  };
}
