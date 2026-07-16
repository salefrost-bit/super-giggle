'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchDifficultyLevels } from '@/lib/supabase/queries';
import { QUICK_DECK_SIZES } from '@/lib/domain/types';
import type { DeckSize, DifficultyLevel } from '@/lib/domain/types';

const TIER_ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ'] as const;
const LEVEL_KEY_BY_SORT_ORDER: Record<number, string> = { 1: 'level1', 2: 'level2', 3: 'level3' };
const LEN_KEY_BY_SIZE: Record<number, string> = { 12: 'len12', 24: 'len24', 52: 'len52' };

interface QuickDealSetupProps {
  onStart: (level: DifficultyLevel, deckSize: DeckSize) => void;
}

// ODLUKA (P6): predselekcija je High Stakes + Half Deck (najčešći slučaj) —
// prototip predselektuje Low Stakes; odstupamo namerno. CTA je uvek aktivan
// jer defaulti postoje čim se nivoi učitaju.
const DEFAULT_DECK_SIZE: DeckSize = 24;

export function QuickDealSetup({ onStart }: QuickDealSetupProps) {
  const t = useTranslations();
  const [levels, setLevels] = useState<DifficultyLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedDeckSize, setSelectedDeckSize] = useState<DeckSize>(DEFAULT_DECK_SIZE);

  useEffect(() => {
    fetchDifficultyLevels()
      .then((fetched) => {
        setLevels(fetched);
        const highStakes = fetched.find((level) => level.sortOrder === 2) ?? fetched[0] ?? null;
        setSelectedLevelId(highStakes?.id ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="text-muted">{t('setup.levelsLoading')}</p>;
  if (error) return <p className="text-red-500">{t('common.error', { message: error })}</p>;

  const selectedLevel = levels.find((level) => level.id === selectedLevelId) ?? null;
  const sortedLevels = [...levels].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-5">
        <div className="text-[11px] font-extrabold tracking-[0.16em] text-muted mb-2.5">
          {t('quick.stakes')}
        </div>
        <div className="flex flex-col gap-2">
          {sortedLevels.map((level) => {
            const key = LEVEL_KEY_BY_SORT_ORDER[level.sortOrder];
            const isSelected = level.id === selectedLevelId;
            return (
              <button
                key={level.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedLevelId(level.id)}
                className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-[border-color,box-shadow] duration-200"
                style={{
                  background: '#212124',
                  border: `1px solid ${isSelected ? 'rgba(204,255,0,.5)' : '#303036'}`,
                  boxShadow: isSelected ? '0 0 18px rgba(204,255,0,.12)' : 'none',
                }}
              >
                <span
                  className="w-5 text-center font-black text-sm flex-none"
                  style={{ color: isSelected ? 'var(--color-accent)' : '#52525b' }}
                >
                  {TIER_ROMAN[level.sortOrder - 1]}
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className="block font-extrabold text-sm"
                    style={{ color: isSelected ? 'var(--color-foreground)' : 'var(--color-muted)' }}
                  >
                    {key ? t(`quick.${key}.name`) : level.name}
                  </span>
                  <span className="block text-xs font-semibold text-muted mt-0.5">
                    {key ? t(`quick.${key}.desc`) : ''}
                  </span>
                </span>
                <span
                  className="w-[18px] h-[18px] rounded-full flex-none box-border"
                  style={{
                    border: `2px solid ${isSelected ? 'var(--color-accent)' : '#3f3f46'}`,
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mb-6">
        <div className="text-[11px] font-extrabold tracking-[0.16em] text-muted mb-2.5">
          {t('quick.deckSize')}
        </div>
        <div className="flex gap-2">
          {QUICK_DECK_SIZES.map((size) => {
            const key = LEN_KEY_BY_SIZE[size];
            const isSelected = size === selectedDeckSize;
            return (
              <button
                key={size}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedDeckSize(size)}
                className="flex-1 rounded-[14px] px-2 py-3 text-center transition-[border-color,box-shadow] duration-200"
                style={{
                  background: '#212124',
                  border: `1px solid ${isSelected ? 'rgba(204,255,0,.5)' : '#303036'}`,
                  boxShadow: isSelected ? '0 0 18px rgba(204,255,0,.12)' : 'none',
                }}
              >
                <div
                  className="font-black text-xl tabular-nums"
                  style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-foreground)' }}
                >
                  {size}
                </div>
                <div className="text-[9px] font-extrabold tracking-[0.1em] text-[#52525b]">
                  {t('quick.cardsLabel')}
                </div>
                <div
                  className="text-xs font-extrabold mt-1.5"
                  style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)' }}
                >
                  {key ? t(`quick.${key}.name`) : ''}
                </div>
                <div className="text-[10px] font-semibold text-muted">
                  {key ? t(`quick.${key}.min`) : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1" />
      <button
        type="button"
        disabled={!selectedLevel}
        onClick={() => selectedLevel && onStart(selectedLevel, selectedDeckSize)}
        className="w-full bg-accent text-background font-extrabold text-[15px] tracking-[0.12em] py-4 rounded-[16px] disabled:opacity-40"
        style={{ boxShadow: '0 0 30px rgba(204,255,0,.25)' }}
      >
        {t('quick.cta')}
      </button>
    </div>
  );
}
