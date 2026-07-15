import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SummaryScreen rank-up', () => {
  it('prikazuje banner kad XP prelazi prag zvanja', async () => {
    vi.mocked(getTotalXp).mockResolvedValue(5100);
    renderWithIntl(
      <SummaryScreen result={makeResult()} isGuest={false} userId="user-1" onDone={vi.fn()} />
    );
    await waitFor(() =>
      expect(screen.getByText(/NOVO ZVANJE: J/)).toBeInTheDocument()
    );
  });

  it('nema bannera kad zvanje ostaje isto', async () => {
    vi.mocked(getTotalXp).mockResolvedValue(6000);
    renderWithIntl(
      <SummaryScreen result={makeResult()} isGuest={false} userId="user-1" onDone={vi.fn()} />
    );
    await waitFor(() => expect(getTotalXp).toHaveBeenCalled());
    expect(screen.queryByText(/NOVO ZVANJE/)).not.toBeInTheDocument();
  });

  it('gost ne poziva getTotalXp i nema bannera', async () => {
    renderWithIntl(
      <SummaryScreen result={makeResult()} isGuest={true} userId={null} onDone={vi.fn()} />
    );
    expect(getTotalXp).not.toHaveBeenCalled();
    expect(screen.queryByText(/NOVO ZVANJE/)).not.toBeInTheDocument();
  });
});

describe('SummaryScreen points', () => {
  it('prikazuje points i gost poruku', () => {
    renderWithIntl(
      <SummaryScreen result={makeResult({ points: 420 })} isGuest={true} onDone={vi.fn()} />
    );
    expect(screen.getByText(/Osvojeno 420 poena/)).toBeInTheDocument();
    expect(screen.getByText(/Rezultati gostiju se ne čuvaju/)).toBeInTheDocument();
  });
});
