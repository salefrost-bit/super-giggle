import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
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

const exercise = { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' };

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
    expect(completeSession).toHaveBeenCalledWith('session-1', expect.any(Number));
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
