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

export type DeckSize = number; // validan: 12–52, deljiv sa 4 (spec §2.4); Quick nudi 12/24/52
export const QUICK_DECK_SIZES = [12, 24, 52] as const;

export function isValidDeckSize(n: number): boolean {
  return Number.isInteger(n) && n >= 12 && n <= 52 && n % 4 === 0;
}

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

export type ExerciseTier = 1 | 2 | 3;

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string | null;
  categoryId: string;
  difficultyLevelId: string;
  tier: ExerciseTier;
  isDefault: boolean;
}

export type GameMode = 'classic' | 'perfect_deck' | 'sprint' | 'court' | 'survive' | 'daily';

export type EntryPath = 'quick' | 'custom' | 'challenge';

export interface SessionSettings {
  pause_count?: number;
  total_pause_seconds?: number;
  points?: number;
  base_points?: number;
  multiplier?: number;
  entry?: EntryPath;
  card_count?: number;
  rep_multiplier?: number;
  sprint_minutes?: number;
  cards_completed?: number;
  survived_cards?: number;
  daily_date?: string;
  daily_replay?: boolean;
  joker_breaks_taken?: number;
}

export interface ChallengeSettings extends SessionSettings {
  budget_seconds: number;
  par_source: 'par' | 'record';
  score?: number;
  won?: boolean;
  best_score?: number | null;
}

export interface SessionConfig {
  difficultyLevelId: string;
  repMultiplier: number;
  deckSize: DeckSize;
  exerciseByCategory: Record<CategoryKey, Exercise>;
  entry?: EntryPath;
  gameMode?: GameMode;
  budgetSeconds?: number;
  parSource?: 'par' | 'record';
  bestScoreForCombo?: number | null;
  // Carried alongside the budget so SessionScreen can compute each card's
  // weighted quota (calculateCardWeight) without re-fetching the difficulty row.
  parSecondsPerRep?: number;
  parTransitionSeconds?: number;
  sprintMinutes?: number;
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
  pauseCount?: number;
  totalPauseSeconds?: number;
  points: number;
  basePoints: number;
  multiplier: number;
}
