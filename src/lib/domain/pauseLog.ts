// Pause accounting for a session. Pure timestamp arithmetic — durations are
// derived as resume_at − pause_at, never tick-accumulated (timer invariant,
// MVP spec 4.2). Both operations are idempotent so rapid duplicate
// visibilitychange events (or manual+auto overlap) cannot double-count.

export interface PauseLog {
  count: number;
  accumulatedMs: number;
  pausedAt: number | null; // epoch ms of the open pause; null while running
}

export function createPauseLog(): PauseLog {
  return { count: 0, accumulatedMs: 0, pausedAt: null };
}

export function logPause(log: PauseLog, now: number = Date.now()): PauseLog {
  if (log.pausedAt !== null) return log;
  return { ...log, count: log.count + 1, pausedAt: now };
}

export function logResume(log: PauseLog, now: number = Date.now()): PauseLog {
  if (log.pausedAt === null) return log;
  return {
    count: log.count,
    accumulatedMs: log.accumulatedMs + (now - log.pausedAt),
    pausedAt: null,
  };
}

export function getTotalPauseSeconds(log: PauseLog, now: number = Date.now()): number {
  const openMs = log.pausedAt !== null ? now - log.pausedAt : 0;
  return Math.round((log.accumulatedMs + openMs) / 1000);
}
