import type { Card, DeckSize, Suit } from './types';
import { isValidDeckSize } from './types';

const SUITS: Suit[] = ['hearts', 'clubs', 'spades', 'diamonds'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const COURT_RANKS = [11, 12, 13, 1];

export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleArray<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  return shuffleArray(deck, rng);
}

// Ogledalo rangova (spec v0.4.6 §5): jedan skup rangova, isti u sve 4 boje —
// zbir ponavljanja po vežbi je identičan u svakom podeljenom špilu (1:1:1:1).
export function drawSessionCards(deckSize: DeckSize, rng: () => number = Math.random): Card[] {
  if (!isValidDeckSize(deckSize)) {
    throw new Error(`Invalid deck size ${deckSize} — must be 12–52 divisible by 4 (spec §2.4)`);
  }
  const perSuit = deckSize / 4;
  const sessionRanks = shuffleArray(RANKS, rng).slice(0, perSuit);
  const picked: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of sessionRanks) {
      picked.push({ suit, rank });
    }
  }
  return shuffleDeck(picked, rng);
}

export function createCourtDeck(rng: () => number = Math.random): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of COURT_RANKS) {
      deck.push({ suit, rank });
    }
  }
  return shuffleDeck(deck, rng);
}
