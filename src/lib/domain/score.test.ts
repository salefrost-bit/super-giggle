import { describe, it, expect } from 'vitest';
import {
  calculateBasePoints, challengeMultiplier, calculatePoints, rankForXp, nextRank,
} from './score';

describe('calculateBasePoints', () => {
  it('sabira reps × tier faktor samo za završene karte', () => {
    const draws = [
      { reps: 10, completedAt: '2026-07-15T10:00:00Z', tier: 1 as const }, // 10
      { reps: 10, completedAt: '2026-07-15T10:01:00Z', tier: 2 as const }, // 15
      { reps: 10, completedAt: '2026-07-15T10:02:00Z', tier: 3 as const }, // 20
      { reps: 99, completedAt: null, tier: 3 as const },                    // nezavršena: 0
    ];
    expect(calculateBasePoints(draws)).toBe(45);
  });
  it('prazna sesija = 0', () => {
    expect(calculateBasePoints([])).toBe(0);
  });
});

describe('challengeMultiplier', () => {
  it('classic i sprint = 1', () => {
    expect(challengeMultiplier({ mode: 'classic' })).toBe(1);
    expect(challengeMultiplier({ mode: 'sprint' })).toBe(1);
  });
  it('perfect_deck/daily = 1 + beaten/total, total 0 ne deli nulom', () => {
    expect(challengeMultiplier({ mode: 'perfect_deck', beaten: 26, total: 52 })).toBe(1.5);
    expect(challengeMultiplier({ mode: 'daily', beaten: 20, total: 20 })).toBe(2);
    expect(challengeMultiplier({ mode: 'perfect_deck', beaten: 0, total: 0 })).toBe(1);
  });
  it('court = (1 + beaten/total) × 1.25', () => {
    expect(challengeMultiplier({ mode: 'court', beaten: 16, total: 16 })).toBe(2.5);
  });
  it('survive = 1.5 samo ako je prešao sve', () => {
    expect(challengeMultiplier({ mode: 'survive', survivedAll: true })).toBe(1.5);
    expect(challengeMultiplier({ mode: 'survive', survivedAll: false })).toBe(1);
  });
});

describe('calculatePoints', () => {
  it('zaokružuje', () => expect(calculatePoints(333, 1.5)).toBe(500));
});

describe('XP činovi (spec v0.4.5 §4)', () => {
  it('pragovi 14 činova', () => {
    expect(rankForXp(0).symbol).toBe('🃏');
    expect(rankForXp(499).symbol).toBe('🃏');
    expect(rankForXp(500).symbol).toBe('A');
    expect(rankForXp(1500).symbol).toBe('2');
    expect(rankForXp(45000).symbol).toBe('10');
    expect(rankForXp(60000).symbol).toBe('J');
    expect(rankForXp(80000).symbol).toBe('Q');
    expect(rankForXp(105000).symbol).toBe('K');
    expect(rankForXp(999999).symbol).toBe('K');
  });
  it('nextRank', () => {
    expect(nextRank(0)).toEqual({ symbol: 'A', nameKey: 'ranks.r1', threshold: 500 });
    expect(nextRank(105000)).toBeNull();
  });
});
