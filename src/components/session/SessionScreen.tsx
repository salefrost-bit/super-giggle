'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStopwatch } from '@/hooks/useStopwatch';
import { useCardQuota } from '@/hooks/useCardQuota';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import { BANK_START_SECONDS, applyCompletedCard, isBankrupt } from '@/lib/domain/bank';
import {
  dailyDateString,
  isDailyDoneLocal,
  markDailyDoneLocal,
  seededRng,
} from '@/lib/domain/daily';
import { calculateCardWeight, calculateQuotaSeconds, computeScore } from '@/lib/domain/challenge';
import { calculateBasePoints, challengeMultiplier, calculatePoints } from '@/lib/domain/score';
import { JOKER_REST_SECONDS, assignJokerBreaks, isJokerBreak } from '@/lib/domain/jokers';
import { drawSessionCards } from '@/lib/domain/deck';
import { buildDraws } from '@/lib/domain/draws';
import { CardDisplay } from './CardDisplay';
import { JokerRestScreen } from './JokerRestScreen';
import { ProgressIndicator } from './ProgressIndicator';
import { StopwatchDisplay } from './StopwatchDisplay';
import { createSession, recordCardDraw, completeSession, hasDailyForDate } from '@/lib/supabase/sessions';
import { saveLastConfig } from '@/lib/domain/lastConfig';
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
  const isSprint = config.gameMode === 'sprint';
  const isCourt = config.gameMode === 'court';
  const isSurvive = config.gameMode === 'survive';
  const isDaily = config.gameMode === 'daily';
  const isChallenge =
    (config.gameMode === 'perfect_deck' || isCourt || isDaily) &&
    config.budgetSeconds != null;

  const [queue, setQueue] = useState<CardDrawResult[]>(draws);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedDraws, setCompletedDraws] = useState<CardDrawResult[]>(draws);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SessionSaveState>(userId ? 'creating' : 'guest');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [outcomeFlash, setOutcomeFlash] = useState<'won' | 'lost' | null>(null);
  const stopwatch = useStopwatch();
  const lastAppendedAtRef = useRef(-1);
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  useWakeLock(true);

  const [balanceSeconds, setBalanceSeconds] = useState(BANK_START_SECONDS);
  const [elapsedAtCardStart, setElapsedAtCardStart] = useState(0);
  const [pauseOrigin, setPauseOrigin] = useState<'manual' | 'auto' | null>(null);

  // Computed once at mount from the INITIAL real-card count. Sprint always
  // uses a 52-card lap (isJokerBreak wraps positions modulo 52 below) even
  // though `queue` grows via reshuffle-on-exhaustion. Karta dana gets its own
  // date-seeded rng stream (separate from the one that draws the cards, so
  // the sequences don't accidentally correlate) — same raspored for every
  // player that day, matching daily.ts's existing determinism principle.
  const [jokerBreaks] = useState(() => {
    const realCardCount = isSprint ? 52 : queue.length;
    if (!isDaily) return assignJokerBreaks(realCardCount);
    const dateString = dailyDateString(new Date(sessionStartedAt));
    return assignJokerBreaks(realCardCount, seededRng(`${dateString}:jokers`));
  });
  const [isResting, setIsResting] = useState(false);
  const [restKey, setRestKey] = useState(0);
  const [jokerBreaksTaken, setJokerBreaksTaken] = useState(0);
  const pendingIndexRef = useRef<number | null>(null);
  const restQuota = useCardQuota(isResting ? JOKER_REST_SECONDS : null, restKey, stopwatch.isPaused);

  function handleManualPause() {
    if (stopwatch.isPaused) return;
    setPauseOrigin('manual');
    stopwatch.pause();
  }

  function handleResume() {
    setPauseOrigin(null);
    stopwatch.resume();
  }

  const parRates = {
    parSecondsPerRep: config.parSecondsPerRep,
    parTransitionSeconds: config.parTransitionSeconds,
  };
  const cardWeights = queue.map((d) => calculateCardWeight(d.reps, parRates));
  const totalWeight = cardWeights.reduce((sum, w) => sum + w, 0);
  const quotaSeconds = isChallenge
    ? calculateQuotaSeconds(config.budgetSeconds as number, cardWeights[currentIndex], totalWeight)
    : null;
  const cardQuota = useCardQuota(quotaSeconds, currentIndex, stopwatch.isPaused);
  const sprintQuota = useCardQuota(
    isSprint && config.sprintMinutes != null ? config.sprintMinutes * 60 : null,
    0,
    stopwatch.isPaused || isResting
  );
  const quota = isSprint ? sprintQuota : cardQuota;
  const scoreSoFar = computeScore(completedDraws.slice(0, currentIndex));

  const activeCardSeconds = isSurvive ? stopwatch.elapsedSeconds - elapsedAtCardStart : 0;
  const displayBalance = isSurvive ? Math.max(0, balanceSeconds - activeCardSeconds) : null;
  const cardQuotaSeconds = isSurvive ? cardWeights[currentIndex] : null;

  useEffect(() => {
    if (!isSprint || sprintQuota.expired) return;
    if (currentIndex !== queue.length - 1) return;
    if (lastAppendedAtRef.current === queue.length - 1) return;
    lastAppendedAtRef.current = queue.length - 1;

    const cards = drawSessionCards(52);
    const appended = buildDraws(cards, config.exerciseByCategory, config.repMultiplier, false).map(
      (draw, index) => ({ ...draw, orderIndex: queue.length + index })
    );
    setQueue((prev) => [...prev, ...appended]);
    setCompletedDraws((prev) => [...prev, ...appended]);
  }, [currentIndex, queue.length, isSprint, sprintQuota.expired, config.exerciseByCategory, config.repMultiplier]);

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
        : isSprint && config.sprintMinutes != null
          ? { sprint_minutes: config.sprintMinutes }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', autoPause);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', autoPause);
    };
  }, [stopwatch.isPaused, stopwatch.pause]);

  // Rest ends the same way any useCardQuota-driven countdown ends: when
  // `expired` flips true. Guarded by `pendingIndexRef` so it fires exactly
  // once per rest even though this effect re-runs on every stopwatch tick.
  useEffect(() => {
    if (!isResting || !restQuota.expired) return;
    const pending = pendingIndexRef.current;
    if (pending === null) return;
    pendingIndexRef.current = null;
    setIsResting(false);
    setJokerBreaksTaken((n) => n + 1);
    if (isSurvive) setElapsedAtCardStart(stopwatch.elapsedSeconds);
    setCurrentIndex(pending);
    setIsAdvancing(false);
  }, [isResting, restQuota.expired, isSurvive, stopwatch.elapsedSeconds]);

  async function finishSession(
    nextDraws: CardDrawResult[],
    options: {
      survivedCards?: number;
      survivedAll?: boolean;
      dailyDate?: string;
      dailyReplay?: boolean;
    } = {}
  ) {
    stopwatch.pause();
    const totalDurationSeconds = stopwatch.elapsedSeconds;
    const pauseStats = {
      pause_count: stopwatch.pauseCount,
      total_pause_seconds: stopwatch.totalPauseSeconds,
    };
    const jokerStats = jokerBreaksTaken > 0 ? { joker_breaks_taken: jokerBreaksTaken } : {};
    const finishedDraws = nextDraws.filter((d) => d.completedAt !== null);
    const scored = finishedDraws.map((d) => ({
      reps: d.reps,
      completedAt: d.completedAt,
      tier: d.exercise.tier,
    }));
    const basePoints = calculateBasePoints(scored);
    const challengeScore = computeScore(nextDraws);

    let multiplier: number;
    if (isSurvive) {
      multiplier = challengeMultiplier({
        mode: 'survive',
        survivedAll: options.survivedAll ?? false,
      });
    } else if (isChallenge) {
      const mode = isCourt ? 'court' : isDaily ? 'daily' : 'perfect_deck';
      multiplier = challengeMultiplier({
        mode,
        beaten: challengeScore.score,
        total: nextDraws.length,
      });
    } else if (isSprint) {
      multiplier = challengeMultiplier({ mode: 'sprint' });
    } else {
      multiplier = challengeMultiplier({ mode: 'classic' });
    }

    const points = calculatePoints(basePoints, multiplier);
    const pointsPayload = {
      points,
      base_points: basePoints,
      multiplier,
      entry: config.entry,
      card_count: config.deckSize,
      rep_multiplier: config.repMultiplier,
    };

    const dailySettings = options.dailyReplay
      ? { daily_replay: true as const }
      : options.dailyDate
        ? { daily_date: options.dailyDate }
        : {};

    const settingsPayload = isSurvive
      ? {
          survived_cards: options.survivedCards ?? finishedDraws.length,
          ...pauseStats,
          ...jokerStats,
          ...pointsPayload,
        }
      : isChallenge
        ? {
            budget_seconds: config.budgetSeconds as number,
            par_source: config.parSource ?? ('par' as const),
            best_score: config.bestScoreForCombo ?? null,
            score: challengeScore.score,
            won: challengeScore.won,
            ...dailySettings,
            ...pauseStats,
            ...jokerStats,
            ...pointsPayload,
          }
        : isSprint
          ? {
              sprint_minutes: config.sprintMinutes,
              cards_completed: finishedDraws.length,
              ...pauseStats,
              ...jokerStats,
              ...pointsPayload,
            }
          : { ...pauseStats, ...jokerStats, ...pointsPayload };

    if (userId && sessionId && saveState === 'ready') {
      try {
        await completeSession(sessionId, totalDurationSeconds, settingsPayload);
      } catch (err) {
        console.error('Failed to complete session', err);
        setSaveState('failed');
      }
    }

    if (
      config.gameMode === 'classic' ||
      config.gameMode === 'perfect_deck' ||
      config.gameMode === 'court' ||
      config.gameMode === 'survive'
    ) {
      saveLastConfig({
        entry: config.entry ?? 'quick',
        gameMode: config.gameMode,
        difficultyLevelId: config.difficultyLevelId,
        repMultiplier: config.repMultiplier,
        deckSize: config.deckSize,
        exerciseIds: {
          push: config.exerciseByCategory.push.id,
          pull: config.exerciseByCategory.pull.id,
          legs: config.exerciseByCategory.legs.id,
          core: config.exerciseByCategory.core.id,
        },
      });
    } else if (isSprint && config.sprintMinutes != null) {
      saveLastConfig({
        entry: config.entry ?? 'challenge',
        gameMode: 'sprint',
        difficultyLevelId: config.difficultyLevelId,
        repMultiplier: 1.0,
        deckSize: 52,
        sprintMinutes: config.sprintMinutes,
        exerciseIds: {
          push: config.exerciseByCategory.push.id,
          pull: config.exerciseByCategory.pull.id,
          legs: config.exerciseByCategory.legs.id,
          core: config.exerciseByCategory.core.id,
        },
      });
    } else if (isDaily) {
      saveLastConfig({
        entry: 'challenge',
        gameMode: 'daily',
        difficultyLevelId: config.difficultyLevelId,
        repMultiplier: config.repMultiplier,
        deckSize: 20,
        exerciseIds: {
          push: config.exerciseByCategory.push.id,
          pull: config.exerciseByCategory.pull.id,
          legs: config.exerciseByCategory.legs.id,
          core: config.exerciseByCategory.core.id,
        },
      });
    }

    if (isDaily) {
      const dateString = options.dailyDate ?? dailyDateString(new Date(sessionStartedAt));
      markDailyDoneLocal(dateString);
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
  }

  async function handleNext() {
    setIsAdvancing(true);

    if (isSurvive) {
      const completedAt = new Date().toISOString();
      const cardQuota = cardWeights[currentIndex];
      const newBalance = applyCompletedCard(balanceSeconds, cardQuota, activeCardSeconds);
      const updatedDraw: CardDrawResult = {
        ...completedDraws[currentIndex],
        completedAt,
      };
      const nextDraws = [...completedDraws];
      nextDraws[currentIndex] = updatedDraw;
      setCompletedDraws(nextDraws);

      if (userId && sessionId && saveState === 'ready') {
        try {
          await recordCardDraw(sessionId, updatedDraw);
        } catch (err) {
          console.error('Failed to record card draw', err);
          setSaveState('failed');
        }
      }

      const nextIndex = currentIndex + 1;
      const survivedAll = nextIndex >= queue.length;

      if (survivedAll) {
        await finishSession(nextDraws, { survivedCards: nextIndex, survivedAll: true });
        return;
      }
      if (isBankrupt(newBalance)) {
        await finishSession(nextDraws, { survivedCards: nextIndex, survivedAll: false });
        return;
      }

      setBalanceSeconds(newBalance);
      if (isJokerBreak(nextIndex, jokerBreaks)) {
        pendingIndexRef.current = nextIndex;
        setRestKey((k) => k + 1);
        setIsResting(true);
        return;
      }
      setElapsedAtCardStart(stopwatch.elapsedSeconds);
      setCurrentIndex(nextIndex);
      setIsAdvancing(false);
      return;
    }

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
    if (isSprint && sprintQuota.expired) {
      await finishSession(nextDraws);
      return;
    }
    if (nextIndex >= queue.length) {
      if (isDaily) {
        const dateString = dailyDateString(new Date(sessionStartedAt));
        const isReplay = userId
          ? await hasDailyForDate(userId, dateString)
          : isDailyDoneLocal(dateString);
        await finishSession(nextDraws, isReplay ? { dailyReplay: true } : { dailyDate: dateString });
      } else {
        await finishSession(nextDraws);
      }
      return;
    }
    if (isJokerBreak(nextIndex, jokerBreaks, isSprint ? 52 : null)) {
      pendingIndexRef.current = nextIndex;
      setRestKey((k) => k + 1);
      setIsResting(true);
      return;
    }
    setCurrentIndex(nextIndex);
    setIsAdvancing(false);
  }

  const current = queue[currentIndex];
  const isWaitingForSession = userId !== null && saveState === 'creating';
  const nextDisabled = stopwatch.isPaused || isAdvancing || isWaitingForSession || isResting;

  return (
    <div className="min-h-screen relative flex flex-col px-6 pt-5 pb-7">
      <div className="flex items-center justify-between mb-[22px]">
        {isChallenge ? (
          <p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-accent">
            ⚡ {scoreSoFar.score}/{currentIndex}
            {config.bestScoreForCombo != null
              ? ` · ${t('progress.bestScore', { score: config.bestScoreForCombo, total: queue.length })}`
              : ''}
          </p>
        ) : isSprint ? (
          <p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-accent">
            🏃 {currentIndex + 1}
          </p>
        ) : isSurvive ? (
          <p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-accent">
            🛡 {currentIndex}/{queue.length}
          </p>
        ) : isDaily ? (
          <p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-accent">
            🎴 {scoreSoFar.score}/{currentIndex}
          </p>
        ) : (
          <div className="w-10" />
        )}
        <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
        <ProgressIndicator current={currentIndex + 1} total={queue.length} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {isResting ? (
          <JokerRestScreen remainingSeconds={restQuota.remainingSeconds} />
        ) : (
          <>
            <CardDisplay
              exerciseName={localizedName(current.exercise, locale)}
              reps={current.reps}
              suit={current.card.suit}
              rank={current.card.rank}
              categoryKey={current.categoryKey}
              categoryLabel={undefined}
              quotaRemainingSeconds={isChallenge || isSprint ? quota.remainingSeconds : null}
              quotaFraction={quota.fraction}
              bankBalanceSeconds={displayBalance}
              bankQuotaSeconds={cardQuotaSeconds}
              outcomeFlash={outcomeFlash}
            />
            <div className="h-1.5 rounded-[3px] bg-surface/70 mt-5 overflow-hidden">
              <div
                className="h-full bg-accent rounded-[3px]"
                style={{ width: `${Math.round((currentIndex / queue.length) * 100)}%` }}
              />
            </div>
          </>
        )}
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
