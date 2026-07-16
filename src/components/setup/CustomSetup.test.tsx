import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithIntl } from '@/test/renderWithIntl';
import { CustomSetup } from './CustomSetup';
import type { Category, Exercise } from '@/lib/domain/types';

const cats: Category[] = [
  { id: 'c1', name: 'Guranje', sortOrder: 1 },
  { id: 'c2', name: 'Povlačenje', sortOrder: 2 },
  { id: 'c3', name: 'Noge', sortOrder: 3 },
  { id: 'c4', name: 'Core', sortOrder: 4 },
];

const all24: Exercise[] = [
  { id: 'e1a', name: 'Sklekovi na kolenima', categoryId: 'c1', difficultyLevelId: 'd1', tier: 1, isDefault: true },
  { id: 'e1b', name: 'Sklekovi uz zid', categoryId: 'c1', difficultyLevelId: 'd1', tier: 1, isDefault: false },
  { id: 'e2a', name: 'Standardni sklekovi', categoryId: 'c1', difficultyLevelId: 'd2', tier: 2, isDefault: true },
  { id: 'e2b', name: 'Široki sklekovi', categoryId: 'c1', difficultyLevelId: 'd2', tier: 2, isDefault: false },
  { id: 'e3a', name: 'Diamond sklekovi', categoryId: 'c1', difficultyLevelId: 'd3', tier: 3, isDefault: true },
  { id: 'e3b', name: 'Sklekovi s nogama na povišenju', categoryId: 'c1', difficultyLevelId: 'd3', tier: 3, isDefault: false },
  { id: 'e4a', name: 'Veslanje peškirom', categoryId: 'c2', difficultyLevelId: 'd1', tier: 1, isDefault: true },
  { id: 'e4b', name: 'Superman povlačenje', categoryId: 'c2', difficultyLevelId: 'd1', tier: 1, isDefault: false },
  { id: 'e5a', name: 'Zgibovi (asistirani)', categoryId: 'c2', difficultyLevelId: 'd2', tier: 2, isDefault: true },
  { id: 'e5b', name: 'Australijski zgibovi', categoryId: 'c2', difficultyLevelId: 'd2', tier: 2, isDefault: false },
  { id: 'e6a', name: 'Puni zgibovi', categoryId: 'c2', difficultyLevelId: 'd3', tier: 3, isDefault: true },
  { id: 'e6b', name: 'Zgibovi širokim hvatom', categoryId: 'c2', difficultyLevelId: 'd3', tier: 3, isDefault: false },
  { id: 'e7a', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1', tier: 1, isDefault: true },
  { id: 'e7b', name: 'Glute most', categoryId: 'c3', difficultyLevelId: 'd1', tier: 1, isDefault: false },
  { id: 'e8a', name: 'Iskoraci', categoryId: 'c3', difficultyLevelId: 'd2', tier: 2, isDefault: true },
  { id: 'e8b', name: 'Bočni iskoraci', categoryId: 'c3', difficultyLevelId: 'd2', tier: 2, isDefault: false },
  { id: 'e9a', name: 'Jump squats', categoryId: 'c3', difficultyLevelId: 'd3', tier: 3, isDefault: true },
  { id: 'e9b', name: 'Bugarski čučanj', categoryId: 'c3', difficultyLevelId: 'd3', tier: 3, isDefault: false },
  { id: 'e10a', name: 'Trbušnjaci (crunches)', categoryId: 'c4', difficultyLevelId: 'd1', tier: 1, isDefault: true },
  { id: 'e10b', name: 'Mrtva buba', categoryId: 'c4', difficultyLevelId: 'd1', tier: 1, isDefault: false },
  { id: 'e11a', name: 'Standardni trbušnjaci', categoryId: 'c4', difficultyLevelId: 'd2', tier: 2, isDefault: true },
  { id: 'e11b', name: 'Planinari', categoryId: 'c4', difficultyLevelId: 'd2', tier: 2, isDefault: false },
  { id: 'e12a', name: 'Nožne makaze', categoryId: 'c4', difficultyLevelId: 'd3', tier: 3, isDefault: true },
  { id: 'e12b', name: 'V-podizanja', categoryId: 'c4', difficultyLevelId: 'd3', tier: 3, isDefault: false },
];

// Task 9 (s18): svaka grupa ima svoj tab Ⅰ/Ⅱ/Ⅲ, default Ⅰ (P8 — ništa nije
// izabrano na startu), pa se do vežbi drugih tierova dolazi klikom na tab.
function selectTier2Exercise(categoryKey: string, name: string) {
  const group = screen.getByTestId(`exercise-group-${categoryKey}`);
  fireEvent.click(within(group).getByRole('button', { name: 'Ⅱ' }));
  fireEvent.click(screen.getByText(name));
}

describe('CustomSetup', () => {
  it('slajderi imaju spec §2.2 granice i korake', () => {
    renderWithIntl(<CustomSetup categories={cats} exercises={all24} onStart={vi.fn()} />);
    const rep = screen.getByLabelText(/Množilac ponavljanja/) as HTMLInputElement;
    expect(rep.min).toBe('0.5');
    expect(rep.max).toBe('2');
    expect(rep.step).toBe('0.25');
    const cards = screen.getByLabelText(/Broj karata/) as HTMLInputElement;
    expect(cards.min).toBe('12');
    expect(cards.max).toBe('52');
    expect(cards.step).toBe('4');
  });

  it('default tab je Ⅰ po grupi — vežbe drugih tierova se biraju kroz tabove', () => {
    renderWithIntl(<CustomSetup categories={cats} exercises={all24} onStart={vi.fn()} />);
    expect(screen.getByText('Sklekovi na kolenima')).toBeInTheDocument();
    expect(screen.queryByText('Standardni sklekovi')).not.toBeInTheDocument();
  });

  it('start šalje selekciju + vrednosti slajdera', () => {
    const onStart = vi.fn();
    renderWithIntl(<CustomSetup categories={cats} exercises={all24} onStart={onStart} />);
    selectTier2Exercise('push', 'Standardni sklekovi');
    selectTier2Exercise('pull', 'Zgibovi (asistirani)');
    selectTier2Exercise('legs', 'Iskoraci');
    selectTier2Exercise('core', 'Standardni trbušnjaci');
    fireEvent.change(screen.getByLabelText(/Množilac ponavljanja/), { target: { value: '1.5' } });
    fireEvent.change(screen.getByLabelText(/Broj karata/), { target: { value: '32' } });
    fireEvent.click(screen.getByText('Kreni'));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({ push: expect.objectContaining({ name: 'Standardni sklekovi' }) }),
      1.5,
      32
    );
  });

  it('intenzitet tag i procena reps-a se menjaju sa slajderima (spec §9 koraci 0.25/4)', () => {
    renderWithIntl(<CustomSetup categories={cats} exercises={all24} onStart={vi.fn()} />);
    // default: mult 1, cards 24 → inten = ((1-.5)/1.5)*.55 + ((24-12)/40)*.45 ≈ .32 → STEADY
    expect(screen.getByText('MIRNO')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Množilac ponavljanja/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Broj karata/), { target: { value: '52' } });
    // mult 2, cards 52 → inten = 1 → ALL IN; procena reps-a = round(52 * 7 * 2)
    expect(screen.getByText('ALL-IN')).toBeInTheDocument();
    expect(screen.getByText(/728/)).toBeInTheDocument();
  });
});
