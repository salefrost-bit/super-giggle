import { describe, it, expect, vi } from 'vitest';
import {
  fetchCategories,
  fetchDifficultyLevels,
  fetchExercisesByDifficulty,
  fetchAllExercises,
  buildCategoryIdByKey,
  categoryKeyForName,
} from './queries';
import type { Category } from '../domain/types';

vi.mock('./client', () => ({ createClient: vi.fn() }));
import { createClient } from './client';

function mockSupabaseChain(resolvedValue: { data: unknown; error: null }) {
  const order = vi.fn().mockResolvedValue(resolvedValue);
  const eq = vi.fn().mockResolvedValue(resolvedValue);
  const select = vi.fn(() => ({ order, eq }));
  const from = vi.fn(() => ({ select }));
  return { from };
}

describe('fetchCategories', () => {
  it('maps snake_case rows to domain Category objects', async () => {
    const chain = mockSupabaseChain({
      data: [{ id: '1', name: 'Guranje', name_en: 'Push', sort_order: 1 }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as never);

    const result = await fetchCategories();

    expect(result).toEqual([{ id: '1', name: 'Guranje', nameEn: 'Push', sortOrder: 1 }]);
  });
});

describe('fetchDifficultyLevels', () => {
  it('maps snake_case rows to domain DifficultyLevel objects', async () => {
    const chain = mockSupabaseChain({
      data: [
        {
          id: '1',
          name: 'Početnik',
          name_en: 'Beginner',
          default_rep_multiplier: 0.75,
          par_seconds_per_rep: 3,
          par_transition_seconds: 20,
          sort_order: 1,
        },
      ],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as never);

    const result = await fetchDifficultyLevels();

    expect(result).toEqual([
      {
        id: '1',
        name: 'Početnik',
        nameEn: 'Beginner',
        defaultRepMultiplier: 0.75,
        parSecondsPerRep: 3,
        parTransitionSeconds: 20,
        sortOrder: 1,
      },
    ]);
  });
});

describe('fetchExercisesByDifficulty', () => {
  it('maps snake_case rows to domain Exercise objects', async () => {
    const chain = mockSupabaseChain({
      data: [{
        id: '1',
        name: 'Čučnjevi',
        name_en: 'Squats',
        category_id: 'c1',
        difficulty_level_id: 'd1',
        tier: 1,
        is_default: true,
      }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as never);

    const result = await fetchExercisesByDifficulty('d1');

    expect(result).toEqual([
      {
        id: '1',
        name: 'Čučnjevi',
        nameEn: 'Squats',
        categoryId: 'c1',
        difficultyLevelId: 'd1',
        tier: 1,
        isDefault: true,
      },
    ]);
  });
});

describe('fetchAllExercises', () => {
  it('maps all exercises with tier and isDefault', async () => {
    const chain = mockSupabaseChain({
      data: [{
        id: '2',
        name: 'Sklekovi',
        name_en: 'Push-ups',
        category_id: 'c1',
        difficulty_level_id: 'd1',
        tier: 2,
        is_default: false,
      }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as never);

    const result = await fetchAllExercises();

    expect(result).toEqual([
      {
        id: '2',
        name: 'Sklekovi',
        nameEn: 'Push-ups',
        categoryId: 'c1',
        difficultyLevelId: 'd1',
        tier: 2,
        isDefault: false,
      },
    ]);
  });
});

describe('buildCategoryIdByKey', () => {
  it('maps each CategoryKey to its database id by matching name', () => {
    const categories: Category[] = [
      { id: 'p1', name: 'Guranje', sortOrder: 1 },
      { id: 'p2', name: 'Povlačenje', sortOrder: 2 },
      { id: 'p3', name: 'Noge', sortOrder: 3 },
      { id: 'p4', name: 'Core', sortOrder: 4 },
    ];
    expect(buildCategoryIdByKey(categories)).toEqual({
      push: 'p1',
      pull: 'p2',
      legs: 'p3',
      core: 'p4',
    });
  });

  it('throws if a required category name is missing', () => {
    expect(() => buildCategoryIdByKey([])).toThrow(/Guranje/);
  });
});

describe('categoryKeyForName', () => {
  it('returns the CategoryKey matching a known database category name', () => {
    expect(categoryKeyForName('Guranje')).toBe('push');
    expect(categoryKeyForName('Povlačenje')).toBe('pull');
    expect(categoryKeyForName('Noge')).toBe('legs');
    expect(categoryKeyForName('Core')).toBe('core');
  });

  it('throws for an unknown category name', () => {
    expect(() => categoryKeyForName('Nepoznato')).toThrow(/Nepoznato/);
  });
});
