'use client';

import type { DeckSize } from '@/lib/domain/types';

interface SessionLengthSelectorProps {
  onSelect: (size: DeckSize) => void;
}

const OPTIONS: { size: DeckSize; label: string }[] = [
  { size: 13, label: 'Četvrtina špila (13 karata)' },
  { size: 26, label: 'Pola špila (26 karata)' },
  { size: 52, label: 'Ceo špil (52 karte)' },
];

export function SessionLengthSelector({ onSelect }: SessionLengthSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Izaberi dužinu treninga</h2>
      {OPTIONS.map((option) => (
        <button
          key={option.size}
          onClick={() => onSelect(option.size)}
          className="border rounded px-4 py-3 text-left hover:bg-gray-100"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
