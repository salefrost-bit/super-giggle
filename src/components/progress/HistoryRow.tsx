'use client';

import { useTranslations } from 'next-intl';
import type { SessionHistoryEntry, SessionDetails } from '@/lib/supabase/sessions';

const TIER_ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ'] as const;

interface HistoryRowProps {
  session: SessionHistoryEntry;
  details: SessionDetails | null;
  onExpand: (sessionId: string) => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatMultiplier(multiplier: number): string {
  return Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(2);
}

function modeIcon(session: SessionHistoryEntry): string {
  switch (session.gameMode) {
    case 'perfect_deck':
      return '⚡';
    case 'classic':
      return '🃏';
    case 'sprint':
      return '🏃';
    case 'court':
      return '🏀';
    case 'survive':
      return '💀';
    case 'daily':
      return '📅';
    default:
      return '🃏';
  }
}

export function HistoryRow({ session, details, onExpand }: HistoryRowProps) {
  const t = useTranslations();
  const dateLabel = new Date(session.startedAt).toLocaleDateString();
  const isChallenge = session.gameMode === 'perfect_deck';

  return (
    <div className="bg-surface rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => onExpand(session.id)}
        className="w-full px-3.5 py-3 flex justify-between items-center text-sm font-bold text-left"
      >
        <span>{dateLabel}</span>
        <span className={isChallenge ? 'text-accent' : 'text-muted'}>{modeIcon(session)}</span>
        <span className="text-accent font-black tabular-nums">
          {session.points != null ? session.points : '—'}
        </span>
      </button>

      {details && (
        <div className="px-3.5 pb-3 pt-0 border-t border-white/5 text-xs font-semibold text-muted space-y-2">
          <p className="font-extrabold text-foreground text-[11px] uppercase tracking-wide mt-2">
            {t('history.exercises')}
          </p>
          <ul className="space-y-1">
            {details.exercises.map((ex) => (
              <li key={`${ex.categoryName}-${ex.name}`} className="flex justify-between gap-2">
                <span>
                  {ex.name} · {ex.categoryName}
                </span>
                <span className="text-muted shrink-0">
                  {TIER_ROMAN[Math.min(Math.max(ex.tier, 1), 3) - 1]}
                </span>
              </li>
            ))}
          </ul>
          <p>{t('history.totalReps', { count: details.totalReps })}</p>
          <p>{t('progress.durationLine', { duration: formatDuration(session.totalDurationSeconds) })}</p>
          {session.pauseCount != null && session.pauseCount > 0 && session.totalPauseSeconds != null && (
            <p>
              {t('pause.summary', {
                count: session.pauseCount,
                duration: formatDuration(session.totalPauseSeconds),
              })}
            </p>
          )}
          {isChallenge && session.score !== null && (
            <p>{t('history.beaten', { score: session.score, total: session.totalCards })}</p>
          )}
          {session.basePoints != null && session.multiplier != null && (
            <p>
              {t('history.breakdown', {
                base: session.basePoints,
                multiplier: formatMultiplier(session.multiplier),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
