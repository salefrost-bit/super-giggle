import type { CardDrawResult, DifficultyLevel } from './types';

const FALLBACK_SECONDS_PER_REP = 3.0;
const FALLBACK_TRANSITION_SECONDS = 20;

export function calculateParSeconds(
  totalReps: number,
  cardCount: number,
  level: DifficultyLevel
): number {
  const perRep = level.parSecondsPerRep ?? FALLBACK_SECONDS_PER_REP;
  const transition = level.parTransitionSeconds ?? FALLBACK_TRANSITION_SECONDS;
  return Math.round(totalReps * perRep + cardCount * transition);
}

const RECORD_BUFFER_MULTIPLIER = 1.05;

export function resolveBudget(
  parSeconds: number,
  recordSeconds: number | null
): { budgetSeconds: number; parSource: 'par' | 'record' } {
  if (recordSeconds !== null) {
    return { budgetSeconds: Math.round(recordSeconds * RECORD_BUFFER_MULTIPLIER), parSource: 'record' };
  }
  return { budgetSeconds: parSeconds, parSource: 'par' };
}

export function calculateCardWeight(
  reps: number,
  parRates: Pick<DifficultyLevel, 'parSecondsPerRep' | 'parTransitionSeconds'>
): number {
  const perRep = parRates.parSecondsPerRep ?? FALLBACK_SECONDS_PER_REP;
  const transition = parRates.parTransitionSeconds ?? FALLBACK_TRANSITION_SECONDS;
  return reps * perRep + transition;
}

export function calculateQuotaSeconds(
  budgetSeconds: number,
  cardWeight: number,
  totalWeight: number
): number {
  return Math.max(1, Math.round((budgetSeconds * cardWeight) / totalWeight));
}

export function computeScore(draws: Pick<CardDrawResult, 'beatQuota'>[]): {
  score: number;
  total: number;
  won: boolean;
} {
  const score = draws.filter((d) => d.beatQuota === true).length;
  const total = draws.length;
  return { score, total, won: total > 0 && score === total };
}
