import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { SetupScreen } from './SetupScreen';
import type { Category, DifficultyLevel, Exercise } from '@/lib/domain/types';

vi.mock('@/lib/supabase/queries', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/queries')>(
    '@/lib/supabase/queries'
  );
  return {
    ...actual,
    fetchDifficultyLevels: vi.fn(),
    fetchCategories: vi.fn(),
    fetchExercisesByDifficulty: vi.fn(),
  };
});

import { fetchDifficultyLevels, fetchCategories, fetchExercisesByDifficulty } from '@/lib/supabase/queries';

vi.mock('@/lib/supabase/records', () => ({
  getBestDurationSeconds: vi.fn().mockResolvedValue(null),
  getBestScore: vi.fn().mockResolvedValue(null),
}));

const categories: Category[] = [
  { id: 'c1', name: 'Guranje', sortOrder: 1 },
  { id: 'c2', name: 'Povlačenje', sortOrder: 2 },
  { id: 'c3', name: 'Noge', sortOrder: 3 },
  { id: 'c4', name: 'Core', sortOrder: 4 },
];

const difficultyLevels: DifficultyLevel[] = [
  { id: 'd1', name: 'Srednji', defaultRepMultiplier: 1, sortOrder: 2 },
];

const exercises: Exercise[] = [
  { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1', tier: 2, isDefault: true },
  { id: 'e2', name: 'Zgibovi', categoryId: 'c2', difficultyLevelId: 'd1', tier: 2, isDefault: true },
  { id: 'e3', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1', tier: 2, isDefault: true },
  { id: 'e4', name: 'Trbušnjaci', categoryId: 'c4', difficultyLevelId: 'd1', tier: 2, isDefault: true },
];

describe('SetupScreen', () => {
  it('walks through difficulty, exercise, and length steps then calls onStart with a full deck', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue(difficultyLevels);
    vi.mocked(fetchExercisesByDifficulty).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} />);

    await user.click(await screen.findByRole('button', { name: /Klasično/ }));
    await user.click(await screen.findByRole('button', { name: 'Srednji' }));
    await user.click(await screen.findByRole('button', { name: 'Sklekovi' }));
    await user.click(screen.getByRole('button', { name: 'Zgibovi' }));
    await user.click(screen.getByRole('button', { name: 'Čučnjevi' }));
    await user.click(screen.getByRole('button', { name: 'Trbušnjaci' }));
    await user.click(await screen.findByRole('button', { name: 'Ceo špil (52 karte)' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    const [config, draws] = onStart.mock.calls[0];
    expect(config.deckSize).toBe(52);
    expect(config.repMultiplier).toBe(1);
    expect(config.gameMode).toBe('classic');
    expect(draws).toHaveLength(52);
    expect(draws.every((d: { reps: number }) => d.reps >= 1)).toBe(true);
  });

  it('challenge mode produces a budget from par when no record exists', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue([
      { ...difficultyLevels[0], parSecondsPerRep: 3, parTransitionSeconds: 20 },
    ]);
    vi.mocked(fetchExercisesByDifficulty).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} userId={null} />);

    await user.click(await screen.findByRole('button', { name: /Perfektan špil/ }));
    await user.click(await screen.findByRole('button', { name: 'Srednji' }));
    await user.click(await screen.findByRole('button', { name: 'Sklekovi' }));
    await user.click(screen.getByRole('button', { name: 'Zgibovi' }));
    await user.click(screen.getByRole('button', { name: 'Čučnjevi' }));
    await user.click(screen.getByRole('button', { name: 'Trbušnjaci' }));
    await user.click(await screen.findByRole('button', { name: 'Ceo špil (52 karte)' }));

    const [config, draws] = onStart.mock.calls[0];
    expect(config.gameMode).toBe('perfect_deck');
    expect(config.parSource).toBe('par');
    const totalReps = draws.reduce((s: number, d: { reps: number }) => s + d.reps, 0);
    expect(config.budgetSeconds).toBe(Math.round(totalReps * 3 + 52 * 20));
  });
});
