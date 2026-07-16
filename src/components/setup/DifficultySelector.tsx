'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchDifficultyLevels } from '@/lib/supabase/queries';
import type { DifficultyLevel } from '@/lib/domain/types';

// S2: imena/opisi nivoa dolaze ISKLJUČIVO iz i18n ključeva mapiranih po sort_order,
// ne iz DB imena (koja ostaju stabilna samo kao interni identifikator/aria-label).
const LEVEL_KEY_BY_SORT_ORDER: Record<number, string> = {
  1: 'level1',
  2: 'level2',
  3: 'level3',
};

interface DifficultySelectorProps {
  onSelect: (level: DifficultyLevel) => void;
}

export function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  const t = useTranslations();
  const [levels, setLevels] = useState<DifficultyLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDifficultyLevels()
      .then(setLevels)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="text-muted">{t('setup.levelsLoading')}</p>;
  if (error) return <p className="text-red-500">{t('common.error', { message: error })}</p>;

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseLevel')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {levels.map((level) => {
          const key = LEVEL_KEY_BY_SORT_ORDER[level.sortOrder];
          return (
            <button
              key={level.id}
              aria-label={level.name}
              onClick={() => onSelect(level)}
              className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
            >
              <span className="block text-[19px] font-extrabold mb-1">
                {key ? t(`quick.${key}.name`) : level.name}
              </span>
              <span className="block text-sm font-semibold text-muted">
                {key ? t(`quick.${key}.desc`) : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
