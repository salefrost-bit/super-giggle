import { describe, it, expect } from 'vitest';
import { createFullDeck, shuffleDeck, drawSessionCards } from './deck';

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe('createFullDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createFullDeck();
    expect(deck).toHaveLength(52);
    const unique = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    expect(unique.size).toBe(52);
  });

  it('has 13 cards per suit with ranks 2-14', () => {
    const deck = createFullDeck();
    const hearts = deck.filter((c) => c.suit === 'hearts');
    expect(hearts).toHaveLength(13);
    expect(hearts.map((c) => c.rank).sort((a, b) => a - b)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
  });
});

describe('shuffleDeck', () => {
  it('returns the same cards in a different order', () => {
    const deck = createFullDeck();
    const shuffled = shuffleDeck(deck, seededRng(42));
    expect(shuffled).toHaveLength(52);
    expect(shuffled).not.toEqual(deck);
    const originalSet = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    const shuffledSet = new Set(shuffled.map((c) => `${c.suit}-${c.rank}`));
    expect(shuffledSet).toEqual(originalSet);
  });

  it('does not mutate the input array', () => {
    const deck = createFullDeck();
    const copy = [...deck];
    shuffleDeck(deck, seededRng(1));
    expect(deck).toEqual(copy);
  });
});

describe('drawSessionCards', () => {
  it('returns exactly deckSize cards for each valid size', () => {
    expect(drawSessionCards(13, seededRng(1))).toHaveLength(13);
    expect(drawSessionCards(26, seededRng(1))).toHaveLength(26);
    expect(drawSessionCards(52, seededRng(1))).toHaveLength(52);
  });

  it('returns cards with no duplicates', () => {
    const cards = drawSessionCards(52, seededRng(7));
    const unique = new Set(cards.map((c) => `${c.suit}-${c.rank}`));
    expect(unique.size).toBe(52);
  });
});
