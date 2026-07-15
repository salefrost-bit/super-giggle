'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntrySelector } from './EntrySelector';
import { ModeSelector } from './ModeSelector';
import { DifficultySelector } from './DifficultySelector';
import { ExercisePicker } from './ExercisePicker';
import { SessionLengthSelector } from './SessionLengthSelector';
import { CustomSetup } from './CustomSetup';
import {
  fetchCategories,
  fetchExercisesByDifficulty,
  fetchAllExercises,
  fetchDifficultyLevels,
  categoryKeyForName,
} from '@/lib/supabase/queries';
import { MODES } from '@/lib/modes/registry';
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
  EntryPath,
} from '@/lib/domain/types';

type Step =
  | 'entry'
  | 'quick-difficulty'
  | 'quick-length'
  | 'custom-exercises'
  | 'custom-sliders'
  | 'challenge-menu'
  | 'mode-difficulty'
  | 'mode-exercises'
  | 'mode-length';

function pickDefaults(exercises: Exercise[], categories: Category[]): Record<CategoryKey, Exercise> {
  const result = {} as Record<CategoryKey, Exercise>;
  for (const category of categories) {
    const key = categoryKeyForName(category.name);
    const def = exercises.find((e) => e.categoryId === category.id && e.isDefault);
    if (!def) throw new Error(`No default exercise for category ${category.name}`);
    result[key] = def;
  }
  return result;
}

function stepNumberFor(step: Step): number {
  const map: Record<Step, number> = {
    entry: 1,
    'quick-difficulty': 2,
    'quick-length': 3,
    'custom-exercises': 2,
    'custom-sliders': 2,
    'challenge-menu': 2,
    'mode-difficulty': 3,
    'mode-exercises': 4,
    'mode-length': 5,
  };
  return map[step];
}

function totalStepsFor(step: Step, entry: EntryPath | null): number {
  if (step === 'entry') return 3;
  if (entry === 'quick') return 3;
  if (entry === 'custom') return 2;
  if (entry === 'challenge') return 5;
  return 3;
}

interface SetupScreenProps {
  onStart: (config: SessionConfig, draws: CardDrawResult[]) => void;
  onBack?: () => void;
  userId?: string | null;
}

export function SetupScreen({ onStart, onBack, userId }: SetupScreenProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>('entry');
  const [entry, setEntry] = useState<EntryPath | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseByCategory, setExerciseByCategory] = useState<Record<
    CategoryKey,
    Exercise
  > | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  async function handleEntrySelect(path: EntryPath) {
    setEntry(path);
    if (path === 'quick') {
      setStep('quick-difficulty');
    } else if (path === 'custom') {
      const fetched = await fetchAllExercises();
      setAllExercises(fetched);
      setStep('custom-exercises');
    } else {
      setStep('challenge-menu');
    }
  }

  async function handleQuickDifficultySelect(level: DifficultyLevel) {
    setDifficulty(level);
    const fetchedExercises = await fetchExercisesByDifficulty(level.id);
    setExerciseByCategory(pickDefaults(fetchedExercises, categories));
    setStep('quick-length');
  }

  async function handleModeDifficultySelect(level: DifficultyLevel) {
    setDifficulty(level);
    const fetchedExercises = await fetchExercisesByDifficulty(level.id);
    setExercises(fetchedExercises);
    setStep('mode-exercises');
  }

  function handleExercisesComplete(selection: Record<CategoryKey, Exercise>) {
    setExerciseByCategory(selection);
    setStep('mode-length');
  }

  async function handleCustomStart(
    selection: Record<CategoryKey, Exercise>,
    repMultiplier: number,
    cardCount: number
  ) {
    const levels = await fetchDifficultyLevels();
    const difficulty = levels.reduce((best, level) =>
      Math.abs(level.defaultRepMultiplier - repMultiplier) <
      Math.abs(best.defaultRepMultiplier - repMultiplier)
        ? level
        : best
    );
    const cards = drawSessionCards(cardCount);
    const draws: CardDrawResult[] = cards.map((card, index) => {
      const categoryKey = SUIT_TO_CATEGORY[card.suit];
      return {
        orderIndex: index,
        card,
        categoryKey,
        exercise: selection[categoryKey],
        reps: calculateReps(card, repMultiplier),
        completedAt: null,
      };
    });

    onStart(
      {
        difficultyLevelId: difficulty.id,
        repMultiplier,
        deckSize: cardCount,
        exerciseByCategory: selection,
        entry: 'custom',
        gameMode: 'classic',
      },
      draws
    );
  }

  async function handleLengthSelect(deckSize: DeckSize) {
    if (!difficulty || !exerciseByCategory || !entry) return;
    const cards = drawSessionCards(deckSize);
    const mode = entry === 'quick' ? 'classic' : gameMode;
    const draws: CardDrawResult[] = cards.map((card, index) => {
      const categoryKey = SUIT_TO_CATEGORY[card.suit];
      return {
        orderIndex: index,
        card,
        categoryKey,
        exercise: exerciseByCategory[categoryKey],
        reps: calculateReps(card, difficulty.defaultRepMultiplier),
        completedAt: null,
        beatQuota: mode === 'perfect_deck' ? null : undefined,
      };
    });

    const config: SessionConfig = {
      difficultyLevelId: difficulty.id,
      repMultiplier: difficulty.defaultRepMultiplier,
      deckSize,
      exerciseByCategory,
      entry,
      gameMode: mode,
    };

    if (mode === 'perfect_deck') {
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
    switch (step) {
      case 'entry':
        onBack?.();
        break;
      case 'quick-difficulty':
        setStep('entry');
        break;
      case 'quick-length':
        setStep('quick-difficulty');
        break;
      case 'custom-exercises':
      case 'custom-sliders':
        setStep('entry');
        break;
      case 'challenge-menu':
        setStep('entry');
        break;
      case 'mode-difficulty':
        setStep('challenge-menu');
        break;
      case 'mode-exercises':
        setStep('mode-difficulty');
        break;
      case 'mode-length':
        setStep('mode-exercises');
        break;
    }
  }

  const stepNumber = stepNumberFor(step);
  const totalSteps = totalStepsFor(step, entry);

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
        <div className="text-sm font-bold text-muted">
          {t('setup.step', { current: stepNumber, total: totalSteps })}
        </div>
      </div>
      <div className="flex gap-1.5 mt-3.5 mb-7">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className={`flex-1 h-[5px] rounded-[3px] ${n <= stepNumber ? 'bg-accent' : 'bg-surface'}`}
          />
        ))}
      </div>
      {step === 'entry' && <EntrySelector onSelect={handleEntrySelect} />}
      {step === 'quick-difficulty' && (
        <DifficultySelector onSelect={handleQuickDifficultySelect} />
      )}
      {step === 'quick-length' && <SessionLengthSelector onSelect={handleLengthSelect} />}
      {step === 'custom-exercises' && (
        <CustomSetup
          categories={categories}
          exercises={allExercises}
          onStart={handleCustomStart}
        />
      )}
      {step === 'challenge-menu' && (
        <ModeSelector
          modes={MODES.filter((m) => m.isChallenge)}
          onSelect={(m) => {
            setGameMode(m);
            setStep('mode-difficulty');
          }}
        />
      )}
      {step === 'mode-difficulty' && (
        <DifficultySelector onSelect={handleModeDifficultySelect} />
      )}
      {step === 'mode-exercises' && (
        <ExercisePicker
          categories={categories}
          exercises={exercises}
          onComplete={handleExercisesComplete}
        />
      )}
      {step === 'mode-length' && <SessionLengthSelector onSelect={handleLengthSelect} />}
    </div>
  );
}
