import { describe, it, expect } from 'vitest';
import {
  BANK_START_SECONDS,
  CARD_SECONDS,
  bankRemaining,
  cardAdjustment,
  isBankrupt,
} from './bank';

// ERRATA v0.4.7 §3: ceo fajl prepisan uz redizajn moda po nalogu korisnika
// ("bank timera koji krece da odbrojava od 300 sekundi […] svaka vezba ima
// timer od 20 do -20 sekundi"). Stari applyCompletedCard/90s API je uklonjen.
describe('On the Clock banka (spec v0.4.7 §3)', () => {
  it('BANK_START_SECONDS je 300, CARD_SECONDS je 20', () => {
    expect(BANK_START_SECONDS).toBe(300);
    expect(CARD_SECONDS).toBe(20);
  });

  it('cardAdjustment: brza karta dodaje, spora oduzima', () => {
    expect(cardAdjustment(0)).toBe(20);
    expect(cardAdjustment(8)).toBe(12);
    expect(cardAdjustment(20)).toBe(0);
    expect(cardAdjustment(27)).toBe(-7);
  });

  it('cardAdjustment: kazna je ograničena na −20', () => {
    expect(cardAdjustment(40)).toBe(-20);
    expect(cardAdjustment(500)).toBe(-20);
  });

  it('bankRemaining: 300 + korekcije − aktivno vreme', () => {
    expect(bankRemaining(0, 0)).toBe(300);
    expect(bankRemaining(35, 120)).toBe(215);
    expect(bankRemaining(-14, 310)).toBe(-24);
  });

  it('isBankrupt na tačno 0 i ispod', () => {
    expect(isBankrupt(0)).toBe(true);
    expect(isBankrupt(-1)).toBe(true);
    expect(isBankrupt(1)).toBe(false);
  });
});
