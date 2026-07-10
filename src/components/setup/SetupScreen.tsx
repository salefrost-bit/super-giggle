'use client';

import { useEffect, useState } from 'react';
import { DifficultySelector } from './DifficultySelector';
import { ExercisePicker } from './ExercisePicker';
import { SessionLengthSelector } from './SessionLengthSelector';
import { fetchCategories, fetchExercisesByDifficulty } from '@/lib/supabase/queries';
import { drawSessionCards } from '@/lib/domain/deck';
import { calculateReps } from '@/lib/domain/reps';
import { SUIT_TO_CATEGORY } from '@/lib/domain/types';
import type {
  Category,
  CategoryKey,
  DeckSize,
  DifficultyLevel,
  Exercise,
  CardDrawResult,
  SessionConfig,
} from '@/lib/domain/types';

type Step = 'difficulty' | 'exercises' | 'length';

const STEP_NUMBER: Record<Step, number> = { difficulty: 1, exercises: 2, length: 3 };

interface SetupScreenProps {
  onStart: (config: SessionConfig, draws: CardDrawResult[]) => void;
  onBack?: () => void;
}

export function SetupScreen({ onStart, onBack }: SetupScreenProps) {
  const [step, setStep] = useState<Step>('difficulty');
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

  function handleLengthSelect(deckSize: DeckSize) {
    if (!difficulty || !exerciseByCategory) return;
    const config: SessionConfig = {
      difficultyLevelId: difficulty.id,
      repMultiplier: difficulty.defaultRepMultiplier,
      deckSize,
      exerciseByCategory,
    };
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
      };
    });
    onStart(config, draws);
  }

  function handleBack() {
    if (step === 'length') setStep('exercises');
    else if (step === 'exercises') setStep('difficulty');
    else onBack?.();
  }

  const stepNumber = STEP_NUMBER[step];

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-2">
        <button
          onClick={handleBack}
          aria-label="Nazad"
          className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold"
        >
          ←
        </button>
        <div className="text-sm font-bold text-muted">Korak {stepNumber}/3</div>
      </div>
      <div className="flex gap-1.5 mt-3.5 mb-7">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex-1 h-[5px] rounded-[3px] ${n <= stepNumber ? 'bg-accent' : 'bg-surface'}`}
          />
        ))}
      </div>
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
