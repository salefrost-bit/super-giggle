# Krug B "Igrivost" — Implementacioni plan v0.4.1–v0.4.3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tri ulaza u trening (Quick/Custom/Challenge), points/XP/rekordi sistem, biblioteka 24 vežbe sa tier-ovima, i četiri nova challenge moda (Sprint, Dvor, Preživi špil, Karta dana), isporučeno kao tri tagovana izdanja redom.

**Architecture:** Sve novo se izvodi iz postojećih podataka: `points` je čista funkcija nad `card_draws` + tier vežbe; modovi su unosi u postojeći registar; jedina izmena šeme su aditivne kolone na `exercises` (0005) i proširen CHECK na `sessions.total_cards` (0006, errata). Setup postaje state-machine sa tri staze; SessionScreen dobija mode-aware grane (Sprint countdown, Preživi banka) ali sve vreme ostaje timestamp aritmetika.

**Tech Stack:** Next.js (App Router, client komponente), Supabase JS (samo kroz `src/lib/supabase/`), next-intl, Vitest + Testing Library (jsdom), Tailwind v4 tokeni iz `globals.css`.

**Spec:** `docs/superpowers/specs/2026-07-15-krug-b-design.md` (sa primenjenim nalazima N1–N13). Aneks strategije: `docs/superpowers/strategy/2026-07-15-krug-b-revizija.md`.

## Global Constraints

- **Tajmer invarijanta:** svako vreme iz timestampova (`now − started_at`, `deadline − now`; pauza pomera timestamp). NIKAD `setInterval` brojači-akumulatori. Interval sme samo da okida re-render.
- **Aditivne migracije:** nove kolone/tabele; izmena postojećeg SAMO uz erratu iz spec-a (ovde: §9.3 total_cards CHECK).
- **i18n:** svaki novi string = ključ u OBA kataloga (`messages/sr.json` + `messages/en.json`). Nula hardkodiranog teksta u komponentama.
- **Testovi-ugovor:** postojeći testovi prolaze nepromenjeni OSIM errata iz spec §9.1/§9.2 (deck veličine 13/26→12/24 i balansirano izvlačenje — tačan citat u Task 4).
- **Registar modova:** novi mod = modul + unos u `src/lib/modes/registry.ts` + prevodi.
- **Gost nikad ne piše u Supabase.** Sav Supabase I/O kroz `src/lib/supabase/`.
- **`sessions.settings` JSONB** za mod-podatke; bez novih kolona na `sessions`.
- **Postojeći ključ `settings.score` = broj oborenih karata — NE DIRATI.** Novi sistem koristi `points`, `base_points`, `multiplier`.
- **Kraj svake faze** (Task 12, 16, 20): puna suita + `npx tsc --noEmit` čist + CHANGELOG stavka + minor/patch bump + anotirani tag + ručna verifikacija NA TELEFONU pre sledeće faze.
- Rankovi karata: 1–13, As=1 (errata iz redizajn spec-a §5).

---

# FAZA 1 — v0.4.1 "Temelj igrivosti"

### Task 1: Preflight gate

**Files:** nijedan (provera stanja).

- [ ] **Step 1: Verifikuj čisto polazište**

```bash
git status --short          # očekivano: prazno (ili samo untracked plan)
npm test                    # očekivano: 22 test fajla, 96/96 PASS
npx tsc --noEmit            # očekivano: exit 0, bez izlaza
```

Ako bilo šta od ovoga ne prolazi — STOP, ne kreći u Task 2 dok se ne raščisti.
POZNATA ZAMKA: lokalni `npm install` ume da izbaci `@swc/helpers 0.5.23` iz
`package-lock.json` (namerno vraćen commit-om c31b793). Ako `git status`
pokaže ` M package-lock.json` sa tim brisanjem — `git checkout -- package-lock.json`,
NE commituj brisanje.

---

### Task 2: Migracije 0005 (exercises tier + seed) i 0006 (total_cards CHECK)

**Files:**
- Create: `supabase/migrations/0005_exercise_tiers.sql`
- Create: `supabase/migrations/0006_total_cards_check.sql`

**Interfaces:**
- Produces: kolone `exercises.tier` (smallint 1–3, not null) i `exercises.is_default` (boolean not null); 12 novih redova u `exercises`; `sessions.total_cards` prima 12–52 deljivo sa 4 (plus stare 13/26).

- [ ] **Step 1: Napiši 0005**

```sql
-- Krug B: tier šema i default vežbe + 12 novih vežbi (2 po tieru po kategoriji).
-- Spec: 2026-07-15-krug-b-design.md §5, §7. Sve aditivno.
alter table exercises add column tier smallint;
alter table exercises add column is_default boolean not null default false;

-- Backfill tier-a postojećih 12 iz njihovog nivoa (Početnik=1, Srednji=2, Napredni=3)
update exercises e set tier = d.sort_order
from difficulty_levels d where e.difficulty_level_id = d.id;

alter table exercises alter column tier set not null;
alter table exercises add constraint exercises_tier_check check (tier between 1 and 3);

-- Postojećih 12 su defaulti svojih (kategorija, tier) kombinacija
update exercises set is_default = true;

-- 12 novih vežbi; difficulty_level_id po mapiranju tier→nivo (kolona je NOT NULL i ostaje)
insert into exercises (name, name_en, category_id, difficulty_level_id, tier)
select v.name, v.name_en, c.id, d.id, v.tier
from (values
  ('Sklekovi uz zid',                'Wall push-ups',          'Guranje',    'Početnik', 1),
  ('Široki sklekovi',                'Wide push-ups',          'Guranje',    'Srednji',  2),
  ('Sklekovi s nogama na povišenju', 'Decline push-ups',       'Guranje',    'Napredni', 3),
  ('Superman povlačenje',            'Superman pulls',         'Povlačenje', 'Početnik', 1),
  ('Australijski zgibovi',           'Inverted rows',          'Povlačenje', 'Srednji',  2),
  ('Zgibovi širokim hvatom',         'Wide-grip pull-ups',     'Povlačenje', 'Napredni', 3),
  ('Glute most',                     'Glute bridges',          'Noge',       'Početnik', 1),
  ('Bočni iskoraci',                 'Side lunges',            'Noge',       'Srednji',  2),
  ('Bugarski čučanj',                'Bulgarian split squats', 'Noge',       'Napredni', 3),
  ('Mrtva buba',                     'Dead bugs',              'Core',       'Početnik', 1),
  ('Planinari',                      'Mountain climbers',      'Core',       'Srednji',  2),
  ('V-podizanja',                    'V-ups',                  'Core',       'Napredni', 3)
) as v(name, name_en, category_name, difficulty_name, tier)
join categories c on c.name = v.category_name
join difficulty_levels d on d.name = v.difficulty_name;
```

Napomena: backfill se oslanja na `difficulty_levels.sort_order` = 1/2/3 za Početnik/Srednji/Napredni (v. `0002_seed.sql:7-10` — tačno tako seedovano).

- [ ] **Step 2: Napiši 0006**

```sql
-- ERRATA spec §9.3: check iz 0001 propušta samo 13/26/52 i obara sve nove
-- veličine špila (12, 16, 20, 24...). Presedan za drop+add: migracija 0003.
alter table sessions drop constraint sessions_total_cards_check;
alter table sessions add constraint sessions_total_cards_check
  check (total_cards in (13, 26) or (total_cards between 12 and 52 and total_cards % 4 = 0));
```

Napomena: ime constraint-a je Postgres default za inline check (`sessions_total_cards_check`); ako `drop` javi da ne postoji, proveri stvarno ime sa `select conname from pg_constraint where conrelid = 'sessions'::regclass;` i upotrebi njega.

- [ ] **Step 3: Primeni migracije na Supabase projekat** (SQL editor ili `supabase db push`, kako je rađeno za 0001–0004). Verifikuj: `select name, tier, is_default from exercises order by category_id, tier;` → 24 reda, po 2 na (kategorija, tier), tačno 12 sa `is_default = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_exercise_tiers.sql supabase/migrations/0006_total_cards_check.sql
git commit -m "feat: migracije 0005 (tier + 24 vežbe) i 0006 (total_cards check errata)"
```

---

### Task 3: i18n ključevi za v0.4.1

**Files:**
- Modify: `messages/sr.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: ključeve koje koriste Taskovi 7–11. Skupovi ključeva u oba kataloga MORAJU ostati identični (postojeći test to ne proverava automatski — uporedi ručno ili privremenom skriptom).

- [ ] **Step 1: Dodaj u `messages/sr.json`** (unutar postojećeg objekta; `setup` blok se dopunjuje/menja, ostalo su novi blokovi):

```json
"entry": {
  "title": "Kako danas treniraš?",
  "quickTitle": "🏃 Brzi trening",
  "quickDesc": "Izaberi nivo i kreni — vežbe biramo mi.",
  "customTitle": "🎛 Po meri",
  "customDesc": "Svaka vežba i slajderi po tvom.",
  "challengeTitle": "⚡ Challenge",
  "challengeDesc": "Modovi sa satom, rekordima i poenima."
},
"custom": {
  "repMultiplier": "Množilac ponavljanja",
  "cardCount": "Broj karata",
  "cardsPerCategory": "{count} po kategoriji",
  "start": "Kreni",
  "tierBadge": "Nivo {tier}"
},
"points": {
  "label": "Poeni",
  "base": "baza {base}",
  "multiplierLabel": "množilac ×{multiplier}",
  "total": "{points} poena",
  "guestKeep": "Osvojeno {points} poena — napravi nalog da ih zadržiš.",
  "formulaTitle": "Kako se računaju poeni",
  "formula": "Poeni = zbir (ponavljanja × faktor vežbe) za svaku završenu kartu. Faktor: nivo Ⅰ ×1, nivo Ⅱ ×1.5, nivo Ⅲ ×2. U challenge modovima množilac na kraju uvećava zbir — do ×2."
},
"xp": {
  "label": "XP",
  "rankTitle": "Zvanje",
  "explanation": "XP je zbir poena svih završenih treninga — samo raste. Zvanja: 2 (0), J (5.000), Q (15.000), K (40.000), A (100.000), 🃏 (250.000).",
  "rankUp": "NOVO ZVANJE: {symbol}"
},
"history": {
  "exercises": "Vežbe",
  "totalReps": "{count} ponavljanja",
  "beaten": "{score}/{total} oborenih",
  "breakdown": "baza {base} × {multiplier}"
},
"landing.repeatLast": "Ponovi poslednji trening"
```

U `progress` blok dodaj: `"pointsRecordsTitle": "Rekordi (poeni)"`,
`"sprintDim": "{minutes} min"`. U `setup` blok dodaj aria ključeve:
`"quarterAria": "Kratak (12 karata)"`, `"halfAria": "Srednji (24 karte)"`,
`"fullAria": "Ceo špil (52 karte)"`.

Napomena za `landing.repeatLast`: dodaj kao `"repeatLast": "Ponovi poslednji trening"` UNUTAR postojećeg `landing` bloka, ne kao poseban top-level ključ. U `setup` bloku promeni: `"quarterLabel": "Kratak"`, `"quarterSub": "12 karata · ~10 min"`, `"halfLabel": "Srednji"`, `"halfSub": "24 karte · ~20 min"` (errata §9.1; `fullLabel`/`fullSub` ostaju).

- [ ] **Step 2: Dodaj ekvivalente u `messages/en.json`**

```json
"entry": {
  "title": "How are you training today?",
  "quickTitle": "🏃 Quick workout",
  "quickDesc": "Pick a level and go — we pick the exercises.",
  "customTitle": "🎛 Custom",
  "customDesc": "Every exercise and slider your way.",
  "challengeTitle": "⚡ Challenge",
  "challengeDesc": "Modes with a clock, records and points."
},
"custom": {
  "repMultiplier": "Rep multiplier",
  "cardCount": "Card count",
  "cardsPerCategory": "{count} per category",
  "start": "Start",
  "tierBadge": "Tier {tier}"
},
"points": {
  "label": "Points",
  "base": "base {base}",
  "multiplierLabel": "multiplier ×{multiplier}",
  "total": "{points} points",
  "guestKeep": "You earned {points} points — create an account to keep them.",
  "formulaTitle": "How points are calculated",
  "formula": "Points = sum of (reps × exercise factor) for every finished card. Factor: tier Ⅰ ×1, tier Ⅱ ×1.5, tier Ⅲ ×2. In challenge modes a final multiplier boosts the total — up to ×2."
},
"xp": {
  "label": "XP",
  "rankTitle": "Rank",
  "explanation": "XP is the sum of points from all finished workouts — it only grows. Ranks: 2 (0), J (5,000), Q (15,000), K (40,000), A (100,000), 🃏 (250,000).",
  "rankUp": "NEW RANK: {symbol}"
},
"history": {
  "exercises": "Exercises",
  "totalReps": "{count} reps",
  "beaten": "{score}/{total} beaten",
  "breakdown": "base {base} × {multiplier}"
}
```

U `landing` blok: `"repeatLast": "Repeat last workout"`. U `setup`: `"quarterLabel": "Short"`, `"quarterSub": "12 cards · ~10 min"`, `"halfLabel": "Medium"`, `"halfSub": "24 cards · ~20 min"`, `"quarterAria": "Short (12 cards)"`, `"halfAria": "Medium (24 cards)"`, `"fullAria": "Full deck (52 cards)"`. U `progress`: `"pointsRecordsTitle": "Records (points)"`, `"sprintDim": "{minutes} min"`.

- [ ] **Step 3: Testovi i provera pariteta**

```bash
npm test    # postojeći testovi i dalje prolaze (koriste renderWithIntl sa sr katalogom)
node -e "const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?f(v,p+k+'.'):[p+k]);const a=JSON.stringify(f(require('./messages/sr.json')).sort()),b=JSON.stringify(f(require('./messages/en.json')).sort());console.log(a===b?'OK':'MISMATCH')"
# očekivano: OK (duboka parnost — poredi UGNEŽDENE ključeve, ne samo blokove)
```

- [ ] **Step 4: Commit**

```bash
git add messages/sr.json messages/en.json
git commit -m "feat: i18n ključevi za tri vrata, poene, XP i istoriju (v0.4.1)"
```

---

### Task 4: Tipovi + balansirano izvlačenje (errata §9.1 i §9.2)

**Files:**
- Modify: `src/lib/domain/types.ts:25` (`DeckSize`), `types.ts:44-50` (`Exercise`), `types.ts:52` (`GameMode`), `types.ts:54-57` (`SessionSettings`), `types.ts:67-80` (`SessionConfig`)
- Modify: `src/lib/domain/deck.ts`
- Modify: `src/lib/domain/deck.test.ts`
- Modify: `src/components/setup/SessionLengthSelector.tsx` (vrednosti 13/26 → 12/24)

**Interfaces:**
- Produces: `DeckSize = number` (validan: 12–52, deljiv sa 4); `isValidDeckSize(n: number): boolean`; `drawSessionCards(deckSize, rng?)` sada garantuje N/4 karata po boji; `QUICK_DECK_SIZES = [12, 24, 52] as const`; `Exercise` dobija `tier: 1|2|3` i `isDefault: boolean`; `GameMode` dobija `'sprint' | 'court' | 'survive' | 'daily'`; `SessionSettings` dobija opciona polja `points`, `base_points`, `multiplier`, `entry`, `card_count`, `rep_multiplier`.

**ERRATA CITAT (spec §9.1–9.2, jedini dozvoljeni razlog izmene postojećih testova):** „Dužine 13/26 postaju 12/24 … Tip `DeckSize` (13|26|52) postaje `number` … Postojeći testovi `deck.test.ts` i svi asserti vezani za 13/26 se ažuriraju po ovoj errati" i „Dosadašnje slučajno izvlačenje … zamenjuje se pravilom N/4 po boji (§2.4). Testovi koji su asertovali čistu slučajnost se ažuriraju; novi testovi asertuju balans i slučajnost redosleda."

- [ ] **Step 1: Ažuriraj tipove u `types.ts`**

```ts
export type DeckSize = number; // validan: 12–52, deljiv sa 4 (spec §2.4); Quick nudi 12/24/52
export const QUICK_DECK_SIZES = [12, 24, 52] as const;

export function isValidDeckSize(n: number): boolean {
  return Number.isInteger(n) && n >= 12 && n <= 52 && n % 4 === 0;
}

export type ExerciseTier = 1 | 2 | 3;

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string | null;
  categoryId: string;
  difficultyLevelId: string;
  tier: ExerciseTier;
  isDefault: boolean;
}

export type GameMode = 'classic' | 'perfect_deck' | 'sprint' | 'court' | 'survive' | 'daily';

export type EntryPath = 'quick' | 'custom' | 'challenge';

export interface SessionSettings {
  pause_count?: number;
  total_pause_seconds?: number;
  points?: number;
  base_points?: number;
  multiplier?: number;
  entry?: EntryPath;
  card_count?: number;
  rep_multiplier?: number;
}
```

`SessionConfig` dobija `entry?: EntryPath;` (ostala polja nepromenjena). PAŽNJA: `Exercise.tier`/`isDefault` su obavezni — kompajler će prijaviti sva mesta koja prave Exercise objekte (testovi, queries) — to je namerno, popravljaju se u ovom i sledećem tasku.

- [ ] **Step 2: Napiši testove balansiranog izvlačenja u `deck.test.ts`** (zameni assert-e vezane za 13/26 i čistu slučajnost; zadrži testove za `createFullDeck`/`shuffleDeck`):

```ts
import { describe, it, expect } from 'vitest';
import { createFullDeck, shuffleDeck, drawSessionCards } from './deck';
import type { Suit } from './types';

function countBySuit(cards: { suit: Suit }[]): Record<Suit, number> {
  return cards.reduce(
    (acc, c) => ({ ...acc, [c.suit]: acc[c.suit] + 1 }),
    { hearts: 0, clubs: 0, spades: 0, diamonds: 0 } as Record<Suit, number>
  );
}

describe('drawSessionCards (balansirano, spec §2.4)', () => {
  it.each([12, 16, 20, 24, 52])('vraća %i karata sa N/4 po boji', (n) => {
    const cards = drawSessionCards(n);
    expect(cards).toHaveLength(n);
    const counts = countBySuit(cards);
    expect(Object.values(counts)).toEqual([n / 4, n / 4, n / 4, n / 4]);
  });

  it('nema duplikata karata', () => {
    const cards = drawSessionCards(52);
    const keys = new Set(cards.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(52);
  });

  it('redosled je promešan preko boja (deterministički rng)', () => {
    let i = 0;
    const rng = () => ((i += 7) % 13) / 13;
    const suits = drawSessionCards(12, rng).map((c) => c.suit);
    // balansiran ali ne grupisan: prve 3 karte nisu sve iste boje
    expect(new Set(suits.slice(0, 3)).size).toBeGreaterThan(1);
  });

  it('baca za nevalidnu veličinu', () => {
    expect(() => drawSessionCards(13)).toThrow();
    expect(() => drawSessionCards(15)).toThrow();
  });
});
```

- [ ] **Step 3: Pokreni — očekivano FAIL** (`drawSessionCards` još seče slučajno): `npm test -- deck`

- [ ] **Step 4: Implementiraj u `deck.ts`**

```ts
import { isValidDeckSize } from './types';

export function drawSessionCards(deckSize: DeckSize, rng: () => number = Math.random): Card[] {
  if (!isValidDeckSize(deckSize)) {
    throw new Error(`Invalid deck size ${deckSize} — must be 12–52 divisible by 4 (spec §2.4)`);
  }
  const perSuit = deckSize / 4;
  const picked: Card[] = [];
  for (const suit of SUITS) {
    const suitCards = shuffleDeck(RANKS.map((rank) => ({ suit, rank })), rng);
    picked.push(...suitCards.slice(0, perSuit));
  }
  return shuffleDeck(picked, rng);
}
```

- [ ] **Step 5: Ažuriraj `SessionLengthSelector.tsx`:** vrednosti `13 → 12` i `26 → 24`, a hardkodovane `ariaLabel` stringove (`SessionLengthSelector.tsx:14-15`, „Četvrtina špila (13 karata)"…) zameni i18n ključevima `setup.quarterAria`/`halfAria`/`fullAria` iz Task 3. Ažuriraj i njegov test ako asertuje 13/26 ili stare aria stringove; `SetupScreen.test` klikće po `'Ceo špil (52 karte)'` — vrednost `fullAria` je namerno identična, taj assert ostaje netaknut.

- [ ] **Step 6: `npm test` je posle ovog taska ZELEN (Vitest ne type-checkuje — esbuild transform); pada SAMO `npx tsc --noEmit` na obaveznim `Exercise.tier`/`isDefault` poljima u test fajlovima, i to je očekivano crveno do Taska 6 (v. spec errata §9.4). Commit:**

```bash
git add src/lib/domain/types.ts src/lib/domain/deck.ts src/lib/domain/deck.test.ts src/components/setup/SessionLengthSelector.tsx
git commit -m "feat: balansirano izvlačenje N/4 po boji + DeckSize number (errata §9.1–9.2)"
```

---

### Task 5: Domenski modul `score.ts` (points, množioci, XP, zvanja)

**Files:**
- Create: `src/lib/domain/score.ts`
- Create: `src/lib/domain/score.test.ts`

**Interfaces:**
- Consumes: `ExerciseTier` iz `types.ts`.
- Produces (koriste Taskovi 9–11, 14–19):

```ts
export const TIER_FACTORS: Record<ExerciseTier, number>; // {1:1.0, 2:1.5, 3:2.0}
export interface ScoredDraw { reps: number; completedAt: string | null; tier: ExerciseTier; }
export function calculateBasePoints(draws: ScoredDraw[]): number;
export type MultiplierInput =
  | { mode: 'classic' }
  | { mode: 'perfect_deck' | 'daily'; beaten: number; total: number }
  | { mode: 'court'; beaten: number; total: number }
  | { mode: 'sprint' }
  | { mode: 'survive'; survivedAll: boolean };
export function challengeMultiplier(input: MultiplierInput): number;
export function calculatePoints(basePoints: number, multiplier: number): number; // round(base*mult)
export const XP_RANKS: ReadonlyArray<{ symbol: string; threshold: number }>;
export function rankForXp(xp: number): { symbol: string; threshold: number };
export function nextRank(xp: number): { symbol: string; threshold: number } | null;
```

- [ ] **Step 1: Napiši `score.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  calculateBasePoints, challengeMultiplier, calculatePoints, rankForXp, nextRank,
} from './score';

describe('calculateBasePoints', () => {
  it('sabira reps × tier faktor samo za završene karte', () => {
    const draws = [
      { reps: 10, completedAt: '2026-07-15T10:00:00Z', tier: 1 as const }, // 10
      { reps: 10, completedAt: '2026-07-15T10:01:00Z', tier: 2 as const }, // 15
      { reps: 10, completedAt: '2026-07-15T10:02:00Z', tier: 3 as const }, // 20
      { reps: 99, completedAt: null, tier: 3 as const },                    // nezavršena: 0
    ];
    expect(calculateBasePoints(draws)).toBe(45);
  });
  it('prazna sesija = 0', () => {
    expect(calculateBasePoints([])).toBe(0);
  });
});

describe('challengeMultiplier', () => {
  it('classic i sprint = 1', () => {
    expect(challengeMultiplier({ mode: 'classic' })).toBe(1);
    expect(challengeMultiplier({ mode: 'sprint' })).toBe(1);
  });
  it('perfect_deck/daily = 1 + beaten/total, total 0 ne deli nulom', () => {
    expect(challengeMultiplier({ mode: 'perfect_deck', beaten: 26, total: 52 })).toBe(1.5);
    expect(challengeMultiplier({ mode: 'daily', beaten: 20, total: 20 })).toBe(2);
    expect(challengeMultiplier({ mode: 'perfect_deck', beaten: 0, total: 0 })).toBe(1);
  });
  it('court = (1 + beaten/total) × 1.25', () => {
    expect(challengeMultiplier({ mode: 'court', beaten: 16, total: 16 })).toBe(2.5);
  });
  it('survive = 1.5 samo ako je prešao sve', () => {
    expect(challengeMultiplier({ mode: 'survive', survivedAll: true })).toBe(1.5);
    expect(challengeMultiplier({ mode: 'survive', survivedAll: false })).toBe(1);
  });
});

describe('calculatePoints', () => {
  it('zaokružuje', () => expect(calculatePoints(333, 1.5)).toBe(500));
});

describe('XP zvanja (spec §3.4)', () => {
  it('pragovi', () => {
    expect(rankForXp(0).symbol).toBe('2');
    expect(rankForXp(4999).symbol).toBe('2');
    expect(rankForXp(5000).symbol).toBe('J');
    expect(rankForXp(15000).symbol).toBe('Q');
    expect(rankForXp(40000).symbol).toBe('K');
    expect(rankForXp(100000).symbol).toBe('A');
    expect(rankForXp(999999).symbol).toBe('🃏');
  });
  it('nextRank vraća sledeći prag ili null na vrhu', () => {
    expect(nextRank(0)?.symbol).toBe('J');
    expect(nextRank(250000)).toBeNull();
  });
});
```

- [ ] **Step 2: Pokreni — FAIL** (`score.ts` ne postoji): `npm test -- score`

- [ ] **Step 3: Implementiraj `score.ts`**

```ts
import type { ExerciseTier } from './types';

// Konstante formule igre — namerno u kodu, ne u bazi (spec §3.5: pravilo igre,
// menja se isključivo kroz spec; invarijanta 7 pokriva sadržaj, ne formulu).
export const TIER_FACTORS: Record<ExerciseTier, number> = { 1: 1.0, 2: 1.5, 3: 2.0 };

export interface ScoredDraw {
  reps: number;
  completedAt: string | null;
  tier: ExerciseTier;
}

export function calculateBasePoints(draws: ScoredDraw[]): number {
  return draws.reduce(
    (sum, d) => (d.completedAt ? sum + d.reps * TIER_FACTORS[d.tier] : sum),
    0
  );
}

export type MultiplierInput =
  | { mode: 'classic' }
  | { mode: 'perfect_deck' | 'daily'; beaten: number; total: number }
  | { mode: 'court'; beaten: number; total: number }
  | { mode: 'sprint' }
  | { mode: 'survive'; survivedAll: boolean };

export function challengeMultiplier(input: MultiplierInput): number {
  switch (input.mode) {
    case 'classic':
    case 'sprint':
      return 1;
    case 'perfect_deck':
    case 'daily':
      return input.total > 0 ? 1 + input.beaten / input.total : 1;
    case 'court':
      return (input.total > 0 ? 1 + input.beaten / input.total : 1) * 1.25;
    case 'survive':
      return input.survivedAll ? 1.5 : 1;
  }
}

export function calculatePoints(basePoints: number, multiplier: number): number {
  return Math.round(basePoints * multiplier);
}

export const XP_RANKS = [
  { symbol: '2', threshold: 0 },
  { symbol: 'J', threshold: 5000 },
  { symbol: 'Q', threshold: 15000 },
  { symbol: 'K', threshold: 40000 },
  { symbol: 'A', threshold: 100000 },
  { symbol: '🃏', threshold: 250000 },
] as const;

export function rankForXp(xp: number): { symbol: string; threshold: number } {
  let current = XP_RANKS[0];
  for (const rank of XP_RANKS) {
    if (xp >= rank.threshold) current = rank;
  }
  return current;
}

export function nextRank(xp: number): { symbol: string; threshold: number } | null {
  for (const rank of XP_RANKS) {
    if (xp < rank.threshold) return rank;
  }
  return null;
}
```

- [ ] **Step 4: `npm test -- score` → PASS. Commit:**

```bash
git add src/lib/domain/score.ts src/lib/domain/score.test.ts
git commit -m "feat: score domen — points baza, challenge množioci, XP zvanja"
```

---

### Task 6: Supabase sloj — tier u upitima, `fetchAllExercises`, points rekordi, XP, lazy backfill, detalji sesije

**Files:**
- Modify: `src/lib/supabase/queries.ts` (`fetchExercisesByDifficulty` select + map; novi `fetchAllExercises`)
- Modify: `src/lib/supabase/sessions.ts` (`SessionHistoryEntry` + settings mapiranje; novi `getSessionDetails`, `backfillPoints`)
- Modify: `src/lib/supabase/records.ts` (novi `getTotalXp`; `getBestPoints` NE ovde — uvodi ga Task 15 kad prvi put zatreba)
- Modify: `src/lib/supabase/queries.test.ts`, `src/lib/supabase/sessions.test.ts`, `src/lib/supabase/records.test.ts` (novi testovi + dopuna mock objekata)
- Modify: `src/components/setup/ExercisePicker.test.tsx`, `src/components/setup/SetupScreen.test.tsx`, `src/components/session/SessionScreen.test.tsx` — SAMO dopuna mock `Exercise` objekata poljima `tier`/`isDefault` da tsc prođe; ponašajni asserti netaknuti. AUTORIZACIJA: spec errata §9.4 tačka 3. U `queries.test.ts` je dozvoljeno i proširenje očekivanog objekta u postojećem `toEqual` assertu za nova polja (ista errata).

**Interfaces:**
- Consumes: `calculateBasePoints`, `challengeMultiplier`, `calculatePoints` iz Task 5; `Exercise` sa `tier`/`isDefault` iz Task 4.
- Produces:

```ts
// queries.ts
export async function fetchAllExercises(): Promise<Exercise[]>; // select svih 24, sa tier + is_default
// oba fetch-a mapiraju: tier: row.tier as ExerciseTier, isDefault: row.is_default

// sessions.ts
export interface SessionHistoryEntry { /* postojeće polja + */ points: number | null; basePoints: number | null; multiplier: number | null; entry: string | null; sprintMinutes: number | null; cardCount: number | null; }
export interface SessionDetails { exercises: { categoryName: string; name: string; nameEn: string | null; tier: number }[]; totalReps: number; }
export async function getSessionDetails(sessionId: string): Promise<SessionDetails>;
export async function backfillPoints(sessionId: string, gameMode: string): Promise<number | null>;
// backfillPoints: učita card_draws + session_exercises(join exercises za tier po kategoriji),
// izračuna points (za perfect_deck množilac iz settings.score/total_cards), upiše
// settings = { ...postojeći, points, base_points, multiplier } i vrati points.
// NE DIRA settings.score. Vraća null ako sesija nema draws.

// records.ts
export async function getTotalXp(userId: string): Promise<number>;
// select('settings').eq('user_id', userId).eq('status','completed')
// → Σ settings.points (sesije bez points = 0)
```

- [ ] **Step 1: Napiši nove testove.** PAŽNJA: `records.test.ts` danas testira samo čistu `aggregateRecords` — NEMA `createClient` mock. Dodaj ga po uzoru na `sessions.test.ts` (vi.mock `./client`):

```ts
import { vi, describe, it, expect } from 'vitest';
import { getTotalXp } from './records';
import { createClient } from './client';

vi.mock('./client', () => ({ createClient: vi.fn() }));

function mockSessionsSelect(rows: Array<{ settings: Record<string, unknown> | null }>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  };
  (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: vi.fn(() => chain) });
  return chain;
}

describe('getTotalXp', () => {
  it('sabira points preko sesija, ignoriše sesije bez points', async () => {
    const chain = mockSessionsSelect([
      { settings: { points: 300 } }, { settings: {} }, { settings: { points: 200, score: 24 } },
    ]);
    expect(await getTotalXp('u1')).toBe(500);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.eq).toHaveBeenCalledWith('status', 'completed');
  });
});
```

(Ako thenable-chain pattern u postojećim testovima izgleda drugačije — prati POSTOJEĆI pattern iz `sessions.test.ts`, ovo je skica ugovora, ne dogma o obliku mocka.)

`sessions.test.ts` — dodaj test da `getUserSessions` mapira `points/basePoints/multiplier/entry` iz settings (`?? null`), i test da `backfillPoints` za classic sesiju sa draws `[{reps:10,tier:2,completed}]` upisuje `points: 15` i NE menja postojeći `score` ključ u settings objektu koji šalje u update.

- [ ] **Step 2: Pokreni — FAIL.** `npm test -- supabase`

- [ ] **Step 3: Implementiraj.** Ključni delovi:

```ts
// queries.ts — oba exercise fetch-a prošire select i map:
.select('id, name, name_en, category_id, difficulty_level_id, tier, is_default')
// map: tier: row.tier as ExerciseTier, isDefault: row.is_default

export async function fetchAllExercises(): Promise<Exercise[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, name_en, category_id, difficulty_level_id, tier, is_default')
    .order('tier');
  if (error) throw error;
  return (data as ExerciseRow[]).map(mapExerciseRow);
}
```

```ts
// sessions.ts
export async function backfillPoints(sessionId: string, gameMode: string): Promise<number | null> {
  const supabase = createClient();
  const [{ data: session }, { data: drawRows }, { data: exRows }] = await Promise.all([
    supabase.from('sessions').select('settings, total_cards').eq('id', sessionId).single(),
    supabase.from('card_draws').select('suit, reps, completed_at').eq('session_id', sessionId),
    supabase.from('session_exercises').select('category_id, exercises(tier), categories(name)').eq('session_id', sessionId),
  ]);
  if (!drawRows || drawRows.length === 0) return null;
  const tierByCategoryName = new Map(
    (exRows as unknown as Array<{ categories: { name: string }; exercises: { tier: number } }>)
      .map((r) => [r.categories.name, r.exercises.tier as ExerciseTier])
  );
  const scored = (drawRows as Array<{ suit: Suit; reps: number; completed_at: string | null }>).map((d) => ({
    reps: d.reps,
    completedAt: d.completed_at,
    tier: tierByCategoryName.get(CATEGORY_KEY_TO_NAME[SUIT_TO_CATEGORY[d.suit]]) ?? 2,
  }));
  const base = calculateBasePoints(scored);
  const oldSettings = (session as { settings: Record<string, unknown> | null }).settings ?? {};
  const totalCards = (session as { total_cards: number }).total_cards;
  const beaten = typeof oldSettings.score === 'number' ? (oldSettings.score as number) : 0;
  const multiplier = gameMode === 'perfect_deck'
    ? challengeMultiplier({ mode: 'perfect_deck', beaten, total: totalCards })
    : challengeMultiplier({ mode: 'classic' });
  const points = calculatePoints(base, multiplier);
  const { error } = await supabase
    .from('sessions')
    .update({ settings: { ...oldSettings, points, base_points: base, multiplier } })
    .eq('id', sessionId);
  if (error) throw error;
  return points;
}
```

`getSessionDetails`: select `session_exercises(categories(name), exercises(name, name_en, tier))` + `card_draws(reps)` → mapiraj u `SessionDetails` (totalReps = Σ reps).

- [ ] **Step 4: `npm test` → CELA suita PASS (uklj. popravljene mock objekte sa tier/is_default). `npx tsc --noEmit` → čist.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: supabase sloj — tier u vežbama, points rekordi, XP, lazy backfill, detalji sesije"
```

---

### Task 7: Tri vrata + Quick tok

**Files:**
- Create: `src/components/setup/EntrySelector.tsx`
- Create: `src/components/setup/EntrySelector.test.tsx`
- Modify: `src/components/setup/SetupScreen.tsx` (state-machine sa tri staze)
- Modify: `src/components/setup/ModeSelector.tsx` — dodaj prop `modes?: ModeDefinition[]` (default `MODES`); Challenge meni ga zove sa `MODES.filter((m) => m.isChallenge)`. Postojeći `ModeSelector.test.tsx` prolazi NEIZMENJEN (default = puna lista, u v0.4.1 su to i dalje 2 moda).
- Modify: `src/components/setup/SetupScreen.test.tsx` — AUTORIZACIJA: spec errata §9.4 tačka 1. Konkretno: (a) prvi test (linije 46-70, stari tok mode→difficulty→exercises→length) se PREPISUJE kao Quick staza: entry „Brzi trening" → nivo → dužina → assert `onStart` config sa default vežbama (mock `fetchExercisesByDifficulty` vraća vežbe sa `isDefault: true` po kategoriji — inače `pickDefaults` baca); (b) perfect_deck test dobija prefiks: klik „Challenge" → klik na perfect_deck karticu, ostatak toka netaknut.

**Interfaces:**
- Consumes: `QUICK_DECK_SIZES`, `EntryPath` (Task 4); `fetchExercisesByDifficulty` sa tier poljima (Task 6); postojeće `DifficultySelector`, `SessionLengthSelector`, `drawSessionCards`, `calculateReps`.
- Produces: `EntrySelector({ onSelect: (entry: EntryPath) => void })`; `SetupScreen` interno stanje `entry: EntryPath | null`; `config.entry` postavljen u `SessionConfig` pri startu. Challenge staza u ovom tasku vodi na postojeći `ModeSelector` filtriran na `isChallenge === true` (u v0.4.1 lista ima samo Perfektan špil).

- [ ] **Step 1: Test za EntrySelector**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithIntl } from '@/test/renderWithIntl';
import { EntrySelector } from './EntrySelector';

describe('EntrySelector', () => {
  it('prikazuje tri kartice i javlja izbor', () => {
    const onSelect = vi.fn();
    renderWithIntl(<EntrySelector onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Brzi trening/));
    expect(onSelect).toHaveBeenCalledWith('quick');
    fireEvent.click(screen.getByText(/Po meri/));
    expect(onSelect).toHaveBeenCalledWith('custom');
    fireEvent.click(screen.getByText(/Challenge/));
    expect(onSelect).toHaveBeenCalledWith('challenge');
  });
});
```

- [ ] **Step 2: FAIL, pa implementiraj `EntrySelector.tsx`** (stil prati kartice iz `DifficultySelector.tsx:44-57`):

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { EntryPath } from '@/lib/domain/types';

const ENTRIES: { id: EntryPath; titleKey: string; descKey: string }[] = [
  { id: 'quick', titleKey: 'entry.quickTitle', descKey: 'entry.quickDesc' },
  { id: 'custom', titleKey: 'entry.customTitle', descKey: 'entry.customDesc' },
  { id: 'challenge', titleKey: 'entry.challengeTitle', descKey: 'entry.challengeDesc' },
];

export function EntrySelector({ onSelect }: { onSelect: (entry: EntryPath) => void }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('entry.title')}</h2>
      <div className="flex flex-col gap-3.5 flex-1">
        {ENTRIES.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className="text-left bg-surface border-2 border-white/5 rounded-[18px] p-5 hover:border-accent/50"
          >
            <span className="block text-[19px] font-extrabold mb-1">{t(e.titleKey)}</span>
            <span className="block text-sm font-semibold text-muted">{t(e.descKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Restruktuiraj `SetupScreen.tsx`.** Novi tip koraka i tokovi:

```tsx
type Step =
  | 'entry'                                       // tri vrata
  | 'quick-difficulty' | 'quick-length'           // Quick: 2 koraka
  | 'custom-exercises' | 'custom-sliders'         // Custom: 2 koraka (Task 8)
  | 'challenge-menu'                              // lista modova
  | 'mode-difficulty' | 'mode-exercises' | 'mode-length'; // Perfektan špil (postojeći wizard)
```

Quick staza: `quick-difficulty` renderuje postojeći `DifficultySelector`; na izbor nivoa NE ide na exercises nego učita `fetchExercisesByDifficulty(level.id)` i izabere defaulte:

```tsx
function pickDefaults(exercises: Exercise[], categories: Category[]): Record<CategoryKey, Exercise> {
  const result = {} as Record<CategoryKey, Exercise>;
  for (const category of categories) {
    const key = categoryKeyForName(category.name);
    const def = exercises.find((e) => e.categoryId === category.id && e.isDefault);
    if (!def) throw new Error(`No default exercise for category ${category.name}`);
    result[key] = def;
  }
  return result;
}
```

pa prelazi na `quick-length` (`SessionLengthSelector`, sada 12/24/52) i `handleLengthSelect` (postojeći, sa `entry: 'quick'` u config-u i `gameMode: 'classic'`). Challenge staza: `challenge-menu` renderuje `ModeSelector` sa novim prop-om `modes={MODES.filter((m) => m.isChallenge)}`; izbor `perfect_deck` vodi na `mode-difficulty` → `mode-exercises` (postojeći `ExercisePicker` nad `fetchExercisesByDifficulty`) → `mode-length` — identično dosadašnjem wizard-u. Back dugme vraća korak unazad po stazi; sa `entry` na `onBack?.()`. Progres traka: `totalSteps` po stazi (quick: 3, custom: 2, challenge/perfect_deck: 5 — entry je korak 1) i segmenti se renderuju iz `totalSteps` umesto hardkodovanog `[1,2,3,4]` (`SetupScreen.tsx:136`).

- [ ] **Step 4: Testovi SetupScreen** — dodaj: „quick staza preskače izbor vežbi i posle nivoa nudi dužinu"; „challenge staza prikazuje samo challenge modove". `npm test -- Setup` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/setup/
git commit -m "feat: tri vrata (EntrySelector) + Quick staza sa default vežbama"
```

---

### Task 8: Custom tok — picker svih vežbi + slajderi

**Files:**
- Create: `src/components/setup/CustomSetup.tsx`
- Create: `src/components/setup/CustomSetup.test.tsx`
- Modify: `src/components/setup/SetupScreen.tsx` (custom staza)

**Interfaces:**
- Consumes: `fetchAllExercises` (Task 6), `ExercisePicker` (proširen tier bedžom), `drawSessionCards`, `calculateReps`, `isValidDeckSize`.
- Produces: `CustomSetup({ categories, exercises, onStart })` gde `onStart(selection: Record<CategoryKey, Exercise>, repMultiplier: number, cardCount: number)`. SetupScreen iz toga gradi `SessionConfig` sa `difficultyLevelId` nivoa čiji je `defaultRepMultiplier` najbliži izabranom multiplikatoru (za par kompatibilnost; sesija je classic pa par ne igra), `repMultiplier` = slajder, `deckSize` = slajder, `entry: 'custom'`, `gameMode: 'classic'`.

- [ ] **Step 1: Test**

```tsx
describe('CustomSetup', () => {
  it('slajderi imaju spec §2.2 granice i korake', () => {
    renderWithIntl(<CustomSetup categories={cats} exercises={all24} onStart={vi.fn()} />);
    const rep = screen.getByLabelText(/Množilac ponavljanja/) as HTMLInputElement;
    expect(rep.min).toBe('0.5'); expect(rep.max).toBe('2'); expect(rep.step).toBe('0.25');
    const cards = screen.getByLabelText(/Broj karata/) as HTMLInputElement;
    expect(cards.min).toBe('12'); expect(cards.max).toBe('52'); expect(cards.step).toBe('4');
  });
  it('start šalje selekciju + vrednosti slajdera', () => {
    const onStart = vi.fn();
    renderWithIntl(<CustomSetup categories={cats} exercises={all24} onStart={onStart} />);
    fireEvent.click(screen.getByText('Standardni sklekovi'));
    fireEvent.click(screen.getByText('Zgibovi (asistirani)'));
    fireEvent.click(screen.getByText('Iskoraci'));
    fireEvent.click(screen.getByText('Standardni trbušnjaci'));
    fireEvent.change(screen.getByLabelText(/Množilac ponavljanja/), { target: { value: '1.5' } });
    fireEvent.change(screen.getByLabelText(/Broj karata/), { target: { value: '32' } });
    fireEvent.click(screen.getByText('Kreni'));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({ push: expect.objectContaining({ name: 'Standardni sklekovi' }) }),
      1.5,
      32
    );
  });
});
```

- [ ] **Step 2: FAIL, pa implementiraj.** `CustomSetup` renderuje kategorije kao `ExercisePicker` (svih 6 po kategoriji, sortirano po tier-u, uz bedž `{t('custom.tierBadge', { tier })}` u obliku Ⅰ/Ⅱ/Ⅲ — mapiraj `['Ⅰ','Ⅱ','Ⅲ'][tier-1]`), ispod dva `<input type="range">` sa labelom i live vrednošću (`{multiplier}×`, `{cardCount}` + `{t('custom.cardsPerCategory', { count: cardCount / 4 })}`), pa dugme `custom.start` (disabled dok sve 4 kategorije nemaju izbor). Default: 1.0× / 24. Napomena: ne diraj postojeći `ExercisePicker` auto-complete (poziva `onComplete` kad su sve 4 izabrane) — za Custom napravi lokalnu selekciju u `CustomSetup` (kopiraj pattern iz `ExercisePicker.tsx:29-36`, bez auto-prelaza).

- [ ] **Step 3: SetupScreen custom staza — JEDAN korak `custom`** koji renderuje `CustomSetup` (picker + slajderi + „Kreni" na istom ekranu, tačno kako test iz Step 1 pretpostavlja; staza: entry → custom = 2 koraka). `handleCustomStart(selection, repMultiplier, cardCount)` poziva `drawSessionCards(cardCount)` i gradi draws kao `handleLengthSelect` (`SetupScreen.tsx:64-79`), config sa `entry: 'custom'`, `gameMode: 'classic'`, `difficultyLevelId` nivoa čiji je `defaultRepMultiplier` najbliži izabranom multiplikatoru.

- [ ] **Step 4: `npm test` PASS → Commit**

```bash
git add src/components/setup/
git commit -m "feat: Custom staza — slobodan izbor vežbi sa tier bedžom + slajderi 0.5–2.0×/12–52"
```

---

### Task 9: Points u čuvanju sesije + SummaryScreen ritual-lite + gost

**Files:**
- Modify: `src/components/session/SessionScreen.tsx:144-178` (settingsPayload)
- Modify: `src/components/summary/SummaryScreen.tsx` (prikaz points + gost poruka + rank-up)
- Modify: `src/lib/domain/types.ts` (`SessionResult` + `points`, `basePoints`, `multiplier`)
- Modify: `src/components/session/SessionScreen.test.tsx` (novi asserti payload-a)

**Interfaces:**
- Consumes: `calculateBasePoints`, `challengeMultiplier`, `calculatePoints` (Task 5). Tier po karti: `draw.exercise.tier` (Exercise je u `CardDrawResult.exercise`).
- Produces: `completeSession` settings dobija `points`, `base_points`, `multiplier`, `entry`, `card_count`, `rep_multiplier` UZ postojeće ključeve (`score` za challenge netaknut). `SessionResult` dobija `points: number; basePoints: number; multiplier: number;` (dopuni `types.ts`).

- [ ] **Step 1: Test — payload sadrži points i ne menja score.** U postojećem SessionScreen test fajlu dodaj test koji odigra classic sesiju (2 karte, tier poznat kroz mock exercise) i asertuje da `completeSession` mock prima `settings.points === očekivano`, `settings.base_points`, `settings.multiplier === 1`, i da za perfect_deck sesiju `settings.score` (broj oborenih) POSTOJI pored `settings.points`.

- [ ] **Step 2: FAIL, pa implementiraj u `handleNext` završnoj grani** (`SessionScreen.tsx:150-163`):

```tsx
const scored = nextDraws.map((d) => ({ reps: d.reps, completedAt: d.completedAt, tier: d.exercise.tier }));
const basePoints = calculateBasePoints(scored);
const challengeScore = computeScore(nextDraws); // postojeće: broj oborenih
const multiplier = isChallenge
  ? challengeMultiplier({ mode: 'perfect_deck', beaten: challengeScore.score, total: nextDraws.length })
  : challengeMultiplier({ mode: 'classic' });
const points = calculatePoints(basePoints, multiplier);
const pointsPayload = {
  points, base_points: basePoints, multiplier,
  entry: config.entry, card_count: config.deckSize, rep_multiplier: config.repMultiplier,
};
const settingsPayload = isChallenge
  ? { budget_seconds: ..., par_source: ..., best_score: ..., score, won, ...pauseStats, ...pointsPayload }
  : { ...pauseStats, ...pointsPayload };
```

`onFinish` result dobija `points, basePoints, multiplier`.

- [ ] **Step 3: SummaryScreen:** ispod postojećeg vremena dodaj points blok: veliki broj `{t('points.total', { points })}` + mala linija `{t('points.base', { base })} · {t('points.multiplierLabel', { multiplier })}` (multiplier formatiran na 2 decimale kad nije ceo). Za gosta (`isGuest`) zameni/dopuni postojeći `results.guestNote` sa `{t('points.guestKeep', { points })}` IZNAD postojeće note. ⓘ dugme pored points otvara postojeći `InfoModal` sa `points.formulaTitle`/`points.formula`. (Puni animirani ritual sa brojačem i vibracijom je v0.4.7 — ovde statičan prikaz.)

- [ ] **Step 3b: Rank-up proslava (spec §3.4).** Za ulogovanog korisnika SummaryScreen po mount-u poziva `getTotalXp(userId)` (posle save-a, pa zbir VEĆ sadrži ovu sesiju): `rankBefore = rankForXp(xp - result.points)`, `rankAfter = rankForXp(xp)`; ako se razlikuju → banner `{t('xp.rankUp', { symbol: rankAfter.symbol })}` + postojeći konfeti mehanizam (`SummaryScreen.tsx:47-62`). SummaryScreen dobija prop `userId: string | null` (prosleđuje `page.tsx`). Test: mock `getTotalXp` → 5100 uz `result.points = 300` (pre: 4800 = '2', posle: 'J') → banner prisutan; `getTotalXp` → 6000 uz points 300 → nema bannera. Gost: bez poziva, bez bannera.

- [ ] **Step 4: `npm test` PASS, `npx tsc --noEmit` čist → Commit**

```bash
git add src/components/session/ src/components/summary/ src/lib/domain/types.ts
git commit -m "feat: points u settings payload-u i na ekranu rezultata (uklj. gost poruku)"
```

---

### Task 10: Istorija sa padajućim detaljima + XP/zvanje na Napretku + lazy backfill poziv

**Files:**
- Modify: `src/components/progress/ProgressScreen.tsx`
- Create: `src/components/progress/HistoryRow.tsx`
- Create: `src/components/progress/HistoryRow.test.tsx`

**Interfaces:**
- Consumes: `getUserSessions` (sa `points`), `getSessionDetails`, `backfillPoints`, `getTotalXp` (Task 6); `rankForXp`, `nextRank` (Task 5).
- Produces: `HistoryRow({ session, details, onExpand })` — `details: SessionDetails | null`; red: datum + ikona moda + points (akcenat); tap poziva `onExpand(session.id)`, a expand sekcija se prikazuje kad `details !== null` (vežbe/tier, `history.totalReps`, trajanje, pauze, `history.beaten` za challenge, `history.breakdown`). VLASNIK FETCH-a je ProgressScreen: `onExpand` tamo lenjo poziva `getSessionDetails(id)` (jednom po sesiji, keš u state mapi) — HistoryRow je čist prikaz, testabilan bez mocka.

- [ ] **Step 1: Test HistoryRow** — collapsed prikazuje points i datum; klik poziva `onExpand` sa id-jem; sa `details` prop-om renderuje vežbe i ukupna ponavljanja.

- [ ] **Step 2: Implementiraj `HistoryRow`** (izvuci postojeći red iz `ProgressScreen.tsx:116-135` i proširi expand sekcijom po Interfaces bloku).

- [ ] **Step 3: ProgressScreen:**
  - Pri učitavanju: za sesije sa `points === null && status === 'completed'` pozovi `backfillPoints(session.id, session.gameMode)` (Promise.all, pa osveži lokalno stanje vraćenim vrednostima) — spec §3.5.
  - Iznad rekorda dodaj XP karticu: `{rankForXp(xp).symbol}` veliki simbol + `{xp} XP` + progress ka `nextRank` (`{xp}/{next.threshold}`); tap otvara `InfoModal` sa `xp.explanation`. `xp = await getTotalXp(userId)`.
  - Postojeća sekcija rekorda ostaje; points rekordi po dimenzijama se čitaju iz istih sesija (client-side max po ključu dimenzije: classic/perfect_deck → `gameMode|cardCount`; sprint → `sprint|sprintMinutes`; court/survive/daily → samo `gameMode` — spec §3.3; polja `cardCount`/`sprintMinutes` postoje na `SessionHistoryEntry` iz Task 6) i prikazuju pod naslovom `progress.pointsRecordsTitle` u postojećem stilu reda (`progress.cardsLine` za dimenziju broja karata, `progress.sprintDim` za trajanje).

- [ ] **Step 4: `npm test` PASS → Commit**

```bash
git add src/components/progress/
git commit -m "feat: istorija sa detaljima po sesiji, XP zvanje kartica, lazy backfill points"
```

---

### Task 11: „Ponovi poslednji trening"

**Files:**
- Create: `src/lib/domain/lastConfig.ts`
- Create: `src/lib/domain/lastConfig.test.ts`
- Modify: `src/components/session/SessionScreen.tsx` (snimi pri završetku), `src/components/landing/LandingScreen.tsx` + test, `src/app/page.tsx` (staza za repeat)

**Interfaces:**
- Produces:

```ts
export interface LastConfig {
  entry: EntryPath; gameMode: GameMode; difficultyLevelId: string;
  repMultiplier: number; deckSize: number; exerciseIds: Record<CategoryKey, string>;
  sprintMinutes?: number; // koristi Task 15
}
// OBIM v0.4.1: snima se i ponavlja SAMO za gameMode 'classic' i 'perfect_deck'.
// Sesije drugih modova NE upisuju LastConfig u v0.4.1 kodu; svaki mod task
// (14, 15, 17, 18) dodaje svoje snimanje + granu u handleRepeatLast kad mod
// nastane — repeat nikad ne sme da rekonstruiše mod koji ne ume (spec §2.5).
export function saveLastConfig(config: LastConfig): void;          // localStorage 'spil.lastConfig'
export function loadLastConfig(): LastConfig | null;                // null ako nema/nevalidan JSON
export function validateLastConfig(config: LastConfig, allExercises: Exercise[]): boolean;
// false ako deckSize nije isValidDeckSize ili bilo koji exerciseId ne postoji
```

- [ ] **Step 1: Testovi** — save/load roundtrip; load vraća null za pokvaren JSON; validate odbija deckSize 13 (stari zapis) i nepostojeću vežbu (spec §2.5). localStorage mock pattern postoji u `explained.test.ts`.

- [ ] **Step 2: FAIL → implementiraj** (čist modul, try/catch oko JSON.parse).

- [ ] **Step 3: Integracija:** SessionScreen u `handleNext` završnoj grani poziva `saveLastConfig({...})` SAMO kad je `config.gameMode` `'classic'` ili `'perfect_deck'` (v. Interfaces obim; i za gosta — localStorage nije Supabase). LandingScreen: ispod „Novi trening" dugme `landing.repeatLast`, vidljivo samo ako `loadLastConfig()` nije null; `page.tsx` dobija `handleRepeatLast`: učita `fetchAllExercises()` + `fetchDifficultyLevels()`, validira (nevalidno → sakrij dugme), rekonstruiše `SessionConfig` (za `perfect_deck` ponovi i par/budžet račun iz `SetupScreen.tsx:88-109`), `drawSessionCards(deckSize)` NOVE karte, pa isti tok kao `handleSetupStart`.

- [ ] **Step 4: `npm test` PASS → Commit**

```bash
git add src/lib/domain/lastConfig.ts src/lib/domain/lastConfig.test.ts src/components/landing/ src/components/session/SessionScreen.tsx src/app/page.tsx
git commit -m "feat: ponovi poslednji trening sa validacijom sačuvane konfiguracije"
```

---

### Task 12: Kapija faze v0.4.1 — verifikacija, CHANGELOG, tag

- [ ] **Step 1:** `npm test` (cela suita PASS) + `npx tsc --noEmit` (čist) + `npm run lint` (čist).
- [ ] **Step 2: Ručna verifikacija u browseru + NA TELEFONU:** (a) Quick: 2 tapa do prve karte, defaulti tačni po nivou; (b) Custom: slajderi, 6 vežbi po kategoriji sa bedžom, jednak broj karata po kategoriji u sesiji; (c) Perfektan špil kroz Challenge meni radi kao pre; (d) rezultati prikazuju points (gost i ulogovan); (e) istorija: stare sesije dobile points (backfill), expand detalji rade; (f) XP kartica; (g) ponovi poslednji.
- [ ] **Step 3:** CHANGELOG stavka „v0.4.1 — Temelj igrivosti" jezikom korisnika; `package.json` verzija `0.4.1`.
- [ ] **Step 4:**

```bash
git add CHANGELOG.md package.json && git commit -m "chore: verzija 0.4.1 (Temelj igrivosti)"
git tag -a v0.4.1 -m "Temelj igrivosti: tri vrata, 24 vežbe, points/XP/rekordi" && git push && git push --tags
```

**NE PRELAZI na Fazu 2 dok korisnik ne potvrdi ručnu verifikaciju.**

---

# FAZA 2 — v0.4.2 "Sprint i Dvor"

### Task 13: Registar + i18n + specijalni špilovi za Sprint i Dvor

**Files:**
- Modify: `src/lib/modes/registry.ts` (+2 unosa), `messages/sr.json` + `messages/en.json`
- Modify: `src/lib/domain/deck.ts` + `deck.test.ts` (novi `createCourtDeck`)

**Interfaces:**
- Produces: registry unosi `{ id: 'sprint', titleKey: 'modes.sprint.title', descKey: 'modes.sprint.desc', explanationKey: 'modes.sprint.explanation', isChallenge: true }` i analogno `court`; `createCourtDeck(rng?): Card[]` — 16 karata (rank 11,12,13,1 × sve 4 boje), promešano.

- [ ] **Step 1: i18n (sr + en):** `modes.sprint.{title,desc,explanation,duration}` („🏃 Sprint", „Što više karata za 3, 5 ili 10 minuta.", objašnjenje: fiksno vreme, remeš špila, karta započeta pre isteka se računa; „{minutes} min") i `modes.court.{title,desc,explanation}` („👑 Dvor", „16 najtežih karata: J, Q, K i A.", objašnjenje: rok po karti kao Perfektan špil ali uvek procena — bez tvog rekorda; bonus ×1.25; asovi su namerno unutra kao „predah" karte — As=1 ponavljanje). En ekvivalenti obavezni.

- [ ] **Step 1b: `ModeSelector.test.tsx` parametrizacija.** AUTORIZACIJA: spec errata §9.4 tačka 2. Dodavanjem sprint+court registar raste na 4 unosa i postojeći assert „tačno 2 ⓘ dugmeta" pada. Prepiši test da renderuje `<ModeSelector modes={[MODES[0], MODES[1]]} />` (eksplicitna lista od 2) — asserti ponašanja (ⓘ otvara objašnjenje, klik bira mod) ostaju identični i test postaje otporan na dalji rast registra.

- [ ] **Step 2: Test `createCourtDeck`:** 16 karata, po 4 iz svake boje, rankovi ⊂ {1,11,12,13}, bez duplikata. FAIL → implementacija:

```ts
const COURT_RANKS = [11, 12, 13, 1];
export function createCourtDeck(rng: () => number = Math.random): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of COURT_RANKS) deck.push({ suit, rank });
  return shuffleDeck(deck, rng);
}
```

- [ ] **Step 3: `npm test` PASS → Commit** `feat: registar + i18n + dvorski špil za Sprint i Dvor`

### Task 14: Dvor mod — setup i sesija

**Files:**
- Modify: `src/components/setup/SetupScreen.tsx` (challenge-menu → court staza: `mode-difficulty` → `mode-exercises` → start bez dužine)
- Modify: `src/components/session/SessionScreen.tsx` (isChallenge grana važi i za court)
- Modify: `src/components/setup/SetupScreen.test.tsx`, `SessionScreen.test.tsx`

**Interfaces:**
- Consumes: `createCourtDeck`, `calculateParSeconds`, `calculateQuotaSeconds` (postojeće), `challengeMultiplier({mode:'court',...})`.
- Produces: court sesija = `gameMode: 'court'`, `deckSize: 16`, `budgetSeconds` = ČIST par (`calculateParSeconds(totalReps, 16, difficulty)` — BEZ `resolveBudget`, spec §4.3), kvote po karti postojećim mehanizmom; settings payload sa `score`/`won` (computeScore) + points (multiplier `court`).

- [ ] **Step 1: Testovi:** SetupScreen — court staza preskače dužinu i pravi 16 draws iz court špila; SessionScreen — za `gameMode:'court'` kvota radi i multiplier je court formula (payload assert).
- [ ] **Step 2: Implementacija.** U SessionScreen zameni liniju 59: `const isChallenge = (config.gameMode === 'perfect_deck' || config.gameMode === 'court') && config.budgetSeconds != null;` i u points računu (Task 9 kod) mapiraj mode iz `config.gameMode`. Prvi-put modal: `page.tsx:37` uslov proširi na svaki challenge mod preko `hasSeenExplanation(config.gameMode)` + `MODES` lookup za explanationKey (umesto hardkodovanog perfect_deck). LastConfig (Task 11): dodaj snimanje za `'court'` u SessionScreen uslov i granu u `handleRepeatLast` (rekonstrukcija = ista kao court staza: čist par nad 16).
- [ ] **Step 3: `npm test` PASS → Commit** `feat: Dvor — 16 figura + asova, čist par, ×1.25 bonus`

### Task 15: Sprint mod

**Files:**
- Create: `src/components/setup/SprintSetup.tsx` + test (izbor 3/5/10 min)
- Modify: `src/components/setup/SetupScreen.tsx` (sprint staza), `src/components/session/SessionScreen.tsx` (sprint grana), testovi oba
- Modify: `src/lib/supabase/records.ts` + `records.test.ts` (novi `getBestPoints` — uvodi se OVDE, prvi put treba)

**Interfaces:**
- Consumes: `useCardQuota(quotaSeconds, resetKey, isPaused)` — za sprint countdown: `useCardQuota(minutes*60, 0, stopwatch.isPaused)` (deadline mehanika, resetKey konstantan = nikad se ne resetuje). Vežbe: `fetchAllExercises()` + isti slobodan picker kao Custom sa tier bedžom, BEZ slajdera (spec §4.2 „izbor vežbi kao Custom"; multiplikator fiksno 1.0) — staza: entry → challenge-menu → SprintSetup (3/5/10) → sprint-exercises → start. `difficultyLevelId` = nivo sa `defaultRepMultiplier === 1.0` iz `fetchDifficultyLevels()`.
- Produces: sprint sesija = `gameMode:'sprint'`, `repMultiplier: 1.0`, `total_cards: 52` pri insertu, draws se generišu DINAMIČKI: početni balansiran špil 52, na iscrpljenje novi `drawSessionCards(52)` (spec §4.2); settings: `sprint_minutes`, `cards_completed`, points (multiplier 1). Novi upit:

```ts
export async function getBestPoints(userId: string, gameMode: string, dimension: { cardCount?: number; sprintMinutes?: number }): Promise<number | null>;
// eq('user_id',…).eq('game_mode',…).eq('status','completed');
// cardCount → eq('total_cards', n); sprintMinutes → filter('settings->>sprint_minutes','eq',String(n));
// max settings.points klijentski. Test po mock skeletonu iz Task 6 Step 1.
```

LastConfig (Task 11): sprint sesija snima `sprintMinutes` u LastConfig; `handleRepeatLast` dobija sprint granu.

- [ ] **Step 1: Testovi:** SprintSetup nudi 3/5/10; SessionScreen sprint: (a) countdown prikazan umesto kvote po karti; (b) posle isteka (mock `useCardQuota` expired) tekuća karta se još može završiti a onda se sesija zatvara; (c) settings payload ima `sprint_minutes` i `cards_completed`, `total_cards` u createSession = 52.
- [ ] **Step 2: Implementacija.** SessionScreen: za sprint drži `queue: CardDrawResult[]` u state (init draws); kad `currentIndex === queue.length - 1` i vreme nije isteklo, appenduj novih 52 (`drawSessionCards(52)` mapirano u draws sa postojećim `calculateReps` i `exerciseByCategory` — isti kod kao `SetupScreen.tsx:66-79`, izvuci ga u helper `buildDraws(cards, exerciseByCategory, repMultiplier, withQuota)` u `src/lib/domain/draws.ts` + mini test). Kraj: u `handleNext`, ako `sprintExpired` → završi sesiju (ista završna grana, `completedDraws` = samo završene karte).
- [ ] **Step 3: `npm test` PASS, tsc čist → Commit** `feat: Sprint — 3/5/10 min countdown sa remešanjem špila`

### Task 16: Kapija faze v0.4.2

- [ ] Suita + tsc + lint čisti; ručno NA TELEFONU: Sprint countdown preživljava zaključavanje ekrana (auto-pauza pomera deadline), Dvor kvote, oba moda u istoriji sa points; CHANGELOG „v0.4.2 — Sprint i Dvor"; verzija `0.4.2`; anotirani tag `v0.4.2`; push. **STOP do potvrde korisnika.**

---

# FAZA 3 — v0.4.3 "Preživi i Karta dana"

### Task 17: Banka vremena + Preživi špil

**Files:**
- Create: `src/lib/domain/bank.ts` + `bank.test.ts`
- Modify: `src/lib/modes/registry.ts` (+`survive`), i18n oba kataloga (`modes.survive.*`), `SetupScreen.tsx` (survive staza: težina → vežbe → start, špil 52), `SessionScreen.tsx` (survive grana), testovi

**Interfaces:**
- Produces:

```ts
// bank.ts — čista timestamp aritmetika, saldo se menja SAMO na klik (spec §4.4)
export const BANK_START_SECONDS = 90;
export function applyCompletedCard(balanceSeconds: number, quotaSeconds: number, activeCardSeconds: number): number;
// = balance + quota − activeCardSeconds
export function isBankrupt(balanceSeconds: number): boolean; // <= 0
```

`activeCardSeconds` u SessionScreen = `stopwatch.elapsedSeconds − elapsedAtCardStart` (state koji se postavlja na svaki prelaz karte; stopwatch već isključuje pauze — pauza ne troši banku). UI prikaz salda: `balance − (stopwatch.elapsedSeconds − elapsedAtCardStart)` izveden u renderu. Kvota karte za dopunu: postojeći `calculateCardWeight` sa par stopama težine (čist par). Kraj: posle klika `isBankrupt` → završi sesiju sa `survived_cards: currentIndex+1`, multiplier `{mode:'survive', survivedAll: nextIndex >= 52}`; 52. završena karta = survivedAll čak i ako je saldo posle nje ≤ 0 (spec §4.4).

- [ ] **Step 1: bank.test.ts** — dopuna i trošenje; bankrot na tačno 0; commit posle svakog koraka TDD ciklusa. Config: `parSecondsPerRep`/`parTransitionSeconds` u survive config dolaze sa izabranog difficulty reda, isti pattern kao perfect_deck (`SetupScreen.tsx:88-109`).
- [ ] **Step 2: registry + i18n (sr/en): `modes.survive.{title,desc,explanation}`** („🛡 Preživi špil", banka 90 s, svaka završena karta dopunjava svoju kvotu, dokle ćeš stići kroz 52).
- [ ] **Step 3: SetupScreen survive staza + SessionScreen grana sa saldo prikazom umesto kvota-kruga; testovi (spec §10 eksplicitno):** (a) bankrot završava sesiju; (b) 52/52 daje ×1.5 u payload-u; (c) IVICA: 52. karta završena a saldo posle nje ≤ 0 → payload IPAK ima ×1.5 (spec §4.4); (d) pauza ne troši banku — SessionScreen test: pauza između dve karte, `activeCardSeconds` iz `stopwatch.elapsedSeconds` razlike ostaje isti. LastConfig: survive grana (snimanje + repeat).
- [ ] **Step 4: Suita PASS → Commit** `feat: Preživi špil — banka vremena na timestamp aritmetici`

### Task 18: Karta dana — seed, tier dana, pravila

**Files:**
- Create: `src/lib/domain/daily.ts` + `daily.test.ts`
- Modify: `src/lib/modes/registry.ts` (+`daily`), i18n (`modes.daily.*`), `SetupScreen.tsx` (daily staza: BEZ izbora — direktan start), `SessionScreen.tsx` (isChallenge važi i za daily), testovi

**Interfaces:**
- Produces:

```ts
// daily.ts
export function seededRng(seed: string): () => number;        // mulberry32 nad hash(seed)
export function dailyDateString(now: Date): string;            // lokalni 'YYYY-MM-DD'
export function dailyTier(now: Date): ExerciseTier;            // pon/čet=1, uto/pet=2, sre/sub=3, ned=2 (getDay)
export function drawDailyCards(dateString: string): Card[];    // drawSessionCards(20, seededRng(dateString))
```

Daily staza u SetupScreen: učita `fetchAllExercises` + `fetchDifficultyLevels`, vežbe = defaulti `dailyTier` (pattern `pickDefaults` iz Task 7 filtriran na tier), težina = nivo tog tiera (sortOrder === tier), budžet = ČIST par nad 20 karata, `deckSize: 20`, `entry:'challenge'`, settings pri završetku: prvi pokušaj dana → `daily_date: dailyDateString(new Date(startedAt))`; ako već postoji današnja daily sesija (upit: `game_mode='daily'` + `settings->>daily_date = danas`) → `daily_replay: true` bez `daily_date` (spec §4.5). Novi upit u `sessions.ts`: `hasDailyForDate(userId, dateString): Promise<boolean>`; za gosta localStorage ključ `spil.dailyDone.<date>`.

- [ ] **Step 1: daily.test.ts** — isti datum → identičan špil (deep equal dva poziva); različiti datumi → različit; 20 karata balansirano; `dailyTier` za poznate datume (2026-07-13 pon → 1, 2026-07-19 ned → 2).
- [ ] **Step 2: FAIL → implementiraj** (mulberry32: standardna 32-bit implementacija; hash: FNV-1a nad stringom).
- [ ] **Step 3: Staza + pravila + testovi** (uklj. replay: mock postojeće današnje sesije → payload ima `daily_replay` a nema `daily_date`). Gost: SessionScreen završna grana za `gameMode:'daily'` upisuje `localStorage['spil.dailyDone.<dateString>'] = '1'` (i za ulogovanog ne škodi, ali izvor istine za ulogovanog je upit). LastConfig: daily grana u `handleRepeatLast` = prosto pokreni daily stazu ponovo (bez parametara).
- [ ] **Step 4: Suita PASS → Commit** `feat: Karta dana — seed po datumu, tier dana, prvi pokušaj vs replay`

### Task 19: Landing čip Karte dana

**Files:**
- Modify: `src/components/landing/LandingScreen.tsx` + test, `src/app/page.tsx` (direktan ulaz u daily), i18n (`landing.dailyDone`: „🎴 ✓" / `landing.dailyPending`: „🎴 Karta dana", en ekvivalenti)

- [ ] **Step 1: Test:** ulogovan sa današnjom daily sesijom → ✓ čip; bez → pending čip; tap poziva `onStartDaily`.
- [ ] **Step 2: Implementiraj:** čip pored streak plamena (`LandingScreen` već prima streak podatke — prati isti data-flow: page.tsx prosleđuje `dailyDone` iz `hasDailyForDate` / localStorage za gosta; tap → `handleStartDaily` koji pokreće daily stazu direktno (isti kod kao SetupScreen daily staza — izvuci u helper `buildDailySession()` u `src/lib/domain/daily.ts` odn. mali modul da se ne duplira).
- [ ] **Step 3: Suita PASS → Commit** `feat: landing čip Karta dana`

### Task 20: Kapija faze v0.4.3

- [ ] Suita + tsc + lint; ručno NA TELEFONU: Preživi banka preko pauze/zaključavanja, Karta dana pre i posle ponoći (promena datuma menja špil), replay ponašanje, čip; CHANGELOG „v0.4.3 — Preživi i Karta dana"; verzija `0.4.3`; tag `v0.4.3`; push. **Kraj obima ovog plana — v0.4.4 (Džokeri) traži svoj spec pre ikakvog koda.**
