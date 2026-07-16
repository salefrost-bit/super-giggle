import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { ExercisePicker } from './ExercisePicker';
import type { Category, Exercise } from '@/lib/domain/types';

const categories: Category[] = [
  { id: 'c1', name: 'Guranje', sortOrder: 1 },
  { id: 'c2', name: 'Povlačenje', sortOrder: 2 },
  { id: 'c3', name: 'Noge', sortOrder: 3 },
  { id: 'c4', name: 'Core', sortOrder: 4 },
];

const exercises: Exercise[] = [
  { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1', tier: 2, isDefault: true },
  { id: 'e2', name: 'Zgibovi', categoryId: 'c2', difficultyLevelId: 'd1', tier: 2, isDefault: true },
  { id: 'e3', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1', tier: 2, isDefault: true },
  { id: 'e4', name: 'Trbušnjaci', categoryId: 'c4', difficultyLevelId: 'd1', tier: 2, isDefault: true },
];

describe('ExercisePicker', () => {
  it('does not call onComplete until all four categories have a selection', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <ExercisePicker
        categories={categories}
        exercises={exercises}
        onComplete={onComplete}
        initialTier={2}
      />
    );

    await user.click(screen.getByText('Sklekovi'));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByText('Zgibovi'));
    await user.click(screen.getByText('Čučnjevi'));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByText('Trbušnjaci'));
    expect(onComplete).toHaveBeenCalledWith({
      push: exercises[0],
      pull: exercises[1],
      legs: exercises[2],
      core: exercises[3],
    });
  });

  it('prikazuje samo vežbe aktivnog tier taba po grupi, tabovi rade nezavisno', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ExercisePicker
        categories={categories}
        exercises={exercises}
        onComplete={vi.fn()}
        initialTier={1}
      />
    );

    // Default tab je Ⅰ — fixture ima samo tier 2, pa se ništa ne prikazuje.
    expect(screen.queryByText('Sklekovi')).not.toBeInTheDocument();

    const pushGroup = screen.getByTestId('exercise-group-push');
    await user.click(within(pushGroup).getByRole('button', { name: 'Ⅱ' }));
    expect(within(pushGroup).getByText('Sklekovi')).toBeInTheDocument();

    // Ostale grupe ostaju na tabu Ⅰ (nezavisne po grupi).
    expect(screen.queryByText('Zgibovi')).not.toBeInTheDocument();
  });

  it('replaces the selection when a different exercise (drugi tier) is picked in the same category', async () => {
    const moreExercises: Exercise[] = [
      ...exercises,
      { id: 'e1b', name: 'Diamond sklekovi', categoryId: 'c1', difficultyLevelId: 'd1', tier: 3, isDefault: false },
    ];
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <ExercisePicker
        categories={categories}
        exercises={moreExercises}
        onComplete={onComplete}
        initialTier={2}
      />
    );

    await user.click(screen.getByText('Sklekovi'));
    const pushGroup = screen.getByTestId('exercise-group-push');
    await user.click(within(pushGroup).getByRole('button', { name: 'Ⅲ' }));
    await user.click(screen.getByText('Diamond sklekovi'));
    await user.click(screen.getByText('Zgibovi'));
    await user.click(screen.getByText('Čučnjevi'));
    await user.click(screen.getByText('Trbušnjaci'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ push: moreExercises[4] })
    );
  });
});
