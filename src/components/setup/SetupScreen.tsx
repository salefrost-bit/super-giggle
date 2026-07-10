'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModeSelector } from './ModeSelector';
import { DifficultySelector } from './DifficultySelector';
import { ExercisePicker } from './ExercisePicker';
import { SessionLengthSelector } from './SessionLengthSelector';
import { fetchCategories, fetchExercisesByDifficulty } from '@/lib/supabase/queries';
import { drawSessionCards } from '@/lib/domain/deck';
import { calculateReps } from '@/lib/domain/reps';
import { calculateParSeconds, resolveBudget } from '@/lib/domain/challenge';
import { getBestDurationSeconds, getBestScore } from '@/lib/supabase/records';
import { SUIT_TO_CATEGORY } from '@/lib/domain/types';
import type {
  Category,
  CategoryKey,
  DeckSize,
  DifficultyLevel,
  Exercise,
  CardDrawResult,
  SessionConfig,
  GameMode,
} from '@/lib/domain/types';

type Step = 'mode' | 'difficulty' | 'exercises' | 'length';

const STEP_NUMBER: Record<Step, number> = { mode: 1, difficulty: 2, exercises: 3, length: 4 };

interface SetupScreenProps {
  onStart: (config: SessionConfig, draws: CardDrawResult[]) => void;
  onBack?: () => void;
  userId?: string | null;
}

export function SetupScreen({ onStart, onBack, userId }: SetupScreenProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>('mode');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseByCategory, setExerciseByCategory] = useState<Record<
    CategoryKey,
    Exercise
  > | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  async function handleDifficultySelect(level: DifficultyLevel) {
    setDifficulty(level);
    const fetchedExercises = await fetchExercisesByDifficulty(level.id);
    setExercises(fetchedExercises);
    setStep('exercises');
  }

  function handleExercisesComplete(selection: Record<CategoryKey, Exercise>) {
    setExerciseByCategory(selection);
    setStep('length');
  }

  async function handleLengthSelect(deckSize: DeckSize) {
    if (!difficulty || !exerciseByCategory) return;
    const cards = drawSessionCards(deckSize);
    const draws: CardDrawResult[] = cards.map((card, index) => {
      const categoryKey = SUIT_TO_CATEGORY[card.suit];
      return {
        orderIndex: index,
        card,
        categoryKey,
        exercise: exerciseByCategory[categoryKey],
        reps: calculateReps(card, difficulty.defaultRepMultiplier),
        completedAt: null,
        beatQuota: gameMode === 'perfect_deck' ? null : undefined,
      };
    });

    const config: SessionConfig = {
      difficultyLevelId: difficulty.id,
      repMultiplier: difficulty.defaultRepMultiplier,
      deckSize,
      exerciseByCategory,
      gameMode,
    };

    if (gameMode === 'perfect_deck') {
      const totalReps = draws.reduce((sum, d) => sum + d.reps, 0);
      const par = calculateParSeconds(totalReps, deckSize, difficulty);
      let record: number | null = null;
      let bestScore: number | null = null;
      if (userId) {
        try {
          [record, bestScore] = await Promise.all([
            getBestDurationSeconds(userId, difficulty.id, deckSize),
            getBestScore(userId, difficulty.id, deckSize),
          ]);
        } catch (err) {
          console.error('Failed to fetch record/best score, falling back to par', err);
        }
      }
      const { budgetSeconds, parSource } = resolveBudget(par, record);
      config.budgetSeconds = budgetSeconds;
      config.parSource = parSource;
      config.bestScoreForCombo = bestScore;
      config.parSecondsPerRep = difficulty.parSecondsPerRep;
      config.parTransitionSeconds = difficulty.parTransitionSeconds;
    }

    onStart(config, draws);
  }

  function handleBack() {
    if (step === 'length') setStep('exercises');
    else if (step === 'exercises') setStep('difficulty');
    else if (step === 'difficulty') setStep('mode');
    else onBack?.();
  }

  const stepNumber = STEP_NUMBER[step];

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-2">
        <button
          onClick={handleBack}
          aria-label={t('common.back')}
          className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold"
        >
          ←
        </button>
        <div className="text-sm font-bold text-muted">{t('setup.step', { current: stepNumber, total: 4 })}</div>
      </div>
      <div className="flex gap-1.5 mt-3.5 mb-7">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`flex-1 h-[5px] rounded-[3px] ${n <= stepNumber ? 'bg-accent' : 'bg-surface'}`}
          />
        ))}
      </div>
      {step === 'mode' && (
        <ModeSelector
          onSelect={(m) => {
            setGameMode(m);
            setStep('difficulty');
          }}
        />
      )}
      {step === 'difficulty' && <DifficultySelector onSelect={handleDifficultySelect} />}
      {step === 'exercises' && (
        <ExercisePicker
          categories={categories}
          exercises={exercises}
          onComplete={handleExercisesComplete}
        />
      )}
      {step === 'length' && <SessionLengthSelector onSelect={handleLengthSelect} />}
    </div>
  );
}
