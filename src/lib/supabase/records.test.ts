import { describe, it, expect, vi } from 'vitest';
import { aggregateRecords, getTotalXp, getBestPoints, computeProfileStats, getProfileStats } from './records';
import { createClient } from './client';

vi.mock('./client', () => ({ createClient: vi.fn() }));

function mockSessionsSelect(rows: Array<{ settings: Record<string, unknown> | null }>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  };
  (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: vi.fn(() => chain) });
  return chain;
}

function mockBestPointsSelect(
  rows: Array<{ settings: Record<string, unknown> | null }>,
  options?: { cardCount?: number; sprintMinutes?: number }
) {
  const filter = vi.fn().mockReturnThis();
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    filter,
    then: (resolve: (v: { data: unknown; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  };
  (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: vi.fn(() => chain) });
  return { chain, filter, options };
}

const rows = [
  { difficultyName: 'Srednji', totalCards: 26, durationSeconds: 1112, gameMode: 'classic', score: null },
  { difficultyName: 'Srednji', totalCards: 26, durationSeconds: 990, gameMode: 'perfect_deck', score: 22 },
  { difficultyName: 'Srednji', totalCards: 26, durationSeconds: 1050, gameMode: 'perfect_deck', score: 24 },
  { difficultyName: 'Napredni', totalCards: 52, durationSeconds: 2467, gameMode: 'classic', score: null },
];

describe('aggregateRecords', () => {
  it('keeps best duration and best score per difficulty+deck combination', () => {
    const result = aggregateRecords(rows);
    expect(result).toEqual([
      {
        difficultyName: 'Srednji', totalCards: 26,
        bestDurationSeconds: 990, bestScore: 24, scoreTotal: 26,
      },
      {
        difficultyName: 'Napredni', totalCards: 52,
        bestDurationSeconds: 2467, bestScore: null, scoreTotal: null,
      },
    ]);
  });

  it('returns empty for no rows', () => {
    expect(aggregateRecords([])).toEqual([]);
  });
});

describe('getTotalXp', () => {
  it('sabira points preko sesija, ignoriše sesije bez points', async () => {
    const chain = mockSessionsSelect([
      { settings: { points: 300 } },
      { settings: {} },
      { settings: { points: 200, score: 24 } },
    ]);
    expect(await getTotalXp('u1')).toBe(500);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.eq).toHaveBeenCalledWith('status', 'completed');
  });
});

describe('getBestPoints', () => {
  it('vraća max points za sprint po sprint_minutes', async () => {
    const { chain, filter } = mockBestPointsSelect([
      { settings: { points: 120, sprint_minutes: 5 } },
      { settings: { points: 200, sprint_minutes: 5 } },
      { settings: { points: 90, sprint_minutes: 5 } },
    ]);
    expect(await getBestPoints('u1', 'sprint', { sprintMinutes: 5 })).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.eq).toHaveBeenCalledWith('game_mode', 'sprint');
    expect(chain.eq).toHaveBeenCalledWith('status', 'completed');
    expect(filter).toHaveBeenCalledWith('settings->>sprint_minutes', 'eq', '5');
  });

  it('vraća max points za classic po cardCount', async () => {
    const { chain } = mockBestPointsSelect([
      { settings: { points: 100 } },
      { settings: { points: 250 } },
    ]);
    expect(await getBestPoints('u1', 'classic', { cardCount: 24 })).toBe(250);
    expect(chain.eq).toHaveBeenCalledWith('total_cards', 24);
  });

  it('vraća null kad nema sesija sa points', async () => {
    mockBestPointsSelect([{ settings: {} }, { settings: null }]);
    expect(await getBestPoints('u1', 'sprint', { sprintMinutes: 3 })).toBeNull();
  });
});

describe('computeProfileStats', () => {
  it('sabira duration/reps preko sesija i računa longestStreak i favoriteSuit', () => {
    const rows = [
      {
        total_duration_seconds: 180,
        settings: { points: 100 },
        completed_at: '2026-07-08T10:00:00Z',
        card_draws: [{ suit: 'hearts', reps: 10 }, { suit: 'clubs', reps: 5 }],
      },
      {
        total_duration_seconds: 200,
        settings: { points: 300 },
        completed_at: '2026-07-09T10:00:00Z',
        card_draws: [{ suit: 'hearts', reps: 8 }],
      },
    ] as never;

    expect(computeProfileStats(rows)).toEqual({
      bestPoints: 300,
      decksCleared: 2,
      longestStreak: 2,
      totalSeconds: 380,
      totalReps: 23,
      favoriteSuit: 'hearts',
    });
  });

  it('vraća nulta stanja za praznu istoriju', () => {
    expect(computeProfileStats([])).toEqual({
      bestPoints: null,
      decksCleared: 0,
      longestStreak: 0,
      totalSeconds: 0,
      totalReps: 0,
      favoriteSuit: null,
    });
  });

  it('nerešeno favoriteSuit ide prvom po SUIT_TO_CATEGORY redosledu (hearts > clubs > spades > diamonds)', () => {
    const rows = [
      {
        total_duration_seconds: 100,
        settings: null,
        completed_at: null,
        card_draws: [{ suit: 'diamonds', reps: 10 }, { suit: 'clubs', reps: 10 }],
      },
    ] as never;

    expect(computeProfileStats(rows).favoriteSuit).toBe('clubs');
  });

  it('ignoriše redove bez points pri traženju bestPoints', () => {
    const rows = [
      { total_duration_seconds: 100, settings: {}, completed_at: null, card_draws: [] },
      { total_duration_seconds: 50, settings: { points: 42 }, completed_at: null, card_draws: [] },
    ] as never;

    expect(computeProfileStats(rows).bestPoints).toBe(42);
  });
});

describe('getProfileStats', () => {
  it('selektuje completed sesije za korisnika i delegira agregaciju computeProfileStats', async () => {
    const chain = mockSessionsSelect([
      {
        total_duration_seconds: 180,
        settings: { points: 100 },
        completed_at: '2026-07-08T10:00:00Z',
        card_draws: [{ suit: 'hearts', reps: 10 }],
      },
    ] as never);

    const stats = await getProfileStats('u1');

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.eq).toHaveBeenCalledWith('status', 'completed');
    expect(stats).toEqual({
      bestPoints: 100,
      decksCleared: 1,
      longestStreak: 1,
      totalSeconds: 180,
      totalReps: 10,
      favoriteSuit: 'hearts',
    });
  });
});
