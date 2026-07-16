// On the Clock (spec v0.4.7 §3) — čista timestamp aritmetika. Banka od 300 s
// odbrojava u realnom vremenu (pauza i džoker odmor su izuzeti kod pozivaoca);
// svaka karta nosi tajmer 20 → −20 s čija se preostala vrednost na završetku
// sabira/oduzima od banke. Ceo špil pre isteka banke = uspeh.
export const BANK_START_SECONDS = 300;
export const CARD_SECONDS = 20;

// Korekcija banke na završetku karte: +20 (trenutan tap) do −20 (kašnjenje
// je ograničeno — posle 40 s na karti kazna više ne raste).
export function cardAdjustment(activeCardSeconds: number): number {
  return Math.max(-CARD_SECONDS, Math.min(CARD_SECONDS, CARD_SECONDS - activeCardSeconds));
}

// activeElapsedSeconds = vreme sesije BEZ pauza (stopwatch) i BEZ džoker
// odmora ("dzoker zaustavlja bank timer").
export function bankRemaining(adjustmentsSum: number, activeElapsedSeconds: number): number {
  return BANK_START_SECONDS + adjustmentsSum - activeElapsedSeconds;
}

export function isBankrupt(remainingSeconds: number): boolean {
  return remainingSeconds <= 0;
}
