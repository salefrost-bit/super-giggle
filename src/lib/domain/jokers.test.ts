import { describe, it, expect } from 'vitest';
import { JOKER_REST_SECONDS, jokerCountFor, assignJokerBreaks, isJokerBreak } from './jokers';

describe('JOKER_REST_SECONDS', () => {
  it('is 30 seconds', () => {
    expect(JOKER_REST_SECONDS).toBe(30);
  });
});

describe('jokerCountFor', () => {
  it('returns 1 for decks up to 20 cards', () => {
    expect(jokerCountFor(12)).toBe(1);
    expect(jokerCountFor(16)).toBe(1);
    expect(jokerCountFor(20)).toBe(1);
  });

  it('returns 2 for decks 24 and above', () => {
    expect(jokerCountFor(24)).toBe(2);
    expect(jokerCountFor(52)).toBe(2);
  });
});

describe('assignJokerBreaks', () => {
  it('returns a single deterministic position when the eligible range has exactly one slot', () => {
    // realCardCount=6: earliest=5, latest=5 — only one possible position regardless of rng.
    expect(assignJokerBreaks(6, () => 0.5)).toEqual([5]);
  });

  it('never returns a position before the 5th card (warmup)', () => {
    const breaks = assignJokerBreaks(12, () => 0);
    expect(breaks[0]).toBeGreaterThanOrEqual(5);
  });

  it('never returns the last card as a break position', () => {
    const breaksLow = assignJokerBreaks(12, () => 0);
    const breaksHigh = assignJokerBreaks(12, () => 0.999999);
    expect(breaksLow.every((n) => n <= 11)).toBe(true);
    expect(breaksHigh.every((n) => n <= 11)).toBe(true);
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
