export type Suit = 'hearts' | 'clubs' | 'spades' | 'diamonds';

export type CategoryKey = 'push' | 'pull' | 'legs' | 'core';

export const SUIT_TO_CATEGORY: Record<Suit, CategoryKey> = {
  hearts: 'push',
  clubs: 'pull',
  spades: 'legs',
  diamonds: 'core',
};

// Must match the `name` column seeded in supabase/migrations/0002_seed.sql exactly.
export const CATEGORY_KEY_TO_NAME: Record<CategoryKey, string> = {
  push: 'Guranje',
  pull: 'Povlačenje',
  legs: 'Noge',
  core: 'Core',
};

export interface Card {
  suit: Suit;
  rank: number; // 2-10 = face value, 11=J, 12=Q, 13=K, 14=A
}

export type DeckSize = 13 | 26 | 52;

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface DifficultyLevel {
  id: string;
  name: string;
  defaultRepMultiplier: number;
  sortOrder: number;
}

export interface Exercise {
  id: string;
  name: string;
  categoryId: string;
  difficultyLevelId: string;
}

export interface SessionConfig {
  difficultyLevelId: string;
  repMultiplier: number;
  deckSize: DeckSize;
  exerciseByCategory: Record<CategoryKey, Exercise>;
}

export interface CardDrawResult {
  orderIndex: number;
  card: Card;
  categoryKey: CategoryKey;
  exercise: Exercise;
  reps: number;
  completedAt: string | null; // ISO timestamp, set when user confirms the card is done
}

export interface SessionResult {
  totalDurationSeconds: number;
  draws: CardDrawResult[];
}
