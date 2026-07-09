import type { CardDrawResult, CategoryKey } from './types';

export interface CategoryBreakdown {
  categoryKey: CategoryKey;
  exerciseName: string;
  totalReps: number;
  cardCount: number;
}

export function summarizeByCategory(draws: CardDrawResult[]): CategoryBreakdown[] {
  const map = new Map<CategoryKey, CategoryBreakdown>();
  for (const draw of draws) {
    const existing = map.get(draw.categoryKey);
    if (existing) {
      existing.totalReps += draw.reps;
      existing.cardCount += 1;
    } else {
      map.set(draw.categoryKey, {
        categoryKey: draw.categoryKey,
        exerciseName: draw.exercise.name,
        totalReps: draw.reps,
        cardCount: 1,
      });
    }
  }
  return Array.from(map.values());
}
