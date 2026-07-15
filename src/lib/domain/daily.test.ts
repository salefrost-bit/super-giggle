import { describe, it, expect } from 'vitest';
import { dailyDateString, dailyTier, drawDailyCards, seededRng } from './daily';

describe('daily', () => {
  it('isti datum → identičan špil', () => {
    const a = drawDailyCards('2026-07-15');
    const b = drawDailyCards('2026-07-15');
    expect(a).toEqual(b);
  });

  it('različiti datumi → različit špil', () => {
    const a = drawDailyCards('2026-07-15');
    const b = drawDailyCards('2026-07-16');
    expect(a).not.toEqual(b);
  });

  it('20 karata balansirano po bojama', () => {
    const cards = drawDailyCards('2026-07-15');
    expect(cards).toHaveLength(20);
    const suits = ['hearts', 'clubs', 'spades', 'diamonds'] as const;
    for (const suit of suits) {
      expect(cards.filter((c) => c.suit === suit)).toHaveLength(5);
    }
  });

  it('dailyTier za poznate datume', () => {
    expect(dailyTier(new Date(2026, 6, 13))).toBe(1);
    expect(dailyTier(new Date(2026, 6, 19))).toBe(2);
  });

  it('dailyDateString koristi lokalni datum', () => {
    expect(dailyDateString(new Date(2026, 6, 15, 23, 30))).toBe('2026-07-15');
  });

  it('seededRng je determinističan', () => {
    const rng1 = seededRng('test-seed');
    const rng2 = seededRng('test-seed');
    expect(rng1()).toBe(rng2());
  });
});
