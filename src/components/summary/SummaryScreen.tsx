'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { summarizeByCategory } from '@/lib/domain/summarize';
import { computeScore } from '@/lib/domain/challenge';
import { CATEGORY_KEY_TO_NAME } from '@/lib/domain/types';
import type { CategoryKey, SessionConfig, SessionResult } from '@/lib/domain/types';

// Visual suit chip per category — follows SUIT_TO_CATEGORY in types.ts, NOT the prototype's pairing.
const CATEGORY_TO_SUIT: Record<CategoryKey, string> = {
  push: '♥',
  pull: '♣',
  legs: '♠',
  core: '♦',
};

interface SummaryScreenProps {
  result: SessionResult;
  isGuest: boolean;
  config?: SessionConfig | null;
  onDone: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function SummaryScreen({ result, isGuest, config, onDone }: SummaryScreenProps) {
  const t = useTranslations();
  const breakdown = summarizeByCategory(result.draws);
  const challenge = config?.gameMode === 'perfect_deck' ? computeScore(result.draws) : null;

  return (
    <div className="min-h-screen flex flex-col px-6 pt-9 pb-8">
      <p className="text-[15px] font-extrabold text-accent tracking-widest uppercase text-center">
        {challenge ? t('results.challengeDone') : t('results.workoutDone')}
      </p>
      {challenge?.won && (
        <div className="relative text-center mt-3">
          <p className="text-2xl font-black text-accent tracking-widest animate-bounce">
            {t('results.perfectDeck')}
          </p>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className={`confetti-piece ${['bg-accent', 'bg-orange-400', 'bg-red-500'][i % 3]}`}
                style={{ left: `${(i * 8.3) % 100}%`, animationDelay: `${(i % 6) * 0.12}s` }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="text-center mt-5 mb-8">
        <p className="text-[64px] font-black tabular-nums leading-none">
          {formatDuration(result.totalDurationSeconds)}
        </p>
        <p className="text-sm font-bold text-muted mt-2 uppercase tracking-widest">{t('results.totalTime')}</p>
        {challenge && (
          <p className="text-lg font-extrabold text-accent text-center mt-1">
            {t('results.score', { score: challenge.score, total: challenge.total })}
          </p>
        )}
        {challenge &&
          config?.parSource === 'record' &&
          config.budgetSeconds != null &&
          result.totalDurationSeconds < config.budgetSeconds && (
            <p className="inline-block mx-auto mt-2 bg-accent text-background text-xs font-extrabold px-3 py-1.5 rounded-lg text-center">
              {t('results.newRecord')}
            </p>
          )}
        {challenge && challenge.score > (config?.bestScoreForCombo ?? -1) && (
          <p className="inline-block mx-auto mt-2 bg-accent text-background text-xs font-extrabold px-3 py-1.5 rounded-lg text-center">
            {t('results.newBestScore')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {breakdown.map((item) => (
          <div
            key={item.categoryKey}
            className="bg-surface rounded-2xl px-[18px] py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-[10px] bg-background flex items-center justify-center text-[15px] text-accent font-extrabold">
                {CATEGORY_TO_SUIT[item.categoryKey]}
              </span>
              <div>
                <p className="text-[15px] font-extrabold">{item.exerciseName}</p>
                <p className="text-xs font-semibold text-muted">
                  {CATEGORY_KEY_TO_NAME[item.categoryKey]}
                </p>
              </div>
            </div>
            <p className="text-2xl font-black text-accent">{item.totalReps}</p>
          </div>
        ))}
      </div>

      {isGuest && (
        <div className="bg-surface border-2 border-accent/30 rounded-[18px] p-5 mt-6 text-center">
          <p className="text-sm font-semibold text-muted mb-3.5 leading-snug">
            {t('results.guestNote')}
          </p>
          <Link
            href="/signup"
            className="block w-full bg-accent text-background rounded-2xl p-4 font-extrabold text-[15px]"
          >
            {t('results.createAccount')}
          </Link>
        </div>
      )}

      <button
        onClick={onDone}
        className="mt-auto pt-6 border-2 border-white/15 text-foreground rounded-[18px] p-[18px] font-bold text-base"
      >
        {t('results.backHome')}
      </button>
    </div>
  );
}
