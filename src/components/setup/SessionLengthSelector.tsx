'use client';

import { useTranslations } from 'next-intl';
import type { DeckSize } from '@/lib/domain/types';

interface SessionLengthSelectorProps {
  onSelect: (size: DeckSize) => void;
}

export function SessionLengthSelector({ onSelect }: SessionLengthSelectorProps) {
  const t = useTranslations();

  const OPTIONS: { size: DeckSize; ariaKey: string; labelKey: string; subKey: string }[] = [
    { size: 12, ariaKey: 'setup.quarterAria', labelKey: 'setup.quarterLabel', subKey: 'setup.quarterSub' },
    { size: 24, ariaKey: 'setup.halfAria', labelKey: 'setup.halfLabel', subKey: 'setup.halfSub' },
    { size: 52, ariaKey: 'setup.fullAria', labelKey: 'setup.fullLabel', subKey: 'setup.fullSub' },
  ];

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseLength')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {OPTIONS.map((option) => (
          <button
            key={option.size}
            aria-label={t(option.ariaKey)}
            onClick={() => onSelect(option.size)}
            className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
          >
            <span className="block text-[19px] font-extrabold mb-1">{t(option.labelKey)}</span>
            <span className="block text-sm font-semibold text-muted">{t(option.subKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
