import { describe, it, expect } from 'vitest';
import { BANK_START_SECONDS, applyCompletedCard, isBankrupt } from './bank';

describe('bank', () => {
  it('applyCompletedCard dopunjava i troši saldo', () => {
    expect(applyCompletedCard(90, 35, 10)).toBe(115);
    expect(applyCompletedCard(90, 35, 50)).toBe(75);
  });

  it('bankrot na tačno 0', () => {
    expect(applyCompletedCard(90, 35, 125)).toBe(0);
    expect(isBankrupt(0)).toBe(true);
  });

  it('isBankrupt za negativan saldo', () => {
    expect(isBankrupt(-1)).toBe(true);
    expect(isBankrupt(1)).toBe(false);
  });

  it('BANK_START_SECONDS je 90', () => {
    expect(BANK_START_SECONDS).toBe(90);
  });
});
