import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithIntl } from '@/test/renderWithIntl';
import { HistoryRow } from './HistoryRow';
import type { SessionHistoryEntry } from '@/lib/supabase/sessions';
import type { SessionDetails } from '@/lib/supabase/sessions';

const session: SessionHistoryEntry = {
  id: 's1',
  startedAt: '2026-07-15T10:00:00.000Z',
  totalDurationSeconds: 600,
  totalCards: 24,
  status: 'completed',
  difficultyName: 'Srednji',
  gameMode: 'classic',
  score: null,
  pauseCount: 1,
  totalPauseSeconds: 30,
  points: 320,
  basePoints: 280,
  multiplier: 1.15,
  entry: 'custom',
  sprintMinutes: null,
  cardCount: 24,
};

const details: SessionDetails = {
  exercises: [
    { categoryName: 'Guranje', name: 'Standardni sklekovi', nameEn: 'Push-ups', tier: 2 },
    { categoryName: 'Noge', name: 'Iskoraci', nameEn: 'Lunges', tier: 2 },
  ],
  totalReps: 145,
};

describe('HistoryRow', () => {
  it('collapsed prikazuje points i datum', () => {
    renderWithIntl(<HistoryRow session={session} details={null} onExpand={vi.fn()} />);
    expect(screen.getByText('320')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('klik poziva onExpand sa id-jem', () => {
    const onExpand = vi.fn();
    renderWithIntl(<HistoryRow session={session} details={null} onExpand={onExpand} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onExpand).toHaveBeenCalledWith('s1');
  });

  it('sa details prop-om renderuje vežbe i ukupna ponavljanja', () => {
    renderWithIntl(<HistoryRow session={session} details={details} onExpand={vi.fn()} />);
    expect(screen.getByText(/Standardni sklekovi/)).toBeInTheDocument();
    expect(screen.getByText(/145 ponavljanja/)).toBeInTheDocument();
  });
});
