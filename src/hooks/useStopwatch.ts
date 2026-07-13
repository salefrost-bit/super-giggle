'use client';

import { useState, useCallback, useReducer, useEffect } from 'react';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  getElapsedSeconds,
  type TimerState,
} from '@/lib/domain/timer';
import {
  createPauseLog,
  logPause,
  logResume,
  getTotalPauseSeconds,
  type PauseLog,
} from '@/lib/domain/pauseLog';

export function useStopwatch() {
  const [state, setState] = useState<TimerState>(() => startTimer());
  const [pauseLog, setPauseLog] = useState<PauseLog>(() => createPauseLog());
  const [isPaused, setIsPaused] = useState(false);
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(forceRerender, 250);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Capture `now` synchronously at call time, then thread the SAME timestamp
  // into both deferred updaters. Critical for auto-pause: a visibilitychange
  // handler calls pause() the instant the tab hides, but React may defer the
  // updater until the tab is foregrounded again — if the updater called
  // Date.now() itself, it would record the foreground time and the hidden
  // interval would leak into elapsed/pause totals. Reading Date.now() here
  // (in the event turn) instead of inside the updater keeps every duration
  // anchored to the real pause moment (timer invariant, MVP spec 4.2).
  const pause = useCallback(() => {
    const now = Date.now();
    setState((s) => pauseTimer(s, now));
    setPauseLog((l) => logPause(l, now));
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    const now = Date.now();
    setState((s) => resumeTimer(s, now));
    setPauseLog((l) => logResume(l, now));
    setIsPaused(false);
  }, []);

  return {
    elapsedSeconds: getElapsedSeconds(state),
    isPaused,
    pause,
    resume,
    pauseCount: pauseLog.count,
    totalPauseSeconds: getTotalPauseSeconds(pauseLog),
  };
}
