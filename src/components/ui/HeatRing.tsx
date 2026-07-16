import type { ReactNode } from 'react';

// Heat semantika (spec §5): relativna (quota.fraction) i apsolutna (On the
// Clock banka, spec S11) skala. Čiste funkcije — bez sopstvenog stanja,
// grejanje se izvodi iz postojećih timestamp izvora na mestu poziva.
export type Heat = 'ok' | 'warn' | 'danger';

export function heatFor(fraction: number): Heat {
  if (fraction > 0.5) return 'ok';
  if (fraction > 0.25) return 'warn';
  return 'danger';
}

export function heatForAbsolute(seconds: number): Heat {
  if (seconds >= 15) return 'ok';
  if (seconds >= 8) return 'warn';
  return 'danger';
}

export const HEAT_COLOR: Record<Heat, string> = {
  ok: 'var(--color-accent)',
  warn: 'var(--color-heat-warn)',
  danger: 'var(--color-heat-danger)',
};

interface HeatRingProps {
  fraction: number;
  children: ReactNode;
}

// Conic prsten oko sadržaja (s12: karta u live sesiji) — boja/glow po
// heatFor(fraction), popunjenost prstena = fraction.
export function HeatRing({ fraction, children }: HeatRingProps) {
  const heat = heatFor(fraction);
  const color = HEAT_COLOR[heat];
  const deg = Math.max(0, Math.min(1, fraction)) * 360;

  return (
    <div
      data-heat={heat}
      className="flex-1 flex flex-col rounded-[31px] p-[3px] transition-[box-shadow] duration-300"
      style={{
        background: `conic-gradient(${color} ${deg}deg, var(--color-surface) 0deg)`,
        boxShadow: `0 0 34px ${color}40`,
      }}
    >
      {children}
    </div>
  );
}
