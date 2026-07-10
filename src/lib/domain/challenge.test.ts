import { describe, it, expect } from 'vitest';
import {
  calculateParSeconds,
  resolveBudget,
  calculateCardWeight,
  calculateQuotaSeconds,
  computeScore,
} from './challenge';
import type { DifficultyLevel } from './types';

const level: DifficultyLevel = {
  id: 'd1', name: 'Srednji', defaultRepMultiplier: 1,
  parSecondsPerRep: 3, parTransitionSeconds: 20, sortOrder: 2,
};

describe('calculateParSeconds', () => {
  it('is totalReps * secondsPerRep + cards * transition, rounded', () => {
    expect(calculateParSeconds(182, 26, level)).toBe(182 * 3 + 26 * 20); // 1066
  });

  it('falls back to 3.0 s/rep and 20 s/card when par columns are missing', () => {
    const bare: DifficultyLevel = { id: 'd', name: 'X', defaultRepMultiplier: 1, sortOrder: 1 };
    expect(calculateParSeconds(100, 10, bare)).toBe(100 * 3 + 10 * 20);
  });
});

describe('resolveBudget', () => {
  it('adds a 5% buffer to the record so beating it stays achievable', () => {
    expect(resolveBudget(1066, 1000)).toEqual({ budgetSeconds: 1050, parSource: 'record' });
  });

  it('uses par as-is when there is no record', () => {
    expect(resolveBudget(1066, null)).toEqual({ budgetSeconds: 1066, parSource: 'par' });
  });
});

describe('calculateCardWeight', () => {
  it('is reps * secondsPerRep + transitionSeconds', () => {
    expect(calculateCardWeight(2, level)).toBe(2 * 3 + 20); // 26 — a low-rep card still gets its setup time
    expect(calculateCardWeight(13, level)).toBe(13 * 3 + 20); // 59
  });
});

describe('calculateQuotaSeconds', () => {
  it('splits the budget proportionally to weight, not raw reps', () => {
    // At budget === totalWeight (i.e. budget equals par), each card's quota equals its own weight.
    expect(calculateQuotaSeconds(1066, 26, 1066)).toBe(26);
    expect(calculateQuotaSeconds(1066, 59, 1066)).toBe(59);
  });

  it('rounds and never returns less than 1', () => {
    expect(calculateQuotaSeconds(100, 1, 1000)).toBe(1);
  });
});

describe('computeScore', () => {
  it('counts beaten cards and wins only when all are beaten', () => {
    expect(computeScore([{ beatQuota: true }, { beatQuota: false }, { beatQuota: true }]))
      .toEqual({ score: 2, total: 3, won: false });
    expect(computeScore([{ beatQuota: true }, { beatQuota: true }]))
      .toEqual({ score: 2, total: 2, won: true });
  });

  it('treats missing/null beatQuota as not beaten', () => {
    expect(computeScore([{ beatQuota: null }, {}])).toEqual({ score: 0, total: 2, won: false });
  });
});
