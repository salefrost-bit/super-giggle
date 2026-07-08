# Trening App MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working web app where a user (guest or account) selects one exercise per body-part category and a difficulty, draws cards from a shuffled deck that determine exercise + rep count, runs a timestamp-based stopwatch through the session, and (if logged in) saves the result to history.

**Architecture:** Next.js (App Router, TypeScript) frontend deployed on Vercel; Supabase (Postgres + Auth) as backend. Core domain logic (deck generation, rep calculation, timer) is written as pure, framework-independent functions with full unit test coverage, kept separate from UI and from Supabase I/O. The workout flow (setup → session → summary) is a single client-side state machine in one page — no multi-route param passing — to keep the MVP simple. Guest sessions never touch the database; only authenticated sessions persist.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), Tailwind CSS, Supabase (`@supabase/supabase-js` + `@supabase/ssr`), Vitest + Testing Library, Vercel hosting.

## Global Constraints

- Timer invariant: elapsed/remaining time is ALWAYS derived from stored timestamps (`Date.now()` diffs), NEVER accumulated via `setInterval` counters. See spec section 4.2.
- Guest sessions never write to Supabase — no `sessions`/`card_draws` rows are created unless `user_id` is a real authenticated user.
- Exercise/category/difficulty data lives in the database (`exercises`, `categories`, `difficulty_levels` tables), never hardcoded in application code.
- Deck: standard 52 cards, 4 suits, ranks 2–14 (J=11, Q=12, K=13, A=14), no jokers.
- Suit → category mapping is fixed in code: hearts→Guranje(push), clubs→Povlačenje(pull), spades→Noge(legs), diamonds→Core.
- Rep count = `round(card.rank * repMultiplier)`, minimum 1.
- Deck size options: 13, 26, or 52 cards only.
- Spec source of truth: `docs/superpowers/specs/2026-07-08-trening-app-design.md`.

## File Structure

```
package.json, tsconfig.json, tailwind.config.ts, vitest.config.ts, .env.local.example
src/
  app/
    layout.tsx
    page.tsx                     — top-level WorkoutApp state machine host
    login/page.tsx
    signup/page.tsx
  components/
    landing/LandingScreen.tsx
    setup/DifficultySelector.tsx
    setup/ExercisePicker.tsx
    setup/SessionLengthSelector.tsx
    setup/SetupScreen.tsx
    session/CardDisplay.tsx
    session/ProgressIndicator.tsx
    session/StopwatchDisplay.tsx
    session/SessionScreen.tsx
    summary/SummaryScreen.tsx
    history/HistoryScreen.tsx
    auth/LoginForm.tsx
    auth/SignupForm.tsx
  lib/
    domain/
      types.ts
      deck.ts
      deck.test.ts
      reps.ts
      reps.test.ts
      timer.ts
      timer.test.ts
    supabase/
      client.ts
      queries.ts
      sessions.ts
    auth/
      AuthContext.tsx
    gamification/
      README.md               — Phase 2 placeholder, no code
  hooks/
    useStopwatch.ts
supabase/
  migrations/
    0001_init.sql
    0002_seed.sql
  phase2_gamification.sql     — draft, NOT applied
```

---

## Phase 0: Project Scaffolding

### Task 1: Initialize Next.js project with TypeScript and Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.js`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: a running Next.js dev server at `localhost:3000` rendering a placeholder page. Later tasks replace `src/app/page.tsx` content.

- [ ] **Step 1: Scaffold the project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```
When prompted, accept defaults. This creates `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.

- [ ] **Step 2: Verify dev server runs**

Run: `npm run dev`
Expected: Server starts on `http://localhost:3000`, default Next.js welcome page loads without errors. Stop the server (Ctrl+C) after confirming.

- [ ] **Step 3: Replace placeholder home page**

Replace the contents of `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-lg">Trening App — setup in progress</p>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind project"
```

---

### Task 2: Configure Vitest for unit testing

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script and devDependencies)

**Interfaces:**
- Produces: `npm test` command that runs all `*.test.ts` files under `src/`.

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test script**

Modify `package.json` scripts section to add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Add a trivial smoke test to verify the runner works**

Create `src/lib/domain/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test`
Expected: 1 test file, 1 test passed.

- [ ] **Step 6: Delete the smoke test**

The smoke test served only to verify the runner. Delete `src/lib/domain/smoke.test.ts` — Task 6 onward adds real tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configure Vitest for unit testing"
```

---

### Task 3: Write the database schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: table definitions (`categories`, `difficulty_levels`, `exercises`, `profiles`, `sessions`, `session_exercises`, `card_draws`) and RLS policies that Task 4's seed data and all later Supabase queries (Task 11, 12) depend on.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0001_init.sql`:

```sql
create extension if not exists pgcrypto;

-- Lookup tables (data-driven, not hardcoded in app code)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null
);

create table difficulty_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_rep_multiplier numeric not null,
  sort_order int not null
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references categories(id),
  difficulty_level_id uuid not null references difficulty_levels(id),
  created_by uuid references auth.users(id)
);

-- User profile, auto-created on signup (see trigger below)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  is_public boolean not null default false
);

-- Workout sessions (only created for authenticated users; guests never write here)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_cards int not null,
  rep_multiplier numeric not null,
  game_mode text not null default 'classic',
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz not null,
  completed_at timestamptz,
  total_duration_seconds int,
  status text not null default 'in_progress'
);

create table session_exercises (
  session_id uuid not null references sessions(id) on delete cascade,
  category_id uuid not null references categories(id),
  exercise_id uuid not null references exercises(id),
  primary key (session_id, category_id)
);

create table card_draws (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  order_index int not null,
  suit text not null,
  card_value int not null,
  reps int not null,
  completed_at timestamptz not null
);

-- Auto-create a profile row when a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, is_public)
  values (new.id, split_part(new.email, '@', 1), false);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table categories enable row level security;
create policy "public read categories" on categories for select using (true);

alter table difficulty_levels enable row level security;
create policy "public read difficulty_levels" on difficulty_levels for select using (true);

alter table exercises enable row level security;
create policy "public read exercises" on exercises for select using (true);

alter table profiles enable row level security;
create policy "users read own profile" on profiles for select using (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

alter table sessions enable row level security;
create policy "users manage own sessions" on sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table session_exercises enable row level security;
create policy "users manage own session_exercises" on session_exercises for all
  using (exists (select 1 from sessions where sessions.id = session_exercises.session_id and sessions.user_id = auth.uid()))
  with check (exists (select 1 from sessions where sessions.id = session_exercises.session_id and sessions.user_id = auth.uid()));

alter table card_draws enable row level security;
create policy "users manage own card_draws" on card_draws for all
  using (exists (select 1 from sessions where sessions.id = card_draws.session_id and sessions.user_id = auth.uid()))
  with check (exists (select 1 from sessions where sessions.id = card_draws.session_id and sessions.user_id = auth.uid()));
```

- [ ] **Step 2: Apply the migration**

If using the Supabase CLI locally: `supabase db push`
If using the Supabase Dashboard: open the SQL Editor, paste the file contents, run it.
Expected: all 7 tables appear in the Supabase Table Editor with RLS enabled (shown as "RLS enabled" badge).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add initial database schema and RLS policies"
```

---

### Task 4: Seed lookup and exercise data

**Files:**
- Create: `supabase/migrations/0002_seed.sql`

**Interfaces:**
- Consumes: `categories`, `difficulty_levels`, `exercises` tables from Task 3.
- Produces: 4 categories, 3 difficulty levels, 12 exercises that Task 11's query functions read.

- [ ] **Step 1: Write the seed file**

Create `supabase/migrations/0002_seed.sql`:

```sql
insert into categories (name, sort_order) values
  ('Guranje', 1),
  ('Povlačenje', 2),
  ('Noge', 3),
  ('Core', 4);

insert into difficulty_levels (name, default_rep_multiplier, sort_order) values
  ('Početnik', 0.75, 1),
  ('Srednji', 1.0, 2),
  ('Napredni', 1.25, 3);

insert into exercises (name, category_id, difficulty_level_id)
select v.name, c.id, d.id
from (values
  ('Sklekovi na kolenima', 'Guranje', 'Početnik'),
  ('Standardni sklekovi', 'Guranje', 'Srednji'),
  ('Diamond sklekovi', 'Guranje', 'Napredni'),
  ('Veslanje peškirom', 'Povlačenje', 'Početnik'),
  ('Zgibovi (asistirani)', 'Povlačenje', 'Srednji'),
  ('Puni zgibovi', 'Povlačenje', 'Napredni'),
  ('Čučnjevi', 'Noge', 'Početnik'),
  ('Iskoraci', 'Noge', 'Srednji'),
  ('Jump squats', 'Noge', 'Napredni'),
  ('Trbušnjaci (crunches)', 'Core', 'Početnik'),
  ('Standardni trbušnjaci', 'Core', 'Srednji'),
  ('Nožne makaze', 'Core', 'Napredni')
) as v(name, category_name, difficulty_name)
join categories c on c.name = v.category_name
join difficulty_levels d on d.name = v.difficulty_name;
```

- [ ] **Step 2: Apply and verify**

Apply the same way as Task 3 (`supabase db push` or SQL Editor).
Run this verification query in the SQL Editor:
```sql
select c.name as category, d.name as difficulty, e.name as exercise
from exercises e
join categories c on c.id = e.category_id
join difficulty_levels d on d.id = e.difficulty_level_id
order by c.sort_order, d.sort_order;
```
Expected: 12 rows, 3 per category, matching the table in spec section 8.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_seed.sql
git commit -m "feat: seed categories, difficulty levels, and exercises"
```

---

### Task 5: Environment variables and Supabase project connection

**Files:**
- Create: `.env.local.example`, `.env.local` (not committed — add to `.gitignore` if not already present)

**Interfaces:**
- Produces: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars that Task 10's Supabase client reads.

- [ ] **Step 1: Create a Supabase project**

Via the Supabase Dashboard (supabase.com), create a new project. Note the Project URL and `anon public` API key from Project Settings → API.

- [ ] **Step 2: Create the example env file**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Create the real env file (not committed)**

Create `.env.local` with your actual Project URL and anon key in the same format as Step 2.

- [ ] **Step 4: Verify `.gitignore` excludes it**

Check `.gitignore` contains `.env*.local` (Next.js scaffolding adds this by default in Task 1). If missing, add it.

- [ ] **Step 5: Commit the example file only**

```bash
git add .env.local.example .gitignore
git commit -m "chore: add environment variable template for Supabase"
```

---

## Phase 1: Core Domain Logic (pure functions, fully unit-tested)

### Task 6: Define shared domain types

**Files:**
- Create: `src/lib/domain/types.ts`

**Interfaces:**
- Produces: `Suit`, `Card`, `CategoryKey`, `SUIT_TO_CATEGORY`, `CATEGORY_KEY_TO_NAME`, `Exercise`, `Category`, `DifficultyLevel`, `DeckSize`, `SessionConfig`, `CardDrawResult` — every later task (7, 8, 9, 11, 12, and all UI components) imports these types from this one file.

- [ ] **Step 1: Write the types file**

Create `src/lib/domain/types.ts`:

```typescript
export type Suit = 'hearts' | 'clubs' | 'spades' | 'diamonds';

export type CategoryKey = 'push' | 'pull' | 'legs' | 'core';

export const SUIT_TO_CATEGORY: Record<Suit, CategoryKey> = {
  hearts: 'push',
  clubs: 'pull',
  spades: 'legs',
  diamonds: 'core',
};

// Must match the `name` column seeded in supabase/migrations/0002_seed.sql exactly.
export const CATEGORY_KEY_TO_NAME: Record<CategoryKey, string> = {
  push: 'Guranje',
  pull: 'Povlačenje',
  legs: 'Noge',
  core: 'Core',
};

export interface Card {
  suit: Suit;
  rank: number; // 2-10 = face value, 11=J, 12=Q, 13=K, 14=A
}

export type DeckSize = 13 | 26 | 52;

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface DifficultyLevel {
  id: string;
  name: string;
  defaultRepMultiplier: number;
  sortOrder: number;
}

export interface Exercise {
  id: string;
  name: string;
  categoryId: string;
  difficultyLevelId: string;
}

export interface SessionConfig {
  difficultyLevelId: string;
  repMultiplier: number;
  deckSize: DeckSize;
  exerciseByCategory: Record<CategoryKey, Exercise>;
}

export interface CardDrawResult {
  orderIndex: number;
  card: Card;
  categoryKey: CategoryKey;
  exercise: Exercise;
  reps: number;
  completedAt: string | null; // ISO timestamp, set when user confirms the card is done
}

export interface SessionResult {
  totalDurationSeconds: number;
  draws: CardDrawResult[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/domain/types.ts
git commit -m "feat: add shared domain types"
```

---

### Task 7: Deck generation and shuffle logic

**Files:**
- Create: `src/lib/domain/deck.ts`
- Test: `src/lib/domain/deck.test.ts`

**Interfaces:**
- Consumes: `Card`, `Suit`, `DeckSize` from `src/lib/domain/types.ts` (Task 6).
- Produces: `createFullDeck(): Card[]`, `shuffleDeck(deck: Card[], rng?: () => number): Card[]`, `drawSessionCards(deckSize: DeckSize, rng?: () => number): Card[]` — Task 19 (setup orchestration) calls `drawSessionCards`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/domain/deck.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createFullDeck, shuffleDeck, drawSessionCards } from './deck';

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe('createFullDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createFullDeck();
    expect(deck).toHaveLength(52);
    const unique = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    expect(unique.size).toBe(52);
  });

  it('has 13 cards per suit with ranks 2-14', () => {
    const deck = createFullDeck();
    const hearts = deck.filter((c) => c.suit === 'hearts');
    expect(hearts).toHaveLength(13);
    expect(hearts.map((c) => c.rank).sort((a, b) => a - b)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
  });
});

describe('shuffleDeck', () => {
  it('returns the same cards in a different order', () => {
    const deck = createFullDeck();
    const shuffled = shuffleDeck(deck, seededRng(42));
    expect(shuffled).toHaveLength(52);
    expect(shuffled).not.toEqual(deck);
    const originalSet = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    const shuffledSet = new Set(shuffled.map((c) => `${c.suit}-${c.rank}`));
    expect(shuffledSet).toEqual(originalSet);
  });

  it('does not mutate the input array', () => {
    const deck = createFullDeck();
    const copy = [...deck];
    shuffleDeck(deck, seededRng(1));
    expect(deck).toEqual(copy);
  });
});

describe('drawSessionCards', () => {
  it('returns exactly deckSize cards for each valid size', () => {
    expect(drawSessionCards(13, seededRng(1))).toHaveLength(13);
    expect(drawSessionCards(26, seededRng(1))).toHaveLength(26);
    expect(drawSessionCards(52, seededRng(1))).toHaveLength(52);
  });

  it('returns cards with no duplicates', () => {
    const cards = drawSessionCards(52, seededRng(7));
    const unique = new Set(cards.map((c) => `${c.suit}-${c.rank}`));
    expect(unique.size).toBe(52);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- deck`
Expected: FAIL — `Cannot find module './deck'`.

- [ ] **Step 3: Implement the deck module**

Create `src/lib/domain/deck.ts`:

```typescript
import type { Card, DeckSize, Suit } from './types';

const SUITS: Suit[] = ['hearts', 'clubs', 'spades', 'diamonds'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawSessionCards(deckSize: DeckSize, rng: () => number = Math.random): Card[] {
  const shuffled = shuffleDeck(createFullDeck(), rng);
  return shuffled.slice(0, deckSize);
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- deck`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/deck.ts src/lib/domain/deck.test.ts
git commit -m "feat: add deck generation and shuffle logic"
```

---

### Task 8: Rep calculation logic

**Files:**
- Create: `src/lib/domain/reps.ts`
- Test: `src/lib/domain/reps.test.ts`

**Interfaces:**
- Consumes: `Card` from `src/lib/domain/types.ts` (Task 6).
- Produces: `calculateReps(card: Card, repMultiplier: number): number` — used by Task 19 (setup orchestration, to precompute `CardDrawResult.reps`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/domain/reps.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateReps } from './reps';

describe('calculateReps', () => {
  it('applies the multiplier and rounds to the nearest integer', () => {
    expect(calculateReps({ suit: 'hearts', rank: 10 }, 1)).toBe(10);
    expect(calculateReps({ suit: 'hearts', rank: 10 }, 0.75)).toBe(8);
    expect(calculateReps({ suit: 'hearts', rank: 14 }, 1.25)).toBe(18);
  });

  it('never returns less than 1', () => {
    expect(calculateReps({ suit: 'hearts', rank: 2 }, 0.1)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- reps`
Expected: FAIL — `Cannot find module './reps'`.

- [ ] **Step 3: Implement the rep calculation module**

Create `src/lib/domain/reps.ts`:

```typescript
import type { Card } from './types';

export function calculateReps(card: Card, repMultiplier: number): number {
  const raw = card.rank * repMultiplier;
  return Math.max(1, Math.round(raw));
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- reps`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/reps.ts src/lib/domain/reps.test.ts
git commit -m "feat: add rep calculation logic"
```

---

### Task 9: Timestamp-based timer logic

**Files:**
- Create: `src/lib/domain/timer.ts`
- Test: `src/lib/domain/timer.test.ts`

**Interfaces:**
- Produces: `TimerState`, `startTimer(now?)`, `pauseTimer(state, now?)`, `resumeTimer(state, now?)`, `getElapsedSeconds(state, now?)` — Task 21 (`useStopwatch` hook) wraps these.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/domain/timer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { startTimer, pauseTimer, resumeTimer, getElapsedSeconds } from './timer';

describe('timer', () => {
  it('computes elapsed seconds from the start timestamp', () => {
    const state = startTimer(1000);
    expect(getElapsedSeconds(state, 1000)).toBe(0);
    expect(getElapsedSeconds(state, 5000)).toBe(4);
  });

  it('freezes elapsed time while paused', () => {
    let state = startTimer(0);
    state = pauseTimer(state, 3000);
    expect(getElapsedSeconds(state, 3000)).toBe(3);
    expect(getElapsedSeconds(state, 10000)).toBe(3);
  });

  it('resumes without losing or gaining time', () => {
    let state = startTimer(0);
    state = pauseTimer(state, 3000);
    state = resumeTimer(state, 8000);
    expect(getElapsedSeconds(state, 8000)).toBe(3);
    expect(getElapsedSeconds(state, 10000)).toBe(5);
  });

  it('treats pausing an already-paused timer as a no-op', () => {
    let state = startTimer(0);
    state = pauseTimer(state, 3000);
    const state2 = pauseTimer(state, 5000);
    expect(state2).toEqual(state);
  });

  it('treats resuming an already-running timer as a no-op', () => {
    const state = startTimer(0);
    const state2 = resumeTimer(state, 5000);
    expect(state2).toEqual(state);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- timer`
Expected: FAIL — `Cannot find module './timer'`.

- [ ] **Step 3: Implement the timer module**

Create `src/lib/domain/timer.ts`:

```typescript
export interface TimerState {
  startedAt: number; // epoch ms
  pausedAt: number | null; // epoch ms; null while running
}

export function startTimer(now: number = Date.now()): TimerState {
  return { startedAt: now, pausedAt: null };
}

export function pauseTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (state.pausedAt !== null) return state;
  return { ...state, pausedAt: now };
}

export function resumeTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (state.pausedAt === null) return state;
  const pauseDuration = now - state.pausedAt;
  return { startedAt: state.startedAt + pauseDuration, pausedAt: null };
}

export function getElapsedSeconds(state: TimerState, now: number = Date.now()): number {
  const effectiveNow = state.pausedAt ?? now;
  return Math.floor((effectiveNow - state.startedAt) / 1000);
}
```

Note: this satisfies the Global Constraints timer invariant — elapsed time is always `effectiveNow - startedAt`, never an accumulated counter.

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- timer`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/timer.ts src/lib/domain/timer.test.ts
git commit -m "feat: add timestamp-based timer logic"
```

---

## Phase 2: Data Layer (Supabase client and queries)

### Task 10: Supabase browser client

**Files:**
- Create: `src/lib/supabase/client.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars (Task 5).
- Produces: `createClient(): SupabaseClient` — used by Task 11 (queries), Task 12 (sessions), and `AuthContext` (Task 13).

- [ ] **Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Write the client factory**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/client.ts package.json package-lock.json
git commit -m "feat: add Supabase browser client factory"
```

---

### Task 11: Lookup queries (categories, difficulty levels, exercises)

**Files:**
- Create: `src/lib/supabase/queries.ts`
- Test: `src/lib/supabase/queries.test.ts`

**Interfaces:**
- Consumes: `createClient` from Task 10; `Category`, `DifficultyLevel`, `Exercise`, `CategoryKey`, `CATEGORY_KEY_TO_NAME` from `src/lib/domain/types.ts` (Task 6).
- Produces: `fetchCategories()`, `fetchDifficultyLevels()`, `fetchExercisesByDifficulty(difficultyLevelId)`, `buildCategoryIdByKey(categories)`, `categoryKeyForName(name)` — Task 18 (ExercisePicker) and Task 20 (SetupScreen) depend on these.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/supabase/queries.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import {
  fetchCategories,
  fetchDifficultyLevels,
  fetchExercisesByDifficulty,
  buildCategoryIdByKey,
} from './queries';
import type { Category } from '../domain/types';

vi.mock('./client', () => ({ createClient: vi.fn() }));
import { createClient } from './client';

function mockSupabaseChain(resolvedValue: { data: unknown; error: null }) {
  const order = vi.fn().mockResolvedValue(resolvedValue);
  const eq = vi.fn().mockResolvedValue(resolvedValue);
  const select = vi.fn(() => ({ order, eq }));
  const from = vi.fn(() => ({ select }));
  return { from };
}

describe('fetchCategories', () => {
  it('maps snake_case rows to domain Category objects', async () => {
    const chain = mockSupabaseChain({
      data: [{ id: '1', name: 'Guranje', sort_order: 1 }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as never);

    const result = await fetchCategories();

    expect(result).toEqual([{ id: '1', name: 'Guranje', sortOrder: 1 }]);
  });
});

describe('fetchDifficultyLevels', () => {
  it('maps snake_case rows to domain DifficultyLevel objects', async () => {
    const chain = mockSupabaseChain({
      data: [{ id: '1', name: 'Početnik', default_rep_multiplier: 0.75, sort_order: 1 }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as never);

    const result = await fetchDifficultyLevels();

    expect(result).toEqual([{ id: '1', name: 'Početnik', defaultRepMultiplier: 0.75, sortOrder: 1 }]);
  });
});

describe('fetchExercisesByDifficulty', () => {
  it('maps snake_case rows to domain Exercise objects', async () => {
    const chain = mockSupabaseChain({
      data: [{ id: '1', name: 'Čučnjevi', category_id: 'c1', difficulty_level_id: 'd1' }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as never);

    const result = await fetchExercisesByDifficulty('d1');

    expect(result).toEqual([{ id: '1', name: 'Čučnjevi', categoryId: 'c1', difficultyLevelId: 'd1' }]);
  });
});

describe('buildCategoryIdByKey', () => {
  it('maps each CategoryKey to its database id by matching name', () => {
    const categories: Category[] = [
      { id: 'p1', name: 'Guranje', sortOrder: 1 },
      { id: 'p2', name: 'Povlačenje', sortOrder: 2 },
      { id: 'p3', name: 'Noge', sortOrder: 3 },
      { id: 'p4', name: 'Core', sortOrder: 4 },
    ];
    expect(buildCategoryIdByKey(categories)).toEqual({
      push: 'p1',
      pull: 'p2',
      legs: 'p3',
      core: 'p4',
    });
  });

  it('throws if a required category name is missing', () => {
    expect(() => buildCategoryIdByKey([])).toThrow(/Guranje/);
  });
});

describe('categoryKeyForName', () => {
  it('returns the CategoryKey matching a known database category name', () => {
    expect(categoryKeyForName('Guranje')).toBe('push');
    expect(categoryKeyForName('Povlačenje')).toBe('pull');
    expect(categoryKeyForName('Noge')).toBe('legs');
    expect(categoryKeyForName('Core')).toBe('core');
  });

  it('throws for an unknown category name', () => {
    expect(() => categoryKeyForName('Nepoznato')).toThrow(/Nepoznato/);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- queries`
Expected: FAIL — `Cannot find module './queries'`.

- [ ] **Step 3: Implement the queries module**

Create `src/lib/supabase/queries.ts`:

```typescript
import { createClient } from './client';
import type { Category, DifficultyLevel, Exercise, CategoryKey } from '../domain/types';
import { CATEGORY_KEY_TO_NAME } from '../domain/types';

export async function fetchCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .order('sort_order');
  if (error) throw error;
  return (data as Array<{ id: string; name: string; sort_order: number }>).map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  }));
}

export async function fetchDifficultyLevels(): Promise<DifficultyLevel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('difficulty_levels')
    .select('id, name, default_rep_multiplier, sort_order')
    .order('sort_order');
  if (error) throw error;
  return (
    data as Array<{ id: string; name: string; default_rep_multiplier: number; sort_order: number }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    defaultRepMultiplier: row.default_rep_multiplier,
    sortOrder: row.sort_order,
  }));
}

export async function fetchExercisesByDifficulty(difficultyLevelId: string): Promise<Exercise[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, category_id, difficulty_level_id')
    .eq('difficulty_level_id', difficultyLevelId);
  if (error) throw error;
  return (
    data as Array<{ id: string; name: string; category_id: string; difficulty_level_id: string }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    difficultyLevelId: row.difficulty_level_id,
  }));
}

export function buildCategoryIdByKey(categories: Category[]): Record<CategoryKey, string> {
  const byName = new Map(categories.map((c) => [c.name, c.id]));
  const result = {} as Record<CategoryKey, string>;
  (Object.keys(CATEGORY_KEY_TO_NAME) as CategoryKey[]).forEach((key) => {
    const name = CATEGORY_KEY_TO_NAME[key];
    const id = byName.get(name);
    if (!id) {
      throw new Error(
        `Category "${name}" not found in database — check seed data matches CATEGORY_KEY_TO_NAME`
      );
    }
    result[key] = id;
  });
  return result;
}

export function categoryKeyForName(name: string): CategoryKey {
  const entry = (Object.entries(CATEGORY_KEY_TO_NAME) as [CategoryKey, string][]).find(
    ([, categoryName]) => categoryName === name
  );
  if (!entry) throw new Error(`Unknown category name "${name}" — check CATEGORY_KEY_TO_NAME`);
  return entry[0];
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- queries`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/queries.ts src/lib/supabase/queries.test.ts
git commit -m "feat: add Supabase lookup queries for categories, difficulty levels, exercises"
```

---

### Task 12: Session persistence (create, record draws, complete, history)

**Files:**
- Create: `src/lib/supabase/sessions.ts`
- Test: `src/lib/supabase/sessions.test.ts`

**Interfaces:**
- Consumes: `createClient` from Task 10; `SessionConfig`, `CategoryKey`, `CardDrawResult` from Task 6.
- Produces: `createSession(params)`, `recordCardDraw(sessionId, draw)`, `completeSession(sessionId, totalDurationSeconds)`, `getUserSessions(userId)` — Task 23 (session screen) and Task 25 (history screen) depend on these.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/supabase/sessions.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createSession, recordCardDraw, completeSession, getUserSessions } from './sessions';
import type { SessionConfig } from '../domain/types';

vi.mock('./client', () => ({ createClient: vi.fn() }));
import { createClient } from './client';

describe('createSession', () => {
  it('inserts a session row then one session_exercises row per category', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'session-1' }, error: null });
    const selectAfterInsert = vi.fn(() => ({ single }));
    const sessionsInsert = vi.fn(() => ({ select: selectAfterInsert }));
    const sessionExercisesInsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === 'sessions') return { insert: sessionsInsert };
      if (table === 'session_exercises') return { insert: sessionExercisesInsert };
      throw new Error(`unexpected table ${table}`);
    });
    vi.mocked(createClient).mockReturnValue({ from } as never);

    const config: SessionConfig = {
      difficultyLevelId: 'd1',
      repMultiplier: 1,
      deckSize: 13,
      exerciseByCategory: {
        push: { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' },
        pull: { id: 'e2', name: 'Zgibovi', categoryId: 'c2', difficultyLevelId: 'd1' },
        legs: { id: 'e3', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1' },
        core: { id: 'e4', name: 'Trbušnjaci', categoryId: 'c4', difficultyLevelId: 'd1' },
      },
    };

    const sessionId = await createSession({
      userId: 'user-1',
      config,
      categoryIdByKey: { push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' },
      startedAtIso: '2026-07-08T10:00:00.000Z',
    });

    expect(sessionId).toBe('session-1');
    expect(sessionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', total_cards: 13, rep_multiplier: 1 })
    );
    expect(sessionExercisesInsert).toHaveBeenCalledWith([
      { session_id: 'session-1', category_id: 'c1', exercise_id: 'e1' },
      { session_id: 'session-1', category_id: 'c2', exercise_id: 'e2' },
      { session_id: 'session-1', category_id: 'c3', exercise_id: 'e3' },
      { session_id: 'session-1', category_id: 'c4', exercise_id: 'e4' },
    ]);
  });
});

describe('recordCardDraw', () => {
  it('inserts a card_draws row with mapped field names', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await recordCardDraw('session-1', {
      orderIndex: 0,
      card: { suit: 'hearts', rank: 10 },
      categoryKey: 'push',
      exercise: { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' },
      reps: 10,
      completedAt: '2026-07-08T10:00:05.000Z',
    });

    expect(insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      order_index: 0,
      suit: 'hearts',
      card_value: 10,
      reps: 10,
      completed_at: '2026-07-08T10:00:05.000Z',
    });
  });
});

describe('completeSession', () => {
  it('updates status, completed_at, and total_duration_seconds', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await completeSession('session-1', 180);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', total_duration_seconds: 180 })
    );
    expect(eq).toHaveBeenCalledWith('id', 'session-1');
  });
});

describe('getUserSessions', () => {
  it('maps snake_case rows to SessionHistoryEntry objects, newest first', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 's1',
          started_at: '2026-07-08T10:00:00.000Z',
          total_duration_seconds: 180,
          total_cards: 13,
          status: 'completed',
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    const result = await getUserSessions('user-1');

    expect(result).toEqual([
      {
        id: 's1',
        startedAt: '2026-07-08T10:00:00.000Z',
        totalDurationSeconds: 180,
        totalCards: 13,
        status: 'completed',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- sessions`
Expected: FAIL — `Cannot find module './sessions'`.

- [ ] **Step 3: Implement the sessions module**

Create `src/lib/supabase/sessions.ts`:

```typescript
import { createClient } from './client';
import type { CategoryKey, SessionConfig, CardDrawResult } from '../domain/types';

export interface CreateSessionParams {
  userId: string;
  config: SessionConfig;
  categoryIdByKey: Record<CategoryKey, string>;
  startedAtIso: string;
}

export async function createSession(params: CreateSessionParams): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: params.userId,
      total_cards: params.config.deckSize,
      rep_multiplier: params.config.repMultiplier,
      started_at: params.startedAtIso,
      status: 'in_progress',
    })
    .select('id')
    .single();
  if (error) throw error;
  const sessionId = (data as { id: string }).id;

  const categoryKeys = Object.keys(params.config.exerciseByCategory) as CategoryKey[];
  const sessionExerciseRows = categoryKeys.map((key) => ({
    session_id: sessionId,
    category_id: params.categoryIdByKey[key],
    exercise_id: params.config.exerciseByCategory[key].id,
  }));
  const { error: exercisesError } = await supabase
    .from('session_exercises')
    .insert(sessionExerciseRows);
  if (exercisesError) throw exercisesError;

  return sessionId;
}

export async function recordCardDraw(sessionId: string, draw: CardDrawResult): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('card_draws').insert({
    session_id: sessionId,
    order_index: draw.orderIndex,
    suit: draw.card.suit,
    card_value: draw.card.rank,
    reps: draw.reps,
    completed_at: draw.completedAt,
  });
  if (error) throw error;
}

export async function completeSession(
  sessionId: string,
  totalDurationSeconds: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_duration_seconds: totalDurationSeconds,
    })
    .eq('id', sessionId);
  if (error) throw error;
}

export interface SessionHistoryEntry {
  id: string;
  startedAt: string;
  totalDurationSeconds: number | null;
  totalCards: number;
  status: string;
}

export async function getUserSessions(userId: string): Promise<SessionHistoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, started_at, total_duration_seconds, total_cards, status')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (
    data as Array<{
      id: string;
      started_at: string;
      total_duration_seconds: number | null;
      total_cards: number;
      status: string;
    }>
  ).map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    totalDurationSeconds: row.total_duration_seconds,
    totalCards: row.total_cards,
    status: row.status,
  }));
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- sessions`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/sessions.ts src/lib/supabase/sessions.test.ts
git commit -m "feat: add session persistence functions"
```

---

### Task 13: Auth context (session state, sign up, sign in, sign out)

**Files:**
- Create: `src/lib/auth/AuthContext.tsx`
- Modify: `src/app/layout.tsx` (wrap children in `AuthProvider`)

**Interfaces:**
- Consumes: `createClient` from Task 10.
- Produces: `AuthProvider` component, `useAuth(): { user, isLoading, signUp, signIn, signOut }` — Task 14/15 (login/signup forms) and Task 26 (top-level app) depend on `useAuth`.

- [ ] **Step 1: Write the auth context**

Create `src/lib/auth/AuthContext.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }

  async function signIn(email: string, password: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Wrap the app in `AuthProvider`**

Modify `src/app/layout.tsx` so the body wraps `{children}` in `<AuthProvider>`:

```tsx
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trening App',
  description: 'Trening bez opreme, zasnovan na igranju karata',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify it compiles and runs**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run dev`, open `http://localhost:3000`
Expected: page loads without console errors (auth state resolves to `null` since no one is logged in yet).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/AuthContext.tsx src/app/layout.tsx
git commit -m "feat: add auth context wrapping Supabase session state"
```

---

## Phase 3: Auth UI

### Task 14: Login page

**Files:**
- Create: `src/components/auth/LoginForm.tsx`, `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `useAuth()` from Task 13.
- Produces: a route at `/login` that authenticates a user and redirects to `/`.

- [ ] **Step 1: Write the login form component**

Create `src/components/auth/LoginForm.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    router.push('/');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold">Prijava</h1>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        type="password"
        required
        placeholder="Lozinka"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border rounded px-3 py-2"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Prijavljivanje...' : 'Prijavi se'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the route**

Create `src/app/login/page.tsx`:

```tsx
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/login`.
Expected: form renders; submitting with a non-existent account shows the Supabase error message inline; submitting valid credentials (create one via Supabase Dashboard → Authentication if needed) redirects to `/`.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/LoginForm.tsx src/app/login/page.tsx
git commit -m "feat: add login page"
```

---

### Task 15: Signup page

**Files:**
- Create: `src/components/auth/SignupForm.tsx`, `src/app/signup/page.tsx`

**Interfaces:**
- Consumes: `useAuth()` from Task 13.
- Produces: a route at `/signup` that creates a Supabase Auth user (profile row auto-created by the Task 3 trigger).

- [ ] **Step 1: Write the signup form component**

Create `src/components/auth/SignupForm.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export function SignupForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const { error: signUpError } = await signUp(email, password);
    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto p-6">
        <p>Registracija uspešna! Proveri email da potvrdiš nalog pre prijave.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold">Registracija</h1>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder="Lozinka (min. 6 karaktera)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border rounded px-3 py-2"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Kreiranje naloga...' : 'Registruj se'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the route**

Create `src/app/signup/page.tsx`:

```tsx
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return <SignupForm />;
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/signup`, submit a new email/password.
Expected: success message appears; a new row exists in Supabase Dashboard → Table Editor → `profiles` with matching `id` (verify in Authentication → Users, then Table Editor).

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/SignupForm.tsx src/app/signup/page.tsx
git commit -m "feat: add signup page"
```

---

## Phase 4: Setup Flow UI

### Task 16: Component testing setup (Testing Library + jsdom)

**Files:**
- Modify: `vitest.config.ts`, `package.json`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: a jsdom test environment with `@testing-library/jest-dom` matchers available, used starting Task 18.

- [ ] **Step 1: Install packages**

Run:
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create the test setup file**

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Update Vitest config to use jsdom and load the setup file**

Modify `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

- [ ] **Step 4: Run the full test suite, verify all existing tests still pass**

Run: `npm test`
Expected: all previously-passing tests (deck, reps, timer, queries, sessions — 18 tests total) still PASS under the jsdom environment.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json package-lock.json
git commit -m "chore: add Testing Library and jsdom for component tests"
```

---

### Task 17: Difficulty selector

**Files:**
- Create: `src/components/setup/DifficultySelector.tsx`

**Interfaces:**
- Consumes: `fetchDifficultyLevels` (Task 11), `DifficultyLevel` (Task 6).
- Produces: `DifficultySelector` component with prop `onSelect: (level: DifficultyLevel) => void` — used by Task 20 (SetupScreen).

This component is presentation-only (fetch, sort by `sort_order` already handled by the query, render, click) with no branching logic of its own, so it's verified manually rather than with an automated test — the sorting/filtering behavior it displays is already covered by Task 11's tests.

- [ ] **Step 1: Write the component**

Create `src/components/setup/DifficultySelector.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchDifficultyLevels } from '@/lib/supabase/queries';
import type { DifficultyLevel } from '@/lib/domain/types';

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

  if (isLoading) return <p>Učitavanje nivoa...</p>;
  if (error) return <p className="text-red-600">Greška: {error}</p>;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Izaberi nivo težine</h2>
      {levels.map((level) => (
        <button
          key={level.id}
          onClick={() => onSelect(level)}
          className="border rounded px-4 py-3 text-left hover:bg-gray-100"
        >
          {level.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Requires Task 20 (SetupScreen) to render it in context — defer full interaction check to Task 20's verification step. For now, verify it compiles:
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/DifficultySelector.tsx
git commit -m "feat: add difficulty selector component"
```

---

### Task 18: Exercise picker (one exercise per category)

**Files:**
- Create: `src/components/setup/ExercisePicker.tsx`
- Test: `src/components/setup/ExercisePicker.test.tsx`

**Interfaces:**
- Consumes: `Category`, `Exercise`, `CategoryKey` (Task 6), `categoryKeyForName` (Task 11).
- Produces: `ExercisePicker` component with props `{ categories: Category[]; exercises: Exercise[]; onComplete: (selection: Record<CategoryKey, Exercise>) => void }` — used by Task 20 (SetupScreen). Calls `onComplete` only once one exercise is selected per category.

- [ ] **Step 1: Write the failing test**

Create `src/components/setup/ExercisePicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExercisePicker } from './ExercisePicker';
import type { Category, Exercise } from '@/lib/domain/types';

const categories: Category[] = [
  { id: 'c1', name: 'Guranje', sortOrder: 1 },
  { id: 'c2', name: 'Povlačenje', sortOrder: 2 },
  { id: 'c3', name: 'Noge', sortOrder: 3 },
  { id: 'c4', name: 'Core', sortOrder: 4 },
];

const exercises: Exercise[] = [
  { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' },
  { id: 'e2', name: 'Zgibovi', categoryId: 'c2', difficultyLevelId: 'd1' },
  { id: 'e3', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1' },
  { id: 'e4', name: 'Trbušnjaci', categoryId: 'c4', difficultyLevelId: 'd1' },
];

describe('ExercisePicker', () => {
  it('does not call onComplete until all four categories have a selection', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<ExercisePicker categories={categories} exercises={exercises} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: 'Sklekovi' }));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Zgibovi' }));
    await user.click(screen.getByRole('button', { name: 'Čučnjevi' }));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Trbušnjaci' }));
    expect(onComplete).toHaveBeenCalledWith({
      push: exercises[0],
      pull: exercises[1],
      legs: exercises[2],
      core: exercises[3],
    });
  });

  it('replaces the selection when a different exercise in the same category is clicked', async () => {
    const moreExercises: Exercise[] = [
      ...exercises,
      { id: 'e1b', name: 'Diamond sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' },
    ];
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(
      <ExercisePicker categories={categories} exercises={moreExercises} onComplete={onComplete} />
    );

    await user.click(screen.getByRole('button', { name: 'Sklekovi' }));
    await user.click(screen.getByRole('button', { name: 'Diamond sklekovi' }));
    await user.click(screen.getByRole('button', { name: 'Zgibovi' }));
    await user.click(screen.getByRole('button', { name: 'Čučnjevi' }));
    await user.click(screen.getByRole('button', { name: 'Trbušnjaci' }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ push: moreExercises[4] })
    );
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- ExercisePicker`
Expected: FAIL — `Cannot find module './ExercisePicker'`.

- [ ] **Step 3: Implement the component**

Create `src/components/setup/ExercisePicker.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { categoryKeyForName } from '@/lib/supabase/queries';
import type { Category, CategoryKey, Exercise } from '@/lib/domain/types';

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
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Izaberi vežbu za svaku kategoriju</h2>
      {sortedCategories.map((category) => {
        const categoryKey = categoryKeyForName(category.name);
        const categoryExercises = exercises.filter((e) => e.categoryId === category.id);
        const selected = selection[categoryKey];
        return (
          <div key={category.id}>
            <h3 className="font-medium mb-2">{category.name}</h3>
            <div className="flex flex-wrap gap-2">
              {categoryExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleSelect(categoryKey, exercise)}
                  className={`border rounded px-3 py-2 ${
                    selected?.id === exercise.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {exercise.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- ExercisePicker`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/setup/ExercisePicker.tsx src/components/setup/ExercisePicker.test.tsx
git commit -m "feat: add exercise picker component"
```

---

### Task 19: Session length selector

**Files:**
- Create: `src/components/setup/SessionLengthSelector.tsx`

**Interfaces:**
- Consumes: `DeckSize` (Task 6).
- Produces: `SessionLengthSelector` component with prop `onSelect: (size: DeckSize) => void` — used by Task 20 (SetupScreen).

- [ ] **Step 1: Write the component**

Create `src/components/setup/SessionLengthSelector.tsx`:

```tsx
'use client';

import type { DeckSize } from '@/lib/domain/types';

interface SessionLengthSelectorProps {
  onSelect: (size: DeckSize) => void;
}

const OPTIONS: { size: DeckSize; label: string }[] = [
  { size: 13, label: 'Četvrtina špila (13 karata)' },
  { size: 26, label: 'Pola špila (26 karata)' },
  { size: 52, label: 'Ceo špil (52 karte)' },
];

export function SessionLengthSelector({ onSelect }: SessionLengthSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Izaberi dužinu treninga</h2>
      {OPTIONS.map((option) => (
        <button
          key={option.size}
          onClick={() => onSelect(option.size)}
          className="border rounded px-4 py-3 text-left hover:bg-gray-100"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/SessionLengthSelector.tsx
git commit -m "feat: add session length selector component"
```

---

### Task 20: Setup screen orchestration

**Files:**
- Create: `src/components/setup/SetupScreen.tsx`
- Test: `src/components/setup/SetupScreen.test.tsx`

**Interfaces:**
- Consumes: `DifficultySelector` (Task 17), `ExercisePicker` (Task 18), `SessionLengthSelector` (Task 19), `fetchCategories`, `fetchExercisesByDifficulty` (Task 11), `drawSessionCards` (Task 7), `calculateReps` (Task 8), `SUIT_TO_CATEGORY` (Task 6).
- Produces: `SetupScreen` component with prop `onStart: (config: SessionConfig, draws: CardDrawResult[]) => void` — used by Task 26 (top-level app).

- [ ] **Step 1: Write the failing test**

Create `src/components/setup/SetupScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupScreen } from './SetupScreen';
import type { Category, DifficultyLevel, Exercise } from '@/lib/domain/types';

vi.mock('@/lib/supabase/queries', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/queries')>(
    '@/lib/supabase/queries'
  );
  return {
    ...actual,
    fetchDifficultyLevels: vi.fn(),
    fetchCategories: vi.fn(),
    fetchExercisesByDifficulty: vi.fn(),
  };
});

import { fetchDifficultyLevels, fetchCategories, fetchExercisesByDifficulty } from '@/lib/supabase/queries';

const categories: Category[] = [
  { id: 'c1', name: 'Guranje', sortOrder: 1 },
  { id: 'c2', name: 'Povlačenje', sortOrder: 2 },
  { id: 'c3', name: 'Noge', sortOrder: 3 },
  { id: 'c4', name: 'Core', sortOrder: 4 },
];

const difficultyLevels: DifficultyLevel[] = [
  { id: 'd1', name: 'Srednji', defaultRepMultiplier: 1, sortOrder: 2 },
];

const exercises: Exercise[] = [
  { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' },
  { id: 'e2', name: 'Zgibovi', categoryId: 'c2', difficultyLevelId: 'd1' },
  { id: 'e3', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1' },
  { id: 'e4', name: 'Trbušnjaci', categoryId: 'c4', difficultyLevelId: 'd1' },
];

describe('SetupScreen', () => {
  it('walks through difficulty, exercise, and length steps then calls onStart with a full deck', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(fetchDifficultyLevels).mockResolvedValue(difficultyLevels);
    vi.mocked(fetchExercisesByDifficulty).mockResolvedValue(exercises);
    const onStart = vi.fn();
    const user = userEvent.setup();

    render(<SetupScreen onStart={onStart} />);

    await user.click(await screen.findByRole('button', { name: 'Srednji' }));
    await user.click(await screen.findByRole('button', { name: 'Sklekovi' }));
    await user.click(screen.getByRole('button', { name: 'Zgibovi' }));
    await user.click(screen.getByRole('button', { name: 'Čučnjevi' }));
    await user.click(screen.getByRole('button', { name: 'Trbušnjaci' }));
    await user.click(await screen.findByRole('button', { name: 'Ceo špil (52 karte)' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    const [config, draws] = onStart.mock.calls[0];
    expect(config.deckSize).toBe(52);
    expect(config.repMultiplier).toBe(1);
    expect(draws).toHaveLength(52);
    expect(draws.every((d: { reps: number }) => d.reps >= 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- SetupScreen`
Expected: FAIL — `Cannot find module './SetupScreen'`.

- [ ] **Step 3: Implement the component**

Create `src/components/setup/SetupScreen.tsx`:

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

interface SetupScreenProps {
  onStart: (config: SessionConfig, draws: CardDrawResult[]) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
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

  if (step === 'difficulty') {
    return <DifficultySelector onSelect={handleDifficultySelect} />;
  }
  if (step === 'exercises') {
    return (
      <ExercisePicker
        categories={categories}
        exercises={exercises}
        onComplete={handleExercisesComplete}
      />
    );
  }
  return <SessionLengthSelector onSelect={handleLengthSelect} />;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- SetupScreen`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/setup/SetupScreen.tsx src/components/setup/SetupScreen.test.tsx
git commit -m "feat: add setup screen orchestration"
```

---

## Phase 5: Session Runtime UI

### Task 21: Stopwatch hook (React wrapper over the timer module)

**Files:**
- Create: `src/hooks/useStopwatch.ts`
- Test: `src/hooks/useStopwatch.test.ts`

**Interfaces:**
- Consumes: `startTimer`, `pauseTimer`, `resumeTimer`, `getElapsedSeconds` (Task 9).
- Produces: `useStopwatch(): { elapsedSeconds: number; isPaused: boolean; pause: () => void; resume: () => void }` — used by Task 23 (SessionScreen).

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useStopwatch.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach, act } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStopwatch } from './useStopwatch';

describe('useStopwatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('increases elapsedSeconds as time passes', () => {
    const { result } = renderHook(() => useStopwatch());
    expect(result.current.elapsedSeconds).toBe(0);

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:05.000Z'));
      vi.advanceTimersByTime(250);
    });

    expect(result.current.elapsedSeconds).toBe(5);
  });

  it('stops increasing while paused', () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:03.000Z'));
      result.current.pause();
    });
    expect(result.current.elapsedSeconds).toBe(3);

    act(() => {
      vi.setSystemTime(new Date('2026-07-08T10:00:20.000Z'));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.elapsedSeconds).toBe(3);
  });

  it('resumes counting from where it paused, without adding the pause duration', () => {
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
      vi.setSystemTime(new Date('2026-07-08T10:00:22.000Z'));
      vi.advanceTimersByTime(250);
    });

    expect(result.current.elapsedSeconds).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- useStopwatch`
Expected: FAIL — `Cannot find module './useStopwatch'`.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useStopwatch.ts`:

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

export function useStopwatch() {
  const [state, setState] = useState<TimerState>(() => startTimer());
  const [isPaused, setIsPaused] = useState(false);
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(forceRerender, 250);
    return () => clearInterval(interval);
  }, [isPaused]);

  const pause = useCallback(() => {
    setState((s) => pauseTimer(s));
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setState((s) => resumeTimer(s));
    setIsPaused(false);
  }, []);

  return {
    elapsedSeconds: getElapsedSeconds(state),
    isPaused,
    pause,
    resume,
  };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- useStopwatch`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStopwatch.ts src/hooks/useStopwatch.test.ts
git commit -m "feat: add stopwatch hook wrapping timestamp-based timer"
```

---

### Task 22: Card display, progress indicator, stopwatch display

**Files:**
- Create: `src/components/session/CardDisplay.tsx`, `src/components/session/ProgressIndicator.tsx`, `src/components/session/StopwatchDisplay.tsx`

**Interfaces:**
- Produces: three presentational components used by Task 23 (SessionScreen). No business logic — manual verification only.

- [ ] **Step 1: Write CardDisplay**

Create `src/components/session/CardDisplay.tsx`:

```tsx
interface CardDisplayProps {
  exerciseName: string;
  reps: number;
}

export function CardDisplay({ exerciseName, reps }: CardDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center border rounded-lg p-10 gap-2">
      <p className="text-lg uppercase tracking-wide text-gray-500">{exerciseName}</p>
      <p className="text-6xl font-bold">{reps}</p>
      <p className="text-sm text-gray-500">ponavljanja</p>
    </div>
  );
}
```

- [ ] **Step 2: Write ProgressIndicator**

Create `src/components/session/ProgressIndicator.tsx`:

```tsx
interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <p className="text-sm text-gray-500">
      Karta {current}/{total}
    </p>
  );
}
```

- [ ] **Step 3: Write StopwatchDisplay**

Create `src/components/session/StopwatchDisplay.tsx`:

```tsx
interface StopwatchDisplayProps {
  elapsedSeconds: number;
}

export function StopwatchDisplay({ elapsedSeconds }: StopwatchDisplayProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  return <p className="text-2xl font-mono">{formatted}</p>;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/session/CardDisplay.tsx src/components/session/ProgressIndicator.tsx src/components/session/StopwatchDisplay.tsx
git commit -m "feat: add card display, progress indicator, and stopwatch display components"
```

---

### Task 23: Session screen orchestration

**Files:**
- Create: `src/components/session/SessionScreen.tsx`
- Test: `src/components/session/SessionScreen.test.tsx`

**Interfaces:**
- Consumes: `useStopwatch` (Task 21), `CardDisplay`, `ProgressIndicator`, `StopwatchDisplay` (Task 22), `createSession`, `recordCardDraw`, `completeSession` (Task 12).
- Produces: `SessionScreen` component with props `{ config: SessionConfig; draws: CardDrawResult[]; categoryIdByKey: Record<CategoryKey, string> | null; userId: string | null; onFinish: (result: SessionResult) => void }` — used by Task 26 (top-level app). Guest (`userId === null`) never calls the Supabase session functions.

- [ ] **Step 1: Write the failing tests**

Create `src/components/session/SessionScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionScreen } from './SessionScreen';
import type { CardDrawResult, SessionConfig } from '@/lib/domain/types';

vi.mock('@/lib/supabase/sessions', () => ({
  createSession: vi.fn(),
  recordCardDraw: vi.fn(),
  completeSession: vi.fn(),
}));

import { createSession, recordCardDraw, completeSession } from '@/lib/supabase/sessions';

const exercise = { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' };

const config: SessionConfig = {
  difficultyLevelId: 'd1',
  repMultiplier: 1,
  deckSize: 13,
  exerciseByCategory: { push: exercise, pull: exercise, legs: exercise, core: exercise },
};

const draws: CardDrawResult[] = [
  { orderIndex: 0, card: { suit: 'hearts', rank: 5 }, categoryKey: 'push', exercise, reps: 5, completedAt: null },
  { orderIndex: 1, card: { suit: 'clubs', rank: 6 }, categoryKey: 'pull', exercise, reps: 6, completedAt: null },
];

describe('SessionScreen — guest', () => {
  it('never touches Supabase and calls onFinish after the last card', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    render(
      <SessionScreen config={config} draws={draws} categoryIdByKey={null} userId={null} onFinish={onFinish} />
    );

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    expect(createSession).not.toHaveBeenCalled();
    expect(recordCardDraw).not.toHaveBeenCalled();
    expect(completeSession).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = onFinish.mock.calls[0][0];
    expect(result.draws).toHaveLength(2);
    expect(result.draws.every((d: CardDrawResult) => d.completedAt !== null)).toBe(true);
  });
});

describe('SessionScreen — logged in', () => {
  it('creates a session, records each draw, and completes the session', async () => {
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup();

    render(
      <SessionScreen
        config={config}
        draws={draws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );

    await waitFor(() => expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' })));

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    expect(recordCardDraw).toHaveBeenCalledTimes(2);
    expect(completeSession).toHaveBeenCalledWith('session-1', expect.any(Number));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- SessionScreen`
Expected: FAIL — `Cannot find module './SessionScreen'`.

- [ ] **Step 3: Implement the component**

Create `src/components/session/SessionScreen.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useStopwatch } from '@/hooks/useStopwatch';
import { CardDisplay } from './CardDisplay';
import { ProgressIndicator } from './ProgressIndicator';
import { StopwatchDisplay } from './StopwatchDisplay';
import { createSession, recordCardDraw, completeSession } from '@/lib/supabase/sessions';
import type { CardDrawResult, CategoryKey, SessionConfig, SessionResult } from '@/lib/domain/types';

interface SessionScreenProps {
  config: SessionConfig;
  draws: CardDrawResult[];
  categoryIdByKey: Record<CategoryKey, string> | null;
  userId: string | null;
  onFinish: (result: SessionResult) => void;
}

export function SessionScreen({
  config,
  draws,
  categoryIdByKey,
  userId,
  onFinish,
}: SessionScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedDraws, setCompletedDraws] = useState<CardDrawResult[]>(draws);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const stopwatch = useStopwatch();

  useEffect(() => {
    if (!userId || !categoryIdByKey) return;
    createSession({
      userId,
      config,
      categoryIdByKey,
      startedAtIso: new Date().toISOString(),
    })
      .then(setSessionId)
      .catch((err) => console.error('Failed to create session', err));
    // Intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleNext() {
    const completedAt = new Date().toISOString();
    const updatedDraw: CardDrawResult = { ...completedDraws[currentIndex], completedAt };
    const nextDraws = [...completedDraws];
    nextDraws[currentIndex] = updatedDraw;
    setCompletedDraws(nextDraws);

    if (userId && sessionId) {
      try {
        await recordCardDraw(sessionId, updatedDraw);
      } catch (err) {
        console.error('Failed to record card draw', err);
      }
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= draws.length) {
      stopwatch.pause();
      const totalDurationSeconds = stopwatch.elapsedSeconds;
      if (userId && sessionId) {
        try {
          await completeSession(sessionId, totalDurationSeconds);
        } catch (err) {
          console.error('Failed to complete session', err);
        }
      }
      onFinish({ totalDurationSeconds, draws: nextDraws });
      return;
    }
    setCurrentIndex(nextIndex);
  }

  const current = draws[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <StopwatchDisplay elapsedSeconds={stopwatch.elapsedSeconds} />
      <ProgressIndicator current={currentIndex + 1} total={draws.length} />
      <CardDisplay exerciseName={current.exercise.name} reps={current.reps} />
      <div className="flex gap-3">
        <button
          onClick={stopwatch.isPaused ? stopwatch.resume : stopwatch.pause}
          className="border rounded px-4 py-2"
        >
          {stopwatch.isPaused ? 'Nastavi' : 'Pauza'}
        </button>
        <button
          onClick={handleNext}
          disabled={stopwatch.isPaused}
          className="bg-blue-600 text-white rounded px-6 py-2 disabled:opacity-50"
        >
          Sledeća karta
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- SessionScreen`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/session/SessionScreen.tsx src/components/session/SessionScreen.test.tsx
git commit -m "feat: add session screen orchestration"
```

---

## Phase 6: Summary, History, and Top-Level Wiring

### Task 24: Per-category summary logic and summary screen

**Files:**
- Create: `src/lib/domain/summarize.ts`, `src/lib/domain/summarize.test.ts`, `src/components/summary/SummaryScreen.tsx`

**Interfaces:**
- Consumes: `CardDrawResult`, `CategoryKey`, `SessionResult` (Task 6).
- Produces: `summarizeByCategory(draws: CardDrawResult[]): CategoryBreakdown[]`, `SummaryScreen` component with props `{ result: SessionResult; isGuest: boolean; onDone: () => void }` — used by Task 26 (top-level app).

- [ ] **Step 1: Write the failing test for the pure summary function**

Create `src/lib/domain/summarize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { summarizeByCategory } from './summarize';
import type { CardDrawResult } from './types';

const exercise = { id: 'e1', name: 'Sklekovi', categoryId: 'c1', difficultyLevelId: 'd1' };
const exercise2 = { id: 'e2', name: 'Čučnjevi', categoryId: 'c3', difficultyLevelId: 'd1' };

describe('summarizeByCategory', () => {
  it('sums reps and counts cards per category', () => {
    const draws: CardDrawResult[] = [
      { orderIndex: 0, card: { suit: 'hearts', rank: 5 }, categoryKey: 'push', exercise, reps: 5, completedAt: 't1' },
      { orderIndex: 1, card: { suit: 'hearts', rank: 8 }, categoryKey: 'push', exercise, reps: 8, completedAt: 't2' },
      { orderIndex: 2, card: { suit: 'spades', rank: 6 }, categoryKey: 'legs', exercise: exercise2, reps: 6, completedAt: 't3' },
    ];

    expect(summarizeByCategory(draws)).toEqual([
      { categoryKey: 'push', exerciseName: 'Sklekovi', totalReps: 13, cardCount: 2 },
      { categoryKey: 'legs', exerciseName: 'Čučnjevi', totalReps: 6, cardCount: 1 },
    ]);
  });

  it('returns an empty array for no draws', () => {
    expect(summarizeByCategory([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- summarize`
Expected: FAIL — `Cannot find module './summarize'`.

- [ ] **Step 3: Implement the summary function**

Create `src/lib/domain/summarize.ts`:

```typescript
import type { CardDrawResult, CategoryKey } from './types';

export interface CategoryBreakdown {
  categoryKey: CategoryKey;
  exerciseName: string;
  totalReps: number;
  cardCount: number;
}

export function summarizeByCategory(draws: CardDrawResult[]): CategoryBreakdown[] {
  const map = new Map<CategoryKey, CategoryBreakdown>();
  for (const draw of draws) {
    const existing = map.get(draw.categoryKey);
    if (existing) {
      existing.totalReps += draw.reps;
      existing.cardCount += 1;
    } else {
      map.set(draw.categoryKey, {
        categoryKey: draw.categoryKey,
        exerciseName: draw.exercise.name,
        totalReps: draw.reps,
        cardCount: 1,
      });
    }
  }
  return Array.from(map.values());
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- summarize`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Write the summary screen component**

Create `src/components/summary/SummaryScreen.tsx`:

```tsx
'use client';

import { summarizeByCategory } from '@/lib/domain/summarize';
import type { SessionResult } from '@/lib/domain/types';

interface SummaryScreenProps {
  result: SessionResult;
  isGuest: boolean;
  onDone: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SummaryScreen({ result, isGuest, onDone }: SummaryScreenProps) {
  const breakdown = summarizeByCategory(result.draws);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Trening završen!</h1>
      <p className="text-4xl font-mono">{formatDuration(result.totalDurationSeconds)}</p>
      <div className="w-full max-w-sm flex flex-col gap-2">
        {breakdown.map((item) => (
          <div key={item.categoryKey} className="flex justify-between border-b py-1">
            <span>{item.exerciseName}</span>
            <span>
              {item.totalReps} ponavljanja ({item.cardCount} karata)
            </span>
          </div>
        ))}
      </div>
      {isGuest && (
        <p className="text-sm text-gray-500">
          Rezultat nije sačuvan. Registruj se da bi sačuvao istoriju treninga.
        </p>
      )}
      <button onClick={onDone} className="bg-blue-600 text-white rounded px-6 py-2">
        Nazad na početak
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain/summarize.ts src/lib/domain/summarize.test.ts src/components/summary/SummaryScreen.tsx
git commit -m "feat: add per-category summary logic and summary screen"
```

---

### Task 25: History screen

**Files:**
- Create: `src/components/history/HistoryScreen.tsx`

**Interfaces:**
- Consumes: `getUserSessions`, `SessionHistoryEntry` (Task 12).
- Produces: `HistoryScreen` component with prop `{ userId: string }` — used by Task 26 (top-level app). Presentation-only over already-tested query logic, verified manually.

- [ ] **Step 1: Write the component**

Create `src/components/history/HistoryScreen.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getUserSessions, type SessionHistoryEntry } from '@/lib/supabase/sessions';

interface HistoryScreenProps {
  userId: string;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function HistoryScreen({ userId }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserSessions(userId)
      .then(setSessions)
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) return <p>Učitavanje istorije...</p>;
  if (sessions.length === 0) return <p>Još nema odrađenih treninga.</p>;

  return (
    <div className="flex flex-col gap-2 max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Istorija treninga</h1>
      {sessions.map((session) => (
        <div key={session.id} className="flex justify-between border-b py-2">
          <span>{new Date(session.startedAt).toLocaleDateString('sr-RS')}</span>
          <span>{formatDuration(session.totalDurationSeconds)}</span>
          <span>{session.totalCards} karata</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Defer full interaction check to Task 26 (top-level wiring), since it needs a logged-in user with completed sessions. For now, verify it compiles:
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/history/HistoryScreen.tsx
git commit -m "feat: add history screen"
```

---

### Task 26: Landing screen and top-level app wiring

**Files:**
- Create: `src/components/landing/LandingScreen.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 13), `SetupScreen` (Task 20), `SessionScreen` (Task 23), `SummaryScreen` (Task 24), `HistoryScreen` (Task 25), `fetchCategories`, `buildCategoryIdByKey` (Task 11).
- Produces: the final `Home` page component — the state machine that drives the whole app (`landing` → `setup` → `session` → `summary` → back to `landing`, or → `history`).

- [ ] **Step 1: Write the landing screen component**

Create `src/components/landing/LandingScreen.tsx`:

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
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">Trening App</h1>
      {user ? (
        <>
          <p>Prijavljen kao {user.email}</p>
          <button onClick={onStartWorkout} className="bg-blue-600 text-white rounded px-6 py-3">
            Novi trening
          </button>
          <button onClick={onShowHistory} className="border rounded px-6 py-3">
            Istorija treninga
          </button>
          <button onClick={onSignOut} className="text-sm text-gray-500 underline">
            Odjavi se
          </button>
        </>
      ) : (
        <>
          <button onClick={onStartWorkout} className="bg-blue-600 text-white rounded px-6 py-3">
            Nastavi kao gost
          </button>
          <Link href="/login" className="border rounded px-6 py-3 text-center">
            Prijavi se
          </Link>
          <Link href="/signup" className="text-sm text-gray-500 underline">
            Napravi nalog
          </Link>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the failing test for the top-level state machine**

Create `src/app/page.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ user: null, isLoading: false, signOut: vi.fn() }),
}));

vi.mock('@/components/setup/SetupScreen', () => ({
  SetupScreen: ({ onStart }: { onStart: (c: unknown, d: unknown[]) => void }) => (
    <button onClick={() => onStart({ deckSize: 13 }, [{ completedAt: null }])}>finish-setup</button>
  ),
}));

vi.mock('@/components/session/SessionScreen', () => ({
  SessionScreen: ({ onFinish }: { onFinish: (r: unknown) => void }) => (
    <button onClick={() => onFinish({ totalDurationSeconds: 42, draws: [] })}>finish-session</button>
  ),
}));

vi.mock('@/components/summary/SummaryScreen', () => ({
  SummaryScreen: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>finish-summary</button>,
}));

describe('Home (top-level state machine)', () => {
  it('walks a guest through landing -> setup -> session -> summary -> back to landing', async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole('button', { name: 'Nastavi kao gost' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup' }));
    await user.click(await screen.findByRole('button', { name: 'finish-session' }));
    await user.click(await screen.findByRole('button', { name: 'finish-summary' }));

    expect(await screen.findByRole('button', { name: 'Nastavi kao gost' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm test -- page.test`
Expected: FAIL — `Home` does not yet implement the state machine (current `src/app/page.tsx` is still the Task 1 placeholder).

- [ ] **Step 4: Implement the top-level page**

Replace `src/app/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { SetupScreen } from '@/components/setup/SetupScreen';
import { SessionScreen } from '@/components/session/SessionScreen';
import { SummaryScreen } from '@/components/summary/SummaryScreen';
import { HistoryScreen } from '@/components/history/HistoryScreen';
import { fetchCategories, buildCategoryIdByKey } from '@/lib/supabase/queries';
import type { CardDrawResult, CategoryKey, SessionConfig, SessionResult } from '@/lib/domain/types';

type Screen = 'landing' | 'setup' | 'session' | 'summary' | 'history';

export default function Home() {
  const { user, isLoading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [draws, setDraws] = useState<CardDrawResult[]>([]);
  const [categoryIdByKey, setCategoryIdByKey] = useState<Record<CategoryKey, string> | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);

  if (isLoading) return <p className="p-6">Učitavanje...</p>;

  async function handleSetupStart(sessionConfig: SessionConfig, sessionDraws: CardDrawResult[]) {
    setConfig(sessionConfig);
    setDraws(sessionDraws);
    if (user) {
      const categories = await fetchCategories();
      setCategoryIdByKey(buildCategoryIdByKey(categories));
    }
    setScreen('session');
  }

  function handleSessionFinish(sessionResult: SessionResult) {
    setResult(sessionResult);
    setScreen('summary');
  }

  if (screen === 'landing') {
    return (
      <LandingScreen
        user={user}
        onStartWorkout={() => setScreen('setup')}
        onShowHistory={() => setScreen('history')}
        onSignOut={signOut}
      />
    );
  }
  if (screen === 'setup') {
    return <SetupScreen onStart={handleSetupStart} />;
  }
  if (screen === 'session' && config) {
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
  if (screen === 'summary' && result) {
    return <SummaryScreen result={result} isGuest={!user} onDone={() => setScreen('landing')} />;
  }
  if (screen === 'history' && user) {
    return <HistoryScreen userId={user.id} />;
  }
  return null;
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npm test -- page.test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Full manual walkthrough**

Run: `npm run dev`, open `http://localhost:3000`.
Verify as a guest: landing → "Nastavi kao gost" → pick difficulty → pick 4 exercises → pick deck length → session runs, stopwatch counts up, "Sledeća karta" advances, pause/resume works → summary shows correct total reps per category and the "not saved" message → "Nazad na početak" returns to landing.
Verify as a logged-in user (sign up, confirm email, log in): repeat the same flow → summary does NOT show the "not saved" message → "Istorija treninga" shows the just-completed session with correct duration and card count.

- [ ] **Step 7: Commit**

```bash
git add src/components/landing/LandingScreen.tsx src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: wire landing, setup, session, summary, and history into top-level app"
```

---

## Phase 7: Deployment

### Task 27: Deploy to Vercel

**Files:**
- Modify: `.gitignore` (ensure `.vercel` is excluded)

**Interfaces:**
- Produces: a live production URL serving the app, connected to the Supabase project from Task 5.

- [ ] **Step 1: Install and authenticate the Vercel CLI**

Run:
```bash
npx vercel login
```
Follow the printed link to authenticate in the browser.

- [ ] **Step 2: Link the local project to a new Vercel project**

Run:
```bash
npx vercel link
```
When prompted, choose to create a new project and accept the detected framework (Next.js).

- [ ] **Step 3: Add environment variables to Vercel**

Run (paste the value from `.env.local` when prompted, for each of Production, Preview, and Development when asked):
```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

- [ ] **Step 4: Deploy to production**

Run:
```bash
npx vercel --prod
```
Expected: CLI prints a production URL such as `https://trening-app.vercel.app`.

- [ ] **Step 5: Verify `.vercel` is gitignored**

Check `.gitignore` contains `.vercel` (the Vercel CLI adds this automatically when running `vercel link`; confirm it's present).

- [ ] **Step 6: Smoke test the production deployment**

Open the production URL from Step 4. Repeat the full manual walkthrough from Task 26 Step 6 (guest flow, then signed-in flow) against the live deployment.
Expected: identical behavior to local `npm run dev`, with data persisting in the real Supabase project.

- [ ] **Step 7: Commit**

```bash
git add .gitignore
git commit -m "chore: deploy to Vercel"
```

---

### Task 28: Phase 2 scaffolding placeholders (draft migration + module doc)

**Files:**
- Create: `supabase/phase2_gamification.sql` (draft, NOT applied to the database), `src/lib/gamification/README.md`

**Interfaces:**
- Produces: a written reference for Phase 2 gamification work (spec section 10) so a future session — Cursor or Claude — has the full intended direction without re-deriving it. No code or live schema changes.

- [ ] **Step 1: Write the draft Phase 2 migration**

Create `supabase/phase2_gamification.sql`:

```sql
-- DRAFT — NOT applied. Reference for Phase 2 gamification work only.
-- Run only after Phase 2 has its own approved spec and plan.

create table achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- e.g. 'first_workout', 'hundred_workouts'
  name text not null,
  description text not null
);

create table user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references achievements(id),
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table challenge_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  time_budget_seconds int not null,
  time_remaining_seconds int not null,
  outcome text not null -- 'won' | 'lost'
);

-- Streaks and leaderboards need no new tables:
-- streaks are computed from sessions.completed_at per user;
-- leaderboard is a query over sessions joined to profiles where profiles.is_public = true.
```

- [ ] **Step 2: Write the gamification module placeholder doc**

Create `src/lib/gamification/README.md`:

```markdown
# Gamification module (Phase 2 — not yet implemented)

This directory is reserved for Phase 2 gamification logic, planned in
`docs/superpowers/specs/2026-07-08-trening-app-design.md` section 10.

Planned contents (none implemented yet):
- Dual-timer challenge mode: countdown per card that draws down a
  global time budget, built on `sessions.game_mode = 'challenge'` and
  `sessions.settings` (see spec section 5).
- Achievement evaluation: reads `achievements` / `user_achievements`
  from `supabase/phase2_gamification.sql` (draft, not yet applied).
- Streak calculation: derived from `sessions.completed_at`, no new
  table needed.
- Leaderboard queries: `sessions` joined to `profiles` where
  `profiles.is_public = true`.

Do not add code here until Phase 2 has its own approved spec and plan.
```

- [ ] **Step 3: Commit**

```bash
git add supabase/phase2_gamification.sql src/lib/gamification/README.md
git commit -m "docs: add Phase 2 gamification draft schema and module placeholder"
```

---

## Self-Review Notes

- **Spec coverage:** every spec section (2 scope, 3 stack, 4 architecture principles, 5 data model, 6 card/deck logic, 7 user flow, 8 exercise library, 9 guest vs account, 11 non-functional) maps to at least one task above. Section 10 (Phase 2 preview) is intentionally not implemented — see "Deferred to Phase 2" below.
- **Type consistency verified:** `CardDrawResult`, `SessionConfig`, `SessionResult`, `Category`, `DifficultyLevel`, `Exercise`, `CategoryKey` are defined once in Task 6 and referenced with identical shapes through Tasks 7–26 (checked: `reps` vs `rank` naming, `categoryKey` vs `category_id` snake/camel mapping at the Supabase boundary in Tasks 11–12 only).
- **No placeholders:** every step contains complete, runnable code or an exact command with expected output.

## Deferred to Phase 2 (not built in this plan)

Per spec section 10: dual-timer challenge mode, leaderboard, achievements/streaks/XP, user-created exercises, social features, offline/PWA, push notifications, and the draft `phase2_gamification.sql` migration are all out of scope for this plan. They require a separate brainstorming/spec/plan cycle once the MVP is validated.

