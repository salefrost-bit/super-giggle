'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStopwatch } from '@/hooks/useStopwatch';
import { useCardQuota } from '@/hooks/useCardQuota';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { localizedName } from '@/i18n/dbName';
import { BANK_START_SECONDS, CARD_SECONDS, bankRemaining, cardAdjustment, isBankrupt } from '@/lib/domain/bank';
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
import { StopwatchDisplay } from './StopwatchDisplay';
import { HEAT_COLOR, heatFor, heatForAbsolute, type Heat } from '@/components/ui/HeatRing';
import { SegmentBar } from '@/components/ui/SegmentBar';
import { LiveDot } from '@/components/ui/LiveDot';
import { createSession, recordCardDraw, completeSession, deleteSession, hasDailyForDate } from '@/lib/supabase/sessions';
import { saveLastConfig } from '@/lib/domain/lastConfig';
import type { CardDrawResult, CategoryKey, SessionConfig, SessionResult } from '@/lib/domain/types';

interface SessionScreenProps {
  config: SessionConfig;
  draws: CardDrawResult[];
  categoryIdByKey: Record<CategoryKey, string> | null;
  userId: string | null;
  onFinish: (result: SessionResult) => void;
  // Spec v0.4.7 §1: prekid bez čuvanja — poziva se POSLE best-effort brisanja.
  onAbort?: () => void;
}

type SessionSaveState = 'guest' | 'creating' | 'ready' | 'failed';

function formatMinSec(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDailyDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sr' ? 'sr-RS' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function SessionScreen({
  config,
  draws,
  categoryIdByKey,
  onAbort,
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
  // Klijentski UUID (spec v0.4.6 §1) — čini upis sesije idempotentnim za retry.
  const [clientSessionId] = useState<string | null>(() => (userId ? crypto.randomUUID() : null));
  const [saveState, setSaveState] = useState<SessionSaveState>(userId ? 'creating' : 'guest');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [outcomeFlash, setOutcomeFlash] = useState<'won' | 'lost' | null>(null);
  const stopwatch = useStopwatch();
  const lastAppendedAtRef = useRef(-1);
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  useWakeLock(true);

  // On the Clock (spec v0.4.7 §3): banka = 300 + Σ korekcija − aktivno vreme;
  // korekcije su ±20s po karti, aktivno vreme isključuje pauze i džoker odmor.
  const [bankAdjustments, setBankAdjustments] = useState(0);
  const [restSecondsTotal, setRestSecondsTotal] = useState(0);
  const restStartElapsedRef = useRef(0);
  const bankruptFiredRef = useRef(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [elapsedAtCardStart, setElapsedAtCardStart] = useState(0);
  const [pauseOrigin, setPauseOrigin] = useState<'manual' | 'auto' | null>(null);

  // s6: "HALF THE DECK DOWN" toast — fires once, first time the halfway
  // card is reached (based on the INITIAL deck, not sprint's growing queue).
  const halfDeckIndex = Math.floor(draws.length / 2);
  const [showHalfToast, setShowHalfToast] = useState(false);
  const hasShownHalfToastRef = useRef(false);

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

  // Spec v0.4.7 §1: prekid bez čuvanja — best-effort brisanje već upisane
  // sesije (gost nema šta da briše), pa izlaz. Neuspeh brisanja ne blokira.
  async function handleAbortConfirmed() {
    if (userId && sessionId) {
      try {
        await deleteSession(sessionId);
      } catch (err) {
        console.error('Failed to delete aborted session', err);
      }
    }
    onAbort?.();
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

  const activeCardSeconds = isSurvive ? stopwatch.elapsedSeconds - elapsedAtCardStart : 0;
  // Aktivno vreme banke: stopwatch već isključuje pauze; džoker odmor se
  // izuzima eksplicitno (tekući odmor + svi prethodni) — banka je zamrznuta.
  const restActiveSeconds = isResting
    ? Math.max(0, stopwatch.elapsedSeconds - restStartElapsedRef.current)
    : 0;
  const bankActiveElapsed = stopwatch.elapsedSeconds - restSecondsTotal - restActiveSeconds;
  const rawBankRemaining = isSurvive ? bankRemaining(bankAdjustments, bankActiveElapsed) : null;
  const displayBalance = rawBankRemaining != null ? Math.max(0, rawBankRemaining) : null;
  // Kartin sat 20 → −20 (spec v0.4.7 §3) — samo prikaz; korekcija se računa
  // iz istog izvora (activeCardSeconds) na završetku karte.
  const cardCountdown = isSurvive
    ? Math.max(-CARD_SECONDS, CARD_SECONDS - activeCardSeconds)
    : null;

  // s2/s12: big countdown above the card — challenge (per-card quota) and
  // sprint (overall countdown) share heatFor(fraction); survive's bank has
  // no fixed max, so it uses the absolute heatForAbsolute scale (S11).
  const hasBigCounter = isChallenge || isSprint || isSurvive;
  const counterSeconds = isSurvive ? displayBalance ?? 0 : quota.remainingSeconds;
  const counterHeat: Heat | null = isSurvive
    ? heatForAbsolute(displayBalance ?? 0)
    : hasBigCounter
      ? heatFor(quota.fraction)
      : null;
  const counterLabel = isChallenge
    ? t('workout.quotaCaption')
    : isSprint
      ? t('workout.timeLeft')
      : isSurvive
        ? t('workout.bankCaption')
        : '';
  // S12: vignette (inset shadow) is scoped to challenge-with-quota only —
  // sprint/survive get their own Task 13 variants.
  const vignetteOpacity =
    isChallenge && quota.fraction <= 0.25 ? Math.min(0.5, ((0.25 - quota.fraction) / 0.25) * 0.5) : 0;

  // s20: Blitz "CARDS CLEARED" chip — cards fully advanced past so far.
  const cardsCleared = currentIndex;
  // s20: TIME BANK gauge has no fixed max (S11), so BANK_START_SECONDS is
  // used purely as the visual 100% reference for the bar's width.
  const bankBarPct = isSurvive ? Math.min(100, ((displayBalance ?? 0) / BANK_START_SECONDS) * 100) : 0;
  const bankVignetteOpacity =
    isSurvive && (displayBalance ?? BANK_START_SECONDS) < 8
      ? Math.min(0.5, ((8 - (displayBalance ?? 0)) / 8) * 0.5)
      : 0;
  const activeVignetteOpacity = vignetteOpacity || bankVignetteOpacity;
  const dailyDateLabel = isDaily ? formatDailyDate(new Date(sessionStartedAt), locale) : '';

  useEffect(() => {
    if (hasShownHalfToastRef.current || currentIndex !== halfDeckIndex) return;
    hasShownHalfToastRef.current = true;
    setShowHalfToast(true);
    // Spec v0.4.8 §2: kratko iskoči i nestane — trajanje prati toastK animaciju.
    const timeoutId = window.setTimeout(() => setShowHalfToast(false), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [currentIndex, halfDeckIndex]);

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
      sessionId: clientSessionId ?? undefined,
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

  // Zajednička putanja kraja odmora (spec v0.4.7 §2): istek I preskok idu
  // istim kodom. Guarded by `pendingIndexRef` so it fires exactly once per
  // rest. Trajanje odmora se knjiži u restSecondsTotal (survive banka stoji).
  function endRest() {
    const pending = pendingIndexRef.current;
    if (pending === null) return;
    pendingIndexRef.current = null;
    setIsResting(false);
    setJokerBreaksTaken((n) => n + 1);
    setRestSecondsTotal(
      (total) => total + Math.max(0, stopwatch.elapsedSeconds - restStartElapsedRef.current)
    );
    if (isSurvive) setElapsedAtCardStart(stopwatch.elapsedSeconds);
    setCurrentIndex(pending);
    setIsAdvancing(false);
  }

  useEffect(() => {
    if (!isResting || !restQuota.expired) return;
    endRest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResting, restQuota.expired, stopwatch.elapsedSeconds]);

  // On the Clock: banka curi u realnom vremenu — bankrot mora da okine i BEZ
  // klika na kartu (spec v0.4.7 §3). Ref čuva od dvostrukog završetka.
  useEffect(() => {
    if (!isSurvive || isResting || isAdvancing || rawBankRemaining == null) return;
    if (rawBankRemaining > 0 || bankruptFiredRef.current) return;
    bankruptFiredRef.current = true;
    void finishSession(completedDraws, { survivedCards: currentIndex, survivedAll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSurvive, isResting, isAdvancing, rawBankRemaining]);

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
      // Spec v0.4.7 §3: korekcija = preostalo na kartinom satu (clamp ±20),
      // sabira se/oduzima od banke koja inače curi u realnom vremenu.
      const adjustment = cardAdjustment(activeCardSeconds);
      const newAdjustments = bankAdjustments + adjustment;
      const remainingAfter = bankRemaining(
        newAdjustments,
        stopwatch.elapsedSeconds - restSecondsTotal
      );
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

      if (nextIndex >= queue.length) {
        bankruptFiredRef.current = true;
        await finishSession(nextDraws, {
          survivedCards: nextIndex,
          survivedAll: !isBankrupt(remainingAfter),
        });
        return;
      }
      if (isBankrupt(remainingAfter)) {
        bankruptFiredRef.current = true;
        await finishSession(nextDraws, { survivedCards: nextIndex, survivedAll: false });
        return;
      }

      setBankAdjustments(newAdjustments);
      if (isJokerBreak(nextIndex, jokerBreaks)) {
        pendingIndexRef.current = nextIndex;
        restStartElapsedRef.current = stopwatch.elapsedSeconds;
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
      restStartElapsedRef.current = stopwatch.elapsedSeconds;
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
      {activeVignetteOpacity > 0 && (
        <div
          data-testid="danger-vignette"
          className="absolute inset-0 pointer-events-none z-[3] transition-[box-shadow] duration-300"
          style={{ boxShadow: `inset 0 0 90px rgba(255,64,52,${activeVignetteOpacity})` }}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {isDaily ? (
            <div
              data-testid="daily-chip"
              className="flex items-center gap-2 bg-[#232327] border rounded-full px-3 py-1.5"
              style={{ borderColor: 'rgba(185,168,255,.4)' }}
            >
              <span className="text-sm">🎲</span>
              <span
                className="font-extrabold text-[11px] tracking-[0.1em] uppercase whitespace-nowrap"
                style={{ color: 'var(--color-joker)' }}
              >
                {t('workout.dailyDealChip', { date: dailyDateLabel })}
              </span>
            </div>
          ) : isSprint ? (
            <>
              <LiveDot paused={stopwatch.isPaused} color="var(--color-heat-warn)" />
              <span
                className="font-extrabold text-xs tracking-[0.14em] uppercase whitespace-nowrap"
                style={{ color: 'var(--color-heat-warn)' }}
              >
                {t('modes.sprint.title')} · {t('modes.sprint.duration', { minutes: config.sprintMinutes ?? 0 })}
              </span>
            </>
          ) : isSurvive ? (
            <>
              <LiveDot paused={stopwatch.isPaused} color="var(--color-heat-danger)" />
              <span
                className="font-extrabold text-xs tracking-[0.14em] uppercase whitespace-nowrap"
                style={{ color: 'var(--color-heat-danger)' }}
              >
                {t('modes.survive.title')}
              </span>
            </>
          ) : (
            <>
              <LiveDot paused={stopwatch.isPaused} />
              <span className="font-extrabold text-xs tracking-[0.14em] text-muted uppercase">
                {t('workout.cardOf', { current: currentIndex + 1, total: queue.length })}
              </span>
            </>
          )}
        </div>
        <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} paused={stopwatch.isPaused} />
      </div>

      <SegmentBar total={queue.length} current={currentIndex} />

      {showHalfToast && (
        <div
          className="fixed left-1/2 bottom-32 z-20 bg-[#232327] border border-accent/40 rounded-full px-[18px] py-2.5 text-[13px] font-black tracking-[0.08em] text-accent whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.5)] -translate-x-1/2 motion-safe:animate-[toastK_1.5s_cubic-bezier(.2,.9,.3,1.2)_both]"
          role="status"
        >
          {t('workout.halfDeckDown')}
        </div>
      )}

      <div className="flex-1 flex flex-col mt-4">
        {isResting ? (
          <JokerRestScreen remainingSeconds={restQuota.remainingSeconds} onSkip={endRest} />
        ) : (
          <>
            {hasBigCounter && (
              <div className="text-center mb-3" data-testid="quota-counter" data-heat={counterHeat ?? undefined}>
                <div
                  className={`font-black text-[54px] leading-none tabular-nums ${
                    counterHeat === 'danger' ? 'motion-safe:animate-[panicK_1s_ease-in-out_infinite]' : ''
                  }`}
                  style={{ color: counterHeat ? HEAT_COLOR[counterHeat] : undefined, transition: 'color .3s' }}
                >
                  {formatMinSec(counterSeconds)}
                </div>
                <div className="text-[10px] font-extrabold tracking-[0.24em] text-muted uppercase mt-1">
                  {counterLabel}
                </div>
              </div>
            )}

            {isSprint && (
              <>
                <div className="h-1.5 rounded-full bg-[#26262a] overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-[width,background] duration-300"
                    style={{
                      width: `${Math.round(quota.fraction * 100)}%`,
                      background: counterHeat ? HEAT_COLOR[counterHeat] : undefined,
                    }}
                  />
                </div>
                <div className="flex justify-center mb-3">
                  <div
                    data-testid="cards-cleared-chip"
                    className="flex items-center gap-2 bg-[#232327] border rounded-full px-[18px] py-2"
                    style={{ borderColor: 'rgba(255,179,64,.3)' }}
                  >
                    <span className="font-black text-[17px] tabular-nums" style={{ color: 'var(--color-heat-warn)' }}>
                      {cardsCleared}
                    </span>
                    <span className="font-extrabold text-[10px] tracking-[0.14em] text-muted uppercase">
                      {t('workout.cardsCleared')}
                    </span>
                  </div>
                </div>
              </>
            )}

            {isSurvive && (
              <>
                <div className="h-3.5 rounded-full bg-[#26262a] overflow-hidden border border-[#2e2e33] mb-2">
                  <div
                    data-testid="bank-bar-fill"
                    className="h-full rounded-full transition-[width,background] duration-300"
                    style={{
                      width: `${bankBarPct}%`,
                      background: counterHeat ? HEAT_COLOR[counterHeat] : undefined,
                      boxShadow: counterHeat ? `0 0 14px ${HEAT_COLOR[counterHeat]}` : undefined,
                    }}
                  />
                </div>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-[11px] font-extrabold text-accent">{t('workout.everyCardFeedsBank')}</span>
                  <span className="text-[11px] font-extrabold text-muted">·</span>
                  <span className="text-[11px] font-extrabold" style={{ color: 'var(--color-heat-danger)' }}>
                    {t('workout.emptyBankGameOver')}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 mb-3" data-testid="card-clock">
                  <span
                    className="font-black text-xl tabular-nums"
                    style={{
                      color:
                        (cardCountdown ?? 0) >= 0 ? 'var(--color-accent)' : 'var(--color-heat-danger)',
                    }}
                  >
                    {(cardCountdown ?? 0) >= 0 ? `+${cardCountdown}s` : `${cardCountdown}s`}
                  </span>
                  <span className="text-[10px] font-extrabold tracking-[0.2em] text-muted uppercase">
                    {t('workout.cardClockCaption')}
                  </span>
                </div>
              </>
            )}

            {isChallenge ? (
              <CardDisplay
                exerciseName={localizedName(current.exercise, locale)}
                reps={current.reps}
                suit={current.card.suit}
                rank={current.card.rank}
                dealKey={currentIndex}
                outcomeFlash={outcomeFlash}
                disabled={nextDisabled}
                onTap={handleNext}
                ringFraction={quota.fraction}
              />
            ) : (
              <div className="flex-1 flex flex-col">
                <CardDisplay
                  exerciseName={localizedName(current.exercise, locale)}
                  reps={current.reps}
                  suit={current.card.suit}
                  rank={current.card.rank}
                  dealKey={currentIndex}
                  outcomeFlash={outcomeFlash}
                  disabled={nextDisabled}
                  onTap={handleNext}
                />
              </div>
            )}
          </>
        )}
      </div>

      {saveState === 'failed' && (
        <p className="text-sm text-red-500 text-center mt-4">{t('workout.saveFailed')}</p>
      )}

      {confirmQuit && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={t('workout.quitTitle')}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(10,10,13,.72)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-[390px] rounded-3xl p-6"
            style={{
              background: 'linear-gradient(160deg,#26262b,#1d1d20)',
              border: '1px solid rgba(255,81,71,.4)',
              boxShadow: '0 24px 50px rgba(0,0,0,.6)',
            }}
          >
            <p className="text-[20px] font-black text-center">{t('workout.quitTitle')}</p>
            <p className="text-[13px] font-bold text-muted text-center leading-relaxed mt-3">
              {t('workout.quitBody')}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setConfirmQuit(false)}
                className="flex-1 font-extrabold text-sm tracking-[0.08em] py-3.5 rounded-2xl bg-accent text-background"
              >
                {t('workout.quitCancel')}
              </button>
              <button
                type="button"
                data-testid="quit-confirm"
                onClick={() => void handleAbortConfirmed()}
                className="flex-1 font-extrabold text-sm tracking-[0.08em] py-3.5 rounded-2xl border text-foreground"
                style={{ borderColor: 'rgba(255,81,71,.5)', color: 'var(--color-heat-danger)' }}
              >
                {t('workout.quitConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isResting && (
        <p className="text-center text-[13px] font-bold text-muted mt-5">
          {isDaily ? t('workout.dailyFooter', { count: queue.length }) : t('workout.hint')}
        </p>
      )}

      {/* Spec v0.4.8 §3/§4: karta je kontrola za "sledeću"; dole široka
          narandžasta Pauza + crveni ✕ za prekid. */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={stopwatch.isPaused ? handleResume : handleManualPause}
          className="flex-1 rounded-[18px] p-5 font-extrabold text-base"
          style={{
            background: 'var(--color-heat-warn)',
            color: 'var(--color-background)',
            boxShadow: '0 0 24px rgba(255,179,64,.25)',
          }}
        >
          {stopwatch.isPaused ? t('workout.resume') : t('workout.pause')}
        </button>
        {onAbort && (
          <button
            type="button"
            onClick={() => setConfirmQuit(true)}
            aria-label={t('workout.quitAria')}
            data-testid="quit-button"
            className="flex-none w-[64px] rounded-[18px] border-2 font-black text-xl"
            style={{
              borderColor: 'rgba(255,81,71,.5)',
              color: 'var(--color-heat-danger)',
              background: 'rgba(255,81,71,.08)',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {stopwatch.isPaused && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[18px] bg-[rgba(10,10,13,0.78)] backdrop-blur-[9px]"
          data-testid="pause-overlay"
        >
          <div className="relative flex h-[170px] w-[170px] items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border border-dashed motion-safe:animate-[spinK_32s_linear_infinite]"
              style={{ borderColor: 'rgba(204,255,0,0.35)' }}
            />
            <p className="ml-[0.22em] text-[30px] font-black tracking-[0.22em] text-foreground motion-safe:animate-[pausebr_4.5s_ease-in-out_infinite]">
              {t('workout.paused')}
            </p>
          </div>
          <p className="text-sm font-bold text-muted">{t('pause.breathe')}</p>
          {pauseOrigin === 'auto' && (
            <p className="text-sm font-semibold text-muted">{t('pause.autoLabel')}</p>
          )}
          <button
            onClick={handleResume}
            className="rounded-full bg-accent px-10 py-3.5 text-sm font-black tracking-[0.14em] text-background shadow-[0_0_34px_rgba(204,255,0,0.3)]"
          >
            {t('pause.backIn')}
          </button>
        </div>
      )}
    </div>
  );
}
