import { createClient } from './client';
import type { Category, DifficultyLevel, Exercise, CategoryKey } from '../domain/types';
import { CATEGORY_KEY_TO_NAME } from '../domain/types';

export async function fetchCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, name_en, sort_order')
    .order('sort_order');
  if (error) throw error;
  return (
    data as Array<{ id: string; name: string; name_en: string | null; sort_order: number }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    sortOrder: row.sort_order,
  }));
}

export async function fetchDifficultyLevels(): Promise<DifficultyLevel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('difficulty_levels')
    .select('id, name, name_en, default_rep_multiplier, par_seconds_per_rep, par_transition_seconds, sort_order')
    .order('sort_order');
  if (error) throw error;
  return (
    data as Array<{
      id: string;
      name: string;
      name_en: string | null;
      default_rep_multiplier: number;
      par_seconds_per_rep: number;
      par_transition_seconds: number;
      sort_order: number;
    }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    defaultRepMultiplier: row.default_rep_multiplier,
    parSecondsPerRep: row.par_seconds_per_rep,
    parTransitionSeconds: row.par_transition_seconds,
    sortOrder: row.sort_order,
  }));
}

export async function fetchExercisesByDifficulty(difficultyLevelId: string): Promise<Exercise[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, name_en, category_id, difficulty_level_id')
    .eq('difficulty_level_id', difficultyLevelId);
  if (error) throw error;
  return (
    data as Array<{
      id: string;
      name: string;
      name_en: string | null;
      category_id: string;
      difficulty_level_id: string;
    }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    categoryId: row.category_id,
    difficultyLevelId: row.difficulty_level_id,
  }));
}

export function buildCategoryIdByKey(categories: Category[]): Record<CategoryKey, string> {
  const byName = new Map(categories.map((c) => [c.name, c.id]));
  const result = {} as Record<CategoryKey, string>;
  (Object.keys(CATEGORY_KEY_TO_NAME) as CategoryKey[]).forEach((key) => {
    const name = CATEGORY_KEY_TO_NAME[key];
    const id = byName.get(name);
    if (!id) {
      throw new Error(
        `Category "${name}" not found in database — check seed data matches CATEGORY_KEY_TO_NAME`
      );
    }
    result[key] = id;
  });
  return result;
}

export function categoryKeyForName(name: string): CategoryKey {
  const entry = (Object.entries(CATEGORY_KEY_TO_NAME) as [CategoryKey, string][]).find(
    ([, categoryName]) => categoryName === name
  );
  if (!entry) throw new Error(`Unknown category name "${name}" — check CATEGORY_KEY_TO_NAME`);
  return entry[0];
}
