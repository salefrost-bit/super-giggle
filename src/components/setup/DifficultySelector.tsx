'use client';

import { useEffect, useState } from 'react';
import { fetchDifficultyLevels } from '@/lib/supabase/queries';
import type { DifficultyLevel } from '@/lib/domain/types';

const DESCRIPTIONS: Record<string, string> = {
  Početnik: 'Lakše ponavljanja, idealno za start.',
  Srednji: 'Uravnoteženo opterećenje.',
  Napredni: 'Maksimalan intenzitet.',
};

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

  if (isLoading) return <p className="text-muted">Učitavanje nivoa...</p>;
  if (error) return <p className="text-red-500">Greška: {error}</p>;

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">Izaberi nivo</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {levels.map((level) => (
          <button
            key={level.id}
            aria-label={level.name}
            onClick={() => onSelect(level)}
            className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
          >
            <span className="block text-[19px] font-extrabold mb-1">{level.name}</span>
            <span className="block text-sm font-semibold text-muted">
              {DESCRIPTIONS[level.name] ?? ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
