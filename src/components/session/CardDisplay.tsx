import { CATEGORY_KEY_TO_NAME } from '@/lib/domain/types';
import type { CategoryKey, Suit } from '@/lib/domain/types';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  clubs: '♣',
  spades: '♠',
  diamonds: '♦',
};

const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? String(rank);
}

interface CardDisplayProps {
  exerciseName: string;
  reps: number;
  suit?: Suit;
  rank?: number;
  categoryKey?: CategoryKey;
}

export function CardDisplay({ exerciseName, reps, suit, rank, categoryKey }: CardDisplayProps) {
  return (
    <div className="bg-surface/55 backdrop-blur-xl rounded-3xl border-2 border-accent/35 shadow-[0_0_40px_rgba(204,255,0,0.08)] p-7 min-h-[360px] flex flex-col">
      <div className="flex justify-between items-start">
        {suit && categoryKey ? (
          <div className="bg-accent text-background font-extrabold text-[13px] px-3 py-2 rounded-[10px] flex items-center gap-1.5">
            <span>{SUIT_SYMBOLS[suit]}</span>
            <span>{CATEGORY_KEY_TO_NAME[categoryKey]}</span>
          </div>
        ) : (
          <div />
        )}
        {rank !== undefined && (
          <div className="text-[22px] font-black text-muted">{rankLabel(rank)}</div>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        <p className="text-[22px] font-extrabold">{exerciseName}</p>
        <p className="text-[96px] font-black text-accent leading-none mt-1.5">{reps}</p>
        <p className="text-[15px] font-bold text-muted tracking-widest uppercase">ponavljanja</p>
      </div>
    </div>
  );
}
