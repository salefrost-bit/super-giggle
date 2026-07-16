import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import Home from './page';

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ user: null, isLoading: false, signOut: vi.fn() }),
}));

vi.mock('@/components/setup/SetupScreen', () => ({
  SetupScreen: ({ onStart }: { onStart: (c: unknown, d: unknown[]) => void }) => (
    <>
      <button onClick={() => onStart({ deckSize: 13 }, [{ completedAt: null }])}>finish-setup</button>
      <button
        onClick={() =>
          onStart({ deckSize: 13, gameMode: 'perfect_deck', budgetSeconds: 100 }, [{ completedAt: null }])
        }
      >
        finish-setup-challenge
      </button>
    </>
  ),
}));

vi.mock('@/components/session/SessionScreen', () => ({
  SessionScreen: ({ onFinish }: { onFinish: (r: unknown) => void }) => (
    <button onClick={() => onFinish({ totalDurationSeconds: 42, draws: [] })}>finish-session</button>
  ),
}));

vi.mock('@/components/summary/SummaryScreen', () => ({
  SummaryScreen: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>finish-summary</button>,
}));

describe('Home (top-level state machine)', () => {
  it('walks a guest through landing -> setup -> session -> summary -> back to landing', async () => {
    localStorage.setItem('explained.jokers', 'true');
    const user = userEvent.setup();
    renderWithIntl(<Home />);

    await user.click(screen.getByRole('button', { name: 'PODELI MI' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup' }));
    await user.click(await screen.findByRole('button', { name: 'finish-session' }));
    await user.click(await screen.findByRole('button', { name: 'finish-summary' }));

    expect(await screen.findByRole('button', { name: 'PODELI MI' })).toBeInTheDocument();
  });

  it('shows the perfect_deck first-run explanation once, before the session starts', async () => {
    localStorage.removeItem('explained.perfect_deck');
    localStorage.setItem('explained.jokers', 'true');
    const user = userEvent.setup();
    const { unmount } = renderWithIntl(<Home />);

    await user.click(screen.getByRole('button', { name: 'PODELI MI' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup-challenge' }));

    // Gate: session has NOT started while the explanation is up.
    expect(await screen.findByText(/Svaka karta ima svoju vremensku kvotu/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'finish-session' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'PROMEŠAJ I PODELI' }));
    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
    expect(localStorage.getItem('explained.perfect_deck')).toBe('true');

    // Second run on the same device: no modal, straight to the session.
    unmount();
    renderWithIntl(<Home />);
    await user.click(screen.getByRole('button', { name: 'PODELI MI' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup-challenge' }));
    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
    expect(screen.queryByText(/Svaka karta ima svoju vremensku kvotu/)).not.toBeInTheDocument();
  });

  it('shows the jokers first-run explanation once, before the very first session of any mode', async () => {
    localStorage.removeItem('explained.jokers');
    const user = userEvent.setup();
    const { unmount } = renderWithIntl(<Home />);

    await user.click(screen.getByRole('button', { name: 'PODELI MI' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup' }));

    expect(await screen.findByText(/Ako izvučeš džoker/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'finish-session' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'PROMEŠAJ I PODELI' }));
    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
    expect(localStorage.getItem('explained.jokers')).toBe('true');

    unmount();
    renderWithIntl(<Home />);
    await user.click(screen.getByRole('button', { name: 'PODELI MI' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup' }));
    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
    expect(screen.queryByText(/Ako izvučeš džoker/)).not.toBeInTheDocument();
  });

  it('chains jokers intro then challenge intro when both are unseen', async () => {
    localStorage.removeItem('explained.jokers');
    localStorage.removeItem('explained.perfect_deck');
    const user = userEvent.setup();
    renderWithIntl(<Home />);

    await user.click(screen.getByRole('button', { name: 'PODELI MI' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup-challenge' }));

    expect(await screen.findByText(/Ako izvučeš džoker/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'PROMEŠAJ I PODELI' }));

    expect(await screen.findByText(/Svaka karta ima svoju vremensku kvotu/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'PROMEŠAJ I PODELI' }));

    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
  });
});
