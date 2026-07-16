import { createClient } from './client';
import type {
  CategoryKey,
  SessionConfig,
  CardDrawResult,
  GameMode,
  ChallengeSettings,
  SessionSettings,
  Suit,
  ExerciseTier,
} from '../domain/types';
import { CATEGORY_KEY_TO_NAME, SUIT_TO_CATEGORY } from '../domain/types';
import { calculateBasePoints, challengeMultiplier, calculatePoints } from '../domain/score';
import { withSaveRetry } from './retry';

export interface CreateSessionParams {
  userId: string;
  config: SessionConfig;
  categoryIdByKey: Record<CategoryKey, string>;
  startedAtIso: string;
  gameMode?: GameMode;
  settings?: SessionSettings | ChallengeSettings;
  // Otporno čuvanje (spec v0.4.6 §1): klijentski UUID čini insert idempotentnim
  // pa je retry bezbedan i kad je prvi upis prošao a odgovor se izgubio.
  sessionId?: string;
}

export async function createSession(params: CreateSessionParams): Promise<string> {
  const supabase = createClient();
  const inserted = await withSaveRetry(async () => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        ...(params.sessionId ? { id: params.sessionId } : {}),
        user_id: params.userId,
        difficulty_level_id: params.config.difficultyLevelId,
        total_cards: params.config.deckSize,
        rep_multiplier: params.config.repMultiplier,
        started_at: params.startedAtIso,
        status: 'in_progress',
        ...(params.gameMode ? { game_mode: params.gameMode } : {}),
        ...(params.settings ? { settings: params.settings } : {}),
      })
      .select('id')
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  });
  // null = duplicate na retry-ju — moguće samo sa klijentskim ID-em, koji tada i važi.
  const sessionId = inserted ?? (params.sessionId as string);

  const categoryKeys = Object.keys(params.config.exerciseByCategory) as CategoryKey[];
  const sessionExerciseRows = categoryKeys.map((key) => ({
    session_id: sessionId,
    category_id: params.categoryIdByKey[key],
    exercise_id: params.config.exerciseByCategory[key].id,
  }));
  await withSaveRetry(async () => {
    const { error } = await supabase.from('session_exercises').insert(sessionExerciseRows);
    if (error) throw error;
  });

  return sessionId;
}

export async function recordCardDraw(sessionId: string, draw: CardDrawResult): Promise<void> {
  const supabase = createClient();
  await withSaveRetry(async () => {
    const { error } = await supabase.from('card_draws').insert({
      session_id: sessionId,
      order_index: draw.orderIndex,
      suit: draw.card.suit,
      card_value: draw.card.rank,
      reps: draw.reps,
      completed_at: draw.completedAt,
      beat_quota: draw.beatQuota ?? null,
    });
    if (error) throw error;
  });
}

export async function completeSession(
  sessionId: string,
  totalDurationSeconds: number,
  settings?: SessionSettings | ChallengeSettings
): Promise<void> {
  const supabase = createClient();
  await withSaveRetry(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_duration_seconds: totalDurationSeconds,
        ...(settings ? { settings } : {}),
      })
      .eq('id', sessionId);
    if (error) throw error;
  });
}

export interface SessionHistoryEntry {
  id: string;
  startedAt: string;
  completedAt: string | null;
  totalDurationSeconds: number | null;
  totalCards: number;
  status: string;
  difficultyName: string;
  gameMode: string;
  score: number | null;
  pauseCount: number | null;
  totalPauseSeconds: number | null;
  points: number | null;
  basePoints: number | null;
  multiplier: number | null;
  entry: string | null;
  sprintMinutes: number | null;
  cardCount: number | null;
  cardsCompleted: number | null;
  survivedCards: number | null;
}

type SessionSettingsRow = {
  score?: number;
  pause_count?: number;
  total_pause_seconds?: number;
  points?: number;
  base_points?: number;
  multiplier?: number;
  entry?: string;
  sprint_minutes?: number;
  card_count?: number;
  cards_completed?: number;
  survived_cards?: number;
};

export async function getUserSessions(userId: string): Promise<SessionHistoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select(
      'id, started_at, completed_at, total_duration_seconds, total_cards, status, difficulty_levels(name), game_mode, settings'
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (
    data as unknown as Array<{
      id: string;
      started_at: string;
      completed_at: string | null;
      total_duration_seconds: number | null;
      total_cards: number;
      status: string;
      difficulty_levels: { name: string };
      game_mode: string;
      settings: SessionSettingsRow | null;
    }>
  ).map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? null,
    totalDurationSeconds: row.total_duration_seconds,
    totalCards: row.total_cards,
    status: row.status,
    difficultyName: row.difficulty_levels.name,
    gameMode: row.game_mode,
    score: row.settings?.score ?? null,
    pauseCount: row.settings?.pause_count ?? null,
    totalPauseSeconds: row.settings?.total_pause_seconds ?? null,
    points: row.settings?.points ?? null,
    basePoints: row.settings?.base_points ?? null,
    multiplier: row.settings?.multiplier ?? null,
    entry: row.settings?.entry ?? null,
    sprintMinutes: row.settings?.sprint_minutes ?? null,
    cardCount: row.settings?.card_count ?? null,
    cardsCompleted: row.settings?.cards_completed ?? null,
    survivedCards: row.settings?.survived_cards ?? null,
  }));
}

export interface SessionDetails {
  exercises: { categoryName: string; name: string; nameEn: string | null; tier: number }[];
  totalReps: number;
  repsBySuit: Record<Suit, number>;
}

export async function getSessionDetails(sessionId: string): Promise<SessionDetails> {
  const supabase = createClient();
  const [{ data: exRows, error: exError }, { data: drawRows, error: drawError }] =
    await Promise.all([
      supabase
        .from('session_exercises')
        .select('categories(name), exercises(name, name_en, tier)')
        .eq('session_id', sessionId),
      supabase.from('card_draws').select('suit, reps').eq('session_id', sessionId),
    ]);
  if (exError) throw exError;
  if (drawError) throw drawError;

  const exercises = (
    exRows as unknown as Array<{
      categories: { name: string };
      exercises: { name: string; name_en: string | null; tier: number };
    }>
  ).map((row) => ({
    categoryName: row.categories.name,
    name: row.exercises.name,
    nameEn: row.exercises.name_en,
    tier: row.exercises.tier,
  }));

  const draws = drawRows as Array<{ suit: Suit; reps: number }>;
  const totalReps = draws.reduce((sum, d) => sum + d.reps, 0);
  const repsBySuit: Record<Suit, number> = { hearts: 0, clubs: 0, spades: 0, diamonds: 0 };
  for (const d of draws) {
    repsBySuit[d.suit] += d.reps;
  }

  return { exercises, totalReps, repsBySuit };
}

export async function backfillPoints(sessionId: string, gameMode: string): Promise<number | null> {
  const supabase = createClient();
  const [{ data: session }, { data: drawRows }, { data: exRows }] = await Promise.all([
    supabase.from('sessions').select('settings, total_cards').eq('id', sessionId).single(),
    supabase.from('card_draws').select('suit, reps, completed_at').eq('session_id', sessionId),
    supabase
      .from('session_exercises')
      .select('category_id, exercises(tier), categories(name)')
      .eq('session_id', sessionId),
  ]);
  if (!drawRows || drawRows.length === 0) return null;
  const tierByCategoryName = new Map(
    (
      exRows as unknown as Array<{ categories: { name: string }; exercises: { tier: number } }>
    ).map((r) => [r.categories.name, r.exercises.tier as ExerciseTier])
  );
  const scored = (
    drawRows as Array<{ suit: Suit; reps: number; completed_at: string | null }>
  ).map((d) => ({
    reps: d.reps,
    completedAt: d.completed_at,
    tier: tierByCategoryName.get(CATEGORY_KEY_TO_NAME[SUIT_TO_CATEGORY[d.suit]]) ?? 2,
  }));
  const base = calculateBasePoints(scored);
  const oldSettings = (session as { settings: Record<string, unknown> | null }).settings ?? {};
  const totalCards = (session as { total_cards: number }).total_cards;
  const beaten = typeof oldSettings.score === 'number' ? (oldSettings.score as number) : 0;
  const multiplier =
    gameMode === 'perfect_deck'
      ? challengeMultiplier({ mode: 'perfect_deck', beaten, total: totalCards })
      : challengeMultiplier({ mode: 'classic' });
  const points = calculatePoints(base, multiplier);
  const { error } = await supabase
    .from('sessions')
    .update({ settings: { ...oldSettings, points, base_points: base, multiplier } })
    .eq('id', sessionId);
  if (error) throw error;
  return points;
}

export async function hasDailyForDate(userId: string, dateString: string): Promise<boolean> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('game_mode', 'daily')
    .filter('settings->>daily_date', 'eq', dateString);
  if (error) throw error;
  return (count ?? 0) > 0;
}
