import type { ExerciseTier } from './types';

// Konstante formule igre — namerno u kodu, ne u bazi (spec §3.5: pravilo igre,
// menja se isključivo kroz spec; invarijanta 7 pokriva sadržaj, ne formulu).
export const TIER_FACTORS: Record<ExerciseTier, number> = { 1: 1.0, 2: 1.5, 3: 2.0 };

export interface ScoredDraw {
  reps: number;
  completedAt: string | null;
  tier: ExerciseTier;
}

export function calculateBasePoints(draws: ScoredDraw[]): number {
  return draws.reduce(
    (sum, d) => (d.completedAt ? sum + d.reps * TIER_FACTORS[d.tier] : sum),
    0
  );
}

export type MultiplierInput =
  | { mode: 'classic' }
  | { mode: 'perfect_deck' | 'daily'; beaten: number; total: number }
  | { mode: 'court'; beaten: number; total: number }
  | { mode: 'sprint' }
  | { mode: 'survive'; survivedAll: boolean };

export function challengeMultiplier(input: MultiplierInput): number {
  switch (input.mode) {
    case 'classic':
    case 'sprint':
      return 1;
    case 'perfect_deck':
    case 'daily':
      return input.total > 0 ? 1 + input.beaten / input.total : 1;
    case 'court':
      return (input.total > 0 ? 1 + input.beaten / input.total : 1) * 1.25;
    case 'survive':
      return input.survivedAll ? 1.5 : 1;
  }
}

export function calculatePoints(basePoints: number, multiplier: number): number {
  return Math.round(basePoints * multiplier);
}

export const XP_RANKS = [
  { symbol: '2', threshold: 0 },
  { symbol: 'J', threshold: 5000 },
  { symbol: 'Q', threshold: 15000 },
  { symbol: 'K', threshold: 40000 },
  { symbol: 'A', threshold: 100000 },
  { symbol: '🃏', threshold: 250000 },
] as const;

export function rankForXp(xp: number): { symbol: string; threshold: number } {
  let current: { symbol: string; threshold: number } = XP_RANKS[0];
  for (const rank of XP_RANKS) {
    if (xp >= rank.threshold) current = rank;
  }
  return current;
}

export function nextRank(xp: number): { symbol: string; threshold: number } | null {
  for (const rank of XP_RANKS) {
    if (xp < rank.threshold) return rank;
  }
  return null;
}
