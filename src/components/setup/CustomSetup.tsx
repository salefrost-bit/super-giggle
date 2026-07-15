'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { categoryKeyForName } from '@/lib/supabase/queries';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import type { Category, CategoryKey, Exercise } from '@/lib/domain/types';

const NAME_TO_SUIT: Record<string, string> = {
  Guranje: '♥',
  Povlačenje: '♣',
  Noge: '♠',
  Core: '♦',
};

const TIER_ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ'] as const;

interface CustomSetupProps {
  categories: Category[];
  exercises: Exercise[];
  onStart: (
    selection: Record<CategoryKey, Exercise>,
    repMultiplier: number,
    cardCount: number
  ) => void;
}

export function CustomSetup({ categories, exercises, onStart }: CustomSetupProps) {
  const t = useTranslations();
  const { locale } = useLocaleSetting();
  const [selection, setSelection] = useState<Partial<Record<CategoryKey, Exercise>>>({});
  const [repMultiplier, setRepMultiplier] = useState(1);
  const [cardCount, setCardCount] = useState(24);

  const categoryKeys: CategoryKey[] = ['push', 'pull', 'legs', 'core'];
  const isComplete = categoryKeys.every((key) => selection[key]);

  function handleSelect(categoryKey: CategoryKey, exercise: Exercise) {
    setSelection((prev) => ({ ...prev, [categoryKey]: exercise }));
  }

  function handleStart() {
    if (!isComplete) return;
    onStart(selection as Record<CategoryKey, Exercise>, repMultiplier, cardCount);
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-extrabold mb-5 leading-tight">{t('setup.chooseExercises')}</h2>
      <div className="flex flex-col gap-[22px] flex-1">
        {sortedCategories.map((category) => {
          const categoryKey = categoryKeyForName(category.name);
          const categoryExercises = exercises
            .filter((e) => e.categoryId === category.id)
            .sort((a, b) => a.tier - b.tier);
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
                      <span className="flex items-center justify-between gap-2">
                        <span>{localizedName(exercise, locale)}</span>
                        <span className="text-xs font-extrabold text-muted shrink-0">
                          {t('custom.tierBadge', { tier: TIER_ROMAN[exercise.tier - 1] })}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-muted">{t('custom.repMultiplier')}</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.25}
            value={repMultiplier}
            onChange={(e) => setRepMultiplier(Number(e.target.value))}
            aria-label={t('custom.repMultiplier')}
            className="w-full"
          />
          <span className="text-[15px] font-extrabold">{repMultiplier}×</span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-muted">{t('custom.cardCount')}</span>
          <input
            type="range"
            min={12}
            max={52}
            step={4}
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            aria-label={t('custom.cardCount')}
            className="w-full"
          />
          <span className="text-[15px] font-extrabold">
            {cardCount} · {t('custom.cardsPerCategory', { count: cardCount / 4 })}
          </span>
        </label>

        <button
          type="button"
          disabled={!isComplete}
          onClick={handleStart}
          className="w-full bg-accent text-background font-extrabold text-lg py-4 rounded-[18px] disabled:opacity-40"
        >
          {t('custom.start')}
        </button>
      </div>
    </div>
  );
}
