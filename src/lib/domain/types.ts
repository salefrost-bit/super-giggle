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
  rank: number; // 1 = A, 2-10 = face value, 11=J, 12=Q, 13=K
}

export type DeckSize = 13 | 26 | 52;

export interface Category {
  id: string;
  name: string;
  nameEn?: string | null;
  sortOrder: number;
}

export interface DifficultyLevel {
  id: string;
  name: string;
  nameEn?: string | null;
  defaultRepMultiplier: number;
  parSecondsPerRep?: number;
  parTransitionSeconds?: number;
  sortOrder: number;
}

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string | null;
  categoryId: string;
  difficultyLevelId: string;
}

export type GameMode = 'classic' | 'perfect_deck';

export interface ChallengeSettings {
  budget_seconds: number;
  par_source: 'par' | 'record';
  score?: number;
  won?: boolean;
  best_score?: number | null;
  pause_count?: number;
}

export interface SessionConfig {
  difficultyLevelId: string;
  repMultiplier: number;
  deckSize: DeckSize;
  exerciseByCategory: Record<CategoryKey, Exercise>;
  gameMode?: GameMode;
  budgetSeconds?: number;
  parSource?: 'par' | 'record';
  bestScoreForCombo?: number | null;
  // Carried alongside the budget so SessionScreen can compute each card's
  // weighted quota (calculateCardWeight) without re-fetching the difficulty row.
  parSecondsPerRep?: number;
  parTransitionSeconds?: number;
}

export interface CardDrawResult {
  orderIndex: number;
  card: Card;
  categoryKey: CategoryKey;
  exercise: Exercise;
  reps: number;
  completedAt: string | null; // ISO timestamp, set when user confirms the card is done
  beatQuota?: boolean | null;
}

export interface SessionResult {
  totalDurationSeconds: number;
  draws: CardDrawResult[];
}
