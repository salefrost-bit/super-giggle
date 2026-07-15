'use client';

import { useTranslations } from 'next-intl';

import { CATEGORY_KEY_TO_NAME } from '@/lib/domain/types';
import type { CategoryKey, Suit } from '@/lib/domain/types';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  clubs: '♣',
  spades: '♠',
  diamonds: '♦',
};

const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? String(rank);
}

interface CardDisplayProps {
  exerciseName: string;
  reps: number;
  suit?: Suit;
  rank?: number;
  categoryKey?: CategoryKey;
  categoryLabel?: string;
  quotaRemainingSeconds?: number | null;
  quotaFraction?: number;
  bankBalanceSeconds?: number | null;
  bankQuotaSeconds?: number | null;
  outcomeFlash?: 'won' | 'lost' | null;
}

export function CardDisplay({
  exerciseName,
  reps,
  suit,
  rank,
  categoryKey,
  categoryLabel,
  quotaRemainingSeconds,
  quotaFraction,
  bankBalanceSeconds,
  bankQuotaSeconds,
  outcomeFlash,
}: CardDisplayProps) {
  const t = useTranslations();

  const fraction = quotaFraction ?? 1;
  const urgency =
    bankBalanceSeconds != null
      ? bankBalanceSeconds <= 10
        ? 'critical'
        : bankBalanceSeconds <= 30
          ? 'warn'
          : 'normal'
      : quotaRemainingSeconds == null
        ? 'normal'
        : fraction >= 0.5
          ? 'normal'
          : fraction >= 0.25
            ? 'warn'
            : 'critical';
  const borderClass =
    outcomeFlash === 'won'
      ? 'border-accent shadow-[0_0_60px_rgba(204,255,0,0.35)]'
      : outcomeFlash === 'lost'
        ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.35)]'
        : urgency === 'critical'
          ? 'border-red-500 animate-pulse'
          : urgency === 'warn'
            ? 'border-orange-400/70'
            : 'border-accent/35';

  return (
    <div
      className={`bg-surface/55 backdrop-blur-xl rounded-3xl border-2 ${borderClass} shadow-[0_0_40px_rgba(204,255,0,0.08)] p-7 min-h-[360px] flex flex-col`}
    >
      <div className="flex justify-between items-start">
        {suit && categoryKey ? (
          <div className="bg-accent text-background font-extrabold text-[13px] px-3 py-2 rounded-[10px] flex items-center gap-1.5">
            <span>{SUIT_SYMBOLS[suit]}</span>
            <span>{categoryLabel ?? CATEGORY_KEY_TO_NAME[categoryKey]}</span>
          </div>
        ) : (
          <div />
        )}
        {rank !== undefined && (
          <div className="text-[22px] font-black text-muted">{rankLabel(rank)}</div>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        <p className="text-[22px] font-extrabold">{exerciseName}</p>
        <p className="text-[96px] font-black text-accent leading-none mt-1.5">{reps}</p>
        <p className="text-[15px] font-bold text-muted tracking-widest uppercase">{t('workout.reps')}</p>
        {bankBalanceSeconds != null ? (
          <>
            <p
              className={`text-2xl font-black tabular-nums mt-2.5 ${
                urgency === 'critical' ? 'text-red-500' : urgency === 'warn' ? 'text-orange-400' : 'text-accent'
              }`}
            >
              {Math.floor(bankBalanceSeconds / 60)}:{String(bankBalanceSeconds % 60).padStart(2, '0')}
            </p>
            <p
              className={`text-[10px] font-bold tracking-widest ${
                urgency === 'critical' ? 'text-red-500' : 'text-muted'
              }`}
            >
              {t('workout.bankCaption')}
            </p>
            {bankQuotaSeconds != null && (
              <p className="text-xs font-semibold text-muted mt-1">
                {t('workout.bankQuota', { seconds: bankQuotaSeconds })}
              </p>
            )}
          </>
        ) : quotaRemainingSeconds != null ? (
          <>
            <p
              className={`text-2xl font-black tabular-nums mt-2.5 ${
                urgency === 'critical' ? 'text-red-500' : urgency === 'warn' ? 'text-orange-400' : 'text-accent'
              }`}
            >
              {Math.floor(quotaRemainingSeconds / 60)}:{String(quotaRemainingSeconds % 60).padStart(2, '0')}
            </p>
            <p
              className={`text-[10px] font-bold tracking-widest ${
                urgency === 'critical' ? 'text-red-500' : 'text-muted'
              }`}
            >
              {t('workout.quotaCaption')}
            </p>
          </>
        ) : null}
      </div>
      {quotaRemainingSeconds != null && bankBalanceSeconds == null && (
        <div className="h-1 rounded-full bg-background/60 overflow-hidden mt-3">
          <div
            className={`h-full rounded-full ${
              urgency === 'critical' ? 'bg-red-500' : urgency === 'warn' ? 'bg-orange-400' : 'bg-accent'
            }`}
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
