import { describe, it, expect, vi } from 'vitest';
import { aggregateRecords, getTotalXp, getBestPoints } from './records';
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
