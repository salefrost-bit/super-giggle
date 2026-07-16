import { describe, it, expect } from 'vitest';
import { JOKER_REST_SECONDS, jokerCountFor, assignJokerBreaks, isJokerBreak } from './jokers';

describe('JOKER_REST_SECONDS', () => {
  it('is 30 seconds', () => {
    expect(JOKER_REST_SECONDS).toBe(30);
  });
});

// ERRATA v0.4.7 §2 ("jocker kartu treba izbaciti iz deckova sa manje od 20
// karata"): asserti za špilove < 20 promenjeni sa 1 na 0; testovi pozicija
// prebačeni na špil od 20 (najmanji koji još ima džokera).
describe('jokerCountFor', () => {
  it('returns 0 for decks below 20 cards (spec v0.4.7 §2)', () => {
    expect(jokerCountFor(12)).toBe(0);
    expect(jokerCountFor(16)).toBe(0);
  });

  it('returns 1 for exactly 20 cards', () => {
    expect(jokerCountFor(20)).toBe(1);
  });

  it('returns 2 for decks 24 and above', () => {
    expect(jokerCountFor(24)).toBe(2);
    expect(jokerCountFor(52)).toBe(2);
  });
});

describe('assignJokerBreaks', () => {
  it('returns no breaks for decks below 20 cards (spec v0.4.7 §2)', () => {
    expect(assignJokerBreaks(12, () => 0.5)).toEqual([]);
    expect(assignJokerBreaks(16, () => 0.5)).toEqual([]);
  });

  it('never returns a position before the 5th card (warmup)', () => {
    const breaks = assignJokerBreaks(20, () => 0);
    expect(breaks[0]).toBeGreaterThanOrEqual(5);
  });

  it('never returns the last card as a break position', () => {
    const breaksLow = assignJokerBreaks(20, () => 0);
    const breaksHigh = assignJokerBreaks(20, () => 0.999999);
    expect(breaksLow.every((n) => n <= 19)).toBe(true);
    expect(breaksHigh.every((n) => n <= 19)).toBe(true);
  });

  it('returns two positions at least 4 cards apart for decks >= 24', () => {
    const breaks = assignJokerBreaks(24, () => 0);
    expect(breaks).toHaveLength(2);
    expect(breaks[1] - breaks[0]).toBeGreaterThanOrEqual(4);
  });

  it('is deterministic for the same rng sequence (Karta dana requirement)', () => {
    const first = assignJokerBreaks(20, () => 0.3);
    const second = assignJokerBreaks(20, () => 0.3);
    expect(first).toEqual(second);
  });

  it('gracefully returns an empty list when the deck is too small for the warmup rule', () => {
    expect(assignJokerBreaks(2, () => 0)).toEqual([]);
    expect(assignJokerBreaks(4, () => 0)).toEqual([]);
  });
});

describe('isJokerBreak', () => {
  it('matches an exact position with no lap wrapping', () => {
    expect(isJokerBreak(5, [5, 15])).toBe(true);
    expect(isJokerBreak(6, [5, 15])).toBe(false);
  });

  it('wraps positions modulo the lap size for Sprint', () => {
    expect(isJokerBreak(29, [5, 29], 52)).toBe(true);
    expect(isJokerBreak(52, [5, 29], 52)).toBe(false);
    expect(isJokerBreak(81, [5, 29], 52)).toBe(true); // 81 = 52 + 29, second lap
  });
});
