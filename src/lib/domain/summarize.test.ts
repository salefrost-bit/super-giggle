import { describe, it, expect } from 'vitest';
import { summarizeByCategory } from './summarize';
import type { CardDrawResult } from './types';

const exercise = { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' };
const exercise2 = { id: 'e2', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1' };

describe('summarizeByCategory', () => {
  it('sums reps and counts cards per category', () => {
    const draws: CardDrawResult[] = [
      { orderIndex: 0, card: { suit: 'hearts', rank: 5 }, categoryKey: 'push', exercise, reps: 5, completedAt: 't1' },
      { orderIndex: 1, card: { suit: 'hearts', rank: 8 }, categoryKey: 'push', exercise, reps: 8, completedAt: 't2' },
      { orderIndex: 2, card: { suit: 'spades', rank: 6 }, categoryKey: 'legs', exercise: exercise2, reps: 6, completedAt: 't3' },
    ];

    expect(summarizeByCategory(draws)).toEqual([
      { categoryKey: 'push', exerciseName: 'Sklekovi', totalReps: 13, cardCount: 2 },
      { categoryKey: 'legs', exerciseName: 'Čučnjevi', totalReps: 6, cardCount: 1 },
    ]);
  });

  it('returns an empty array for no draws', () => {
    expect(summarizeByCategory([])).toEqual([]);
  });
});
