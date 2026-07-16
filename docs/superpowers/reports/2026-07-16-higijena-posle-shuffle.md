# Higijena posle SHUFFLE-a (v0.4.5) — 2026-07-16

Datum: 2026-07-16
Status: Primenjen (odobreno u sesiji 2026-07-16)
Obuhvat: čišćenje balasta zaostalog posle SHUFFLE UI rewrite-a (v0.4.5), bez
ijedne vidljive promene za korisnika. Nije izdanje: bez CHANGELOG stavke, bez
version bump-a, bez taga (presedan: higijena 2026-07-14 unutar v0.3.0).

## Šta je analizirano

- Graf importa svih modula u `src/` (uključujući relativne importe) — traženi
  moduli bez ijednog ne-test importera.
- Svih 284 i18n ključeva u `messages/sr.json`/`en.json` protiv stvarne upotrebe
  u `src/`, uključujući dinamičke konstrukcije (`t(\`quick.${key}.name\`)`,
  `t(\`setup.${groupKey}\`)`, `t(\`custom.${labelKey}\`)`) — dinamički dostižni
  ključevi isključeni iz brisanja.
- Status starih nalaza audita 2026-07-14 (N1–N15).
- Polazno stanje: 251/251 testova, `tsc --noEmit` čist, tagovi v0.1.0–v0.4.5.

## Šta je urađeno

### 1. Obrisano 48 mrtvih i18n ključeva (284 → 236, oba kataloga, parnost očuvana)

Ostaci pre-SHUFFLE interfejsa (stari landing, ugašeni ProgressScreen, stari
summary/results, stari setup copy):

- `auth.backHome`
- `custom.tierBadge`
- `history.*` — ceo namespace (`beaten`, `breakdown`, `exercises`, `totalReps`);
  živi History ekran koristi `historyScreen.*`
- `jokers.restCaption`, `jokers.restLabel`
- `landing.continueGuest`, `landing.login`, `landing.newWorkout`,
  `landing.signup`, `landing.tagline`
- `pause.historyLabel`
- `points.guestKeep`, `points.total`
- `progress.*` sve SEM `progress.cardsLine` (jedini živ, koristi ga
  `page.tsx`): `bestScore`, `classicTag`, `durationLine`, `empty`,
  `historyTitle`, `pointsRecordsTitle`, `recordsTitle`, `sprintDim`, `title`
- `results.challengeDone`, `results.guestNote`, `results.newBestScore`,
  `results.newRecord`, `results.totalTime`, `results.workoutDone` (ostatak
  `results.*` namespace-a je živ)
- `settings.title`
- `setup.beatChip`, `setup.chooseSprintDuration`, `setup.diffDescBeginner`,
  `setup.diffDescIntermediate`, `setup.diffDescAdvanced`, `setup.quarterSub`,
  `setup.quarterAria`, `setup.halfSub`, `setup.halfAria`, `setup.fullSub`,
  `setup.fullAria`
- `workout.bankQuota`, `workout.resumeWorkout`
- `xp.explanation`, `xp.label`, `xp.rankTitle`

Provereno da dinamički dostižne grupe OSTAJU: `quick.len12/24/52.*`,
`quick.level1–3.*`, `setup.group*`, `custom.warmUp/steady/raise/allIn`.

### 2. Obrisan `src/components/ui/Pill.tsx`

Jedino siroče u kodu: nula importera, nula referenci u testovima.

### 3. Dev-zavisnosti (nalazi N11/N12 iz audita 2026-07-14, sada primenjeni)

- `vite-tsconfig-paths` plugin zamenjen nativnim `resolve.tsconfigPaths: true`
  u `vitest.config.ts` (gasi deprecation upozorenje pri svakom `npm test`).
- `@vitejs/plugin-react` uklonjen iz devDependencies (nigde se ne importuje).

### 4. Dokumentacija — statusi i dopune

- `docs/superpowers/README.md`: Krug B spec status "Na reviziji" → "Završen
  (implementiran, v0.4.1–v0.4.3)".
- `src/lib/domain/README.md`: dodato 6 nedostajućih modula (`draws`, `score`,
  `jokers`, `daily`, `bank`, `lastConfig`).

### 5. `.cursor/mcp.json` → `.gitignore`

Lična Cursor konfiguracija (Supabase MCP adresa); ne pripada javnom repou.

## Šta NIJE dirano (namerno)

- Migracije, domain logika, testovi (nijedan assert).
- HTML prototipovi u `specs/assets/` — `shuffle-prototype.html` je verovatna
  referenca za v0.4.6 (Zvuk i ritam); stariji su indeksirani kao istorija.
- Završeni spec-ovi/planovi i dvodelna strategija (07-13 + aneks 07-15) —
  odluka korisnika: bez premeštanja i konsolidacije, indeks radi posao.
- Setup komponente (`EntrySelector`, `ModeSelector`, `DifficultySelector`,
  `SessionLengthSelector`…) — proverom importa potvrđeno da su SVE žive kroz
  `SetupScreen` (SHUFFLE ih je zadržao, nisu ostaci).

## Verifikacija

- `npm test` — 251/251, 40 fajlova, bez deprecation upozorenja. ✅
- `npx tsc --noEmit` — čisto. ✅
- `npm run build` — prolazi (sve 4 rute). ✅
- `npm run lint` — 25 zatečenih problema (13 grešaka), IDENTIČNO stanju pre
  čišćenja (provereno na stash-ovanom stanju). Nalaz za budućnost, van obima:
  najveći deo je u HTML/JS prototipovima u `docs/superpowers/specs/assets/`
  (eslint ih nepotrebno skenira — kandidat: ignore za `docs/` u eslint
  configu), a po par u `SessionScreen.tsx` (`react-hooks/set-state-in-effect`)
  i `useCardQuota.ts` (`react-hooks/refs`) — tajmerska logika, ne dira se bez
  spec-a. CI lint ne pokreće (samo tsc + test), pa ništa nije blokirano.
