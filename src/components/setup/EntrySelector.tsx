'use client';

import { useTranslations } from 'next-intl';
import type { EntryPath } from '@/lib/domain/types';

const ENTRIES: { id: EntryPath; titleKey: string; descKey: string }[] = [
  { id: 'quick', titleKey: 'entry.quickTitle', descKey: 'entry.quickDesc' },
  { id: 'custom', titleKey: 'entry.customTitle', descKey: 'entry.customDesc' },
  { id: 'challenge', titleKey: 'entry.challengeTitle', descKey: 'entry.challengeDesc' },
];

export function EntrySelector({ onSelect }: { onSelect: (entry: EntryPath) => void }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('entry.title')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {ENTRIES.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
          >
            <span className="block text-[19px] font-extrabold mb-1">{t(e.titleKey)}</span>
            <span className="block text-sm font-semibold text-muted">{t(e.descKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
