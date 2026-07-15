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
}));

import { createSession, recordCardDraw, completeSession } from '@/lib/supabase/sessions';

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

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  fireEvent(document, new Event('visibilitychange'));
}

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
