'use client';

import { summarizeByCategory } from '@/lib/domain/summarize';
import type { SessionResult } from '@/lib/domain/types';

interface SummaryScreenProps {
  result: SessionResult;
  isGuest: boolean;
  onDone: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SummaryScreen({ result, isGuest, onDone }: SummaryScreenProps) {
  const breakdown = summarizeByCategory(result.draws);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Trening završen!</h1>
      <p className="text-4xl font-mono">{formatDuration(result.totalDurationSeconds)}</p>
      <div className="w-full max-w-sm flex flex-col gap-2">
        {breakdown.map((item) => (
          <div key={item.categoryKey} className="flex justify-between border-b py-1">
            <span>{item.exerciseName}</span>
            <span>
              {item.totalReps} ponavljanja ({item.cardCount} karata)
            </span>
          </div>
        ))}
      </div>
      {isGuest && (
        <p className="text-sm text-gray-500">
          Rezultat nije sačuvan. Registruj se da bi sačuvao istoriju treninga.
        </p>
      )}
      <button onClick={onDone} className="bg-blue-600 text-white rounded px-6 py-2">
        Nazad na početak
      </button>
    </div>
  );
}
