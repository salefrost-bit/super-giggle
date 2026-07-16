# v0.4.5 "SHUFFLE" — Implementacioni plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ceo interfejs prelazi na SHUFFLE dizajn iz prototipa (rebrend, EN copy, 14 činova, nova biblioteka vežbi, novi ekrani Profile/History/How to Play, vizuelno nadograđena sesija) — bez izmene logike igre osim errata E1–E5.

**Architecture:** Dizajn ulazi kroz tokene u `globals.css` + male UI komponente; copy kroz kompletnu zamenu i18n kataloga (EN primaran, SR paralelan); podaci kroz aditivnu migraciju 0007 (is_active + tier/default sinhronizacija). Ekrani se rade fazno: temelj → setup/landing → sesija → Profile/History/HowToPlay.

**Tech Stack:** Next.js client komponente, Tailwind v4 `@theme` tokeni, next-intl, Supabase JS (samo kroz `src/lib/supabase/`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-16-shuffle-interfejs-design.md` (sa S1–S12). **Dizajn:** `docs/superpowers/specs/assets/shuffle-prototype.html` — sekcije se navode kao s12, s21… Čitaj sekciju PRE nego što radiš njen task; vizuelne vrednosti (boje, radijusi, razmaci, animacije) uzimaš IZ dizajna, ne izmišljaš.

## Global Constraints

- **Tajmer invarijanta:** SVA grejanja/animacije se izvode iz postojećih timestamp izvora (`quota.fraction`, `stopwatch.elapsedSeconds`, saldo banke). Prototipov `setInterval` tick-akumulator se NIKAD ne prepisuje. Interval sme samo da okida re-render.
- **i18n:** svaki string u OBA kataloga; duboka parnost ključeva (provera iz Kruga B plana Task 3). Činjenične korekcije copy-ja po spec §3 (1 džoker za ≤20 karata; Blitz score = poeni; XP iz svih sesija; Ace ≈ 2 treninga).
- **DB imena težina i kategorija se NE diraju** (spec S2): novi nazivi težina idu iz i18n po `sort_order`; `CATEGORY_KEY_TO_NAME`/`NAME_TO_SUIT` mape ključane po DB imenima ostaju.
- **Errate su jedini razlog izmene postojećih testova:** E1 (XP_RANKS), E2 (copy stringovi), E3 (biblioteka), E4 (Quick 1 ekran), E5 (taksativno: ModeSelector dialog→akordeon; SprintSetup se briše; jezik-selektor seli sa landinga; ProgressScreen se gasi). Ponašajni asserti van ove liste ostaju netaknuti.
- **`prefers-reduced-motion`:** svaka nova animacija ima reduced varijantu (bez pulsa/šrapnela/deal leta).
- **Gost ne piše u Supabase**; localStorage ključevi `spil.*` ostaju.
- **Kraj faze** = suita + `npx tsc --noEmit` + lint bez NOVIH grešaka + vizuelna provera u browseru; tag `v0.4.5` tek na kraju faze D (jedan tag za celo izdanje). Telefonska verifikacija na kraju (Task 20).
- Poeni/množioci/modovi/streak logika: NE diraju se (spec §9).

---

# FAZA A — Temelj

### Task 1: Preflight + snapshot dizajna

- [ ] **Step 1:** `git status --short` čist (pazi na poznatu `package-lock.json` zamku — `git checkout --` ako npm install obriše `@swc/helpers`); `npm test` → 33 fajla / 185+ PASS; `npx tsc --noEmit` čist.
- [ ] **Step 2:** Potvrdi da postoji `docs/superpowers/specs/assets/shuffle-prototype.html` (commitovan uz spec). Ako nije commitovan: `git add docs/superpowers/specs/assets/shuffle-prototype.html && git commit -m "docs: SHUFFLE dizajn snapshot (izvor za v0.4.5)"`.

### Task 2: Migracija 0007 — biblioteka vežbi

**Files:** Create `supabase/migrations/0007_shuffle_library.sql`

**Interfaces — Produces:** `exercises.is_active boolean not null`; finalna aktivna biblioteka tačno po spec §7 tabeli (24 aktivne, 2 po (kategorija,tier), 1 default po (kategorija,tier), tier ↔ difficulty_level_id sinhron).

- [ ] **Step 1: Napiši migraciju** — koraci OBAVEZNO ovim redom (spec §7/S1):

```sql
-- v0.4.5 SHUFFLE biblioteka. Spec: 2026-07-16-shuffle-interfejs-design.md §7 (S1).
alter table exercises add column is_active boolean not null default true;

-- 1) Penzionisanje (7) — redovi ostaju zbog istorije
update exercises set is_active = false, is_default = false where name in
  ('Široki sklekovi','Diamond sklekovi','Sklekovi s nogama na povišenju',
   'Zgibovi (asistirani)','Zgibovi širokim hvatom','Bočni iskoraci','Standardni trbušnjaci');

-- 2) Rename-ovi (isti pokret, isti id)
update exercises set name = 'Sklekovi',           name_en = 'Push-up'        where name = 'Standardni sklekovi';
update exercises set name = 'Veslanje pod stolom', name_en = 'Table row'     where name = 'Australijski zgibovi';
update exercises set name = 'Zgibovi',            name_en = 'Pull-up'        where name = 'Puni zgibovi';
update exercises set name = 'Skok čučanj',        name_en = 'Jump squat'     where name = 'Jump squats';
update exercises set name = 'Trbušnjaci',         name_en = 'Crunches'       where name = 'Trbušnjaci (crunches)';
update exercises set name_en = 'Knee push-up'   where name = 'Sklekovi na kolenima';
update exercises set name_en = 'Wall push-up'   where name = 'Sklekovi uz zid';
update exercises set name_en = 'Towel row'      where name = 'Veslanje peškirom';
update exercises set name_en = 'Superman pull'  where name = 'Superman povlačenje';
update exercises set name_en = 'Squat'          where name = 'Čučnjevi';
update exercises set name_en = 'Glute bridge'   where name = 'Glute most';
update exercises set name_en = 'Lunge'          where name = 'Iskoraci';
update exercises set name_en = 'Dead bug'       where name = 'Mrtva buba';
update exercises set name_en = 'Mountain climbers' where name = 'Planinari';
update exercises set name_en = 'Scissor kicks'  where name = 'Nožne makaze';
update exercises set name_en = 'V-up'           where name = 'V-podizanja';
update exercises set name_en = 'Bulgarian split squat' where name = 'Bugarski čučanj';

-- 3) Tier promene SA sinhronizacijom nivoa (tier→sort_order mapiranje iz 0005)
update exercises set tier = 2, difficulty_level_id = (select id from difficulty_levels where sort_order = 2) where name = 'Bugarski čučanj';
update exercises set tier = 1, difficulty_level_id = (select id from difficulty_levels where sort_order = 1) where name = 'Planinari';
update exercises set tier = 2, difficulty_level_id = (select id from difficulty_levels where sort_order = 2) where name = 'Trbušnjaci';

-- 4) is_default preslagivanje po spec §7 tabeli (D oznake)
update exercises set is_default = true  where name in ('Veslanje pod stolom','Mrtva buba') and is_active;
update exercises set is_default = false where name in ('Planinari') and is_active;
-- (postojeći defaulti koji OSTAJU: Sklekovi na kolenima, Sklekovi, Veslanje
--  peškirom, Zgibovi, Čučnjevi, Iskoraci, Skok čučanj, Trbušnjaci, Nožne makaze)

-- 5) Insert 7 novih (difficulty po tier mapiranju; Pike push-up je default Ⅲ PUSH)
insert into exercises (name, name_en, category_id, difficulty_level_id, tier, is_default)
select v.name, v.name_en, c.id, d.id, v.tier, v.is_default
from (values
  ('Propadanja na stolici','Chair dips','Guranje',2,false),
  ('Pike sklekovi','Pike push-up','Guranje',3,true),
  ('Strelac sklekovi','Archer push-up','Guranje',3,false),
  ('Biceps peškirom','Towel curl','Povlačenje',2,false),
  ('Strelac zgibovi','Archer pull-up','Povlačenje',3,false),
  ('Pištolj čučanj','Pistol squat','Noge',3,false),
  ('Podizanje nogu','Leg raises','Core',2,false)
) as v(name, name_en, category_name, tier, is_default)
join categories c on c.name = v.category_name
join difficulty_levels d on d.sort_order = v.tier;
```

- [ ] **Step 2: Primeni na Supabase, pa verifikuj invarijantu** (spec §7):

```sql
select c.name, e.tier, count(*) filter (where e.is_active) as active,
       count(*) filter (where e.is_active and e.is_default) as defaults,
       bool_and(not e.is_active or d.sort_order = e.tier) as tier_sync
from exercises e join categories c on c.id = e.category_id
join difficulty_levels d on d.id = e.difficulty_level_id
group by c.name, e.tier order by c.name, e.tier;
-- očekivano: 12 redova, active=2, defaults=1, tier_sync=true u svakom
```

- [ ] **Step 3: Commit** `feat: migracija 0007 — SHUFFLE biblioteka (is_active, rename, tier sync, 7 novih)`

### Task 3: Tokeni + UI komponente dizajn sistema

**Files:** Modify `src/app/globals.css`; Create `src/components/ui/HeatRing.tsx`, `SegmentBar.tsx`, `LiveDot.tsx`, `StatTile.tsx`, `Pill.tsx` + `src/components/ui/designSystem.test.tsx`

**Interfaces — Produces:**

```ts
// heat semantika (spec §5): čista funkcija, testabilna
export type Heat = 'ok' | 'warn' | 'danger';
export function heatFor(fraction: number): Heat;                    // >0.5 ok, >0.25 warn, inače danger
export function heatForAbsolute(seconds: number): Heat;             // On the Clock: >=15 ok, >=8 warn, inače danger (spec S11)
// HeatRing: conic prsten oko sadržaja
export function HeatRing({ fraction, children }: { fraction: number; children: ReactNode });
export function SegmentBar({ total, current }: { total: number; current: number });  // dizajn s6/s12: listovi špila
export function LiveDot({ paused, color }: { paused: boolean; color?: string });     // s5: bounce+ripple, pauza zamrzava
export function StatTile({ value, label }: { value: ReactNode; label: string });     // s14
export function Pill({ children, active, onClick }: ...);                            // s19 sprint pilule
```

- [ ] **Step 1:** U `globals.css` `@theme` dodaj (spec §5): `--color-suit-hearts: #ff5a6e; --color-suit-diamonds: #ffb340; --color-suit-spades: #ccff00; --color-suit-clubs: #fafafa; --color-joker: #b9a8ff; --color-heat-warn: #ffb340; --color-heat-danger: #ff5147; --color-court: #ffd75e;` + keyframes iz dizajna koje koristimo: `rippleK, pulseSoft, bounceDot, flameK, pausebr, spinK, panicK, badgeK, flashK, shardK` (kopiraj iz prototipa `<style>` bloka, linije 16–37) + `@media (prefers-reduced-motion: reduce)` gasi sve.
- [ ] **Step 2 (TDD):** test `heatFor(0.6)==='ok'`, `heatFor(0.5)==='warn'`, `heatFor(0.25)==='danger'`, `heatForAbsolute(15)==='ok'`, `(8)==='warn'`? — PAŽNJA granice: `heatFor`: `f > 0.5 ok`, `f > 0.25 warn`, else danger; `heatForAbsolute`: `s >= 15 ok`, `s >= 8 warn`, else danger. SegmentBar renderuje `total` segmenata, `current` označen. FAIL → implementiraj → PASS.
- [ ] **Step 3: Commit** `feat: SHUFFLE tokeni + HeatRing/SegmentBar/LiveDot/StatTile/Pill`

### Task 4: Lestvica 14 činova (errata E1)

**Files:** Modify `src/lib/domain/score.ts` (XP_RANKS), `src/lib/domain/score.test.ts`

**ERRATA CITAT (spec §11 E1):** „Zamena postojećih 6 zvanja … Menja `score.ts` konstante + testove pragova (`score.test.ts`)."

- [ ] **Step 1:** Zameni testove pragova:

```ts
describe('XP činovi (spec v0.4.5 §4)', () => {
  it('pragovi 14 činova', () => {
    expect(rankForXp(0).symbol).toBe('🃏');
    expect(rankForXp(499).symbol).toBe('🃏');
    expect(rankForXp(500).symbol).toBe('A');
    expect(rankForXp(1500).symbol).toBe('2');
    expect(rankForXp(45000).symbol).toBe('10');
    expect(rankForXp(60000).symbol).toBe('J');
    expect(rankForXp(80000).symbol).toBe('Q');
    expect(rankForXp(105000).symbol).toBe('K');
    expect(rankForXp(999999).symbol).toBe('K');
  });
  it('nextRank', () => {
    expect(nextRank(0)).toEqual({ symbol: 'A', nameKey: 'ranks.r1', threshold: 500 });
    expect(nextRank(105000)).toBeNull();
  });
});
```

- [ ] **Step 2:** Implementacija — `XP_RANKS` postaje 14 unosa `{ symbol, nameKey, threshold }` (simboli: 🃏,A,2,3,4,5,6,7,8,9,10,J,Q,K; pragovi: 0, 500, 1.500, 3.000, 5.500, 9.000, 14.000, 20.000, 27.000, 35.000, 45.000, 60.000, 80.000, 105.000; `nameKey: 'ranks.r0'…'ranks.r13'` — TOP-LEVEL i18n blok, Task 5). `rankForXp`/`nextRank` potpisi prošireni sa `nameKey`. Ažuriraj SVA mesta koja koriste rank objekat (`SummaryScreen`, Progress prikaz) — kompajler ih nalazi. PLUS (P2, E1 fixture — ne ponašajni assert): rank-up test u `SummaryScreen.test.tsx` mockuje XP vrednosti oko STARIH pragova (5100/300) — ažuriraj fixture na nove (npr. `getTotalXp → 600` uz `points 300`: pre = 300 → 🃏, posle = 600 → A, banner se prikazuje; negativan slučaj `getTotalXp → 1200` uz points 300: pre 900=A, posle 1200=A, bez bannera).
- [ ] **Step 3:** Suita + tsc → Commit `feat: lestvica 14 činova (errata E1)`

### Task 5: i18n — kompletan SHUFFLE copy (EN + SR)

**Files:** Modify `messages/en.json`, `messages/sr.json`

**Interfaces — Produces:** novi/izmenjeni blokovi: `landing`, `entry`, `quick` (STAKES/DECK SIZE/nazivi nivoa po sort_order: `quick.level1..3` + `quick.len12/24/52`), `custom`, `challengeMenu`, `modes.*` (nova display imena + long opisi iz s19), `workout` (ON THE CLOCK, TOTAL, hint…), `pause`, `joker` (breather), `results` (DECK CLEARED, ★ NEW BEST, RANK UP…), `profile`, `historyScreen`, `howToPlay`, **TOP-LEVEL blokovi `"ranks": {"r0"…"r13"}` (imena) i `"ranksDesc": {"r0"…"r13"}` (opisi iz s15 `rankInfo`)** — kanonske adrese koje koriste Taskovi 4/16/18 (P3), `auth`, `settings`. `landing.appName: "SHUFFLE"`.

- [ ] **Step 1:** EN katalog: prepiši vrednosti IZ prototipa (s15 rankInfo, s19 chModes, s21, s22, s23…) uz činjenične korekcije iz Global Constraints. Kanonska imena iz spec §3 tabele. NE briši ključeve koje logika koristi (`pause.autoLabel`, `points.*`, `xp.*` — vrednosti se osvežavaju, semantika ista).
- [ ] **Step 2:** SR katalog: iste ključeve, prevodi iz spec §3 + isti glas (Brza podela, Složi špil, Na satu, Nizak/Visok ulog, All-in, Presecanje/Pola špila/Ceo špil, PODELI MI, PROMEŠAJ I PODELI, Kako se igra, Složi ruku…). Imena činova se NE prevode (spec §4).
- [ ] **Step 3:** `layout.tsx` metadata title → "SHUFFLE". Duboka parnost provera (node one-liner iz Kruga B plana Task 3 Step 3) → OK.
- [ ] **Step 4:** `npm test` — padaju testovi sa starim stringovima; ažuriraj ih po errati E2 (vrednosti, ne ponašanje): `SetupScreen.test`, `EntrySelector.test`, `LandingScreen.test`, `page.test`, `SessionScreen.test`, `CustomSetup.test`, `ExercisePicker.test`, `ModeSelector.test`, **plus (P5): `SummaryScreen.test` (poeni/gost/NOVO ZVANJE stringovi), `StreakInfoModal.test` (copy prelazi na džoker temu), `HistoryRow.test` (`history.totalReps`)**. PAŽNJA: `modes.sprint.duration`/`setup.chooseSprintDuration` ključeve OSTAVI žive do Task 10 (SprintSetup se tek tamo briše). Samo stringovi u ovom tasku — ponašanje u Task 10. Suita zelena → Commit `feat: SHUFFLE copy oba kataloga + rebrend (errata E2)`

### Task 6: Supabase sloj — is_active, profile statistike, suit detalji

**Files:** Modify `src/lib/supabase/queries.ts`, `sessions.ts`, `records.ts` + testovi

**Interfaces — Produces:**

```ts
// queries.ts: oba exercise fetch-a dodaju .eq('is_active', true) i select 'is_active';
// Exercise tip (types.ts) dobija isActive: boolean.
// records.ts:
export interface ProfileStats { bestPoints: number | null; decksCleared: number; longestStreak: number;
  totalSeconds: number; totalReps: number; favoriteSuit: Suit | null; }
export async function getProfileStats(userId: string): Promise<ProfileStats>;
// - jedan select: from('sessions').select('total_duration_seconds, settings, completed_at, card_draws(suit, reps)')
//   .eq('user_id', userId).eq('status','completed') → klijentske sume (spec §8/S6)
// - longestStreak: novi čist domen helper (streak.ts): longestStreak(dates: string[]): number
//   — generalizacija postojeće logike na istorijski maksimum, unit test obavezan
// sessions.ts: getSessionDetails select proširen sa 'suit' → SessionDetails dobija repsBySuit: Record<Suit, number>
// sessions.ts (P9): SessionHistoryEntry/getUserSessions mapiranje prošireno sa
//   cardsCompleted: number | null (settings.cards_completed) i
//   survivedCards: number | null (settings.survived_cards) — treba ih AVG PER CARD u Task 17
```

- [ ] **Step 1 (TDD):** unit `longestStreak` (prazno→0; niz sa rupom > 2 zamrzavanja/nedelji se seče; današnji dan ne mora biti uključen); mock test `getProfileStats` (sabiranje, favorite suit = max reps, tie → prva po SUIT_TO_CATEGORY redosledu); `getSessionDetails` vraća repsBySuit.
- [ ] **Step 2:** Implementacija; `pickDefaults`/`buildDailySession` rade nad aktivnima (filter već u fetch-u); `lastConfig.validateLastConfig` odbija vežbu koja nije u aktivnoj listi (`isActive`).
- [ ] **Step 3:** Suita + tsc → Commit `feat: is_active filteri, getProfileStats, suit detalji sesije`

**FAZA A KAPIJA:** suita + tsc + lint; u browseru: app radi sa novom bibliotekom (Quick sve tri težine startuju!), Daily Deal startuje, stari ekrani još sa starim izgledom ali novim copy-jem. Commit stanja mora biti zelen.

---

# FAZA B — Landing + setup ekrani

### Task 7: Landing (s21)

**Files:** Modify `src/components/landing/LandingScreen.tsx` + test, `src/app/page.tsx`

- [ ] **Step 1 (test):** renderuje Profile čip (simbol čina za ulogovanog — `rankSymbol` prop koji `page.tsx` izvodi iz `getTotalXp` + `rankForXp`; 🃏 za gosta — spec §9), "?" dugme (`onShowHowToPlay`), streak čip (samo ulogovan), Daily čip (✓/prigušen), CTA "DEAL ME IN" (`onStartWorkout`), "Run it back" sa kontekstom iz `loadLastConfig()` (`entry` display ime + dužina), gost red "Playing as guest · Sign in". Jezik-selektor VIŠE NIJE tu (errata E5.3 — taj test se seli u Task 16).
- [ ] **Step 2:** Implementacija po s21 (raspored, čipovi, glow CTA). Props: `onShowProfile`, `onShowHowToPlay`. `page.tsx` u OVOM tasku dodaje screen stanja `profile` i `how-to-play` sa PRIVREMENIM sadržajem (`profile` → postojeći `ProgressScreen` SAMO za ulogovanog, gost → povratak na landing; `how-to-play` → postojeći `StreakInfoModal` mehanizam) — Faza D (Taskovi 16/18) ih zamenjuje pravim ekranima. Time je landing odmah izvršiv i testabilan, a Faza D ne dira landing.
- [ ] **Step 3:** Suita → Commit `feat: SHUFFLE landing (s21) — čipovi, DEAL ME IN, Run it back`

### Task 8: Tri vrata + Quick Deal jedan ekran (errata E4; s16, s17)

**Files:** Modify `src/components/setup/EntrySelector.tsx` + test; Create `src/components/setup/QuickDealSetup.tsx` + test; Modify `SetupScreen.tsx` + test

**ERRATA CITAT (E4):** „koraci `quick-difficulty` + `quick-length` se spajaju u jedan ekran `quick` (STAKES + DECK SIZE + CTA); SetupScreen testovi Quick staze se ažuriraju na novi tok."

- [ ] **Step 1 (test QuickDealSetup):** prikazuje 3 nivoa (i18n `quick.level1..3` po `sortOrder` — NE iz DB imena, spec S2) radio-stilom, 3 dužine kao kartice (12/24/52 + The Cut/Half Deck/Full Deck + ~min), CTA "SHUFFLE THE DECK". ODLUKA (P6): **High Stakes + Half Deck su predselektovani** (produkt odluka — najčešći slučaj; prototip predselektuje Low Stakes, odstupamo namerno) i CTA je UVEK aktivan. `onStart(level, deckSize)`.
- [ ] **Step 2:** Implementacija po s17 (selekcija = volt border + glow; radio krug). `SetupScreen`: staza `entry → quick` (2 koraka, brojač 1/2, 2/2 — spec S10.4); `handleLengthSelect` logika ostaje, poziva se iz `onStart`. `DifficultySelector` ostaje za korak `mode-difficulty` (koriste ga perfect_deck, court I survive staze — P7) — u ovom tasku mu zameni `DESC_KEY_BY_NAME` mehanizam i18n ključevima po `sortOrder` (spec S2).
- [ ] **Step 3:** EntrySelector reskin po s16 (ikona u pločici, boja po stazi, strelica, "Kako danas treniraš?" → i18n).
- [ ] **Step 4:** Suita (E4 ažuriranja SetupScreen testova Quick staze) → Commit `feat: tri vrata reskin + Quick Deal jedan ekran (errata E4)`

### Task 9: Build your hand + Stack the Deck (s18, s7)

**Files:** Modify `src/components/setup/ExercisePicker.tsx` + test, `CustomSetup.tsx` + test, `SetupScreen.tsx` + test (P1: izvor vežbi za mode stazu)

- [ ] **Step 0 (P1, KLJUČNO):** `mode-exercises` korak (perfect_deck/court/survive/sprint) prelazi sa `fetchExercisesByDifficulty` na **`fetchAllExercises()`** — tier tabovi zahtevaju CELU biblioteku (posle 0007 jedna težina = tačno 1 tier = 2 vežbe, pa bi 2 od 3 taba bila prazna). `fetchExercisesByDifficulty` posle ovoga koristi SAMO Quick staza (`pickDefaults`). Test: mode staza prosleđuje pickeru svih 24.
- [ ] **Step 1 (test):** ExercisePicker sa tier tabovima: po grupi tabovi Ⅰ/Ⅱ/Ⅲ (default tab — P8: mode staza = tier izabrane težine; custom = tab trenutno izabrane vežbe, inače Ⅰ; prop `initialTier?: ExerciseTier`), prikazuju se SAMO 2 vežbe aktivnog taba, grid 2 kolone, tier bedž na kartici; selekcija radi kroz tabove (izbor iz bilo kog tiera). Postojeći ponašajni assert (izbor 4 grupe → complete) ostaje.
- [ ] **Step 2:** Implementacija po s18; boje tier bedža: Ⅰ `#8fd14f`, Ⅱ heat-warn, Ⅲ heat-danger (iz prototipa). Suit ikona + naziv grupe iz i18n (PUSH/PULL/LEGS/CORE).
- [ ] **Step 3:** CustomSetup reskin po s7: aura intenziteta (radial gradient iza, opacity/scale iz `inten`), tag WARM-UP/STEADY/RAISE/ALL IN (i18n), pips, "≈ N reps in the stack" (postojeći račun), slajderi ZADRŽAVAJU korake 0.25/4 (spec §9). `inten` formula iz prototipa (linija ~1054): `((mult−0.5)/1.5)*0.55 + ((cards−12)/40)*0.45`.
- [ ] **Step 4:** Suita → Commit `feat: Build your hand tier tabovi + Stack the Deck aura`

### Task 10: Challenge meni (s19) — akordeon + Blitz pilule (errata E5.1–2)

**Files:** Modify `src/components/setup/ModeSelector.tsx` + test, `SetupScreen.tsx` + test; Delete `src/components/setup/SprintSetup.tsx` + test

**ERRATA CITAT (E5):** „(1) ModeSelector — ⓘ više ne otvara dialog nego akordeon… (2) korak `sprint` se gasi, trajanje se bira pilulama u Challenge meniju (SprintSetup komponenta i njen test se BRIŠU)."

- [ ] **Step 1 (test):** ModeSelector renderuje kartice sa bojom/glow po modu (Daily prvi — redosled: daily, perfect_deck, sprint, court, survive), ⓘ toggluje expand sa long opisom (bez `role="dialog"`), Blitz kartica ima pilule 3/5/10 (default 5) i `onSelect('sprint', { minutes })`.
- [ ] **Step 2:** Implementacija po s19; boje modova iz prototipa (daily `#b9a8ff`, perfect `#ccff00`, blitz `#ffb340`, court `#ffd75e`, onclock `#ff5147`). SetupScreen: sprint staza = `challenge-menu` (sa pilulom) → `mode-exercises` → start (bez SprintSetup koraka). P1: `handleExercisesComplete` dobija EKSPLICITNU sprint granu (`gameMode === 'sprint'` → postojeći `handleSprintStart` sa minutama iz pilule) — danas se sprint `exercises` state nikad ne puni i complete nema sprint granu, pa bez ovoga tok ćuti. Ostale staze nepromenjene. `SessionLengthSelector` reskin (The Cut/Half/Full — i18n iz Task 5) za perfect_deck stazu.
- [ ] **Step 3:** Obriši `SprintSetup.tsx` + test. Suita → Commit `feat: Challenge meni akordeon + Blitz pilule (errata E5)`

### Task 11: First-time modal + auth reskin (s22, s23)

**Files:** Modify `src/app/page.tsx` (first-run render), `src/components/auth/LoginForm.tsx`, `SignupForm.tsx` (P10: auth testovi NE postoje u repou — nema test obaveza; opciono jedan smoke render test)

- [ ] **Step 1:** First-time modal po s22: ikona moda u pločici, kicker "FIRST TIME AT THIS TABLE", long opis moda (isti i18n kao akordeon), CTA "SHUFFLE UP & DEAL" (`modes.firstRunCta`). Mehanizam `explained.ts` netaknut.
- [ ] **Step 2:** Auth forme po s23 (input stil, fokus ring volt, "Keep playing as guest →"); gost-poeni banner na SummaryScreen linkuje na signup (postojeći tok) — banner tekst iz Task 5.
- [ ] **Step 3:** Suita → Commit `feat: first-time modal + auth reskin`

**FAZA B KAPIJA:** suita + tsc + browser prolaz kroz SVE setup staze (Quick/Custom/svih 5 modova) do starta sesije.

---

# FAZA C — Sesija

### Task 12: Live session (s12 + s1/s2/s4/s5/s6)

**Files:** Modify `src/components/session/SessionScreen.tsx`, `CardDisplay.tsx`, `StopwatchDisplay.tsx` + testovi

- [ ] **Step 1 (testovi):** (a) HeatRing oko karte prima `quota.fraction`; (b) veliki kvota brojač menja boju po `heatFor` (ok/warn/danger klase); (c) SegmentBar `total = draws.length`, `current = currentIndex`; (d) toast "HALF THE DECK DOWN" vidljiv tačno kad `currentIndex === Math.floor(draws.length/2)` prvi put (state flag, nestaje posle 2.3s — `setTimeout` za UI toast je dozvoljen, nije merenje vremena); (e) štoperica u čipu sa LiveDot; (f) pauza zamrzava LiveDot (`paused` prop).
- [ ] **Step 2:** Implementacija po s12: header (LiveDot + "CARD X/Y" + stopwatch čip TOTAL), SegmentBar, veliki kvota brojač ("ON THE CLOCK" label), karta sa HeatRing (conic ring, boja/glow po heat), vinjeta `inset shadow` na danger (samo challenge modovi sa kvotom), hint tekst iz dizajna. ODLUKA (P11): karta postaje DODATNA tap-meta (isti `handleNext`, isti disabled uslovi) — dugme "Next card" OSTAJE, postojeći testovi klika na dugme prolaze netaknuti (aditivna kontrola, bez errate). Deal animacija: CSS tranzicija na promenu `currentIndex` (izleti levo rotate −16°, nova uleti odozdo — klase iz prototipa `dealPhase`; reduced-motion = bez leta). NE diraj: handleNext logiku, čuvanje, pauzu, wake lock, auto-pauzu.
- [ ] **Step 3:** Suita → Commit `feat: live session — HeatRing, SegmentBar, deal animacija, heat vinjeta`

### Task 13: Mode varijante sesije (s20)

**Files:** Modify `src/components/session/SessionScreen.tsx` + test

- [ ] **Step 1 (testovi):** Blitz: veliki countdown (iz postojećeg sprint `useCardQuota` ostatka) sa `heatFor(fraction)` bojom + traka + "CARDS CLEARED" čip; On the Clock: "TIME BANK" veliki broj sa `heatForAbsolute(saldo)` + traka + vinjeta na danger; Daily: čip "DAILY DEAL · {datum}" + footer.
- [ ] **Step 2:** Implementacija po s20 — postojeće grane SessionScreen-a dobijaju novi raspored; nikakva logika banke/countdown-a se ne menja (samo prikaz izvedenih vrednosti).
- [ ] **Step 3:** Suita → Commit `feat: mode varijante sesije (Blitz countdown, TIME BANK, Daily čip)`

### Task 14: Pauza + Joker breather (s11, s3)

**Files:** Modify `src/components/session/SessionScreen.tsx` (pauza overlay), `JokerRestScreen.tsx` + test

- [ ] **Step 1:** Pauza overlay po s11: blur pozadina, isprekidani krug `spinK`, "PAUSED" `pausebr`, "Breathe. The deck can wait.", CTA "BACK IN"; auto-pauza label ostaje ispod.
- [ ] **Step 2 (test):** JokerRestScreen: BREATHE IN/OUT smena izvedena iz `remainingSeconds` postojećeg džoker tajmera — faza = `Math.floor((30 − remaining) / 4) % 2` (8s ciklus, timestamp izvor — spec S12); koncentrični krugovi skaliraju po istoj fazi; "Next card flips itself."
- [ ] **Step 3:** Suita → Commit `feat: pauza overlay + joker breather disanje`

### Task 15: Score ritual (s8) + rank-up

**Files:** Modify `src/components/summary/SummaryScreen.tsx` + test

- [ ] **Step 1 (test):** etapno pojavljivanje (state sekvenca `stage 0→6` kroz kratke `setTimeout`-e — UI koreografija, ne merenje): badge DECK CLEARED → brojač poena raste do finalne vrednosti → čipovi (vreme, karte) → redovi po boji (iz `result.draws` grupisano) → ★ NEW BEST (postojeći uslov rekorda) / RANK UP bedž (postojeći mehanizam iz v0.4.1, novi vizual sa simbolom čina); reduced-motion = sve odmah vidljivo, brojač statičan.
- [ ] **Step 2:** Implementacija po s8 (uklj. šrapnele `shardK` + flash na NEW BEST/PERFECT; konfeti mehanizam može da se zameni šrapnelima). Gost banner sa points + signup CTA.
- [ ] **Step 3:** Suita → Commit `feat: score ritual — etape, šrapneli, RANK UP bedž`

**FAZA C KAPIJA:** suita + tsc + browser: odigraj punu sesiju svakog moda (može skraćeno The Cut); proveri reduced-motion (DevTools emulacija).

---

# FAZA D — Profile, History, How to Play

### Task 16: ProfileScreen (s14)

**Files:** Create `src/components/profile/ProfileScreen.tsx` + test; Modify `src/app/page.tsx`

- [ ] **Step 1 (test):** renderuje čin karticu (simbol, ime iz `ranks.rN`, XP progres bar `xp/nextThreshold`, "X XP to {nextName}"), 6 StatTile-ova iz `getProfileStats` (BEST SCORE, DECKS CLEARED, LONGEST STREAK, HOURS AT THE TABLE — format h:mm, TOTAL REPS, FAVORITE SUIT simbol), jokers karticu (❄️ stanje kroz džoker temu: "{n}/2" iz postojećeg `freezesLeftThisWeek`), dugme SESSION HISTORY, Settings red: jezik dropdown (seli sa landinga — E5.3, test se seli ovde) **+ Sign out dugme (P4 — odjava napušta landing, jedino mesto joj je ovde; `onSignOut` prop iz page.tsx)**. Gost: CTA za nalog umesto statistika, bez Sign out.
- [ ] **Step 2:** Implementacija po s14. `page.tsx` screen `profile` renderuje pravi ekran (zamena placeholder-a iz Task 7).
- [ ] **Step 3:** Suita → Commit `feat: ProfileScreen — čin, statistike, džokeri, settings`

### Task 17: HistoryScreen (s13)

**Files:** Create `src/components/history/HistoryScreen.tsx` + test; **Move** `src/components/progress/HistoryRow.tsx` (+ test) → `src/components/history/HistoryRow.tsx` uz reskin + AVG PER CARD + repsBySuit; Modify `src/app/page.tsx`

- [ ] **Step 1 (test):** 14-dnevni bar graf (points po danu iz sesija; današnji bar volt), mesečna paginacija (‹ › klijentsko grupisanje, broj sesija), HistoryRow: mode ikona/boja, POINTS, BEST bedž (max points te dimenzije), expand → XP (+points), PAUSED (postojeće), AVG PER CARD (spec S6 formula po modu), repsBySuit pločice; kalendar meseca (trenirani dani iz `completed_at`, danas outline). Lazy backfill poziv ostaje pri učitavanju.
- [ ] **Step 2:** Implementacija po s13. `page.tsx`: `history` ekran → HistoryScreen (dolazi se iz Profile).
- [ ] **Step 3:** Suita → Commit `feat: HistoryScreen — graf, sesije, kalendar`

### Task 18: HowToPlayScreen (s15)

**Files:** Create `src/components/howtoplay/HowToPlayScreen.tsx` + test; Modify `src/app/page.tsx`

- [ ] **Step 1 (test):** akordeoni (intro; 3 načina igre + 5 modova; jokers-in-deck), RANKS grid 14 sa opisima iz `ranks.rN`/`ranksDesc.rN`, "YOU" bedž na `rankForXp(xp)` (gost → 🃏), streak+jokers blok, About. Tap na čin prikazuje opis (kao prototip `rankSel`).
- [ ] **Step 2:** Implementacija po s15 (sa korigovanim copy-jem iz Task 5 — bez "Sudden Death", bez As=14, bez rang liste).
- [ ] **Step 3:** Suita → Commit `feat: How to Play ekran`

### Task 19: Navigacija + gašenje ProgressScreen (errata E5.3–4)

**Files:** Modify `src/app/page.tsx` + `page.test.tsx`, `LandingScreen` (ukloni placeholder rute); Delete `src/components/progress/ProgressScreen.tsx` (+ njegov deo testova; `HistoryRow` je preseljen u Task 17)

- [ ] **Step 1:** Finalna navigaciona mapa: landing → setup | profile | how-to-play; profile → history | settings(inline); summary → landing/signup. `ProgressScreen` se briše (E5.4); streak/rekord podaci koje je prikazivao žive u Profile (Task 16) i History (Task 17). Jezik-selektor test sada u ProfileScreen testu (E5.3).
- [ ] **Step 2:** Suita + tsc + lint ceo projekat → Commit `feat: finalna navigacija, ProgressScreen ugašen (errata E5)`

### Task 20: Kapija izdanja v0.4.5

- [ ] **Step 1:** `npm test` (sve zeleno) + `npx tsc --noEmit` + `npm run lint` (bez novih grešaka).
- [ ] **Step 2: Ručna verifikacija NA TELEFONU:** heat prsten + vinjeta u Perfect Deck; deal animacija; Blitz countdown preko zaključavanja ekrana; TIME BANK preko pauze; joker breathing; score ritual + RANK UP (nabij XP preko praga test sesijom); Daily čip oba stanja; Profile statistike; History kalendar/graf; How to Play; jezik SR/EN prebacivanje na svim novim ekranima; `prefers-reduced-motion`.
- [ ] **Step 3:** CHANGELOG stavka "v0.4.5 — SHUFFLE" jezikom korisnika; `package.json` verzija `0.4.5`; ažuriraj status u README indeksu i aneksu strategije.
- [ ] **Step 4:**

```bash
git add -A && git commit -m "chore: verzija 0.4.5 (SHUFFLE)"
git tag -a v0.4.5 -m "SHUFFLE: novi interfejs, 14 činova, nova biblioteka, Profile/History/How to Play"
git push && git push --tags
```

**KRAJ OBIMA.** v0.4.6 (Zvuk i ritam) traži svoj spec pre ikakvog koda.
