'use client';

import { useTranslations } from 'next-intl';

import { LiveDot } from '@/components/ui/LiveDot';

interface StopwatchDisplayProps {
  elapsedSeconds: number;
  paused: boolean;
}

// s4/s12: total-time chip — LiveDot (frozen on pause via `paused`) + mm:ss +
// TOTAL label. The stopwatch never competes visually with the big per-card
// quota counter; it just quietly ticks in the header.
export function StopwatchDisplay({ elapsedSeconds, paused }: StopwatchDisplayProps) {
  const t = useTranslations();
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-2 bg-[#232327] border border-[#3a3a40] rounded-full px-3.5 py-2">
      <LiveDot paused={paused} />
      <span className="font-extrabold text-sm tabular-nums text-[#d4d4d8]">{formatted}</span>
      <span className="font-extrabold text-[10px] tracking-[0.16em] text-muted">{t('workout.total')}</span>
    </div>
  );
}
