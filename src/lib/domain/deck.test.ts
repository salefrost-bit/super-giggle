import { describe, it, expect } from 'vitest';
import { createFullDeck, shuffleDeck, drawSessionCards, createCourtDeck } from './deck';
import type { Suit } from './types';

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function countBySuit(cards: { suit: Suit }[]): Record<Suit, number> {
  return cards.reduce(
    (acc, c) => ({ ...acc, [c.suit]: acc[c.suit] + 1 }),
    { hearts: 0, clubs: 0, spades: 0, diamonds: 0 } as Record<Suit, number>
  );
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
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
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

describe('drawSessionCards (balansirano, spec §2.4)', () => {
  it.each([12, 16, 20, 24, 52])('vraća %i karata sa N/4 po boji', (n) => {
    const cards = drawSessionCards(n);
    expect(cards).toHaveLength(n);
    const counts = countBySuit(cards);
    expect(Object.values(counts)).toEqual([n / 4, n / 4, n / 4, n / 4]);
  });

  it('nema duplikata karata', () => {
    const cards = drawSessionCards(52);
    const keys = new Set(cards.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(52);
  });

  it('redosled je promešan preko boja (deterministički rng)', () => {
    let i = 0;
    const rng = () => ((i += 7) % 13) / 13;
    const suits = drawSessionCards(12, rng).map((c) => c.suit);
    // balansiran ali ne grupisan: prve 3 karte nisu sve iste boje
    expect(new Set(suits.slice(0, 3)).size).toBeGreaterThan(1);
  });

  it('baca za nevalidnu veličinu', () => {
    expect(() => drawSessionCards(13)).toThrow();
    expect(() => drawSessionCards(15)).toThrow();
  });
});

describe('drawSessionCards (ogledalo rangova, spec v0.4.6 §5)', () => {
  function ranksBySuit(cards: { suit: Suit; rank: number }[]): Record<Suit, number[]> {
    const result: Record<Suit, number[]> = { hearts: [], clubs: [], spades: [], diamonds: [] };
    for (const c of cards) result[c.suit].push(c.rank);
    for (const suit of Object.keys(result) as Suit[]) result[suit].sort((a, b) => a - b);
    return result;
  }

  it.each([12, 20, 24, 48])('isti skup rangova u sve 4 boje za špil od %i', (n) => {
    const bySuit = ranksBySuit(drawSessionCards(n));
    expect(bySuit.clubs).toEqual(bySuit.hearts);
    expect(bySuit.spades).toEqual(bySuit.hearts);
    expect(bySuit.diamonds).toEqual(bySuit.hearts);
  });

  it.each([12, 20, 24])('zbir rangova (ponavljanja) identičan po boji za špil od %i', (n) => {
    const bySuit = ranksBySuit(drawSessionCards(n));
    const sums = (Object.keys(bySuit) as Suit[]).map((s) =>
      bySuit[s].reduce((acc, r) => acc + r, 0)
    );
    expect(new Set(sums).size).toBe(1);
  });

  it('deterministički rng daje isti špil (ulaz za Daily)', () => {
    const makeRng = () => {
      let i = 0;
      return () => ((i += 7) % 13) / 13;
    };
    expect(drawSessionCards(20, makeRng())).toEqual(drawSessionCards(20, makeRng()));
  });
});

describe('createCourtDeck', () => {
  const courtRanks = new Set([1, 11, 12, 13]);

  it('vraća 16 karata sa po 4 iz svake boje', () => {
    const cards = createCourtDeck();
    expect(cards).toHaveLength(16);
    const counts = countBySuit(cards);
    expect(Object.values(counts)).toEqual([4, 4, 4, 4]);
  });

  it('rankovi su samo J, Q, K i A bez duplikata', () => {
    const cards = createCourtDeck();
    expect(cards.every((c) => courtRanks.has(c.rank))).toBe(true);
    const keys = new Set(cards.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(16);
  });
});
