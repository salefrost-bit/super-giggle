'use client';

import { useTranslations } from 'next-intl';
import { MODES } from '@/lib/modes/registry';
import type { GameMode } from '@/lib/domain/types';

interface ModeSelectorProps {
  onSelect: (mode: GameMode) => void;
  beatChipLabel?: string | null;
}

export function ModeSelector({ onSelect, beatChipLabel }: ModeSelectorProps) {
  const t = useTranslations();
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseMode')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={`text-left rounded-[18px] p-5 border-2 ${
              mode.isChallenge
                ? 'bg-accent/10 border-accent'
                : 'bg-surface border-white/5 hover:border-accent/50'
            }`}
          >
            <span className={`block text-[19px] font-extrabold mb-1 ${mode.isChallenge ? 'text-accent' : ''}`}>
              {t(mode.titleKey)}
            </span>
            <span className="block text-sm font-semibold text-muted">{t(mode.descKey)}</span>
            {mode.isChallenge && beatChipLabel && (
              <span className="inline-block mt-2 bg-background text-accent text-xs font-extrabold px-2.5 py-1.5 rounded-lg">
                {beatChipLabel}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
