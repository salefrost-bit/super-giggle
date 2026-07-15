'use client';

import { useTranslations } from 'next-intl';

const SPRINT_MINUTES = [3, 5, 10] as const;
export type SprintMinutes = (typeof SPRINT_MINUTES)[number];

interface SprintSetupProps {
  onSelect: (minutes: SprintMinutes) => void;
}

export function SprintSetup({ onSelect }: SprintSetupProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseSprintDuration')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {SPRINT_MINUTES.map((minutes) => (
          <button
            key={minutes}
            aria-label={t('modes.sprint.duration', { minutes })}
            onClick={() => onSelect(minutes)}
            className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
          >
            <span className="block text-[19px] font-extrabold mb-1">
              {t('modes.sprint.duration', { minutes })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
