'use client';

import { useTranslations } from 'next-intl';
import { JOKER_REST_SECONDS } from '@/lib/domain/jokers';

interface JokerRestScreenProps {
  remainingSeconds: number;
}

// s3: BREATHE IN/OUT + concentric rings — both derived from the existing
// joker countdown (timestamp-sourced remainingSeconds). 8s cycle:
//   phase = Math.floor((30 − remaining) / 4) % 2  → 0 = in, 1 = out
export function JokerRestScreen({ remainingSeconds }: JokerRestScreenProps) {
  const t = useTranslations();
  const elapsed = Math.max(0, JOKER_REST_SECONDS - remainingSeconds);
  const phase = Math.floor(elapsed / 4) % 2;
  const cyclePos = (elapsed % 8) / 8;
  const breath = 0.5 - 0.5 * Math.cos(cyclePos * 2 * Math.PI);
  const br1 = 1 + breath * 0.08;
  const br2 = 1 + breath * 0.15;
  const br3 = 1 + breath * 0.23;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      data-testid="joker-breather"
      data-phase={phase === 0 ? 'in' : 'out'}
      className="flex flex-1 flex-col items-center justify-center gap-3.5 rounded-[28px] border px-[22px] py-[30px]"
      style={{
        background:
          'radial-gradient(circle at 50% 26%, rgba(122,104,255,.22), transparent 62%), #16161d',
        borderColor: '#34343f',
      }}
    >
      <p className="text-xs font-extrabold tracking-[0.16em]" style={{ color: 'var(--color-joker)' }}>
        {t('joker.breatherLabel')}
      </p>

      <div className="relative flex h-[240px] w-[240px] items-center justify-center">
        <div
          data-testid="breath-ring"
          className="absolute inset-0 rounded-full border transition-transform duration-[140ms] ease-linear"
          style={{ borderColor: 'rgba(150,160,255,.10)', transform: `scale(${br3})` }}
        />
        <div
          data-testid="breath-ring"
          className="absolute inset-[22px] rounded-full border transition-transform duration-[140ms] ease-linear"
          style={{ borderColor: 'rgba(150,160,255,.18)', transform: `scale(${br2})` }}
        />
        <div
          data-testid="breath-ring"
          className="absolute inset-11 rounded-full border transition-transform duration-[140ms] ease-linear"
          style={{ borderColor: 'rgba(150,160,255,.28)', transform: `scale(${br1})` }}
        />
        <div
          className="flex h-[118px] w-[118px] items-center justify-center rounded-full transition-transform duration-[140ms] ease-linear"
          style={{
            background: 'radial-gradient(circle at 50% 38%, rgba(140,120,255,.45), rgba(80,90,200,.15) 70%)',
            boxShadow: '0 0 50px rgba(122,104,255,.35)',
            transform: `scale(${br1})`,
          }}
        >
          <span className="inline-block text-[54px] motion-safe:animate-[swayK_6s_ease-in-out_infinite]">
            🃏
          </span>
        </div>
      </div>

      <div className="relative h-[22px] w-full text-center">
        <span
          className="absolute inset-x-0 text-[15px] font-extrabold tracking-[0.34em] transition-opacity duration-700"
          style={{ color: '#cfd6ff', opacity: phase === 0 ? 1 : 0 }}
        >
          {t('joker.breatheIn')}
        </span>
        <span
          className="absolute inset-x-0 text-[15px] font-extrabold tracking-[0.34em] transition-opacity duration-700"
          style={{ color: '#8f9bd8', opacity: phase === 1 ? 1 : 0 }}
        >
          {t('joker.breatheOut')}
        </span>
      </div>

      <p className="text-[58px] font-black leading-none tabular-nums" style={{ color: '#e6e9ff' }}>
        {formatted}
      </p>
      <p className="text-[13px] font-bold text-muted">{t('joker.nextCardAuto')}</p>
    </div>
  );
}
