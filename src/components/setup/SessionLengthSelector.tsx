'use client';

import type { DeckSize } from '@/lib/domain/types';

const OPTIONS: { size: DeckSize; ariaLabel: string; label: string; sub: string }[] = [
  { size: 13, ariaLabel: 'Četvrtina špila (13 karata)', label: '¼ špila', sub: '13 karata · ~10 min' },
  { size: 26, ariaLabel: 'Pola špila (26 karata)', label: '½ špila', sub: '26 karata · ~20 min' },
  { size: 52, ariaLabel: 'Ceo špil (52 karte)', label: 'Ceo špil', sub: '52 karte · ~35 min' },
];

interface SessionLengthSelectorProps {
  onSelect: (size: DeckSize) => void;
}

export function SessionLengthSelector({ onSelect }: SessionLengthSelectorProps) {
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">Izaberi dužinu treninga</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {OPTIONS.map((option) => (
          <button
            key={option.size}
            aria-label={option.ariaLabel}
            onClick={() => onSelect(option.size)}
            className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
          >
            <span className="block text-[19px] font-extrabold mb-1">{option.label}</span>
            <span className="block text-sm font-semibold text-muted">{option.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
