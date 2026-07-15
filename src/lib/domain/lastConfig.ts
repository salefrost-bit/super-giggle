import type { CategoryKey, EntryPath, Exercise, GameMode } from './types';
import { isValidDeckSize } from './types';

const STORAGE_KEY = 'spil.lastConfig';

const CATEGORY_KEYS: CategoryKey[] = ['push', 'pull', 'legs', 'core'];

export interface LastConfig {
  entry: EntryPath;
  gameMode: GameMode;
  difficultyLevelId: string;
  repMultiplier: number;
  deckSize: number;
  exerciseIds: Record<CategoryKey, string>;
  sprintMinutes?: number;
}

function parseLastConfig(raw: unknown): LastConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;

  if (value.entry !== 'quick' && value.entry !== 'custom' && value.entry !== 'challenge') {
    return null;
  }
  if (typeof value.gameMode !== 'string') return null;
  if (typeof value.difficultyLevelId !== 'string') return null;
  if (typeof value.repMultiplier !== 'number') return null;
  if (typeof value.deckSize !== 'number') return null;
  if (!value.exerciseIds || typeof value.exerciseIds !== 'object') return null;

  const exerciseIdsRaw = value.exerciseIds as Record<string, unknown>;
  const exerciseIds = {} as Record<CategoryKey, string>;
  for (const key of CATEGORY_KEYS) {
    if (typeof exerciseIdsRaw[key] !== 'string') return null;
    exerciseIds[key] = exerciseIdsRaw[key];
  }

  const config: LastConfig = {
    entry: value.entry,
    gameMode: value.gameMode as GameMode,
    difficultyLevelId: value.difficultyLevelId,
    repMultiplier: value.repMultiplier,
    deckSize: value.deckSize,
    exerciseIds,
  };

  if (value.sprintMinutes != null) {
    if (typeof value.sprintMinutes !== 'number') return null;
    config.sprintMinutes = value.sprintMinutes;
  }

  return config;
}

export function saveLastConfig(config: LastConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadLastConfig(): LastConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseLastConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function validateLastConfig(config: LastConfig, allExercises: Exercise[]): boolean {
  if (!isValidDeckSize(config.deckSize)) return false;
  const knownIds = new Set(allExercises.map((exercise) => exercise.id));
  return CATEGORY_KEYS.every((key) => knownIds.has(config.exerciseIds[key]));
}
