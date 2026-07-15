'use client';

import { useTranslations } from 'next-intl';

interface JokerRestScreenProps {
  remainingSeconds: number;
}

export function JokerRestScreen({ remainingSeconds }: JokerRestScreenProps) {
  const t = useTranslations();
  return (
    <div className="bg-surface/55 backdrop-blur-xl rounded-3xl border-2 border-accent/35 shadow-[0_0_40px_rgba(204,255,0,0.08)] p-7 min-h-[360px] flex flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl">🃏</p>
      <p className="text-[15px] font-bold text-muted tracking-widest uppercase">
        {t('jokers.restLabel')}
      </p>
      <p className="text-2xl font-black tabular-nums text-accent">
        {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
      </p>
      <p className="text-sm font-semibold text-muted">{t('jokers.restCaption')}</p>
    </div>
  );
}
