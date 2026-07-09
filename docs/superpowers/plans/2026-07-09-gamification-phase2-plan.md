# Phase 2 Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the "Perfect Deck" challenge mode (per-card time quotas, score = cards beaten), personal records, a daily streak with 2 weekly freezes, a new Progress screen, and full sr/en internationalization (English default) on top of the completed, redesigned MVP.

**Architecture:** Additive layer over the MVP: challenge/streak/records logic lives in new pure domain modules; all DB changes are additive columns (no new tables); records and streak are computed from `sessions` at read time (no stored state to drift). A minimal mode registry renders setup step 0 and keeps future modes cheap. i18n uses next-intl WITHOUT locale routing; component tests render through a helper pinned to `sr` so every existing assertion keeps passing.

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 tokens from the redesign, next-intl, Supabase, Vitest + Testing Library.

## Global Constraints

- **Precondition (Task 1 gates):** the MVP plan (28 tasks) AND the visual redesign plan (13 tasks) are both fully complete. Do not start otherwise.
- Spec: `docs/superpowers/specs/2026-07-09-gamification-phase2-design.md`. Visual reference: `docs/superpowers/specs/assets/gamification/gamification-screens.html`. Design tokens/patterns: redesign spec section 3 (`bg-background/surface/accent`, `text-foreground/muted`, Nunito, radius 14–24px).
- Timer invariant (MVP spec 4.2): quota countdown = `deadline − now` derived from timestamps; pause shifts timestamps. NEVER tick-accumulated. Color states derive from the same arithmetic — no extra JS timers beyond the existing 250ms display re-render.
- Guest sessions never write to Supabase; guests play challenges against par only and see no records/streak.
- All DB changes are additive (new nullable/defaulted columns). No table drops, no type changes, no new tables.
- All type additions to existing interfaces are OPTIONAL fields so existing code and test mocks keep compiling.
- **Default UI language is ENGLISH.** Serbian via the SR/EN toggle. Existing tests keep asserting Serbian strings — they render through `renderWithIntl` (locale `sr`) introduced in Task 3.
- Every task ends with the full suite green: `npm test`.
- Classic mode behavior is byte-for-byte unchanged from the user's perspective (aside from translated strings).

## File Structure

```
supabase/migrations/0004_gamification.sql        — additive columns + English seed names (Task 2)
messages/en.json, messages/sr.json               — full string catalogs (Task 3)
src/i18n/LocaleProvider.tsx                      — client locale context + next-intl provider (Task 3)
src/i18n/dbName.ts                               — localizedName() for DB rows (Task 3)
src/test/renderWithIntl.tsx                      — test render helper, locale 'sr' (Task 3)
src/app/layout.tsx                               — wrap in LocaleProvider (Task 3)
src/components/... (small components)            — i18n retrofit (Task 4)
src/lib/domain/types.ts                          — GameMode + optional fields (Task 5)
src/lib/domain/challenge.ts + .test.ts           — par/budget/quota/score (Task 5)
src/lib/domain/streak.ts + .test.ts              — calculateStreak (Task 6)
src/lib/supabase/queries.ts + .test.ts           — par columns + name_en in fetches (Task 2)
src/lib/supabase/sessions.ts + .test.ts          — gameMode/settings/beat_quota (Task 7)
src/lib/supabase/records.ts + .test.ts           — personal records + best duration (Task 8)
src/lib/modes/registry.ts                        — mode definitions (Task 9)
src/components/setup/ModeSelector.tsx            — step 0 (Task 9)
src/components/setup/SetupScreen.tsx             — 4 steps + budget resolution (Task 9)
src/hooks/useCardQuota.ts + .test.ts             — per-card countdown (Task 10)
src/components/session/SessionScreen.tsx         — challenge UI (Task 11)
src/components/session/CardDisplay.tsx           — quota display + color states (Task 11)
src/components/summary/SummaryScreen.tsx         — score, celebration, new record (Task 12)
src/components/progress/ProgressScreen.tsx       — streak + records + history (Task 13)
src/components/history/HistoryScreen.tsx         — DELETED, subsumed by ProgressScreen (Task 13)
src/components/landing/LandingScreen.tsx         — streak flame, SR/EN toggle (Task 14)
src/app/page.tsx                                 — wiring (Tasks 9/11/13/14)
```

---

### Task 1: Preflight gate — verify MVP and redesign are complete

**Files:** none modified.

**Interfaces:**
- Produces: go/no-go. If ANY check fails, STOP and report — do not begin.

- [ ] **Step 1: Verify redesign artifacts exist**

Run:
```bash
grep -l "color-accent" src/app/globals.css && ls src/components/progress 2>/dev/null; ls src/components/landing/LandingScreen.tsx src/components/setup/SetupScreen.tsx src/components/session/SessionScreen.tsx src/components/summary/SummaryScreen.tsx src/components/history/HistoryScreen.tsx supabase/migrations/0003_card_value_range.sql
```
Expected: `globals.css` contains `color-accent` (redesign Task 2 applied); all five components and migration 0003 exist; `src/components/progress` does NOT exist yet. If `globals.css` lacks the token or 0003 is missing, the redesign plan is unfinished — STOP.

- [ ] **Step 2: Full suite green, compiler clean, tree clean**

Run: `npm test` → all pass. Run: `npx tsc --noEmit` → no errors. Run: `git status` → clean. Note the test count for Task 15.

---

### Task 2: Migration 0004 + fetch updates (par columns, beat_quota, English names)

**Files:**
- Create: `supabase/migrations/0004_gamification.sql`
- Modify: `src/lib/supabase/queries.ts`
- Modify: `src/lib/supabase/queries.test.ts`
- Modify: `src/lib/domain/types.ts` (optional fields on `DifficultyLevel`, `Category`, `Exercise`)

**Interfaces:**
- Produces: DB columns `difficulty_levels.par_seconds_per_rep/par_transition_seconds`, `card_draws.beat_quota`, `name_en` on the three content tables. `DifficultyLevel` gains `parSecondsPerRep?: number; parTransitionSeconds?: number; nameEn?: string | null`; `Category`/`Exercise` gain `nameEn?: string | null`. Task 5 (par formula) and Task 3 (`localizedName`) consume these. All new type fields OPTIONAL — existing mocks keep compiling.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_gamification.sql`:

```sql
-- Phase 2 gamification: all changes additive. Spec: 2026-07-09-gamification-phase2-design.md
alter table difficulty_levels add column par_seconds_per_rep numeric not null default 3.0;
alter table difficulty_levels add column par_transition_seconds numeric not null default 20;
alter table card_draws add column beat_quota boolean;

alter table categories add column name_en text;
alter table difficulty_levels add column name_en text;
alter table exercises add column name_en text;

update categories set name_en = 'Push' where name = 'Guranje';
update categories set name_en = 'Pull' where name = 'Povlačenje';
update categories set name_en = 'Legs' where name = 'Noge';
update categories set name_en = 'Core' where name = 'Core';

update difficulty_levels set name_en = 'Beginner' where name = 'Početnik';
update difficulty_levels set name_en = 'Intermediate' where name = 'Srednji';
update difficulty_levels set name_en = 'Advanced' where name = 'Napredni';

update exercises set name_en = 'Knee push-ups' where name = 'Sklekovi na kolenima';
update exercises set name_en = 'Standard push-ups' where name = 'Standardni sklekovi';
update exercises set name_en = 'Diamond push-ups' where name = 'Diamond sklekovi';
update exercises set name_en = 'Towel rows' where name = 'Veslanje peškirom';
update exercises set name_en = 'Assisted pull-ups' where name = 'Zgibovi (asistirani)';
update exercises set name_en = 'Full pull-ups' where name = 'Puni zgibovi';
update exercises set name_en = 'Squats' where name = 'Čučnjevi';
update exercises set name_en = 'Lunges' where name = 'Iskoraci';
update exercises set name_en = 'Jump squats' where name = 'Jump squats';
update exercises set name_en = 'Crunches' where name = 'Trbušnjaci (crunches)';
update exercises set name_en = 'Sit-ups' where name = 'Standardni trbušnjaci';
update exercises set name_en = 'Scissor kicks' where name = 'Nožne makaze';
```

Apply via `supabase db push` or the Dashboard SQL Editor. Expected: succeeds; `select name, name_en, par_seconds_per_rep from difficulty_levels;` shows 3 rows with values.

- [ ] **Step 2: Extend the domain types (optional fields only)**

In `src/lib/domain/types.ts`, extend the three interfaces (leave everything else untouched):

```typescript
export interface Category {
  id: string;
  name: string;
  nameEn?: string | null;
  sortOrder: number;
}

export interface DifficultyLevel {
  id: string;
  name: string;
  nameEn?: string | null;
  defaultRepMultiplier: number;
  parSecondsPerRep?: number;
  parTransitionSeconds?: number;
  sortOrder: number;
}

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string | null;
  categoryId: string;
  difficultyLevelId: string;
}
```

- [ ] **Step 3: Update the failing fetch tests first**

In `src/lib/supabase/queries.test.ts`, update the three fetch tests' mock rows and expectations:

`fetchCategories` test row becomes `{ id: '1', name: 'Guranje', name_en: 'Push', sort_order: 1 }`, expectation `{ id: '1', name: 'Guranje', nameEn: 'Push', sortOrder: 1 }`.

`fetchDifficultyLevels` test row becomes `{ id: '1', name: 'Početnik', name_en: 'Beginner', default_rep_multiplier: 0.75, par_seconds_per_rep: 3, par_transition_seconds: 20, sort_order: 1 }`, expectation `{ id: '1', name: 'Početnik', nameEn: 'Beginner', defaultRepMultiplier: 0.75, parSecondsPerRep: 3, parTransitionSeconds: 20, sortOrder: 1 }`.

`fetchExercisesByDifficulty` test row becomes `{ id: '1', name: 'Čučnjevi', name_en: 'Squats', category_id: 'c1', difficulty_level_id: 'd1' }`, expectation `{ id: '1', name: 'Čučnjevi', nameEn: 'Squats', categoryId: 'c1', difficultyLevelId: 'd1' }`.

Run: `npm test -- queries` → FAIL (fetches don't select/map the new fields yet).

- [ ] **Step 4: Update the fetches**

In `src/lib/supabase/queries.ts`: add `name_en` to all three selects, `par_seconds_per_rep, par_transition_seconds` to the difficulty select, and map them (`nameEn: row.name_en`, `parSecondsPerRep: row.par_seconds_per_rep`, `parTransitionSeconds: row.par_transition_seconds`), updating the row type annotations accordingly.

Run: `npm test -- queries` → PASS. Run: `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_gamification.sql src/lib/domain/types.ts src/lib/supabase/queries.ts src/lib/supabase/queries.test.ts
git commit -m "feat: additive gamification columns (par, beat_quota, name_en) and fetch support"
```

---

### Task 3: i18n foundation (next-intl, catalogs, provider, test helper)

**Files:**
- Create: `messages/en.json`, `messages/sr.json`, `src/i18n/LocaleProvider.tsx`, `src/i18n/dbName.ts`, `src/test/renderWithIntl.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `useTranslations(ns)` available in every client component; `useLocaleSetting(): { locale: 'en' | 'sr'; setLocale: (l) => void }`; `localizedName(row: { name: string; nameEn?: string | null }, locale: string): string`; test helper `renderWithIntl(ui)` rendering with locale `sr` so existing Serbian assertions pass. Default locale **en**, persisted in `localStorage['spil_locale']`.
- Consumed by every later task. Components are NOT retrofitted yet (Task 4+) — this task only adds infrastructure, so all existing tests still pass untouched.

- [ ] **Step 1: Install**

Run: `npm install next-intl`

- [ ] **Step 2: Write the full English catalog**

Create `messages/en.json`:

```json
{
  "common": { "back": "Back", "loading": "Loading...", "error": "Error: {message}" },
  "landing": {
    "appName": "ŠPIL",
    "tagline": "No-equipment training.\nDraw a card, do the set.",
    "continueGuest": "Continue as guest",
    "login": "Log in",
    "signup": "Create account",
    "loggedIn": "Logged in · progress is saved",
    "newWorkout": "New workout",
    "viewProgress": "View progress →",
    "signOut": "Sign out",
    "streakDays": "{days, plural, one {# day} other {# days}}"
  },
  "setup": {
    "step": "Step {current}/{total}",
    "chooseMode": "How are you training?",
    "classicTitle": "🃏 Classic",
    "classicDesc": "Your own pace, total time is tracked.",
    "challengeTitle": "⚡ Challenge: Perfect Deck",
    "challengeDesc": "Every card has a deadline. Beat them all.",
    "beatChip": "Beat: {time}",
    "chooseLevel": "Choose your level",
    "levelsLoading": "Loading levels...",
    "chooseExercises": "Pick an exercise for each category",
    "chooseLength": "Choose workout length",
    "quarterLabel": "¼ deck",
    "quarterSub": "13 cards · ~10 min",
    "halfLabel": "½ deck",
    "halfSub": "26 cards · ~20 min",
    "fullLabel": "Full deck",
    "fullSub": "52 cards · ~35 min",
    "diffDescBeginner": "Easier reps, ideal to start.",
    "diffDescIntermediate": "Balanced load.",
    "diffDescAdvanced": "Maximum intensity."
  },
  "workout": {
    "nextCard": "Next card",
    "preparing": "Preparing workout...",
    "pause": "Pause",
    "resume": "Resume",
    "paused": "PAUSED",
    "resumeWorkout": "Resume workout",
    "reps": "reps",
    "cardOf": "Card {current}/{total}",
    "quotaCaption": "CARD DEADLINE",
    "saveFailed": "Saving isn't working right now — this workout may not appear in your history."
  },
  "results": {
    "workoutDone": "Workout complete",
    "challengeDone": "Challenge complete",
    "totalTime": "total time",
    "score": "{score}/{total} cards beaten",
    "perfectDeck": "PERFECT DECK!",
    "newRecord": "NEW RECORD",
    "guestNote": "Guest results aren't saved. Create an account to track progress over time.",
    "createAccount": "Create account",
    "backHome": "Back to start"
  },
  "progress": {
    "title": "Progress",
    "streak": "{days, plural, one {# day} other {# days}}",
    "streakCaption": "streak · freezes left this week: {freezes}",
    "recordsTitle": "Records",
    "bestScore": "⚡ best: {score}/{total}",
    "historyTitle": "History",
    "classicTag": "🃏 classic",
    "durationLine": "{duration} duration",
    "cardsLine": "{count, plural, one {# card} other {# cards}}",
    "empty": "No workouts yet.\nFinish one and it shows up here."
  },
  "auth": {
    "loginTitle": "Log in",
    "email": "Email",
    "password": "Password",
    "passwordMin": "Password (min. 6 characters)",
    "loginCta": "Log in",
    "loggingIn": "Logging in...",
    "signupTitle": "Create account",
    "signupCta": "Sign up",
    "creating": "Creating account...",
    "successTitle": "Registration successful!",
    "successNote": "Check your email to confirm your account before logging in.",
    "goLogin": "Go to login",
    "backHome": "← Back to start"
  }
}
```

- [ ] **Step 3: Write the full Serbian catalog**

Create `messages/sr.json` — every key mirrored, values copied from the CURRENT component strings so existing tests keep matching exactly:

```json
{
  "common": { "back": "Nazad", "loading": "Učitavanje...", "error": "Greška: {message}" },
  "landing": {
    "appName": "ŠPIL",
    "tagline": "Trening bez opreme.\nIzvuci kartu, odradi seriju.",
    "continueGuest": "Nastavi kao gost",
    "login": "Prijavi se",
    "signup": "Napravi nalog",
    "loggedIn": "Ulogovan · napredak se čuva",
    "newWorkout": "Novi trening",
    "viewProgress": "Vidi napredak →",
    "signOut": "Odjavi se",
    "streakDays": "{days, plural, one {# dan} few {# dana} other {# dana}}"
  },
  "setup": {
    "step": "Korak {current}/{total}",
    "chooseMode": "Kako treniraš?",
    "classicTitle": "🃏 Klasično",
    "classicDesc": "Svojim tempom, meri se ukupno vreme.",
    "challengeTitle": "⚡ Challenge: Perfektan špil",
    "challengeDesc": "Svaka karta ima svoj rok. Obori ih sve.",
    "beatChip": "Obori: {time}",
    "chooseLevel": "Izaberi nivo",
    "levelsLoading": "Učitavanje nivoa...",
    "chooseExercises": "Izaberi vežbu za svaku kategoriju",
    "chooseLength": "Izaberi dužinu treninga",
    "quarterLabel": "¼ špila",
    "quarterSub": "13 karata · ~10 min",
    "halfLabel": "½ špila",
    "halfSub": "26 karata · ~20 min",
    "fullLabel": "Ceo špil",
    "fullSub": "52 karte · ~35 min",
    "diffDescBeginner": "Lakše ponavljanja, idealno za start.",
    "diffDescIntermediate": "Uravnoteženo opterećenje.",
    "diffDescAdvanced": "Maksimalan intenzitet."
  },
  "workout": {
    "nextCard": "Sledeća karta",
    "preparing": "Priprema treninga...",
    "pause": "Pauza",
    "resume": "Nastavi",
    "paused": "PAUZIRANO",
    "resumeWorkout": "Nastavi trening",
    "reps": "ponavljanja",
    "cardOf": "Karta {current}/{total}",
    "quotaCaption": "ROK ZA KARTU",
    "saveFailed": "Čuvanje treninga trenutno ne radi — rezultat možda neće biti sačuvan u istoriji."
  },
  "results": {
    "workoutDone": "Trening završen",
    "challengeDone": "Challenge završen",
    "totalTime": "ukupno vreme",
    "score": "{score}/{total} oborenih karata",
    "perfectDeck": "PERFEKTAN ŠPIL!",
    "newRecord": "NOVI REKORD",
    "guestNote": "Rezultati gostiju se ne čuvaju. Napravi nalog da pratiš napredak kroz vreme.",
    "createAccount": "Napravi nalog",
    "backHome": "Nazad na početak"
  },
  "progress": {
    "title": "Napredak",
    "streak": "{days, plural, one {# dan} few {# dana} other {# dana}}",
    "streakCaption": "niz · zamrzavanja ove nedelje: {freezes}",
    "recordsTitle": "Rekordi",
    "bestScore": "⚡ najbolje: {score}/{total}",
    "historyTitle": "Istorija",
    "classicTag": "🃏 klasično",
    "durationLine": "{duration} trajanje",
    "cardsLine": "{count, plural, one {# karta} few {# karte} other {# karata}}",
    "empty": "Još nema treninga.\nZavrši jedan da se pojavi ovde."
  },
  "auth": {
    "loginTitle": "Prijava",
    "email": "Email",
    "password": "Lozinka",
    "passwordMin": "Lozinka (min. 6 karaktera)",
    "loginCta": "Prijavi se",
    "loggingIn": "Prijavljivanje...",
    "signupTitle": "Registracija",
    "signupCta": "Registruj se",
    "creating": "Kreiranje naloga...",
    "successTitle": "Registracija uspešna!",
    "successNote": "Proveri email da potvrdiš nalog pre prijave.",
    "goLogin": "Idi na prijavu",
    "backHome": "← Nazad na početak"
  }
}
```

Note: `landing.viewProgress` intentionally says "napredak/progress" (the History entry becomes Progress in Task 13). The MVP aria-labels for length buttons ("Ceo špil (52 karte)" etc.) are NOT in the catalog — they stay hardcoded Serbian constants in the component (test contract, redesign Deviation 8).

- [ ] **Step 4: Locale provider**

Create `src/i18n/LocaleProvider.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../messages/en.json';
import sr from '../../messages/sr.json';

export type AppLocale = 'en' | 'sr';
const MESSAGES: Record<AppLocale, Record<string, unknown>> = { en, sr };
const STORAGE_KEY = 'spil_locale';

interface LocaleSetting {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
}

const LocaleContext = createContext<LocaleSetting | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'sr' || stored === 'en') setLocaleState(stored);
    } catch {}
  }, []);

  function setLocale(l: AppLocale) {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleSetting(): LocaleSetting {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocaleSetting must be used within LocaleProvider');
  return ctx;
}
```

- [ ] **Step 5: DB-name helper**

Create `src/i18n/dbName.ts`:

```typescript
export function localizedName(
  row: { name: string; nameEn?: string | null },
  locale: string
): string {
  if (locale === 'en' && row.nameEn) return row.nameEn;
  return row.name;
}
```

- [ ] **Step 6: Wrap the layout**

In `src/app/layout.tsx`, wrap `AuthProvider` in `LocaleProvider` (inside the shell div):

```tsx
import { LocaleProvider } from '@/i18n/LocaleProvider';
```
```tsx
        <div className="w-full max-w-[440px] min-h-screen bg-background text-foreground shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <LocaleProvider>
            <AuthProvider>{children}</AuthProvider>
          </LocaleProvider>
        </div>
```

- [ ] **Step 7: Test helper**

Create `src/test/renderWithIntl.tsx`:

```tsx
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import sr from '../../messages/sr.json';

// Existing tests assert Serbian strings; app default is English, tests pin sr.
export function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="sr" messages={sr} timeZone="Europe/Belgrade">
      {ui}
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 8: Verify nothing broke**

Run: `npm test` → all pass (no component uses `useTranslations` yet). Run: `npx tsc --noEmit` → clean. Run: `npm run dev` → app renders as before.

- [ ] **Step 9: Commit**

```bash
git add messages src/i18n src/test/renderWithIntl.tsx src/app/layout.tsx package.json package-lock.json
git commit -m "feat: i18n foundation with next-intl, en/sr catalogs, English default"
```

---

### Task 4: i18n retrofit of existing small components

**Files:**
- Modify: `src/components/setup/DifficultySelector.tsx`, `src/components/setup/ExercisePicker.tsx`, `src/components/setup/SessionLengthSelector.tsx`, `src/components/session/CardDisplay.tsx`, `src/components/session/ProgressIndicator.tsx`, `src/components/auth/LoginForm.tsx`, `src/components/auth/SignupForm.tsx`
- Modify: `src/components/setup/ExercisePicker.test.tsx`, `src/components/setup/SetupScreen.test.tsx`, `src/components/session/SessionScreen.test.tsx`, `src/app/page.test.tsx` (render-wrapper only)

**Interfaces:**
- Consumes: Task 3's `useTranslations`, `localizedName`, `renderWithIntl`.
- Produces: every literal UI string in these components replaced by `t('...')` per the exact mapping below; DB names displayed via `localizedName(row, locale)`. Component props unchanged. Test files change ONLY their render call (`render(` → `renderWithIntl(`) plus the helper import — every assertion stays byte-identical.

- [ ] **Step 1: Apply the string mapping**

In each component add `import { useTranslations } from 'next-intl';` and (where DB names render) `import { useLocaleSetting } from '@/i18n/LocaleProvider'; import { localizedName } from '@/i18n/dbName';`, then replace literals:

| Component | Literal | Replacement |
|---|---|---|
| DifficultySelector | `Učitavanje nivoa...` | `t('setup.levelsLoading')` |
| DifficultySelector | `Greška: {error}` | `t('common.error', { message: error })` |
| DifficultySelector | `Izaberi nivo` | `t('setup.chooseLevel')` |
| DifficultySelector | `DESCRIPTIONS` map values | `t('setup.diffDescBeginner'/'diffDescIntermediate'/'diffDescAdvanced')` keyed by `level.name` via a name→key map `{ 'Početnik': 'diffDescBeginner', 'Srednji': 'diffDescIntermediate', 'Napredni': 'diffDescAdvanced' }`, fallback `''` |
| DifficultySelector | `{level.name}` display | `localizedName(level, locale)`; `aria-label={level.name}` STAYS the raw Serbian DB name (test contract) |
| ExercisePicker | `Izaberi vežbu za svaku kategoriju` | `t('setup.chooseExercises')` |
| ExercisePicker | `{category.name}` / `{exercise.name}` display | `localizedName(...)`; button accessible name follows displayed text — the ExercisePicker tests pass Serbian mocks without `nameEn`, so under `renderWithIntl` (sr) displayed = `name`, assertions unchanged |
| SessionLengthSelector | `Izaberi dužinu treninga` | `t('setup.chooseLength')` |
| SessionLengthSelector | labels/subs | `t('setup.quarterLabel')` etc. — OPTIONS array moves inside the component and holds message keys; `ariaLabel` strings stay hardcoded |
| CardDisplay | `ponavljanja` | `t('workout.reps')` |
| CardDisplay | category badge text | receives `categoryKey` — badge shows `localizedName` of the category… CardDisplay only has `CATEGORY_KEY_TO_NAME` (Serbian). Add optional prop `categoryLabel?: string` (display string provided by SessionScreen); fallback to `CATEGORY_KEY_TO_NAME[categoryKey]` when absent |
| ProgressIndicator | `Karta {current}/{total}` | `t('workout.cardOf', { current, total })` |
| LoginForm | all literals | `auth.*` keys per catalog (`loginTitle`, `email`, `password`, `loginCta`, `loggingIn`, `backHome`) |
| SignupForm | all literals | `auth.*` keys (`signupTitle`, `passwordMin`, `signupCta`, `creating`, `successTitle`, `successNote`, `goLogin`, `backHome`) |

- [ ] **Step 2: Update test render wrappers**

In the four listed test files: add `import { renderWithIntl } from '@/test/renderWithIntl';` and replace every `render(` call with `renderWithIntl(`. Do NOT touch any assertion, mock, or query.

- [ ] **Step 3: Run the full suite**

Run: `npm test` → all pass (Serbian assertions satisfied via sr-pinned helper). Run: `npx tsc --noEmit` → clean. Visual check: `npm run dev` — app now renders ENGLISH by default.

- [ ] **Step 4: Commit**

```bash
git add src/components src/app/page.test.tsx
git commit -m "feat: retrofit existing components to next-intl, English default"
```

---

### Task 5: Challenge domain module (par, budget, quota, score)

**Files:**
- Modify: `src/lib/domain/types.ts` (additive)
- Create: `src/lib/domain/challenge.ts`
- Test: `src/lib/domain/challenge.test.ts`

**Interfaces:**
- Consumes: `Card`, `CardDrawResult`, `DifficultyLevel` from Task 2's types.
- Produces (Tasks 9–12 depend on these exact signatures):
  - types: `GameMode = 'classic' | 'perfect_deck'`; `SessionConfig` gains `gameMode?: GameMode; budgetSeconds?: number; parSource?: 'par' | 'record'`; `CardDrawResult` gains `beatQuota?: boolean | null`; new `ChallengeSettings = { budget_seconds: number; par_source: 'par' | 'record'; score?: number; won?: boolean }`
  - `calculateParSeconds(totalReps: number, cardCount: number, level: DifficultyLevel): number`
  - `resolveBudget(parSeconds: number, recordSeconds: number | null): { budgetSeconds: number; parSource: 'par' | 'record' }`
  - `calculateQuotaSeconds(budgetSeconds: number, cardReps: number, totalReps: number): number`
  - `computeScore(draws: Pick<CardDrawResult, 'beatQuota'>[]): { score: number; total: number; won: boolean }`

- [ ] **Step 1: Extend types**

In `src/lib/domain/types.ts` add:

```typescript
export type GameMode = 'classic' | 'perfect_deck';

export interface ChallengeSettings {
  budget_seconds: number;
  par_source: 'par' | 'record';
  score?: number;
  won?: boolean;
}
```

and extend (optional fields only):

```typescript
export interface SessionConfig {
  difficultyLevelId: string;
  repMultiplier: number;
  deckSize: DeckSize;
  exerciseByCategory: Record<CategoryKey, Exercise>;
  gameMode?: GameMode;
  budgetSeconds?: number;
  parSource?: 'par' | 'record';
}

export interface CardDrawResult {
  orderIndex: number;
  card: Card;
  categoryKey: CategoryKey;
  exercise: Exercise;
  reps: number;
  completedAt: string | null;
  beatQuota?: boolean | null;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/domain/challenge.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateParSeconds, resolveBudget, calculateQuotaSeconds, computeScore } from './challenge';
import type { DifficultyLevel } from './types';

const level: DifficultyLevel = {
  id: 'd1', name: 'Srednji', defaultRepMultiplier: 1,
  parSecondsPerRep: 3, parTransitionSeconds: 20, sortOrder: 2,
};

describe('calculateParSeconds', () => {
  it('is totalReps * secondsPerRep + cards * transition, rounded', () => {
    expect(calculateParSeconds(182, 26, level)).toBe(182 * 3 + 26 * 20); // 1066
  });

  it('falls back to 3.0 s/rep and 20 s/card when par columns are missing', () => {
    const bare: DifficultyLevel = { id: 'd', name: 'X', defaultRepMultiplier: 1, sortOrder: 1 };
    expect(calculateParSeconds(100, 10, bare)).toBe(100 * 3 + 10 * 20);
  });
});

describe('resolveBudget', () => {
  it('uses the record when one exists', () => {
    expect(resolveBudget(1066, 950)).toEqual({ budgetSeconds: 950, parSource: 'record' });
  });

  it('uses par when there is no record', () => {
    expect(resolveBudget(1066, null)).toEqual({ budgetSeconds: 1066, parSource: 'par' });
  });
});

describe('calculateQuotaSeconds', () => {
  it('splits the budget proportionally to reps', () => {
    expect(calculateQuotaSeconds(1000, 10, 100)).toBe(100);
  });

  it('rounds and never returns less than 1', () => {
    expect(calculateQuotaSeconds(100, 1, 1000)).toBe(1);
  });
});

describe('computeScore', () => {
  it('counts beaten cards and wins only when all are beaten', () => {
    expect(computeScore([{ beatQuota: true }, { beatQuota: false }, { beatQuota: true }]))
      .toEqual({ score: 2, total: 3, won: false });
    expect(computeScore([{ beatQuota: true }, { beatQuota: true }]))
      .toEqual({ score: 2, total: 2, won: true });
  });

  it('treats missing/null beatQuota as not beaten', () => {
    expect(computeScore([{ beatQuota: null }, {}])).toEqual({ score: 0, total: 2, won: false });
  });
});
```

Run: `npm test -- challenge` → FAIL (module missing).

- [ ] **Step 3: Implement**

Create `src/lib/domain/challenge.ts`:

```typescript
import type { CardDrawResult, DifficultyLevel } from './types';

const FALLBACK_SECONDS_PER_REP = 3.0;
const FALLBACK_TRANSITION_SECONDS = 20;

export function calculateParSeconds(
  totalReps: number,
  cardCount: number,
  level: DifficultyLevel
): number {
  const perRep = level.parSecondsPerRep ?? FALLBACK_SECONDS_PER_REP;
  const transition = level.parTransitionSeconds ?? FALLBACK_TRANSITION_SECONDS;
  return Math.round(totalReps * perRep + cardCount * transition);
}

export function resolveBudget(
  parSeconds: number,
  recordSeconds: number | null
): { budgetSeconds: number; parSource: 'par' | 'record' } {
  if (recordSeconds !== null) return { budgetSeconds: recordSeconds, parSource: 'record' };
  return { budgetSeconds: parSeconds, parSource: 'par' };
}

export function calculateQuotaSeconds(
  budgetSeconds: number,
  cardReps: number,
  totalReps: number
): number {
  return Math.max(1, Math.round((budgetSeconds * cardReps) / totalReps));
}

export function computeScore(draws: Pick<CardDrawResult, 'beatQuota'>[]): {
  score: number;
  total: number;
  won: boolean;
} {
  const score = draws.filter((d) => d.beatQuota === true).length;
  const total = draws.length;
  return { score, total, won: total > 0 && score === total };
}
```

- [ ] **Step 4: Run tests** — `npm test -- challenge` → PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/types.ts src/lib/domain/challenge.ts src/lib/domain/challenge.test.ts
git commit -m "feat: challenge domain logic (par, budget, quota, score)"
```

---

### Task 6: Streak module

**Files:**
- Create: `src/lib/domain/streak.ts`
- Test: `src/lib/domain/streak.test.ts`

**Interfaces:**
- Produces: `calculateStreak(completedAtIso: string[], now: Date): { days: number; freezesLeftThisWeek: number }` — Tasks 13/14 consume. Pure, local-timezone based, deterministic. Rule (spec section 6): consecutive days ending today or yesterday; up to 2 missed days per ISO week are auto-frozen; a 3rd miss in one ISO week breaks the streak; today without a workout doesn't consume a freeze and doesn't break.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/domain/streak.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateStreak } from './streak';

// Helper: build a local-midday ISO string for YYYY-MM-DD to avoid TZ edge noise.
function d(day: string): string {
  return `${day}T12:00:00`;
}
// 2026-07-09 is a Thursday.
const NOW = new Date('2026-07-09T18:00:00');

describe('calculateStreak', () => {
  it('returns 0 for empty history', () => {
    expect(calculateStreak([], NOW)).toEqual({ days: 0, freezesLeftThisWeek: 2 });
  });

  it('counts consecutive days including today', () => {
    const r = calculateStreak([d('2026-07-09'), d('2026-07-08'), d('2026-07-07')], NOW);
    expect(r.days).toBe(3);
    expect(r.freezesLeftThisWeek).toBe(2);
  });

  it('does not break if today has no workout yet', () => {
    const r = calculateStreak([d('2026-07-08'), d('2026-07-07')], NOW);
    expect(r.days).toBe(2);
  });

  it('freezes up to 2 missed days in one ISO week', () => {
    // Mon 07-06 and Tue 07-07 missed (same ISO week as NOW), Wed 07-08 done.
    const r = calculateStreak([d('2026-07-08'), d('2026-07-05'), d('2026-07-04')], NOW);
    expect(r.days).toBe(4); // 04,05,(06,07 frozen),08 — streak survives, frozen days count as kept
    expect(r.freezesLeftThisWeek).toBe(0);
  });

  it('breaks on the third miss in one ISO week', () => {
    // Mon 06, Tue 07, Wed 08 all missed in NOW's ISO week; last workout Sun 07-05.
    const r = calculateStreak([d('2026-07-05')], NOW);
    expect(r.days).toBe(0);
  });

  it('multiple workouts in one day count once', () => {
    const r = calculateStreak([d('2026-07-09'), d('2026-07-09'), d('2026-07-08')], NOW);
    expect(r.days).toBe(2);
  });

  it('freeze allowances are per ISO week, not global', () => {
    // Missed Thu 07-02 & Fri 07-03 (prev ISO week), and Mon 07-06 & Tue 07-07 (current week).
    const history = [d('2026-07-08'), d('2026-07-05'), d('2026-07-04'), d('2026-07-01'), d('2026-06-30')];
    const r = calculateStreak(history, NOW);
    expect(r.days).toBe(9); // 06-30..07-08 inclusive with 2+2 freezes across two weeks
  });
});
```

Run: `npm test -- streak` → FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/domain/streak.ts`:

```typescript
const FREEZES_PER_WEEK = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ISO-8601 week key, e.g. "2026-W28". Thursday-based algorithm.
function isoWeekKey(date: Date): string {
  const tmp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = (tmp.getDay() + 6) % 7; // Mon=0..Sun=6
  tmp.setDate(tmp.getDate() - dayNum + 3); // nearest Thursday
  const isoYear = tmp.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4DayNum = (jan4.getDay() + 6) % 7;
  const week1Thu = new Date(isoYear, 0, 4 - jan4DayNum + 3);
  const week = 1 + Math.round((tmp.getTime() - week1Thu.getTime()) / (7 * DAY_MS));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

export function calculateStreak(
  completedAtIso: string[],
  now: Date
): { days: number; freezesLeftThisWeek: number } {
  const workoutDays = new Set(completedAtIso.map((iso) => localDayKey(new Date(iso))));
  const freezesUsed = new Map<string, number>();
  const currentWeek = isoWeekKey(now);

  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Today without a workout: skip back to yesterday without penalty.
  if (!workoutDays.has(localDayKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  let days = 0;
  for (;;) {
    const key = localDayKey(cursor);
    if (workoutDays.has(key)) {
      days += 1;
    } else {
      const week = isoWeekKey(cursor);
      const used = freezesUsed.get(week) ?? 0;
      if (used >= FREEZES_PER_WEEK) break;
      freezesUsed.set(week, used + 1);
      if (days === 0 && week !== currentWeek) break; // streak never started
      days += 1; // frozen day preserves the chain
    }
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (days === 0) break; // nothing found at the anchor — no streak
  }

  return {
    days,
    freezesLeftThisWeek: FREEZES_PER_WEEK - (freezesUsed.get(currentWeek) ?? 0),
  };
}
```

- [ ] **Step 3: Run tests** — `npm test -- streak` → PASS (7 tests). If the walk-in edge tests fail, fix the implementation, not the tests — the test cases ARE the spec's rule.

- [ ] **Step 4: Commit**

```bash
git add src/lib/domain/streak.ts src/lib/domain/streak.test.ts
git commit -m "feat: streak calculation with 2 weekly auto-freezes"
```

---

### Task 7: Session persistence extensions (gameMode, settings, beat_quota)

**Files:**
- Modify: `src/lib/supabase/sessions.ts`
- Modify: `src/lib/supabase/sessions.test.ts` (additive tests; render/mocks pattern unchanged)

**Interfaces:**
- Consumes: `GameMode`, `ChallengeSettings` (Task 5).
- Produces (Task 11 depends on): `CreateSessionParams` gains `gameMode?: GameMode; settings?: ChallengeSettings` (insert includes `game_mode`/`settings` when provided); `recordCardDraw` writes `beat_quota: draw.beatQuota ?? null`; `completeSession(sessionId, totalDurationSeconds, settings?: ChallengeSettings)` also updates `settings` when provided. `getUserSessions` selects `game_mode, settings` and maps `gameMode: string; score: number | null` onto `SessionHistoryEntry`.

- [ ] **Step 1: Add failing tests**

Append to `src/lib/supabase/sessions.test.ts` (same mock-chain style as the existing tests in that file):

```typescript
describe('challenge extensions', () => {
  it('createSession includes game_mode and settings when provided', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'session-1' }, error: null });
    const selectAfterInsert = vi.fn(() => ({ single }));
    const sessionsInsert = vi.fn(() => ({ select: selectAfterInsert }));
    const sessionExercisesInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) =>
      table === 'sessions' ? { insert: sessionsInsert } : { insert: sessionExercisesInsert }
    );
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await createSession({
      userId: 'user-1',
      config: {
        difficultyLevelId: 'd1', repMultiplier: 1, deckSize: 13,
        exerciseByCategory: {
          push: { id: 'e1', name: 'A', categoryId: 'c1', difficultyLevelId: 'd1' },
          pull: { id: 'e2', name: 'B', categoryId: 'c2', difficultyLevelId: 'd1' },
          legs: { id: 'e3', name: 'C', categoryId: 'c3', difficultyLevelId: 'd1' },
          core: { id: 'e4', name: 'D', categoryId: 'c4', difficultyLevelId: 'd1' },
        },
      },
      categoryIdByKey: { push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' },
      startedAtIso: '2026-07-09T10:00:00.000Z',
      gameMode: 'perfect_deck',
      settings: { budget_seconds: 1066, par_source: 'par' },
    });

    expect(sessionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        game_mode: 'perfect_deck',
        settings: { budget_seconds: 1066, par_source: 'par' },
      })
    );
  });

  it('recordCardDraw writes beat_quota', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await recordCardDraw('session-1', {
      orderIndex: 0,
      card: { suit: 'hearts', rank: 10 },
      categoryKey: 'push',
      exercise: { id: 'e1', name: 'A', categoryId: 'c1', difficultyLevelId: 'd1' },
      reps: 10,
      completedAt: '2026-07-09T10:00:05.000Z',
      beatQuota: true,
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ beat_quota: true }));
  });

  it('completeSession merges final challenge settings when provided', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await completeSession('session-1', 990, {
      budget_seconds: 1066, par_source: 'par', score: 22, won: false,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: { budget_seconds: 1066, par_source: 'par', score: 22, won: false },
      })
    );
  });
});
```

Also update the existing `getUserSessions` test's mock row to include `game_mode: 'classic', settings: {}` and its expectation to include `gameMode: 'classic', score: null`.

Run: `npm test -- sessions` → FAIL.

- [ ] **Step 2: Implement**

In `src/lib/supabase/sessions.ts`:
- `CreateSessionParams` gains `gameMode?: GameMode; settings?: ChallengeSettings` (import both from `../domain/types`). The insert object adds `...(params.gameMode ? { game_mode: params.gameMode } : {})` and `...(params.settings ? { settings: params.settings } : {})`.
- `recordCardDraw`'s insert adds `beat_quota: draw.beatQuota ?? null`.
- `completeSession(sessionId: string, totalDurationSeconds: number, settings?: ChallengeSettings)` — update object adds `...(settings ? { settings } : {})`.
- `SessionHistoryEntry` gains `gameMode: string; score: number | null`; `getUserSessions` selects `game_mode, settings`, maps `gameMode: row.game_mode`, `score: (row.settings as { score?: number } | null)?.score ?? null`.

Run: `npm test -- sessions` → PASS. `npx tsc --noEmit` → clean (existing callers unaffected: new params optional).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/sessions.ts src/lib/supabase/sessions.test.ts
git commit -m "feat: persist game mode, challenge settings, and per-card quota outcomes"
```

---

### Task 8: Records module

**Files:**
- Create: `src/lib/supabase/records.ts`
- Test: `src/lib/supabase/records.test.ts`

**Interfaces:**
- Consumes: `createClient` (existing).
- Produces (Tasks 9/13/14 depend on):
  - `getBestDurationSeconds(userId: string, difficultyLevelId: string, totalCards: number): Promise<number | null>` — best completed duration, any mode
  - `PersonalRecord = { difficultyName: string; totalCards: number; bestDurationSeconds: number; bestScore: number | null; scoreTotal: number | null }`
  - `getPersonalRecords(userId: string): Promise<PersonalRecord[]>`
  - `getCompletedSessionDates(userId: string): Promise<string[]>` — `completed_at` of all completed sessions (streak input)
  - `aggregateRecords(rows)` — exported pure helper the tests exercise directly

- [ ] **Step 1: Write the failing tests**

Create `src/lib/supabase/records.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { aggregateRecords } from './records';

const rows = [
  { difficultyName: 'Srednji', totalCards: 26, durationSeconds: 1112, gameMode: 'classic', score: null },
  { difficultyName: 'Srednji', totalCards: 26, durationSeconds: 990, gameMode: 'perfect_deck', score: 22 },
  { difficultyName: 'Srednji', totalCards: 26, durationSeconds: 1050, gameMode: 'perfect_deck', score: 24 },
  { difficultyName: 'Napredni', totalCards: 52, durationSeconds: 2467, gameMode: 'classic', score: null },
];

describe('aggregateRecords', () => {
  it('keeps best duration and best score per difficulty+deck combination', () => {
    const result = aggregateRecords(rows);
    expect(result).toEqual([
      {
        difficultyName: 'Srednji', totalCards: 26,
        bestDurationSeconds: 990, bestScore: 24, scoreTotal: 26,
      },
      {
        difficultyName: 'Napredni', totalCards: 52,
        bestDurationSeconds: 2467, bestScore: null, scoreTotal: null,
      },
    ]);
  });

  it('returns empty for no rows', () => {
    expect(aggregateRecords([])).toEqual([]);
  });
});
```

Run: `npm test -- records` → FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/supabase/records.ts`:

```typescript
import { createClient } from './client';

export interface PersonalRecord {
  difficultyName: string;
  totalCards: number;
  bestDurationSeconds: number;
  bestScore: number | null;
  scoreTotal: number | null;
}

export interface RecordRow {
  difficultyName: string;
  totalCards: number;
  durationSeconds: number;
  gameMode: string;
  score: number | null;
}

export function aggregateRecords(rows: RecordRow[]): PersonalRecord[] {
  const byCombo = new Map<string, PersonalRecord>();
  for (const row of rows) {
    const key = `${row.difficultyName}|${row.totalCards}`;
    const existing = byCombo.get(key);
    if (!existing) {
      byCombo.set(key, {
        difficultyName: row.difficultyName,
        totalCards: row.totalCards,
        bestDurationSeconds: row.durationSeconds,
        bestScore: row.gameMode === 'perfect_deck' ? row.score : null,
        scoreTotal: row.gameMode === 'perfect_deck' && row.score !== null ? row.totalCards : null,
      });
      continue;
    }
    if (row.durationSeconds < existing.bestDurationSeconds) {
      existing.bestDurationSeconds = row.durationSeconds;
    }
    if (row.gameMode === 'perfect_deck' && row.score !== null) {
      if (existing.bestScore === null || row.score > existing.bestScore) {
        existing.bestScore = row.score;
        existing.scoreTotal = row.totalCards;
      }
    }
  }
  return Array.from(byCombo.values());
}

interface SessionRecordSelect {
  total_cards: number;
  total_duration_seconds: number | null;
  game_mode: string;
  settings: { score?: number } | null;
  difficulty_levels: { name: string };
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('total_cards, total_duration_seconds, game_mode, settings, difficulty_levels(name)')
    .eq('user_id', userId)
    .eq('status', 'completed');
  if (error) throw error;
  const rows: RecordRow[] = (data as unknown as SessionRecordSelect[])
    .filter((r) => r.total_duration_seconds !== null)
    .map((r) => ({
      difficultyName: r.difficulty_levels.name,
      totalCards: r.total_cards,
      durationSeconds: r.total_duration_seconds as number,
      gameMode: r.game_mode,
      score: r.settings?.score ?? null,
    }));
  return aggregateRecords(rows);
}

export async function getBestDurationSeconds(
  userId: string,
  difficultyLevelId: string,
  totalCards: number
): Promise<number | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('total_duration_seconds')
    .eq('user_id', userId)
    .eq('difficulty_level_id', difficultyLevelId)
    .eq('total_cards', totalCards)
    .eq('status', 'completed')
    .not('total_duration_seconds', 'is', null)
    .order('total_duration_seconds', { ascending: true })
    .limit(1);
  if (error) throw error;
  const row = (data as Array<{ total_duration_seconds: number }>)[0];
  return row ? row.total_duration_seconds : null;
}

export async function getCompletedSessionDates(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null);
  if (error) throw error;
  return (data as Array<{ completed_at: string }>).map((r) => r.completed_at);
}
```

Run: `npm test -- records` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/records.ts src/lib/supabase/records.test.ts
git commit -m "feat: personal records and streak-input queries"
```

---

### Task 9: Mode registry, step 0, and budget resolution in SetupScreen

**Files:**
- Create: `src/lib/modes/registry.ts`, `src/components/setup/ModeSelector.tsx`
- Modify: `src/components/setup/SetupScreen.tsx`, `src/app/page.tsx`
- Modify: `src/components/setup/SetupScreen.test.tsx`

**Interfaces:**
- Consumes: `calculateParSeconds`, `resolveBudget` (Task 5); `getBestDurationSeconds` (Task 8); i18n (Task 3).
- Produces: `ModeDefinition = { id: GameMode; titleKey: string; descKey: string; isChallenge: boolean }`; `MODES: ModeDefinition[]` (classic first, then perfect_deck); `ModeSelector` with props `{ onSelect: (mode: GameMode) => void; beatChipLabel?: string | null }`; `SetupScreen` gains optional prop `userId?: string | null` and produces `SessionConfig` carrying `gameMode`, and for `perfect_deck` also `budgetSeconds`/`parSource`; draws for challenges carry `beatQuota: null` initially. Wizard is now 4 steps (`mode → difficulty → exercises → length`), 4 progress bars, back from difficulty returns to mode.

- [ ] **Step 1: Registry**

Create `src/lib/modes/registry.ts`:

```typescript
import type { GameMode } from '../domain/types';

export interface ModeDefinition {
  id: GameMode;
  titleKey: string;
  descKey: string;
  isChallenge: boolean;
}

// Future modes ("survive_deck", "ghost_race", "sprint" — see spec section 1)
// are added here as new entries plus message keys; step 0 renders from this list.
export const MODES: ModeDefinition[] = [
  { id: 'classic', titleKey: 'setup.classicTitle', descKey: 'setup.classicDesc', isChallenge: false },
  { id: 'perfect_deck', titleKey: 'setup.challengeTitle', descKey: 'setup.challengeDesc', isChallenge: true },
];
```

- [ ] **Step 2: ModeSelector component**

Create `src/components/setup/ModeSelector.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { MODES } from '@/lib/modes/registry';
import type { GameMode } from '@/lib/domain/types';

interface ModeSelectorProps {
  onSelect: (mode: GameMode) => void;
  beatChipLabel?: string | null;
}

export function ModeSelector({ onSelect, beatChipLabel }: ModeSelectorProps) {
  const t = useTranslations();
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseMode')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={`text-left rounded-[18px] p-5 border-2 ${
              mode.isChallenge
                ? 'bg-accent/10 border-accent'
                : 'bg-surface border-white/5 hover:border-accent/50'
            }`}
          >
            <span className={`block text-[19px] font-extrabold mb-1 ${mode.isChallenge ? 'text-accent' : ''}`}>
              {t(mode.titleKey)}
            </span>
            <span className="block text-sm font-semibold text-muted">{t(mode.descKey)}</span>
            {mode.isChallenge && beatChipLabel && (
              <span className="inline-block mt-2 bg-background text-accent text-xs font-extrabold px-2.5 py-1.5 rounded-lg">
                {beatChipLabel}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update the SetupScreen test first**

In `src/components/setup/SetupScreen.test.tsx`:
- Mock the records module at the top: `vi.mock('@/lib/supabase/records', () => ({ getBestDurationSeconds: vi.fn().mockResolvedValue(null) }));`
- Classic walk-through test: insert `await user.click(await screen.findByRole('button', { name: /Klasično/ }));` as the FIRST click; assert additionally `expect(config.gameMode).toBe('classic')`.
- Add a challenge test:

```tsx
  it('challenge mode produces a budget from par when no record exists', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue([
      { ...difficultyLevels[0], parSecondsPerRep: 3, parTransitionSeconds: 20 },
    ]);
    vi.mocked(fetchExercisesByDifficulty).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(<SetupScreen onStart={onStart} userId={null} />);

    await user.click(await screen.findByRole('button', { name: /Perfektan špil/ }));
    await user.click(await screen.findByRole('button', { name: 'Srednji' }));
    await user.click(await screen.findByRole('button', { name: 'Sklekovi' }));
    await user.click(screen.getByRole('button', { name: 'Zgibovi' }));
    await user.click(screen.getByRole('button', { name: 'Čučnjevi' }));
    await user.click(screen.getByRole('button', { name: 'Trbušnjaci' }));
    await user.click(await screen.findByRole('button', { name: 'Ceo špil (52 karte)' }));

    const [config, draws] = onStart.mock.calls[0];
    expect(config.gameMode).toBe('perfect_deck');
    expect(config.parSource).toBe('par');
    const totalReps = draws.reduce((s: number, d: { reps: number }) => s + d.reps, 0);
    expect(config.budgetSeconds).toBe(Math.round(totalReps * 3 + 52 * 20));
  });
```

Run: `npm test -- SetupScreen` → FAIL (no mode step yet).

- [ ] **Step 4: Extend SetupScreen**

Modify `src/components/setup/SetupScreen.tsx` — changes relative to the redesign version:
- `type Step = 'mode' | 'difficulty' | 'exercises' | 'length'`; `STEP_NUMBER` = `{ mode: 1, difficulty: 2, exercises: 3, length: 4 }`; initial step `'mode'`; progress row renders `[1, 2, 3, 4]`; step label uses `t('setup.step', { current: stepNumber, total: 4 })`.
- New state: `const [gameMode, setGameMode] = useState<GameMode>('classic');`
- New prop: `userId?: string | null`.
- `handleBack`: `length → exercises → difficulty → mode → onBack?.()`.
- Render `'mode'` step: `<ModeSelector onSelect={(m) => { setGameMode(m); setStep('difficulty'); }} />` (the beat-chip label is a nice-to-have that requires knowing the last combination before difficulty is chosen — omit it here; records are surfaced on the Progress screen and in results. Keep `beatChipLabel` unused/null in this release).
- `handleLengthSelect` becomes async and, for `perfect_deck`, resolves the budget AFTER building draws (needs total reps):

```tsx
  async function handleLengthSelect(deckSize: DeckSize) {
    if (!difficulty || !exerciseByCategory) return;
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
        beatQuota: gameMode === 'perfect_deck' ? null : undefined,
      };
    });

    const config: SessionConfig = {
      difficultyLevelId: difficulty.id,
      repMultiplier: difficulty.defaultRepMultiplier,
      deckSize,
      exerciseByCategory,
      gameMode,
    };

    if (gameMode === 'perfect_deck') {
      const totalReps = draws.reduce((sum, d) => sum + d.reps, 0);
      const par = calculateParSeconds(totalReps, deckSize, difficulty);
      let record: number | null = null;
      if (userId) {
        try {
          record = await getBestDurationSeconds(userId, difficulty.id, deckSize);
        } catch (err) {
          console.error('Failed to fetch record, falling back to par', err);
        }
      }
      const { budgetSeconds, parSource } = resolveBudget(par, record);
      config.budgetSeconds = budgetSeconds;
      config.parSource = parSource;
    }

    onStart(config, draws);
  }
```

with imports `calculateParSeconds, resolveBudget` from `@/lib/domain/challenge`, `getBestDurationSeconds` from `@/lib/supabase/records`, `GameMode` type, and `ModeSelector`.
- `src/app/page.tsx`: pass `userId={user?.id ?? null}` to `SetupScreen`.

Run: `npm test -- SetupScreen` → PASS. Run: `npm test` → all pass (`page.test` mocks SetupScreen).

- [ ] **Step 5: Commit**

```bash
git add src/lib/modes/registry.ts src/components/setup/ModeSelector.tsx src/components/setup/SetupScreen.tsx src/components/setup/SetupScreen.test.tsx src/app/page.tsx
git commit -m "feat: mode registry, mode-select step, and challenge budget resolution"
```

---

### Task 10: useCardQuota hook (timestamp-based per-card countdown)

**Files:**
- Create: `src/hooks/useCardQuota.ts`
- Test: `src/hooks/useCardQuota.test.ts`

**Interfaces:**
- Consumes: `startTimer`, `pauseTimer`, `resumeTimer`, `getElapsedSeconds` from `src/lib/domain/timer` (MVP Task 9 — unchanged).
- Produces (Task 11 depends on): `useCardQuota(quotaSeconds: number | null, cardIndex: number, isPaused: boolean): { remainingSeconds: number; fraction: number; expired: boolean }`. `quotaSeconds === null` (classic mode) returns inert values (`remainingSeconds: 0, fraction: 1, expired: false`). The countdown resets when `cardIndex` changes and freezes while `isPaused`. Timer invariant: remaining = quota − (timestamp-derived elapsed); the 250ms interval only triggers re-renders.

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useCardQuota.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardQuota } from './useCardQuota';

describe('useCardQuota', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T10:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('counts down from the quota', () => {
    const { result } = renderHook(() => useCardQuota(30, 0, false));
    expect(result.current.remainingSeconds).toBe(30);
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:10.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(20);
    expect(result.current.fraction).toBeCloseTo(20 / 30, 2);
    expect(result.current.expired).toBe(false);
  });

  it('expires at zero and clamps', () => {
    const { result } = renderHook(() => useCardQuota(5, 0, false));
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:09.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.expired).toBe(true);
  });

  it('resets when the card index changes', () => {
    const { result, rerender } = renderHook(
      ({ index }) => useCardQuota(30, index, false),
      { initialProps: { index: 0 } }
    );
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:10.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(20);
    rerender({ index: 1 });
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.remainingSeconds).toBe(30);
  });

  it('freezes while paused and resumes without losing time', () => {
    const { result, rerender } = renderHook(
      ({ paused }) => useCardQuota(30, 0, paused),
      { initialProps: { paused: false } }
    );
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:05.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(25);
    rerender({ paused: true });
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:25.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(25);
    rerender({ paused: false });
    act(() => {
      vi.setSystemTime(new Date('2026-07-09T10:00:30.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.remainingSeconds).toBe(20);
  });

  it('is inert for classic mode (null quota)', () => {
    const { result } = renderHook(() => useCardQuota(null, 0, false));
    expect(result.current).toEqual({ remainingSeconds: 0, fraction: 1, expired: false });
  });
});
```

Run: `npm test -- useCardQuota` → FAIL.

- [ ] **Step 2: Implement**

Create `src/hooks/useCardQuota.ts`:

```typescript
'use client';

import { useEffect, useReducer, useRef } from 'react';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  getElapsedSeconds,
  type TimerState,
} from '@/lib/domain/timer';

export function useCardQuota(
  quotaSeconds: number | null,
  cardIndex: number,
  isPaused: boolean
): { remainingSeconds: number; fraction: number; expired: boolean } {
  const timerRef = useRef<TimerState>(startTimer());
  const lastIndexRef = useRef(cardIndex);
  const wasPausedRef = useRef(isPaused);
  const [, forceRerender] = useReducer((c: number) => c + 1, 0);

  if (lastIndexRef.current !== cardIndex) {
    lastIndexRef.current = cardIndex;
    timerRef.current = startTimer();
  }

  if (wasPausedRef.current !== isPaused) {
    wasPausedRef.current = isPaused;
    timerRef.current = isPaused ? pauseTimer(timerRef.current) : resumeTimer(timerRef.current);
  }

  useEffect(() => {
    if (quotaSeconds === null || isPaused) return;
    const interval = setInterval(forceRerender, 250);
    return () => clearInterval(interval);
  }, [quotaSeconds, isPaused, cardIndex]);

  if (quotaSeconds === null) {
    return { remainingSeconds: 0, fraction: 1, expired: false };
  }

  const elapsed = getElapsedSeconds(timerRef.current);
  const remainingSeconds = Math.max(0, quotaSeconds - elapsed);
  return {
    remainingSeconds,
    fraction: quotaSeconds > 0 ? remainingSeconds / quotaSeconds : 0,
    expired: remainingSeconds === 0,
  };
}
```

Run: `npm test -- useCardQuota` → PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCardQuota.ts src/hooks/useCardQuota.test.ts
git commit -m "feat: timestamp-based per-card quota countdown hook"
```

---

### Task 11: Challenge UI on the workout screen

**Files:**
- Modify: `src/components/session/CardDisplay.tsx`, `src/components/session/SessionScreen.tsx`, `src/app/page.tsx`
- Modify: `src/components/session/SessionScreen.test.tsx` (additive challenge test)

**Interfaces:**
- Consumes: `useCardQuota` (Task 10), `calculateQuotaSeconds`, `computeScore` (Task 5), sessions extensions (Task 7), i18n (Task 3), `localizedName`.
- Produces: `CardDisplay` gains optional props `quotaRemainingSeconds?: number | null; quotaFraction?: number; outcomeFlash?: 'won' | 'lost' | null; categoryLabel?: string` — classic mode passes none of them and renders exactly as before. `SessionScreen` behavior for classic mode is UNCHANGED (all existing tests must pass untouched). For `perfect_deck`: quota countdown + draining bar on the card, score pill, per-card `beatQuota` computed at click time, `completeSession` receives final `ChallengeSettings`, `onFinish` result draws carry `beatQuota`.

- [ ] **Step 1: Extend CardDisplay**

In `src/components/session/CardDisplay.tsx` add the optional props and, inside the card below the reps caption, the quota block (rendered only when `quotaRemainingSeconds` is a number):

```tsx
interface CardDisplayProps {
  exerciseName: string;
  reps: number;
  suit?: Suit;
  rank?: number;
  categoryKey?: CategoryKey;
  categoryLabel?: string;
  quotaRemainingSeconds?: number | null;
  quotaFraction?: number;
  outcomeFlash?: 'won' | 'lost' | null;
}
```

Quota color derives from `quotaFraction`: `>= 0.5` → `text-accent`/`bg-accent`, `>= 0.25` → orange (`text-orange-400`/`bg-orange-400`), else red (`text-red-500`/`bg-red-500`) plus `animate-pulse` on the card border container. Card container classes become conditional:

```tsx
const fraction = quotaFraction ?? 1;
const urgency =
  quotaRemainingSeconds == null ? 'normal' : fraction >= 0.5 ? 'normal' : fraction >= 0.25 ? 'warn' : 'critical';
const borderClass =
  outcomeFlash === 'won'
    ? 'border-accent shadow-[0_0_60px_rgba(204,255,0,0.35)]'
    : outcomeFlash === 'lost'
      ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.35)]'
      : urgency === 'critical'
        ? 'border-red-500 animate-pulse'
        : urgency === 'warn'
          ? 'border-orange-400/70'
          : 'border-accent/35';
```

applied as `` className={`bg-surface/55 backdrop-blur-xl rounded-3xl border-2 ${borderClass} shadow-[0_0_40px_rgba(204,255,0,0.08)] p-7 min-h-[360px] flex flex-col`} `` — and the quota block after the reps caption:

```tsx
{quotaRemainingSeconds != null && (
  <>
    <p className={`text-2xl font-black tabular-nums mt-2.5 ${
      urgency === 'critical' ? 'text-red-500' : urgency === 'warn' ? 'text-orange-400' : 'text-accent'
    }`}>
      {Math.floor(quotaRemainingSeconds / 60)}:{String(quotaRemainingSeconds % 60).padStart(2, '0')}
    </p>
    <p className={`text-[10px] font-bold tracking-widest ${
      urgency === 'critical' ? 'text-red-500' : 'text-muted'
    }`}>
      {t('workout.quotaCaption')}
    </p>
  </>
)}
```

plus a draining bar at the card's bottom (`width: ${Math.round(fraction * 100)}%`, same urgency color). CardDisplay becomes a client component (`'use client'` + `useTranslations`) — it already renders only inside client trees, so this is safe. The category badge shows `categoryLabel ?? CATEGORY_KEY_TO_NAME[categoryKey]`.

- [ ] **Step 2: Add the failing challenge test for SessionScreen**

Append to `src/components/session/SessionScreen.test.tsx`:

```tsx
describe('SessionScreen — perfect_deck challenge', () => {
  it('records beatQuota per card and completes with challenge settings', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const challengeConfig = { ...config, gameMode: 'perfect_deck' as const, budgetSeconds: 110, parSource: 'par' as const };

    renderWithIntl(
      <SessionScreen
        config={challengeConfig}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await screen.findByRole('button', { name: 'Sledeća karta' });
    // Card 1 (5 reps of 11 total): quota = round(110*5/11) = 50s. Click immediately → beaten.
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    expect(recordCardDraw).toHaveBeenLastCalledWith('session-1', expect.objectContaining({ beatQuota: true }));

    // Card 2 (6 reps): quota = round(110*6/11) = 60s. Let it expire, then click → lost.
    await vi.advanceTimersByTimeAsync(61_000);
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    expect(recordCardDraw).toHaveBeenLastCalledWith('session-1', expect.objectContaining({ beatQuota: false }));

    expect(completeSession).toHaveBeenCalledWith(
      'session-1',
      expect.any(Number),
      expect.objectContaining({ budget_seconds: 110, par_source: 'par', score: 1, won: false })
    );
    const result = onFinish.mock.calls[0][0];
    expect(result.draws.map((d: { beatQuota?: boolean | null }) => d.beatQuota)).toEqual([true, false]);
    vi.useRealTimers();
  });
});
```

Run: `npm test -- SessionScreen` → FAIL.

- [ ] **Step 3: Extend SessionScreen**

In `src/components/session/SessionScreen.tsx` (all classic-mode paths untouched):
- Imports: `useCardQuota`, `calculateQuotaSeconds`, `computeScore`, `useTranslations`, `useLocaleSetting`, `localizedName`, `CATEGORY_KEY_TO_NAME`.
- Derivations before render:

```tsx
  const isChallenge = config.gameMode === 'perfect_deck' && config.budgetSeconds != null;
  const totalReps = draws.reduce((sum, d) => sum + d.reps, 0);
  const quotaSeconds = isChallenge
    ? calculateQuotaSeconds(config.budgetSeconds as number, draws[currentIndex].reps, totalReps)
    : null;
  const quota = useCardQuota(quotaSeconds, currentIndex, stopwatch.isPaused);
  const scoreSoFar = computeScore(completedDraws.slice(0, currentIndex));
  const [outcomeFlash, setOutcomeFlash] = useState<'won' | 'lost' | null>(null);
```

- In `handleNext`, when building `updatedDraw`, add: `beatQuota: isChallenge ? !quota.expired : draw.beatQuota` (i.e. `{ ...completedDraws[currentIndex], completedAt, ...(isChallenge ? { beatQuota: !quota.expired } : {}) }`), and set the flash: `setOutcomeFlash(isChallenge ? (!quota.expired ? 'won' : 'lost') : null);` followed by `setTimeout(() => setOutcomeFlash(null), 600);` (visual-only; no timing logic depends on it).
- At the finish branch, compute and pass final settings:

```tsx
      const finalSettings = isChallenge
        ? {
            budget_seconds: config.budgetSeconds as number,
            par_source: config.parSource ?? 'par',
            ...computeScore(nextDraws),
          }
        : undefined;
      // computeScore returns { score, total, won } — total is redundant in settings; keep score & won:
      const settingsPayload = finalSettings
        ? { budget_seconds: finalSettings.budget_seconds, par_source: finalSettings.par_source, score: finalSettings.score, won: finalSettings.won }
        : undefined;
```

and call `completeSession(sessionId, totalDurationSeconds, settingsPayload)` (guest/failed save-state guards unchanged).
- Render additions (challenge only): score pill in the header row's left slot (replacing the `w-10` spacer when `isChallenge`): `<p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-accent">⚡ {scoreSoFar.score}/{currentIndex}</p>` (shows beaten/attempted so far; keep the spacer for classic). Pass to CardDisplay: `categoryLabel={localizedName(categoryRow…)}` — the category display name: use `CATEGORY_KEY_TO_NAME[current.categoryKey]` for sr and the exercise's category… categories aren't fetched here; simplest correct source: `categoryLabel` = `t(...)`-free `localizedName` needs the Category row which SessionScreen doesn't have. Pass `categoryLabel={undefined}` and let CardDisplay fall back to `CATEGORY_KEY_TO_NAME` (Serbian) — acceptable: category label on the card badge stays Serbian in both locales in this release (DB-driven localization of the badge would require threading Category rows through; documented simplification). Also pass `quotaRemainingSeconds={isChallenge ? quota.remainingSeconds : null}`, `quotaFraction={quota.fraction}`, `outcomeFlash={outcomeFlash}`.

Run: `npm test -- SessionScreen` → PASS (existing 3 classic tests + 1 challenge test).

- [ ] **Step 4: Full suite + visual**

Run: `npm test` → all pass. `npm run dev` → run a guest challenge: quota counts down on the card, colors shift volt→orange→red with pulse, ✓/✗ flash between cards, score pill updates; classic run looks unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/session/CardDisplay.tsx src/components/session/SessionScreen.tsx src/components/session/SessionScreen.test.tsx src/app/page.tsx
git commit -m "feat: perfect-deck challenge UI with quota countdown, urgency states, and score"
```

---

### Task 12: Challenge results on the summary screen

**Files:**
- Modify: `src/components/summary/SummaryScreen.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `computeScore` (Task 5), i18n, `SessionResult` draws carrying `beatQuota` (Task 11).
- Produces: `SummaryScreen` gains optional prop `config?: SessionConfig | null` (page passes the session's config). When `config?.gameMode === 'perfect_deck'`: caption uses `results.challengeDone`; score line `t('results.score', { score, total })` under the time; if `won` → `t('results.perfectDeck')` banner with a CSS confetti burst; if `result.totalDurationSeconds < (config.budgetSeconds ?? Infinity)` → `t('results.newRecord')` chip. Classic rendering unchanged. No automated test (presentation-only, consistent with SummaryScreen's MVP/redesign treatment) — verified visually.

- [ ] **Step 1: Implement**

- `page.tsx`: `<SummaryScreen result={result} isGuest={!user} config={config} onDone={...} />`.
- `SummaryScreen.tsx`: compute `const challenge = config?.gameMode === 'perfect_deck' ? computeScore(result.draws) : null;` and render, between the caption and the time:

```tsx
{challenge?.won && (
  <div className="relative text-center mt-3">
    <p className="text-2xl font-black text-accent tracking-widest animate-bounce">
      {t('results.perfectDeck')}
    </p>
  </div>
)}
```

score line under the time block:

```tsx
{challenge && (
  <p className="text-lg font-extrabold text-accent text-center mt-1">
    {t('results.score', { score: challenge.score, total: challenge.total })}
  </p>
)}
{challenge && config?.budgetSeconds != null && result.totalDurationSeconds < config.budgetSeconds && (
  <p className="inline-block mx-auto mt-2 bg-accent text-background text-xs font-extrabold px-3 py-1.5 rounded-lg text-center">
    {t('results.newRecord')}
  </p>
)}
```

Confetti (win only): a `pointer-events-none absolute inset-0 overflow-hidden` layer with ~12 small squares animated via a CSS `@keyframes confetti-fall` (translateY + rotate, staggered `animation-delay`, colors alternating `bg-accent`/`bg-orange-400`/`bg-red-500`) added to `globals.css`. Pure CSS, runs once for 1.5s.

- [ ] **Step 2: Verify**

`npm test` → all pass (page.test mocks SummaryScreen). `npx tsc --noEmit` → clean. Visual: finish a short challenge losing some cards (score + no banner), and a won one (banner + confetti + new-record chip when faster than budget).

- [ ] **Step 3: Commit**

```bash
git add src/components/summary/SummaryScreen.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: challenge results with score, perfect-deck celebration, and record marker"
```

---

### Task 13: Progress screen (streak + records + history)

**Files:**
- Create: `src/components/progress/ProgressScreen.tsx`
- Delete: `src/components/history/HistoryScreen.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `calculateStreak` (Task 6), `getPersonalRecords`, `getCompletedSessionDates` (Task 8), `getUserSessions` (Task 7's extended entries), i18n.
- Produces: `ProgressScreen` with props `{ userId: string; onBack?: () => void }`, rendered by `page.tsx` for the `'history'` screen state (state name unchanged — wiring only). Layout per the committed mockup: streak card (🔥 + `progress.streak` + `progress.streakCaption` with ❄️ repeated `freezesLeftThisWeek` times), records list (`localizedName`-style difficulty display comes from `difficultyName` — Serbian DB name shown as-is in both locales, consistent with Task 11's simplification), history list with `⚡ {score}/{totalCards}` for challenge rows and `progress.classicTag` for classic rows.

- [ ] **Step 1: Implement ProgressScreen**

Create `src/components/progress/ProgressScreen.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { calculateStreak } from '@/lib/domain/streak';
import { getPersonalRecords, getCompletedSessionDates, type PersonalRecord } from '@/lib/supabase/records';
import { getUserSessions, type SessionHistoryEntry } from '@/lib/supabase/sessions';

interface ProgressScreenProps {
  userId: string;
  onBack?: () => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function ProgressScreen({ userId, onBack }: ProgressScreenProps) {
  const t = useTranslations();
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [streak, setStreak] = useState({ days: 0, freezesLeftThisWeek: 2 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUserSessions(userId), getPersonalRecords(userId), getCompletedSessionDates(userId)])
      .then(([sessionRows, recordRows, dates]) => {
        setSessions(sessionRows);
        setRecords(recordRows);
        setStreak(calculateStreak(dates, new Date()));
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-6">
        {onBack && (
          <button onClick={onBack} aria-label={t('common.back')} className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold">
            ←
          </button>
        )}
        <h1 className="text-2xl font-extrabold">{t('progress.title')}</h1>
      </div>

      {isLoading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : (
        <>
          <div className="bg-surface rounded-2xl p-4 flex items-center gap-3 mb-5">
            <span className="text-4xl">🔥</span>
            <div>
              <p className="text-2xl font-black leading-none">
                {t('progress.streak', { days: streak.days })}
              </p>
              <p className="text-xs text-muted font-semibold mt-1">
                {t('progress.streakCaption', { freezes: '❄️'.repeat(streak.freezesLeftThisWeek) || '0' })}
              </p>
            </div>
          </div>

          {records.length > 0 && (
            <>
              <p className="text-xs font-extrabold text-muted tracking-widest uppercase mb-2">
                {t('progress.recordsTitle')}
              </p>
              <div className="flex flex-col gap-2 mb-5">
                {records.map((record) => (
                  <div key={`${record.difficultyName}-${record.totalCards}`} className="bg-surface rounded-xl px-3.5 py-3 flex justify-between items-center">
                    <p className="text-sm font-bold">
                      {t('progress.cardsLine', { count: record.totalCards })} · {record.difficultyName}
                    </p>
                    <div className="text-right">
                      <p className="text-sm font-black text-accent">{formatDuration(record.bestDurationSeconds)}</p>
                      {record.bestScore !== null && (
                        <p className="text-[10px] text-muted font-bold">
                          {t('progress.bestScore', { score: record.bestScore, total: record.scoreTotal })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="text-xs font-extrabold text-muted tracking-widest uppercase mb-2">
            {t('progress.historyTitle')}
          </p>
          {sessions.length === 0 ? (
            <p className="text-center text-muted text-[15px] font-semibold mt-10 leading-relaxed whitespace-pre-line">
              {t('progress.empty')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => (
                <div key={session.id} className="bg-surface rounded-xl px-3.5 py-3 flex justify-between items-center text-sm font-bold">
                  <span>{new Date(session.startedAt).toLocaleDateString()}</span>
                  <span className={session.gameMode === 'perfect_deck' ? 'text-accent' : 'text-muted'}>
                    {session.gameMode === 'perfect_deck' && session.score !== null
                      ? `⚡ ${session.score}/${session.totalCards}`
                      : t('progress.classicTag')}
                  </span>
                  <span className="text-muted">{formatDuration(session.totalDurationSeconds)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewire and delete**

- `page.tsx`: replace the `HistoryScreen` import with `ProgressScreen` and render `<ProgressScreen userId={user.id} onBack={() => setScreen('landing')} />` in the `'history'` branch.
- Delete `src/components/history/HistoryScreen.tsx` (fully subsumed; keeping a dead file invites drift).

Run: `npm test` → all pass. `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: progress screen with streak, records, and mode-tagged history"
```

---

### Task 14: Landing — streak flame, progress label, SR/EN toggle

**Files:**
- Modify: `src/components/landing/LandingScreen.tsx`, `src/app/page.tsx`, `src/app/page.test.tsx` (render-wrapper only, if not already done in Task 4)

**Interfaces:**
- Consumes: `useLocaleSetting` (Task 3), `calculateStreak` (Task 6), `getCompletedSessionDates` (Task 8), i18n.
- Produces: full i18n of LandingScreen (`landing.*` keys; guest button MUST resolve to "Nastavi kao gost" under sr — `page.test.tsx` asserts it); logged-in view shows 🔥 + `landing.streakDays` chip (fetched on mount via `getCompletedSessionDates` + `calculateStreak`; hidden while loading or when days = 0); history button label becomes `landing.viewProgress`; a small `SR / EN` toggle (two text buttons, active one in `text-accent`) pinned at the top-right of the landing layout calling `setLocale`.

- [ ] **Step 1: Implement**

Rewrite `LandingScreen.tsx`: replace every literal with `t('landing.*')` per the Task 3 catalogs; add:

```tsx
const { locale, setLocale } = useLocaleSetting();
const [streakDays, setStreakDays] = useState<number | null>(null);

useEffect(() => {
  if (!user) return;
  getCompletedSessionDates(user.id)
    .then((dates) => setStreakDays(calculateStreak(dates, new Date()).days))
    .catch(() => setStreakDays(null));
}, [user]);
```

Toggle (top of the outer div): `<div className="absolute top-4 right-5 flex gap-2 text-sm font-extrabold">` with two buttons `SR`/`EN`, `onClick={() => setLocale('sr' | 'en')}`, active locale `text-accent`, inactive `text-muted`. Streak chip in the logged-in block above the status line: `{streakDays !== null && streakDays > 0 && (<p className="text-accent font-extrabold">🔥 {t('landing.streakDays', { days: streakDays })}</p>)}`. Guest block unchanged apart from `t()` keys. (Outer div gains `relative` for the absolute toggle.)

- [ ] **Step 2: Verify**

Run: `npm test` → all pass (`page.test` renders via `renderWithIntl`, sr locale: "Nastavi kao gost" resolves). Visual: toggle flips the whole UI EN↔SR instantly and persists across reload; logged-in landing shows the flame after ≥1 completed workout.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/LandingScreen.tsx src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: landing streak flame, progress label, and SR/EN language toggle"
```

---

### Task 15: Final verification and push

**Files:** none (fix in place if the walkthrough finds defects, then re-run).

- [ ] **Step 1: Automated checks**

Run: `npm test` → every suite passes (Task 1's count + new: challenge 8, streak 7, records 2, useCardQuota 5, sessions +3, SetupScreen +1, SessionScreen +1). Run: `npx tsc --noEmit` → clean.

- [ ] **Step 2: Full manual walkthrough**

`npm run dev`, English default:
1. Landing EN by default; SR/EN toggle flips everything and persists on reload.
2. Guest → challenge: mode step shows both cards; pick Perfect Deck → level → exercises → length; workout shows quota countdown, volt→orange→red urgency with pulse, ✓/✗ flashes, score pill; pause freezes quota AND stopwatch; results show score, guest note; nothing hit Supabase (check Network tab: no `sessions` inserts).
3. Logged-in → classic: byte-identical flow to pre-Phase-2 (plus translations); completes and saves.
4. Logged-in → challenge: budget uses par first, then run again — budget now equals the previous best duration (par_source record); finish faster → results show NEW RECORD; Progress screen shows streak (with ❄️❄️), the record row with best score, and mode-tagged history.
5. Verify the DB (Supabase Table Editor): challenge session row has `game_mode='perfect_deck'`, `settings` with score/won; its `card_draws` rows have `beat_quota` values; classic rows have `beat_quota` null.

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** section 1 scope → Tasks 5–14 (challenge, records, streak, Progress, i18n, effects); out-of-scope modes documented in the registry comment (Task 9). Section 2 sequencing → Task 1 gate. Section 3 registry → Task 9. Section 4 mechanics → Tasks 5/10/11 (budget par-then-record, proportional quotas, use-it-or-lose-it via per-card reset, never-blocking losses, pause via timestamp shift, guest par-only — guests get `userId null` so record lookup is skipped and nothing persists). Section 5 data model → Task 2 (+ Task 7 writes). Section 6 streak rule → Task 6 (tests encode the 2-per-ISO-week freeze rule, today-doesn't-break, per-week allowances). Section 7 screens → Tasks 9/11/12/13/14 per the committed mockup. Section 8 i18n → Tasks 3/4 (English default, localStorage, catalogs, `name_en` fallback). Section 9 testing → every domain task is TDD; components with logic get tests; presentation-only summary stays manual (consistent with MVP/redesign precedent).
- **Documented simplifications (deliberate, do not "fix" silently):** (a) the beat-chip on the mode card is omitted this release — records surface on the Progress screen and results instead (chip needs a combination before one is chosen); (b) the category badge on the workout card and difficulty names on the Progress screen show Serbian DB names in both locales (full DB-content localization of those two spots would require threading Category rows; exercise names ARE localized where picked); (c) `setTimeout` for the 600ms outcome flash is visual-only and does not participate in any timing logic (invariant intact).
- **Type consistency check:** `useCardQuota(quotaSeconds, cardIndex, isPaused)` matches Task 11's call; `completeSession(sessionId, seconds, settings?)` matches Tasks 7/11; `SessionHistoryEntry.gameMode/score` match Tasks 7/13; `PersonalRecord` fields match Tasks 8/13; optional-only type extensions keep every pre-existing mock compiling.

