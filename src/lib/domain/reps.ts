import type { Card } from './types';

export function calculateReps(card: Card, repMultiplier: number): number {
  const raw = card.rank * repMultiplier;
  return Math.max(1, Math.round(raw));
}
