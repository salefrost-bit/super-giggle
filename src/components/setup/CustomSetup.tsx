'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { categoryKeyForName } from '@/lib/supabase/queries';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import type { Category, CategoryKey, Exercise, ExerciseTier } from '@/lib/domain/types';

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

interface CustomSetupProps {
  categories: Category[];
  exercises: Exercise[];
  onStart: (
    selection: Record<CategoryKey, Exercise>,
    repMultiplier: number,
    cardCount: number
  ) => void;
}

// Prototip (shuffle-prototype.html linija ~1054): inten = f(mult, cards) u [0,1],
// pragovi boje/tag-a i pips broj su izvedeni iz iste vrednosti.
function computeIntensity(mult: number, cards: number) {
  const raw = ((mult - 0.5) / 1.5) * 0.55 + ((cards - 12) / 40) * 0.45;
  const inten = Math.max(0, Math.min(1, raw));
  const color =
    inten > 0.8 ? 'var(--color-heat-danger)' : inten > 0.55 ? 'var(--color-heat-warn)' : 'var(--color-accent)';
  const labelKey = inten > 0.8 ? 'allIn' : inten > 0.55 ? 'raise' : inten > 0.3 ? 'steady' : 'warmUp';
  const pipsOn = Math.max(1, Math.round(inten * 5));
  return { inten, color, labelKey, pipsOn };
}

export function CustomSetup({ categories, exercises, onStart }: CustomSetupProps) {
  const t = useTranslations();
  const { locale } = useLocaleSetting();
  const [selection, setSelection] = useState<Partial<Record<CategoryKey, Exercise>>>({});
  const [activeTier, setActiveTier] = useState<Record<CategoryKey, ExerciseTier>>({
    push: 1,
    pull: 1,
    legs: 1,
    core: 1,
  });
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
  const { inten, color: intenColor, labelKey, pipsOn } = computeIntensity(repMultiplier, cardCount);
  // Procena na osnovu domain fakta: prosečan rang karte u balansiranom izvlačenju
  // je (1+13)/2 = 7 (v. drawSessionCards) — realnija osnova od prototipa (koji
  // koristi proizvoljnu demo-konstantu ×8), izvedena iz istog calculateReps koraka.
  const estimatedReps = Math.round(cardCount * 7 * repMultiplier);
  const multPct = ((repMultiplier - 0.5) / 1.5) * 100;
  const cardsPct = ((cardCount - 12) / 40) * 100;

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

      <div
        className="relative mt-6 rounded-[24px] p-5 overflow-hidden"
        style={{ background: '#18181b', border: '1px solid #2c2c31' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '-70px',
            width: '260px',
            height: '200px',
            transform: `translateX(-50%) scale(${(0.85 + inten * 0.5).toFixed(2)})`,
            background: `radial-gradient(ellipse at center, ${intenColor}, transparent 65%)`,
            opacity: inten * 0.35,
            transition: 'opacity .4s, transform .4s, background .4s',
          }}
        />
        <div className="relative flex items-center justify-between">
          <span className="text-xs font-extrabold tracking-[0.16em] text-muted">
            {t('custom.yourDeck')}
          </span>
          <span
            className="text-xs font-black tracking-[0.12em] rounded-full px-3.5 py-1.5 transition-all duration-300"
            style={{ color: intenColor, border: `1px solid ${intenColor}` }}
          >
            {t(`custom.${labelKey}`)}
          </span>
        </div>

        <div className="relative mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted">{t('custom.repMultiplier')}</span>
            <span className="text-[15px] font-black text-accent tabular-nums">{repMultiplier}×</span>
          </div>
          <div className="relative h-5">
            <div
              className="absolute left-0 right-0 top-[7px] h-1.5 rounded-full"
              style={{ background: '#33333a' }}
            />
            <div
              className="absolute left-0 top-[7px] h-1.5 rounded-full"
              style={{ background: `linear-gradient(90deg,#8fb300,${intenColor})`, width: `${multPct}%` }}
            />
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.25}
              value={repMultiplier}
              onChange={(e) => setRepMultiplier(Number(e.target.value))}
              aria-label={t('custom.repMultiplier')}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-0 w-5 h-5 rounded-full pointer-events-none"
              style={{ left: `calc(${multPct}% - 10px)`, background: intenColor }}
            />
          </div>
        </div>

        <div className="relative mt-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted">{t('custom.cardCount')}</span>
            <span className="text-[15px] font-black text-accent tabular-nums">{cardCount}</span>
          </div>
          <div className="relative h-5">
            <div
              className="absolute left-0 right-0 top-[7px] h-1.5 rounded-full"
              style={{ background: '#33333a' }}
            />
            <div
              className="absolute left-0 top-[7px] h-1.5 rounded-full"
              style={{ background: `linear-gradient(90deg,#8fb300,${intenColor})`, width: `${cardsPct}%` }}
            />
            <input
              type="range"
              min={12}
              max={52}
              step={4}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              aria-label={t('custom.cardCount')}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-0 w-5 h-5 rounded-full pointer-events-none"
              style={{ left: `calc(${cardsPct}% - 10px)`, background: intenColor }}
            />
          </div>
          <span className="text-xs font-semibold text-muted">
            {t('custom.cardsPerCategory', { count: cardCount / 4 })}
          </span>
        </div>

        <div className="relative flex items-center justify-between mt-5">
          <div className="flex gap-[5px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-4 h-1.5 rounded-full inline-block transition-colors duration-300"
                style={{ background: i < pipsOn ? intenColor : '#2c2c31' }}
              />
            ))}
          </div>
          <div className="text-[13px] font-extrabold text-muted">
            {t('custom.repsInStack', { count: estimatedReps })}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={!isComplete}
        onClick={handleStart}
        className="w-full mt-5 bg-accent text-background font-extrabold text-lg py-4 rounded-[18px] disabled:opacity-40"
      >
        {t('custom.start')}
      </button>
    </div>
  );
}
