'use client';

import { useState, useCallback, useReducer, useEffect } from 'react';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  getElapsedSeconds,
  type TimerState,
} from '@/lib/domain/timer';

export function useStopwatch() {
  const [state, setState] = useState<TimerState>(() => startTimer());
  const [isPaused, setIsPaused] = useState(false);
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(forceRerender, 250);
    return () => clearInterval(interval);
  }, [isPaused]);

  const pause = useCallback(() => {
    setState((s) => pauseTimer(s));
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setState((s) => resumeTimer(s));
    setIsPaused(false);
  }, []);

  return {
    elapsedSeconds: getElapsedSeconds(state),
    isPaused,
    pause,
    resume,
  };
}
