import { describe, it, expect, vi } from 'vitest';
import { createSession, recordCardDraw, completeSession, getUserSessions, backfillPoints } from './sessions';
import type { SessionConfig } from '../domain/types';

vi.mock('./client', () => ({ createClient: vi.fn() }));
import { createClient } from './client';

describe('createSession', () => {
  it('inserts a session row then one session_exercises row per category', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'session-1' }, error: null });
    const selectAfterInsert = vi.fn(() => ({ single }));
    const sessionsInsert = vi.fn(() => ({ select: selectAfterInsert }));
    const sessionExercisesInsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === 'sessions') return { insert: sessionsInsert };
      if (table === 'session_exercises') return { insert: sessionExercisesInsert };
      throw new Error(`unexpected table ${table}`);
    });
    vi.mocked(createClient).mockReturnValue({ from } as never);

    const config: SessionConfig = {
      difficultyLevelId: 'd1',
      repMultiplier: 1,
      deckSize: 13,
      exerciseByCategory: {
        push: { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1', tier: 2, isDefault: true },
        pull: { id: 'e2', name: 'Zgibovi', categoryId: 'c2', difficultyLevelId: 'd1', tier: 2, isDefault: true },
        legs: { id: 'e3', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1', tier: 2, isDefault: true },
        core: { id: 'e4', name: 'Trbušnjaci', categoryId: 'c4', difficultyLevelId: 'd1', tier: 2, isDefault: true },
      },
    };

    const sessionId = await createSession({
      userId: 'user-1',
      config,
      categoryIdByKey: { push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' },
      startedAtIso: '2026-07-08T10:00:00.000Z',
    });

    expect(sessionId).toBe('session-1');
    expect(sessionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        difficulty_level_id: 'd1',
        total_cards: 13,
        rep_multiplier: 1,
      })
    );
    expect(sessionExercisesInsert).toHaveBeenCalledWith([
      { session_id: 'session-1', category_id: 'c1', exercise_id: 'e1' },
      { session_id: 'session-1', category_id: 'c2', exercise_id: 'e2' },
      { session_id: 'session-1', category_id: 'c3', exercise_id: 'e3' },
      { session_id: 'session-1', category_id: 'c4', exercise_id: 'e4' },
    ]);
  });
});

describe('recordCardDraw', () => {
  it('inserts a card_draws row with mapped field names', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await recordCardDraw('session-1', {
      orderIndex: 0,
      card: { suit: 'hearts', rank: 10 },
      categoryKey: 'push',
      exercise: { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1', tier: 2, isDefault: true },
      reps: 10,
      completedAt: '2026-07-08T10:00:05.000Z',
    });

    expect(insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      order_index: 0,
      suit: 'hearts',
      card_value: 10,
      reps: 10,
      completed_at: '2026-07-08T10:00:05.000Z',
      beat_quota: null,
    });
  });
});

describe('completeSession', () => {
  it('updates status, completed_at, and total_duration_seconds', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await completeSession('session-1', 180);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', total_duration_seconds: 180 })
    );
    expect(eq).toHaveBeenCalledWith('id', 'session-1');
  });
});

describe('getUserSessions', () => {
  it('maps snake_case rows (including the joined difficulty name) to SessionHistoryEntry objects, newest first', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 's1',
          started_at: '2026-07-08T10:00:00.000Z',
          total_duration_seconds: 180,
          total_cards: 13,
          status: 'completed',
          difficulty_levels: { name: 'Srednji' },
          game_mode: 'classic',
          settings: {},
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    const result = await getUserSessions('user-1');

    expect(result).toEqual([
      {
        id: 's1',
        startedAt: '2026-07-08T10:00:00.000Z',
        totalDurationSeconds: 180,
        totalCards: 13,
        status: 'completed',
        difficultyName: 'Srednji',
        gameMode: 'classic',
        score: null,
        pauseCount: null,
        totalPauseSeconds: null,
        points: null,
        basePoints: null,
        multiplier: null,
        entry: null,
        sprintMinutes: null,
        cardCount: null,
      },
    ]);
  });
});

describe('challenge extensions', () => {
  it('createSession includes game_mode and settings when provided', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'session-1' }, error: null });
    const selectAfterInsert = vi.fn(() => ({ single }));
    const sessionsInsert = vi.fn(() => ({ select: selectAfterInsert }));
    const sessionExercisesInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) =>
      table === 'sessions' ? { insert: sessionsInsert } : { insert: sessionExercisesInsert }
    );
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await createSession({
      userId: 'user-1',
      config: {
        difficultyLevelId: 'd1', repMultiplier: 1, deckSize: 13,
        exerciseByCategory: {
          push: { id: 'e1', name: 'A', categoryId: 'c1', difficultyLevelId: 'd1', tier: 2, isDefault: true },
          pull: { id: 'e2', name: 'B', categoryId: 'c2', difficultyLevelId: 'd1', tier: 2, isDefault: true },
          legs: { id: 'e3', name: 'C', categoryId: 'c3', difficultyLevelId: 'd1', tier: 2, isDefault: true },
          core: { id: 'e4', name: 'D', categoryId: 'c4', difficultyLevelId: 'd1', tier: 2, isDefault: true },
        },
      },
      categoryIdByKey: { push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' },
      startedAtIso: '2026-07-09T10:00:00.000Z',
      gameMode: 'perfect_deck',
      settings: { budget_seconds: 1066, par_source: 'par' },
    });

    expect(sessionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        game_mode: 'perfect_deck',
        settings: { budget_seconds: 1066, par_source: 'par' },
      })
    );
  });

  it('recordCardDraw writes beat_quota', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await recordCardDraw('session-1', {
      orderIndex: 0,
      card: { suit: 'hearts', rank: 10 },
      categoryKey: 'push',
      exercise: { id: 'e1', name: 'A', categoryId: 'c1', difficultyLevelId: 'd1', tier: 2, isDefault: true },
      reps: 10,
      completedAt: '2026-07-09T10:00:05.000Z',
      beatQuota: true,
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ beat_quota: true }));
  });

  it('completeSession merges final challenge settings when provided', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await completeSession('session-1', 990, {
      budget_seconds: 1066, par_source: 'par', score: 22, won: false,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: { budget_seconds: 1066, par_source: 'par', score: 22, won: false },
      })
    );
  });

  it('completeSession writes pause stats for classic sessions', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await completeSession('session-1', 990, { pause_count: 2, total_pause_seconds: 161 });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: { pause_count: 2, total_pause_seconds: 161 },
      })
    );
  });

  it('getUserSessions maps pause keys from settings when present', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 's2',
          started_at: '2026-07-13T10:00:00.000Z',
          total_duration_seconds: 900,
          total_cards: 26,
          status: 'completed',
          difficulty_levels: { name: 'Srednji' },
          game_mode: 'classic',
          settings: { pause_count: 3, total_pause_seconds: 161 },
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    const result = await getUserSessions('user-1');
    expect(result[0].pauseCount).toBe(3);
    expect(result[0].totalPauseSeconds).toBe(161);
  });

  it('maps points/basePoints/multiplier/entry from settings', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 's3',
          started_at: '2026-07-15T10:00:00.000Z',
          total_duration_seconds: 600,
          total_cards: 24,
          status: 'completed',
          difficulty_levels: { name: 'Srednji' },
          game_mode: 'classic',
          settings: {
            points: 300,
            base_points: 200,
            multiplier: 1.5,
            entry: 'quick',
            card_count: 24,
            sprint_minutes: 5,
            score: 22,
          },
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    const result = await getUserSessions('user-1');

    expect(result[0]).toMatchObject({
      points: 300,
      basePoints: 200,
      multiplier: 1.5,
      entry: 'quick',
      cardCount: 24,
      sprintMinutes: 5,
      score: 22,
    });
  });
});

describe('backfillPoints', () => {
  it('upisuje points za classic sesiju i zadržava postojeći score', async () => {
    const eqUpdate = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: eqUpdate }));

    const from = vi.fn((table: string) => {
      if (table === 'sessions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { settings: { score: 24 }, total_cards: 52 },
                error: null,
              }),
            })),
          })),
          update,
        };
      }
      if (table === 'card_draws') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ suit: 'hearts', reps: 10, completed_at: '2026-07-15T10:00:00Z' }],
              error: null,
            }),
          })),
        };
      }
      if (table === 'session_exercises') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ categories: { name: 'Guranje' }, exercises: { tier: 2 } }],
              error: null,
            }),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    vi.mocked(createClient).mockReturnValue({ from } as never);

    const points = await backfillPoints('session-1', 'classic');

    expect(points).toBe(15);
    expect(update).toHaveBeenCalledWith({
      settings: { score: 24, points: 15, base_points: 15, multiplier: 1 },
    });
  });
});
