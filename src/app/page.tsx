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
import { MODES } from '@/lib/modes/registry';
import { loadLastConfig, validateLastConfig } from '@/lib/domain/lastConfig';
import { drawSessionCards, createCourtDeck } from '@/lib/domain/deck';
import { buildDraws } from '@/lib/domain/draws';
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
    let cancelled = false;

    async function checkRepeatAvailable() {
      const last = loadLastConfig();
      if (
        !last ||
        (last.gameMode !== 'classic' &&
          last.gameMode !== 'perfect_deck' &&
          last.gameMode !== 'sprint' &&
          last.gameMode !== 'court' &&
          last.gameMode !== 'survive')
      ) {
        if (!cancelled) setCanRepeatLast(false);
        return;
      }
      try {
        const [exercises] = await Promise.all([fetchAllExercises(), fetchDifficultyLevels()]);
        if (!cancelled) setCanRepeatLast(validateLastConfig(last, exercises));
      } catch {
        if (!cancelled) setCanRepeatLast(false);
      }
    }

    void checkRepeatAvailable();
    return () => {
      cancelled = true;
    };
  }, [screen]);

  if (isLoading) return <p className="p-6">{t('common.loading')}</p>;

  async function handleSetupStart(sessionConfig: SessionConfig, sessionDraws: CardDrawResult[]) {
    setConfig(sessionConfig);
    setDraws(sessionDraws);
    if (user) {
      const categories = await fetchCategories();
      setCategoryIdByKey(buildCategoryIdByKey(categories));
    }
    const modeDef = MODES.find((m) => m.id === sessionConfig.gameMode);
    if (modeDef?.isChallenge && sessionConfig.gameMode && !hasSeenExplanation(sessionConfig.gameMode)) {
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
    if (
      !last ||
      (last.gameMode !== 'classic' &&
        last.gameMode !== 'perfect_deck' &&
        last.gameMode !== 'sprint' &&
        last.gameMode !== 'court' &&
        last.gameMode !== 'survive')
    ) {
      return;
    }

    const [allExercises, levels] = await Promise.all([
      fetchAllExercises(),
      fetchDifficultyLevels(),
    ]);
    if (!validateLastConfig(last, allExercises)) {
      setCanRepeatLast(false);
      return;
    }

    const difficulty = levels.find((level) => level.id === last.difficultyLevelId);
    if (!difficulty && last.gameMode !== 'sprint') {
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

    if (last.gameMode === 'sprint') {
      if (last.sprintMinutes == null) {
        setCanRepeatLast(false);
        return;
      }
      const sprintDifficulty =
        difficulty ?? levels.find((level) => level.defaultRepMultiplier === 1.0);
      if (!sprintDifficulty) {
        setCanRepeatLast(false);
        return;
      }
      const cards = drawSessionCards(52);
      const sessionDraws = buildDraws(cards, exerciseByCategory, 1.0, false);
      await handleSetupStart(
        {
          difficultyLevelId: sprintDifficulty.id,
          repMultiplier: 1.0,
          deckSize: 52,
          exerciseByCategory,
          entry: last.entry,
          gameMode: 'sprint',
          sprintMinutes: last.sprintMinutes,
        },
        sessionDraws
      );
      return;
    }

    if (!difficulty) {
      setCanRepeatLast(false);
      return;
    }

    const cards = last.gameMode === 'court' ? createCourtDeck() : drawSessionCards(last.deckSize);
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
        beatQuota: mode === 'perfect_deck' || mode === 'court' ? null : undefined,
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
    } else if (mode === 'court') {
      const totalReps = draws.reduce((sum, draw) => sum + draw.reps, 0);
      const par = calculateParSeconds(totalReps, 16, difficulty);
      sessionConfig.budgetSeconds = par;
      sessionConfig.parSource = 'par';
      sessionConfig.parSecondsPerRep = difficulty.parSecondsPerRep;
      sessionConfig.parTransitionSeconds = difficulty.parTransitionSeconds;
    } else if (mode === 'survive') {
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
      const modeDef = MODES.find((m) => m.id === config.gameMode);
      return (
        <InfoModal
          title={t(modeDef?.titleKey ?? 'setup.challengeTitle')}
          closeLabel={t('modes.firstRunCta')}
          onClose={() => {
            if (config.gameMode) markExplained(config.gameMode);
            setShowChallengeIntro(false);
          }}
        >
          {t(modeDef?.explanationKey ?? 'modes.perfect_deck.explanation')}
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
