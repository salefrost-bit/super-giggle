import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { renderWithIntl } from '@/test/renderWithIntl';
import { SummaryScreen } from './SummaryScreen';
import type { CardDrawResult, SessionResult } from '@/lib/domain/types';

vi.mock('@/lib/supabase/records', () => ({
  getTotalXp: vi.fn(),
}));

import { getTotalXp } from '@/lib/supabase/records';

const exercise = {
  id: 'e1',
  name: 'Sklekovi',
  categoryId: 'c1',
  difficultyLevelId: 'd1',
  tier: 2 as const,
  isDefault: true,
};

const draws: CardDrawResult[] = [
  {
    orderIndex: 0,
    card: { suit: 'hearts', rank: 5 },
    categoryKey: 'push',
    exercise,
    reps: 5,
    completedAt: '2026-07-15T10:00:00Z',
  },
  {
    orderIndex: 1,
    card: { suit: 'clubs', rank: 8 },
    categoryKey: 'pull',
    exercise: { ...exercise, id: 'e2', name: 'Veslanje' },
    reps: 8,
    completedAt: '2026-07-15T10:01:00Z',
  },
];

function makeResult(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    totalDurationSeconds: 120,
    draws,
    points: 300,
    basePoints: 200,
    multiplier: 1.5,
    ...overrides,
  };
}

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SummaryScreen rank-up', () => {
  it('prikazuje banner kad XP prelazi prag zvanja', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // points=300; pre = rankForXp(600-300=300) = 🃏 (< 500); posle = rankForXp(600) = A (>= 500).
    vi.mocked(getTotalXp).mockResolvedValue(600);
    renderWithIntl(
      <SummaryScreen result={makeResult()} isGuest={false} userId="user-1" onDone={vi.fn()} />
    );
    await vi.advanceTimersByTimeAsync(2_000);
    await waitFor(() => expect(screen.getByText(/RANK UP · A Ace/)).toBeInTheDocument());
  });

  it('nema bannera kad zvanje ostaje isto', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // points=300; pre = rankForXp(1200-300=900) = A; posle = rankForXp(1200) = A (oba < 1500).
    vi.mocked(getTotalXp).mockResolvedValue(1200);
    renderWithIntl(
      <SummaryScreen result={makeResult()} isGuest={false} userId="user-1" onDone={vi.fn()} />
    );
    await vi.advanceTimersByTimeAsync(2_000);
    await waitFor(() => expect(getTotalXp).toHaveBeenCalled());
    expect(screen.queryByText(/RANK UP/)).not.toBeInTheDocument();
  });

  it('gost ne poziva getTotalXp i nema bannera', async () => {
    renderWithIntl(
      <SummaryScreen result={makeResult()} isGuest={true} userId={null} onDone={vi.fn()} />
    );
    expect(getTotalXp).not.toHaveBeenCalled();
    expect(screen.queryByText(/RANK UP/)).not.toBeInTheDocument();
  });
});

describe('SummaryScreen points', () => {
  it('prikazuje points i gost banner', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithIntl(
      <SummaryScreen result={makeResult({ points: 420 })} isGuest={true} onDone={vi.fn()} />
    );
    await vi.advanceTimersByTimeAsync(2_000);
    await waitFor(() =>
      expect(screen.getByText(/Osvojio si 420 poena za gostinskim stolom/)).toBeInTheDocument()
    );
  });
});

// Task 15 (s8): stage 0→6 choreography — UI only, not workout timing.
describe('SummaryScreen — score ritual etape', () => {
  it('etapno otkriva badge → poene → čipove → redove; NEW BEST na stage 6', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const challengeDraws = draws.map((d) => ({ ...d, beatQuota: true }));
    renderWithIntl(
      <SummaryScreen
        result={makeResult({ draws: challengeDraws, points: 300 })}
        isGuest={false}
        config={{
          difficultyLevelId: 'd1',
          repMultiplier: 1,
          deckSize: 2,
          exerciseByCategory: {
            push: exercise,
            pull: exercise,
            legs: exercise,
            core: exercise,
          },
          gameMode: 'perfect_deck',
          budgetSeconds: 110,
          parSource: 'par',
          bestScoreForCombo: 0,
        }}
        onDone={vi.fn()}
      />
    );

    const ritual = screen.getByTestId('summary-ritual');
    expect(ritual).toHaveAttribute('data-stage', '0');
    expect(screen.getByTestId('suit-row-push')).toHaveStyle({ opacity: '0' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(ritual).toHaveAttribute('data-stage', '1');
    expect(screen.getByText('ŠPIL SLOŽEN')).toBeInTheDocument();
    expect(screen.getByTestId('score-counter')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    }); // → 700ms, stage 2 — first suit row
    expect(ritual).toHaveAttribute('data-stage', '2');
    expect(screen.getByTestId('suit-row-push')).toHaveStyle({ opacity: '1' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    }); // → 850ms, stage 3 — second row
    expect(ritual).toHaveAttribute('data-stage', '3');
    expect(screen.getByTestId('suit-row-pull')).toHaveStyle({ opacity: '1' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_100);
    }); // → 1950ms, stage 6 — jackpot
    expect(ritual).toHaveAttribute('data-stage', '6');
    expect(screen.getByText('★ NOVI REKORD')).toBeInTheDocument();
    expect(screen.getByTestId('score-shards')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId('score-counter')).toHaveTextContent('300'));
  });

  it('reduced-motion: sve odmah vidljivo, brojač statičan na finalnoj vrednosti', () => {
    mockReducedMotion(true);
    renderWithIntl(
      <SummaryScreen result={makeResult({ points: 420 })} isGuest={false} onDone={vi.fn()} />
    );

    expect(screen.getByText('ŠPIL SLOŽEN')).toBeInTheDocument();
    expect(screen.getByTestId('score-counter')).toHaveTextContent('420');
    expect(screen.getByTestId('suit-row-push')).toBeInTheDocument();
    expect(screen.getByTestId('suit-row-pull')).toBeInTheDocument();
  });
});
