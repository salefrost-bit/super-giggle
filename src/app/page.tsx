'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { SetupScreen } from '@/components/setup/SetupScreen';
import { SessionScreen } from '@/components/session/SessionScreen';
import { SummaryScreen } from '@/components/summary/SummaryScreen';
import { ProgressScreen } from '@/components/progress/ProgressScreen';
import {
  fetchCategories,
  buildCategoryIdByKey,
  fetchAllExercises,
  fetchDifficultyLevels,
} from '@/lib/supabase/queries';
import { getBestDurationSeconds, getBestScore } from '@/lib/supabase/records';
import { InfoModal } from '@/components/ui/InfoModal';
import { hasSeenExplanation, markExplained } from '@/lib/modes/explained';
import { loadLastConfig, validateLastConfig } from '@/lib/domain/lastConfig';
import { drawSessionCards } from '@/lib/domain/deck';
import { calculateReps } from '@/lib/domain/reps';
import { calculateParSeconds, resolveBudget } from '@/lib/domain/challenge';
import { SUIT_TO_CATEGORY } from '@/lib/domain/types';
import type { CardDrawResult, CategoryKey, Exercise, SessionConfig, SessionResult } from '@/lib/domain/types';

type Screen = 'landing' | 'setup' | 'session' | 'summary' | 'history';

export default function Home() {
  const t = useTranslations();
  const { user, isLoading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [draws, setDraws] = useState<CardDrawResult[]>([]);
  const [categoryIdByKey, setCategoryIdByKey] = useState<Record<CategoryKey, string> | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [showChallengeIntro, setShowChallengeIntro] = useState(false);
  const [canRepeatLast, setCanRepeatLast] = useState(false);

  useEffect(() => {
    if (screen !== 'landing') return;
    const last = loadLastConfig();
    if (!last || (last.gameMode !== 'classic' && last.gameMode !== 'perfect_deck')) {
      setCanRepeatLast(false);
      return;
    }
    Promise.all([fetchAllExercises(), fetchDifficultyLevels()])
      .then(([exercises]) => {
        setCanRepeatLast(validateLastConfig(last, exercises));
      })
      .catch(() => setCanRepeatLast(false));
  }, [screen]);

  if (isLoading) return <p className="p-6">{t('common.loading')}</p>;

  async function handleSetupStart(sessionConfig: SessionConfig, sessionDraws: CardDrawResult[]) {
    setConfig(sessionConfig);
    setDraws(sessionDraws);
    if (user) {
      const categories = await fetchCategories();
      setCategoryIdByKey(buildCategoryIdByKey(categories));
    }
    if (sessionConfig.gameMode === 'perfect_deck' && !hasSeenExplanation('perfect_deck')) {
      setShowChallengeIntro(true);
    }
    setScreen('session');
  }

  function handleSessionFinish(sessionResult: SessionResult) {
    setResult(sessionResult);
    setScreen('summary');
  }

  async function handleRepeatLast() {
    const last = loadLastConfig();
    if (!last || (last.gameMode !== 'classic' && last.gameMode !== 'perfect_deck')) return;

    const [allExercises, levels] = await Promise.all([
      fetchAllExercises(),
      fetchDifficultyLevels(),
    ]);
    if (!validateLastConfig(last, allExercises)) {
      setCanRepeatLast(false);
      return;
    }

    const difficulty = levels.find((level) => level.id === last.difficultyLevelId);
    if (!difficulty) {
      setCanRepeatLast(false);
      return;
    }

    const categoryKeys: CategoryKey[] = ['push', 'pull', 'legs', 'core'];
    const exerciseByCategory = {} as Record<CategoryKey, Exercise>;
    for (const key of categoryKeys) {
      const exercise = allExercises.find((item) => item.id === last.exerciseIds[key]);
      if (!exercise) {
        setCanRepeatLast(false);
        return;
      }
      exerciseByCategory[key] = exercise;
    }

    const cards = drawSessionCards(last.deckSize);
    const mode = last.gameMode;
    const draws: CardDrawResult[] = cards.map((card, index) => {
      const categoryKey = SUIT_TO_CATEGORY[card.suit];
      return {
        orderIndex: index,
        card,
        categoryKey,
        exercise: exerciseByCategory[categoryKey],
        reps: calculateReps(card, last.repMultiplier),
        completedAt: null,
        beatQuota: mode === 'perfect_deck' ? null : undefined,
      };
    });

    const sessionConfig: SessionConfig = {
      difficultyLevelId: last.difficultyLevelId,
      repMultiplier: last.repMultiplier,
      deckSize: last.deckSize,
      exerciseByCategory,
      entry: last.entry,
      gameMode: mode,
    };

    if (mode === 'perfect_deck') {
      const totalReps = draws.reduce((sum, draw) => sum + draw.reps, 0);
      const par = calculateParSeconds(totalReps, last.deckSize, difficulty);
      let record: number | null = null;
      let bestScore: number | null = null;
      if (user?.id) {
        try {
          [record, bestScore] = await Promise.all([
            getBestDurationSeconds(user.id, last.difficultyLevelId, last.deckSize),
            getBestScore(user.id, last.difficultyLevelId, last.deckSize),
          ]);
        } catch (err) {
          console.error('Failed to fetch record/best score, falling back to par', err);
        }
      }
      const { budgetSeconds, parSource } = resolveBudget(par, record);
      sessionConfig.budgetSeconds = budgetSeconds;
      sessionConfig.parSource = parSource;
      sessionConfig.bestScoreForCombo = bestScore;
      sessionConfig.parSecondsPerRep = difficulty.parSecondsPerRep;
      sessionConfig.parTransitionSeconds = difficulty.parTransitionSeconds;
    }

    await handleSetupStart(sessionConfig, draws);
  }

  if (screen === 'landing') {
    return (
      <LandingScreen
        user={user}
        onStartWorkout={() => setScreen('setup')}
        onRepeatLast={canRepeatLast ? handleRepeatLast : undefined}
        onShowHistory={() => setScreen('history')}
        onSignOut={signOut}
      />
    );
  }
  if (screen === 'setup') {
    return (
      <SetupScreen
        onStart={handleSetupStart}
        onBack={() => setScreen('landing')}
        userId={user?.id ?? null}
      />
    );
  }
  if (screen === 'session' && config) {
    if (showChallengeIntro) {
      // First perfect_deck run on this device: explain the rules BEFORE the
      // session (and its timers) exist. Dismissal mounts SessionScreen fresh.
      return (
        <InfoModal
          title={t('setup.challengeTitle')}
          closeLabel={t('modes.firstRunCta')}
          onClose={() => {
            markExplained('perfect_deck');
            setShowChallengeIntro(false);
          }}
        >
          {t('modes.perfect_deck.explanation')}
        </InfoModal>
      );
    }
    return (
      <SessionScreen
        config={config}
        draws={draws}
        categoryIdByKey={categoryIdByKey}
        userId={user?.id ?? null}
        onFinish={handleSessionFinish}
      />
    );
  }
  if (screen === 'summary' && result) {
    return (
      <SummaryScreen
        result={result}
        isGuest={!user}
        config={config}
        userId={user?.id ?? null}
        onDone={() => setScreen('landing')}
      />
    );
  }
  if (screen === 'history' && user) {
    return <ProgressScreen userId={user.id} onBack={() => setScreen('landing')} />;
  }
  return null;
}
