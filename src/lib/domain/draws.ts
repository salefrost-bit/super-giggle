import { calculateReps } from './reps';
import { SUIT_TO_CATEGORY } from './types';
import type { Card, CardDrawResult, CategoryKey, Exercise } from './types';

export function buildDraws(
  cards: Card[],
  exerciseByCategory: Record<CategoryKey, Exercise>,
  repMultiplier: number,
  withQuota = false
): CardDrawResult[] {
  return cards.map((card, index) => {
    const categoryKey = SUIT_TO_CATEGORY[card.suit];
    return {
      orderIndex: index,
      card,
      categoryKey,
      exercise: exerciseByCategory[categoryKey],
      reps: calculateReps(card, repMultiplier),
      completedAt: null,
      ...(withQuota ? { beatQuota: null } : {}),
    };
  });
}
