'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStopwatch } from '@/hooks/useStopwatch';
import { useCardQuota } from '@/hooks/useCardQuota';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import { calculateCardWeight, calculateQuotaSeconds, computeScore } from '@/lib/domain/challenge';
import { calculateBasePoints, challengeMultiplier, calculatePoints } from '@/lib/domain/score';
import { CardDisplay } from './CardDisplay';
import { ProgressIndicator } from './ProgressIndicator';
import { StopwatchDisplay } from './StopwatchDisplay';
import { createSession, recordCardDraw, completeSession } from '@/lib/supabase/sessions';
import type { CardDrawResult, CategoryKey, SessionConfig, SessionResult } from '@/lib/domain/types';

interface SessionScreenProps {
  config: SessionConfig;
  draws: CardDrawResult[];
  categoryIdByKey: Record<CategoryKey, string> | null;
  userId: string | null;
  onFinish: (result: SessionResult) => void;
}

type SessionSaveState = 'guest' | 'creating' | 'ready' | 'failed';

export function SessionScreen({
  config,
  draws,
  categoryIdByKey,
  userId,
  onFinish,
}: SessionScreenProps) {
  const t = useTranslations();
  const { locale } = useLocaleSetting();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedDraws, setCompletedDraws] = useState<CardDrawResult[]>(draws);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SessionSaveState>(userId ? 'creating' : 'guest');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [outcomeFlash, setOutcomeFlash] = useState<'won' | 'lost' | null>(null);
  const stopwatch = useStopwatch();
  // Screen stays awake for the whole active session (all modes); released on unmount.
  useWakeLock(true);

  const [pauseOrigin, setPauseOrigin] = useState<'manual' | 'auto' | null>(null);

  function handleManualPause() {
    if (stopwatch.isPaused) return;
    setPauseOrigin('manual');
    stopwatch.pause();
  }

  function handleResume() {
    setPauseOrigin(null);
    stopwatch.resume();
  }

  const isChallenge = config.gameMode === 'perfect_deck' && config.budgetSeconds != null;
  const parRates = { parSecondsPerRep: config.parSecondsPerRep, parTransitionSeconds: config.parTransitionSeconds };
  const cardWeights = draws.map((d) => calculateCardWeight(d.reps, parRates));
  const totalWeight = cardWeights.reduce((sum, w) => sum + w, 0);
  const quotaSeconds = isChallenge
    ? calculateQuotaSeconds(config.budgetSeconds as number, cardWeights[currentIndex], totalWeight)
    : null;
  const quota = useCardQuota(quotaSeconds, currentIndex, stopwatch.isPaused);
  const scoreSoFar = computeScore(completedDraws.slice(0, currentIndex));

  useEffect(() => {
    if (!userId || !categoryIdByKey) return;
    createSession({
      userId,
      config,
      categoryIdByKey,
      startedAtIso: new Date().toISOString(),
      gameMode: config.gameMode,
      settings: isChallenge
        ? { budget_seconds: config.budgetSeconds as number, par_source: config.parSource ?? 'par' }
        : undefined,
    })
      .then((id) => {
        setSessionId(id);
        setSaveState('ready');
      })
      .catch((err) => {
        console.error('Failed to create session', err);
        setSaveState('failed');
      });
    // Intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-pause when the app loses visibility (lock screen, call, tab switch).
  // Reuses the exact same pause path as the button — timestamp shift only.
  // Guard makes repeated `hidden` events idempotent and keeps a manual
  // pause's origin from being overwritten.
  useEffect(() => {
    function autoPause() {
      if (!stopwatch.isPaused) {
        setPauseOrigin('auto');
        stopwatch.pause();
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') autoPause();
    }
    // `pagehide` is the more reliable backgrounding signal on iOS Safari, where
    // `visibilitychange` is less dependable across app-switch / screen lock
    // (spec section 11 review point). Pausing is idempotent (Task 4's log +
    // the isPaused guard), so firing both listeners is harmless. pagehide does
    // NOT fire on the finish→summary state change (not a page navigation), so
    // it won't spuriously pause a completing session.
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', autoPause);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', autoPause);
    };
  }, [stopwatch.isPaused, stopwatch.pause]);

  async function handleNext() {
    setIsAdvancing(true);
    const completedAt = new Date().toISOString();
    const updatedDraw: CardDrawResult = {
      ...completedDraws[currentIndex],
      completedAt,
      ...(isChallenge ? { beatQuota: !quota.expired } : {}),
    };
    const nextDraws = [...completedDraws];
    nextDraws[currentIndex] = updatedDraw;
    setCompletedDraws(nextDraws);
    setOutcomeFlash(isChallenge ? (!quota.expired ? 'won' : 'lost') : null);
    setTimeout(() => setOutcomeFlash(null), 600);

    if (userId && sessionId && saveState === 'ready') {
      try {
        await recordCardDraw(sessionId, updatedDraw);
      } catch (err) {
        console.error('Failed to record card draw', err);
        setSaveState('failed');
      }
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= draws.length) {
      stopwatch.pause();
      // Closure reads: totalDurationSeconds and the pause stats come from the
      // render BEFORE the wrap-up pause() above, so finishing the session is
      // not itself counted or timed as a pause.
      const totalDurationSeconds = stopwatch.elapsedSeconds;
      const pauseStats = {
        pause_count: stopwatch.pauseCount,
        total_pause_seconds: stopwatch.totalPauseSeconds,
      };
      const scored = nextDraws.map((d) => ({
        reps: d.reps,
        completedAt: d.completedAt,
        tier: d.exercise.tier,
      }));
      const basePoints = calculateBasePoints(scored);
      const challengeScore = computeScore(nextDraws);
      const multiplier = isChallenge
        ? challengeMultiplier({
            mode: 'perfect_deck',
            beaten: challengeScore.score,
            total: nextDraws.length,
          })
        : challengeMultiplier({ mode: 'classic' });
      const points = calculatePoints(basePoints, multiplier);
      const pointsPayload = {
        points,
        base_points: basePoints,
        multiplier,
        entry: config.entry,
        card_count: config.deckSize,
        rep_multiplier: config.repMultiplier,
      };
      const settingsPayload = isChallenge
        ? {
            budget_seconds: config.budgetSeconds as number,
            par_source: config.parSource ?? ('par' as const),
            best_score: config.bestScoreForCombo ?? null,
            score: challengeScore.score,
            won: challengeScore.won,
            ...pauseStats,
            ...pointsPayload,
          }
        : { ...pauseStats, ...pointsPayload };
      if (userId && sessionId && saveState === 'ready') {
        try {
          await completeSession(sessionId, totalDurationSeconds, settingsPayload);
        } catch (err) {
          console.error('Failed to complete session', err);
          setSaveState('failed');
        }
      }
      onFinish({
        totalDurationSeconds,
        draws: nextDraws,
        pauseCount: pauseStats.pause_count,
        totalPauseSeconds: pauseStats.total_pause_seconds,
        points,
        basePoints,
        multiplier,
      });
      return;
    }
    setCurrentIndex(nextIndex);
    setIsAdvancing(false);
  }

  const current = draws[currentIndex];
  const isWaitingForSession = userId !== null && saveState === 'creating';
  const nextDisabled = stopwatch.isPaused || isAdvancing || isWaitingForSession;

  return (
    <div className="min-h-screen relative flex flex-col px-6 pt-5 pb-7">
      <div className="flex items-center justify-between mb-[22px]">
        {isChallenge ? (
          <p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-accent">
            ⚡ {scoreSoFar.score}/{currentIndex}
            {config.bestScoreForCombo != null
              ? ` · ${t('progress.bestScore', { score: config.bestScoreForCombo, total: draws.length })}`
              : ''}
          </p>
        ) : (
          <div className="w-10" />
        )}
        <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
        <ProgressIndicator current={currentIndex + 1} total={draws.length} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <CardDisplay
          exerciseName={localizedName(current.exercise, locale)}
          reps={current.reps}
          suit={current.card.suit}
          rank={current.card.rank}
          categoryKey={current.categoryKey}
          categoryLabel={undefined}
          quotaRemainingSeconds={isChallenge ? quota.remainingSeconds : null}
          quotaFraction={quota.fraction}
          outcomeFlash={outcomeFlash}
        />
        <div className="h-1.5 rounded-[3px] bg-surface/70 mt-5 overflow-hidden">
          <div
            className="h-full bg-accent rounded-[3px]"
            style={{ width: `${Math.round((currentIndex / draws.length) * 100)}%` }}
          />
        </div>
      </div>

      {saveState === 'failed' && (
        <p className="text-sm text-red-500 text-center mt-4">{t('workout.saveFailed')}</p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={stopwatch.isPaused ? handleResume : handleManualPause}
          className="flex-1 bg-surface/60 border-2 border-white/15 text-foreground rounded-[18px] p-5 font-extrabold text-base"
        >
          {stopwatch.isPaused ? t('workout.resume') : t('workout.pause')}
        </button>
        <button
          onClick={handleNext}
          disabled={nextDisabled}
          className="flex-[2] bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg disabled:opacity-50"
        >
          {isWaitingForSession ? t('workout.preparing') : t('workout.nextCard')}
        </button>
      </div>

      {stopwatch.isPaused && (
        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-6 z-10">
          <p className="text-[30px] font-black text-accent tracking-widest">{t('workout.paused')}</p>
          {pauseOrigin === 'auto' && (
            <p className="text-sm font-semibold text-muted -mt-3">{t('pause.autoLabel')}</p>
          )}
          <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
          <button
            onClick={handleResume}
            className="bg-accent text-background rounded-[18px] px-10 py-[18px] font-extrabold text-base"
          >
            {t('workout.resumeWorkout')}
          </button>
        </div>
      )}
    </div>
  );
}
