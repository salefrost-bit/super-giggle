export interface TimerState {
  startedAt: number; // epoch ms
  pausedAt: number | null; // epoch ms; null while running
}

export function startTimer(now: number = Date.now()): TimerState {
  return { startedAt: now, pausedAt: null };
}

export function pauseTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (state.pausedAt !== null) return state;
  return { ...state, pausedAt: now };
}

export function resumeTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (state.pausedAt === null) return state;
  const pauseDuration = now - state.pausedAt;
  return { startedAt: state.startedAt + pauseDuration, pausedAt: null };
}

export function getElapsedSeconds(state: TimerState, now: number = Date.now()): number {
  const effectiveNow = state.pausedAt ?? now;
  return Math.floor((effectiveNow - state.startedAt) / 1000);
}
