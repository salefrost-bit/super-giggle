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
    <button onClick={() => onStart({ deckSize: 13 }, [{ completedAt: null }])}>finish-setup</button>
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
    const user = userEvent.setup();
    renderWithIntl(<Home />);

    await user.click(screen.getByRole('button', { name: 'Nastavi kao gost' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup' }));
    await user.click(await screen.findByRole('button', { name: 'finish-session' }));
    await user.click(await screen.findByRole('button', { name: 'finish-summary' }));

    expect(await screen.findByRole('button', { name: 'Nastavi kao gost' })).toBeInTheDocument();
  });
});
