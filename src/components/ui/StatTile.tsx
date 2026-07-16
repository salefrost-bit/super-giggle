import type { ReactNode } from 'react';

interface StatTileProps {
  value: ReactNode;
  label: string;
}

// s14: Profile statistike pločice.
export function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="flex-1 bg-surface border border-[#303036] rounded-2xl p-3.5 text-center">
      <div className="text-2xl font-black text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] font-extrabold tracking-[0.14em] text-muted mt-0.5 uppercase">
        {label}
      </div>
    </div>
  );
}
