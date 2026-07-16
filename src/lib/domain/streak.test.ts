import { describe, it, expect } from 'vitest';
import { calculateStreak, longestStreak } from './streak';

// Helper: build a local-midday ISO string for YYYY-MM-DD to avoid TZ edge noise.
function d(day: string): string {
  return `${day}T12:00:00`;
}
// 2026-07-09 is a Thursday.
const NOW = new Date('2026-07-09T18:00:00');

describe('calculateStreak', () => {
  it('returns 0 for empty history', () => {
    expect(calculateStreak([], NOW)).toEqual({ days: 0, freezesLeftThisWeek: 2 });
  });

  it('counts consecutive days including today', () => {
    const r = calculateStreak([d('2026-07-09'), d('2026-07-08'), d('2026-07-07')], NOW);
    expect(r.days).toBe(3);
    expect(r.freezesLeftThisWeek).toBe(2);
  });

  it('does not break if today has no workout yet', () => {
    const r = calculateStreak([d('2026-07-08'), d('2026-07-07')], NOW);
    expect(r.days).toBe(2);
  });

  it('freezes up to 2 missed days in one ISO week, frozen days count toward the streak', () => {
    // Mon 07-06 and Tue 07-07 missed (same ISO week as NOW), Wed 07-08 done.
    const r = calculateStreak([d('2026-07-08'), d('2026-07-05'), d('2026-07-04')], NOW);
    expect(r.days).toBe(5); // 04,05,(06,07 frozen),08 — 5 calendar days, frozen days count
    expect(r.freezesLeftThisWeek).toBe(0);
  });

  it('a frozen yesterday keeps the streak alive', () => {
    // Worked Mon-Tue (06,07), missed Wed 08 (yesterday), today Thu 09 not yet trained.
    const r = calculateStreak([d('2026-07-07'), d('2026-07-06')], NOW);
    expect(r.days).toBe(3); // 06,07,(08 frozen)
    expect(r.freezesLeftThisWeek).toBe(1);
  });

  it('never freezes days before the oldest workout in history', () => {
    // Single workout today — no freezes are spent reaching into the void.
    const r = calculateStreak([d('2026-07-09')], NOW);
    expect(r).toEqual({ days: 1, freezesLeftThisWeek: 2 });
  });

  it('breaks on the third miss in one ISO week', () => {
    // Mon 06, Tue 07, Wed 08 all missed in NOW's ISO week; last workout Sun 07-05.
    const r = calculateStreak([d('2026-07-05')], NOW);
    expect(r.days).toBe(0);
  });

  it('multiple workouts in one day count once', () => {
    const r = calculateStreak([d('2026-07-09'), d('2026-07-09'), d('2026-07-08')], NOW);
    expect(r.days).toBe(2);
  });

  it('freeze allowances are per ISO week, not global', () => {
    // Missed Thu 07-02 & Fri 07-03 (prev ISO week), and Mon 07-06 & Tue 07-07 (current week).
    const history = [d('2026-07-08'), d('2026-07-05'), d('2026-07-04'), d('2026-07-01'), d('2026-06-30')];
    const r = calculateStreak(history, NOW);
    expect(r.days).toBe(9); // 06-30..07-08 inclusive with 2+2 freezes across two weeks
  });
});

describe('longestStreak', () => {
  it('returns 0 for empty history', () => {
    expect(longestStreak([])).toBe(0);
  });

  it('returns 1 for a single workout', () => {
    expect(longestStreak([d('2026-07-01')])).toBe(1);
  });

  it("does not require today's workout — bounded by the history itself, not by a now reference", () => {
    expect(longestStreak([d('2026-01-05'), d('2026-01-04'), d('2026-01-03')])).toBe(3);
  });

  it('returns the historical maximum, not just the most recent streak', () => {
    const longRun = [
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05',
      '2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10',
    ].map(d);
    const recentShortRun = ['2026-07-01', '2026-07-02'].map(d);
    // The 10-day run extends by 2 frozen days (06-11 Thu, 06-12 Fri — same ISO
    // week as 06-10) before the 3rd miss (06-13 Sat) breaks it, same freeze
    // semantics as calculateStreak: frozen days count toward the streak.
    expect(longestStreak([...longRun, ...recentShortRun])).toBe(12);
  });

  it('a third missed day in one ISO week cuts the run (frozen days still count)', () => {
    // ISO week Mon 07-06..Sun 07-12: worked Mon/Tue, missed Wed/Thu (frozen), missed Fri (3rd miss -> break), worked Sat/Sun.
    const r = longestStreak([d('2026-07-06'), d('2026-07-07'), d('2026-07-11'), d('2026-07-12')]);
    expect(r).toBe(4); // 06,07,(08 frozen),(09 frozen) — then 10 breaks it, 11/12 start a fresh run of 2
  });
});
