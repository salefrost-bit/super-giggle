'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { categoryKeyForName } from '@/lib/supabase/queries';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import type { Category, CategoryKey, Exercise, ExerciseTier } from '@/lib/domain/types';

// Visual suit glyph + color per category — follows SUIT_TO_CATEGORY in types.ts.
const NAME_TO_SUIT: Record<string, string> = {
  Guranje: '♥',
  Povlačenje: '♣',
  Noge: '♠',
  Core: '♦',
};

const SUIT_COLOR_BY_NAME: Record<string, string> = {
  Guranje: 'var(--color-suit-hearts)',
  Povlačenje: 'var(--color-suit-clubs)',
  Noge: 'var(--color-suit-spades)',
  Core: 'var(--color-suit-diamonds)',
};

const GROUP_KEY_BY_NAME: Record<string, string> = {
  Guranje: 'groupPush',
  Povlačenje: 'groupPull',
  Noge: 'groupLegs',
  Core: 'groupCore',
};

const TIERS: ExerciseTier[] = [1, 2, 3];
const TIER_ROMAN: Record<ExerciseTier, string> = { 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ' };
const TIER_COLOR: Record<ExerciseTier, string> = {
  1: '#8fd14f',
  2: 'var(--color-heat-warn)',
  3: 'var(--color-heat-danger)',
};

interface ExercisePickerProps {
  categories: Category[];
  exercises: Exercise[];
  onComplete: (selection: Record<CategoryKey, Exercise>) => void;
  initialTier?: ExerciseTier;
}

export function ExercisePicker({
  categories,
  exercises,
  onComplete,
  initialTier = 1,
}: ExercisePickerProps) {
  const t = useTranslations();
  const { locale } = useLocaleSetting();
  const [selection, setSelection] = useState<Partial<Record<CategoryKey, Exercise>>>({});
  const [activeTier, setActiveTier] = useState<Record<CategoryKey, ExerciseTier>>({
    push: initialTier,
    pull: initialTier,
    legs: initialTier,
    core: initialTier,
  });

  function handleSelect(categoryKey: CategoryKey, exercise: Exercise) {
    const next = { ...selection, [categoryKey]: exercise };
    setSelection(next);
    const keys: CategoryKey[] = ['push', 'pull', 'legs', 'core'];
    if (keys.every((key) => next[key])) {
      onComplete(next as Record<CategoryKey, Exercise>);
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-extrabold mb-5 leading-tight">{t('setup.chooseExercises')}</h2>
      <div className="flex flex-col gap-5 flex-1">
        {sortedCategories.map((category) => {
          const categoryKey = categoryKeyForName(category.name);
          const tier = activeTier[categoryKey];
          const groupKey = GROUP_KEY_BY_NAME[category.name];
          const categoryExercises = exercises.filter(
            (e) => e.categoryId === category.id && e.tier === tier
          );
          const selected = selection[categoryKey];
          return (
            <div key={category.id} data-testid={`exercise-group-${categoryKey}`}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[15px] leading-none"
                  style={{ color: SUIT_COLOR_BY_NAME[category.name] ?? 'var(--color-accent)' }}
                >
                  {NAME_TO_SUIT[category.name] ?? '♠'}
                </span>
                <span className="text-xs font-extrabold tracking-[0.14em] text-muted flex-1">
                  {groupKey ? t(`setup.${groupKey}`) : localizedName(category, locale)}
                </span>
                <div
                  className="flex gap-[5px] rounded-full px-[7px] py-1"
                  style={{ background: '#1d1d20', border: '1px solid #2c2c31' }}
                >
                  {TIERS.map((tg) => {
                    const isActive = tg === tier;
                    const color = TIER_COLOR[tg];
                    return (
                      <button
                        key={tg}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setActiveTier((prev) => ({ ...prev, [categoryKey]: tg }))}
                        className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-200"
                        style={{
                          background: isActive ? color : 'transparent',
                          border: `1px solid ${isActive ? color : '#3a3a40'}`,
                          boxShadow: isActive ? `0 0 9px ${color}` : 'none',
                          color: isActive ? '#18181b' : 'var(--color-muted)',
                        }}
                      >
                        {TIER_ROMAN[tg]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-[7px]">
                {categoryExercises.map((exercise) => {
                  const isSelected = selected?.id === exercise.id;
                  return (
                    <button
                      key={exercise.id}
                      onClick={() => handleSelect(categoryKey, exercise)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-[border-color,box-shadow] duration-200"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(160deg,#2c2c20,#212124)'
                          : '#212124',
                        border: `1px solid ${isSelected ? 'rgba(204,255,0,.55)' : '#2c2c31'}`,
                        boxShadow: isSelected ? '0 0 14px rgba(204,255,0,.18)' : 'none',
                      }}
                    >
                      <span
                        className="flex-1 text-xs font-extrabold leading-snug"
                        style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)' }}
                      >
                        {localizedName(exercise, locale)}
                      </span>
                      <span
                        className="text-[10px] font-black rounded-md px-1.5 py-0.5 flex-none"
                        style={{
                          color: TIER_COLOR[exercise.tier],
                          border: `1px solid ${TIER_COLOR[exercise.tier]}`,
                        }}
                      >
                        {TIER_ROMAN[exercise.tier]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
