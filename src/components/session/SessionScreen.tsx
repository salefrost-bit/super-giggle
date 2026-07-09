'use client';

import { useEffect, useState } from 'react';
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
    <div className="flex flex-col items-center gap-6 p-6">
      <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
      <ProgressIndicator current={currentIndex + 1} total={draws.length} />
      <CardDisplay exerciseName={current.exercise.name} reps={current.reps} />
      {saveState === 'failed' && (
        <p className="text-sm text-red-600">
          Čuvanje treninga trenutno ne radi — rezultat možda neće biti sačuvan u istoriji.
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={stopwatch.isPaused ? stopwatch.resume : stopwatch.pause}
          className="border rounded px-4 py-2"
        >
          {stopwatch.isPaused ? 'Nastavi' : 'Pauza'}
        </button>
        <button
          onClick={handleNext}
          disabled={nextDisabled}
          className="bg-blue-600 text-white rounded px-6 py-2 disabled:opacity-50"
        >
          {isWaitingForSession ? 'Priprema treninga...' : 'Sledeća karta'}
        </button>
      </div>
    </div>
  );
}
