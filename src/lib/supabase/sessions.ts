import { createClient } from './client';
import type { CategoryKey, SessionConfig, CardDrawResult } from '../domain/types';

export interface CreateSessionParams {
  userId: string;
  config: SessionConfig;
  categoryIdByKey: Record<CategoryKey, string>;
  startedAtIso: string;
}

export async function createSession(params: CreateSessionParams): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: params.userId,
      difficulty_level_id: params.config.difficultyLevelId,
      total_cards: params.config.deckSize,
      rep_multiplier: params.config.repMultiplier,
      started_at: params.startedAtIso,
      status: 'in_progress',
    })
    .select('id')
    .single();
  if (error) throw error;
  const sessionId = (data as { id: string }).id;

  const categoryKeys = Object.keys(params.config.exerciseByCategory) as CategoryKey[];
  const sessionExerciseRows = categoryKeys.map((key) => ({
    session_id: sessionId,
    category_id: params.categoryIdByKey[key],
    exercise_id: params.config.exerciseByCategory[key].id,
  }));
  const { error: exercisesError } = await supabase
    .from('session_exercises')
    .insert(sessionExerciseRows);
  if (exercisesError) throw exercisesError;

  return sessionId;
}

export async function recordCardDraw(sessionId: string, draw: CardDrawResult): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('card_draws').insert({
    session_id: sessionId,
    order_index: draw.orderIndex,
    suit: draw.card.suit,
    card_value: draw.card.rank,
    reps: draw.reps,
    completed_at: draw.completedAt,
  });
  if (error) throw error;
}

export async function completeSession(
  sessionId: string,
  totalDurationSeconds: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_duration_seconds: totalDurationSeconds,
    })
    .eq('id', sessionId);
  if (error) throw error;
}

export interface SessionHistoryEntry {
  id: string;
  startedAt: string;
  totalDurationSeconds: number | null;
  totalCards: number;
  status: string;
  difficultyName: string;
}

export async function getUserSessions(userId: string): Promise<SessionHistoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, started_at, total_duration_seconds, total_cards, status, difficulty_levels(name)')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (
    data as unknown as Array<{
      id: string;
      started_at: string;
      total_duration_seconds: number | null;
      total_cards: number;
      status: string;
      difficulty_levels: { name: string };
    }>
  ).map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    totalDurationSeconds: row.total_duration_seconds,
    totalCards: row.total_cards,
    status: row.status,
    difficultyName: row.difficulty_levels.name,
  }));
}
