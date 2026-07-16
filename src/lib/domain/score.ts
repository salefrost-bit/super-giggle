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

// Lestvica činova (errata E1, spec §4) — 14 činova, 🃏 Joker (0) → Ace (1) →
// … → King (13). Imena/opisi dolaze iz i18n (top-level "ranks"/"ranksDesc"
// blokovi, Task 5) po nameKey; kalibrisano na ~350 poena po treningu.
export const XP_RANKS = [
  { symbol: '🃏', nameKey: 'ranks.r0', threshold: 0 },
  { symbol: 'A', nameKey: 'ranks.r1', threshold: 500 },
  { symbol: '2', nameKey: 'ranks.r2', threshold: 1500 },
  { symbol: '3', nameKey: 'ranks.r3', threshold: 3000 },
  { symbol: '4', nameKey: 'ranks.r4', threshold: 5500 },
  { symbol: '5', nameKey: 'ranks.r5', threshold: 9000 },
  { symbol: '6', nameKey: 'ranks.r6', threshold: 14000 },
  { symbol: '7', nameKey: 'ranks.r7', threshold: 20000 },
  { symbol: '8', nameKey: 'ranks.r8', threshold: 27000 },
  { symbol: '9', nameKey: 'ranks.r9', threshold: 35000 },
  { symbol: '10', nameKey: 'ranks.r10', threshold: 45000 },
  { symbol: 'J', nameKey: 'ranks.r11', threshold: 60000 },
  { symbol: 'Q', nameKey: 'ranks.r12', threshold: 80000 },
  { symbol: 'K', nameKey: 'ranks.r13', threshold: 105000 },
] as const;

export interface Rank {
  symbol: string;
  nameKey: string;
  threshold: number;
}

export function rankForXp(xp: number): Rank {
  let current: Rank = XP_RANKS[0];
  for (const rank of XP_RANKS) {
    if (xp >= rank.threshold) current = rank;
  }
  return current;
}

export function nextRank(xp: number): Rank | null {
  for (const rank of XP_RANKS) {
    if (xp < rank.threshold) return rank;
  }
  return null;
}
