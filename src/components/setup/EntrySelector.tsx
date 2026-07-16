'use client';

import { useTranslations } from 'next-intl';
import type { EntryPath } from '@/lib/domain/types';

interface EntryConfig {
  id: EntryPath;
  titleKey: string;
  descKey: string;
  color: string;
  tileBg: string;
  tileBorder: string;
  border: string;
  hoverClass: string;
}

const ENTRIES: EntryConfig[] = [
  {
    id: 'quick',
    titleKey: 'entry.quickTitle',
    descKey: 'entry.quickDesc',
    color: '#ccff00',
    tileBg: 'rgba(204,255,0,.2)',
    tileBorder: 'rgba(204,255,0,.35)',
    border: 'rgba(204,255,0,.35)',
    hoverClass: 'hover:border-[#ccff00] hover:shadow-[0_0_24px_rgba(204,255,0,0.15)]',
  },
  {
    id: 'custom',
    titleKey: 'entry.customTitle',
    descKey: 'entry.customDesc',
    color: '#b9a8ff',
    tileBg: 'rgba(185,168,255,.2)',
    tileBorder: 'rgba(185,168,255,.35)',
    border: '#303036',
    hoverClass: 'hover:border-[rgba(185,168,255,0.6)] hover:shadow-[0_0_24px_rgba(185,168,255,0.12)]',
  },
  {
    id: 'challenge',
    titleKey: 'entry.challengeTitle',
    descKey: 'entry.challengeDesc',
    color: '#ffb340',
    tileBg: 'rgba(255,179,64,.2)',
    tileBorder: 'rgba(255,179,64,.35)',
    border: '#303036',
    hoverClass: 'hover:border-[rgba(255,179,64,0.6)] hover:shadow-[0_0_24px_rgba(255,179,64,0.12)]',
  },
];

function splitIcon(title: string): { icon: string; label: string } {
  const [icon, ...rest] = title.split(' ');
  return { icon, label: rest.join(' ') };
}

export function EntrySelector({ onSelect }: { onSelect: (entry: EntryPath) => void }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[26px] font-black mb-6 leading-tight">{t('entry.title')}</h2>
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {ENTRIES.map((e) => {
          const { icon, label } = splitIcon(t(e.titleKey));
          return (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className={`text-left flex items-center gap-4 rounded-[20px] p-[18px] transition-[border-color,box-shadow] duration-200 ${e.hoverClass}`}
              style={{
                background: 'linear-gradient(160deg,#26262b,#1e1e21)',
                border: `1px solid ${e.border}`,
              }}
            >
              <span
                className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center text-[22px] flex-none"
                style={{
                  background: `radial-gradient(circle at 50% 34%, ${e.tileBg}, rgba(0,0,0,.15) 78%), #1d1d20`,
                  border: `1px solid ${e.tileBorder}`,
                }}
              >
                {icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-extrabold text-foreground">{label}</span>
                <span className="block text-xs font-semibold text-muted mt-0.5 leading-snug">
                  {t(e.descKey)}
                </span>
              </span>
              <span className="font-extrabold text-base flex-none" style={{ color: e.color }}>
                →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
