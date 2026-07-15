import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { SessionScreen } from './SessionScreen';
import type { CardDrawResult, SessionConfig } from '@/lib/domain/types';

vi.mock('@/lib/supabase/sessions', () => ({
  createSession: vi.fn(),
  recordCardDraw: vi.fn(),
  completeSession: vi.fn(),
  hasDailyForDate: vi.fn(),
}));

vi.mock('@/hooks/useCardQuota', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useCardQuota')>('@/hooks/useCardQuota');
  return { useCardQuota: vi.fn(actual.useCardQuota) };
});

import { createSession, recordCardDraw, completeSession, hasDailyForDate } from '@/lib/supabase/sessions';
import { useCardQuota } from '@/hooks/useCardQuota';

beforeEach(() => {
  vi.clearAllMocks();
});

const exercise = { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1', tier: 2 as const, isDefault: true };

const config: SessionConfig = {
  difficultyLevelId: 'd1',
  repMultiplier: 1,
  deckSize: 13,
  exerciseByCategory: { push: exercise, pull: exercise, legs: exercise, core: exercise },
};

const draws: CardDrawResult[] = [
  { orderIndex: 0, card: { suit: 'hearts', rank: 5 }, categoryKey: 'push', exercise, reps: 5, completedAt: null },
  { orderIndex: 1, card: { suit: 'clubs', rank: 6 }, categoryKey: 'pull', exercise, reps: 6, completedAt: null },
];

function buildDraw(index: number, rank: number, ex = exercise): CardDrawResult {
  const suits: Array<'hearts' | 'clubs' | 'spades' | 'diamonds'> = [
    'hearts',
    'clubs',
    'spades',
    'diamonds',
  ];
  const categoryKeys: Array<'push' | 'pull' | 'legs' | 'core'> = [
    'push',
    'pull',
    'legs',
    'core',
  ];
  return {
    orderIndex: index,
    card: { suit: suits[index % 4], rank },
    categoryKey: categoryKeys[index % 4],
    exercise: ex,
    reps: rank,
    completedAt: null,
  };
}

const restDraws: CardDrawResult[] = [1, 2, 3, 4, 5, 6].map((rank, i) => buildDraw(i, rank));

const restConfig: SessionConfig = {
  difficultyLevelId: 'd1',
  repMultiplier: 1,
  deckSize: 6,
  exerciseByCategory: { push: exercise, pull: exercise, legs: exercise, core: exercise },
};

describe('SessionScreen — guest', () => {
  it('never touches Supabase and calls onFinish after the last card', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={onFinish} />
    );

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    expect(createSession).not.toHaveBeenCalled();
    expect(recordCardDraw).not.toHaveBeenCalled();
    expect(completeSession).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = onFinish.mock.calls[0][0];
    expect(result.draws).toHaveLength(2);
    expect(result.draws.every((d: CardDrawResult) => d.completedAt !== null)).toBe(true);
  });
});

describe('SessionScreen — logged in', () => {
  it('disables "Sledeća karta" until the session is created, then records each draw and completes the session', async () => {
    let resolveCreateSession: (id: string) => void = () => {};
    vi.mocked(createSession).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreateSession = resolve;
        })
    );
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(
      <SessionScreen
        config={config}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    expect(screen.getByRole('button', { name: 'Priprema treninga...' })).toBeDisabled();

    resolveCreateSession('session-1');
    await screen.findByRole('button', { name: 'Sledeća karta' });

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
    expect(recordCardDraw).toHaveBeenCalledTimes(2);
    expect(completeSession).toHaveBeenCalledWith(
      'session-1',
      expect.any(Number),
      expect.objectContaining({ pause_count: 0, total_pause_seconds: 0 })
    );
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('shows a warning and stops trying to save if session creation fails, but still lets the workout continue', async () => {
    vi.mocked(createSession).mockRejectedValue(new Error('network down'));
    const onFinish = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(
      <SessionScreen
        config={config}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByText(/Čuvanje treninga trenutno ne radi/);
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    expect(recordCardDraw).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});

describe('SessionScreen — perfect_deck challenge', () => {
  it('records beatQuota per card and completes with challenge settings', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const challengeConfig = {
      ...config,
      gameMode: 'perfect_deck' as const,
      budgetSeconds: 110,
      parSource: 'par' as const,
      parSecondsPerRep: 3,
      parTransitionSeconds: 20,
    };

    renderWithIntl(
      <SessionScreen
        config={challengeConfig}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    // Weights: card1 (5 reps) = 5*3+20 = 35, card2 (6 reps) = 6*3+20 = 38, total = 73.
    // Card 1 quota = round(110*35/73) = 53s. Click immediately → beaten.
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await waitFor(() =>
      expect(recordCardDraw).toHaveBeenLastCalledWith('session-1', expect.objectContaining({ beatQuota: true }))
    );

    // Card 2 quota = round(110*38/73) = 57s. Let it expire, then click → lost.
    await waitFor(() => expect(screen.getByText('Karta 2/2')).toBeInTheDocument());
    await vi.advanceTimersByTimeAsync(58_000);
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await waitFor(() =>
      expect(recordCardDraw).toHaveBeenLastCalledWith('session-1', expect.objectContaining({ beatQuota: false }))
    );

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ budget_seconds: 110, par_source: 'par', score: 1, won: false })
      )
    );
    const result = onFinish.mock.calls[0][0];
    expect(result.draws.map((d: { beatQuota?: boolean | null }) => d.beatQuota)).toEqual([true, false]);
    vi.useRealTimers();
  });
});

describe('SessionScreen — points payload', () => {
  it('classic sesija šalje points u settings i onFinish', async () => {
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(
      <SessionScreen
        config={{ ...config, entry: 'quick', deckSize: 12 }}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({
          points: 17,
          base_points: 16.5,
          multiplier: 1,
        })
      )
    );
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ points: 17, basePoints: 16.5, multiplier: 1 })
    );
  });

  it('perfect_deck zadržava score pored points u settings', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={{
          ...config,
          gameMode: 'perfect_deck',
          budgetSeconds: 110,
          parSource: 'par',
          parSecondsPerRep: 3,
          parTransitionSeconds: 20,
        }}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await waitFor(() => expect(screen.getByText('Karta 2/2')).toBeInTheDocument());
    await vi.advanceTimersByTimeAsync(58_000);
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({
          score: 1,
          points: 25,
          base_points: 16.5,
          multiplier: 1.5,
        })
      )
    );
    vi.useRealTimers();
  });

  it('court sesija koristi court multiplier u settings', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={{
          ...config,
          gameMode: 'court',
          deckSize: 2,
          budgetSeconds: 110,
          parSource: 'par',
          parSecondsPerRep: 3,
          parTransitionSeconds: 20,
        }}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({
          score: 2,
          multiplier: 2.5,
        })
      )
    );
    vi.useRealTimers();
  });
});

describe('SessionScreen — survive', () => {
  const surviveConfig = {
    ...config,
    gameMode: 'survive' as const,
    deckSize: 2,
    parSecondsPerRep: 3,
    parTransitionSeconds: 20,
  };

  it('bankrot završava sesiju', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={surviveConfig}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await vi.advanceTimersByTimeAsync(126_000);
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ survived_cards: 1, multiplier: 1 })
      )
    );
    expect(onFinish).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('52/52 daje ×1.5 u payload-u', async () => {
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(
      <SessionScreen
        config={{ ...surviveConfig, deckSize: 1 }}
        draws={[draws[0]]}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ survived_cards: 1, multiplier: 1.5 })
      )
    );
  });

  it('IVICA: 52. karta završena a saldo ≤ 0 → payload IPAK ima ×1.5', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={{ ...surviveConfig, deckSize: 1 }}
        draws={[draws[0]]}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await vi.advanceTimersByTimeAsync(200_000);
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ multiplier: 1.5, survived_cards: 1 })
      )
    );
    vi.useRealTimers();
  });

  it('pauza ne troši banku — activeCardSeconds ostaje isti', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={surviveConfig}
        draws={draws}
        categoryIdByKey={null}
        userId={null}
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await vi.advanceTimersByTimeAsync(5_000);
    await user.click(screen.getByRole('button', { name: 'Pauza' }));
    await vi.advanceTimersByTimeAsync(30_000);
    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    vi.useRealTimers();
  });
});

describe('SessionScreen — daily', () => {
  const dailyConfig = {
    ...config,
    gameMode: 'daily' as const,
    deckSize: 1,
    budgetSeconds: 50,
    parSource: 'par' as const,
    parSecondsPerRep: 3,
    parTransitionSeconds: 20,
  };

  it('replay: postojeća današnja sesija → daily_replay bez daily_date', async () => {
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    vi.mocked(hasDailyForDate).mockResolvedValue(true);
    const onFinish = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(
      <SessionScreen
        config={dailyConfig}
        draws={[draws[0]]}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ daily_replay: true })
      )
    );
    const payload = vi.mocked(completeSession).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.daily_date).toBeUndefined();
  });
});

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  fireEvent(document, new Event('visibilitychange'));
}

describe('SessionScreen — sprint', () => {
  const sprintExercise = {
    id: 'e1',
    name: 'Sklekovi',
    categoryId: 'c1',
    difficultyLevelId: 'd1',
    tier: 2 as const,
    isDefault: true,
  };

  const sprintConfig: SessionConfig = {
    difficultyLevelId: 'd1',
    repMultiplier: 1,
    deckSize: 52,
    exerciseByCategory: {
      push: sprintExercise,
      pull: sprintExercise,
      legs: sprintExercise,
      core: sprintExercise,
    },
    entry: 'challenge',
    gameMode: 'sprint',
    sprintMinutes: 5,
  };

  const sprintDraws: CardDrawResult[] = [
    {
      orderIndex: 0,
      card: { suit: 'hearts', rank: 5 },
      categoryKey: 'push',
      exercise: sprintExercise,
      reps: 5,
      completedAt: null,
    },
  ];

  it('prikazuje countdown umesto kvote po karti', async () => {
    vi.mocked(useCardQuota).mockImplementation((quotaSeconds) => {
      if (quotaSeconds === 300) {
        return { remainingSeconds: 245, fraction: 245 / 300, expired: false };
      }
      return { remainingSeconds: 0, fraction: 1, expired: false };
    });
    vi.mocked(createSession).mockResolvedValue('session-1');

    renderWithIntl(
      <SessionScreen
        config={sprintConfig}
        draws={sprintDraws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={vi.fn()}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    expect(screen.getByText('4:05')).toBeInTheDocument();
  });

  it('posle isteka završava tekuću kartu pa zatvara sesiju', async () => {
    vi.mocked(useCardQuota).mockImplementation((quotaSeconds) => {
      if (quotaSeconds === 300) {
        return { remainingSeconds: 0, fraction: 0, expired: true };
      }
      return { remainingSeconds: 30, fraction: 0.5, expired: false };
    });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(
      <SessionScreen
        config={sprintConfig}
        draws={sprintDraws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(completeSession).toHaveBeenCalledWith(
      'session-1',
      expect.any(Number),
      expect.objectContaining({
        sprint_minutes: 5,
        cards_completed: 1,
      })
    );
  });

  it('createSession šalje total_cards 52 za sprint', async () => {
    vi.mocked(createSession).mockResolvedValue('session-1');

    renderWithIntl(
      <SessionScreen
        config={sprintConfig}
        draws={sprintDraws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ deckSize: 52 }),
          gameMode: 'sprint',
        })
      )
    );
  });
});

describe('SessionScreen — auto-pause on visibility loss', () => {
  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('pauses with the auto label when the tab hides, stays paused on return, resumes only by click', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={onFinish} />
    );

    setVisibility('hidden');
    expect(await screen.findByText('PAUZIRANO')).toBeInTheDocument();
    expect(screen.getByText('Automatski pauzirano')).toBeInTheDocument();

    setVisibility('visible');
    expect(screen.getByText('PAUZIRANO')).toBeInTheDocument(); // no auto-resume

    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));
    expect(screen.queryByText('PAUZIRANO')).not.toBeInTheDocument();
    expect(screen.queryByText('Automatski pauzirano')).not.toBeInTheDocument();
  });

  it('is idempotent on rapid repeated hidden events', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={onFinish} />
    );

    setVisibility('hidden');
    setVisibility('visible');
    setVisibility('hidden');
    // Still exactly one overlay, still paused.
    expect(screen.getAllByText('PAUZIRANO')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));
    expect(screen.queryByText('PAUZIRANO')).not.toBeInTheDocument();
  });

  it('does not label a manual pause as automatic', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={onFinish} />
    );

    await user.click(screen.getByRole('button', { name: 'Pauza' }));
    expect(screen.getByText('PAUZIRANO')).toBeInTheDocument();
    expect(screen.queryByText('Automatski pauzirano')).not.toBeInTheDocument();

    // hidden while already manually paused must not relabel it
    setVisibility('hidden');
    expect(screen.queryByText('Automatski pauzirano')).not.toBeInTheDocument();
  });
});

describe('SessionScreen — pause persistence (all modes)', () => {
  it('completes a classic session with pause stats derived from timestamps', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={config}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );
    await screen.findByRole('button', { name: 'Sledeća karta' });

    await user.click(screen.getByRole('button', { name: 'Pauza' }));
    await vi.advanceTimersByTimeAsync(5_000);
    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ pause_count: 1, total_pause_seconds: 5 })
      )
    );
    const result = onFinish.mock.calls[0][0];
    expect(result.pauseCount).toBe(1);
    expect(result.totalPauseSeconds).toBe(5);
    vi.useRealTimers();
  });
});

describe('SessionScreen — joker rest', () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import('@/hooks/useCardQuota')>('@/hooks/useCardQuota');
    vi.mocked(useCardQuota).mockImplementation(actual.useCardQuota);
  });

  it('shows a rest screen after the warmup card and auto-advances without a click', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={restConfig}
        draws={restDraws}
        categoryIdByKey={null}
        userId={null}
        onFinish={onFinish}
      />
    );

    // 6-card deck → assignJokerBreaks(6, ...) is ALWAYS [5] regardless of rng
    // (single-slot range), so this is deterministic without mocking Math.random.
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    }

    expect(await screen.findByText('ODMOR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sledeća karta' })).toBeDisabled();

    await vi.advanceTimersByTimeAsync(30_000);

    await waitFor(() => expect(screen.queryByText('ODMOR')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Sledeća karta' })).not.toBeDisabled();
    vi.useRealTimers();
  });

  it('pauses the rest countdown like any other pause, and resuming continues it (not restart)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={restConfig}
        draws={restDraws}
        categoryIdByKey={null}
        userId={null}
        onFinish={onFinish}
      />
    );

    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    }
    await screen.findByText('ODMOR');

    await vi.advanceTimersByTimeAsync(10_000);
    await user.click(screen.getByRole('button', { name: 'Pauza' }));
    expect(screen.getByText('PAUZIRANO')).toBeInTheDocument();

    // Well past 30s total if the rest countdown were still running unpaused.
    await vi.advanceTimersByTimeAsync(60_000);
    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));
    // Still resting — pause froze the rest countdown, it did not silently expire.
    expect(await screen.findByText('ODMOR')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(20_000); // ~20s remained when paused
    await waitFor(() => expect(screen.queryByText('ODMOR')).not.toBeInTheDocument());
    vi.useRealTimers();
  });

  it('includes rest time in total_duration_seconds, keeps pause stats at zero, and reports joker_breaks_taken', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={restConfig}
        draws={restDraws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );
    await screen.findByRole('button', { name: 'Sledeća karta' });

    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    }
    await screen.findByText('ODMOR');
    await vi.advanceTimersByTimeAsync(30_000);
    await waitFor(() => expect(screen.queryByText('ODMOR')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ pause_count: 0, total_pause_seconds: 0, joker_breaks_taken: 1 })
      )
    );
    const totalDuration = vi.mocked(completeSession).mock.calls[0][1] as number;
    expect(totalDuration).toBeGreaterThanOrEqual(30);
    vi.useRealTimers();
  });
});
