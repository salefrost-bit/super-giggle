'use client';

import { useEffect } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

// Local structural types so compilation doesn't depend on lib.dom's WakeLock defs.
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

// Keeps the screen on while `active`. The browser silently releases the lock
// whenever the tab loses visibility, so we re-request on visibilitychange →
// visible for as long as we're active. Missing API or a rejected request
// (battery saver, unsupported browser): silent no-op — the app works without
// it and there is no action the user could take.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const acquired = await wakeLock!.request('screen');
        if (cancelled) {
          acquired.release().catch(() => {});
          return;
        }
        sentinel = acquired;
      } catch {
        // Denied or unavailable — run without a wake lock.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
