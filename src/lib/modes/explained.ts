// Device-local "seen it" flags for first-run mode explanations (spec section 6).
// localStorage access is try/catch-safe: in private-mode/blocked-storage
// browsers the modal simply shows on every run, which is harmless.

const KEY_PREFIX = 'explained.';

export function hasSeenExplanation(modeId: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + modeId) === 'true';
  } catch {
    return false;
  }
}

export function markExplained(modeId: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + modeId, 'true');
  } catch {
    // Ignore — the modal will show again next time.
  }
}
