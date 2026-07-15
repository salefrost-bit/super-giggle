// Odmor (džoker) kao ugrađena pauza — spec 2026-07-15-dzokeri-design.md.
// Čist modul: ne zna ništa o React-u, Supabase-u, ni o modovima. SessionScreen
// odlučuje KADA da pita `isJokerBreak`; ovaj modul samo računa POZICIJE.

export const JOKER_REST_SECONDS = 30;

const WARMUP_CARDS = 5;
const MIN_GAP_CARDS = 4;

export function jokerCountFor(realCardCount: number): number {
  return realCardCount <= 20 ? 1 : 2;
}

// Vraća pozicije (1-indeksirano, "posle N-te prave karte") na kojima upada
// odmor. Nikad pre WARMUP_CARDS, nikad na poslednjoj karti. Za count=2,
// razmak >= MIN_GAP_CARDS je STRUKTURNO garantovan (secondEarliest), ne samo
// verovatnoćom. Graciozno vraća [] ako nema validne pozicije (kratki test-špilovi).
export function assignJokerBreaks(
  realCardCount: number,
  rng: () => number = Math.random
): number[] {
  const earliest = WARMUP_CARDS;
  const latest = realCardCount - 1;
  if (earliest > latest) return [];

  const count = jokerCountFor(realCardCount);
  if (count === 1) {
    return [earliest + Math.floor(rng() * (latest - earliest + 1))];
  }

  // count === 2 samo za realCardCount >= 24 (jokerCountFor), što uvek ostavlja
  // dovoljno prostora za dve pozicije >= MIN_GAP_CARDS razmaknute unutar
  // [earliest, latest] — bez dodatne provere granica.
  const mid = Math.floor((earliest + latest) / 2);
  const first = earliest + Math.floor(rng() * (mid - earliest + 1));
  const secondEarliest = Math.max(first + MIN_GAP_CARDS, mid + 1);
  const second = secondEarliest + Math.floor(rng() * (latest - secondEarliest + 1));
  return [first, second];
}

// completedCount = broj pravih karata odrađenih do sada (1-indeksirano —
// isto značenje kao pozicije iz assignJokerBreaks). Za Sprint (lapSize=52)
// se pozicija umotava unutar tekućeg kruga od 52 karte.
export function isJokerBreak(
  completedCount: number,
  breaks: number[],
  lapSize: number | null = null
): boolean {
  if (lapSize == null) return breaks.includes(completedCount);
  const positionInLap = ((completedCount - 1) % lapSize) + 1;
  return breaks.includes(positionInLap);
}
