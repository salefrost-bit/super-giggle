'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntrySelector } from './EntrySelector';
import { ModeSelector } from './ModeSelector';
import { DifficultySelector } from './DifficultySelector';
import { QuickDealSetup } from './QuickDealSetup';
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
import { drawSessionCards, createCourtDeck } from '@/lib/domain/deck';
import { buildDraws } from '@/lib/domain/draws';
import { buildDailySession } from '@/lib/domain/daily';
import { calculateParSeconds, resolveBudget } from '@/lib/domain/challenge';
import { getBestDurationSeconds, getBestScore } from '@/lib/supabase/records';
import type {
  Category,
  CategoryKey,
  DeckSize,
  DifficultyLevel,
  Exercise,
  ExerciseTier,
  CardDrawResult,
  SessionConfig,
  GameMode,
  EntryPath,
} from '@/lib/domain/types';

type Step =
  | 'entry'
  | 'quick'
  | 'custom-exercises'
  | 'custom-sliders'
  | 'challenge-menu'
  | 'mode-difficulty'
  | 'mode-exercises'
  | 'mode-length';

// Errata E5(2): Blitz nema svoju "srednju" težinu — repMultiplier je fiksiran
// na 1.0 u handleSprintStart, što odgovara "Srednji" (sortOrder 2) po seed-u
// (0002_seed.sql). ExercisePicker tier-tabovi za sprint startuju na tom tieru.
const SPRINT_INITIAL_TIER = 2;

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

function stepNumberFor(step: Step, gameMode: GameMode): number {
  // Errata E5(2): Blitz preskače 'mode-difficulty' (challenge-menu → mode-exercises).
  if (step === 'mode-exercises' && gameMode === 'sprint') return 3;
  const map: Record<Step, number> = {
    entry: 1,
    quick: 2,
    'custom-exercises': 2,
    'custom-sliders': 2,
    'challenge-menu': 2,
    'mode-difficulty': 3,
    'mode-exercises': 4,
    'mode-length': 5,
  };
  return map[step];
}

function totalStepsFor(step: Step, entry: EntryPath | null, gameMode: GameMode): number {
  if (step === 'entry') return 3;
  if (entry === 'quick') return 2;
  if (entry === 'custom') return 2;
  if (entry === 'challenge') {
    if (gameMode === 'sprint') return 3;
    if (gameMode === 'court' || gameMode === 'survive') return 4;
    if (gameMode === 'daily') return 2;
    return 5;
  }
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
  const [sprintMinutes, setSprintMinutes] = useState<number | null>(null);
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
      setStep('quick');
    } else if (path === 'custom') {
      const fetched = await fetchAllExercises();
      setAllExercises(fetched);
      setStep('custom-exercises');
    } else {
      setStep('challenge-menu');
    }
  }

  async function handleQuickStart(level: DifficultyLevel, deckSize: DeckSize) {
    const fetchedExercises = await fetchExercisesByDifficulty(level.id);
    const selection = pickDefaults(fetchedExercises, categories);
    setDifficulty(level);
    setExerciseByCategory(selection);
    await handleLengthSelect(deckSize, level, selection, 'quick');
  }

  async function handleModeDifficultySelect(level: DifficultyLevel) {
    setDifficulty(level);
    // P1: tier tabovi u ExercisePicker-u zahtevaju CELU biblioteku (posle
    // migracije 0007 jedna težina = tačno 1 tier = 2 vežbe po grupi, pa bi
    // 2 od 3 taba bila prazna sa fetchExercisesByDifficulty).
    const fetchedExercises = await fetchAllExercises();
    setExercises(fetchedExercises);
    setStep('mode-exercises');
  }

  function handleExercisesComplete(selection: Record<CategoryKey, Exercise>) {
    // Errata E5(2)/P1: Blitz nema svoju 'mode-length' ni 'sprint-exercises'
    // granu — ide direktno na start iz mode-exercises (kao court/survive).
    if (gameMode === 'sprint') {
      void handleSprintStart(selection);
      return;
    }
    if (gameMode === 'court') {
      handleCourtStart(selection);
      return;
    }
    if (gameMode === 'survive') {
      handleSurviveStart(selection);
      return;
    }
    setExerciseByCategory(selection);
    setStep('mode-length');
  }

  function handleSurviveStart(selection: Record<CategoryKey, Exercise>) {
    if (!difficulty) return;
    const deckSize = 52;
    const cards = drawSessionCards(deckSize);
    const sessionDraws = buildDraws(cards, selection, difficulty.defaultRepMultiplier, false);

    onStart(
      {
        difficultyLevelId: difficulty.id,
        repMultiplier: difficulty.defaultRepMultiplier,
        deckSize,
        exerciseByCategory: selection,
        entry: 'challenge',
        gameMode: 'survive',
        parSecondsPerRep: difficulty.parSecondsPerRep,
        parTransitionSeconds: difficulty.parTransitionSeconds,
      },
      sessionDraws
    );
  }

  function handleCourtStart(selection: Record<CategoryKey, Exercise>) {
    if (!difficulty) return;
    const cards = createCourtDeck();
    const sessionDraws = buildDraws(cards, selection, difficulty.defaultRepMultiplier, true);

    const totalReps = sessionDraws.reduce((sum, d) => sum + d.reps, 0);
    const par = calculateParSeconds(totalReps, 16, difficulty);

    onStart(
      {
        difficultyLevelId: difficulty.id,
        repMultiplier: difficulty.defaultRepMultiplier,
        deckSize: 16,
        exerciseByCategory: selection,
        entry: 'challenge',
        gameMode: 'court',
        budgetSeconds: par,
        parSource: 'par',
        parSecondsPerRep: difficulty.parSecondsPerRep,
        parTransitionSeconds: difficulty.parTransitionSeconds,
      },
      sessionDraws
    );
  }

  async function handleDailyStart() {
    const [allEx, levels] = await Promise.all([fetchAllExercises(), fetchDifficultyLevels()]);
    const { config, draws } = buildDailySession({
      exercises: allEx,
      categories,
      levels,
    });
    onStart(config, draws);
  }

  async function handleSprintExercisesStep(minutes: number) {
    setSprintMinutes(minutes);
    const fetchedExercises = await fetchAllExercises();
    setExercises(fetchedExercises);
    setStep('mode-exercises');
  }

  async function handleSprintStart(selection: Record<CategoryKey, Exercise>) {
    const levels = await fetchDifficultyLevels();
    const sprintDifficulty = levels.find((level) => level.defaultRepMultiplier === 1.0);
    if (!sprintDifficulty || sprintMinutes == null) return;

    const cards = drawSessionCards(52);
    const sessionDraws = buildDraws(cards, selection, 1.0, false);

    onStart(
      {
        difficultyLevelId: sprintDifficulty.id,
        repMultiplier: 1.0,
        deckSize: 52,
        exerciseByCategory: selection,
        entry: 'challenge',
        gameMode: 'sprint',
        sprintMinutes,
      },
      sessionDraws
    );
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
    const sessionDraws = buildDraws(cards, selection, repMultiplier, false);

    onStart(
      {
        difficultyLevelId: difficulty.id,
        repMultiplier,
        deckSize: cardCount,
        exerciseByCategory: selection,
        entry: 'custom',
        gameMode: 'classic',
      },
      sessionDraws
    );
  }

  async function handleLengthSelect(
    deckSize: DeckSize,
    levelOverride: DifficultyLevel | null = difficulty,
    exerciseByCategoryOverride: Record<CategoryKey, Exercise> | null = exerciseByCategory,
    entryOverride: EntryPath | null = entry
  ) {
    const level = levelOverride;
    const selection = exerciseByCategoryOverride;
    const currentEntry = entryOverride;
    if (!level || !selection || !currentEntry) return;
    const cards = drawSessionCards(deckSize);
    const mode = currentEntry === 'quick' ? 'classic' : gameMode;
    const sessionDraws = buildDraws(
      cards,
      selection,
      level.defaultRepMultiplier,
      mode === 'perfect_deck' || mode === 'court'
    );

    const config: SessionConfig = {
      difficultyLevelId: level.id,
      repMultiplier: level.defaultRepMultiplier,
      deckSize,
      exerciseByCategory: selection,
      entry: currentEntry,
      gameMode: mode,
    };

    if (mode === 'perfect_deck') {
      const totalReps = sessionDraws.reduce((sum, d) => sum + d.reps, 0);
      const par = calculateParSeconds(totalReps, deckSize, level);
      let record: number | null = null;
      let bestScore: number | null = null;
      if (userId) {
        try {
          [record, bestScore] = await Promise.all([
            getBestDurationSeconds(userId, level.id, deckSize),
            getBestScore(userId, level.id, deckSize),
          ]);
        } catch (err) {
          console.error('Failed to fetch record/best score, falling back to par', err);
        }
      }
      const { budgetSeconds, parSource } = resolveBudget(par, record);
      config.budgetSeconds = budgetSeconds;
      config.parSource = parSource;
      config.bestScoreForCombo = bestScore;
      config.parSecondsPerRep = level.parSecondsPerRep;
      config.parTransitionSeconds = level.parTransitionSeconds;
    }

    onStart(config, sessionDraws);
  }

  function handleBack() {
    switch (step) {
      case 'entry':
        onBack?.();
        break;
      case 'quick':
        setStep('entry');
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
        // Errata E5(2): Blitz nema 'mode-difficulty' korak, vraća se pravo na meni.
        setStep(gameMode === 'sprint' ? 'challenge-menu' : 'mode-difficulty');
        break;
      case 'mode-length':
        setStep('mode-exercises');
        break;
    }
  }

  const stepNumber = stepNumberFor(step, gameMode);
  const totalSteps = totalStepsFor(step, entry, gameMode);

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
      {step === 'quick' && <QuickDealSetup onStart={handleQuickStart} />}
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
          onSelect={(m, options) => {
            setGameMode(m);
            if (m === 'sprint') {
              void handleSprintExercisesStep(options?.minutes ?? 5);
            } else if (m === 'daily') {
              void handleDailyStart();
            } else {
              setStep('mode-difficulty');
            }
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
          initialTier={
            gameMode === 'sprint'
              ? SPRINT_INITIAL_TIER
              : (difficulty?.sortOrder as ExerciseTier | undefined)
          }
        />
      )}
      {step === 'mode-length' && <SessionLengthSelector onSelect={handleLengthSelect} />}
    </div>
  );
}
