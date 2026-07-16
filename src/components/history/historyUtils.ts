import type { SessionHistoryEntry } from '@/lib/supabase/sessions';

/** Spec S6: finished-card count for AVG PER CARD. */
export function finishedCardCount(session: SessionHistoryEntry): number {
  if (session.cardsCompleted != null) return session.cardsCompleted;
  if (session.survivedCards != null) return session.survivedCards;
  return session.totalCards;
}

export function avgSecondsPerCard(session: SessionHistoryEntry): number | null {
  if (session.totalDurationSeconds == null) return null;
  const cards = finishedCardCount(session);
  if (cards <= 0) return null;
  return session.totalDurationSeconds / cards;
}

export function sameHistoryDimension(a: SessionHistoryEntry, b: SessionHistoryEntry): boolean {
  if (a.gameMode !== b.gameMode) return false;
  if (a.gameMode === 'sprint') return a.sprintMinutes === b.sprintMinutes;
  return (a.cardCount ?? a.totalCards) === (b.cardCount ?? b.totalCards);
}

/** BEST bedž: max points among sessions in the same mode/dimension. */
export function isBestInDimension(
  session: SessionHistoryEntry,
  all: SessionHistoryEntry[]
): boolean {
  if (session.points == null || session.status !== 'completed') return false;
  const peers = all.filter(
    (s) => s.status === 'completed' && s.points != null && sameHistoryDimension(s, session)
  );
  const max = Math.max(...peers.map((s) => s.points as number));
  return session.points === max;
}

export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Points summed per local day for the last 14 days (index 0 = 13 days ago, 13 = today). */
export function last14DaysPoints(sessions: SessionHistoryEntry[], now: Date): number[] {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== 'completed' || s.points == null) continue;
    const when = s.completedAt ?? s.startedAt;
    const key = localDayKey(new Date(when));
    totals.set(key, (totals.get(key) ?? 0) + s.points);
  }
  const bars: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    bars.push(totals.get(localDayKey(d)) ?? 0);
  }
  return bars;
}
