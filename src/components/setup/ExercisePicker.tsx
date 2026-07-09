'use client';

import { useState } from 'react';
import { categoryKeyForName } from '@/lib/supabase/queries';
import type { Category, CategoryKey, Exercise } from '@/lib/domain/types';

interface ExercisePickerProps {
  categories: Category[];
  exercises: Exercise[];
  onComplete: (selection: Record<CategoryKey, Exercise>) => void;
}

export function ExercisePicker({ categories, exercises, onComplete }: ExercisePickerProps) {
  const [selection, setSelection] = useState<Partial<Record<CategoryKey, Exercise>>>({});

  function handleSelect(categoryKey: CategoryKey, exercise: Exercise) {
    const next = { ...selection, [categoryKey]: exercise };
    setSelection(next);
    const keys: CategoryKey[] = ['push', 'pull', 'legs', 'core'];
    if (keys.every((key) => next[key])) {
      onComplete(next as Record<CategoryKey, Exercise>);
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Izaberi vežbu za svaku kategoriju</h2>
      {sortedCategories.map((category) => {
        const categoryKey = categoryKeyForName(category.name);
        const categoryExercises = exercises.filter((e) => e.categoryId === category.id);
        const selected = selection[categoryKey];
        return (
          <div key={category.id}>
            <h3 className="font-medium mb-2">{category.name}</h3>
            <div className="flex flex-wrap gap-2">
              {categoryExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleSelect(categoryKey, exercise)}
                  className={`border rounded px-3 py-2 ${
                    selected?.id === exercise.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {exercise.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
