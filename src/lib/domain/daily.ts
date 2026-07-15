import { drawSessionCards } from './deck';
import { buildDraws } from './draws';
import { calculateParSeconds } from './challenge';
import { CATEGORY_KEY_TO_NAME } from './types';
import type {
  Card,
  Category,
  CategoryKey,
  CardDrawResult,
  DifficultyLevel,
  Exercise,
  ExerciseTier,
  SessionConfig,
} from './types';

function categoryKeyForName(name: string): CategoryKey {
  const entry = (Object.entries(CATEGORY_KEY_TO_NAME) as [CategoryKey, string][]).find(
    ([, categoryName]) => categoryName === name
  );
  if (!entry) throw new Error(`Unknown category name "${name}"`);
  return entry[0];
}

function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRng(seed: string): () => number {
  return mulberry32(fnv1aHash(seed));
}

export function dailyDateString(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dailyTier(now: Date): ExerciseTier {
  const day = now.getDay();
  if (day === 1 || day === 4) return 1;
  if (day === 2 || day === 5) return 2;
  if (day === 3 || day === 6) return 3;
  return 2;
}

export function drawDailyCards(dateString: string): Card[] {
  return drawSessionCards(20, seededRng(dateString));
}

export const DAILY_DONE_KEY_PREFIX = 'spil.dailyDone.';

export function markDailyDoneLocal(dateString: string): void {
  try {
    localStorage.setItem(`${DAILY_DONE_KEY_PREFIX}${dateString}`, '1');
  } catch {
    // Ignore blocked storage.
  }
}

export function isDailyDoneLocal(dateString: string): boolean {
  try {
    return localStorage.getItem(`${DAILY_DONE_KEY_PREFIX}${dateString}`) === '1';
  } catch {
    return false;
  }
}

function pickDefaultsForTier(
  exercises: Exercise[],
  categories: Category[],
  tier: ExerciseTier
): Record<CategoryKey, Exercise> {
  const result = {} as Record<CategoryKey, Exercise>;
  for (const category of categories) {
    const key = categoryKeyForName(category.name);
    const def = exercises.find(
      (e) => e.categoryId === category.id && e.isDefault && e.tier === tier
    );
    if (!def) throw new Error(`No default tier-${tier} exercise for category ${category.name}`);
    result[key] = def;
  }
  return result;
}

export interface BuildDailySessionInput {
  exercises: Exercise[];
  categories: Category[];
  levels: DifficultyLevel[];
  now?: Date;
}

export function buildDailySession(input: BuildDailySessionInput): {
  config: SessionConfig;
  draws: CardDrawResult[];
  dateString: string;
} {
  const now = input.now ?? new Date();
  const tier = dailyTier(now);
  const dateString = dailyDateString(now);
  const difficulty = input.levels.find((level) => level.sortOrder === tier);
  if (!difficulty) throw new Error(`No difficulty level for tier ${tier}`);

  const exerciseByCategory = pickDefaultsForTier(input.exercises, input.categories, tier);
  const cards = drawDailyCards(dateString);
  const draws = buildDraws(cards, exerciseByCategory, difficulty.defaultRepMultiplier, true);
  const totalReps = draws.reduce((sum, d) => sum + d.reps, 0);
  const par = calculateParSeconds(totalReps, 20, difficulty);

  return {
    dateString,
    config: {
      difficultyLevelId: difficulty.id,
      repMultiplier: difficulty.defaultRepMultiplier,
      deckSize: 20,
      exerciseByCategory,
      entry: 'challenge',
      gameMode: 'daily',
      budgetSeconds: par,
      parSource: 'par',
      parSecondsPerRep: difficulty.parSecondsPerRep,
      parTransitionSeconds: difficulty.parTransitionSeconds,
    },
    draws,
  };
}
