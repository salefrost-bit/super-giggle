# v0.4.4 "Džokeri kao odmor" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ugrađeni odmor (🃏 30 sekundi, automatski, bez preskakanja) koji se povremeno pojavljuje umesto prave karte u SVIM ulazima i modovima, bez migracije šeme i bez izmena tajmer-primitiva (`useStopwatch`/`timer.ts`/`pauseLog.ts`).

**Architecture:** Odmor je ponovna upotreba postojećeg `useCardQuota` hook-a (kao još jedna "kvota", 30s, sa sopstvenim ključem) — ne nova tick-akumulacija. Pošto se odmor uvek dešava STRIKTNO IZMEĐU dve prave karte (pre nego što `currentIndex`/`elapsedAtCardStart` pređu na sledeću), budžeti Perfektnog špila/Dvora/Karte dana/Preživi špila su "besplatni" kroz redosled poziva bez ijedne izmene u `challenge.ts`/`bank.ts`. Jedini mod koji traži eksplicitno zamrzavanje je Sprint (kontinuirano odbrojavanje) — dobija `isResting` kao dodatni ulaz u `isPaused`. Pozicije odmora računa nov čist domenski modul (`jokers.ts`), bez React/Supabase zavisnosti.

**Tech Stack:** Next.js (App Router, client komponente), next-intl, Vitest + Testing Library (jsdom), Tailwind v4 tokeni iz `globals.css`. Bez Supabase izmena.

**Spec:** `docs/superpowers/specs/2026-07-15-dzokeri-design.md`.

## Global Constraints

- **Tajmer invarijanta:** svako vreme iz timestampova; NIKAD `setInterval` brojač-akumulator. Odmor eksplicitno reuse-uje `useCardQuota` (već timestamp-bazirano) — nema novog tajmer-mehanizma.
- **Bez migracije, bez izmena `card_draws`.** Odmor se nikad ne upisuje kao karta.
- **i18n:** svaki novi string = ključ u OBA kataloga (`messages/sr.json` + `messages/en.json`).
- **Testovi-ugovor + eksplicitna errata (spec §10, ovaj plan Task 5):** dva postojeća testa u `src/app/page.test.tsx` moraju dobiti `localStorage.setItem('explained.jokers', 'true')` da izoluju svoje postojeće ponašanje od novog univerzalnog gate-a — citirano tačno u Task 5. Nijedan drugi postojeći test se ne menja (spec §8 garantuje da `assignJokerBreaks` na kratkim test-špilovima <6 karata vraća praznu listu).
- **Registar modova nije dirnut** — džoker nije mod, primenjuje se preko svih.
- **`sessions.settings` JSONB** za `joker_breaks_taken` (opciono, aditivno) — bez novih kolona.
- **Kraj faze (Task 6):** puna suita + `npx tsc --noEmit` čist + CHANGELOG stavka + patch bump (`0.4.4`) + anotirani tag + ručna verifikacija NA TELEFONU (svi modovi, posebno Sprint i pauza-tokom-odmora).

---

### Task 1: Preflight gate

**Files:** nijedan (provera stanja).

- [ ] **Step 1: Verifikuj čisto polazište**

```bash
git status --short          # očekivano: prazno
git log --oneline -3        # očekivano: HEAD na v0.4.3 liniji (docs: v0.4.4 Džokeri... spec commit)
npm test                    # očekivano: SVI testovi PASS
npx tsc --noEmit            # očekivano: exit 0, bez izlaza
```

Ako bilo šta od ovoga ne prolazi — STOP, ne kreći u Task 2 dok se ne raščisti.
POZNATA ZAMKA: lokalni `npm install` ume da izbaci `@swc/helpers 0.5.23` iz
`package-lock.json`. Ako `git status` pokaže ` M package-lock.json` sa tim
brisanjem — `git checkout -- package-lock.json`, NE commituj brisanje.

---

### Task 2: `src/lib/domain/jokers.ts` — čist domenski modul + testovi

**Files:**
- Create: `src/lib/domain/jokers.ts`
- Create: `src/lib/domain/jokers.test.ts`

**Interfaces:**
- Produces: `JOKER_REST_SECONDS: number`, `jokerCountFor(realCardCount: number): number`, `assignJokerBreaks(realCardCount: number, rng?: () => number): number[]`, `isJokerBreak(completedCount: number, breaks: number[], lapSize?: number | null): boolean`. Task 4 (SessionScreen) importuje sve četvoro.

- [ ] **Step 1: Napiši failing test**

`src/lib/domain/jokers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { JOKER_REST_SECONDS, jokerCountFor, assignJokerBreaks, isJokerBreak } from './jokers';

describe('JOKER_REST_SECONDS', () => {
  it('is 30 seconds', () => {
    expect(JOKER_REST_SECONDS).toBe(30);
  });
});

describe('jokerCountFor', () => {
  it('returns 1 for decks up to 20 cards', () => {
    expect(jokerCountFor(12)).toBe(1);
    expect(jokerCountFor(16)).toBe(1);
    expect(jokerCountFor(20)).toBe(1);
  });

  it('returns 2 for decks 24 and above', () => {
    expect(jokerCountFor(24)).toBe(2);
    expect(jokerCountFor(52)).toBe(2);
  });
});

describe('assignJokerBreaks', () => {
  it('returns a single deterministic position when the eligible range has exactly one slot', () => {
    // realCardCount=6: earliest=5, latest=5 — only one possible position regardless of rng.
    expect(assignJokerBreaks(6, () => 0.5)).toEqual([5]);
  });

  it('never returns a position before the 5th card (warmup)', () => {
    const breaks = assignJokerBreaks(12, () => 0);
    expect(breaks[0]).toBeGreaterThanOrEqual(5);
  });

  it('never returns the last card as a break position', () => {
    const breaksLow = assignJokerBreaks(12, () => 0);
    const breaksHigh = assignJokerBreaks(12, () => 0.999999);
    expect(breaksLow.every((n) => n <= 11)).toBe(true);
    expect(breaksHigh.every((n) => n <= 11)).toBe(true);
  });

  it('returns two positions at least 4 cards apart for decks >= 24', () => {
    const breaks = assignJokerBreaks(24, () => 0);
    expect(breaks).toHaveLength(2);
    expect(breaks[1] - breaks[0]).toBeGreaterThanOrEqual(4);
  });

  it('is deterministic for the same rng sequence (Karta dana requirement)', () => {
    const first = assignJokerBreaks(20, () => 0.3);
    const second = assignJokerBreaks(20, () => 0.3);
    expect(first).toEqual(second);
  });

  it('gracefully returns an empty list when the deck is too small for the warmup rule', () => {
    expect(assignJokerBreaks(2, () => 0)).toEqual([]);
    expect(assignJokerBreaks(4, () => 0)).toEqual([]);
  });
});

describe('isJokerBreak', () => {
  it('matches an exact position with no lap wrapping', () => {
    expect(isJokerBreak(5, [5, 15])).toBe(true);
    expect(isJokerBreak(6, [5, 15])).toBe(false);
  });

  it('wraps positions modulo the lap size for Sprint', () => {
    expect(isJokerBreak(29, [5, 29], 52)).toBe(true);
    expect(isJokerBreak(52, [5, 29], 52)).toBe(false);
    expect(isJokerBreak(81, [5, 29], 52)).toBe(true); // 81 = 52 + 29, second lap
  });
});
```

- [ ] **Step 2: Pokreni test, potvrdi da NE PROLAZI**

```bash
npx vitest run src/lib/domain/jokers.test.ts
```

Expected: FAIL — `Cannot find module './jokers'` (fajl još ne postoji).

- [ ] **Step 3: Napiši implementaciju**

`src/lib/domain/jokers.ts`:

```ts
// Odmor (džoker) kao ugrađena pauza — spec 2026-07-15-dzokeri-design.md.
// Čist modul: ne zna ništa o React-u, Supabase-u, ni o modovima. SessionScreen
// odlučuje KADA da pita `isJokerBreak`; ovaj modul samo računa POZICIJE.

export const JOKER_REST_SECONDS = 30;

const WARMUP_CARDS = 5;
const MIN_GAP_CARDS = 4;

export function jokerCountFor(realCardCount: number): number {
  return realCardCount <= 20 ? 1 : 2;
}

// Vraća pozicije (1-indeksirano, "posle N-te prave karte") na kojima upada
// odmor. Nikad pre WARMUP_CARDS, nikad na poslednjoj karti. Za count=2,
// razmak >= MIN_GAP_CARDS je STRUKTURNO garantovan (secondEarliest), ne samo
// verovatnoćom. Graciozno vraća [] ako nema validne pozicije (kratki test-špilovi).
export function assignJokerBreaks(
  realCardCount: number,
  rng: () => number = Math.random
): number[] {
  const earliest = WARMUP_CARDS;
  const latest = realCardCount - 1;
  if (earliest > latest) return [];

  const count = jokerCountFor(realCardCount);
  if (count === 1) {
    return [earliest + Math.floor(rng() * (latest - earliest + 1))];
  }

  // count === 2 samo za realCardCount >= 24 (jokerCountFor), što uvek ostavlja
  // dovoljno prostora za dve pozicije >= MIN_GAP_CARDS razmaknute unutar
  // [earliest, latest] — bez dodatne provere granica.
  const mid = Math.floor((earliest + latest) / 2);
  const first = earliest + Math.floor(rng() * (mid - earliest + 1));
  const secondEarliest = Math.max(first + MIN_GAP_CARDS, mid + 1);
  const second = secondEarliest + Math.floor(rng() * (latest - secondEarliest + 1));
  return [first, second];
}

// completedCount = broj pravih karata odrađenih do sada (1-indeksirano —
// isto značenje kao pozicije iz assignJokerBreaks). Za Sprint (lapSize=52)
// se pozicija umotava unutar tekućeg kruga od 52 karte.
export function isJokerBreak(
  completedCount: number,
  breaks: number[],
  lapSize: number | null = null
): boolean {
  if (lapSize == null) return breaks.includes(completedCount);
  const positionInLap = ((completedCount - 1) % lapSize) + 1;
  return breaks.includes(positionInLap);
}
```

- [ ] **Step 4: Pokreni test, potvrdi da PROLAZI**

```bash
npx vitest run src/lib/domain/jokers.test.ts
```

Expected: PASS, svih 9 testova zeleno.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/jokers.ts src/lib/domain/jokers.test.ts
git commit -m "feat: domenski modul jokers.ts — raspored i detekcija dzoker-odmora"
```

---

### Task 3: i18n ključevi (`sr.json` + `en.json`)

**Files:**
- Modify: `messages/sr.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: ključevi `jokers.title`, `jokers.restLabel`, `jokers.restCaption`, `jokers.explanation` — koriste ih Task 4 (`JokerRestScreen`) i Task 5 (`page.tsx` prvo objašnjenje).

- [ ] **Step 1: Dodaj u `messages/sr.json`**

Trenutni kraj fajla (linije 176-179):

```json
  "language": {
    "label": "Jezik"
  }
}
```

Zameni sa:

```json
  "language": {
    "label": "Jezik"
  },
  "jokers": {
    "title": "🃏 Džoker",
    "restLabel": "ODMOR",
    "restCaption": "Diši. Sledeća karta stiže automatski.",
    "explanation": "Ako izvučeš džoker, dobijaš 30 sekundi odmora umesto vežbe — automatski se nastavlja na sledeću kartu. Ne brine se tvoje vreme po karti niti budžet — odmor je uvek besplatan."
  }
}
```

- [ ] **Step 2: Dodaj u `messages/en.json`**

Trenutni kraj fajla (linije 176-179):

```json
  "language": {
    "label": "Language"
  }
}
```

Zameni sa:

```json
  "language": {
    "label": "Language"
  },
  "jokers": {
    "title": "🃏 Joker",
    "restLabel": "REST",
    "restCaption": "Breathe. Next card comes automatically.",
    "explanation": "Draw a joker and you get 30 seconds of rest instead of an exercise — it moves on to the next card automatically. It never costs your per-card time or budget — rest is always free."
  }
}
```

- [ ] **Step 3: Proveri da su oba kataloga i dalje validan JSON i da imaju identičan skup ključeva**

```bash
node -e "
const sr=require('./messages/sr.json'), en=require('./messages/en.json');
function flat(o,p=''){return Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v!==null?flat(v,p+k+'.'):[p+k]);}
const s=new Set(flat(sr)), e=new Set(flat(en));
console.log('sr keys:', s.size, 'en keys:', e.size);
console.log('only in sr:', [...s].filter(k=>!e.has(k)));
console.log('only in en:', [...e].filter(k=>!s.has(k)));
"
```

Expected: `sr keys: 142 en keys: 142` (138 pre ovog taska + 4 nova `jokers.*` ključa), oba "only in..." spiska prazna.

- [ ] **Step 4: Commit**

```bash
git add messages/sr.json messages/en.json
git commit -m "feat: i18n kljucevi za dzoker odmor (sr/en)"
```

---

### Task 4: `SessionScreen.tsx` — integracija odmora + `JokerRestScreen` + testovi

**Files:**
- Create: `src/components/session/JokerRestScreen.tsx`
- Modify: `src/components/session/SessionScreen.tsx`
- Modify: `src/lib/domain/types.ts` (`SessionSettings` — jedno novo opciono polje)
- Modify: `src/components/session/SessionScreen.test.tsx`

**Interfaces:**
- Consumes: `JOKER_REST_SECONDS`, `assignJokerBreaks`, `isJokerBreak` iz Task 2; `jokers.restLabel`/`jokers.restCaption` iz Task 3.
- Produces: `SessionScreen` prikazuje odmor i pravilno ga izuzima iz budžeta svih modova; `SessionSettings.joker_breaks_taken?: number` — koristi ga Task 5 nijedan (opciono polje, ne dira druge module u ovom planu).

**Svesna odluka o obimu testova:** Sprint-specifična SessionScreen integracija
(`isResting` u `sprintQuota`, Task 5c ispod) NIJE pokrivena posebnim
SessionScreen testom — postojeći "sprint" describe blok mockuje
`useCardQuota` direktno (kontroliše `remainingSeconds`/`expired` bez pravog
tajmera), pa bi test stvarne interakcije zahtevao krhko rekonstruisanje tog
mock-a oko internog broja poziva. Umesto toga: (a) `isJokerBreak`-ovo
umotavanje kruga (lapSize=52) je već potpuno pokriveno u Task 2 testovima;
(b) sama promena je jedna linija (`stopwatch.isPaused || isResting`) čija je
ispravnost mehanička posledica već testiranog `useCardQuota` ponašanja; (c)
ručna verifikacija u Task 6 Step 2(e) eksplicitno pokriva TAČNO ovaj slučaj
(zaključavanje telefona tokom odmora u Sprintu).

- [ ] **Step 1: Napiši `JokerRestScreen` (nov, mali, prezentacioni — bez sopstvenog test fajla, po konvenciji ostalih malih prikaza kao `StopwatchDisplay`/`ProgressIndicator` koji se pokrivaju kroz integracione testove roditelja)**

`src/components/session/JokerRestScreen.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

interface JokerRestScreenProps {
  remainingSeconds: number;
}

export function JokerRestScreen({ remainingSeconds }: JokerRestScreenProps) {
  const t = useTranslations();
  return (
    <div className="bg-surface/55 backdrop-blur-xl rounded-3xl border-2 border-accent/35 shadow-[0_0_40px_rgba(204,255,0,0.08)] p-7 min-h-[360px] flex flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl">🃏</p>
      <p className="text-[15px] font-bold text-muted tracking-widest uppercase">
        {t('jokers.restLabel')}
      </p>
      <p className="text-2xl font-black tabular-nums text-accent">
        {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
      </p>
      <p className="text-sm font-semibold text-muted">{t('jokers.restCaption')}</p>
    </div>
  );
}
```

- [ ] **Step 2: Dodaj `joker_breaks_taken` u `SessionSettings`**

`src/lib/domain/types.ts` — pronađi:

```ts
export interface SessionSettings {
  pause_count?: number;
  total_pause_seconds?: number;
  points?: number;
  base_points?: number;
  multiplier?: number;
  entry?: EntryPath;
  card_count?: number;
  rep_multiplier?: number;
  sprint_minutes?: number;
  cards_completed?: number;
  survived_cards?: number;
  daily_date?: string;
  daily_replay?: boolean;
}
```

Zameni sa (dodat poslednji red):

```ts
export interface SessionSettings {
  pause_count?: number;
  total_pause_seconds?: number;
  points?: number;
  base_points?: number;
  multiplier?: number;
  entry?: EntryPath;
  card_count?: number;
  rep_multiplier?: number;
  sprint_minutes?: number;
  cards_completed?: number;
  survived_cards?: number;
  daily_date?: string;
  daily_replay?: boolean;
  joker_breaks_taken?: number;
}
```

- [ ] **Step 3: Napiši failing testove u `SessionScreen.test.tsx`**

Dodaj na vrh fajla (odmah posle postojećeg `const draws: CardDrawResult[] = [...]` bloka, oko linije 39) nove deljene fiksture koje koriste i ovaj i (kasnije, Task ne dira) Sprint blok:

```ts
function buildDraw(index: number, rank: number, ex = exercise): CardDrawResult {
  const suits: Array<'hearts' | 'clubs' | 'spades' | 'diamonds'> = [
    'hearts',
    'clubs',
    'spades',
    'diamonds',
  ];
  const categoryKeys: Array<'push' | 'pull' | 'legs' | 'core'> = [
    'push',
    'pull',
    'legs',
    'core',
  ];
  return {
    orderIndex: index,
    card: { suit: suits[index % 4], rank },
    categoryKey: categoryKeys[index % 4],
    exercise: ex,
    reps: rank,
    completedAt: null,
  };
}

const restDraws: CardDrawResult[] = [1, 2, 3, 4, 5, 6].map((rank, i) => buildDraw(i, rank));

const restConfig: SessionConfig = {
  difficultyLevelId: 'd1',
  repMultiplier: 1,
  deckSize: 6,
  exerciseByCategory: { push: exercise, pull: exercise, legs: exercise, core: exercise },
};
```

Zatim dodaj nov describe blok na KRAJ fajla (posle postojećeg `describe('SessionScreen — pause persistence (all modes)', ...)`):

```ts
describe('SessionScreen — joker rest', () => {
  it('shows a rest screen after the warmup card and auto-advances without a click', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={restConfig}
        draws={restDraws}
        categoryIdByKey={null}
        userId={null}
        onFinish={onFinish}
      />
    );

    // 6-card deck → assignJokerBreaks(6, ...) is ALWAYS [5] regardless of rng
    // (single-slot range), so this is deterministic without mocking Math.random.
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    }

    expect(await screen.findByText('ODMOR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sledeća karta' })).toBeDisabled();

    await vi.advanceTimersByTimeAsync(30_000);

    await waitFor(() => expect(screen.queryByText('ODMOR')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Sledeća karta' })).not.toBeDisabled();
    vi.useRealTimers();
  });

  it('pauses the rest countdown like any other pause, and resuming continues it (not restart)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={restConfig}
        draws={restDraws}
        categoryIdByKey={null}
        userId={null}
        onFinish={onFinish}
      />
    );

    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    }
    await screen.findByText('ODMOR');

    await vi.advanceTimersByTimeAsync(10_000);
    await user.click(screen.getByRole('button', { name: 'Pauza' }));
    expect(screen.getByText('PAUZIRANO')).toBeInTheDocument();

    // Well past 30s total if the rest countdown were still running unpaused.
    await vi.advanceTimersByTimeAsync(60_000);
    await user.click(screen.getByRole('button', { name: 'Nastavi trening' }));
    // Still resting — pause froze the rest countdown, it did not silently expire.
    expect(await screen.findByText('ODMOR')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(20_000); // ~20s remained when paused
    await waitFor(() => expect(screen.queryByText('ODMOR')).not.toBeInTheDocument());
    vi.useRealTimers();
  });

  it('includes rest time in total_duration_seconds, keeps pause stats at zero, and reports joker_breaks_taken', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(createSession).mockResolvedValue('session-1');
    vi.mocked(recordCardDraw).mockResolvedValue(undefined);
    vi.mocked(completeSession).mockResolvedValue(undefined);
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithIntl(
      <SessionScreen
        config={restConfig}
        draws={restDraws}
        categoryIdByKey={{ push: 'c1', pull: 'c2', legs: 'c3', core: 'c4' }}
        userId="user-1"
        onFinish={onFinish}
      />
    );
    await screen.findByRole('button', { name: 'Sledeća karta' });

    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));
    }
    await screen.findByText('ODMOR');
    await vi.advanceTimersByTimeAsync(30_000);
    await waitFor(() => expect(screen.queryByText('ODMOR')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Sledeća karta' }));

    await waitFor(() =>
      expect(completeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(Number),
        expect.objectContaining({ pause_count: 0, total_pause_seconds: 0, joker_breaks_taken: 1 })
      )
    );
    const totalDuration = vi.mocked(completeSession).mock.calls[0][1] as number;
    expect(totalDuration).toBeGreaterThanOrEqual(30);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 4: Pokreni testove, potvrdi da NOVI testovi FAIL-uju a POSTOJEĆI i dalje PROLAZE**

```bash
npx vitest run src/components/session/SessionScreen.test.tsx
```

Expected: novi "joker rest" blok FAIL (nema `isResting`/rest ekrana još); svi ostali postojeći testovi u fajlu i dalje PASS (dokaz da `assignJokerBreaks` na njihovim kratkim špilovima ne interferira — spec §8).

- [ ] **Step 5: Implementiraj u `SessionScreen.tsx`**

**5a — novi import** (dodaj uz postojeće importe, npr. odmah posle `import { calculateBasePoints, ...} from '@/lib/domain/score';`):

```ts
import { JOKER_REST_SECONDS, assignJokerBreaks, isJokerBreak } from '@/lib/domain/jokers';
import { JokerRestScreen } from './JokerRestScreen';
```

Pronađi postojeći import iz `daily.ts` (već postoji u fajlu za replay-detekciju):

```ts
import {
  dailyDateString,
  isDailyDoneLocal,
  markDailyDoneLocal,
} from '@/lib/domain/daily';
```

Zameni sa (dodat `seededRng` — spec §7 zahteva ODVOJEN seed-ovan tok za pozicije
džokera kod Karte dana, da se ne poklopi sa tokom koji izvlači karte):

```ts
import {
  dailyDateString,
  isDailyDoneLocal,
  markDailyDoneLocal,
  seededRng,
} from '@/lib/domain/daily';
```

**5b — novo stanje.** Pronađi:

```ts
  const [balanceSeconds, setBalanceSeconds] = useState(BANK_START_SECONDS);
  const [elapsedAtCardStart, setElapsedAtCardStart] = useState(0);
  const [pauseOrigin, setPauseOrigin] = useState<'manual' | 'auto' | null>(null);
```

Zameni sa (dodato posle):

```ts
  const [balanceSeconds, setBalanceSeconds] = useState(BANK_START_SECONDS);
  const [elapsedAtCardStart, setElapsedAtCardStart] = useState(0);
  const [pauseOrigin, setPauseOrigin] = useState<'manual' | 'auto' | null>(null);

  // Computed once at mount from the INITIAL real-card count. Sprint always
  // uses a 52-card lap (isJokerBreak wraps positions modulo 52 below) even
  // though `queue` grows via reshuffle-on-exhaustion. Karta dana gets its own
  // date-seeded rng stream (separate from the one that draws the cards, so
  // the sequences don't accidentally correlate) — same raspored for every
  // player that day, matching daily.ts's existing determinism principle.
  const [jokerBreaks] = useState(() => {
    const realCardCount = isSprint ? 52 : queue.length;
    if (!isDaily) return assignJokerBreaks(realCardCount);
    const dateString = dailyDateString(new Date(sessionStartedAt));
    return assignJokerBreaks(realCardCount, seededRng(`${dateString}:jokers`));
  });
  const [isResting, setIsResting] = useState(false);
  const [restKey, setRestKey] = useState(0);
  const [jokerBreaksTaken, setJokerBreaksTaken] = useState(0);
  const pendingIndexRef = useRef<number | null>(null);
  const restQuota = useCardQuota(isResting ? JOKER_REST_SECONDS : null, restKey, stopwatch.isPaused);
```

**5c — Sprint dobija `isResting` u svoj `isPaused` ulaz.** Pronađi:

```ts
  const sprintQuota = useCardQuota(
    isSprint && config.sprintMinutes != null ? config.sprintMinutes * 60 : null,
    0,
    stopwatch.isPaused
  );
```

Zameni sa:

```ts
  const sprintQuota = useCardQuota(
    isSprint && config.sprintMinutes != null ? config.sprintMinutes * 60 : null,
    0,
    stopwatch.isPaused || isResting
  );
```

**5d — efekat koji završava odmor.** Dodaj NOV `useEffect` odmah posle postojećeg auto-pauza efekta (posle bloka koji se završava sa `}, [stopwatch.isPaused, stopwatch.pause]);`):

```ts
  // Rest ends the same way any useCardQuota-driven countdown ends: when
  // `expired` flips true. Guarded by `pendingIndexRef` so it fires exactly
  // once per rest even though this effect re-runs on every stopwatch tick.
  useEffect(() => {
    if (!isResting || !restQuota.expired) return;
    const pending = pendingIndexRef.current;
    if (pending === null) return;
    pendingIndexRef.current = null;
    setIsResting(false);
    setJokerBreaksTaken((n) => n + 1);
    if (isSurvive) setElapsedAtCardStart(stopwatch.elapsedSeconds);
    setCurrentIndex(pending);
    setIsAdvancing(false);
  }, [isResting, restQuota.expired, isSurvive, stopwatch.elapsedSeconds]);
```

**5e — ubaci proveru u OBE grane `handleNext()`.** Prva grana (`isSurvive`), pronađi kraj:

```ts
      setBalanceSeconds(newBalance);
      setElapsedAtCardStart(stopwatch.elapsedSeconds);
      setCurrentIndex(nextIndex);
      setIsAdvancing(false);
      return;
    }
```

Zameni sa:

```ts
      setBalanceSeconds(newBalance);
      if (isJokerBreak(nextIndex, jokerBreaks)) {
        pendingIndexRef.current = nextIndex;
        setRestKey((k) => k + 1);
        setIsResting(true);
        return;
      }
      setElapsedAtCardStart(stopwatch.elapsedSeconds);
      setCurrentIndex(nextIndex);
      setIsAdvancing(false);
      return;
    }
```

Opšta grana (ispod, van `isSurvive`), pronađi:

```ts
    const nextIndex = currentIndex + 1;
    if (isSprint && sprintQuota.expired) {
      await finishSession(nextDraws);
      return;
    }
    if (nextIndex >= queue.length) {
      if (isDaily) {
        const dateString = dailyDateString(new Date(sessionStartedAt));
        const isReplay = userId
          ? await hasDailyForDate(userId, dateString)
          : isDailyDoneLocal(dateString);
        await finishSession(nextDraws, isReplay ? { dailyReplay: true } : { dailyDate: dateString });
      } else {
        await finishSession(nextDraws);
      }
      return;
    }
    setCurrentIndex(nextIndex);
    setIsAdvancing(false);
```

Zameni sa (jedina izmena: ubačen blok pre poslednja dva reda):

```ts
    const nextIndex = currentIndex + 1;
    if (isSprint && sprintQuota.expired) {
      await finishSession(nextDraws);
      return;
    }
    if (nextIndex >= queue.length) {
      if (isDaily) {
        const dateString = dailyDateString(new Date(sessionStartedAt));
        const isReplay = userId
          ? await hasDailyForDate(userId, dateString)
          : isDailyDoneLocal(dateString);
        await finishSession(nextDraws, isReplay ? { dailyReplay: true } : { dailyDate: dateString });
      } else {
        await finishSession(nextDraws);
      }
      return;
    }
    if (isJokerBreak(nextIndex, jokerBreaks, isSprint ? 52 : null)) {
      pendingIndexRef.current = nextIndex;
      setRestKey((k) => k + 1);
      setIsResting(true);
      return;
    }
    setCurrentIndex(nextIndex);
    setIsAdvancing(false);
```

**5f — `finishSession` prosleđuje `joker_breaks_taken` kad > 0.** Pronađi:

```ts
    const pauseStats = {
      pause_count: stopwatch.pauseCount,
      total_pause_seconds: stopwatch.totalPauseSeconds,
    };
```

Zameni sa:

```ts
    const pauseStats = {
      pause_count: stopwatch.pauseCount,
      total_pause_seconds: stopwatch.totalPauseSeconds,
    };
    const jokerStats = jokerBreaksTaken > 0 ? { joker_breaks_taken: jokerBreaksTaken } : {};
```

Zatim u ISTOJ funkciji pronađi ceo `settingsPayload` blok:

```ts
    const settingsPayload = isSurvive
      ? {
          survived_cards: options.survivedCards ?? finishedDraws.length,
          ...pauseStats,
          ...pointsPayload,
        }
      : isChallenge
        ? {
            budget_seconds: config.budgetSeconds as number,
            par_source: config.parSource ?? ('par' as const),
            best_score: config.bestScoreForCombo ?? null,
            score: challengeScore.score,
            won: challengeScore.won,
            ...dailySettings,
            ...pauseStats,
            ...pointsPayload,
          }
        : isSprint
          ? {
              sprint_minutes: config.sprintMinutes,
              cards_completed: finishedDraws.length,
              ...pauseStats,
              ...pointsPayload,
            }
          : { ...pauseStats, ...pointsPayload };
```

Zameni sa (dodato `...jokerStats` u sva četiri grane):

```ts
    const settingsPayload = isSurvive
      ? {
          survived_cards: options.survivedCards ?? finishedDraws.length,
          ...pauseStats,
          ...jokerStats,
          ...pointsPayload,
        }
      : isChallenge
        ? {
            budget_seconds: config.budgetSeconds as number,
            par_source: config.parSource ?? ('par' as const),
            best_score: config.bestScoreForCombo ?? null,
            score: challengeScore.score,
            won: challengeScore.won,
            ...dailySettings,
            ...pauseStats,
            ...jokerStats,
            ...pointsPayload,
          }
        : isSprint
          ? {
              sprint_minutes: config.sprintMinutes,
              cards_completed: finishedDraws.length,
              ...pauseStats,
              ...jokerStats,
              ...pointsPayload,
            }
          : { ...pauseStats, ...jokerStats, ...pointsPayload };
```

**5g — render: prikaži odmor umesto karte, onemogući "Sledeća karta".** Pronađi:

```ts
      <div className="flex-1 flex flex-col justify-center">
        <CardDisplay
          exerciseName={localizedName(current.exercise, locale)}
          reps={current.reps}
          suit={current.card.suit}
          rank={current.card.rank}
          categoryKey={current.categoryKey}
          categoryLabel={undefined}
          quotaRemainingSeconds={isChallenge || isSprint ? quota.remainingSeconds : null}
          quotaFraction={quota.fraction}
          bankBalanceSeconds={displayBalance}
          bankQuotaSeconds={cardQuotaSeconds}
          outcomeFlash={outcomeFlash}
        />
        <div className="h-1.5 rounded-[3px] bg-surface/70 mt-5 overflow-hidden">
          <div
            className="h-full bg-accent rounded-[3px]"
            style={{ width: `${Math.round((currentIndex / queue.length) * 100)}%` }}
          />
        </div>
      </div>
```

Zameni sa:

```ts
      <div className="flex-1 flex flex-col justify-center">
        {isResting ? (
          <JokerRestScreen remainingSeconds={restQuota.remainingSeconds} />
        ) : (
          <>
            <CardDisplay
              exerciseName={localizedName(current.exercise, locale)}
              reps={current.reps}
              suit={current.card.suit}
              rank={current.card.rank}
              categoryKey={current.categoryKey}
              categoryLabel={undefined}
              quotaRemainingSeconds={isChallenge || isSprint ? quota.remainingSeconds : null}
              quotaFraction={quota.fraction}
              bankBalanceSeconds={displayBalance}
              bankQuotaSeconds={cardQuotaSeconds}
              outcomeFlash={outcomeFlash}
            />
            <div className="h-1.5 rounded-[3px] bg-surface/70 mt-5 overflow-hidden">
              <div
                className="h-full bg-accent rounded-[3px]"
                style={{ width: `${Math.round((currentIndex / queue.length) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>
```

Pronađi:

```ts
  const isWaitingForSession = userId !== null && saveState === 'creating';
  const nextDisabled = stopwatch.isPaused || isAdvancing || isWaitingForSession;
```

Zameni sa:

```ts
  const isWaitingForSession = userId !== null && saveState === 'creating';
  const nextDisabled = stopwatch.isPaused || isAdvancing || isWaitingForSession || isResting;
```

- [ ] **Step 6: Pokreni SVE testove u fajlu, potvrdi da SVE prolazi (novo + postojeće)**

```bash
npx vitest run src/components/session/SessionScreen.test.tsx
```

Expected: svi testovi u fajlu PASS (postojeći + 3 nova "joker rest" testa).

- [ ] **Step 7: Pokreni celu suitu i typecheck**

```bash
npm test
npx tsc --noEmit
```

Expected: sve PASS, tsc čist.

- [ ] **Step 8: Commit**

```bash
git add src/components/session/JokerRestScreen.tsx src/components/session/SessionScreen.tsx src/components/session/SessionScreen.test.tsx src/lib/domain/types.ts
git commit -m "feat: dzoker odmor u SessionScreen (svi modovi) + joker_breaks_taken"
```

---

### Task 5: `page.tsx` — prvo objašnjenje pre PRVE sesije ikad (bilo kog moda)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `jokers.title`/`jokers.explanation` (Task 3), postojeći `hasSeenExplanation`/`markExplained` iz `src/lib/modes/explained.ts` (već generalizovan, BEZ IZMENA tog fajla) sa novim ključem string-literalom `'jokers'`.

- [ ] **Step 1: Errata na DVA postojeća testa — citat i razlog**

Spec §10 (`docs/superpowers/specs/2026-07-15-dzokeri-design.md`): *"modal se prikazuje jednom pre PRVE sesije ikad (bilo kog moda, bilo kog ulaza)"*. Pošto oba postojeća testa u `page.test.tsx` (linije 37 i 49) NE seed-uju `explained.jokers` u localStorage, novi univerzalni gate bi se ubacio u NJIHOV tok i pokvario postojeće assertion-e (`finish-session` odmah posle `finish-setup`). Errata: dodaj `localStorage.setItem('explained.jokers', 'true')` na početak OBA testa da izoluju svoje postojeće ponašanje (state machine odn. challenge-specifičan gate) od ovog novog, nepovezanog gate-a. Nijedan assert unutar njih se ne menja.

Pronađi (linija 37):

```ts
  it('walks a guest through landing -> setup -> session -> summary -> back to landing', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Home />);
```

Zameni sa:

```ts
  it('walks a guest through landing -> setup -> session -> summary -> back to landing', async () => {
    localStorage.setItem('explained.jokers', 'true');
    const user = userEvent.setup();
    renderWithIntl(<Home />);
```

Pronađi (linija 49):

```ts
  it('shows the perfect_deck first-run explanation once, before the session starts', async () => {
    localStorage.removeItem('explained.perfect_deck');
    const user = userEvent.setup();
    const { unmount } = renderWithIntl(<Home />);
```

Zameni sa:

```ts
  it('shows the perfect_deck first-run explanation once, before the session starts', async () => {
    localStorage.removeItem('explained.perfect_deck');
    localStorage.setItem('explained.jokers', 'true');
    const user = userEvent.setup();
    const { unmount } = renderWithIntl(<Home />);
```

- [ ] **Step 2: Napiši DVA nova failing testa (jokers-only + chaining)**

Dodaj na kraj `describe('Home (top-level state machine)', ...)` bloka, posle postojećeg drugog testa:

```ts
  it('shows the jokers first-run explanation once, before the very first session of any mode', async () => {
    localStorage.removeItem('explained.jokers');
    const user = userEvent.setup();
    const { unmount } = renderWithIntl(<Home />);

    await user.click(screen.getByRole('button', { name: 'Nastavi kao gost' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup' }));

    expect(await screen.findByText(/Ako izvučeš džoker/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'finish-session' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Jasno, krećemo' }));
    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
    expect(localStorage.getItem('explained.jokers')).toBe('true');

    unmount();
    renderWithIntl(<Home />);
    await user.click(screen.getByRole('button', { name: 'Nastavi kao gost' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup' }));
    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
    expect(screen.queryByText(/Ako izvučeš džoker/)).not.toBeInTheDocument();
  });

  it('chains jokers intro then challenge intro when both are unseen', async () => {
    localStorage.removeItem('explained.jokers');
    localStorage.removeItem('explained.perfect_deck');
    const user = userEvent.setup();
    renderWithIntl(<Home />);

    await user.click(screen.getByRole('button', { name: 'Nastavi kao gost' }));
    await user.click(await screen.findByRole('button', { name: 'finish-setup-challenge' }));

    expect(await screen.findByText(/Ako izvučeš džoker/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Jasno, krećemo' }));

    expect(await screen.findByText(/Svaka karta ima svoju vremensku kvotu/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Jasno, krećemo' }));

    expect(await screen.findByRole('button', { name: 'finish-session' })).toBeInTheDocument();
  });
```

- [ ] **Step 3: Pokreni testove, potvrdi FAIL na nova dva + postojeća dva sada (posle Step 1 errate) i dalje PROLAZE**

```bash
npx vitest run src/app/page.test.tsx
```

Expected: 2 nova testa FAIL (gate još ne postoji u kodu); 2 postojeća PASS (errata iz Step 1 ih je izolovala).

- [ ] **Step 4: Implementiraj u `page.tsx`**

Pronađi:

```ts
  const [showChallengeIntro, setShowChallengeIntro] = useState(false);
```

Zameni sa:

```ts
  const [introStep, setIntroStep] = useState<'jokers' | 'challenge' | null>(null);
  const [pendingChallengeIntro, setPendingChallengeIntro] = useState(false);
```

Pronađi:

```ts
    const modeDef = MODES.find((m) => m.id === sessionConfig.gameMode);
    if (modeDef?.isChallenge && sessionConfig.gameMode && !hasSeenExplanation(sessionConfig.gameMode)) {
      setShowChallengeIntro(true);
    }
    setScreen('session');
```

Zameni sa:

```ts
    const modeDef = MODES.find((m) => m.id === sessionConfig.gameMode);
    const needsChallengeIntro = !!(
      modeDef?.isChallenge &&
      sessionConfig.gameMode &&
      !hasSeenExplanation(sessionConfig.gameMode)
    );
    const needsJokersIntro = !hasSeenExplanation('jokers');
    if (needsJokersIntro) {
      setPendingChallengeIntro(needsChallengeIntro);
      setIntroStep('jokers');
    } else if (needsChallengeIntro) {
      setIntroStep('challenge');
    }
    setScreen('session');
```

Pronađi:

```ts
  if (screen === 'session' && config) {
    if (showChallengeIntro) {
      const modeDef = MODES.find((m) => m.id === config.gameMode);
      return (
        <InfoModal
          title={t(modeDef?.titleKey ?? 'setup.challengeTitle')}
          closeLabel={t('modes.firstRunCta')}
          onClose={() => {
            if (config.gameMode) markExplained(config.gameMode);
            setShowChallengeIntro(false);
          }}
        >
          {t(modeDef?.explanationKey ?? 'modes.perfect_deck.explanation')}
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

Zameni sa:

```ts
  if (screen === 'session' && config) {
    if (introStep === 'jokers') {
      return (
        <InfoModal
          title={t('jokers.title')}
          closeLabel={t('modes.firstRunCta')}
          onClose={() => {
            markExplained('jokers');
            setIntroStep(pendingChallengeIntro ? 'challenge' : null);
          }}
        >
          {t('jokers.explanation')}
        </InfoModal>
      );
    }
    if (introStep === 'challenge') {
      const modeDef = MODES.find((m) => m.id === config.gameMode);
      return (
        <InfoModal
          title={t(modeDef?.titleKey ?? 'setup.challengeTitle')}
          closeLabel={t('modes.firstRunCta')}
          onClose={() => {
            if (config.gameMode) markExplained(config.gameMode);
            setIntroStep(null);
          }}
        >
          {t(modeDef?.explanationKey ?? 'modes.perfect_deck.explanation')}
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

- [ ] **Step 5: Pokreni SVE testove u fajlu, potvrdi da SVE prolazi**

```bash
npx vitest run src/app/page.test.tsx
```

Expected: sva 4 testa PASS (2 postojeća + 2 nova).

- [ ] **Step 6: Pokreni celu suitu i typecheck**

```bash
npm test
npx tsc --noEmit
```

Expected: sve PASS, tsc čist.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: prvo objasnjenje dzokera pre prve sesije ikad + errata na 2 postojeca testa"
```

---

### Task 6: Kapija faze v0.4.4 — ručna verifikacija, CHANGELOG, tag

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json` (version)

- [ ] **Step 1: Puna suita + typecheck + lint**

```bash
npm test
npx tsc --noEmit
npm run lint
```

Expected: sve zeleno/čisto.

- [ ] **Step 2: Ručna verifikacija u browseru + NA TELEFONU** (obavezno pre taga — dira tajmere u svim modovima):
  (a) Quick 12 karata: odmor se pojavljuje tačno jednom, negde između 6. i 12. karte, nikad na poslednjoj;
  (b) Custom sa 52 karte: DVA odmora, razmaknuta;
  (c) Perfektan špil/Dvor/Karta dana: kvota sledeće karte NE gubi vreme zbog odmora (uporedi prikazani rok pre/posle);
  (d) Preživi špil: banka se ne troši tokom odmora;
  (e) **Sprint (najosetljivije):** zaključaj telefon TOKOM odmora — po povratku odmor treba da nastavi (ne da se resetuje niti da tiho istekne u pozadini), a Sprint-ovo odbrojavanje NE sme da izgubi 30 sekundi zbog odmora;
  (f) Ručna pauza tokom odmora radi identično kao inače (PAUZIRANO overlay), nastavak vraća na odmor;
  (g) Rezultati/istorija: kad je bilo odmora, `joker_breaks_taken` se vidi u zapisu (proveri kroz Supabase tabelu ili konzolu — UI prikaz ovog polja nije u obimu ovog izdanja);
  (h) Prvi ikad trening na uređaju (obriši localStorage `explained.jokers`): objašnjenje se prikazuje pre bilo kog moda, uklj. Quick.

**STOP do potvrde korisnika.**

- [ ] **Step 3: CHANGELOG stavka**

`CHANGELOG.md` — pronađi:

```md
## U pripremi

Džokeri kao odmor, animacije vežbi, redizajn Napretka, zvuk/vibracija i instalacija na telefon (PWA).
```

Zameni sa:

```md
## v0.4.4 — Džokeri (2026-07-15)

Povremeno se, umesto prave karte, pojavi džoker — 30 sekundi ugrađenog odmora koji se sam završi i automatski nastavi na sledeću kartu. Radi u svim modovima i nikad ne troši vreme po karti niti budžet (Perfektan špil, Sprint, Dvor, Preživi špil, Karta dana).

## U pripremi

Animacije vežbi, redizajn Napretka, zvuk/vibracija i instalacija na telefon (PWA).
```

- [ ] **Step 4: Version bump**

`package.json` — pronađi:

```json
  "version": "0.4.3",
```

Zameni sa:

```json
  "version": "0.4.4",
```

- [ ] **Step 5: Commit, tag, push**

```bash
git add CHANGELOG.md package.json
git commit -m "chore: verzija 0.4.4 (Dzokeri kao odmor)"
git tag -a v0.4.4 -m "v0.4.4 — Dzokeri kao odmor"
git push
git push --tags
```

- [ ] **Step 6: Ažuriraj status u indeksu i strategiji**

`docs/superpowers/README.md` — dodaj red za `specs/2026-07-15-dzokeri-design.md` (Status: Završen (implementiran)) i `plans/2026-07-15-dzokeri-plan.md` u tabelu planova.
`docs/superpowers/strategy/2026-07-15-krug-b-revizija.md` — u tabeli §2 označi red v0.4.4 kao završen (npr. "✅ Završen 2026-07-15").

```bash
git add docs/superpowers/README.md docs/superpowers/strategy/2026-07-15-krug-b-revizija.md
git commit -m "docs: azuriraj status v0.4.4 u indeksu i strategiji"
git push
```

**Sledeći korak:** brainstorm za v0.4.5 (Animacije vežbi) — TEK posle potvrde ručne verifikacije iz Step 2 ovog taska, po `docs/superpowers/README.md` checklist-u.
