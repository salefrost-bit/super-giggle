import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExercisePicker } from './ExercisePicker';
import type { Category, Exercise } from '@/lib/domain/types';

const categories: Category[] = [
  { id: 'c1', name: 'Guranje', sortOrder: 1 },
  { id: 'c2', name: 'Povlačenje', sortOrder: 2 },
  { id: 'c3', name: 'Noge', sortOrder: 3 },
  { id: 'c4', name: 'Core', sortOrder: 4 },
];

const exercises: Exercise[] = [
  { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' },
  { id: 'e2', name: 'Zgibovi', categoryId: 'c2', difficultyLevelId: 'd1' },
  { id: 'e3', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1' },
  { id: 'e4', name: 'Trbušnjaci', categoryId: 'c4', difficultyLevelId: 'd1' },
];

describe('ExercisePicker', () => {
  it('does not call onComplete until all four categories have a selection', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<ExercisePicker categories={categories} exercises={exercises} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: 'Sklekovi' }));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Zgibovi' }));
    await user.click(screen.getByRole('button', { name: 'Čučnjevi' }));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Trbušnjaci' }));
    expect(onComplete).toHaveBeenCalledWith({
      push: exercises[0],
      pull: exercises[1],
      legs: exercises[2],
      core: exercises[3],
    });
  });

  it('replaces the selection when a different exercise in the same category is clicked', async () => {
    const moreExercises: Exercise[] = [
      ...exercises,
      { id: 'e1b', name: 'Diamond sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' },
    ];
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(
      <ExercisePicker categories={categories} exercises={moreExercises} onComplete={onComplete} />
    );

    await user.click(screen.getByRole('button', { name: 'Sklekovi' }));
    await user.click(screen.getByRole('button', { name: 'Diamond sklekovi' }));
    await user.click(screen.getByRole('button', { name: 'Zgibovi' }));
    await user.click(screen.getByRole('button', { name: 'Čučnjevi' }));
    await user.click(screen.getByRole('button', { name: 'Trbušnjaci' }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ push: moreExercises[4] })
    );
  });
});
