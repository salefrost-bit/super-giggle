import { createClient } from './client';

export interface PersonalRecord {
  difficultyName: string;
  totalCards: number;
  bestDurationSeconds: number;
  bestScore: number | null;
  scoreTotal: number | null;
}

export interface RecordRow {
  difficultyName: string;
  totalCards: number;
  durationSeconds: number;
  gameMode: string;
  score: number | null;
}

export function aggregateRecords(rows: RecordRow[]): PersonalRecord[] {
  const byCombo = new Map<string, PersonalRecord>();
  for (const row of rows) {
    const key = `${row.difficultyName}|${row.totalCards}`;
    const existing = byCombo.get(key);
    if (!existing) {
      byCombo.set(key, {
        difficultyName: row.difficultyName,
        totalCards: row.totalCards,
        bestDurationSeconds: row.durationSeconds,
        bestScore: row.gameMode === 'perfect_deck' ? row.score : null,
        scoreTotal: row.gameMode === 'perfect_deck' && row.score !== null ? row.totalCards : null,
      });
      continue;
    }
    if (row.durationSeconds < existing.bestDurationSeconds) {
      existing.bestDurationSeconds = row.durationSeconds;
    }
    if (row.gameMode === 'perfect_deck' && row.score !== null) {
      if (existing.bestScore === null || row.score > existing.bestScore) {
        existing.bestScore = row.score;
        existing.scoreTotal = row.totalCards;
      }
    }
  }
  return Array.from(byCombo.values());
}

interface SessionRecordSelect {
  total_cards: number;
  total_duration_seconds: number | null;
  game_mode: string;
  settings: { score?: number } | null;
  difficulty_levels: { name: string };
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('total_cards, total_duration_seconds, game_mode, settings, difficulty_levels(name)')
    .eq('user_id', userId)
    .eq('status', 'completed');
  if (error) throw error;
  const rows: RecordRow[] = (data as unknown as SessionRecordSelect[])
    .filter((r) => r.total_duration_seconds !== null)
    .map((r) => ({
      difficultyName: r.difficulty_levels.name,
      totalCards: r.total_cards,
      durationSeconds: r.total_duration_seconds as number,
      gameMode: r.game_mode,
      score: r.settings?.score ?? null,
    }));
  return aggregateRecords(rows);
}

export async function getBestDurationSeconds(
  userId: string,
  difficultyLevelId: string,
  totalCards: number
): Promise<number | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('total_duration_seconds')
    .eq('user_id', userId)
    .eq('difficulty_level_id', difficultyLevelId)
    .eq('total_cards', totalCards)
    .eq('status', 'completed')
    .not('total_duration_seconds', 'is', null)
    .order('total_duration_seconds', { ascending: true })
    .limit(1);
  if (error) throw error;
  const row = (data as Array<{ total_duration_seconds: number }>)[0];
  return row ? row.total_duration_seconds : null;
}

export async function getBestScore(
  userId: string,
  difficultyLevelId: string,
  totalCards: number
): Promise<number | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('settings')
    .eq('user_id', userId)
    .eq('difficulty_level_id', difficultyLevelId)
    .eq('total_cards', totalCards)
    .eq('game_mode', 'perfect_deck')
    .eq('status', 'completed');
  if (error) throw error;
  const scores = (data as Array<{ settings: { score?: number } | null }>)
    .map((row) => row.settings?.score)
    .filter((score): score is number => typeof score === 'number');
  return scores.length > 0 ? Math.max(...scores) : null;
}

export async function getCompletedSessionDates(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null);
  if (error) throw error;
  return (data as Array<{ completed_at: string }>).map((r) => r.completed_at);
}

export async function getTotalXp(userId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('settings')
    .eq('user_id', userId)
    .eq('status', 'completed');
  if (error) throw error;
  return (data as Array<{ settings: Record<string, unknown> | null }>).reduce((sum, row) => {
    const points = row.settings?.points;
    return sum + (typeof points === 'number' ? points : 0);
  }, 0);
}
