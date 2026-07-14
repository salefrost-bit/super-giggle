# Audit repoa ŠPIL — 2026-07-14

Datum: 2026-07-14
Status: Izveštaj read-only analize (ništa nije menjano; predlozi izmena su u `2026-07-14-predlozi-higijene.md`)
Obuhvat: cela struktura repoa, docs/superpowers u celosti, drift dokumentacija↔kod, `npm test` + `npx tsc --noEmit`, higijenski nalazi.

## 1. Mapa repoa — šta gde živi

```
├── AGENTS.md                  — jedina projektna instrukcija za agente (Next.js docs napomena); CLAUDE.md samo @AGENTS.md
├── README.md                  — ⚠ netaknut create-next-app šablon (nalaz N1)
├── package.json               — "trening-app" v0.1.0; skripte: dev/build/start/lint/test (vitest run)
├── next.config.ts             — prazan (default)
├── vitest.config.ts           — jsdom + vite-tsconfig-paths plugin (nalaz N11)
├── eslint.config.mjs, postcss.config.mjs, tsconfig.json — standardno
├── .env.local.example         — NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (dva ključa, dovoljno za lokalno pokretanje)
├── .cursor/rules/plan-execution.mdc — pravila izvršavanja planova za Cursor (⚠ zastareo sadržaj, nalaz N3)
├── .superpowers/              — gitignorisan radni dir brainstorming alata
├── messages/                  — i18n katalozi: sr.json + en.json (87/87 ključeva, pariran skup — provereno skriptom)
├── public/                    — ⚠ SAMO 5 default SVG-ova iz create-next-app, nijedan se ne koristi (nalaz N2)
├── docs/superpowers/
│   ├── strategy/2026-07-13-strategija-nastavka.md   — IZVOR ISTINE za dalji razvoj (krugovi A/B/C + backlog)
│   ├── specs/    — 5 spec/beleški + assets/ (Claude Design HTML prototipovi za redizajn i gamifikaciju)
│   └── plans/    — 4 implementaciona plana (MVP 28, redizajn 13, gamifikacija 15, Krug A 12 taskova)
├── supabase/
│   ├── migrations/0001_init.sql            — MVP šema (profiles, categories, difficulty_levels, exercises, sessions, session_exercises, card_draws + RLS)
│   ├── migrations/0002_seed.sql            — seed kategorija/težina/vežbi
│   ├── migrations/0003_card_value_range.sql — As=1 errata: CHECK 1–13
│   ├── migrations/0004_gamification.sql    — aditivno: par_* kolone, beat_quota, name_en + seed prevodi
│   └── phase2_gamification.sql             — ⚠ NEPRIMENJEN nacrt (achievements/challenge_results) van migrations/ (nalaz N7)
└── src/
    ├── app/            — layout (Nunito, ŠPIL metadata), page.tsx (state machine ekranâ), login/, signup/, globals.css (@theme tokeni)
    ├── components/     — auth/, landing/, setup/, session/, summary/, progress/, streak/, ui/ (InfoModal)
    ├── hooks/          — useStopwatch, useCardQuota, useWakeLock
    ├── i18n/           — LocaleProvider (default 'en', localStorage), locales.ts (registar), dbName.ts
    └── lib/
        ├── domain/     — čista logika: deck, reps, timer, summarize, challenge, streak, pauseLog, types + README (⚠ nepotpun, nalaz N5)
        ├── modes/      — registry.ts (classic + perfect_deck), explained.ts (localStorage flagovi)
        ├── supabase/   — client, queries, sessions, records + README (⚠ nepotpun, nalaz N6)
        ├── gamification/ — ⚠ SAMO zastareli README, nula koda (nalaz N4)
        └── auth/       — AuthContext
```

Git: 80 commitova, `main` sinhron sa `origin/main` (remote: `github.com/salefrost-bit/super-giggle.git`). **Nema nijednog taga.**

## 2. docs/superpowers — pregled i status dokumenata

| Dokument | Šta je | Status |
|---|---|---|
| `strategy/2026-07-13-strategija-nastavka.md` | Strategija krugova A/B/C + backlog + principi; sadrži "✅ ZAVRŠEN" banner za Krug A | **AKTUELAN — izvor istine** |
| `specs/2026-07-08-trening-app-design.md` | MVP spec (model podataka, tajmer invarijanta 4.2, arhitektura) | Završen (implementiran); principi i dalje važe |
| `plans/2026-07-08-trening-app-mvp-plan.md` | MVP plan, 28 taskova | Završen; ⚠ Global Constraints i dalje kažu "ranks 2–14, A=14" — superseded errata-om iz redizajn spec-a §5 (nalaz N13) |
| `specs/2026-07-09-mvp-visual-redesign-design.md` | Redizajn spec + As=1 errata | Završen (implementiran) |
| `plans/2026-07-09-mvp-visual-redesign-plan.md` | Redizajn plan, 13 taskova | Završen |
| `specs/2026-07-09-gamification-phase2-design.md` | Gamifikacija spec (registar modova, perfektan špil, streak, rekordi, i18n) | Završen (implementiran) |
| `plans/2026-07-09-gamification-phase2-plan.md` | Gamifikacija plan, 15 taskova | Završen |
| `specs/2026-07-10-phase3-brainstorm-notes.md` | Brainstorm beleške Faze 3 | **SUPERSEDED** — banner na vrhu postoji ✓ (traženo strategijom §7) |
| `specs/2026-07-13-krug-a-design.md` | Krug A spec | Završen (implementiran) |
| `plans/2026-07-13-krug-a-plan.md` | Krug A plan, 12 taskova + telefonska verifikacija + nalazi nezavisne revizije | Završen (implementiran); ⚠ checkbox-ovi i dalje `- [ ]` (nalaz N14) |
| `specs/assets/…` | Claude Design HTML prototipovi (redizajn, gamifikacija) | Referenca, istorijski |

Proces (brainstorm → spec → Fable revizija → plan → Fable revizija → implementacija) je dosledno dokumentovan u svakom dokumentu.

## 3. Drift dokumentacija↔kod

### 3.1 Krug A plan (12 taskova) — task-po-task provera

| Task iz plana | Dokaz u kodu | Stanje |
|---|---|---|
| T2: i18n ključevi (`common.close`, `pause.*`, `modes.*`, `streak.*`, `language.label`) | `messages/sr.json` (linije 2, 88–108) i `en.json`; skup ključeva identičan u oba (87/87) | ✅ |
| T3: Wake Lock hook | `src/hooks/useWakeLock.ts` + test — request/release/re-acquire na `visibilitychange→visible`, silent no-op fallback, tačno po planu | ✅ |
| T3/T5: montiranje + auto-pauza u SessionScreen | `SessionScreen.tsx:44` `useWakeLock(true)`; `:46` `pauseOrigin`; `:113–117` `visibilitychange` + `pagehide` listeneri (uklj. nalaz revizije #3); `:248` auto label | ✅ |
| T4: `pauseLog` čist modul + `useStopwatch` proširenje | `src/lib/domain/pauseLog.ts` (timestamp aritmetika, idempotentno) + testovi; `useStopwatch` sinhroni `Date.now()` (nalaz revizije #2 primenjen) | ✅ |
| T6: `total_pause_seconds`/`pause_count` u settings za SVE modove | `SessionScreen.tsx:152–153` (payload), `sessions.ts:63` (`SessionSettings \| ChallengeSettings`), `:121–122` (mapiranje istorije, `?? null`) | ✅ |
| T7: prikaz pauza na rezultatima/istoriji | `SummaryScreen.tsx` / `ProgressScreen.tsx` koriste `pause.summary` / `pause.historyLabel` | ✅ |
| T8: registar modova sa `explanationKey` + InfoModal + ⓘ | `src/lib/modes/registry.ts` (obe stavke sa `explanationKey`), `src/components/ui/InfoModal.tsx`, `ModeSelector.tsx` + test | ✅ |
| T9: prvi-put modal (gate pre SessionScreen) | `src/lib/modes/explained.ts` (localStorage `explained.<id>`); `page.tsx:37` gate u `handleSetupStart`, `:68–76` render pre SessionScreen | ✅ |
| T10: streak modal (landing 🔥 + Progress kartica) | `src/components/streak/StreakInfoModal.tsx` + test; `LandingScreen.tsx:10,113`; ProgressScreen render | ✅ |
| T11: registar lokala + meni jezika | `src/i18n/locales.ts` (en/sr) + test; `LandingScreen.tsx:37–48` `<select>` iz `LOCALES` | ✅ |
| T12: suite zelena + push | 96/96 testova, tsc čist, `main` = `origin/main` | ✅ |

### 3.2 Gamifikacija (uzorak)

- **Registar modova:** `registry.ts` sa `classic` + `perfect_deck`, i18n ključevi, `isChallenge` — po spec §3. ✅
- **Kvota po karti:** `useCardQuota.ts` — `deadline`-based (`pauseTimer`/`resumeTimer` iz `timer.ts`), prati `isPaused` iz štoperice; tajmer invarijanta poštovana. ✅
- **Streak:** `src/lib/domain/streak.ts` — `calculateStreak(dates, today) → { days, freezesLeftThisWeek }`, 2 zamrzavanja po ISO nedelji, sidrenje na stvaran trening — po spec §6, sa unit testovima. ✅
- **Migracija 0004:** `par_seconds_per_rep`, `beat_quota`, `name_en` kolone + seed prevodi — po spec §5, sve aditivno. ✅

### 3.3 Redizajn / As=1 errata (uzorak)

- `deck.ts:4` — `RANKS = [1..13]`. ✅
- `migrations/0003_card_value_range.sql` — drop + novi CHECK `card_value between 1 and 13`, sa komentarom-referencom na spec. ✅
- `types.ts` komentar ranka i testovi usklađeni (deck/reps testovi prolaze). ✅

### Zaključak drifta

**Nije nađen nijedan slučaj drifta kod↔dokumentacija u proverenom obuhvatu.** Kod verno prati planove, uključujući i tri dokumentovane devijacije Krug A plana (hook u `src/hooks/`, registar lokala u `src/i18n/`, gate u `page.tsx`) i nalaze nezavisne revizije (sinhroni `Date.now()`, `pagehide` belt-and-suspenders). Drift postoji samo u SMERU dokumentacija-o-kodu: nekoliko pomoćnih dokumenata opisuje staro stanje (nalazi N3, N4, N5, N6, N13 ispod).

## 4. Rezultati automatskih provera (samo zabeleženo, ništa nije popravljano)

- `npm test` → **22 test fajla, 96/96 testova prolazi** (vitest 4.1.10, ~4.4 s). Jedino upozorenje: `vite-tsconfig-paths` plugin je deprecated u korist nativnog `resolve.tsconfigPaths` (nalaz N11).
- `npx tsc --noEmit` → **čisto, exit 0**.

## 5. Nalazi

| # | Nalaz | Ozbiljnost | Preporuka (jedna rečenica) |
|---|---|---|---|
| N1 | `README.md` je netaknut create-next-app šablon — ne pominje ŠPIL, Supabase, testove ni docs/superpowers | **bitno** | Zameniti pravim README-om (pun predlog u izveštaju predloga, stavka 1). |
| N2 | `public/` sadrži isključivo 5 default SVG-ova (`file/globe/next/vercel/window.svg`); grep kroz `src/` potvrđuje 0 referenci | kozmetika | Obrisati svih 5 fajlova (lista u predlozima, stavka 6). |
| N3 | `.cursor/rules/plan-execution.mdc` kaže da je gamifikacija "NEXT UP" — a završeni su i gamifikacija i Krug A; ne pominje ni strategiju ni Krug A dokumente | **bitno** | Ažurirati pravilo tako da upućuje na strategiju kao izvor istine umesto na nabrajanje ciklusa (ili nabrajanje dopuniti). |
| N4 | `src/lib/gamification/` sadrži SAMO README koji tvrdi "Phase 2 — not yet implemented" i opisuje odbačeni model (dual-timer, achievements tabele) — gamifikacioni kod stvarno živi u `domain/` i `modes/` | **bitno** | Obrisati ceo direktorijum (ili prepisati README kao pokazivač na stvarne lokacije). |
| N5 | `src/lib/domain/README.md` ne pominje `challenge.ts`, `streak.ts` ni `pauseLog.ts` (dodate u gamifikaciji/Krugu A) | kozmetika | Dopuniti README sa tri nedostajuća modula. |
| N6 | `src/lib/supabase/README.md` ne pominje `records.ts` | kozmetika | Dodati jednu stavku za `records.ts`. |
| N7 | `supabase/phase2_gamification.sql` je neprimenjen nacrt van `migrations/`, za model koji je gamifikacioni spec eksplicitno ODBACIO (achievements su sada backlog Faze 3+) | bitno | Premestiti u `docs/superpowers/specs/assets/` ili dodati SUPERSEDED zaglavlje — otvoreno pitanje O2 ispod. |
| N8 | Nema git tagova i `package.json` je na 0.1.0 uprkos 4 završena ciklusa (MVP, redizajn, gamifikacija, Krug A) | **bitno** | Uvesti pravilo "kraj kruga = version bump + tag" (predlog u stavci 5 predloga). |
| N9 | Nema CI — testovi i typecheck se oslanjaju isključivo na disciplinu lokalnog izvršavanja | **bitno** | Dodati minimalan GitHub Actions workflow (predlog u stavci 7 predloga). |
| N10 | `layout.tsx` ima fiksno `<html lang="sr">`, a podrazumevani jezik aplikacije je engleski (`LocaleProvider` default `'en'`) | kozmetika | Odlučiti da li `lang` treba da prati aktivni lokal — otvoreno pitanje O3. |
| N11 | Vitest pri svakom pokretanju upozorava da je `vite-tsconfig-paths` plugin suvišan (Vite ima nativni `resolve.tsconfigPaths`) | kozmetika | Pri sledećoj izmeni configa preći na nativnu opciju i izbaciti plugin iz devDependencies. |
| N12 | `@vitejs/plugin-react` je u devDependencies ali se nigde ne importuje (vitest transformiše JSX kroz esbuild) | kozmetika | Ukloniti neiskorišćenu zavisnost pri sledećem `npm install` ciklusu. |
| N13 | MVP plan "Global Constraints" i dalje propisuje rankove 2–14 (A=14), što je superseded As=1 errata-om; čitalac koji krene od MVP plana dobija pogrešnu invarijantu | kozmetika | Dodati jednorednu errata napomenu na vrh MVP plana (ili osloniti se na indeks dokumenata koji status rešava — stavka 3 predloga). |
| N14 | Checkbox-ovi u sva 4 završena plana stoje neoznačeni (`- [ ]`) iako je sve implementirano | kozmetika | Ništa ne menjati retroaktivno; status rešiti kroz indeks dokumenata (stavka 3 predloga). |
| N15 | GitHub repo se zove `super-giggle` (random ime), a projekat ŠPIL/trening-app; strategija §7 pominje i misteriju vidljivosti | bitno | Razrešiti otvoreno pitanje O1 (vidljivost + eventualno preimenovanje repoa na GitHubu — bez izmena u kodu, Vercel veza se proverava u Vercel dashboardu). |

## 6. Otvorena pitanja (traže odluku korisnika — namerno NIJE odlučeno ovde)

- **O1 — `super-giggle` repo:** lokalni `main` je 1:1 sa `origin/main` (80 commitova), dakle SAV kod je push-ovan na `salefrost-bit/super-giggle`. Ono što iz ove sesije ne mogu da proverim: (a) da li je repo privatan ili javan (strategija kaže da se spolja vide samo 4 docs commita — moguće da je javno viđen neki DRUGI repo, ili fork), (b) na koji repo je Vercel zakačen. Odluka: proveriti na GitHubu/Vercelu i eventualno preimenovati repo u nešto smisleno (`spil-trening` ili sl.).
- **O2 — sudbina `supabase/phase2_gamification.sql`:** obrisati, premestiti u docs kao istorijski nacrt, ili ostaviti uz SUPERSEDED zaglavlje? Nacrt opisuje tabele koje su svesno odbačene, ali achievements jesu u backlogu pa nacrt može još da vredi.
- **O3 — `<html lang>`:** ostaviti fiksno `sr`, prebaciti na `en` (podrazumevani jezik), ili dinamički pratiti lokal (zahteva mali client-side update u `LocaleProvider`)?
- **O4 — retroaktivni tagovi:** da li pored budućeg pravila tagovanja želiš i retroaktivne tagove na commit granicama završenih ciklusa (MVP / redizajn / gamifikacija / Krug A), ili samo `v0.3.0-krug-a` na trenutni HEAD?

## 7. Rešenja (2026-07-15)

| Pitanje | Odluka | Akcija |
|---|---|---|
| **O1 — ime repoa** | Ostaje `super-giggle` | Nema preimenovanja. Vercel deploy potvrđen (`trening-app-five.vercel.app` radi). |
| **O1 — vidljivost** | Ostaje javan (public) | Nema izmene. Repo: `salefrost-bit/super-giggle`, 89 commitova, pun kod. |
| **O2 — `phase2_gamification.sql`** | Već rešeno u higijeni | Fajl je u `docs/superpowers/specs/assets/phase2_gamification.sql` sa SUPERSEDED zaglavljem; nije u `supabase/`. |
| **O3 — `<html lang>`** | Fiksno `en` | `src/app/layout.tsx` — usklađeno sa `LocaleProvider` defaultom (`en`). |
| **O4 — retroaktivni tagovi** | Da | `v0.1.0` na `47535b9` (MVP + redizajn), `v0.2.0` na `b6ea41a` (gamifikacija), `v0.3.0` već postoji na `c31b793` (Krug A + higijena). |
