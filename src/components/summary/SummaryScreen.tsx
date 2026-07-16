'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { summarizeByCategory } from '@/lib/domain/summarize';
import { computeScore } from '@/lib/domain/challenge';
import { rankForXp, type Rank } from '@/lib/domain/score';
import { getTotalXp } from '@/lib/supabase/records';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import { InfoModal } from '@/components/ui/InfoModal';
import type { CategoryKey, SessionConfig, SessionResult } from '@/lib/domain/types';

const CATEGORY_TO_SUIT: Record<CategoryKey, string> = {
  push: '♥',
  pull: '♣',
  legs: '♠',
  core: '♦',
};

const SUIT_COLOR: Record<CategoryKey, string> = {
  push: 'var(--color-suit-hearts)',
  pull: 'var(--color-suit-clubs)',
  legs: 'var(--color-suit-spades)',
  core: 'var(--color-suit-diamonds)',
};

const GROUP_KEY: Record<CategoryKey, string> = {
  push: 'groupPush',
  pull: 'groupPull',
  legs: 'groupLegs',
  core: 'groupCore',
};

const SHARDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
  const a = (i / 10) * Math.PI * 2;
  return {
    left: 50 + Math.round(Math.cos(a) * 6),
    width: 10 + (i % 3) * 6,
    dx: `${Math.round(Math.cos(a) * (90 + (i % 4) * 30))}px`,
    dy: `${Math.round(Math.sin(a) * (70 + (i % 3) * 30))}px`,
    rot: `${120 + i * 40}deg`,
    delay: `${(i % 5) * 0.04}s`,
    bg: i % 3 === 0 ? '#fafafa' : '#ccff00',
  };
});

interface SummaryScreenProps {
  result: SessionResult;
  isGuest: boolean;
  config?: SessionConfig | null;
  userId?: string | null;
  onDone: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatMultiplier(multiplier: number): string {
  return Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(2);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function SummaryScreen({ result, isGuest, config, userId, onDone }: SummaryScreenProps) {
  const t = useTranslations();
  const { locale } = useLocaleSetting();
  const [showFormula, setShowFormula] = useState(false);
  const [rankUp, setRankUp] = useState<Rank | null>(null);
  const [reducedMotion] = useState(prefersReducedMotion);
  const [stage, setStage] = useState(() => (prefersReducedMotion() ? 6 : 0));
  const [displayScore, setDisplayScore] = useState(() =>
    prefersReducedMotion() ? result.points : 0
  );
  const countIntervalRef = useRef<number | null>(null);

  const breakdown = summarizeByCategory(result.draws);
  const exerciseNameByCategory = new Map(
    result.draws.map((d) => [d.categoryKey, localizedName(d.exercise, locale)])
  );
  const challenge =
    config?.gameMode === 'perfect_deck' ||
    config?.gameMode === 'court' ||
    config?.gameMode === 'daily'
      ? computeScore(result.draws)
      : null;
  const multiplierLabel = formatMultiplier(result.multiplier);
  const cardsCompleted = result.draws.filter((d) => d.completedAt !== null).length || result.draws.length;

  const isNewBest =
    !!challenge &&
    (challenge.score > (config?.bestScoreForCombo ?? -1) ||
      (config?.parSource === 'record' &&
        config.budgetSeconds != null &&
        result.totalDurationSeconds < config.budgetSeconds));
  const isPerfect = !!challenge?.won;
  const jackpot = stage >= 6 && (isNewBest || isPerfect || !!rankUp);

  useEffect(() => {
    if (!userId) return;
    getTotalXp(userId).then((xp) => {
      const rankBefore = rankForXp(xp - result.points);
      const rankAfter = rankForXp(xp);
      if (rankBefore.symbol !== rankAfter.symbol) {
        setRankUp(rankAfter);
      }
    });
  }, [userId, result.points]);

  // s8: stage 0→6 via short setTimeouts — UI choreography only (not workout timing).
  useEffect(() => {
    if (reducedMotion) return;

    const timeouts: number[] = [];
    const st = (ms: number, fn: () => void) => {
      timeouts.push(window.setTimeout(fn, ms));
    };

    st(250, () => setStage(1));
    st(600, () => {
      if (countIntervalRef.current != null) window.clearInterval(countIntervalRef.current);
      countIntervalRef.current = window.setInterval(() => {
        setDisplayScore((prev) => {
          const next = prev + (result.points - prev) * 0.13 + 28;
          if (next >= result.points - 2) {
            if (countIntervalRef.current != null) {
              window.clearInterval(countIntervalRef.current);
              countIntervalRef.current = null;
            }
            return result.points;
          }
          return next;
        });
      }, 40);
    });
    st(700, () => setStage(2));
    st(850, () => setStage(3));
    st(1000, () => setStage(4));
    st(1150, () => setStage(5));
    st(1950, () => setStage(6));

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
      if (countIntervalRef.current != null) {
        window.clearInterval(countIntervalRef.current);
        countIntervalRef.current = null;
      }
    };
  }, [result.points, reducedMotion]);

  return (
    <div
      data-testid="summary-ritual"
      data-stage={stage}
      className="relative min-h-screen flex flex-col overflow-hidden px-[22px] pt-7 pb-8"
    >
      {jackpot && !reducedMotion && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[1] motion-safe:animate-[flashK_0.7s_ease-out_forwards]"
            style={{
              background: 'radial-gradient(circle at 50% 34%, rgba(204,255,0,.3), transparent 70%)',
            }}
          />
          <div data-testid="score-shards" className="pointer-events-none absolute inset-0 z-[1]">
            {SHARDS.map((sh, i) => (
              <div
                key={i}
                className="absolute top-[34%] h-1 rounded-sm motion-safe:animate-[shardK_0.8s_cubic-bezier(0.2,0.7,0.4,1)_forwards]"
                style={{
                  left: `${sh.left}%`,
                  width: sh.width,
                  background: sh.bg,
                  animationDelay: sh.delay,
                  // CSS vars for shardK keyframes
                  ['--dx' as string]: sh.dx,
                  ['--dy' as string]: sh.dy,
                  ['--rot' as string]: sh.rot,
                }}
              />
            ))}
          </div>
        </>
      )}

      <div
        className="relative z-[2] text-center transition-all duration-400"
        style={{
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? 'translateY(0)' : 'translateY(12px)',
        }}
      >
        <div className="inline-block rounded-full border border-[#3a3a40] px-4 py-1.5 text-[11px] font-extrabold tracking-[0.24em] text-muted">
          {t('results.deckCleared')}
        </div>

        <div className="mt-3.5 flex items-center justify-center gap-2">
          <p
            data-testid="score-counter"
            className="text-[66px] font-black leading-[1.05] tabular-nums text-accent"
            style={{ textShadow: '0 0 40px rgba(204,255,0,.3)' }}
          >
            {Math.round(displayScore).toLocaleString(locale === 'sr' ? 'sr-RS' : 'en-US')}
          </p>
          <button
            type="button"
            onClick={() => setShowFormula(true)}
            aria-label={t('points.formulaTitle')}
            className="h-8 w-8 rounded-full bg-surface text-sm font-extrabold text-muted"
          >
            ⓘ
          </button>
        </div>
        <p className="mt-0.5 text-[11px] font-extrabold tracking-[0.24em] text-[#71717a]">
          {t('points.label').toUpperCase()}
        </p>
        <p className="mt-1 text-xs font-semibold text-muted">
          {t('points.base', { base: result.basePoints })} ·{' '}
          {t('points.multiplierLabel', { multiplier: multiplierLabel })}
        </p>

        <div className="mt-3 flex justify-center gap-2.5">
          <span className="rounded-full bg-[#232327] px-3 py-1.5 text-xs font-extrabold text-muted">
            ⏱ {formatDuration(result.totalDurationSeconds)}
          </span>
          <span className="rounded-full bg-[#232327] px-3 py-1.5 text-xs font-extrabold text-muted">
            {t('progress.cardsLine', { count: cardsCompleted })}
          </span>
        </div>

        {challenge && (
          <p className="mt-2 text-sm font-extrabold text-accent">
            {t('results.score', { score: challenge.score, total: challenge.total })}
          </p>
        )}
        {result.pauseCount != null && result.totalPauseSeconds != null && result.pauseCount > 0 && (
          <p className="mt-1.5 text-xs font-semibold text-muted">
            {t('pause.summary', {
              count: result.pauseCount,
              duration: formatDuration(result.totalPauseSeconds),
            })}
          </p>
        )}
      </div>

      <div className="relative z-[2] mt-5 flex flex-col gap-2">
        {breakdown.map((item, index) => {
          const rowStage = index + 2;
          const visible = stage >= rowStage;
          return (
            <div
              key={item.categoryKey}
              data-testid={`suit-row-${item.categoryKey}`}
              className="flex items-center gap-3 rounded-[14px] border border-[#303036] bg-[#212124] px-4 py-[11px] transition-all duration-400"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transitionTimingFunction: 'cubic-bezier(.2,.8,.3,1.1)',
              }}
            >
              <span
                className="w-6 text-center text-xl"
                style={{ color: SUIT_COLOR[item.categoryKey] }}
              >
                {CATEGORY_TO_SUIT[item.categoryKey]}
              </span>
              <span className="flex-1 text-sm font-extrabold text-foreground">
                {exerciseNameByCategory.get(item.categoryKey) ??
                  t(`setup.${GROUP_KEY[item.categoryKey]}`)}
              </span>
              <span className="text-[13px] font-bold text-muted">
                {t('results.suitLine', { cards: item.cardCount, reps: item.totalReps })}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative z-[2] mt-3.5 flex min-h-[52px] flex-col items-center justify-center gap-2">
        {stage >= 6 && isPerfect && (
          <div className="rounded-full bg-accent px-6 py-[11px] text-sm font-black tracking-[0.12em] text-background shadow-[0_0_34px_rgba(204,255,0,.5)] motion-safe:animate-[badgeK_0.55s_cubic-bezier(0.2,0.9,0.3,1.4)_forwards]">
            {t('results.perfectDeck')}
          </div>
        )}
        {stage >= 6 && isNewBest && (
          <div className="rounded-full bg-accent px-6 py-[11px] text-sm font-black tracking-[0.12em] text-background shadow-[0_0_34px_rgba(204,255,0,.5)] motion-safe:animate-[badgeK_0.55s_cubic-bezier(0.2,0.9,0.3,1.4)_forwards]">
            {t('results.newBest')}
          </div>
        )}
        {stage >= 6 && rankUp && (
          <div className="rounded-full bg-accent px-6 py-[11px] text-sm font-black tracking-[0.12em] text-background shadow-[0_0_34px_rgba(204,255,0,.5)] motion-safe:animate-[badgeK_0.55s_cubic-bezier(0.2,0.9,0.3,1.4)_forwards]">
            {t('xp.rankUp', { symbol: rankUp.symbol, name: t(rankUp.nameKey) })}
          </div>
        )}
      </div>

      {isGuest && stage >= 1 && (
        <div className="relative z-[2] mt-6 rounded-[18px] border border-accent/30 bg-surface p-5 text-center">
          <p className="mb-3.5 text-sm font-semibold leading-snug text-muted">
            {t('auth.guestBanner', { points: result.points })}
          </p>
          <Link
            href={`/signup?points=${result.points}`}
            className="block w-full rounded-2xl bg-accent p-4 text-[15px] font-extrabold text-background"
          >
            {t('results.createAccount')}
          </Link>
        </div>
      )}

      <button
        onClick={onDone}
        className="relative z-[2] mt-auto border border-accent/40 bg-transparent p-[13px] pt-[18px] text-[13px] font-black tracking-[0.14em] text-accent rounded-[14px]"
      >
        {t('results.backHome')}
      </button>

      {showFormula && (
        <InfoModal
          title={t('points.formulaTitle')}
          closeLabel={t('common.close')}
          onClose={() => setShowFormula(false)}
        >
          {t('points.formula')}
        </InfoModal>
      )}
    </div>
  );
}
