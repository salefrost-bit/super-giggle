'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { categoryKeyForName } from '@/lib/supabase/queries';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import type { Category, CategoryKey, Exercise } from '@/lib/domain/types';

// Visual suit chip per category — follows SUIT_TO_CATEGORY in types.ts, NOT the prototype's pairing.
const NAME_TO_SUIT: Record<string, string> = {
  Guranje: '♥',
  Povlačenje: '♣',
  Noge: '♠',
  Core: '♦',
};

interface ExercisePickerProps {
  categories: Category[];
  exercises: Exercise[];
  onComplete: (selection: Record<CategoryKey, Exercise>) => void;
}

export function ExercisePicker({ categories, exercises, onComplete }: ExercisePickerProps) {
  const t = useTranslations();
  const { locale } = useLocaleSetting();
  const [selection, setSelection] = useState<Partial<Record<CategoryKey, Exercise>>>({});

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
      <div className="flex flex-col gap-[22px] flex-1">
        {sortedCategories.map((category) => {
          const categoryKey = categoryKeyForName(category.name);
          const categoryExercises = exercises.filter((e) => e.categoryId === category.id);
          const selected = selection[categoryKey];
          return (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-[26px] h-[26px] rounded-lg bg-surface flex items-center justify-center text-sm text-accent font-extrabold">
                  {NAME_TO_SUIT[category.name] ?? '♠'}
                </span>
                <span className="text-[15px] font-extrabold">{localizedName(category, locale)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {categoryExercises.map((exercise) => {
                  const isSelected = selected?.id === exercise.id;
                  return (
                    <button
                      key={exercise.id}
                      onClick={() => handleSelect(categoryKey, exercise)}
                      className={`text-left rounded-[14px] px-4 py-3.5 text-[15px] font-bold border-2 ${
                        isSelected
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface border-white/5 text-foreground'
                      }`}
                    >
                      {localizedName(exercise, locale)}
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
