# v0.4.5 "SHUFFLE" — novi interfejs — design spec

Datum: 2026-07-16
Status: Revidiran — nalazi nezavisne revizije S1–S12 primenjeni; spreman za plan
Izvor dizajna: Claude Design handoff prototip (finalna verzija, EN copy),
sekcije 1–24. Snapshot HTML-a se commituje u
`docs/superpowers/specs/assets/shuffle-prototype.html` (presedan: assets/
već čuva Claude Design prototipove) — izvršilac plana čita dizajn odatle;
ŽIVI dizajn se i dalje održava u Claude Design alatu.
Odnos prema planu Kruga B: ZAMENJUJE faze v0.4.5 (animacije — odbačene) i
v0.4.6 (Napredak — apsorbovan ovde); v. §12.

## 1. Cilj

Ceo interfejs aplikacije prelazi na dizajn iz prototipa: novi brend
(SHUFFLE), novi copy (engleski primaran, kartaški glas), tri nova ekrana
(Profile, History, How to Play), vizuelno nadograđena sesija (kvota-prsten,
grejanje boja, deal animacija, score ritual) i nova biblioteka vežbi.
**Logika igre se NE menja** — svi modovi, formule poena, streak, tajmeri i
tokovi podataka ostaju iz v0.4.1–v0.4.4, osim tri eksplicitne errate (§11).

## 2. Odluke donete u brainstormu (izvor istine)

1. **Rebrend: ŠPIL → SHUFFLE** (ime repoa i interna dokumentacija ostaju).
2. **Lestvica činova: 14 umesto 6** (errata E1) — 🃏 Joker (0) → Ace (1) →
   Deuce → Trey → Four…Ten → Jack (11) → Queen (12) → King (13). As=1 i u
   igri i na lestvici — namerna narativna rima.
3. **Streak zaštita ostaje automatska** (2/nedeljno, ISO nedelja, logika iz
   `streak.ts` netaknuta) ali se PRIKAZUJE kao "Jokers up your sleeve" —
   džoker "se odigra sam" kad preskočiš dan.
4. **Biblioteka vežbi = dizajnova lista** (errata E3, migracija §7), uz
   zamenu vremenskih vežbi (Plank, Hollow hold) rep-based ekvivalentima.
5. **Engleski je primaran jezik copy-ja**; srpski katalog prati isti glas
   (tabela naziva §3). i18n invarijanta važi — oba kataloga uvek potpuna.
6. **Combo/NIZ i leaderboard NE ulaze** — formula poena je fiksna; sve
   pominjanje "daily board"-a u dizajnu se u aplikaciji izostavlja.

## 3. Imenik (kanonska imena — EN / SR)

ID-jevi u kodu i bazi se NIKAD ne menjaju; ovo su isključivo display imena
(i18n ključevi).

| Pojam (kod/id) | EN | SR |
|---|---|---|
| aplikacija | SHUFFLE | SHUFFLE |
| entry: quick | Quick Deal | Brza podela |
| entry: custom | Stack the Deck | Složi špil |
| entry: challenge | Challenge | Challenge |
| mode: perfect_deck | Perfect Deck | Perfektan špil |
| mode: sprint | Blitz | Blic |
| mode: court | The Court | Dvor |
| mode: survive | On the Clock | Na satu |
| mode: daily | Daily Deal | Dnevna podela |
| nivo: Početnik (×0.75) | Low Stakes — "Lighter hands · ×0.75" | Nizak ulog |
| nivo: Srednji (×1.0) | High Stakes — "The standard table · ×1.0" | Visok ulog |
| nivo: Napredni (×1.25) | All In — "Heavy hands · ×1.25" | All-in |
| dužina 12 | The Cut (~10 min) | Presecanje |
| dužina 24 | Half Deck (~20 min) | Pola špila |
| dužina 52 | Full Deck (~35 min) | Ceo špil |
| boje | ♥ PUSH · ♣ PULL · ♠ LEGS · ♦ CORE | ♥ GURANJE · ♣ POVLAČENJE · ♠ NOGE · ♦ CORE |
| intenzitet (Stack the Deck) | WARM-UP / STEADY / RAISE / ALL IN | ZAGREVANJE / MIRNO / PODIŽEM / ALL-IN |
| streak zaštita | Jokers up your sleeve | Džokeri iz rukava |
| CTA landing | DEAL ME IN | PODELI MI |
| ponovi poslednji | Run it back | Ponovi podelu |
| prvi-put CTA | SHUFFLE UP & DEAL | PROMEŠAJ I PODELI |
| ekran pravila | How to Play | Kako se igra |
| izbor vežbi | Build your hand | Složi ruku |

Ostali mikro-copy: preuzima se iz prototipa (EN), SR se prevodi u istom
glasu tokom implementacije, ključ-po-ključ uz EN (invarijanta 3) — ALI se
činjenične tvrdnje koriguju prema stvarnim pravilima igre (S8): (a) broj
džokera zavisi od špila — 1 za ≤20 karata, ne uvek "two per deck"; (b)
Blitz: score su POENI, "cards cleared" je čip; (c) XP daju SVE sesije, ne
samo Challenge; (d) Ace prag ≈ 2 treninga, ne "one cleared deck".
Nazivi modova u ISTORIJI starih sesija: prikazuju se nova display imena
(id je isti), što je ispravno — mod je isti, ime je novo.

**Mehanizam prikaza (S2, ključno):** imena TEŽINA i KATEGORIJA u bazi
(`difficulty_levels.name/name_en`, `categories.name/name_en`) se NE
diraju — po njima su ključane mape u kodu (`CATEGORY_KEY_TO_NAME`,
`NAME_TO_SUIT`, `DESC_KEY_BY_NAME`) i `difficultyName` u istoriji. Novi
nazivi težina (Low Stakes…) i njihovi opisi dolaze ISKLJUČIVO iz i18n
ključeva mapiranih po `sort_order` (1/2/3); `DESC_KEY_BY_NAME` se
zamenjuje tim mehanizmom. `localizedName` ostaje za VEŽBE (čija se DB
imena menjaju migracijom §7) i za kategorije-suit labele.

## 4. Lestvica činova (errata E1 — menja `XP_RANKS`)

Zamena postojećih 6 zvanja (spec Kruga B §3.4). XP korisnika se NE dira —
izvedena vrednost, samo se pragovi i simboli menjaju. Kalibracija: ~350
poena po prosečnom treningu.

| # | Simbol | Ime (EN) | Prag XP |
|---|---|---|---|
| 0 | 🃏 | The Joker | 0 |
| 1 | A | Ace | 500 |
| 2 | 2 | Deuce | 1.500 |
| 3 | 3 | Trey | 3.000 |
| 4 | 4 | Four | 5.500 |
| 5 | 5 | Five | 9.000 |
| 6 | 6 | Six | 14.000 |
| 7 | 7 | Lucky Seven | 20.000 |
| 8 | 8 | Eight | 27.000 |
| 9 | 9 | Nine | 35.000 |
| 10 | 10 | Ten | 45.000 |
| 11 | J | Jack | 60.000 |
| 12 | Q | Queen | 80.000 |
| 13 | K | King | 105.000 |

Opisi činova (za grid u How to Play) — doslovno iz prototipa (`rankInfo`).
Rank-up proslava (postojeća iz v0.4.1) prikazuje "RANK UP · J JACK" bedž u
score ritualu. SR imena činova: ne prevode se (kartaški termini + simboli).

## 5. Dizajn sistem — tokeni i komponente

Cilj: sledeći Claude Design izvoz da se mapira, ne prepisuje.

- **Tokeni u `globals.css` (@theme):** postojeći ostaju; dodaju se:
  `--color-suit-hearts #ff5a6e`, `--color-suit-diamonds #ffb340`,
  `--color-suit-spades #ccff00`, `--color-suit-clubs #fafafa`,
  `--color-joker #b9a8ff`, `--color-heat-warn #ffb340`,
  `--color-heat-danger #ff5147`, `--color-court #ffd75e`.
- **Semantika grejanja:** >50% preostalog = volt, 25–50% = warn, <25% =
  danger + panic puls + crvena vinjeta (inset shadow). IZUZETAK (S11):
  On the Clock banka nema fiksni maksimum — pragovi su apsolutni
  (<15s warn, <8s danger + vinjeta, po dizajn sekciji 20). Sve poštuje
  `prefers-reduced-motion` (bez pulsa/animacija). Sva grejanja se izvode
  iz postojećih timestamp izvora (`quota.fraction`, saldo banke) — NIKAD
  novi interval-akumulator (S12; prototipov setInterval tick se NE
  prepisuje).
- **Nove male komponente** u `src/components/ui/`: `SuitChip`, `HeatRing`
  (conic-gradient prsten oko karte/kruga), `SegmentBar` (listovi špila),
  `LiveDot` (bounce + ripple, zamrzava se u pauzi), `StatTile`,
  `ModeCard`, `Pill`. Sve stilizovane isključivo tokenima.
- Font ostaje Nunito; okvir ekrana, radijusi (44/28/16/14px), čipovi i
  glow konvencije — po prototipu.

## 6. Ekrani — mapiranje dizajn → aplikacija

| Dizajn sekcija | Ekran u aplikaciji | Karakter izmene |
|---|---|---|
| 21 Landing add-ons | `LandingScreen` | redizajn: Profile čip (simbol čina), "?" → How to Play, streak čip, Daily Deal čip (✓ / prigušeno "–"), CTA DEAL ME IN, Run it back sa kontekstom ("Quick Deal, Half Deck"), gost red "Playing as guest · Sign in". Jezik se SELI na Settings (§ ekran 24) |
| 16 Three doors | `EntrySelector` | reskin (kartice sa ikonom, bojom, strelicom; progres 1/3) |
| 17 Quick Deal | Quick staza | **spajanje 2 koraka u 1 ekran** (STAKES + DECK SIZE + CTA SHUFFLE THE DECK) — errata E4 |
| 18 Build your hand | `ExercisePicker`/`CustomSetup` picker deo | redizajn: tier tabovi Ⅰ/Ⅱ/Ⅲ po grupi (prikazuju 2 vežbe tog tiera), grid 2 kolone, tier bedž na kartici |
| 7 Stack the Deck sliders | `CustomSetup` slajderi | reskin + aura intenziteta, pips, "≈ N reps in the stack" |
| 19 Challenge menu | Challenge meni (`ModeSelector`) | redizajn: mode kartice sa bojom/glow, ⓘ otvara AKORDEON (S4: InfoModal mehanizam ostaje samo za prvi-put modale), Blitz pilule 3/5/10 inline (korak `sprint`/SprintSetup se gasi — errata E5); redosled: Daily Deal prvi |
| 12/1/2/4/5/6 Live session | `SessionScreen` + `CardDisplay` | najveći deo: kvota kao veliki brojač + HeatRing oko karte, deal animacija (izleti levo / uleti odozdo), SegmentBar progres + "HALF THE DECK DOWN" toast na 50%, štoperica u čipu (TOTAL), LiveDot, vinjeta ispod 25% kvote |
| 20 Mode variants | `SessionScreen` grane | Blitz: veliki countdown + CARDS CLEARED čip; On the Clock: TIME BANK broj + traka + vinjeta na <8s; Daily Deal: čip sa datumom + footer |
| 11 Pause overlay | pauza u `SessionScreen` | reskin: blur, rotirajući isprekidani krug, "Breathe. The deck can wait.", CTA BACK IN; auto-pauza label ostaje |
| 3 Joker breather | `JokerRestScreen` | nadogradnja: koncentrični krugovi disanja, BREATHE IN/OUT smena, ljubičasta tema, "Next card flips itself." |
| 8 Score ritual | `SummaryScreen` | etapno otkrivanje (badge DECK CLEARED → brojač poena → čipovi vreme/karte → redovi po boji → ★ NEW BEST / RANK UP bedž + šrapneli); gost banner "…guest table — make an account and they're yours for keeps." Etape su CSS/state animacije — bez novih tajmera logike |
| 22 First-time modal | prvi-put modal | reskin (ikona moda, kicker FIRST TIME AT THIS TABLE, CTA SHUFFLE UP & DEAL) |
| 14 Profile | **NOV ekran** `ProfileScreen` | čin kartica (simbol, ime, XP progres do sledećeg, "660 XP to KING ♠"), 6 stat pločica (§8), Jokers up your sleeve kartica (prikaz ❄️ stanja u džoker temi), dugme SESSION HISTORY →, red Settings (jezik) |
| 13 History | **NOV ekran** `HistoryScreen` (apsorbuje stari plan "Napredak") | bar-graf LAST 14 DAYS, mesečna paginacija sesija (‹ jul 2026 ›), redovi sesija = postojeći `HistoryRow` u novom stilu (mode ikona/boja, POINTS, BEST bedž, expand: XP/PAUSED/AVG PER CARD + reps po boji), KALENDAR meseca (trenirani dani + danas) |
| 15 How to Play | **NOV ekran** `HowToPlayScreen` | akordeoni: intro (As=1, J/Q/K vrednosti), načini igre (Quick Deal / Stack the Deck / Challenge sa 5 modova / Joker breather), RANKS OF THE DECK grid (14, "YOU" bedž na trenutnom; gost = The Joker), streak + jokers blok, About. Centralno mesto objašnjenja; ⓘ u Challenge meniju je akordeon (S4), prvi-put modali ostaju |
| 23 Sign in | `LoginForm`/`SignupForm` | reskin + gost poeni banner (kad se dolazi sa rezultata), "Keep playing as guest →" |
| 24 Settings/Language | red u Profile | jezik dropdown seli sa landinga u Profile; lista EN/SR + prigušeni budući |

Navigacija: `page.tsx` state-machine dobija ekrane `profile`, `history`,
`how-to-play` (history ostaje dostupna i iz Profile). Postojeći `progress`
ekran se GASI — sadržaj mu se deli između Profile (streak, rekordi kao BEST
SCORE pločica + points rekordi) i History (lista, kalendar, grafikoni).

## 7. Biblioteka vežbi (errata E3 — migracija 0007)

Principi: id-jevi postojećih vežbi se čuvaju gde je pokret isti (rename);
pokreti kojih više nema se PENZIONIŠU (`is_active = false`, ostaju u bazi
zbog istorije); novi pokreti se ubacuju. Aditivno: nova kolona
`is_active boolean not null default true`; podaci se ažuriraju po
presedanu migracije 0004 (update name/name_en vrednosti).

**Koraci migracije 0007 (S1 — obavezno OVIM redom, sinhronizacija tier ↔
difficulty_level_id ↔ is_default):**
1. `add column is_active boolean not null default true`.
2. Penzionisanje: `is_active = false` za 7 redova (lista dole).
3. Rename-ovi: update `name`/`name_en` za redove gde je pokret isti.
4. Tier promene SA sinhronizacijom nivoa: Bugarski čučanj tier 3→2 **i**
   `difficulty_level_id` → Srednji; Planinari tier 2→1 **i** → Početnik;
   Trbušnjaci tier 1→2 **i** → Srednji (mapiranje tier→nivo iz 0005).
5. `is_default` preslagivanje: skinuti sa penzionisanih (Assisted
   pull-ups, Sit-ups, Diamond push-ups...), postaviti po **D** oznakama u
   tabeli dole (uklj. Mrtva buba→true, Australijski zgibovi/Table row→true).
6. Insert 7 novih redova (sa `name_en`, `tier`, `difficulty_level_id` po
   tier mapiranju, `is_default` po tabeli — Pike push-up ulazi kao default).
Invarijanta na kraju migracije (ručna SQL provera): tačno 24 aktivna reda,
2 po (kategorija, tier), tačno 1 default po (kategorija, tier), i za svaki
aktivan red tier odgovara `difficulty_level_id` sort_order-u.

Finalna aktivna biblioteka (EN / SR / tier; **D** = default za Quick Deal):

| Grupa | Ⅰ | Ⅱ | Ⅲ |
|---|---|---|---|
| ♥ PUSH | Knee push-up / Sklekovi na kolenima **D**; Wall push-up / Sklekovi uz zid | Push-up / Sklekovi **D**; Chair dips / Propadanja na stolici ⊕ | Pike push-up / Pike sklekovi ⊕**D**; Archer push-up / Strelac sklekovi ⊕ |
| ♣ PULL | Towel row / Veslanje peškirom **D**; Superman pull / Superman povlačenje | Table row / Veslanje pod stolom **D** (rename od "Australijski zgibovi" — isti pokret); Towel curl / Biceps peškirom ⊕ | Pull-up / Zgibovi **D** (rename od "Puni zgibovi"); Archer pull-up / Strelac zgibovi ⊕ |
| ♠ LEGS | Squat / Čučnjevi **D**; Glute bridge / Glute most | Lunge / Iskoraci **D**; Bulgarian split squat / Bugarski čučanj (tier Ⅲ→Ⅱ) | Jump squat / Skok čučanj **D**; Pistol squat / Pištolj čučanj ⊕ |
| ♦ CORE | Dead bug / Mrtva buba **D**; Mountain climbers / Planinari (tier Ⅱ→Ⅰ) | Crunches / Trbušnjaci **D** (tier Ⅰ→Ⅱ); Leg raises / Podizanje nogu ⊕ | Scissor kicks / Nožne makaze **D**; V-up / V-podizanja |

⊕ = novi red (7). Penzionisano (7): Wide push-ups, Diamond push-ups,
Decline push-ups, Assisted pull-ups, Wide-grip pull-ups, Side lunges,
Sit-ups. Napomena: dizajnov "Plank" i "Hollow hold" (vremenske vežbe) su
zamenjeni sa Mountain climbers i (zadržanim) Scissor kicks — odluka iz
brainstorma; dizajn se koriguje u sledećoj rundi (§10).

Posledice u kodu: svi upiti vežbi filtriraju `is_active = true`
(`fetchAllExercises`, `fetchExercisesByDifficulty`); `pickDefaults` bira
među aktivnima; `lastConfig` validacija odbija penzionisanu vežbu (dugme
Run it back se sakriva); istorija starih sesija prikazuje i penzionisane
(join po id-ju radi i dalje).

Svesno prihvaćeno (S7): `backfillPoints` čita TRENUTNI tier vežbe, pa
sesije backfill-ovane posle 0007 računaju poene po novim tier-ovima (npr.
Bugarski čučanj 2.0→1.5) — pre-launch, malo podataka, bez ispravke.

## 8. Novi upiti/statistike (Profile + History)

Sve izvedeno iz postojećih tabela, bez izmene šeme:

- `getProfileStats(userId)`: BEST SCORE (max points svih sesija), DECKS
  CLEARED (broj completed sesija), LONGEST STREAK (najduži niz ikad —
  računa se iz `getCompletedSessionDates` + postojeća streak logika
  generalizovana na istorijski maksimum), HOURS AT THE TABLE
  (Σ total_duration_seconds), TOTAL REPS i FAVORITE SUIT — jedan select
  `sessions(id).card_draws(suit, reps)` za korisnika, sumiranje na
  KLIJENTU (S6; bez PostgREST agregata/RPC — pre-launch obim je mali;
  optimizacija = backlog).
- `getSessionDetails` se PROŠIRUJE da vraća i reps po boji (S6 — danas
  selektuje samo `reps` bez `suit`) za History expand.
- History mesečna paginacija: postojeći `getUserSessions` + klijentsko
  grupisanje po mesecu (broj sesija je mali; bez novog upita).
- AVG PER CARD u expand-u: `total_duration_seconds / broj ZAVRŠENIH
  karata` (S6): `settings.cards_completed` (Blitz) →
  `settings.survived_cards` (On the Clock) → inače `total_cards`.
- 14-dnevni bar-graf: Σ points po danu iz već učitane liste sesija.
- Gost: Profile/History prikazuju gost stanje — velika CTA za nalog +
  objašnjenje šta se čuva (nema upita).

## 9. Šta se NE menja (eksplicitno)

Formula poena i množioci; svi `game_mode` id-jevi i `settings` ključevi;
tajmeri/kvote/banka (sva timestamp aritmetika); streak mehanika; džoker u
špilu (30s, auto-nastavak); migracije 0001–0006; auth tok; gost pravilo;
balansirano izvlačenje; Karta dana seed; slajderi Stack the Deck zadržavaju
korake **0.25× / 4 karte** (prototipovi koraci 0.1/1 se NE preuzimaju —
S10.5); **`getBestDurationSeconds`/`getBestScore` i rekord-stezanje budžeta
Perfect Deck-a ostaju netaknuti** (S9 — hrane `resolveBudget`, nisu samo
prikaz); localStorage ključevi (`spil.*`) ostaju (rebrend ih ne dira);
`StreakInfoModal` ostaje (tap na streak čip), samo copy prelazi na džoker
temu (E2). UI testovi se prilagođavaju novom copy-ju (E2), ali ponašajni
asserti (šta se dešava, ne kako piše) ostaju — osim taksativne liste u E5.

Svesna pojednostavljenja prikaza (S9, S10): lista VREMENSKIH rekorda
(težina×dužina) i "⚡ best X/Y" se više ne prikazuju — podaci ostaju u bazi
i dalje hrane budžet; "Best times" prikaz = backlog. Dizajn **sekcija 9
(live SCORE čip + combo/NIZ) se u celosti isključuje** (S5) — poeni se
računaju tek na kraju sesije, live prikaz bi bio nova logika; backlog.
Gost na landingu: Profile čip prikazuje 🃏 (The Joker, čin 0), streak čip
ostaje sakriven kao danas (S10.3). Brojač koraka setup-a: po stazi
(Quick/Custom: 2 koraka; Challenge: 3 za modove sa setup-om) — dizajnov
"…/3" je ilustrativan (S10.4). `SessionLengthSelector` (ostaje u
perfect_deck stazi) dobija reskin sa The Cut/Half Deck/Full Deck (S10.2).

## 10. Design cleanup (nalog za sledeću Claude Design rundu — ne blokira)

1. "Sudden Death" zaostao u How to Play tekstu → "On the Clock".
2. Sekcija 10d (stari minimal landing) — obrisati (pregažena sekcijom 21).
3. RANK UP bedž dodati u score ritual (sekcija 8).
4. "counts on the daily board" → izostaviti ili označiti "coming soon".
5. Daily Deal čip: dodata i "not played yet" varijanta (aplikacija je već
   implementira po ovom spec-u).
6. Dodati sekciju 0 "Logic Charter" (pravila igre za buduće agente).
7. Biblioteka u sekciji 18 → uskladiti sa §7 (bez Plank/Hollow hold).
8. Činjenične korekcije copy-ja (S8): broj džokera zavisi od špila (1 za
   ≤20 karata); Blitz score = poeni; XP daju sve sesije; Ace ≈ 2 treninga.

## 11. Errate (jedini dozvoljeni razlozi izmene postojećeg)

- **E1 — XP_RANKS:** 6 zvanja iz spec-a Kruga B §3.4 zamenjuje lestvica od
  14 (§4). Menja `score.ts` konstante + testove pragova (`score.test.ts`).
- **E2 — Copy/i18n:** kompletna zamena vrednosti u OBA kataloga (strukture
  ključeva se proširuju po potrebi); testovi koji asertuju korisničke
  stringove ('Brzi trening', 'Srednji', 'Ceo špil (52 karte)', nazivi
  vežbi…) ažuriraju se na nove vrednosti — ponašajni asserti netaknuti.
  Metadata (`layout.tsx` title), `landing.appName` → SHUFFLE.
- **E3 — Biblioteka vežbi:** migracija 0007 (§7); testovi sa mock
  vežbama ažuriraju nazive/tier gde asertuju konkretne vrednosti.
- **E4 — Quick tok:** koraci `quick-difficulty` + `quick-length` se spajaju
  u jedan ekran `quick` (STAKES + DECK SIZE + CTA); SetupScreen testovi
  Quick staze se ažuriraju na novi tok.
- **E5 — Setup/navigacioni tokovi (S3, taksativno):**
  (1) `ModeSelector.test.tsx` — ⓘ više ne otvara dialog nego akordeon:
  asserti dialog-a se zamenjuju assertima expand sadržaja;
  (2) `SetupScreen.test.tsx` sprint staza + `SprintSetup.test.tsx` —
  korak `sprint` se gasi, trajanje se bira pilulama u Challenge meniju
  (SprintSetup komponenta i njen test se BRIŠU);
  (3) `LandingScreen.test.tsx` — test jezik-selektora se seli na
  Profile/Settings test (selektor napušta landing);
  (4) `page.test.tsx` — ekran `history` → `ProfileScreen`/`HistoryScreen`
  navigacioni asserti umesto ProgressScreen-a (ProgressScreen i njegov
  render put se BRIŠU).

## 12. Isporuka — preraspodela ostatka Kruga B

v0.4.5 apsorbuje stari v0.4.6 (Napredak) i vizuelni deo score rituala iz
starog v0.4.7. Nova mapa ostatka:

| Verzija | Ime | Sadržaj | Faze plana |
|---|---|---|---|
| v0.4.5 | SHUFFLE interfejs | ovaj spec | **A**: temelj — tokeni/komponente, i18n copy oba kataloga, rebrend, XP lestvica, migracija 0007 + upiti; **B**: setup + landing — tri vrata, Quick Deal (1 ekran), Build your hand, Stack the Deck, Challenge meni, first-time modal, auth reskin; **C**: sesija — live session vizuali, mode varijante, pauza, joker breather, score ritual + rank-up; **D**: Profile + History + How to Play + Settings/jezik + gašenje starog Progress ekrana |
| v0.4.6 | Zvuk i ritam | zvuk + vibracija (nova karta, rok ističe, oborena/izgubljena, score brojač) — samo audio/haptika, vizuali gotovi u v0.4.5 | svoj kratak spec |
| v0.4.7 | PWA | nepromenjeno (poslednja; verzionisan keš — v0.5 menja assete) | svoj kratak spec |

Svaka faza v0.4.5 plana = tag (v0.4.5-a…d ili jedan v0.4.5 na kraju —
odlučuje plan) + ručna verifikacija na telefonu (obavezno: heat/vinjeta,
deal animacija, breathing, score ritual, reduced-motion).

## 13. Testiranje

- Postojeći ponašajni testovi prolaze uz E1–E4 prilagođavanja stringova.
- Novi unit: XP lestvica (14 pragova), getProfileStats agregati (mock),
  longest-streak istorijski račun, lastConfig sa penzionisanom vežbom.
- Nove komponente: HeatRing (boje po pragovima 50/25%), SegmentBar,
  Profile/History/HowToPlay render sa mock podacima, score ritual etape
  (bez tajmera — state sekvenca), first-time modal.
- Ručno na telefonu: sve iz §12 + `prefers-reduced-motion` provera.

## 14. Backlog (dopuna)

Combo/NIZ + live SCORE čip (dizajn sekcija 9 u celosti — čeka odluku o
formuli), daily leaderboard ("daily board"), ručno igranje džokera iz
rukava, "Best times" prikaz vremenskih rekorda, agregatni RPC za profile
statistike (kad podaci porastu), SR-latinica provera copy-ja sa native
speaker-om.
