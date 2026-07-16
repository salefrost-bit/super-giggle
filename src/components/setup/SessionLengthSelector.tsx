'use client';

import { useTranslations } from 'next-intl';
import { QUICK_DECK_SIZES } from '@/lib/domain/types';
import type { DeckSize } from '@/lib/domain/types';

// Isti "The Cut / Half Deck / Full Deck" karton-stil kao QuickDealSetup DECK
// SIZE sekcija (i18n ključevi iz Task 8) — reskin bez promene ponašanja
// (klik odmah bira dužinu, bez posebnog CTA).
const LEN_KEY_BY_SIZE: Record<number, string> = { 12: 'len12', 24: 'len24', 52: 'len52' };

interface SessionLengthSelectorProps {
  onSelect: (size: DeckSize) => void;
}

export function SessionLengthSelector({ onSelect }: SessionLengthSelectorProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseLength')}</h2>
      <div className="flex gap-2.5 items-start">
        {QUICK_DECK_SIZES.map((size) => {
          const key = LEN_KEY_BY_SIZE[size];
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelect(size)}
              className="flex-1 rounded-2xl px-2 py-5 text-center transition-[border-color,box-shadow] duration-200 hover:border-accent/50"
              style={{ background: '#212124', border: '1px solid #303036' }}
            >
              <div className="font-black text-2xl tabular-nums text-foreground">{size}</div>
              <div className="text-[9px] font-extrabold tracking-[0.1em] text-[#52525b] mt-0.5">
                {t('quick.cardsLabel')}
              </div>
              <div className="text-sm font-extrabold text-accent mt-2">
                {key ? t(`quick.${key}.name`) : ''}
              </div>
              <div className="text-[10px] font-semibold text-muted mt-1">
                {key ? t(`quick.${key}.min`) : ''}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
    </div>
  );
}
