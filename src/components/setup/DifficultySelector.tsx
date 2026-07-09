'use client';

import { useEffect, useState } from 'react';
import { fetchDifficultyLevels } from '@/lib/supabase/queries';
import type { DifficultyLevel } from '@/lib/domain/types';

interface DifficultySelectorProps {
  onSelect: (level: DifficultyLevel) => void;
}

export function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  const [levels, setLevels] = useState<DifficultyLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDifficultyLevels()
      .then(setLevels)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p>Učitavanje nivoa...</p>;
  if (error) return <p className="text-red-600">Greška: {error}</p>;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Izaberi nivo težine</h2>
      {levels.map((level) => (
        <button
          key={level.id}
          onClick={() => onSelect(level)}
          className="border rounded px-4 py-3 text-left hover:bg-gray-100"
        >
          {level.name}
        </button>
      ))}
    </div>
  );
}
