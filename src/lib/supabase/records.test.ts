import { describe, it, expect } from 'vitest';
import { aggregateRecords } from './records';

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
