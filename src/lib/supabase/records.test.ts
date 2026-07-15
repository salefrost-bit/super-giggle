import { describe, it, expect, vi } from 'vitest';
import { aggregateRecords, getTotalXp } from './records';
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
