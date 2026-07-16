import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { HistoryScreen } from './HistoryScreen';
import type { SessionHistoryEntry } from '@/lib/supabase/sessions';

vi.mock('@/lib/supabase/sessions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/sessions')>(
    '@/lib/supabase/sessions'
  );
  return {
    ...actual,
    getUserSessions: vi.fn(),
    getSessionDetails: vi.fn(),
    backfillPoints: vi.fn(),
  };
});

import { getUserSessions, getSessionDetails, backfillPoints } from '@/lib/supabase/sessions';

function makeSession(overrides: Partial<SessionHistoryEntry> = {}): SessionHistoryEntry {
  return {
    id: 's1',
    startedAt: '2026-07-15T10:00:00.000Z',
    completedAt: '2026-07-15T10:10:00.000Z',
    totalDurationSeconds: 600,
    totalCards: 24,
    status: 'completed',
    difficultyName: 'Srednji',
    gameMode: 'classic',
    score: null,
    pauseCount: 0,
    totalPauseSeconds: 0,
    points: 320,
    basePoints: 280,
    multiplier: 1.15,
    entry: 'quick',
    sprintMinutes: null,
    cardCount: 24,
    cardsCompleted: null,
    survivedCards: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(backfillPoints).mockResolvedValue(null);
  vi.mocked(getSessionDetails).mockResolvedValue({
    exercises: [],
    totalReps: 100,
    repsBySuit: { hearts: 40, clubs: 20, spades: 30, diamonds: 10 },
  });
});

describe('HistoryScreen', () => {
  it('14-dnevni bar graf: points po danu, današnji bar ima data-points', async () => {
    // Freeze "today" via sessions dated relative to real now — use today's local date.
    const today = new Date();
    const todayIso = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12
    ).toISOString();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayIso = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      12
    ).toISOString();

    vi.mocked(getUserSessions).mockResolvedValue([
      makeSession({ id: 'today', completedAt: todayIso, startedAt: todayIso, points: 500 }),
      makeSession({
        id: 'yday',
        completedAt: yesterdayIso,
        startedAt: yesterdayIso,
        points: 200,
      }),
    ]);

    renderWithIntl(<HistoryScreen userId="u1" onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId('last-14-days')).toBeInTheDocument());
    expect(screen.getByTestId('hist-bar-13')).toHaveAttribute('data-points', '500');
    expect(screen.getByTestId('hist-bar-12')).toHaveAttribute('data-points', '200');
  });

  it('mesečna paginacija i broj sesija; kalendar markira trenirane dane', async () => {
    vi.mocked(getUserSessions).mockResolvedValue([
      makeSession({
        id: 'jul',
        startedAt: '2026-07-15T10:00:00.000Z',
        completedAt: '2026-07-15T10:10:00.000Z',
        points: 100,
      }),
      makeSession({
        id: 'jun',
        startedAt: '2026-06-10T10:00:00.000Z',
        completedAt: '2026-06-10T10:10:00.000Z',
        points: 80,
      }),
    ]);

    const user = userEvent.setup();
    renderWithIntl(<HistoryScreen userId="u1" onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId('month-label')).toBeInTheDocument());
    // Newest month first (jul)
    expect(screen.getByText(/1 trening/)).toBeInTheDocument();
    expect(screen.getByTestId('cal-day-15')).toHaveAttribute('data-trained');

    await user.click(screen.getByRole('button', { name: 'previous month' }));
    await waitFor(() => expect(screen.getByTestId('cal-day-10')).toHaveAttribute('data-trained'));
  });

  it('lazy backfill za sesije bez points; expand učitava details', async () => {
    vi.mocked(getUserSessions)
      .mockResolvedValueOnce([makeSession({ id: 's1', points: null })])
      .mockResolvedValueOnce([makeSession({ id: 's1', points: 320 })]);
    vi.mocked(backfillPoints).mockResolvedValue(320);

    renderWithIntl(<HistoryScreen userId="u1" onBack={vi.fn()} />);

    await waitFor(() => expect(backfillPoints).toHaveBeenCalledWith('s1', 'classic'));
    await waitFor(() => expect(screen.getByText('320')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('history-row-s1').querySelector('button')!);
    await waitFor(() => expect(getSessionDetails).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(screen.getByTestId('reps-by-suit')).toBeInTheDocument());
  });
});
