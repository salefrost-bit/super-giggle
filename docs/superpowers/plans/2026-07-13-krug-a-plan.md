# Krug A — "Ispravke i jasnoća" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the screen awake during workouts, auto-pause every mode when the app loses visibility, record and show pause totals for all modes, explain challenge and streak mechanics in the UI, and replace the SR/EN toggle with a locale-registry-driven language menu — all additively, with zero schema migrations.

**Architecture:** Everything layers onto the existing timestamp-shift pause mechanism (`src/lib/domain/timer.ts` — `resumeTimer` shifts `startedAt`; `useCardQuota` freezes because it follows `stopwatch.isPaused`). Pause accounting is a new pure domain module folded into `useStopwatch`; auto-pause is a `visibilitychange` listener that calls the existing pause path. Persistence adds only new keys to the existing `sessions.settings` JSONB column. Explanations come from the mode registry (new `explanationKey` per mode) rendered by one shared `InfoModal`; the perfect_deck first-run modal gates in `page.tsx` BEFORE `SessionScreen` mounts, so no timer exists until the user dismisses it. The language menu reads a new locale registry module.

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 tokens, next-intl (existing `LocaleProvider`), Supabase, Vitest + Testing Library, Screen Wake Lock API.

## Global Constraints

- **Precondition (Task 1 gates):** the MVP plan (28 tasks), the visual redesign plan (13 tasks) AND the gamification Phase 2 plan (15 tasks) are all fully complete and pushed. Do not start otherwise.
- Spec: `docs/superpowers/specs/2026-07-13-krug-a-design.md`. Strategy: `docs/superpowers/strategy/2026-07-13-strategija-nastavka.md` (section 4, Krug A).
- **Timer invariant (MVP spec 4.2, unchanged):** every duration is derived from timestamps (`deadline − now`, `resume_at − pause_at`); NEVER tick-accumulated. This includes the new pause accounting and the Wake Lock/auto-pause interplay. No new JS timers beyond the existing 250ms display re-renders.
- **Strictly additive. ZERO schema migrations.** The only data-model change is two new keys inside the existing `sessions.settings` JSONB column: `pause_count` (int) and `total_pause_seconds` (int). No new columns, no new tables, no type changes.
- All type additions to existing interfaces are OPTIONAL fields (or supertypes of existing param types) so existing code and test mocks keep compiling.
- **Every new user-facing string goes through i18n** — a key in BOTH `messages/sr.json` and `messages/en.json` (Task 2). Zero hardcoded strings.
- **All existing tests pass unchanged**, with exactly TWO spec-mandated assertion updates (errata, As=1 precedent — see "Test-contract errata" below). Nothing else in any existing test file may change.
- Guest sessions still never write to Supabase; the pause row on the results screen works for guests from in-memory state.
- Every task ends with the full suite green: `npm test`, and `npx tsc --noEmit` clean.

## Test-contract errata (spec-mandated, applied in Task 6 only)

Spec section 5 requires `pause_count`/`total_pause_seconds` to be written for ALL modes, including classic. Two existing assertions encode the pre-Krug-A contract and cannot survive that requirement:

1. `src/components/session/SessionScreen.test.tsx`, "logged in" test: `expect(completeSession).toHaveBeenCalledWith('session-1', expect.any(Number));` — `toHaveBeenCalledWith` matches exact arity, and classic completion now passes a third (settings) argument. The assertion gains a third matcher.
2. `src/lib/supabase/sessions.test.ts`, `getUserSessions` test: the `toEqual` expectation is a full-object literal; the mapped entry gains `pauseCount`/`totalPauseSeconds` fields. The expected object gains `pauseCount: null, totalPauseSeconds: null`.

These are the ONLY permitted edits to existing test code. Both are quoted verbatim in Task 6.

## File Structure

```
messages/en.json, messages/sr.json                  — new key groups: common.close, pause.*, modes.*, streak.*, language.* (Task 2)
src/hooks/useWakeLock.ts + .test.ts                 — screen wake lock hook (Task 3)
src/lib/domain/pauseLog.ts + .test.ts               — pure pause accounting from timestamps (Task 4)
src/hooks/useStopwatch.ts (+ additive tests)        — exposes pauseCount/totalPauseSeconds (Task 4)
src/components/session/SessionScreen.tsx            — wake lock, auto-pause, origin label, pause persistence (Tasks 3/5/6)
src/components/session/SessionScreen.test.tsx       — additive tests + errata #1 (Tasks 5/6)
src/lib/domain/types.ts                             — SessionSettings supertype, SessionResult pause fields (Task 6)
src/lib/supabase/sessions.ts + .test.ts             — settings for all modes, history mapping, errata #2 (Task 6)
src/components/summary/SummaryScreen.tsx            — pause row on results (Task 7)
src/components/progress/ProgressScreen.tsx          — pause addition in history rows + streak modal (Tasks 7/10)
src/components/ui/InfoModal.tsx                     — shared bottom-sheet modal (Task 8)
src/lib/modes/registry.ts                           — explanationKey per mode (Task 8)
src/components/setup/ModeSelector.tsx + .test.tsx   — ⓘ buttons + explanation modal (Task 8)
src/lib/modes/explained.ts + .test.ts               — localStorage first-run flags (Task 9)
src/app/page.tsx                                    — perfect_deck first-run gate before SessionScreen (Task 9)
src/app/page.test.tsx                               — mock extension + new first-run test (Task 9)
src/components/streak/StreakInfoModal.tsx + .test.tsx — streak mechanics modal (Task 10)
src/components/landing/LandingScreen.tsx + .test.tsx  — tappable flame, language menu (Tasks 10/11)
src/i18n/locales.ts + .test.ts                      — locale registry (Task 11)
```

Two deliberate path deviations from the spec's suggestions, following existing repo conventions: the hook lives in `src/hooks/` (next to `useStopwatch`/`useCardQuota`), not `src/lib/hooks/`; the locale registry lives in `src/i18n/locales.ts` (next to `LocaleProvider`), not `src/lib/i18n/locales.ts`.

---

### Task 1: Preflight gate — verify MVP, redesign, and gamification are complete

**Files:** none modified.

**Interfaces:**
- Produces: go/no-go. If ANY check fails, STOP and report — do not begin.

- [ ] **Step 1: Verify gamification artifacts exist and Krug A has not started**

Run:
```bash
ls src/lib/modes/registry.ts src/components/progress/ProgressScreen.tsx src/i18n/LocaleProvider.tsx src/i18n/dbName.ts messages/en.json messages/sr.json src/lib/domain/streak.ts src/lib/domain/challenge.ts supabase/migrations/0004_gamification.sql; ls src/hooks/useWakeLock.ts src/lib/domain/pauseLog.ts src/i18n/locales.ts 2>/dev/null
```
Expected: the first nine paths all exist (gamification plan finished); the last three do NOT exist yet (Krug A not started). Also run `grep -c "setLocale" src/components/landing/LandingScreen.tsx` → at least 1 (gamification Task 14 applied).

- [ ] **Step 2: Full suite green, compiler clean, tree clean**

Run: `npm test` → all pass. Run: `npx tsc --noEmit` → no errors. Run: `git status` → clean (or only untracked docs). Note the passing test count for Task 12.

**Done when:** all artifacts verified, suite green, tree clean.

---

### Task 2: i18n catalogs — every new Krug A key in both languages

**Files:**
- Modify: `messages/en.json`, `messages/sr.json`

**Interfaces:**
- Produces: keys `common.close`, `pause.autoLabel`, `pause.summary`, `pause.historyLabel`, `modes.infoAria`, `modes.firstRunCta`, `modes.classic.explanation`, `modes.perfect_deck.explanation`, `streak.title`, `streak.explanation`, `language.label` — consumed by every later task. No component changes here, so all existing tests pass untouched.

- [ ] **Step 1: Extend the English catalog**

In `messages/en.json`: add `"close": "Close"` inside the existing `common` object, and append these top-level groups after `auth` (keep valid JSON — add a comma after the `auth` block):

```json
  "pause": {
    "autoLabel": "Paused automatically",
    "summary": "Pauses: {count} · total {duration}",
    "historyLabel": "⏸ {duration}"
  },
  "modes": {
    "infoAria": "About this mode",
    "firstRunCta": "Got it, let's go",
    "classic": {
      "explanation": "Your pace, no pressure — only total time is tracked."
    },
    "perfect_deck": {
      "explanation": "Every card has its own time quota. Move to the next card before the quota runs out and the card is beaten ✓. Quota expired? The card is lost ✗ — but the workout never stops: finish your reps at your own pace and carry on. Unused time doesn't carry over. Beat every card for a PERFECT DECK. Your first run is against our estimate; once you set a record, you race your best time +5%."
    }
  },
  "streak": {
    "title": "Workout streak",
    "explanation": "🔥 Your streak grows for every day with at least one finished workout. ❄️ Miss a day? Up to 2 days per week freeze automatically and your streak survives — a third missed day in the same week breaks it. Freezes reset weekly and can't be saved up."
  },
  "language": {
    "label": "Language"
  }
```

- [ ] **Step 2: Extend the Serbian catalog (mirrored keys)**

In `messages/sr.json`: add `"close": "Zatvori"` inside `common`, and append:

```json
  "pause": {
    "autoLabel": "Automatski pauzirano",
    "summary": "Pauze: {count} · ukupno {duration}",
    "historyLabel": "⏸ {duration}"
  },
  "modes": {
    "infoAria": "Objašnjenje moda",
    "firstRunCta": "Jasno, krećemo",
    "classic": {
      "explanation": "Svojim tempom, bez pritiska — meri se samo ukupno vreme."
    },
    "perfect_deck": {
      "explanation": "Svaka karta ima svoju vremensku kvotu. Pređi na sledeću kartu pre isteka kvote i karta je oborena ✓. Kvota istekla? Karta je izgubljena ✗ — ali trening se ne prekida: završi ponavljanja svojim tempom i nastavi. Neiskorišćeno vreme propada, ne prenosi se. Obori sve karte za PERFEKTAN ŠPIL. Prvi put igraš protiv naše procene; kad postaviš rekord, igraš protiv svog najboljeg vremena +5%."
    }
  },
  "streak": {
    "title": "Niz treninga",
    "explanation": "🔥 Niz raste za svaki dan sa bar jednim završenim treningom. ❄️ Ako preskočiš dan, do 2 dana nedeljno se automatski zamrznu i niz preživi — treći propušten dan u istoj nedelji prekida niz. Zamrzavanja se obnavljaju svake nedelje i ne štede se."
  },
  "language": {
    "label": "Jezik"
  }
```

(ICU note: bare apostrophes in "doesn't"/"can't"/"let's" are literal in ICU MessageFormat — an apostrophe only starts an escape before `{`, `}`, `#`, or another `'`. The existing catalog already relies on this in `workout.saveFailed`.)

- [ ] **Step 3: Verify nothing broke**

Run: `npm test` → all pass (no component reads the new keys yet). Run: `npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/sr.json
git commit -m "feat: i18n keys for Krug A (pause, mode explanations, streak, language)"
```

**Done when:** both catalogs contain every listed key, suite green.

---

### Task 3: `useWakeLock` hook + wiring into SessionScreen

**Files:**
- Create: `src/hooks/useWakeLock.ts`
- Test: `src/hooks/useWakeLock.test.ts`
- Modify: `src/components/session/SessionScreen.tsx` (one import + one call)

**Interfaces:**
- Produces: `useWakeLock(active: boolean): void` — requests `navigator.wakeLock.request('screen')` while `active`; releases on `active` → false and on unmount; re-requests on `visibilitychange → visible` while `active` (the browser silently drops the lock when the tab hides); silent no-op when the API is missing or the request is rejected (battery saver) — no user-facing message (spec section 3: there is no action the user could take).
- Consumes: nothing from other tasks. SessionScreen mounts it unconditionally (`useWakeLock(true)`) — it is mounted exactly and only during an active session, all modes; setup/results/history never mount SessionScreen.
- jsdom has no `navigator.wakeLock`, so existing SessionScreen tests hit the no-op branch and stay green.

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useWakeLock.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

type MutableNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<unknown> };
};

const release = vi.fn();
const request = vi.fn();

beforeEach(() => {
  release.mockReset().mockResolvedValue(undefined);
  request.mockReset().mockResolvedValue({ release });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  delete (navigator as MutableNavigator).wakeLock;
});

describe('useWakeLock', () => {
  it('requests a screen wake lock when active', async () => {
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
  });

  it('does not request when inactive', async () => {
    renderHook(() => useWakeLock(false));
    await act(async () => {});
    expect(request).not.toHaveBeenCalled();
  });

  it('releases the lock on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    unmount();
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
  });

  it('re-requests when the tab becomes visible again while active', async () => {
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('is a silent no-op when the API is missing', async () => {
    delete (navigator as MutableNavigator).wakeLock;
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    await act(async () => {});
    expect(request).not.toHaveBeenCalled();
  });

  it('swallows a rejected request (battery saver) without crashing', async () => {
    request.mockRejectedValueOnce(new Error('denied'));
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    // Reaching this point without an unhandled rejection is the assertion.
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- useWakeLock` → FAIL with "Cannot find module './useWakeLock'".

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useWakeLock.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useWakeLock` → PASS (6 tests).

- [ ] **Step 5: Wire into SessionScreen**

In `src/components/session/SessionScreen.tsx` add the import and one call directly after the `useStopwatch()` line:

```typescript
import { useWakeLock } from '@/hooks/useWakeLock';
```
```typescript
  const stopwatch = useStopwatch();
  // Screen stays awake for the whole active session (all modes); released on unmount.
  useWakeLock(true);
```

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test` → all pass (jsdom lacks `navigator.wakeLock`; SessionScreen tests hit the no-op branch). Run: `npx tsc --noEmit` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useWakeLock.ts src/hooks/useWakeLock.test.ts src/components/session/SessionScreen.tsx
git commit -m "feat: screen wake lock during active sessions with visibility re-acquire"
```

**Done when:** hook tests pass, SessionScreen mounts the hook, full suite green.

---

### Task 4: Pause accounting — pure `pauseLog` module + `useStopwatch` extension

**Files:**
- Create: `src/lib/domain/pauseLog.ts`
- Test: `src/lib/domain/pauseLog.test.ts`
- Modify: `src/hooks/useStopwatch.ts`
- Modify: `src/hooks/useStopwatch.test.ts` (APPEND a new describe block only — the three existing tests stay byte-identical)

**Interfaces:**
- Produces (Tasks 5/6 depend on these exact signatures):
  - `interface PauseLog { count: number; accumulatedMs: number; pausedAt: number | null }`
  - `createPauseLog(): PauseLog`
  - `logPause(log: PauseLog, now?: number): PauseLog` — idempotent while a pause is open (double `hidden` can't double-count)
  - `logResume(log: PauseLog, now?: number): PauseLog` — idempotent when no pause is open; accumulates `now − pausedAt` (timestamps, never ticks)
  - `getTotalPauseSeconds(log: PauseLog, now?: number): number` — closed pauses plus any still-open pause, rounded to whole seconds
  - `useStopwatch()` return gains `pauseCount: number` and `totalPauseSeconds: number` (additive fields; existing consumers unaffected). Every `pause()`/`resume()` — manual, automatic, or the wrap-up pause at finish — flows through the log.

- [ ] **Step 1: Write the failing domain tests**

Create `src/lib/domain/pauseLog.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createPauseLog, logPause, logResume, getTotalPauseSeconds } from './pauseLog';

describe('pauseLog', () => {
  it('starts with zero pauses and zero seconds', () => {
    const log = createPauseLog();
    expect(log.count).toBe(0);
    expect(getTotalPauseSeconds(log, 5_000)).toBe(0);
  });

  it('accumulates a closed pause from timestamps (resume − pause)', () => {
    let log = createPauseLog();
    log = logPause(log, 10_000);
    log = logResume(log, 171_000); // 161 s
    expect(log.count).toBe(1);
    expect(getTotalPauseSeconds(log, 999_000)).toBe(161);
  });

  it('sums multiple pauses and counts each one', () => {
    let log = createPauseLog();
    log = logPause(log, 10_000);
    log = logResume(log, 20_000); // 10 s
    log = logPause(log, 50_000);
    log = logResume(log, 65_500); // 15.5 s
    expect(log.count).toBe(2);
    expect(getTotalPauseSeconds(log, 100_000)).toBe(26); // round(25.5)
  });

  it('includes a still-open pause up to now', () => {
    let log = createPauseLog();
    log = logPause(log, 10_000);
    expect(getTotalPauseSeconds(log, 14_000)).toBe(4);
  });

  it('is idempotent on a double pause (rapid hidden/hidden)', () => {
    let log = createPauseLog();
    log = logPause(log, 10_000);
    log = logPause(log, 12_000); // ignored — pause already open
    expect(log.count).toBe(1);
    log = logResume(log, 20_000);
    expect(getTotalPauseSeconds(log, 99_000)).toBe(10);
  });

  it('is idempotent on resume without an open pause', () => {
    let log = createPauseLog();
    log = logResume(log, 10_000);
    expect(log.count).toBe(0);
    expect(getTotalPauseSeconds(log, 99_000)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- pauseLog` → FAIL (module missing).

- [ ] **Step 3: Implement the module**

Create `src/lib/domain/pauseLog.ts`:

```typescript
// Pause accounting for a session. Pure timestamp arithmetic — durations are
// derived as resume_at − pause_at, never tick-accumulated (timer invariant,
// MVP spec 4.2). Both operations are idempotent so rapid duplicate
// visibilitychange events (or manual+auto overlap) cannot double-count.

export interface PauseLog {
  count: number;
  accumulatedMs: number;
  pausedAt: number | null; // epoch ms of the open pause; null while running
}

export function createPauseLog(): PauseLog {
  return { count: 0, accumulatedMs: 0, pausedAt: null };
}

export function logPause(log: PauseLog, now: number = Date.now()): PauseLog {
  if (log.pausedAt !== null) return log;
  return { ...log, count: log.count + 1, pausedAt: now };
}

export function logResume(log: PauseLog, now: number = Date.now()): PauseLog {
  if (log.pausedAt === null) return log;
  return {
    count: log.count,
    accumulatedMs: log.accumulatedMs + (now - log.pausedAt),
    pausedAt: null,
  };
}

export function getTotalPauseSeconds(log: PauseLog, now: number = Date.now()): number {
  const openMs = log.pausedAt !== null ? now - log.pausedAt : 0;
  return Math.round((log.accumulatedMs + openMs) / 1000);
}
```

- [ ] **Step 4: Run tests** — `npm test -- pauseLog` → PASS (6 tests).

- [ ] **Step 5: Write the failing hook tests (append only)**

APPEND to `src/hooks/useStopwatch.test.ts` (inside the file, after the existing describe — do not touch the existing tests):

```typescript
describe('useStopwatch pause accounting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts pauses and accumulates their duration from timestamps', () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:03.000Z'));
      result.current.pause();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:20.000Z'));
      result.current.resume();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:25.000Z'));
      result.current.pause();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:30.000Z'));
      result.current.resume();
    });

    expect(result.current.pauseCount).toBe(2);
    expect(result.current.totalPauseSeconds).toBe(22); // 17 + 5
  });

  it('does not double-count a repeated pause', () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:03.000Z'));
      result.current.pause();
    });
    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:04.000Z'));
      result.current.pause();
    });

    expect(result.current.pauseCount).toBe(1);
  });
});
```

Run: `npm test -- useStopwatch` → the two new tests FAIL (`pauseCount` undefined); the three existing tests still pass.

- [ ] **Step 6: Extend the hook**

Replace `src/hooks/useStopwatch.ts` with:

```typescript
'use client';

import { useState, useCallback, useReducer, useEffect } from 'react';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  getElapsedSeconds,
  type TimerState,
} from '@/lib/domain/timer';
import {
  createPauseLog,
  logPause,
  logResume,
  getTotalPauseSeconds,
  type PauseLog,
} from '@/lib/domain/pauseLog';

export function useStopwatch() {
  const [state, setState] = useState<TimerState>(() => startTimer());
  const [pauseLog, setPauseLog] = useState<PauseLog>(() => createPauseLog());
  const [isPaused, setIsPaused] = useState(false);
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(forceRerender, 250);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Capture `now` synchronously at call time, then thread the SAME timestamp
  // into both deferred updaters. Critical for auto-pause: a visibilitychange
  // handler calls pause() the instant the tab hides, but React may defer the
  // updater until the tab is foregrounded again — if the updater called
  // Date.now() itself, it would record the foreground time and the hidden
  // interval would leak into elapsed/pause totals. Reading Date.now() here
  // (in the event turn) instead of inside the updater keeps every duration
  // anchored to the real pause moment (timer invariant, MVP spec 4.2).
  const pause = useCallback(() => {
    const now = Date.now();
    setState((s) => pauseTimer(s, now));
    setPauseLog((l) => logPause(l, now));
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    const now = Date.now();
    setState((s) => resumeTimer(s, now));
    setPauseLog((l) => logResume(l, now));
    setIsPaused(false);
  }, []);

  return {
    elapsedSeconds: getElapsedSeconds(state),
    isPaused,
    pause,
    resume,
    pauseCount: pauseLog.count,
    totalPauseSeconds: getTotalPauseSeconds(pauseLog),
  };
}
```

- [ ] **Step 7: Run tests** — `npm test -- useStopwatch` → PASS (5 tests: 3 existing unchanged + 2 new). Run: `npm test` → all pass. `npx tsc --noEmit` → clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/domain/pauseLog.ts src/lib/domain/pauseLog.test.ts src/hooks/useStopwatch.ts src/hooks/useStopwatch.test.ts
git commit -m "feat: timestamp-based pause accounting in the stopwatch"
```

**Done when:** pauseLog and hook tests pass, existing stopwatch tests untouched and green.

---

### Task 5: Auto-pause on visibility loss (all modes) + origin label on the pause overlay

**Files:**
- Modify: `src/components/session/SessionScreen.tsx`
- Modify: `src/components/session/SessionScreen.test.tsx` (APPEND a new describe block only)

**Interfaces:**
- Consumes: `useStopwatch().pauseCount` (Task 4), i18n key `pause.autoLabel` (Task 2).
- Produces: on `document.visibilitychange → hidden` during a running session, the EXISTING pause mechanism engages (timestamp shift; `useCardQuota` freezes automatically because it follows `stopwatch.isPaused` — in challenge mode both the card quota and the total time freeze, identical to a manual pause). On `visible` the session STAYS paused with the existing overlay; the user resumes by click — no auto-resume. New state `pauseOrigin: 'manual' | 'auto' | null` drives a discreet `pause.autoLabel` line on the overlay when the pause was automatic; buttons and behavior are otherwise unchanged. `pauseCountRef` is deleted — the challenge settings payload now reads `stopwatch.pauseCount` (same key, now counting manual + automatic together per spec section 5).
- Edge cases (spec section 4): `hidden` while already paused → no-op (guard) and the origin label is NOT overwritten; `hidden` on setup/results → SessionScreen isn't mounted, nothing to do; rapid `hidden/visible/hidden` → idempotent (guard + Task 4's idempotent log).

- [ ] **Step 1: Write the failing tests (append only)**

APPEND to `src/components/session/SessionScreen.test.tsx` (existing tests stay byte-identical). Two import-line extensions are needed: add `fireEvent` to the existing `@testing-library/react` import (it currently imports `screen, waitFor`) and add `afterEach` to the existing `vitest` import (it currently imports `describe, it, expect, vi, beforeEach`):

```typescript
function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  fireEvent(document, new Event('visibilitychange'));
}

describe('SessionScreen — auto-pause on visibility loss', () => {
  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('pauses with the auto label when the tab hides, stays paused on return, resumes only by click', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={onFinish} />
    );

    setVisibility('hidden');
    expect(await screen.findByText('PAUZIRANO')).toBeInTheDocument();
    expect(screen.getByText('Automatski pauzirano')).toBeInTheDocument();

    setVisibility('visible');
    expect(screen.getByText('PAUZIRANO')).toBeInTheDocument(); // no auto-resume

    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));
    expect(screen.queryByText('PAUZIRANO')).not.toBeInTheDocument();
    expect(screen.queryByText('Automatski pauzirano')).not.toBeInTheDocument();
  });

  it('is idempotent on rapid repeated hidden events', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={onFinish} />
    );

    setVisibility('hidden');
    setVisibility('visible');
    setVisibility('hidden');
    // Still exactly one overlay, still paused.
    expect(screen.getAllByText('PAUZIRANO')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));
    expect(screen.queryByText('PAUZIRANO')).not.toBeInTheDocument();
  });

  it('does not label a manual pause as automatic', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={onFinish} />
    );

    await user.click(screen.getByRole('button', { name: 'Pauza' }));
    expect(screen.getByText('PAUZIRANO')).toBeInTheDocument();
    expect(screen.queryByText('Automatski pauzirano')).not.toBeInTheDocument();

    // hidden while already manually paused must not relabel it
    setVisibility('hidden');
    expect(screen.queryByText('Automatski pauzirano')).not.toBeInTheDocument();
  });
});
```

Run: `npm test -- SessionScreen` → the three new tests FAIL (no auto-pause, no label); existing tests pass.

- [ ] **Step 2: Implement in SessionScreen**

In `src/components/session/SessionScreen.tsx`:

(a) Delete the line `const pauseCountRef = useRef(0);` and drop `useRef` from the React import (it becomes `import { useEffect, useState } from 'react';`).

(b) Add state and handlers after the `useWakeLock(true);` line:

```tsx
  const [pauseOrigin, setPauseOrigin] = useState<'manual' | 'auto' | null>(null);

  function handleManualPause() {
    if (stopwatch.isPaused) return;
    setPauseOrigin('manual');
    stopwatch.pause();
  }

  function handleResume() {
    setPauseOrigin(null);
    stopwatch.resume();
  }
```

(c) Add the visibility effect after the existing create-session effect:

```tsx
  // Auto-pause when the app loses visibility (lock screen, call, tab switch).
  // Reuses the exact same pause path as the button — timestamp shift only.
  // Guard makes repeated `hidden` events idempotent and keeps a manual
  // pause's origin from being overwritten.
  useEffect(() => {
    function autoPause() {
      if (!stopwatch.isPaused) {
        setPauseOrigin('auto');
        stopwatch.pause();
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') autoPause();
    }
    // `pagehide` is the more reliable backgrounding signal on iOS Safari, where
    // `visibilitychange` is less dependable across app-switch / screen lock
    // (spec section 11 review point). Pausing is idempotent (Task 4's log +
    // the isPaused guard), so firing both listeners is harmless. pagehide does
    // NOT fire on the finish→summary state change (not a page navigation), so
    // it won't spuriously pause a completing session.
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', autoPause);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', autoPause);
    };
  }, [stopwatch.isPaused, stopwatch.pause]);
```

(d) Replace the pause/resume button's `onClick` (the bottom-left button) — it currently increments `pauseCountRef` inline:

```tsx
        <button
          onClick={stopwatch.isPaused ? handleResume : handleManualPause}
          className="flex-1 bg-surface/60 border-2 border-white/15 text-foreground rounded-[18px] p-5 font-extrabold text-base"
        >
          {stopwatch.isPaused ? t('workout.resume') : t('workout.pause')}
        </button>
```

(e) In the pause overlay, change the resume button's `onClick={stopwatch.resume}` to `onClick={handleResume}` and add the origin label directly under the `PAUZIRANO` heading:

```tsx
          <p className="text-[30px] font-black text-accent tracking-widest">{t('workout.paused')}</p>
          {pauseOrigin === 'auto' && (
            <p className="text-sm font-semibold text-muted -mt-3">{t('pause.autoLabel')}</p>
          )}
```

(f) In `handleNext`'s finish branch, replace `pause_count: pauseCountRef.current,` inside the challenge `settingsPayload` with `pause_count: stopwatch.pauseCount,` (Task 6 restructures this payload further).

- [ ] **Step 3: Run tests**

Run: `npm test -- SessionScreen` → all pass (existing + 3 new). Run: `npm test` → all pass. `npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/session/SessionScreen.tsx src/components/session/SessionScreen.test.tsx
git commit -m "feat: auto-pause on visibility loss with origin label, all modes"
```

**Done when:** hiding the tab pauses any running session via the existing overlay, labeled as automatic; no auto-resume; existing tests untouched and green.

---

### Task 6: Persist `pause_count` + `total_pause_seconds` for ALL modes

**Files:**
- Modify: `src/lib/domain/types.ts`
- Modify: `src/lib/supabase/sessions.ts`
- Modify: `src/lib/supabase/sessions.test.ts` (one additive test + errata #2)
- Modify: `src/components/session/SessionScreen.tsx`
- Modify: `src/components/session/SessionScreen.test.tsx` (one additive test + errata #1)

**Interfaces:**
- Consumes: `useStopwatch().pauseCount/totalPauseSeconds` (Task 4).
- Produces (Task 7 depends on these):
  - `interface SessionSettings { pause_count?: number; total_pause_seconds?: number }` in `types.ts`; `ChallengeSettings` now `extends SessionSettings` (its own `pause_count` line is removed — inherited; `best_score` etc. unchanged).
  - `SessionResult` gains optional `pauseCount?: number; totalPauseSeconds?: number` — SessionScreen passes them to `onFinish` so the results screen works for guests too.
  - `completeSession(sessionId: string, totalDurationSeconds: number, settings?: SessionSettings | ChallengeSettings)` — classic sessions now ALWAYS pass `{ pause_count, total_pause_seconds }`; challenge sessions merge those two keys into the existing payload (coexisting with `budget_seconds`, `par_source`, `score`, `won`, `best_score` in the same JSONB — no migration).
  - `SessionHistoryEntry` gains `pauseCount: number | null; totalPauseSeconds: number | null` mapped from `settings`; old sessions without the keys map to `null`.

- [ ] **Step 1: Extend the types**

In `src/lib/domain/types.ts` replace the `ChallengeSettings` block with:

```typescript
export interface SessionSettings {
  pause_count?: number;
  total_pause_seconds?: number;
}

export interface ChallengeSettings extends SessionSettings {
  budget_seconds: number;
  par_source: 'par' | 'record';
  score?: number;
  won?: boolean;
  best_score?: number | null;
}
```

and extend `SessionResult`:

```typescript
export interface SessionResult {
  totalDurationSeconds: number;
  draws: CardDrawResult[];
  pauseCount?: number;
  totalPauseSeconds?: number;
}
```

- [ ] **Step 2: Write the failing persistence tests**

In `src/lib/supabase/sessions.test.ts`:

(a) APPEND inside the `challenge extensions` describe (or a new describe):

```typescript
  it('completeSession writes pause stats for classic sessions', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await completeSession('session-1', 990, { pause_count: 2, total_pause_seconds: 161 });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: { pause_count: 2, total_pause_seconds: 161 },
      })
    );
  });

  it('getUserSessions maps pause keys from settings when present', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 's2',
          started_at: '2026-07-13T10:00:00.000Z',
          total_duration_seconds: 900,
          total_cards: 26,
          status: 'completed',
          difficulty_levels: { name: 'Srednji' },
          game_mode: 'classic',
          settings: { pause_count: 3, total_pause_seconds: 161 },
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    const result = await getUserSessions('user-1');
    expect(result[0].pauseCount).toBe(3);
    expect(result[0].totalPauseSeconds).toBe(161);
  });
```

(b) **Errata #2 (spec-mandated, see Global Constraints):** in the EXISTING `getUserSessions` test, the `toEqual` expected object gains two fields — it becomes:

```typescript
    expect(result).toEqual([
      {
        id: 's1',
        startedAt: '2026-07-08T10:00:00.000Z',
        totalDurationSeconds: 180,
        totalCards: 13,
        status: 'completed',
        difficultyName: 'Srednji',
        gameMode: 'classic',
        score: null,
        pauseCount: null,
        totalPauseSeconds: null,
      },
    ]);
```

Run: `npm test -- sessions` → the new tests FAIL (keys not mapped).

- [ ] **Step 3: Implement in sessions.ts**

In `src/lib/supabase/sessions.ts`:

(a) Extend the import: `import type { CategoryKey, SessionConfig, CardDrawResult, GameMode, ChallengeSettings, SessionSettings } from '../domain/types';`

(b) Change `completeSession`'s signature (body unchanged):

```typescript
export async function completeSession(
  sessionId: string,
  totalDurationSeconds: number,
  settings?: SessionSettings | ChallengeSettings
): Promise<void> {
```

(c) Extend `SessionHistoryEntry` and the `getUserSessions` mapping:

```typescript
export interface SessionHistoryEntry {
  id: string;
  startedAt: string;
  totalDurationSeconds: number | null;
  totalCards: number;
  status: string;
  difficultyName: string;
  gameMode: string;
  score: number | null;
  pauseCount: number | null;
  totalPauseSeconds: number | null;
}
```

In the row type annotation change `settings: { score?: number } | null` to `settings: { score?: number; pause_count?: number; total_pause_seconds?: number } | null`, and in the returned map add:

```typescript
    pauseCount: row.settings?.pause_count ?? null,
    totalPauseSeconds: row.settings?.total_pause_seconds ?? null,
```

Run: `npm test -- sessions` → PASS.

- [ ] **Step 4: Write the failing SessionScreen test (append only) + errata #1**

In `src/components/session/SessionScreen.test.tsx`:

(a) APPEND:

```typescript
describe('SessionScreen — pause persistence (all modes)', () => {
  it('completes a classic session with pause stats derived from timestamps', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={config}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );
    await screen.findByRole('button', { name: 'Sledeća karta' });

    await user.click(screen.getByRole('button', { name: 'Pauza' }));
    await vi.advanceTimersByTimeAsync(5_000);
    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ pause_count: 1, total_pause_seconds: 5 })
      )
    );
    const result = onFinish.mock.calls[0][0];
    expect(result.pauseCount).toBe(1);
    expect(result.totalPauseSeconds).toBe(5);
    vi.useRealTimers();
  });
});
```

(b) **Errata #1 (spec-mandated, see Global Constraints):** in the EXISTING "logged in" test, the completion assertion becomes:

```typescript
    expect(completeSession).toHaveBeenCalledWith(
      'session-1',
      expect.any(Number),
      expect.objectContaining({ pause_count: 0, total_pause_seconds: 0 })
    );
```

Run: `npm test -- SessionScreen` → the new test FAILS (classic passes no settings yet).

- [ ] **Step 5: Implement the payload in SessionScreen**

In `src/components/session/SessionScreen.tsx`, inside `handleNext`'s finish branch, replace everything from `stopwatch.pause();` down to (and including) the `onFinish(...)` call with:

```tsx
      stopwatch.pause();
      // Closure reads: totalDurationSeconds and the pause stats come from the
      // render BEFORE the wrap-up pause() above, so finishing the session is
      // not itself counted or timed as a pause.
      const totalDurationSeconds = stopwatch.elapsedSeconds;
      const pauseStats = {
        pause_count: stopwatch.pauseCount,
        total_pause_seconds: stopwatch.totalPauseSeconds,
      };
      const settingsPayload = isChallenge
        ? {
            budget_seconds: config.budgetSeconds as number,
            par_source: config.parSource ?? ('par' as const),
            best_score: config.bestScoreForCombo ?? null,
            ...(({ score, won }) => ({ score, won }))(computeScore(nextDraws)),
            ...pauseStats,
          }
        : pauseStats;
      if (userId && sessionId && saveState === 'ready') {
        try {
          await completeSession(sessionId, totalDurationSeconds, settingsPayload);
        } catch (err) {
          console.error('Failed to complete session', err);
          setSaveState('failed');
        }
      }
      onFinish({
        totalDurationSeconds,
        draws: nextDraws,
        pauseCount: pauseStats.pause_count,
        totalPauseSeconds: pauseStats.total_pause_seconds,
      });
      return;
```

- [ ] **Step 6: Run everything**

Run: `npm test` → all pass (including both errata assertions and all new tests). `npx tsc --noEmit` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain/types.ts src/lib/supabase/sessions.ts src/lib/supabase/sessions.test.ts src/components/session/SessionScreen.tsx src/components/session/SessionScreen.test.tsx
git commit -m "feat: persist pause count and total pause seconds for all modes in sessions.settings"
```

**Done when:** classic and challenge completions both write the two pause keys; history entries carry them; guests get them in-memory via `onFinish`; suite green.

---

### Task 7: Show pauses on results and in history

**Files:**
- Modify: `src/components/summary/SummaryScreen.tsx`
- Modify: `src/components/progress/ProgressScreen.tsx`

**Interfaces:**
- Consumes: `SessionResult.pauseCount/totalPauseSeconds` and `SessionHistoryEntry.pauseCount/totalPauseSeconds` (Task 6); i18n keys `pause.summary`, `pause.historyLabel` (Task 2). Both files already have a local `formatDuration`.
- Produces: results screen shows "Pauze: {count} · ukupno {duration}" under the total time when at least one pause happened; each history row gains a discreet pause-duration line when the data exists and is > 0 (spec section 5: the addition appears "kad podatak postoji" — old sessions without the keys simply show nothing extra). Presentation-only — no automated test, consistent with SummaryScreen's MVP/redesign/gamification treatment; verified visually and in Task 12.

- [ ] **Step 1: Results row**

In `src/components/summary/SummaryScreen.tsx`, directly after the `{t('results.totalTime')}` paragraph, add:

```tsx
        {result.pauseCount != null && result.totalPauseSeconds != null && result.pauseCount > 0 && (
          <p className="text-xs font-semibold text-muted mt-1.5">
            {t('pause.summary', {
              count: result.pauseCount,
              duration: formatDuration(result.totalPauseSeconds),
            })}
          </p>
        )}
```

- [ ] **Step 2: History row addition**

In `src/components/progress/ProgressScreen.tsx`, replace the duration span in the history row (`<span className="text-muted">{formatDuration(session.totalDurationSeconds)}</span>`) with:

```tsx
                  <span className="text-right">
                    <span className="block text-muted">{formatDuration(session.totalDurationSeconds)}</span>
                    {session.totalPauseSeconds != null && session.totalPauseSeconds > 0 && (
                      <span className="block text-[10px] font-semibold text-muted/70">
                        {t('pause.historyLabel', { duration: formatDuration(session.totalPauseSeconds) })}
                      </span>
                    )}
                  </span>
```

- [ ] **Step 3: Verify**

Run: `npm test` → all pass. `npx tsc --noEmit` → clean. Visual (`npm run dev`): finish a workout with one pause → results show the pause row; Progress history shows "⏸ 0:05"-style line under the duration; sessions saved before Krug A show no extra line.

- [ ] **Step 4: Commit**

```bash
git add src/components/summary/SummaryScreen.tsx src/components/progress/ProgressScreen.tsx
git commit -m "feat: show pause count and total on results and in history"
```

**Done when:** pause data renders in both places when present, absent data renders nothing extra, suite green.

---

### Task 8: Mode explanations — registry `explanationKey`, shared `InfoModal`, ⓘ on mode cards

**Files:**
- Create: `src/components/ui/InfoModal.tsx`
- Modify: `src/lib/modes/registry.ts`
- Modify: `src/components/setup/ModeSelector.tsx`
- Test: `src/components/setup/ModeSelector.test.tsx` (new file)

**Interfaces:**
- Consumes: i18n keys `modes.infoAria`, `modes.classic.explanation`, `modes.perfect_deck.explanation`, `common.close` (Task 2).
- Produces (Tasks 9/10 depend on these):
  - `InfoModal` props: `{ title: string; onClose: () => void; closeLabel: string; children: ReactNode }` — bottom sheet with `role="dialog"`, backdrop click and button both close.
  - `ModeDefinition` gains required `explanationKey: string`; `MODES` entries get `'modes.classic.explanation'` / `'modes.perfect_deck.explanation'`. Future modes bring their own key — step 0 renders explanations without changes (spec section 6).
  - ModeSelector: each card wrapped in `relative` div; card button unchanged in content and accessible name (existing SetupScreen tests query `/Klasično/` and `/Perfektan špil/` — the ⓘ button's accessible name is `modes.infoAria` ("Objašnjenje moda"), which matches neither regex, so those queries still resolve uniquely); ⓘ opens the modal, does NOT select the mode.

- [ ] **Step 1: Write the failing component tests**

Create `src/components/setup/ModeSelector.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { ModeSelector } from './ModeSelector';

describe('ModeSelector info buttons', () => {
  it('opens the explanation modal from ⓘ without selecting the mode, and closes it', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector onSelect={onSelect} />);

    const infoButtons = screen.getAllByRole('button', { name: 'Objašnjenje moda' });
    expect(infoButtons).toHaveLength(2);

    await user.click(infoButtons[1]); // perfect_deck card
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Svaka karta ima svoju vremensku kvotu/)).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Zatvori' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the classic explanation for the classic card', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector onSelect={vi.fn()} />);

    await user.click(screen.getAllByRole('button', { name: 'Objašnjenje moda' })[0]);
    expect(screen.getByText(/Svojim tempom, bez pritiska/)).toBeInTheDocument();
  });

  it('still selects a mode when the card itself is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ModeSelector onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Klasično/ }));
    expect(onSelect).toHaveBeenCalledWith('classic');
  });
});
```

Run: `npm test -- ModeSelector` → FAIL (no ⓘ buttons).

- [ ] **Step 2: Create InfoModal**

Create `src/components/ui/InfoModal.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';

interface InfoModalProps {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}

// Shared bottom-sheet explanation modal (mode info, first-run intro, streak).
export function InfoModal({ title, onClose, closeLabel, children }: InfoModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/90 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-surface rounded-t-3xl p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-extrabold mb-3">{title}</h2>
        <div className="text-sm font-semibold text-muted leading-relaxed whitespace-pre-line">
          {children}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-accent text-background rounded-[18px] p-4 font-extrabold text-base"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Extend the registry**

Replace `src/lib/modes/registry.ts` content:

```typescript
import type { GameMode } from '../domain/types';

export interface ModeDefinition {
  id: GameMode;
  titleKey: string;
  descKey: string;
  explanationKey: string;
  isChallenge: boolean;
}

// Future modes ("survive_deck", "ghost_race", "sprint" — see spec section 1)
// are added here as new entries plus message keys; step 0 renders cards AND
// their ⓘ explanations from this list.
export const MODES: ModeDefinition[] = [
  {
    id: 'classic',
    titleKey: 'setup.classicTitle',
    descKey: 'setup.classicDesc',
    explanationKey: 'modes.classic.explanation',
    isChallenge: false,
  },
  {
    id: 'perfect_deck',
    titleKey: 'setup.challengeTitle',
    descKey: 'setup.challengeDesc',
    explanationKey: 'modes.perfect_deck.explanation',
    isChallenge: true,
  },
];
```

- [ ] **Step 4: Add ⓘ to ModeSelector**

Replace `src/components/setup/ModeSelector.tsx` content:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MODES, type ModeDefinition } from '@/lib/modes/registry';
import { InfoModal } from '@/components/ui/InfoModal';
import type { GameMode } from '@/lib/domain/types';

interface ModeSelectorProps {
  onSelect: (mode: GameMode) => void;
  beatChipLabel?: string | null;
}

export function ModeSelector({ onSelect, beatChipLabel }: ModeSelectorProps) {
  const t = useTranslations();
  const [infoMode, setInfoMode] = useState<ModeDefinition | null>(null);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseMode')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {MODES.map((mode) => (
          <div key={mode.id} className="relative">
            <button
              onClick={() => onSelect(mode.id)}
              className={`w-full text-left rounded-[18px] p-5 border-2 ${
                mode.isChallenge
                  ? 'bg-accent/10 border-accent'
                  : 'bg-surface border-white/5 hover:border-accent/50'
              }`}
            >
              <span className={`block text-[19px] font-extrabold mb-1 ${mode.isChallenge ? 'text-accent' : ''}`}>
                {t(mode.titleKey)}
              </span>
              <span className="block text-sm font-semibold text-muted pr-8">{t(mode.descKey)}</span>
              {mode.isChallenge && beatChipLabel && (
                <span className="inline-block mt-2 bg-background text-accent text-xs font-extrabold px-2.5 py-1.5 rounded-lg">
                  {beatChipLabel}
                </span>
              )}
            </button>
            <button
              onClick={() => setInfoMode(mode)}
              aria-label={t('modes.infoAria')}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/60 text-muted font-extrabold text-sm"
            >
              ⓘ
            </button>
          </div>
        ))}
      </div>
      {infoMode && (
        <InfoModal
          title={t(infoMode.titleKey)}
          closeLabel={t('common.close')}
          onClose={() => setInfoMode(null)}
        >
          {t(infoMode.explanationKey)}
        </InfoModal>
      )}
    </div>
  );
}
```

(Card buttons keep their exact content and accessible names; `w-full` compensates for the new wrapper div, `pr-8` keeps the description clear of the ⓘ button.)

- [ ] **Step 5: Run tests**

Run: `npm test -- ModeSelector` → PASS (3 tests). Run: `npm test` → all pass — in particular `SetupScreen.test.tsx`'s `/Klasično/` and `/Perfektan špil/` queries still match exactly one button each. `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/InfoModal.tsx src/lib/modes/registry.ts src/components/setup/ModeSelector.tsx src/components/setup/ModeSelector.test.tsx
git commit -m "feat: mode explanations via registry-driven info modal on step 0 cards"
```

**Done when:** ⓘ on each mode card opens the registry-driven explanation; card selection unchanged; suite green.

---

### Task 9: Perfect-deck first-run modal (localStorage-gated, before the session starts)

**Files:**
- Create: `src/lib/modes/explained.ts`
- Test: `src/lib/modes/explained.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx` (mock extension + one additive test; the existing test stays byte-identical)

**Interfaces:**
- Consumes: `InfoModal` (Task 8), i18n keys `modes.firstRunCta`, `modes.perfect_deck.explanation`, `setup.challengeTitle` (Task 2).
- Produces: `hasSeenExplanation(modeId: string): boolean` and `markExplained(modeId: string): void` over localStorage key `explained.<modeId>` (spec section 6's exact flag `explained.perfect_deck`), try/catch-safe for private-mode browsers. `page.tsx` shows the explanation as a gate BEFORE mounting `SessionScreen` on the first perfect_deck run of the device — timers, quota, and session creation don't exist until the user taps "Jasno, krećemo", so the timer invariant is untouched by construction. Placement deviation from the spec's letter ("u SessionScreen") documented in Self-Review: the gate lives one level up, in the `'session'` branch of `page.tsx`, which is behaviorally identical ("pre prve karte") and keeps SessionScreen's mount == session start.

- [ ] **Step 1: Write the failing flag tests**

Create `src/lib/modes/explained.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { hasSeenExplanation, markExplained } from './explained';

describe('explained flags', () => {
  beforeEach(() => {
    localStorage.removeItem('explained.perfect_deck');
  });

  it('is false before marking and true after, persisted under explained.<id>', () => {
    expect(hasSeenExplanation('perfect_deck')).toBe(false);
    markExplained('perfect_deck');
    expect(hasSeenExplanation('perfect_deck')).toBe(true);
    expect(localStorage.getItem('explained.perfect_deck')).toBe('true');
  });
});
```

Run: `npm test -- explained` → FAIL (module missing).

- [ ] **Step 2: Implement the flags**

Create `src/lib/modes/explained.ts`:

```typescript
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
```

Run: `npm test -- explained` → PASS.

- [ ] **Step 3: Extend the page test (mock extension + new test)**

In `src/app/page.test.tsx`:

(a) Extend the `SetupScreen` mock so it can also start a challenge (the existing `finish-setup` button stays; the existing test still clicks only it):

```tsx
vi.mock('@/components/setup/SetupScreen', () => ({
  SetupScreen: ({ onStart }: { onStart: (c: unknown, d: unknown[]) => void }) => (
    <>
      <button onClick={() => onStart({ deckSize: 13 }, [{ completedAt: null }])}>finish-setup</button>
      <button
        onClick={() =>
          onStart({ deckSize: 13, gameMode: 'perfect_deck', budgetSeconds: 100 }, [{ completedAt: null }])
        }
      >
        finish-setup-challenge
      </button>
    </>
  ),
}));
```

(b) APPEND a new test to the describe:

```tsx
  it('shows the perfect_deck first-run explanation once, before the session starts', async () => {
    localStorage.removeItem('explained.perfect_deck');
    const user = userEvent.setup();
    const { unmount } = renderWithIntl(<Home />);

    await user.click(screen.getByRole('button', { name: 'Nastavi kao gost' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup-challenge' }));

    // Gate: session has NOT started while the explanation is up.
    expect(await screen.findByText(/Svaka karta ima svoju vremensku kvotu/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'finish-session' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Jasno, krećemo' }));
    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
    expect(localStorage.getItem('explained.perfect_deck')).toBe('true');

    // Second run on the same device: no modal, straight to the session.
    unmount();
    renderWithIntl(<Home />);
    await user.click(screen.getByRole('button', { name: 'Nastavi kao gost' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup-challenge' }));
    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
    expect(screen.queryByText(/Svaka karta ima svoju vremensku kvotu/)).not.toBeInTheDocument();
  });
```

Run: `npm test -- page` → new test FAILS (no gate yet); existing test passes.

- [ ] **Step 4: Implement the gate in page.tsx**

In `src/app/page.tsx`:

(a) Add imports:

```tsx
import { InfoModal } from '@/components/ui/InfoModal';
import { hasSeenExplanation, markExplained } from '@/lib/modes/explained';
```

(b) Add state next to the other `useState` calls:

```tsx
  const [showChallengeIntro, setShowChallengeIntro] = useState(false);
```

(c) In `handleSetupStart`, before `setScreen('session');`:

```tsx
    if (sessionConfig.gameMode === 'perfect_deck' && !hasSeenExplanation('perfect_deck')) {
      setShowChallengeIntro(true);
    }
```

(d) Replace the `'session'` branch:

```tsx
  if (screen === 'session' && config) {
    if (showChallengeIntro) {
      // First perfect_deck run on this device: explain the rules BEFORE the
      // session (and its timers) exist. Dismissal mounts SessionScreen fresh.
      return (
        <InfoModal
          title={t('setup.challengeTitle')}
          closeLabel={t('modes.firstRunCta')}
          onClose={() => {
            markExplained('perfect_deck');
            setShowChallengeIntro(false);
          }}
        >
          {t('modes.perfect_deck.explanation')}
        </InfoModal>
      );
    }
    return (
      <SessionScreen
        config={config}
        draws={draws}
        categoryIdByKey={categoryIdByKey}
        userId={user?.id ?? null}
        onFinish={handleSessionFinish}
      />
    );
  }
```

- [ ] **Step 5: Run tests**

Run: `npm test -- page` → PASS (2 tests). Run: `npm test` → all pass. `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/modes/explained.ts src/lib/modes/explained.test.ts src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: first-run perfect-deck explanation gate before the session starts"
```

**Done when:** first perfect_deck start shows the explanation and only proceeds on CTA; never again afterwards (except via ⓘ); classic flow untouched; suite green.

---

### Task 10: Streak mechanics modal (landing flame + Progress streak card)

**Files:**
- Create: `src/components/streak/StreakInfoModal.tsx`
- Test: `src/components/streak/StreakInfoModal.test.tsx`
- Modify: `src/components/landing/LandingScreen.tsx`
- Modify: `src/components/progress/ProgressScreen.tsx`

**Interfaces:**
- Consumes: `InfoModal` (Task 8), `calculateStreak` results already fetched by both screens, i18n keys `streak.title`, `streak.explanation`, `common.close` + existing `progress.streak`, `progress.streakCaption` (Task 2 / gamification).
- Produces: `StreakInfoModal` props `{ days: number; freezesLeftThisWeek: number; onClose: () => void }` — explanation text plus the CURRENT state line (streak length + freezes left this week, spec section 7). Landing: the 🔥 line becomes a button opening the modal, and the landing fetch now keeps the whole `{ days, freezesLeftThisWeek }` result instead of just `days`. Progress: the streak card becomes a button opening the modal (identical children/classes plus `text-left w-full`).

- [ ] **Step 1: Write the failing modal tests**

Create `src/components/streak/StreakInfoModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/renderWithIntl';
import { StreakInfoModal } from './StreakInfoModal';

describe('StreakInfoModal', () => {
  it('shows the mechanic explanation and the current state', () => {
    renderWithIntl(<StreakInfoModal days={4} freezesLeftThisWeek={1} onClose={() => {}} />);

    expect(screen.getByText(/Niz raste za svaki dan/)).toBeInTheDocument();
    // The state line only — NOT `/❄️/`, which also appears in the explanation
    // paragraph and would make getByText throw on multiple matches.
    expect(screen.getByText(/4 dana/)).toBeInTheDocument();
    expect(screen.getByText(/zamrzavanja ove nedelje/)).toBeInTheDocument();
  });

  it('closes via the button', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<StreakInfoModal days={4} freezesLeftThisWeek={2} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Zatvori' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

Run: `npm test -- StreakInfoModal` → FAIL (module missing).

- [ ] **Step 2: Implement the modal**

Create `src/components/streak/StreakInfoModal.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { InfoModal } from '@/components/ui/InfoModal';

interface StreakInfoModalProps {
  days: number;
  freezesLeftThisWeek: number;
  onClose: () => void;
}

// Minimal streak-mechanics explainer (spec section 7). The trained/frozen-day
// calendar is Krug B (Progress redesign) — this modal only removes the
// "what are the snowflakes" mystery now.
export function StreakInfoModal({ days, freezesLeftThisWeek, onClose }: StreakInfoModalProps) {
  const t = useTranslations();
  return (
    <InfoModal title={t('streak.title')} closeLabel={t('common.close')} onClose={onClose}>
      <p className="mb-3">{t('streak.explanation')}</p>
      <p className="font-extrabold text-foreground">
        🔥 {t('progress.streak', { days })} ·{' '}
        {t('progress.streakCaption', { freezes: '❄️'.repeat(freezesLeftThisWeek) || '0' })}
      </p>
    </InfoModal>
  );
}
```

Run: `npm test -- StreakInfoModal` → PASS (2 tests).

- [ ] **Step 3: Landing — tappable flame with full streak state**

In `src/components/landing/LandingScreen.tsx`:

(a) Add imports:

```tsx
import { StreakInfoModal } from '@/components/streak/StreakInfoModal';
```

(b) Replace the `streakDays` state and effect with the full-result version plus modal state:

```tsx
  const [streak, setStreak] = useState<{ days: number; freezesLeftThisWeek: number } | null>(null);
  const [showStreakInfo, setShowStreakInfo] = useState(false);

  useEffect(() => {
    if (!user) return;
    getCompletedSessionDates(user.id)
      .then((dates) => setStreak(calculateStreak(dates, new Date())))
      .catch(() => setStreak(null));
  }, [user]);
```

(c) Replace the flame paragraph in the logged-in block:

```tsx
            {streak !== null && streak.days > 0 && (
              <button
                onClick={() => setShowStreakInfo(true)}
                className="text-center text-accent font-extrabold"
              >
                🔥 {t('landing.streakDays', { days: streak.days })}
              </button>
            )}
```

(d) Render the modal at the end of the outer div (before its closing tag):

```tsx
      {showStreakInfo && streak !== null && (
        <StreakInfoModal
          days={streak.days}
          freezesLeftThisWeek={streak.freezesLeftThisWeek}
          onClose={() => setShowStreakInfo(false)}
        />
      )}
```

- [ ] **Step 4: Progress — tappable streak card**

In `src/components/progress/ProgressScreen.tsx`:

(a) Add the import and modal state:

```tsx
import { StreakInfoModal } from '@/components/streak/StreakInfoModal';
```
```tsx
  const [showStreakInfo, setShowStreakInfo] = useState(false);
```

(b) Turn the streak card div into a button (children unchanged):

```tsx
          <button
            type="button"
            onClick={() => setShowStreakInfo(true)}
            className="bg-surface rounded-2xl p-4 flex items-center gap-3 mb-5 text-left w-full"
          >
```
(and its matching closing tag becomes `</button>`)

(c) Render the modal inside the loaded (`<>...</>`) branch, after the history block:

```tsx
          {showStreakInfo && (
            <StreakInfoModal
              days={streak.days}
              freezesLeftThisWeek={streak.freezesLeftThisWeek}
              onClose={() => setShowStreakInfo(false)}
            />
          )}
```

- [ ] **Step 5: Run everything**

Run: `npm test` → all pass (`page.test.tsx` renders LandingScreen with `user: null`, so the streak block never mounts — untouched behavior). `npx tsc --noEmit` → clean. Visual: tap 🔥 on landing and the streak card on Progress → modal with explanation + current state.

- [ ] **Step 6: Commit**

```bash
git add src/components/streak src/components/landing/LandingScreen.tsx src/components/progress/ProgressScreen.tsx
git commit -m "feat: streak mechanics modal from the landing flame and progress card"
```

**Done when:** both entry points open the modal showing mechanics + current state; suite green.

---

### Task 11: Locale registry + language dropdown on landing

**Files:**
- Create: `src/i18n/locales.ts`
- Test: `src/i18n/locales.test.ts`
- Modify: `src/components/landing/LandingScreen.tsx`
- Test: `src/components/landing/LandingScreen.test.tsx` (new file)

**Interfaces:**
- Consumes: `AppLocale`, `useLocaleSetting` (existing `LocaleProvider`), i18n key `language.label` (Task 2).
- Produces: `interface LocaleOption { code: AppLocale; label: string }` and `LOCALES: LocaleOption[]` (`en`/`English`, `sr`/`Srpski`) — adding a language later = one new entry + a JSON catalog + widening `AppLocale`, zero component changes (spec section 8). Landing's two SR/EN text buttons are REPLACED by one native `<select>` styled with tokens, value = current locale, `aria-label` = `language.label`. Behavior unchanged: localStorage persistence and English default stay in `LocaleProvider`; no i18n routing.

- [ ] **Step 1: Write the failing registry tests**

Create `src/i18n/locales.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { LOCALES } from './locales';

describe('LOCALES registry', () => {
  it('contains unique codes with non-empty labels', () => {
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(LOCALES.every((l) => l.label.trim().length > 0)).toBe(true);
  });

  it('offers exactly en and sr in this release', () => {
    expect(LOCALES.map((l) => l.code).sort()).toEqual(['en', 'sr']);
  });
});
```

Run: `npm test -- locales` → FAIL (module missing).

- [ ] **Step 2: Implement the registry**

Create `src/i18n/locales.ts`:

```typescript
import type { AppLocale } from './LocaleProvider';

export interface LocaleOption {
  code: AppLocale;
  label: string; // endonym — shown untranslated in the menu
}

// Adding a language = a new entry here + messages/<code>.json + widening
// AppLocale in LocaleProvider. No component changes (spec section 8).
export const LOCALES: LocaleOption[] = [
  { code: 'en', label: 'English' },
  { code: 'sr', label: 'Srpski' },
];
```

Run: `npm test -- locales` → PASS (2 tests).

- [ ] **Step 3: Write the failing landing test**

Create `src/components/landing/LandingScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import sr from '../../../messages/sr.json';
import { LocaleContext } from '@/i18n/LocaleProvider';
import { LandingScreen } from './LandingScreen';

vi.mock('@/lib/supabase/records', () => ({
  getCompletedSessionDates: vi.fn().mockResolvedValue([]),
}));

// Local render helper: like renderWithIntl but with a spyable setLocale.
function renderWithLocaleSpy(ui: ReactElement) {
  const setLocale = vi.fn();
  render(
    <LocaleContext.Provider value={{ locale: 'sr', setLocale }}>
      <NextIntlClientProvider locale="sr" messages={sr} timeZone="Europe/Belgrade">
        {ui}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
  return setLocale;
}

describe('LandingScreen language menu', () => {
  it('lists every locale from the registry and switches via setLocale', async () => {
    const user = userEvent.setup();
    const setLocale = renderWithLocaleSpy(
      <LandingScreen user={null} onStartWorkout={() => {}} onShowHistory={() => {}} onSignOut={() => {}} />
    );

    const select = screen.getByRole('combobox', { name: 'Jezik' });
    expect(select).toHaveValue('sr');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Srpski' })).toBeInTheDocument();

    await user.selectOptions(select, 'en');
    expect(setLocale).toHaveBeenCalledWith('en');
  });
});
```

Run: `npm test -- LandingScreen` → FAIL (no combobox yet).

- [ ] **Step 4: Replace the toggle with the dropdown**

In `src/components/landing/LandingScreen.tsx`:

(a) Add imports:

```tsx
import { LOCALES } from '@/i18n/locales';
import type { AppLocale } from '@/i18n/LocaleProvider';
```

(b) Replace the whole SR/EN toggle block (the `absolute top-4 right-5` div with the two buttons) with:

```tsx
      <div className="absolute top-4 right-5">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as AppLocale)}
          aria-label={t('language.label')}
          className="bg-surface text-foreground text-sm font-bold rounded-xl px-3 py-2 border-2 border-white/15"
        >
          {LOCALES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
```

- [ ] **Step 5: Run everything**

Run: `npm test -- LandingScreen` → PASS. Run: `npm test` → all pass (no existing test asserts the SR/EN buttons). `npx tsc --noEmit` → clean. Visual: menu shows "Srpski"/"English", switching flips the whole UI instantly and persists across reload (existing `LocaleProvider` behavior).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/locales.ts src/i18n/locales.test.ts src/components/landing/LandingScreen.tsx src/components/landing/LandingScreen.test.tsx
git commit -m "feat: locale registry and language dropdown replacing the SR/EN toggle"
```

**Done when:** the dropdown renders from the registry, switching works and persists, suite green.

---

### Task 12: Final verification and push

**Files:** none (fix in place if the walkthrough finds defects, then re-run).

- [ ] **Step 1: Automated checks**

Run: `npm test` → every suite passes. New tests vs. Task 1's count: useWakeLock 6, pauseLog 6, useStopwatch +2, SessionScreen +4, sessions +2, ModeSelector 3, explained 1, page +1, StreakInfoModal 2, locales 2, LandingScreen 1 (= +30). Run: `npx tsc --noEmit` → clean.

- [ ] **Step 2: Desktop manual walkthrough**

`npm run dev`:
1. Landing: language menu (top-right) lists English/Srpski; switching flips the UI and survives reload. Tapping 🔥 (logged-in, streak > 0) opens the streak modal with explanation + current freezes.
2. Setup step 0: each mode card has ⓘ; tapping it opens the explanation without selecting the mode; the card itself still advances.
3. First perfect_deck start on a fresh browser profile (or after `localStorage.removeItem('explained.perfect_deck')` in DevTools): explanation appears BEFORE the session; "Jasno, krećemo" starts it; second start skips the modal.
4. During any session, switch to another tab → on return the pause overlay is up with "Automatski pauzirano"; the stopwatch (and in challenge, the card quota) did not advance while hidden; "Nastavi trening" resumes. Manual pause shows no auto label.
5. Finish a session with 1 manual + 1 auto pause → results show "Pauze: 2 · ukupno M:SS"; Progress history row shows the ⏸ line; a pre-Krug-A session shows no ⏸ line.
6. Supabase Table Editor: the new session's `settings` contains `pause_count` and `total_pause_seconds` for BOTH a classic and a challenge session (challenge keys coexist with `budget_seconds`/`score`/`won`); no schema changes anywhere.
7. Guest run: results still show the pause row (in-memory), Network tab shows zero Supabase writes.

- [ ] **Step 3: Push**

```bash
git push origin main
```

**Done when:** suite green, walkthrough clean, pushed. Phone verification below is the release gate for the visibility/wake-lock behavior — it cannot be verified on desktop.

---

## Ručna verifikacija na telefonu

Obavezan korak PRE proglašavanja Kruga A završenim (spec sekcije 3 i 10). Testirati na realnom uređaju — Chrome na Androidu i Safari na iOS-u — nad deploy-ovanom verzijom (Vercel), ulogovan korisnik, perfect_deck sesija u toku ako nije drugačije rečeno:

1. **Zaključavanje usred challenge-a:** zaključaj telefon dugmetom usred karte sa aktivnom kvotom; sačekaj ≥30 s; otključaj. Očekivano: pauza overlay sa "Automatski pauzirano", kvota karte zamrznuta na vrednosti od pre zaključavanja, ukupno vreme nije poraslo; "Nastavi trening" nastavlja tačno odakle je stalo.
2. **Dolazni poziv:** primi (ili simuliraj) poziv tokom sesije. Očekivano: isto kao pod 1 — pauza aktivna, kvota zamrznuta, vreme tačno po povratku u aplikaciju.
3. **Prebacivanje aplikacije:** prebaci se na drugu aplikaciju pa se vrati (i varijanta: brzo napred-nazad više puta). Očekivano: pauza aktivna sa auto oznakom, bez dupliranja pauza (`pause_count` u bazi raste za 1 po stvarnoj pauzi, ne po eventu).
4. **Wake Lock:** tokom aktivne sesije ne diraj ekran duže od sistemskog timeout-a za gašenje. Očekivano: ekran ostaje upaljen (Chrome Android; Safari iOS 16.4+). Na uređaju sa battery saver-om: ekran sme da se ugasi, aplikacija radi normalno bez poruke — a gašenje ekrana tada auto-pauzira sesiju (visibilitychange), što je i željeno ponašanje.
5. **Podaci:** posle scenarija 1–3 završi sesiju i proveri: rezultati prikazuju tačan broj pauza i zbir; Supabase `sessions.settings` sadrži `pause_count`/`total_pause_seconds`; vreme sesije odgovara stvarno vežbanom vremenu (bez vremena provedenog van aplikacije).
6. **Prvi-put modal na telefonu:** na uređaju koji nikad nije pokrenuo challenge — modal se prikazuje pre prve karte; posle "Jasno, krećemo" više nikad (osim kroz ⓘ).

Ako bilo koji scenario padne, otvoriti nalaz kao bug PRE nastavka na Krug B (posebna pažnja: Safari `visibilitychange` ivice i ponašanje Wake Lock-a pri poker-face battery režimima — spec sekcija 11 traži da revizija ovo posebno oceni).

---

## Self-Review Notes

- **Spec coverage:** §3 Wake Lock → Task 3 (request/release/re-acquire, graceful fallback, session-screen-only mounting). §4 auto-pauza → Task 5 (postojeći timestamp-shift mehanizam, svi modovi, bez auto-nastavka, `pause.autoLabel`, sve tri ivice pokrivene testovima ili guard-om). §5 zbir pauza → Tasks 4/6/7 (timestamp akumulacija, isti `pause_count` ključ proširen na sve modove, `total_pause_seconds` nov, prikaz na rezultatima i istoriji, nula migracija, owner-RLS napomena nasleđena iz gamifikacijskog spec-a). §6 objašnjenja → Tasks 8/9 (registry-driven ⓘ + localStorage-gated prvi-put modal, tačan flag `explained.perfect_deck`, predloženi tekstovi preneti doslovno u kataloge). §7 streak → Task 10 (oba entry point-a, objašnjenje + trenutno stanje iz već dostupnog `calculateStreak` rezultata). §8 jezik → Task 11 (registar + native select, ponašanje nepromenjeno). §9 i18n → Task 2 (svi predloženi ključevi + `common.close`, `streak.title`, `modes.infoAria`, `modes.firstRunCta`, `pause.historyLabel` koji spec implicira prikazima). §10 testiranje → TDD u svakom tasku sa logikom; prezentacioni Task 7 ručno (presedan iz MVP/redizajna/gamifikacije); ručna verifikacija na telefonu = završna sekcija.
- **Documented deviations (deliberate, do not "fix" silently):** (a) `useWakeLock` u `src/hooks/`, registar lokala u `src/i18n/` — repo konvencije umesto spec-ovih `src/lib/hooks/`/`src/lib/i18n/`. (b) Prvi-put modal je gate u `page.tsx` pre montiranja `SessionScreen`-a, ne unutar njega — tajmeri ne postoje dok modal ne padne, pa je invarijanta očuvana konstrukcijom; ponašanje identično spec-u ("pre prve karte"). (c) Red pauza na rezultatima i ⏸ linija u istoriji prikazuju se samo kad je podataka > 0; spec-ova rečenica o "—" za stare sesije primenjena je kao "bez dodatka" jer isti pasus traži "diskretan dodatak kad podatak postoji" — revizija može da preokrene na eksplicitno "—". (d) Dve errata izmene postojećih assert-a (klasični `completeSession` arity; `getUserSessions` `toEqual`) — spec §5 ih čini neizbežnim; nijedna druga postojeća test linija se ne menja. (e) Završni `stopwatch.pause()` pri kraju sesije prolazi kroz pause log, ali se persisted vrednosti čitaju iz closure-a render-a PRE tog poziva, pa wrap-up pauza ne ulazi u statistiku — pokriveno assertom `pause_count: 0` u errata #1 i komentarom u kodu.
- **Type consistency check:** `PauseLog { count, accumulatedMs, pausedAt }` i četiri funkcije iz Task 4 tačno odgovaraju pozivima u `useStopwatch` (Task 4) — jedini potrošač; `useStopwatch().pauseCount/totalPauseSeconds` odgovara čitanjima u Tasks 5/6; `SessionSettings | ChallengeSettings` unija u `completeSession` prima i klasični literal i challenge literal bez excess-property greške; `SessionResult.pauseCount/totalPauseSeconds` (Task 6) odgovara čitanjima u `SummaryScreen` (Task 7); `SessionHistoryEntry.pauseCount/totalPauseSeconds` (Task 6) odgovara `ProgressScreen` (Task 7); `InfoModal { title, onClose, closeLabel, children }` (Task 8) odgovara pozivima u Tasks 8/9/10; `ModeDefinition.explanationKey` (Task 8) odgovara ključevima iz Task 2; `LocaleOption { code: AppLocale; label }` (Task 11) odgovara `AppLocale = 'en' | 'sr'` iz postojećeg `LocaleProvider`-a.
- **Postojeći test kontrakti provereni u kodu, ne pretpostavljeni:** `SetupScreen.test.tsx` traži mode kartice regex-ima `/Klasično/` i `/Perfektan špil/` — ⓘ dugme namerno nosi accessible name "Objašnjenje moda" da ne kolidira; `page.test.tsx` mock-uje SetupScreen/SessionScreen/SummaryScreen pa gate iz Task 9 testira stvarnu `page.tsx` logiku; `useStopwatch.test.ts` i `SessionScreen.test.tsx` dobijaju isključivo APPEND blokove (osim dve errata linije); `renderWithIntl` je pinovan na `sr`, pa svi novi assert-i koriste srpske stringove iz Task 2 kataloga.

## Nezavisna revizija (fresh context) — nalazi i primenjene ispravke

Revizija je proverila svaki kod-blok protiv stvarnog repoa i posebno ocenila tri tačke iz spec §11. Primenjeno pre handoff-a:

1. **[BLOCKER, Task 10] Streak modal test bi pao kako je napisan.** `screen.getByText(/❄️/)` matchuje DVA elementa — i pasus objašnjenja (`streak.explanation` sadrži ❄️) i liniju stanja — pa `getByText` baca grešku o višestrukom matchu. Ispravljeno: assertuje se `/zamrzavanja ove nedelje/`, koji je jedinstven za liniju stanja (objašnjenje ima "svake nedelje", ne "ove nedelje").
2. **[MAJOR/PLAUSIBLE, Task 4] Tajmer invarijanta na auto-pauzi.** `useStopwatch.pause/resume` su čitali `Date.now()` LENJO, unutar setState updater-a. Za ručnu pauzu je svejedno (korisnik je prisutan), ali auto-pauza se okida iz `visibilitychange` handler-a u trenutku sakrivanja taba; ako browser odloži React flush do vraćanja u foreground (moguće na agresivnim mobilnim browserima), updater bi pročitao foreground vreme i sakriveni interval bi procurio u ukupno vreme i zbir pauza. Ispravljeno: `const now = Date.now()` se hvata sinhrono na početku `pause()`/`resume()` (u event turn-u) i prosleđuje u OBA updater-a (`pauseTimer`/`logPause` već primaju `now`). Ne menja nijedan postojeći test (svi pozivaju `pause()` bez argumenta nakon `vi.setSystemTime`). Napomena: `useCardQuota` i dalje pauzira kroz render-time `isPaused` coupling; ako se isti odloženi-flush scenario materijalizuje, kvota bi mogla da "otkuca" tokom sakrivenog perioda — zato je "kvota zamrznuta" izričito gate u ručnoj telefonskoj verifikaciji (scenario 1).
3. **[MAJOR, Task 5] iOS Safari `visibilitychange` pouzdanost.** `visibilitychange → hidden` je manje pouzdan na iOS Safari pri app-switch/zaključavanju (bfcache, freeze). Dodat `window 'pagehide'` listener koji poziva isti idempotentni `autoPause()` — belt-and-suspenders bez rizika (pause je idempotentan; pagehide ne okida na finish→summary jer to nije navigacija).
4. **[Verifikovano OK, ne menja se] Closure-read trik u Task 6.** Čitanje `stopwatch.pauseCount/totalPauseSeconds` iz render closure-a POSLE `stopwatch.pause()` daje pre-pauza vrednosti: `pause()` poziva setState (ne mutira tekući `stopwatch` objekat), pa closure vidi vrednosti tekućeg render-a; `getTotalPauseSeconds` je stabilan kad je `pausedAt === null` (a jeste, jer je dugme "Sledeća" onemogućeno dok je pauzirano). Errata #1 (`pause_count: 0`) to i potvrđuje. Wrap-up pauza se ne broji.
5. **[Verifikovano OK] Wake Lock ↔ auto-pauza interakcija.** U jsdom `useWakeLock` izlazi pre dodavanja listener-a (`if (!wakeLock) return`), pa ne ometa SessionScreen testove auto-pauze. U realnom app-u dva `visibilitychange` listener-a ne kolidiraju: wake lock re-akvizira samo na `visible`, auto-pauza reaguje samo na `hidden`; re-akvizicija dok je sesija pauzirana je konzistentna sa spec-om (lock vezan za montiranje SessionScreen-a). Bez double-request/leak rizika.
6. **[Ton tekstova — OK] Predloženi SR/EN stringovi.** Prirodni, konzistentni sa glasom postojećeg kataloga; ICU apostrof-escape (`isn't`/`doesn't`/`can't`/`let's`) je literal jer apostrof nije ispred `{`/`}`/`#` — isti obrazac već radi u `workout.saveFailed`, dokazano u ovom repou.
