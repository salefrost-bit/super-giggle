'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchDifficultyLevels } from '@/lib/supabase/queries';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import type { DifficultyLevel } from '@/lib/domain/types';

const DESC_KEY_BY_NAME: Record<string, string> = {
  Početnik: 'diffDescBeginner',
  Srednji: 'diffDescIntermediate',
  Napredni: 'diffDescAdvanced',
};

interface DifficultySelectorProps {
  onSelect: (level: DifficultyLevel) => void;
}

export function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  const t = useTranslations();
  const { locale } = useLocaleSetting();
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
          const descKey = DESC_KEY_BY_NAME[level.name];
          return (
            <button
              key={level.id}
              aria-label={level.name}
              onClick={() => onSelect(level)}
              className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
            >
              <span className="block text-[19px] font-extrabold mb-1">
                {localizedName(level, locale)}
              </span>
              <span className="block text-sm font-semibold text-muted">
                {descKey ? t(`setup.${descKey}`) : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
