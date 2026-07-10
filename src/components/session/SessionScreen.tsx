'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStopwatch } from '@/hooks/useStopwatch';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedDraws, setCompletedDraws] = useState<CardDrawResult[]>(draws);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SessionSaveState>(userId ? 'creating' : 'guest');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const stopwatch = useStopwatch();

  useEffect(() => {
    if (!userId || !categoryIdByKey) return;
    createSession({
      userId,
      config,
      categoryIdByKey,
      startedAtIso: new Date().toISOString(),
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

  async function handleNext() {
    setIsAdvancing(true);
    const completedAt = new Date().toISOString();
    const updatedDraw: CardDrawResult = { ...completedDraws[currentIndex], completedAt };
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
    if (nextIndex >= draws.length) {
      stopwatch.pause();
      const totalDurationSeconds = stopwatch.elapsedSeconds;
      if (userId && sessionId && saveState === 'ready') {
        try {
          await completeSession(sessionId, totalDurationSeconds);
        } catch (err) {
          console.error('Failed to complete session', err);
          setSaveState('failed');
        }
      }
      onFinish({ totalDurationSeconds, draws: nextDraws });
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
        <div className="w-10" />
        <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
        <ProgressIndicator current={currentIndex + 1} total={draws.length} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <CardDisplay
          exerciseName={current.exercise.name}
          reps={current.reps}
          suit={current.card.suit}
          rank={current.card.rank}
          categoryKey={current.categoryKey}
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
          onClick={stopwatch.isPaused ? stopwatch.resume : stopwatch.pause}
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
          <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
          <button
            onClick={stopwatch.resume}
            className="bg-accent text-background rounded-[18px] px-10 py-[18px] font-extrabold text-base"
          >
            {t('workout.resumeWorkout')}
          </button>
        </div>
      )}
    </div>
  );
}
