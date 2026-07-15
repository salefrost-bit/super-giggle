# v0.4.4 — "Džokeri kao odmor" — Design Spec

Datum: 2026-07-15
Status: Draft za review
Preporučena lokacija: `docs/superpowers/specs/2026-07-15-dzokeri-design.md`
Izvor: `docs/superpowers/strategy/2026-07-15-krug-b-revizija.md` (red v0.4.4 u tabeli
sadržaja kruga); originalna ideja iz `specs/2026-07-10-phase3-brainstorm-notes.md`
§3 (superseded, istorijska referenca — otvorena pitanja odatle su ovim spec-om
zatvorena).

## 1. Cilj i obim

Ugrađeni odmor tokom treninga: povremeno se, umesto prave karte, prikazuje
kratko odbrojavanje (🃏 30 sekundi) koje se automatski završava i prelazi na
sledeću pravu kartu. Primenjuje se u **svim** ulazima i modovima (Quick,
Custom, i svih pet challenge modova — Perfektan špil, Sprint, Dvor, Preživi
špil, Karta dana) — džoker je fitnes-pauza, ne trik ograničen na challenge.

Van obima: mogućnost preskakanja odmora (odbačeno u brainstormu — odmor se
mora odraditi do kraja); korisnički podesiv broj/trajanje odmora (backlog, ako
zatreba posle testiranja uživo); vizuelna animacija tokom odmora (v0.4.5).

Sve invarijante iz `AGENTS.md` važe. Posebno bitno ovde: **tajmer invarijanta**
(§4 ispod pokazuje da se odmor implementira BEZ ijedne nove tick-akumulacije —
ponovna upotreba postojećeg `useCardQuota`) i **testovi kao ugovor** (§8 —
eksplicitna zaštita da postojeći kratki test-špilovi ostanu nepromenjeni).

## 2. Broj i raspored džokera

| Broj pravih karata u sesiji | Broj džokera |
|---|---|
| 12–20 (Quick 12, Karta dana 20, Dvor 16) | 1 |
| 24–52 (uklj. pun špil, Preživi špil, Sprint po krugu) | 2 (maksimum) |

Pravila rasporeda (sprečavaju besmislen odmor):
- **Period zagrevanja:** džoker se nikad ne javlja pre nego što je odrađeno
  5 pravih karata — korisnik se još nije umorio.
- **Bez odmora na kraju:** džoker se nikad ne javlja posle POSLEDNJE prave
  karte u sesiji — nema smisla odmor tik pred kraj.
- **Razmak:** kad ima 2 džokera, minimum 4 prave karte između njih.

Ovo je čista funkcija broja pravih karata + generator slučajnih brojeva — ne
zavisi ni od jednog drugog dela stanja sesije.

## 3. Trajanje i tok jednog odmora

- Trajanje: **30 sekundi, fiksno**, konstanta u kodu (isti presedan kao
  `TIER_FACTORS`/množioci u `score.ts` — pravilo igre, ne sadržaj; invarijanta
  7 pokriva sadržaj vežbi/težina, ne formule igre).
- Kad odbrojavanje istekne: **automatski** prelazi na sledeću pravu kartu, bez
  dodirivanja ekrana.
- **Nema dugmeta za preskakanje** — odmor se mora odraditi do kraja (odluka iz
  brainstorma).
- Dugme "Sledeća karta" je sakriveno/onemogućeno tokom odmora (nema šta da se
  klikne). Dugme "Pauza" ostaje aktivno i radi identično kao inače (§4).
- Odmor se **ne broji** u brojaču napretka ("Karta 6/24") — brojač prati
  isključivo prave karte, pre i posle odmora znači potpuno isto.

## 4. Arhitektura tajmera — ponovna upotreba `useCardQuota`, bez izmena `useStopwatch`

Ključna odluka: odmor se implementira kao **još jedan poziv postojećeg**
`useCardQuota(quotaSeconds, key, isPaused)` hook-a (identičan mehanizam koji
već pokreće kvotu po karti i Sprint odbrojavanje) — sa `quotaSeconds = 30` i
`key`-em koji se menja svaki put kad novi odmor počne (isti obrazac kao
`cardIndex` koji resetuje kvotu po karti). **Nema izmena u `useStopwatch.ts`,
`timer.ts` ni `pauseLog.ts`.**

Zašto je odmor automatski "besplatan" za budžete većine modova bez ijedne
dodatne linije u `challenge.ts`/`bank.ts`:
- Odmor se dešava striktno IZMEĐU dve prave karte — pre nego što `currentIndex`
  pređe na sledeću kartu. Perfektan špil/Dvor/Karta dana kvota kreće tek kad
  se `currentIndex` promeni; Preživi špil budžet kreće tek kad se
  `elapsedAtCardStart` postavi. Oboje se dešava TEK POSLE odmora — odmor nikad
  ne uđe u prozor merenja sledeće karte.
- **Jedini izuzetak: Sprint.** Njegovo odbrojavanje (`sprintQuota`) je
  kontinuirano (key uvek `0`, nikad se ne resetuje po karti), pa MORA dobiti
  `isResting` kao dodatni ulaz: `useCardQuota(sprintMinutes*60, 0,
  stopwatch.isPaused || isResting)`. Ovo je jedina eksplicitna izmena budžetske
  logike po modu u celom spec-u.

Interakcija sa pauzom (postojeći mehanizam iz Kruga A, nepromenjen):
odmor koristi `stopwatch.isPaused` kao svoj "paused" ulaz, identično kvotama.
Ako telefon zaključa/pozove TOKOM odmora, postojeći auto-pauza mehanizam ga
zamrzava potpuno prirodno kroz VEĆ POSTOJEĆI put — korisnik se vraća na
**postojeći** PAUZIRANO overlay (ne novi ekran), klikne "Nastavi", i odmor
nastavlja tačno odakle je stao. Redosled prikaza: PAUZIRANO overlay ima
prednost nad odmor-ekranom nad običnom kartom.

Prihvaćena posledica: **`total_duration_seconds` uključuje vreme odmora**
(štoperica normalno tiče dok se odmara — samo prava pauza je zamrznuta).
Odmor ne "krade" fer poređenje ličnih rekorda jer je isti za sve sesije
podjednako. `pause_count`/`total_pause_seconds` ostaju potpuno netaknuti
(odmor nikad ne zove `stopwatch.pause()`), pa se odmori ne mešaju sa
statistikom pravih prekida korisnika.

## 5. Novi domenski modul — `src/lib/domain/jokers.ts`

Čist, bez React/Supabase zavisnosti (isti standard kao ostatak `domain/`):

```
export const JOKER_REST_SECONDS = 30;

export function jokerCountFor(realCardCount: number): number;
// 1 za realCardCount <= 20, 2 za realCardCount >= 24 (v. tabelu §2)

export function assignJokerBreaks(
  realCardCount: number,
  rng: () => number = Math.random
): number[];
// Vraća pozicije (1-indeksirano, "posle N-te prave karte") na kojima upada
// odmor. Poštuje period zagrevanja (>= 5), zabranu poslednje karte
// (<= realCardCount - 1), minimalni razmak (>= 4) između dva odmora.
// GRACIOZNO vraća PRAZNU listu ako ne postoji validna pozicija (v. §8) —
// nikad ne baca grešku.
```

## 6. Izmene u `SessionScreen.tsx`

- `jokerBreaks` (ili za Sprint: `jokerBreaksPerLap`) se računa JEDNOM pri
  mount-u, istim RNG obrascem kao izvlačenje špila (v. §7 za Kartu dana).
- Novo stanje: `isResting: boolean`, `restKey: number`.
- `restQuota = useCardQuota(isResting ? JOKER_REST_SECONDS : null, restKey,
  stopwatch.isPaused)`.
- U `handleNext()`: kad se izračuna sledeći pravi indeks i on pogađa poziciju
  iz `jokerBreaks` (ili `nextIndex % 52` za Sprint), umesto odmah
  `setCurrentIndex`, prvo se uđe u odmor (`isResting = true`, `restKey += 1`,
  pravi indeks se čuva kao "na čekanju"). **Ovo se ubacuje na OBA mesta gde
  `handleNext()` danas pomera indeks** — u ranoj `isSurvive` grani (koja se
  vraća pre opšteg toka) i u opštem toku ispod nje; za Preživi špil to
  dodatno znači da se i `setElapsedAtCardStart` odgađa dok se odmor ne
  završi, ne samo `setCurrentIndex` (v. §4 zašto je time budžet Preživi
  špila automatski netaknut).
- Novi `useEffect` koji prati `restQuota.expired` dok je `isResting` — kad
  istekne, postavlja `currentIndex` na sačuvani pravi indeks i gasi
  `isResting`.
- Novi mali prikaz (🃏 + preostalo vreme, kratak tekst) — reuse-uje stil
  postojećih kartica (`bg-surface`/`rounded` tokeni), ne novi vizuelni sistem.
  "Sledeća karta" sakriveno/onemogućeno; "Pauza" nepromenjeno.

## 7. Rubni slučajevi

- **Sprint (beskonačan, remeša se):** pozicije odmora se računaju u odnosu na
  poziciju UNUTAR trenutnog kruga od 52 karte (`ukupno_odrađenih % 52`,
  poredeno sa `jokerBreaksPerLap` iz §2 tabele za 52 karte = 2 džokera) — isti
  raspored se ponavlja svaki krug.
- **Karta dana:** pozicije odmora izvedene iz DATUM-seed-ovanog RNG-a —
  **odvojen tok** od onog koji izvlači karte (npr. `seededRng(dateString +
  ':jokers')`), da se slučajno ne poklope sekvence. Isti raspored za sve
  korisnike tog dana, u skladu sa postojećim principom determinizma
  (`daily.ts`).
- **Mali špil (12 karata):** period zagrevanja (5) + zabrana poslednje karte
  ostavljaju pozicije 5–11 (7 mogućih) za 1 džoker — uvek izvodljivo jer je 12
  minimalna dozvoljena veličina špila (`isValidDeckSize`).
- **Gost:** odmor ništa ne upisuje u Supabase (čisto UI stanje) — identično
  ponašanje za gosta i ulogovanog, bez posebne grane koda. Ne krši "gost nikad
  ne piše u Supabase" (AGENTS.md #6) jer odmor uopšte ne piše, ni za koga.
- **Kraj sesije tokom odmora:** ne postoji kao slučaj — zabrana poslednje karte (§2) eksplicitno
  isključuje poslednju kartu iz mogućih pozicija, pa se `finishSession()` nikad
  ne poziva dok je `isResting === true`.

## 8. Zaštita postojećih testova (invarijanta #4)

Postojeći `SessionScreen.test.tsx` konstruiše vrlo kratke špilove (npr. 2
karte) radi brzine — daleko ispod stvarnog minimuma od 12 karata. Pošto
`assignJokerBreaks(2, ...)` nema validnu poziciju (5 > 2 - 1), vraća **praznu
listu** — džoker nikad ne okine, i svi postojeći testovi rade **bez ijedne
izmene**. Ovo je eksplicitan zahtev na `assignJokerBreaks`, ne slučajan
nusprodukt.

## 9. Persistencija

- **Bez migracije, bez izmena `card_draws`** — odmor se ne upisuje kao karta.
- Opciono (nice-to-have, isti obrazac kao `pause_count`): agregat u
  `sessions.settings` — `joker_breaks_taken: number` (koliko odmora je stvarno
  odrađeno tokom sesije). Aditivno, ne remeti postojeće ključeve. Ako se ovo
  preskoči za v1, nema posledica na ostatak spec-a — čisto UI polje.
- `total_duration_seconds`, `pause_count`, `total_pause_seconds` — nepromenjena
  semantika (v. §4).

## 10. i18n

Novi ključevi u OBA kataloga (`messages/sr.json` + `messages/en.json`):
- `jokers.restLabel` (npr. SR "ODMOR" / EN "REST")
- `jokers.restCaption` (kratak tekst, npr. SR "Diši. Sledeća karta stiže
  automatski." / EN "Breathe. Next card comes automatically.")
- `jokers.explanation` — tekst prvog objašnjenja (v. dole)

**Prvo objašnjenje:** ponovna upotreba POSTOJEĆEG mehanizma iz
`src/lib/modes/explained.ts` (`hasSeenExplanation`/`markExplained`, već
generalizovan na proizvoljan string ključ) sa novim ključem `'jokers'` —
modal se prikazuje jednom pre PRVE sesije ikad (bilo kog moda, bilo kog
ulaza), u istom gate-u u `page.tsx` gde već postoji provera za
`perfect_deck`. Sadržaj (nacrt, finalna redakcija na reviziji spec-a):
- SR: "🃏 Ako izvučeš džoker, dobijaš 30 sekundi odmora umesto vežbe —
  automatski se nastavlja na sledeću kartu. Ne brine se tvoje vreme po karti
  niti budžet — odmor je uvek besplatan."
- EN: "🃏 Draw a joker and you get 30 seconds of rest instead of an exercise —
  it moves on to the next card automatically. It never costs your per-card
  time or budget — rest is always free."

## 11. Testiranje

- **`jokers.test.ts` (novo, potpuno pokriven jer je čist modul):**
  `jokerCountFor` na tačnim veličinama špila (12/16/20 → 1, 24...52 → 2);
  `assignJokerBreaks` — poštuje zagrevanje/kohladu/razmak; determinizam za
  isti `rng` (bitno za Kartu dana — isti seed mora dati isti raspored); prazna
  lista za `realCardCount` ispod praga (2, 4... — v. §8).
- **`SessionScreen.test.tsx` (novi opisni blok "joker rest", sa malim ali
  validnim špilom ≥12 karata i kontrolisanim rng-om za determinizam):**
  odmor ekran se pojavljuje na očekivanoj poziciji; "Sledeća karta" nije
  klikabilna tokom odmora; automatski prelazi na sledeću kartu posle 30s bez
  klika (fake timers); "Pauza" i dalje radi i zamrzava/nastavlja odmor
  ispravno; `total_duration_seconds` uključuje vreme odmora;
  `pause_count`/`total_pause_seconds` ostaju netaknuti kad nema ručne/auto
  pauze tokom odmora.
- **Sprint-specifičan test:** vreme provedeno u odmoru se NE oduzima od
  Sprint odbrojavanja (`sprintQuota.remainingSeconds` nepromenjen tokom
  odmora).
- Svi POSTOJEĆI testovi prolaze nepromenjeni (§8 garantuje ovo za
  `SessionScreen.test.tsx`; ostali fajlovi se ne diraju).

## 12. Proces do implementacije

Po odobrenju ovog spec-a: implementacioni plan istog standarda kao dosadašnji
(bite-sized taskovi, kompletan kod, TDD, preflight gate = prethodna faza
verifikovana i tagovana, tačne komande i očekivani izlazi) → nezavisna revizija
spec-a i plana (svež kontekst) → primena nalaza → commit → implementacija →
ručna verifikacija na telefonu (obavezna — dira tajmere/pauzu u svim modovima)
→ CHANGELOG + version bump (`0.4.4`) + tag → sledeći brainstorm (v0.4.5
Animacije) tek posle ove verifikacije, u skladu sa `docs/superpowers/README.md`
checklist-om.
