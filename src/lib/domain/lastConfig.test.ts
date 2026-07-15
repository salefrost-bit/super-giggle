import { describe, it, expect, beforeEach } from 'vitest';
import { saveLastConfig, loadLastConfig, validateLastConfig } from './lastConfig';
import type { LastConfig } from './lastConfig';
import type { Exercise } from './types';

const STORAGE_KEY = 'spil.lastConfig';

const sampleConfig: LastConfig = {
  entry: 'quick',
  gameMode: 'classic',
  difficultyLevelId: 'diff-1',
  repMultiplier: 1,
  deckSize: 24,
  exerciseIds: {
    push: 'ex-push',
    pull: 'ex-pull',
    legs: 'ex-legs',
    core: 'ex-core',
  },
};

const allExercises: Exercise[] = [
  {
    id: 'ex-push',
    name: 'Push',
    categoryId: 'cat-push',
    difficultyLevelId: 'diff-1',
    tier: 1,
    isDefault: true,
  },
  {
    id: 'ex-pull',
    name: 'Pull',
    categoryId: 'cat-pull',
    difficultyLevelId: 'diff-1',
    tier: 1,
    isDefault: true,
  },
  {
    id: 'ex-legs',
    name: 'Legs',
    categoryId: 'cat-legs',
    difficultyLevelId: 'diff-1',
    tier: 1,
    isDefault: true,
  },
  {
    id: 'ex-core',
    name: 'Core',
    categoryId: 'cat-core',
    difficultyLevelId: 'diff-1',
    tier: 1,
    isDefault: true,
  },
];

describe('lastConfig', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('save/load roundtrip', () => {
    saveLastConfig(sampleConfig);
    expect(loadLastConfig()).toEqual(sampleConfig);
  });

  it('load vraća null za pokvaren JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    expect(loadLastConfig()).toBeNull();
  });

  it('validate odbija deckSize 13 (stari zapis)', () => {
    expect(validateLastConfig({ ...sampleConfig, deckSize: 13 }, allExercises)).toBe(false);
  });

  it('validate odbija nepostojeću vežbu', () => {
    expect(
      validateLastConfig(
        { ...sampleConfig, exerciseIds: { ...sampleConfig.exerciseIds, push: 'missing' } },
        allExercises
      )
    ).toBe(false);
  });

  it('validate prihvata validan config', () => {
    expect(validateLastConfig(sampleConfig, allExercises)).toBe(true);
  });
});
