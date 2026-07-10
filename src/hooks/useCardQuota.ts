'use client';

import { useEffect, useReducer, useRef } from 'react';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  getElapsedSeconds,
  type TimerState,
} from '@/lib/domain/timer';

export function useCardQuota(
  quotaSeconds: number | null,
  cardIndex: number,
  isPaused: boolean
): { remainingSeconds: number; fraction: number; expired: boolean } {
  const timerRef = useRef<TimerState>(startTimer());
  const lastIndexRef = useRef(cardIndex);
  const wasPausedRef = useRef(isPaused);
  const [, forceRerender] = useReducer((c: number) => c + 1, 0);

  if (lastIndexRef.current !== cardIndex) {
    lastIndexRef.current = cardIndex;
    timerRef.current = startTimer();
  }

  if (wasPausedRef.current !== isPaused) {
    wasPausedRef.current = isPaused;
    timerRef.current = isPaused ? pauseTimer(timerRef.current) : resumeTimer(timerRef.current);
  }

  useEffect(() => {
    if (quotaSeconds === null || isPaused) return;
    const interval = setInterval(forceRerender, 250);
    return () => clearInterval(interval);
  }, [quotaSeconds, isPaused, cardIndex]);

  if (quotaSeconds === null) {
    return { remainingSeconds: 0, fraction: 1, expired: false };
  }

  const elapsed = getElapsedSeconds(timerRef.current);
  const remainingSeconds = Math.max(0, quotaSeconds - elapsed);
  return {
    remainingSeconds,
    fraction: quotaSeconds > 0 ? remainingSeconds / quotaSeconds : 0,
    expired: remainingSeconds === 0,
  };
}
