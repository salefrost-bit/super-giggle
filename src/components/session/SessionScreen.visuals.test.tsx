import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { SessionScreen } from './SessionScreen';
import type { CardDrawResult, SessionConfig } from '@/lib/domain/types';

// Task 12 (s12 + s1/s2/s4/s5/s6): HeatRing/SegmentBar/toast/stopwatch-chip
// wiring. Kept separate from SessionScreen.test.tsx (behavioral contract)
// since these assert the new visual layer, not handleNext/save/pause logic.

vi.mock('@/lib/supabase/sessions', () => ({
  createSession: vi.fn(),
  recordCardDraw: vi.fn(),
  completeSession: vi.fn(),
  hasDailyForDate: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const exercise = { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1', tier: 2 as const, isDefault: true };

function buildDraw(index: number, rank: number): CardDrawResult {
  const suits: Array<'hearts' | 'clubs' | 'spades' | 'diamonds'> = ['hearts', 'clubs', 'spades', 'diamonds'];
  const categoryKeys: Array<'push' | 'pull' | 'legs' | 'core'> = ['push', 'pull', 'legs', 'core'];
  return {
    orderIndex: index,
    card: { suit: suits[index % 4], rank },
    categoryKey: categoryKeys[index % 4],
    exercise,
    reps: rank,
    completedAt: null,
  };
}

describe('SessionScreen — HeatRing + big quota counter (perfect_deck)', () => {
  const challengeConfig: SessionConfig = {
    difficultyLevelId: 'd1',
    repMultiplier: 1,
    deckSize: 2,
    exerciseByCategory: { push: exercise, pull: exercise, legs: exercise, core: exercise },
    gameMode: 'perfect_deck',
    budgetSeconds: 110,
    parSource: 'par',
    parSecondsPerRep: 3,
    parTransitionSeconds: 20,
  };
  const draws = [buildDraw(0, 5), buildDraw(1, 6)];

  it('HeatRing prima quota.fraction (data-heat na prstenu) i menja se sa warn/danger pragovima', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderWithIntl(
      <SessionScreen config={challengeConfig} draws={draws} categoryIdByKey={null} userId={null} onFinish={vi.fn()} />
    );

    // Card 1 quota = round(110*35/73) = 53s.
    const ring = document.querySelector('[data-heat]') as HTMLElement;
    expect(ring).toBeTruthy();
    expect(ring).toHaveAttribute('data-heat', 'ok');

    await vi.advanceTimersByTimeAsync(27_000); // > 50% elapsed → below 0.5 fraction
    await waitFor(() => expect(ring).toHaveAttribute('data-heat', 'warn'));

    await vi.advanceTimersByTimeAsync(14_000); // > 75% elapsed → below 0.25 fraction
    await waitFor(() => expect(ring).toHaveAttribute('data-heat', 'danger'));

    vi.useRealTimers();
  });

  it('veliki kvota brojač (ON THE CLOCK) menja data-heat isto kao HeatRing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderWithIntl(
      <SessionScreen config={challengeConfig} draws={draws} categoryIdByKey={null} userId={null} onFinish={vi.fn()} />
    );

    const counter = screen.getByTestId('quota-counter');
    expect(counter).toHaveAttribute('data-heat', 'ok');
    expect(screen.getByText('NA SATU')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(41_000); // > 75% elapsed of 53s quota
    await waitFor(() => expect(counter).toHaveAttribute('data-heat', 'danger'));

    vi.useRealTimers();
  });
});

describe('SessionScreen — SegmentBar', () => {
  const config: SessionConfig = {
    difficultyLevelId: 'd1',
    repMultiplier: 1,
    deckSize: 2,
    exerciseByCategory: { push: exercise, pull: exercise, legs: exercise, core: exercise },
  };
  const draws = [buildDraw(0, 5), buildDraw(1, 6)];

  it('total = broj karata u špilu, current = currentIndex, raste posle klika', async () => {
    const user = userEvent.setup();
    renderWithIntl(<SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={vi.fn()} />);

    expect(screen.getByRole('img', { name: '0/2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    expect(screen.getByRole('img', { name: '1/2' })).toBeInTheDocument();
  });
});

describe('SessionScreen — HALF THE DECK DOWN toast', () => {
  const config: SessionConfig = {
    difficultyLevelId: 'd1',
    repMultiplier: 1,
    deckSize: 4,
    exerciseByCategory: { push: exercise, pull: exercise, legs: exercise, core: exercise },
  };
  const draws = [buildDraw(0, 5), buildDraw(1, 6), buildDraw(2, 7), buildDraw(3, 8)];

  it('prikazuje se tačno na currentIndex === floor(draws.length/2), gubi se posle 2.3s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithIntl(<SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={vi.fn()} />);

    expect(screen.queryByText('POLA ŠPILA GOTOVO')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    expect(screen.queryByText('POLA ŠPILA GOTOVO')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' })); // currentIndex → 2 === floor(4/2)
    expect(screen.getByText('POLA ŠPILA GOTOVO')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(2_300);
    await waitFor(() => expect(screen.queryByText('POLA ŠPILA GOTOVO')).not.toBeInTheDocument());

    vi.useRealTimers();
  });
});

describe('SessionScreen — stopwatch chip + LiveDot', () => {
  const config: SessionConfig = {
    difficultyLevelId: 'd1',
    repMultiplier: 1,
    deckSize: 2,
    exerciseByCategory: { push: exercise, pull: exercise, legs: exercise, core: exercise },
  };
  const draws = [buildDraw(0, 5), buildDraw(1, 6)];

  it('prikazuje LiveDot pored kartice i unutar štoperice, pauza zamrzava oba', async () => {
    const user = userEvent.setup();
    renderWithIntl(<SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={vi.fn()} />);

    const dotsRunning = document.querySelectorAll('[data-paused]');
    expect(dotsRunning.length).toBeGreaterThanOrEqual(2);
    dotsRunning.forEach((dot) => expect(dot).toHaveAttribute('data-paused', 'false'));

    await user.click(screen.getByRole('button', { name: 'Pauza' }));

    const dotsPaused = document.querySelectorAll('[data-paused]');
    expect(dotsPaused.length).toBeGreaterThanOrEqual(2);
    dotsPaused.forEach((dot) => expect(dot).toHaveAttribute('data-paused', 'true'));
  });
});
