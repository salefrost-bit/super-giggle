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
    fetchAllExercises: vi.fn(),
  };
});

import { fetchDifficultyLevels, fetchCategories, fetchExercisesByDifficulty, fetchAllExercises } from '@/lib/supabase/queries';

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
  it('quick staza preskače izbor vežbi i startuje sa default vežbama', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue(difficultyLevels);
    vi.mocked(fetchExercisesByDifficulty).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} />);

    await user.click(await screen.findByText(/Brza podela/));
    // Task 8 (errata E4): quick-difficulty + quick-length su spojeni u jedan ekran (QuickDealSetup).
    await user.click(await screen.findByText('Visok ulog'));
    expect(screen.queryByText(/Izaberi vežbu/)).not.toBeInTheDocument();
    await user.click(screen.getByText('Ceo špil'));
    await user.click(await screen.findByRole('button', { name: 'PROMEŠAJ ŠPIL' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    const [config, draws] = onStart.mock.calls[0];
    expect(config.deckSize).toBe(52);
    expect(config.repMultiplier).toBe(1);
    expect(config.gameMode).toBe('classic');
    expect(config.entry).toBe('quick');
    expect(config.exerciseByCategory).toEqual({
      push: exercises[0],
      pull: exercises[1],
      legs: exercises[2],
      core: exercises[3],
    });
    expect(draws).toHaveLength(52);
    expect(draws.every((d: { reps: number }) => d.reps >= 1)).toBe(true);
  });

  it('challenge mode produces a budget from par when no record exists', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue([
      { ...difficultyLevels[0], parSecondsPerRep: 3, parTransitionSeconds: 20 },
    ]);
    vi.mocked(fetchExercisesByDifficulty).mockResolvedValue(exercises);
    vi.mocked(fetchAllExercises).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} userId={null} />);

    await user.click(await screen.findByText(/Challenge/));
    await user.click(await screen.findByRole('button', { name: /Perfektan špil/ }));
    await user.click(await screen.findByRole('button', { name: 'Srednji' }));
    // Task 9 (P1): mode-exercises koristi fetchAllExercises + tier tabove (ExercisePicker);
    // fixture je sav tier 2, initialTier = sortOrder izabrane težine (2), pa se odmah vidi.
    await user.click(await screen.findByText('Sklekovi'));
    await user.click(screen.getByText('Zgibovi'));
    await user.click(screen.getByText('Čučnjevi'));
    await user.click(screen.getByText('Trbušnjaci'));
    await user.click(await screen.findByText('Ceo špil'));

    const [config, draws] = onStart.mock.calls[0];
    expect(config.gameMode).toBe('perfect_deck');
    expect(config.entry).toBe('challenge');
    expect(config.parSource).toBe('par');
    const totalReps = draws.reduce((s: number, d: { reps: number }) => s + d.reps, 0);
    expect(config.budgetSeconds).toBe(Math.round(totalReps * 3 + 52 * 20));
  });

  it('court staza preskače dužinu i pravi 16 draws iz court špila', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue([
      { ...difficultyLevels[0], parSecondsPerRep: 3, parTransitionSeconds: 20 },
    ]);
    vi.mocked(fetchExercisesByDifficulty).mockResolvedValue(exercises);
    vi.mocked(fetchAllExercises).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} userId={null} />);

    await user.click(await screen.findByText(/Challenge/));
    await user.click(await screen.findByRole('button', { name: /Dvor/ }));
    await user.click(await screen.findByRole('button', { name: 'Srednji' }));
    await user.click(await screen.findByText('Sklekovi'));
    await user.click(screen.getByText('Zgibovi'));
    await user.click(screen.getByText('Čučnjevi'));
    await user.click(screen.getByText('Trbušnjaci'));

    expect(screen.queryByText('Ceo špil')).not.toBeInTheDocument();
    expect(onStart).toHaveBeenCalledTimes(1);
    const [config, draws] = onStart.mock.calls[0];
    expect(config.gameMode).toBe('court');
    expect(config.deckSize).toBe(16);
    expect(config.parSource).toBe('par');
    expect(draws).toHaveLength(16);
    expect(draws.every((d: { card: { rank: number } }) => [1, 11, 12, 13].includes(d.card.rank))).toBe(
      true
    );
    const totalReps = draws.reduce((s: number, d: { reps: number }) => s + d.reps, 0);
    expect(config.budgetSeconds).toBe(Math.round(totalReps * 3 + 16 * 20));
  });

  it('survive staza preskače dužinu i startuje sa 52 karte', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue([
      { ...difficultyLevels[0], parSecondsPerRep: 3, parTransitionSeconds: 20 },
    ]);
    vi.mocked(fetchExercisesByDifficulty).mockResolvedValue(exercises);
    vi.mocked(fetchAllExercises).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} userId={null} />);

    await user.click(await screen.findByText(/Challenge/));
    await user.click(await screen.findByRole('button', { name: /Na satu/ }));
    await user.click(await screen.findByRole('button', { name: 'Srednji' }));
    await user.click(await screen.findByText('Sklekovi'));
    await user.click(screen.getByText('Zgibovi'));
    await user.click(screen.getByText('Čučnjevi'));
    await user.click(screen.getByText('Trbušnjaci'));

    expect(screen.queryByText('Ceo špil')).not.toBeInTheDocument();
    expect(onStart).toHaveBeenCalledTimes(1);
    const [config, draws] = onStart.mock.calls[0];
    expect(config.gameMode).toBe('survive');
    expect(config.deckSize).toBe(52);
    expect(config.parSecondsPerRep).toBe(3);
    expect(config.parTransitionSeconds).toBe(20);
    expect(draws).toHaveLength(52);
  });

  it('errata E5(2): Blitz staza — pilula (challenge meni) → vežbe → start sa repMultiplier 1.0, bez SprintSetup/mode-difficulty koraka', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue(difficultyLevels);
    vi.mocked(fetchAllExercises).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} userId={null} />);

    await user.click(await screen.findByText(/Challenge/));
    // Default pilula je 5 min (bez klika); kartica Blitz-a šalje onSelect('sprint', {minutes: 5}).
    await user.click(await screen.findByRole('button', { name: /Blic/ }));
    expect(screen.queryByRole('button', { name: 'Srednji' })).not.toBeInTheDocument();
    await user.click(await screen.findByText('Sklekovi'));
    await user.click(screen.getByText('Zgibovi'));
    await user.click(screen.getByText('Čučnjevi'));
    await user.click(screen.getByText('Trbušnjaci'));

    expect(onStart).toHaveBeenCalledTimes(1);
    const [config, draws] = onStart.mock.calls[0];
    expect(config.gameMode).toBe('sprint');
    expect(config.sprintMinutes).toBe(5);
    expect(config.repMultiplier).toBe(1);
    expect(config.deckSize).toBe(52);
    expect(config.difficultyLevelId).toBe('d1');
    expect(draws).toHaveLength(52);
  });

  it('errata E5(2): Blitz pilula 3 min se prenosi u sprintMinutes', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue(difficultyLevels);
    vi.mocked(fetchAllExercises).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} userId={null} />);

    await user.click(await screen.findByText(/Challenge/));
    await user.click(await screen.findByRole('button', { name: '3 min' }));
    await user.click(screen.getByRole('button', { name: /Blic/ }));
    await user.click(await screen.findByText('Sklekovi'));
    await user.click(screen.getByText('Zgibovi'));
    await user.click(screen.getByText('Čučnjevi'));
    await user.click(screen.getByText('Trbušnjaci'));

    const [config] = onStart.mock.calls[0];
    expect(config.sprintMinutes).toBe(3);
  });

  it('daily staza startuje direktno bez izbora', async () => {
    // Fiksiran datum: sreda 2026-07-15 => dailyTier() vraća 3 (v. src/lib/domain/daily.ts).
    // Bez fiksiranja, test je flaky — pada svakog dana čiji tier != 3 (npr. pon/čet = tier 1).
    // toFake: ['Date'] fiksira SAMO Date, ne i setTimeout/MutationObserver koje
    // userEvent/findBy* koriste iznutra — pun useFakeTimers() ovde vodi u timeout.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-15T10:00:00'));
    try {
      const tier3Exercises: Exercise[] = exercises.map((e) => ({ ...e, tier: 3 as const }));
      vi.mocked(fetchCategories).mockResolvedValue(categories);
      vi.mocked(fetchAllExercises).mockResolvedValue(tier3Exercises);
      vi.mocked(fetchDifficultyLevels).mockResolvedValue([
        { id: 'd0', name: 'Početnik', defaultRepMultiplier: 0.5, sortOrder: 1 },
        { ...difficultyLevels[0], parSecondsPerRep: 3, parTransitionSeconds: 20 },
        { id: 'd3', name: 'Napredni', defaultRepMultiplier: 1.5, sortOrder: 3, parSecondsPerRep: 3, parTransitionSeconds: 20 },
      ]);
      const onStart = vi.fn();
      const user = userEvent.setup();

      renderWithIntl(<SetupScreen onStart={onStart} userId={null} />);

      await user.click(await screen.findByText(/Challenge/));
      await user.click(await screen.findByRole('button', { name: /Dnevna podela/ }));

      expect(screen.queryByRole('button', { name: 'Srednji' })).not.toBeInTheDocument();
      expect(onStart).toHaveBeenCalledTimes(1);
      const [config, draws] = onStart.mock.calls[0];
      expect(config.gameMode).toBe('daily');
      expect(config.deckSize).toBe(20);
      expect(config.parSource).toBe('par');
      expect(draws).toHaveLength(20);
    } finally {
      vi.useRealTimers();
    }
  });
});
