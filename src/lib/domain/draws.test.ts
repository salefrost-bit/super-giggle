import { describe, it, expect } from 'vitest';
import { buildDraws } from './draws';
import type { Card, CategoryKey, Exercise } from './types';

const exercise: Exercise = {
  id: 'e1',
  name: 'Sklekovi',
  categoryId: 'c1',
  difficultyLevelId: 'd1',
  tier: 2,
  isDefault: true,
};

const exerciseByCategory = {
  push: exercise,
  pull: exercise,
  legs: exercise,
  core: exercise,
} as Record<CategoryKey, Exercise>;

const cards: Card[] = [
  { suit: 'hearts', rank: 5 },
  { suit: 'clubs', rank: 3 },
];

describe('buildDraws', () => {
  it('mapira karte u draws sa reps i vežbom po kategoriji', () => {
    const draws = buildDraws(cards, exerciseByCategory, 1);
    expect(draws).toHaveLength(2);
    expect(draws[0]).toMatchObject({
      orderIndex: 0,
      categoryKey: 'push',
      exercise,
      reps: 5,
      completedAt: null,
    });
    expect(draws[1]).toMatchObject({
      orderIndex: 1,
      categoryKey: 'pull',
      reps: 3,
    });
    expect(draws[0].beatQuota).toBeUndefined();
  });

  it('dodaje beatQuota null kad je withQuota true', () => {
    const draws = buildDraws(cards, exerciseByCategory, 1, true);
    expect(draws.every((d) => d.beatQuota === null)).toBe(true);
  });
});
