import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithIntl } from '@/test/renderWithIntl';
import { HistoryRow } from './HistoryRow';
import type { SessionHistoryEntry, SessionDetails } from '@/lib/supabase/sessions';

const session: SessionHistoryEntry = {
  id: 's1',
  startedAt: '2026-07-15T10:00:00.000Z',
  completedAt: '2026-07-15T10:10:00.000Z',
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
  cardsCompleted: null,
  survivedCards: null,
};

const details: SessionDetails = {
  exercises: [
    { categoryName: 'Guranje', name: 'Sklekovi', nameEn: 'Push-up', tier: 2 },
  ],
  totalReps: 145,
  repsBySuit: { hearts: 74, clubs: 0, spades: 61, diamonds: 10 },
};

describe('HistoryRow', () => {
  it('collapsed prikazuje points, mode naslov i datum', () => {
    renderWithIntl(
      <HistoryRow session={session} details={null} isBest={false} expanded={false} onExpand={vi.fn()} />
    );
    expect(screen.getByText('320')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.queryByTestId('reps-by-suit')).not.toBeInTheDocument();
  });

  it('BEST bedž kad isBest', () => {
    renderWithIntl(
      <HistoryRow session={session} details={null} isBest expanded={false} onExpand={vi.fn()} />
    );
    expect(screen.getByText('REKORD')).toBeInTheDocument();
  });

  it('klik poziva onExpand sa id-jem', () => {
    const onExpand = vi.fn();
    renderWithIntl(
      <HistoryRow session={session} details={null} isBest={false} expanded={false} onExpand={onExpand} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onExpand).toHaveBeenCalledWith('s1');
  });

  it('expand: XP, PAUSED, AVG PER CARD i repsBySuit', () => {
    // 600s / 24 cards = 25.0s avg
    renderWithIntl(
      <HistoryRow session={session} details={details} isBest={false} expanded onExpand={vi.fn()} />
    );
    expect(screen.getByText('+320')).toBeInTheDocument();
    expect(screen.getByText('00:30')).toBeInTheDocument();
    expect(screen.getByText('25.0s')).toBeInTheDocument();
    expect(screen.getByText('PROSEK PO KARTI')).toBeInTheDocument();
    const suits = screen.getByTestId('reps-by-suit');
    expect(suits).toHaveTextContent('74');
    expect(suits).toHaveTextContent('61');
  });

  it('Blitz zaglavlje prikazuje cardsCompleted, ne deck size iz card_count', () => {
    const sprint: SessionHistoryEntry = {
      ...session,
      gameMode: 'sprint',
      cardCount: 52,
      cardsCompleted: 12,
      survivedCards: null,
    };
    renderWithIntl(
      <HistoryRow session={sprint} details={null} isBest={false} expanded={false} onExpand={vi.fn()} />
    );
    expect(screen.getByText(/12 karata/)).toBeInTheDocument();
    expect(screen.queryByText(/52 kar/)).not.toBeInTheDocument();
  });

  it('Preživi zaglavlje prikazuje survivedCards, ne deck size iz card_count', () => {
    const survive: SessionHistoryEntry = {
      ...session,
      gameMode: 'survive',
      cardCount: 52,
      cardsCompleted: null,
      survivedCards: 37,
    };
    renderWithIntl(
      <HistoryRow session={survive} details={null} isBest={false} expanded={false} onExpand={vi.fn()} />
    );
    expect(screen.getByText(/37 karata/)).toBeInTheDocument();
    expect(screen.queryByText(/52 kar/)).not.toBeInTheDocument();
  });

  it('Blitz AVG koristi cardsCompleted (S6)', () => {
    const sprint: SessionHistoryEntry = {
      ...session,
      gameMode: 'sprint',
      totalDurationSeconds: 180,
      cardsCompleted: 12,
      survivedCards: null,
      cardCount: null,
    };
    renderWithIntl(
      <HistoryRow session={sprint} details={details} isBest={false} expanded onExpand={vi.fn()} />
    );
    // 180 / 12 = 15.0s
    expect(screen.getByText('15.0s')).toBeInTheDocument();
  });
});
