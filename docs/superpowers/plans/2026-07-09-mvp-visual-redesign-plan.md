# MVP Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Claude Design prototype's look (dark + volt palette, Nunito font) to all MVP screens and correct the card rank scheme to As=1, without changing any tested logic or component interfaces.

**Architecture:** Pure retouch pass over the completed MVP. Design tokens are defined once in Tailwind v4's CSS-first `@theme` block; each screen component's JSX/classes are rewritten to visually match `docs/superpowers/specs/assets/mvp-visual-redesign/Trening.dc.html`. The only domain change is the rank scheme (1–13 instead of 2–14). Where the prototype's *interactions* differ from the MVP's tested behavior, the MVP behavior wins (see Documented Deviations).

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4 (CSS-first config — no `tailwind.config.ts`), `next/font/google` (Nunito), Vitest + Testing Library.

## Global Constraints

- **Precondition:** ALL 28 tasks of `docs/superpowers/plans/2026-07-08-trening-app-mvp-plan.md` are complete (Task 1 verifies). Do not start this plan mid-MVP.
- Spec: `docs/superpowers/specs/2026-07-09-mvp-visual-redesign-design.md`. Visual source of truth: `docs/superpowers/specs/assets/mvp-visual-redesign/Trening.dc.html` — read it before starting; match it pixel-precisely except for the Documented Deviations below.
- Design tokens (exact values from spec section 3): background `#18181b`, surface `#27272a`, accent `#ccff00`, foreground (text-primary) `#fafafa`, muted `#a1a1aa`, outer page frame `#0e0e10`; font Nunito 400/600/700/800/900; radius 14–24px.
- Do NOT change component props, domain function signatures, Supabase queries, or existing test files — except the As=1 errata files explicitly listed in Task 3, and the two additive optional props in Tasks 5/8/11 (`SetupScreen.onBack?`, `CardDisplay.suit?/rank?/categoryKey?`, `HistoryScreen.onBack?`).
- Timer invariant (timestamp-based, never tick-accumulated) is untouched — this plan changes no timer code.
- After every task: the full existing test suite still passes (`npm test`), except where Task 3 explicitly updates test expectations.

## Documented Deviations from the Prototype

The prototype is the visual truth, but these specific things are implemented DIFFERENTLY, deliberately. Do not "fix" the implementation toward the prototype on these points:

1. **No photo background** on the workout screen (spec section 4). The prototype's blurred `image-slot` exercise photo (Trening.dc.html lines 138–140) is replaced by the plain `background` color. Do not port `image-slot.js`/`support.js`.
2. **Setup auto-advance stays.** The prototype selects an option and then confirms with a "Dalje" button; the MVP advances immediately on selection, and `SetupScreen.test.tsx` asserts that flow. Keep auto-advance; there are no "Dalje" buttons. The prototype's selected-state styling (volt border, `accent/10` background) still applies — it's persistent in `ExercisePicker` and momentary elsewhere.
3. **No exit (←) button on the workout screen.** The prototype's `exitWorkout` implies an abandon-session flow the MVP doesn't have (no `onExit` prop, `status='abandoned'` is never set). The pause overlay therefore has only "Nastavi trening", no "Prekini" button. Abandon flow is a future feature, not part of this redesign.
4. **The next-card button label is always "Sledeća karta"** — the prototype shows "Završi trening" on the last card, but `SessionScreen.test.tsx` clicks the button by its exact name, so the label stays constant.
5. **Suit assignment follows OUR code mapping** (`SUIT_TO_CATEGORY` in `types.ts`): ♥ Guranje, ♣ Povlačenje, ♠ Noge, ♦ Core. The prototype uses a different assignment (♠ Guranje, ♥ Povlačenje, ♦ Noge, ♣ Core) — ignore the prototype's suit-to-category pairing everywhere suits appear.
6. **Guest CTA on the results screen says "Napravi nalog"** (a link to `/signup`), not the prototype's "Napravi nalog i sačuvaj" — the MVP explicitly does not carry a guest result over after signup (MVP spec section 9), so "i sačuvaj" would be a false promise.
7. **Logged-in landing shows "Novi trening" + "Odjavi se"** — the prototype shows "Nastavi kao gost" even when logged in and has no sign-out; the MVP's labels are correct for a real auth flow. Guest landing matches the prototype exactly.
8. **Accessible names are pinned with `aria-label`** on difficulty and session-length buttons so existing `getByRole('button', { name: ... })` assertions keep passing while the visible text follows the prototype (label + description on separate lines).

## File Structure

No new source files except one SQL migration. Everything else modifies files the MVP plan created:

```
src/app/globals.css                          — @theme tokens (Task 2)
src/app/layout.tsx                           — Nunito font, metadata, 440px shell (Task 2)
src/lib/domain/types.ts                      — rank comment only (Task 3)
src/lib/domain/deck.ts                       — RANKS array (Task 3)
src/lib/domain/deck.test.ts                  — rank expectations (Task 3)
src/lib/domain/reps.test.ts                  — rank-14 example (Task 3)
supabase/migrations/0001_init.sql            — card_value check, fresh installs (Task 3)
supabase/migrations/0003_card_value_range.sql — NEW: alter constraint on live DB (Task 3)
src/components/landing/LandingScreen.tsx     — retouch (Task 4)
src/components/setup/SetupScreen.tsx         — step header, progress bars, back (Task 5)
src/components/setup/DifficultySelector.tsx  — retouch (Task 5)
src/components/setup/ExercisePicker.tsx      — retouch, suit chips (Task 6)
src/components/setup/SessionLengthSelector.tsx — retouch, prototype copy (Task 7)
src/components/session/CardDisplay.tsx       — glass card, optional suit/rank props (Task 8)
src/components/session/ProgressIndicator.tsx — pill style (Task 8)
src/components/session/StopwatchDisplay.tsx  — big tabular numerals (Task 8)
src/components/session/SessionScreen.tsx     — layout, progress bar, pause overlay (Task 9)
src/components/summary/SummaryScreen.tsx     — retouch, suit chips, guest CTA (Task 10)
src/components/history/HistoryScreen.tsx     — retouch, optional onBack (Task 11)
src/app/page.tsx                             — pass onBack to Setup/History (Task 11)
src/components/auth/LoginForm.tsx            — token restyle (Task 12)
src/components/auth/SignupForm.tsx           — token restyle (Task 12)
```

---

### Task 1: Preflight gate — verify the MVP is complete

**Files:** none modified.

**Interfaces:**
- Produces: a go/no-go decision. If any check fails, STOP — report to the user instead of proceeding. This plan assumes every MVP component exists exactly as the MVP plan specified it.

- [ ] **Step 1: Verify all MVP components exist**

Run:
```bash
ls src/components/landing/LandingScreen.tsx src/components/setup/SetupScreen.tsx src/components/session/SessionScreen.tsx src/components/summary/SummaryScreen.tsx src/components/history/HistoryScreen.tsx src/components/auth/LoginForm.tsx src/components/auth/SignupForm.tsx src/hooks/useStopwatch.ts src/lib/domain/summarize.ts
```
Expected: all nine paths print with no "No such file" errors. If any is missing, the MVP plan is not finished — STOP.

- [ ] **Step 2: Verify the whole test suite is green**

Run: `npm test`
Expected: all test files pass (deck, reps, timer, queries, sessions, ExercisePicker, SetupScreen, useStopwatch, summarize, SessionScreen, page), 0 failures. Note the total test count — Task 13 re-checks against it. If anything fails, STOP.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If errors, STOP.

- [ ] **Step 4: Verify the working tree is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean`. If Cursor left uncommitted work, resolve that first — do not mix it into redesign commits.

---

### Task 2: Design tokens, Nunito font, and the 440px app shell

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: Tailwind utility classes used by every later task: `bg-background`, `bg-surface`, `bg-accent`, `bg-outer`, `text-foreground`, `text-muted`, `text-accent`, `text-background`, `border-accent`, and opacity variants like `bg-accent/10`, `border-accent/35`, `bg-surface/55`, `border-white/15`. Also the Nunito font applied globally via `--font-nunito`.

- [ ] **Step 1: Replace the contents of `src/app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-outer: #0e0e10;
  --color-background: #18181b;
  --color-surface: #27272a;
  --color-accent: #ccff00;
  --color-foreground: #fafafa;
  --color-muted: #a1a1aa;
  --font-sans: var(--font-nunito), system-ui, sans-serif;
}

body {
  background: var(--color-outer);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}
```

This removes the create-next-app default `:root`/`@theme inline`/`prefers-color-scheme` blocks entirely — the app is always dark; there is no light theme.

- [ ] **Step 2: Replace `src/app/layout.tsx`**

Keep the `AuthProvider` wrapping exactly as the MVP left it (MVP Task 13); only the font, metadata, and shell change:

```tsx
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/AuthContext';
import './globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'ŠPIL — Trening bez opreme',
  description: 'Trening bez opreme, zasnovan na izvlačenju karata. Izvuci kartu, odradi seriju.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className={`${nunito.variable} antialiased`}>
      <body className="min-h-screen bg-outer flex justify-center">
        <div className="w-full max-w-[440px] min-h-screen bg-background text-foreground shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
```

`latin-ext` is required — Serbian Latin (š, č, ć, ž, đ) is outside the base `latin` subset.

- [ ] **Step 3: Verify tests still pass and the shell renders**

Run: `npm test`
Expected: all pass (nothing asserts fonts or page chrome).
Run: `npm run dev`, open `http://localhost:3000`.
Expected: near-black page frame (`#0e0e10`) with a centered 440px dark column (`#18181b`); text renders in Nunito. Screens look half-styled — that's expected until Tasks 4–12.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: add design tokens, Nunito font, and 440px app shell"
```

---

### Task 3: As=1 errata — rank scheme becomes 1 (A) through 13 (K)

**Files:**
- Modify: `src/lib/domain/types.ts` (comment only)
- Modify: `src/lib/domain/deck.ts`
- Modify: `src/lib/domain/deck.test.ts`
- Modify: `src/lib/domain/reps.test.ts`
- Modify: `supabase/migrations/0001_init.sql`
- Create: `supabase/migrations/0003_card_value_range.sql`

**Interfaces:**
- Produces: `Card.rank` semantics change to 1=A, 2–10 face value, 11=J, 12=Q, 13=K. Task 8's `CardDisplay` rank-label helper (`1 → 'A'`) depends on this.

- [ ] **Step 1: Update the test expectations first**

In `src/lib/domain/deck.test.ts`, change the rank expectation in the "has 13 cards per suit" test:

```typescript
    expect(hearts.map((c) => c.rank).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
```

In `src/lib/domain/reps.test.ts`, replace the rank-14 example line (rank 14 no longer exists; K=13, and 13 × 1.25 = 16.25 → rounds to 16):

```typescript
    expect(calculateReps({ suit: 'hearts', rank: 13 }, 1.25)).toBe(16);
```

- [ ] **Step 2: Run tests to verify the deck test now fails**

Run: `npm test -- deck`
Expected: FAIL — deck still produces ranks 2–14.

- [ ] **Step 3: Update the implementation**

In `src/lib/domain/deck.ts`:

```typescript
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
```

In `src/lib/domain/types.ts`, update the `Card` comment:

```typescript
export interface Card {
  suit: Suit;
  rank: number; // 1 = A, 2-10 = face value, 11=J, 12=Q, 13=K
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: full suite passes, including the updated deck and reps tests.

- [ ] **Step 5: Update the SQL constraint for fresh installs**

In `supabase/migrations/0001_init.sql`, change the `card_draws.card_value` line to:

```sql
  card_value int not null check (card_value between 1 and 13),
```

- [ ] **Step 6: Create the migration for the already-applied database**

The live Supabase database already has the old constraint from 0001. Create `supabase/migrations/0003_card_value_range.sql`:

```sql
-- As=1 correction: card ranks are 1 (A) through 13 (K), not 2-14.
-- See docs/superpowers/specs/2026-07-09-mvp-visual-redesign-design.md section 5.
alter table card_draws drop constraint card_draws_card_value_check;
alter table card_draws add constraint card_draws_card_value_check
  check (card_value between 1 and 13);
```

Apply it the same way earlier migrations were applied (`supabase db push`, or paste into the Supabase Dashboard SQL Editor and run).
Expected: statement succeeds; inserting a `card_draws` row with `card_value = 1` is now allowed, `card_value = 14` is rejected.

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain/types.ts src/lib/domain/deck.ts src/lib/domain/deck.test.ts src/lib/domain/reps.test.ts supabase/migrations/0001_init.sql supabase/migrations/0003_card_value_range.sql
git commit -m "fix: card ranks are 1 (A) through 13 (K) per visual redesign spec errata"
```

---

### Task 4: Landing screen retouch

**Files:**
- Modify: `src/components/landing/LandingScreen.tsx`

**Interfaces:**
- Consumes: tokens from Task 2. Props unchanged: `{ user, onStartWorkout, onShowHistory, onSignOut }`.
- Produces: nothing new — same interface, new look. Prototype reference: Trening.dc.html lines 24–51. `page.test.tsx` asserts a button named exactly "Nastavi kao gost" — that label must not change.

- [ ] **Step 1: Replace `src/components/landing/LandingScreen.tsx`**

```tsx
'use client';

import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

interface LandingScreenProps {
  user: User | null;
  onStartWorkout: () => void;
  onShowHistory: () => void;
  onSignOut: () => void;
}

export function LandingScreen({ user, onStartWorkout, onShowHistory, onSignOut }: LandingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col justify-between px-7 pt-12 pb-9">
      <div />
      <div className="flex flex-col items-center gap-[18px] text-center">
        <div className="w-[88px] h-[88px] rounded-3xl bg-surface border-2 border-accent/50 flex items-center justify-center text-[40px] font-black text-accent">
          ♠
        </div>
        <div>
          <h1 className="text-[38px] font-black leading-[1.05] tracking-tight">ŠPIL</h1>
          <p className="text-base font-semibold text-muted mt-2 leading-snug">
            Trening bez opreme.
            <br />
            Izvuci kartu, odradi seriju.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {user ? (
          <>
            <p className="text-center text-[13px] text-muted font-semibold">
              Ulogovan · napredak se čuva
            </p>
            <button
              onClick={onStartWorkout}
              className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg"
            >
              Novi trening
            </button>
            <button onClick={onShowHistory} className="text-accent font-bold text-[15px] p-1.5">
              Vidi istoriju treninga →
            </button>
            <button onClick={onSignOut} className="text-sm text-muted underline">
              Odjavi se
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartWorkout}
              className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg"
            >
              Nastavi kao gost
            </button>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 border-2 border-white/15 text-foreground rounded-2xl p-3.5 font-bold text-[15px] text-center"
              >
                Prijavi se
              </Link>
              <Link
                href="/signup"
                className="flex-1 border-2 border-white/15 text-foreground rounded-2xl p-3.5 font-bold text-[15px] text-center"
              >
                Napravi nalog
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests, verify visually**

Run: `npm test -- page.test`
Expected: PASS — the guest flow still finds "Nastavi kao gost".
Run: `npm run dev`, open `http://localhost:3000`.
Expected: matches the prototype's landing (spade logo tile with volt border, ŠPIL title, volt primary button, two outline buttons in a row).

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/LandingScreen.tsx
git commit -m "style: retouch landing screen to prototype design"
```

---

### Task 5: Setup shell (step header, progress bars, back) + difficulty step

**Files:**
- Modify: `src/components/setup/SetupScreen.tsx`
- Modify: `src/components/setup/DifficultySelector.tsx`

**Interfaces:**
- Consumes: tokens from Task 2.
- Produces: `SetupScreen` gains ONE additive optional prop: `onBack?: () => void` (called when the user presses ← on step 1; internal steps navigate back internally). Task 11 wires `page.tsx` to pass it. `DifficultySelector` props unchanged (`onSelect`). Prototype reference: Trening.dc.html lines 53–76.
- Existing tests unchanged: `SetupScreen.test.tsx` clicks buttons named `Srednji`, exercise names, `Ceo špil (52 karte)` — the difficulty buttons get `aria-label={level.name}` so their accessible name stays exactly the level name even though a description line is added visually.

- [ ] **Step 1: Replace `src/components/setup/SetupScreen.tsx`**

The state machine, handlers, and `onStart` logic are IDENTICAL to the MVP version — only the render wrapper (header, progress bars) and the `onBack` prop are new:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { DifficultySelector } from './DifficultySelector';
import { ExercisePicker } from './ExercisePicker';
import { SessionLengthSelector } from './SessionLengthSelector';
import { fetchCategories, fetchExercisesByDifficulty } from '@/lib/supabase/queries';
import { drawSessionCards } from '@/lib/domain/deck';
import { calculateReps } from '@/lib/domain/reps';
import { SUIT_TO_CATEGORY } from '@/lib/domain/types';
import type {
  Category,
  CategoryKey,
  DeckSize,
  DifficultyLevel,
  Exercise,
  CardDrawResult,
  SessionConfig,
} from '@/lib/domain/types';

type Step = 'difficulty' | 'exercises' | 'length';

const STEP_NUMBER: Record<Step, number> = { difficulty: 1, exercises: 2, length: 3 };

interface SetupScreenProps {
  onStart: (config: SessionConfig, draws: CardDrawResult[]) => void;
  onBack?: () => void;
}

export function SetupScreen({ onStart, onBack }: SetupScreenProps) {
  const [step, setStep] = useState<Step>('difficulty');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseByCategory, setExerciseByCategory] = useState<Record<
    CategoryKey,
    Exercise
  > | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  async function handleDifficultySelect(level: DifficultyLevel) {
    setDifficulty(level);
    const fetchedExercises = await fetchExercisesByDifficulty(level.id);
    setExercises(fetchedExercises);
    setStep('exercises');
  }

  function handleExercisesComplete(selection: Record<CategoryKey, Exercise>) {
    setExerciseByCategory(selection);
    setStep('length');
  }

  function handleLengthSelect(deckSize: DeckSize) {
    if (!difficulty || !exerciseByCategory) return;
    const config: SessionConfig = {
      difficultyLevelId: difficulty.id,
      repMultiplier: difficulty.defaultRepMultiplier,
      deckSize,
      exerciseByCategory,
    };
    const cards = drawSessionCards(deckSize);
    const draws: CardDrawResult[] = cards.map((card, index) => {
      const categoryKey = SUIT_TO_CATEGORY[card.suit];
      return {
        orderIndex: index,
        card,
        categoryKey,
        exercise: exerciseByCategory[categoryKey],
        reps: calculateReps(card, difficulty.defaultRepMultiplier),
        completedAt: null,
      };
    });
    onStart(config, draws);
  }

  function handleBack() {
    if (step === 'length') setStep('exercises');
    else if (step === 'exercises') setStep('difficulty');
    else onBack?.();
  }

  const stepNumber = STEP_NUMBER[step];

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-2">
        <button
          onClick={handleBack}
          aria-label="Nazad"
          className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold"
        >
          ←
        </button>
        <div className="text-sm font-bold text-muted">Korak {stepNumber}/3</div>
      </div>
      <div className="flex gap-1.5 mt-3.5 mb-7">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex-1 h-[5px] rounded-[3px] ${n <= stepNumber ? 'bg-accent' : 'bg-surface'}`}
          />
        ))}
      </div>
      {step === 'difficulty' && <DifficultySelector onSelect={handleDifficultySelect} />}
      {step === 'exercises' && (
        <ExercisePicker
          categories={categories}
          exercises={exercises}
          onComplete={handleExercisesComplete}
        />
      )}
      {step === 'length' && <SessionLengthSelector onSelect={handleLengthSelect} />}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/components/setup/DifficultySelector.tsx`**

Descriptions come from a local map keyed by level name (the DB has no description column — this is presentation-only copy from the prototype, lines 277–282):

```tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchDifficultyLevels } from '@/lib/supabase/queries';
import type { DifficultyLevel } from '@/lib/domain/types';

const DESCRIPTIONS: Record<string, string> = {
  Početnik: 'Lakše ponavljanja, idealno za start.',
  Srednji: 'Uravnoteženo opterećenje.',
  Napredni: 'Maksimalan intenzitet.',
};

interface DifficultySelectorProps {
  onSelect: (level: DifficultyLevel) => void;
}

export function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  const [levels, setLevels] = useState<DifficultyLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDifficultyLevels()
      .then(setLevels)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="text-muted">Učitavanje nivoa...</p>;
  if (error) return <p className="text-red-500">Greška: {error}</p>;

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">Izaberi nivo</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {levels.map((level) => (
          <button
            key={level.id}
            aria-label={level.name}
            onClick={() => onSelect(level)}
            className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
          >
            <span className="block text-[19px] font-extrabold mb-1">{level.name}</span>
            <span className="block text-sm font-semibold text-muted">
              {DESCRIPTIONS[level.name] ?? ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- SetupScreen`
Expected: PASS — `getByRole('button', { name: 'Srednji' })` resolves via the `aria-label`.
Run: `npm test`
Expected: full suite passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/setup/SetupScreen.tsx src/components/setup/DifficultySelector.tsx
git commit -m "style: setup step header, progress bars, and difficulty retouch"
```

---

### Task 6: Exercise picker retouch (suit chips, selected states)

**Files:**
- Modify: `src/components/setup/ExercisePicker.tsx`

**Interfaces:**
- Consumes: tokens from Task 2. Props unchanged: `{ categories, exercises, onComplete }`; selection logic identical.
- Produces: same interface, new look. Suit chips use OUR mapping (Deviation 5): ♥ Guranje, ♣ Povlačenje, ♠ Noge, ♦ Core. Prototype reference: lines 78–108.
- `ExercisePicker.test.tsx` clicks buttons by exercise name and asserts `onComplete` timing — button accessible names stay the bare exercise name (no extra text inside the button), so no `aria-label` needed here.

- [ ] **Step 1: Replace `src/components/setup/ExercisePicker.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { categoryKeyForName } from '@/lib/supabase/queries';
import type { Category, CategoryKey, Exercise } from '@/lib/domain/types';

// Visual suit chip per category — follows SUIT_TO_CATEGORY in types.ts, NOT the prototype's pairing.
const NAME_TO_SUIT: Record<string, string> = {
  Guranje: '♥',
  Povlačenje: '♣',
  Noge: '♠',
  Core: '♦',
};

interface ExercisePickerProps {
  categories: Category[];
  exercises: Exercise[];
  onComplete: (selection: Record<CategoryKey, Exercise>) => void;
}

export function ExercisePicker({ categories, exercises, onComplete }: ExercisePickerProps) {
  const [selection, setSelection] = useState<Partial<Record<CategoryKey, Exercise>>>({});

  function handleSelect(categoryKey: CategoryKey, exercise: Exercise) {
    const next = { ...selection, [categoryKey]: exercise };
    setSelection(next);
    const keys: CategoryKey[] = ['push', 'pull', 'legs', 'core'];
    if (keys.every((key) => next[key])) {
      onComplete(next as Record<CategoryKey, Exercise>);
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-extrabold mb-5 leading-tight">
        Izaberi vežbu za svaku kategoriju
      </h2>
      <div className="flex flex-col gap-[22px] flex-1">
        {sortedCategories.map((category) => {
          const categoryKey = categoryKeyForName(category.name);
          const categoryExercises = exercises.filter((e) => e.categoryId === category.id);
          const selected = selection[categoryKey];
          return (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-[26px] h-[26px] rounded-lg bg-surface flex items-center justify-center text-sm text-accent font-extrabold">
                  {NAME_TO_SUIT[category.name] ?? '♠'}
                </span>
                <span className="text-[15px] font-extrabold">{category.name}</span>
              </div>
              <div className="flex flex-col gap-2">
                {categoryExercises.map((exercise) => {
                  const isSelected = selected?.id === exercise.id;
                  return (
                    <button
                      key={exercise.id}
                      onClick={() => handleSelect(categoryKey, exercise)}
                      className={`text-left rounded-[14px] px-4 py-3.5 text-[15px] font-bold border-2 ${
                        isSelected
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface border-white/5 text-foreground'
                      }`}
                    >
                      {exercise.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

Run: `npm test -- ExercisePicker`
Expected: PASS — 2 tests (selection timing and replacement behavior unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/ExercisePicker.tsx
git commit -m "style: exercise picker retouch with suit chips and volt selected state"
```

---

### Task 7: Session length selector retouch

**Files:**
- Modify: `src/components/setup/SessionLengthSelector.tsx`

**Interfaces:**
- Consumes: tokens from Task 2. Props unchanged: `{ onSelect }`.
- Produces: same interface, prototype copy (lines 450–454): main label ("¼ špila") + sub line ("13 karata · ~10 min"). `aria-label` pins each button's accessible name to the OLD full label (e.g. "Ceo špil (52 karte)") because `SetupScreen.test.tsx` clicks by that exact name.

- [ ] **Step 1: Replace `src/components/setup/SessionLengthSelector.tsx`**

```tsx
'use client';

import type { DeckSize } from '@/lib/domain/types';

const OPTIONS: { size: DeckSize; ariaLabel: string; label: string; sub: string }[] = [
  { size: 13, ariaLabel: 'Četvrtina špila (13 karata)', label: '¼ špila', sub: '13 karata · ~10 min' },
  { size: 26, ariaLabel: 'Pola špila (26 karata)', label: '½ špila', sub: '26 karata · ~20 min' },
  { size: 52, ariaLabel: 'Ceo špil (52 karte)', label: 'Ceo špil', sub: '52 karte · ~35 min' },
];

interface SessionLengthSelectorProps {
  onSelect: (size: DeckSize) => void;
}

export function SessionLengthSelector({ onSelect }: SessionLengthSelectorProps) {
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">Izaberi dužinu treninga</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {OPTIONS.map((option) => (
          <button
            key={option.size}
            aria-label={option.ariaLabel}
            onClick={() => onSelect(option.size)}
            className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
          >
            <span className="block text-[19px] font-extrabold mb-1">{option.label}</span>
            <span className="block text-sm font-semibold text-muted">{option.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

Run: `npm test -- SetupScreen`
Expected: PASS — the walk-through still clicks "Ceo špil (52 karte)" via `aria-label`.

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/SessionLengthSelector.tsx
git commit -m "style: session length selector with prototype copy and time estimates"
```

---

### Task 8: Workout presentational components (glass card, pill, big clock)

**Files:**
- Modify: `src/components/session/CardDisplay.tsx`
- Modify: `src/components/session/ProgressIndicator.tsx`
- Modify: `src/components/session/StopwatchDisplay.tsx`

**Interfaces:**
- Consumes: tokens from Task 2; rank semantics from Task 3 (1=A).
- Produces: `CardDisplay` gains three ADDITIVE OPTIONAL props: `suit?: Suit`, `rank?: number`, `categoryKey?: CategoryKey` — existing call sites without them still compile. Task 9 passes all three. `ProgressIndicator` and `StopwatchDisplay` interfaces unchanged. Prototype reference: lines 143–167.
- None of these three components has an automated test (presentation-only per MVP plan) — verification is `tsc` + Task 9's tests + visual check.

- [ ] **Step 1: Replace `src/components/session/CardDisplay.tsx`**

```tsx
import { CATEGORY_KEY_TO_NAME } from '@/lib/domain/types';
import type { CategoryKey, Suit } from '@/lib/domain/types';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  clubs: '♣',
  spades: '♠',
  diamonds: '♦',
};

const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? String(rank);
}

interface CardDisplayProps {
  exerciseName: string;
  reps: number;
  suit?: Suit;
  rank?: number;
  categoryKey?: CategoryKey;
}

export function CardDisplay({ exerciseName, reps, suit, rank, categoryKey }: CardDisplayProps) {
  return (
    <div className="bg-surface/55 backdrop-blur-xl rounded-3xl border-2 border-accent/35 shadow-[0_0_40px_rgba(204,255,0,0.08)] p-7 min-h-[360px] flex flex-col">
      <div className="flex justify-between items-start">
        {suit && categoryKey ? (
          <div className="bg-accent text-background font-extrabold text-[13px] px-3 py-2 rounded-[10px] flex items-center gap-1.5">
            <span>{SUIT_SYMBOLS[suit]}</span>
            <span>{CATEGORY_KEY_TO_NAME[categoryKey]}</span>
          </div>
        ) : (
          <div />
        )}
        {rank !== undefined && (
          <div className="text-[22px] font-black text-muted">{rankLabel(rank)}</div>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        <p className="text-[22px] font-extrabold">{exerciseName}</p>
        <p className="text-[96px] font-black text-accent leading-none mt-1.5">{reps}</p>
        <p className="text-[15px] font-bold text-muted tracking-widest uppercase">ponavljanja</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/components/session/ProgressIndicator.tsx`**

```tsx
interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-muted">
      Karta {current}/{total}
    </p>
  );
}
```

- [ ] **Step 3: Replace `src/components/session/StopwatchDisplay.tsx`**

Minutes are now zero-padded to two digits, matching the prototype's `formatTime`:

```tsx
interface StopwatchDisplayProps {
  elapsedSeconds: number;
}

export function StopwatchDisplay({ elapsedSeconds }: StopwatchDisplayProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return <p className="text-[32px] font-black tracking-wide tabular-nums">{formatted}</p>;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (new props are optional; existing `SessionScreen` call site still compiles until Task 9 updates it).

- [ ] **Step 5: Commit**

```bash
git add src/components/session/CardDisplay.tsx src/components/session/ProgressIndicator.tsx src/components/session/StopwatchDisplay.tsx
git commit -m "style: glass card, progress pill, and padded stopwatch display"
```

---

### Task 9: Session screen retouch (layout, progress bar, pause overlay)

**Files:**
- Modify: `src/components/session/SessionScreen.tsx`

**Interfaces:**
- Consumes: Task 8's `CardDisplay` optional props; `CATEGORY_KEY_TO_NAME` unused here (CardDisplay handles it). Props unchanged: `{ config, draws, categoryIdByKey, userId, onFinish }`.
- Produces: same interface. ALL persistence logic (saveState machine, isAdvancing guard, guest short-circuit) is IDENTICAL to the MVP version — only the render section changes. `SessionScreen.test.tsx` (3 tests: guest flow, waiting-for-session gate with "Priprema treninga...", failure warning "Čuvanje treninga trenutno ne radi") must pass unchanged — all three button labels and the warning text are preserved exactly.
- Deviations 3 and 4 apply: no exit button, label always "Sledeća karta".

- [ ] **Step 1: Replace the render section of `src/components/session/SessionScreen.tsx`**

Keep every import, the `SessionSaveState` type, all state, the `useEffect`, and `handleNext` EXACTLY as they are. Replace only the `return (...)` block (and keep the `const current = ...`, `isWaitingForSession`, `nextDisabled` lines above it):

```tsx
  const current = draws[currentIndex];
  const isWaitingForSession = userId !== null && saveState === 'creating';
  const nextDisabled = stopwatch.isPaused || isAdvancing || isWaitingForSession;

  return (
    <div className="min-h-screen relative flex flex-col px-6 pt-5 pb-7">
      <div className="flex items-center justify-between mb-[22px]">
        <div className="w-10" />
        <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
        <ProgressIndicator current={currentIndex + 1} total={draws.length} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <CardDisplay
          exerciseName={current.exercise.name}
          reps={current.reps}
          suit={current.card.suit}
          rank={current.card.rank}
          categoryKey={current.categoryKey}
        />
        <div className="h-1.5 rounded-[3px] bg-surface/70 mt-5 overflow-hidden">
          <div
            className="h-full bg-accent rounded-[3px]"
            style={{ width: `${Math.round((currentIndex / draws.length) * 100)}%` }}
          />
        </div>
      </div>

      {saveState === 'failed' && (
        <p className="text-sm text-red-500 text-center mt-4">
          Čuvanje treninga trenutno ne radi — rezultat možda neće biti sačuvan u istoriji.
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={stopwatch.isPaused ? stopwatch.resume : stopwatch.pause}
          className="flex-1 bg-surface/60 border-2 border-white/15 text-foreground rounded-[18px] p-5 font-extrabold text-base"
        >
          {stopwatch.isPaused ? 'Nastavi' : 'Pauza'}
        </button>
        <button
          onClick={handleNext}
          disabled={nextDisabled}
          className="flex-[2] bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg disabled:opacity-50"
        >
          {isWaitingForSession ? 'Priprema treninga...' : 'Sledeća karta'}
        </button>
      </div>

      {stopwatch.isPaused && (
        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-6 z-10">
          <p className="text-[30px] font-black text-accent tracking-widest">PAUZIRANO</p>
          <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
          <button
            onClick={stopwatch.resume}
            className="bg-accent text-background rounded-[18px] px-10 py-[18px] font-extrabold text-base"
          >
            Nastavi trening
          </button>
        </div>
      )}
    </div>
  );
```

- [ ] **Step 2: Run tests**

Run: `npm test -- SessionScreen`
Expected: PASS — 3 tests. The pause overlay isn't exercised by any test; the button labels and warning text the tests query are unchanged.

- [ ] **Step 3: Visual check**

Run: `npm run dev`, walk guest flow to the workout screen.
Expected: matches the prototype minus the photo background — glass card with volt border/glow, suit+category badge top-left, rank letter top-right, 96px volt rep number, progress bar under the card, Pauza/Sledeća karta buttons; pressing Pauza shows the full-screen PAUZIRANO overlay with the running time frozen.

- [ ] **Step 4: Commit**

```bash
git add src/components/session/SessionScreen.tsx
git commit -m "style: workout screen layout, progress bar, and pause overlay"
```

---

### Task 10: Results screen retouch

**Files:**
- Modify: `src/components/summary/SummaryScreen.tsx`

**Interfaces:**
- Consumes: tokens; `summarizeByCategory` (unchanged, from `@/lib/domain/summarize`); `CATEGORY_KEY_TO_NAME` from types. Props unchanged: `{ result, isGuest, onDone }`.
- Produces: same interface. Prototype reference: lines 192–225. Deviations 5 (our suit mapping) and 6 (CTA copy "Napravi nalog", linking to `/signup`) apply. The button label "Nazad na početak" is unchanged (`page.test.tsx` mocks SummaryScreen, but keep it anyway — the label was already correct).
- No automated test exists for SummaryScreen — verify via `tsc` + full suite + visual.

- [ ] **Step 1: Replace `src/components/summary/SummaryScreen.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { summarizeByCategory } from '@/lib/domain/summarize';
import { CATEGORY_KEY_TO_NAME } from '@/lib/domain/types';
import type { CategoryKey, SessionResult } from '@/lib/domain/types';

// Visual suit chip per category — follows SUIT_TO_CATEGORY in types.ts, NOT the prototype's pairing.
const CATEGORY_TO_SUIT: Record<CategoryKey, string> = {
  push: '♥',
  pull: '♣',
  legs: '♠',
  core: '♦',
};

interface SummaryScreenProps {
  result: SessionResult;
  isGuest: boolean;
  onDone: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function SummaryScreen({ result, isGuest, onDone }: SummaryScreenProps) {
  const breakdown = summarizeByCategory(result.draws);

  return (
    <div className="min-h-screen flex flex-col px-6 pt-9 pb-8">
      <p className="text-[15px] font-extrabold text-accent tracking-widest uppercase text-center">
        Trening završen
      </p>
      <div className="text-center mt-5 mb-8">
        <p className="text-[64px] font-black tabular-nums leading-none">
          {formatDuration(result.totalDurationSeconds)}
        </p>
        <p className="text-sm font-bold text-muted mt-2 uppercase tracking-widest">ukupno vreme</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {breakdown.map((item) => (
          <div
            key={item.categoryKey}
            className="bg-surface rounded-2xl px-[18px] py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-[10px] bg-background flex items-center justify-center text-[15px] text-accent font-extrabold">
                {CATEGORY_TO_SUIT[item.categoryKey]}
              </span>
              <div>
                <p className="text-[15px] font-extrabold">{item.exerciseName}</p>
                <p className="text-xs font-semibold text-muted">
                  {CATEGORY_KEY_TO_NAME[item.categoryKey]}
                </p>
              </div>
            </div>
            <p className="text-2xl font-black text-accent">{item.totalReps}</p>
          </div>
        ))}
      </div>

      {isGuest && (
        <div className="bg-surface border-2 border-accent/30 rounded-[18px] p-5 mt-6 text-center">
          <p className="text-sm font-semibold text-muted mb-3.5 leading-snug">
            Rezultati gostiju se ne čuvaju. Napravi nalog da pratiš napredak kroz vreme.
          </p>
          <Link
            href="/signup"
            className="block w-full bg-accent text-background rounded-2xl p-4 font-extrabold text-[15px]"
          >
            Napravi nalog
          </Link>
        </div>
      )}

      <button
        onClick={onDone}
        className="mt-auto border-2 border-white/15 text-foreground rounded-[18px] p-[18px] font-bold text-base"
      >
        Nazad na početak
      </button>
    </div>
  );
}
```

Note: the button's `mt-auto` needs breathing room when content is short — if the layout looks cramped in the visual check, add `pt-6` alongside `mt-auto`. The per-category rows show total reps only (the prototype omits the card count — the MVP's "(N karata)" suffix is dropped).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — no errors.
Run: `npm test` — full suite passes.
Visual: finish a short guest workout; results match the prototype (volt "TRENING ZAVRŠEN" caption, 64px time, suit-chip rows, guest CTA panel with volt border).

- [ ] **Step 3: Commit**

```bash
git add src/components/summary/SummaryScreen.tsx
git commit -m "style: results screen retouch with suit chips and guest CTA panel"
```

---

### Task 11: History screen retouch + back navigation wiring

**Files:**
- Modify: `src/components/history/HistoryScreen.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: tokens; `getUserSessions` / `SessionHistoryEntry` (unchanged — `difficultyName` already exists on the entry).
- Produces: `HistoryScreen` gains ONE additive optional prop: `onBack?: () => void`. `page.tsx` passes `onBack={() => setScreen('landing')}` to BOTH `SetupScreen` (from Task 5) and `HistoryScreen` — this also fixes a real MVP UX hole (history had no way back). `page.test.tsx` mocks SetupScreen and never reaches history (guest user), so it is unaffected. Prototype reference: lines 227–255.

- [ ] **Step 1: Replace `src/components/history/HistoryScreen.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getUserSessions, type SessionHistoryEntry } from '@/lib/supabase/sessions';

interface HistoryScreenProps {
  userId: string;
  onBack?: () => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function HistoryScreen({ userId, onBack }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserSessions(userId)
      .then(setSessions)
      .finally(() => setIsLoading(false));
  }, [userId]);

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Nazad"
            className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold"
          >
            ←
          </button>
        )}
        <h1 className="text-2xl font-extrabold">Istorija treninga</h1>
      </div>

      {isLoading ? (
        <p className="text-muted">Učitavanje istorije...</p>
      ) : sessions.length === 0 ? (
        <p className="text-center text-muted text-[15px] font-semibold mt-[60px] leading-relaxed">
          Još nema treninga.
          <br />
          Završi jedan da se pojavi ovde.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-surface rounded-2xl p-[18px]">
              <div className="flex justify-between items-center mb-2.5">
                <p className="text-[15px] font-extrabold">
                  {new Date(session.startedAt).toLocaleDateString('sr-RS')}
                </p>
                <span className="bg-background text-accent text-xs font-extrabold px-2.5 py-[5px] rounded-lg">
                  {session.difficultyName}
                </span>
              </div>
              <div className="flex gap-5 text-[13px] font-semibold text-muted">
                <p>{formatDuration(session.totalDurationSeconds)} trajanje</p>
                <p>{session.totalCards} karata</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire `onBack` in `src/app/page.tsx`**

Change the two render branches (leave everything else in the file untouched):

```tsx
  if (screen === 'setup') {
    return <SetupScreen onStart={handleSetupStart} onBack={() => setScreen('landing')} />;
  }
```

```tsx
  if (screen === 'history' && user) {
    return <HistoryScreen userId={user.id} onBack={() => setScreen('landing')} />;
  }
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: full suite passes (`page.test.tsx` mocks SetupScreen; history branch untested).

- [ ] **Step 4: Commit**

```bash
git add src/components/history/HistoryScreen.tsx src/app/page.tsx
git commit -m "style: history screen retouch with difficulty chips and back navigation"
```

---

### Task 12: Auth pages token restyle

**Files:**
- Modify: `src/components/auth/LoginForm.tsx`
- Modify: `src/components/auth/SignupForm.tsx`

**Interfaces:**
- Consumes: tokens from Task 2. All form logic, labels, and handlers unchanged.
- Produces: same interfaces. The prototype has NO design for these screens (its login is a fake flag toggle) — apply the token system for consistency: dark background, `surface` inputs, volt primary button, plus a "← Nazad na početak" link so users aren't stranded. No automated tests exist for these components.

- [ ] **Step 1: Replace `src/components/auth/LoginForm.tsx`**

Keep the imports, state, and `handleSubmit` EXACTLY as the MVP wrote them; add the `Link` import and replace only the returned JSX:

```tsx
  return (
    <form onSubmit={handleSubmit} className="min-h-screen flex flex-col justify-center gap-4 px-7">
      <h1 className="text-[28px] font-extrabold mb-2">Prijava</h1>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-surface border-2 border-white/5 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted focus:border-accent/50 outline-none"
      />
      <input
        type="password"
        required
        placeholder="Lozinka"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-surface border-2 border-white/5 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted focus:border-accent/50 outline-none"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg disabled:opacity-50"
      >
        {isSubmitting ? 'Prijavljivanje...' : 'Prijavi se'}
      </button>
      <Link href="/" className="text-center text-sm text-muted underline">
        ← Nazad na početak
      </Link>
    </form>
  );
```

Add to the imports at the top of the file:

```tsx
import Link from 'next/link';
```

- [ ] **Step 2: Replace `src/components/auth/SignupForm.tsx` the same way**

Keep imports, state, `handleSubmit`, and the `success` early-return logic; restyle both returned JSX blocks. Add `import Link from 'next/link';` to the imports. Success block:

```tsx
  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center gap-4 px-7 text-center">
        <p className="text-lg font-bold">Registracija uspešna!</p>
        <p className="text-sm text-muted">Proveri email da potvrdiš nalog pre prijave.</p>
        <Link href="/login" className="text-accent font-bold underline">
          Idi na prijavu
        </Link>
      </div>
    );
  }
```

Form block (labels unchanged):

```tsx
  return (
    <form onSubmit={handleSubmit} className="min-h-screen flex flex-col justify-center gap-4 px-7">
      <h1 className="text-[28px] font-extrabold mb-2">Registracija</h1>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-surface border-2 border-white/5 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted focus:border-accent/50 outline-none"
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder="Lozinka (min. 6 karaktera)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-surface border-2 border-white/5 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted focus:border-accent/50 outline-none"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg disabled:opacity-50"
      >
        {isSubmitting ? 'Kreiranje naloga...' : 'Registruj se'}
      </button>
      <Link href="/" className="text-center text-sm text-muted underline">
        ← Nazad na početak
      </Link>
    </form>
  );
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — no errors.
Visual: `/login` and `/signup` match the token system (dark, surface inputs, volt button).

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/LoginForm.tsx src/components/auth/SignupForm.tsx
git commit -m "style: auth forms restyled with design tokens"
```

---

### Task 13: Final verification and push

**Files:** none modified (unless the walkthrough finds a defect — fix it in place, then re-run this task).

- [ ] **Step 1: Full automated check**

Run: `npm test`
Expected: same test-file set as Task 1's preflight, all passing; total count differs from preflight ONLY by Task 3's expectation edits (same number of tests, two changed assertions).
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full visual walkthrough against the prototype**

Run: `npm run dev`. Open `Trening.dc.html` in a browser tab alongside for comparison. Check each screen as guest:
1. Landing — spade tile, ŠPIL, volt guest button, two outline auth buttons.
2. Setup korak 1/3 — back arrow, progress bars (1 volt), "Izaberi nivo", 3 option cards with descriptions; clicking advances immediately (Deviation 2).
3. Korak 2/3 — 4 categories with suit chips (♥ Guranje, ♣ Povlačenje, ♠ Noge, ♦ Core — Deviation 5), volt selected state persists.
4. Korak 3/3 — ¼/½/Ceo špil with time estimates.
5. Workout — glass card, badge, rank letter (A for aces — Task 3), volt reps, progress bar, PAUZIRANO overlay on pause, no exit arrow (Deviation 3).
6. Results — 64px time, suit-chip rows, guest CTA "Napravi nalog" (Deviation 6), "Nazad na početak".
Then log in and check: landing shows "Novi trening"/"Vidi istoriju treninga →"/"Odjavi se" (Deviation 7); history shows date + difficulty chip + duration + card count, back arrow returns to landing.

- [ ] **Step 3: Push**

```bash
git push origin main
```
Expected: all redesign commits land on `origin/main`.

---

## Self-Review Notes

- **Spec coverage:** section 2 (source of truth) → Global Constraints + every task's prototype line references; section 3 (tokens) → Task 2; section 4 (photo deviation) → Deviation 1 + Task 9; section 5 (As=1 errata, all six files) → Task 3 (including the live-DB migration 0003 the spec's table implies but doesn't list — editing 0001 alone wouldn't change an already-applied database); section 6 (retouch approach, tests unchanged, new visual elements: progress dots, glass card, pause overlay, time estimates) → Tasks 4–12; section 7 (apply only after MVP) → Task 1 preflight gate.
- **Beyond-spec additions, each justified inline:** auth-form restyle (Task 12 — spec's component list omits them but leaving default-styled screens in a themed app is a defect), `onBack` wiring (Tasks 5/11 — prototype has back buttons; history genuinely had no way back), zero-padded minutes (Task 8/10/11 — prototype's `formatTime` pads).
- **Test-preservation strategy verified against actual test queries:** `aria-label` pins on difficulty/length buttons; constant "Sledeća karta" label; auto-advance kept; `page.test.tsx` mocks SetupScreen/SessionScreen/SummaryScreen so wiring changes don't reach it.
- **Type consistency:** `CardDisplay` optional props (`suit?: Suit`, `rank?: number`, `categoryKey?: CategoryKey`) match what Task 9 passes (`current.card.suit`, `current.card.rank`, `current.categoryKey`); `NAME_TO_SUIT`/`CATEGORY_TO_SUIT` both follow `SUIT_TO_CATEGORY` (♥ push, ♣ pull, ♠ legs, ♦ core).

