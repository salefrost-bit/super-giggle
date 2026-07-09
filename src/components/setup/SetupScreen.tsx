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

interface SetupScreenProps {
  onStart: (config: SessionConfig, draws: CardDrawResult[]) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
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

  if (step === 'difficulty') {
    return <DifficultySelector onSelect={handleDifficultySelect} />;
  }
  if (step === 'exercises') {
    return (
      <ExercisePicker
        categories={categories}
        exercises={exercises}
        onComplete={handleExercisesComplete}
      />
    );
  }
  return <SessionLengthSelector onSelect={handleLengthSelect} />;
}
