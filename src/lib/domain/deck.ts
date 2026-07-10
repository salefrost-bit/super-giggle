import type { Card, DeckSize, Suit } from './types';

const SUITS: Suit[] = ['hearts', 'clubs', 'spades', 'diamonds'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawSessionCards(deckSize: DeckSize, rng: () => number = Math.random): Card[] {
  const shuffled = shuffleDeck(createFullDeck(), rng);
  return shuffled.slice(0, deckSize);
}
