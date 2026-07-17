'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { Suit } from '@/lib/domain/types';
import { HeatRing } from '@/components/ui/HeatRing';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  clubs: '♣',
  spades: '♠',
  diamonds: '♦',
};

const RED_SUITS = new Set<Suit>(['hearts', 'diamonds']);

const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? String(rank);
}

type DealPhase = 'idle' | 'out' | 'enter';

interface CardContent {
  exerciseName: string;
  reps: number;
  suit: Suit;
  rank: number;
}

interface CardDisplayProps extends CardContent {
  // Changes once per dealt card (SessionScreen passes currentIndex) — drives
  // the s1/s12 deal animation (out-left, then in-from-below). The global
  // prefers-reduced-motion rule in globals.css nulls the CSS transitions, so
  // reduced motion just gets an instant content swap with no visible fly.
  dealKey: number;
  outcomeFlash?: 'won' | 'lost' | null;
  disabled?: boolean;
  onTap?: () => void;
  // Spec v0.4.6 §3: kad postoji kvota, prsten je OVDE — omotač koji nosi deal
  // transform/opacity, pa se prsten i karta animiraju zajedno (prototip s28).
  ringFraction?: number | null;
}

// s1/s12: main exercise card — mirrored rank/suit corners like a real
// playing card, big reps number, exercise name. Purely presentational: no
// quota/bank knowledge here anymore (that lives in SessionScreen's external
// big counter), matching the prototype's card content.
export function CardDisplay({
  exerciseName,
  reps,
  suit,
  rank,
  dealKey,
  outcomeFlash,
  disabled,
  onTap,
  ringFraction,
}: CardDisplayProps) {
  const t = useTranslations();
  // phase + content live in one state object, and each of the three phase
  // transitions (idle→out→enter→idle) is its own effect keyed off `phase` —
  // one setState per effect, no effect that schedules a chain of further
  // setState calls itself.
  const [deal, setDeal] = useState<{ phase: DealPhase; content: CardContent }>({
    phase: 'idle',
    content: { exerciseName, reps, suit, rank },
  });
  const prevDealKeyRef = useRef(dealKey);
  const contentRef = useRef<CardContent>({ exerciseName, reps, suit, rank });

  useEffect(() => {
    contentRef.current = { exerciseName, reps, suit, rank };
  });

  useEffect(() => {
    if (dealKey === prevDealKeyRef.current) return;
    prevDealKeyRef.current = dealKey;

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setDeal((prev) =>
      reducedMotion ? { phase: 'idle', content: contentRef.current } : { ...prev, phase: 'out' }
    );
  }, [dealKey]);

  useEffect(() => {
    if (deal.phase !== 'out') return;
    const id = window.setTimeout(() => setDeal({ phase: 'enter', content: contentRef.current }), 230);
    return () => window.clearTimeout(id);
  }, [deal.phase]);

  useEffect(() => {
    if (deal.phase !== 'enter') return;
    const id = window.setTimeout(() => setDeal((prev) => ({ ...prev, phase: 'idle' })), 30);
    return () => window.clearTimeout(id);
  }, [deal.phase]);

  const { phase, content: displayed } = deal;

  // Spec v0.4.8 §3: karta preuzima semantiku uklonjenog dugmeta — tap radi i
  // tokom deal animacije (kao što je dugme radilo); dupli tap brani
  // SessionScreen kroz nextDisabled/isAdvancing, ne animaciona faza.
  function handleTap() {
    if (disabled) return;
    onTap?.();
  }

  const cardColor = RED_SUITS.has(displayed.suit) ? 'var(--color-suit-hearts)' : 'var(--color-foreground)';
  const cornerLabel = (
    <span className="font-black text-2xl leading-none" style={{ color: cardColor }}>
      {rankLabel(displayed.rank)} <span className="text-lg">{SUIT_SYMBOLS[displayed.suit]}</span>
    </span>
  );

  const outcomeBorder =
    outcomeFlash === 'won'
      ? 'border-accent shadow-[0_0_60px_rgba(204,255,0,0.35)]'
      : outcomeFlash === 'lost'
        ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.35)]'
        : 'border-accent/25';

  let transform = 'none';
  let opacity = 1;
  let transition = 'transform .3s cubic-bezier(.34,1.56,.64,1), opacity .2s ease';
  if (phase === 'out') {
    transform = 'translate(-135%, -48px) rotate(-16deg)';
    opacity = 0;
    transition = 'transform .23s cubic-bezier(.55,0,.9,.4), opacity .21s ease';
  } else if (phase === 'enter') {
    transform = 'translateY(54px) scale(.9) rotate(4deg)';
    opacity = 0;
    transition = 'none';
  }

  // Deal stil ide na NAJSPOLJNIJI element: na prsten kad postoji (prsten +
  // karta lete zajedno, nema "pizza" ostatka), inače na samu kartu.
  const dealStyle = { transform, opacity, transition };
  const hasRing = ringFraction != null;

  const card = (
    <div
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      // Spec v0.4.8 §3: karta JE kontrola za sledeću kartu (dugme uklonjeno) —
      // ime i disabled stanje žive na njoj radi pristupačnosti i testova.
      aria-label={onTap ? t('workout.nextCard') : undefined}
      aria-disabled={onTap && disabled ? true : undefined}
      onClick={handleTap}
      onKeyDown={(e) => {
        if (onTap && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleTap();
        }
      }}
      data-testid="exercise-card"
      className={`flex-1 rounded-[28px] border-2 ${outcomeBorder} p-5 flex flex-col justify-between transition-[border-color,box-shadow] duration-300 ${onTap && !disabled ? 'cursor-pointer' : ''}`}
      style={{
        ...(hasRing ? {} : dealStyle),
        background: 'linear-gradient(160deg,#2c2c30,#212124 60%,#1e1e21)',
      }}
    >
      {cornerLabel}
      <div className="text-center">
        <p
          className="text-[92px] font-black leading-none text-foreground"
          style={{ textShadow: '0 0 36px rgba(204,255,0,0.22)' }}
        >
          {displayed.reps}
        </p>
        <p className="text-[11px] font-extrabold tracking-[0.24em] text-muted uppercase mt-1">
          {t('workout.reps')}
        </p>
        <p className="text-[23px] font-extrabold text-accent mt-2.5">{displayed.exerciseName}</p>
        {onTap && (
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-muted uppercase mt-4">
            {t('workout.tapForNext')} <span className="text-accent">→</span>
          </p>
        )}
      </div>
      <div className="self-end rotate-180">{cornerLabel}</div>
    </div>
  );

  if (!hasRing) return card;
  return (
    <HeatRing fraction={ringFraction} style={dealStyle}>
      {card}
    </HeatRing>
  );
}
