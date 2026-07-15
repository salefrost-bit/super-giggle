// Preživi špil — čista timestamp aritmetika; saldo se menja SAMO na klik (spec §4.4).
export const BANK_START_SECONDS = 90;

export function applyCompletedCard(
  balanceSeconds: number,
  quotaSeconds: number,
  activeCardSeconds: number
): number {
  return balanceSeconds + quotaSeconds - activeCardSeconds;
}

export function isBankrupt(balanceSeconds: number): boolean {
  return balanceSeconds <= 0;
}
