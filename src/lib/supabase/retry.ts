// Otporno čuvanje (spec v0.4.6 §1): mobilna mreža ume da proguta ODGOVOR
// iako je upis na serveru prošao. Zato su svi upisi idempotentni (klijentski
// UUID / prirodni ključevi) pa je ponovni pokušaj bezbedan, a duplicate
// greška znači "već upisano" = uspeh.

const DUPLICATE_KEY_CODE = '23505';

export function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  );
}

const DEFAULT_DELAYS_MS = [800, 2400];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Do delays.length+1 pokušaja; duplicate = tihi uspeh na bilo kom pokušaju.
// Backoff pauze nisu deo merenja vremena treninga (tajmer invarijanta netaknuta).
export async function withSaveRetry<T>(
  operation: () => Promise<T>,
  delaysMs: number[] = DEFAULT_DELAYS_MS
): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (isDuplicateError(error)) return null;
      if (attempt >= delaysMs.length) throw error;
      await sleep(delaysMs[attempt]);
    }
  }
}
