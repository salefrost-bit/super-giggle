'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MODES, type ModeDefinition } from '@/lib/modes/registry';
import { InfoModal } from '@/components/ui/InfoModal';
import type { GameMode } from '@/lib/domain/types';

interface ModeSelectorProps {
  onSelect: (mode: GameMode) => void;
  beatChipLabel?: string | null;
}

export function ModeSelector({ onSelect, beatChipLabel }: ModeSelectorProps) {
  const t = useTranslations();
  const [infoMode, setInfoMode] = useState<ModeDefinition | null>(null);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseMode')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {MODES.map((mode) => (
          <div key={mode.id} className="relative">
            <button
              onClick={() => onSelect(mode.id)}
              className={`w-full text-left rounded-[18px] p-5 border-2 ${
                mode.isChallenge
                  ? 'bg-accent/10 border-accent'
                  : 'bg-surface border-white/5 hover:border-accent/50'
              }`}
            >
              <span className={`block text-[19px] font-extrabold mb-1 ${mode.isChallenge ? 'text-accent' : ''}`}>
                {t(mode.titleKey)}
              </span>
              <span className="block text-sm font-semibold text-muted pr-8">{t(mode.descKey)}</span>
              {mode.isChallenge && beatChipLabel && (
                <span className="inline-block mt-2 bg-background text-accent text-xs font-extrabold px-2.5 py-1.5 rounded-lg">
                  {beatChipLabel}
                </span>
              )}
            </button>
            <button
              onClick={() => setInfoMode(mode)}
              aria-label={t('modes.infoAria')}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/60 text-muted font-extrabold text-sm"
            >
              ⓘ
            </button>
          </div>
        ))}
      </div>
      {infoMode && (
        <InfoModal
          title={t(infoMode.titleKey)}
          closeLabel={t('common.close')}
          onClose={() => setInfoMode(null)}
        >
          {t(infoMode.explanationKey)}
        </InfoModal>
      )}
    </div>
  );
}
