import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { QuickDealSetup } from './QuickDealSetup';
import type { DifficultyLevel } from '@/lib/domain/types';

vi.mock('@/lib/supabase/queries', () => ({
  fetchDifficultyLevels: vi.fn(),
}));

import { fetchDifficultyLevels } from '@/lib/supabase/queries';

const levels: DifficultyLevel[] = [
  { id: 'd1', name: 'Početnik', defaultRepMultiplier: 0.75, sortOrder: 1 },
  { id: 'd2', name: 'Srednji', defaultRepMultiplier: 1.0, sortOrder: 2 },
  { id: 'd3', name: 'Napredni', defaultRepMultiplier: 1.25, sortOrder: 3 },
];

describe('QuickDealSetup', () => {
  it('prikazuje 3 nivoa i 3 dužine, predselektuje High Stakes + Half Deck, CTA je uvek aktivan', async () => {
    vi.mocked(fetchDifficultyLevels).mockResolvedValue(levels);
    const onStart = vi.fn();

    renderWithIntl(<QuickDealSetup onStart={onStart} />);

    expect(await screen.findByText('Nizak ulog')).toBeInTheDocument();
    expect(screen.getByText('Visok ulog')).toBeInTheDocument();
    expect(screen.getByText('All-in')).toBeInTheDocument();
    expect(screen.getByText('Presecanje')).toBeInTheDocument();
    expect(screen.getByText('Pola špila')).toBeInTheDocument();
    expect(screen.getByText('Ceo špil')).toBeInTheDocument();

    const cta = screen.getByRole('button', { name: 'PROMEŠAJ ŠPIL' });
    expect(cta).toBeEnabled();

    const user = userEvent.setup();
    await user.click(cta);

    expect(onStart).toHaveBeenCalledWith(levels[1], 24);
  });

  it('bira nivo i dužinu klikom pa javlja izbor kroz onStart', async () => {
    vi.mocked(fetchDifficultyLevels).mockResolvedValue(levels);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<QuickDealSetup onStart={onStart} />);

    await screen.findByText('Nizak ulog');
    await user.click(screen.getByText('All-in'));
    await user.click(screen.getByText('Presecanje'));
    await user.click(screen.getByRole('button', { name: 'PROMEŠAJ ŠPIL' }));

    expect(onStart).toHaveBeenCalledWith(levels[2], 12);
  });
});
