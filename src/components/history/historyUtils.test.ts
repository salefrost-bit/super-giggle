import { describe, it, expect } from 'vitest';
import {
  avgSecondsPerCard,
  finishedCardCount,
  isBestInDimension,
  last14DaysPoints,
} from './historyUtils';
import type { SessionHistoryEntry } from '@/lib/supabase/sessions';

function session(overrides: Partial<SessionHistoryEntry> = {}): SessionHistoryEntry {
  return {
    id: 's',
    startedAt: '2026-07-15T10:00:00.000Z',
    completedAt: '2026-07-15T10:10:00.000Z',
    totalDurationSeconds: 120,
    totalCards: 12,
    status: 'completed',
    difficultyName: 'Srednji',
    gameMode: 'classic',
    score: null,
    pauseCount: null,
    totalPauseSeconds: null,
    points: 100,
    basePoints: 100,
    multiplier: 1,
    entry: 'quick',
    sprintMinutes: null,
    cardCount: 12,
    cardsCompleted: null,
    survivedCards: null,
    ...overrides,
  };
}

describe('historyUtils', () => {
  it('finishedCardCount: cards_completed → survived_cards → total_cards', () => {
    expect(finishedCardCount(session({ cardsCompleted: 8 }))).toBe(8);
    expect(finishedCardCount(session({ cardsCompleted: null, survivedCards: 5 }))).toBe(5);
    expect(finishedCardCount(session())).toBe(12);
  });

  it('avgSecondsPerCard', () => {
    expect(avgSecondsPerCard(session({ totalDurationSeconds: 120, totalCards: 12 }))).toBe(10);
    expect(avgSecondsPerCard(session({ totalDurationSeconds: null }))).toBeNull();
  });

  it('isBestInDimension poredi isti mod/dimenziju', () => {
    const a = session({ id: 'a', points: 200, cardCount: 24, totalCards: 24 });
    const b = session({ id: 'b', points: 150, cardCount: 24, totalCards: 24 });
    const c = session({ id: 'c', points: 300, cardCount: 12, totalCards: 12 });
    expect(isBestInDimension(a, [a, b, c])).toBe(true);
    expect(isBestInDimension(b, [a, b, c])).toBe(false);
    expect(isBestInDimension(c, [a, b, c])).toBe(true);
  });

  it('last14DaysPoints agregira po lokalnom danu', () => {
    const now = new Date(2026, 6, 16, 12); // Jul 16 2026 local
    const today = new Date(2026, 6, 16, 9).toISOString();
    const bars = last14DaysPoints(
      [session({ completedAt: today, points: 50 }), session({ completedAt: today, points: 25 })],
      now
    );
    expect(bars).toHaveLength(14);
    expect(bars[13]).toBe(75);
    expect(bars[0]).toBe(0);
  });
});
