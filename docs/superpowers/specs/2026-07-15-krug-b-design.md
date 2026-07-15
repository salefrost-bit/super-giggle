# Krug B — "Igrivost" — design spec

Datum: 2026-07-15
Status: Revidiran — nalazi nezavisne revizije (N1–N13, svež kontekst,
2026-07-15) primenjeni; čeka potvrdu korisnika pre plana
Nastao iz: brainstorm sesije 2026-07-15 (tri vrata, score sistem, challenge modovi)
Zamenjuje obim Kruga B iz `strategy/2026-07-13-strategija-nastavka.md` — v. aneks
`strategy/2026-07-15-krug-b-revizija.md`.

## 1. Cilj i kontekst

Krug B pretvara ŠPIL iz "aplikacije sa treningom i jednim challenge-om" u igru:
jasna tri ulaza (Quick / Custom / Challenge), jedna score formula koja sve
sesije pretvara u poene, rekordi po modu, XP koji samo raste, i pet challenge
modova. Struktura podataka OSTAJE — postojeće varijable se ne menjaju, nove
funkcije ih izvode i kombinuju ("funkcije razigravaju varijable").

Sve invarijante iz `AGENTS.md` važe. Posebno: tajmer invarijanta (timestampovi,
nikad tick), aditivne migracije, i18n za svaki novi string, registar modova,
gost ne piše u Supabase.

## 2. Tri vrata — novi korak 1 setup toka

Postojeći korak "Kako treniraš?" (Klasik/Perfektan špil) postaje ekran sa tri
kartice:

### 2.1 🏃 Quick trening
- Tok: **težina → dužina špila → start** (bez izbora vežbi).
- Zadržava 3 postojeća nivoa (`difficulty_levels`): Početnik ×0.75, Srednji
  ×1.0, Napredni ×1.25.
- Vežbe su predefinisane: svaka (kategorija, tier) kombinacija ima tačno jednu
  vežbu označenu `is_default = true`; Quick uzima defaulte tiera koji odgovara
  težini (Početnik→tier 1, Srednji→tier 2, Napredni→tier 3).
- Dužine špila: **12 / 24 / 52** karte (v. §2.4 — balansirano izvlačenje traži
  deljivost sa 4; menja postojeće 13/26, v. errata §9.1).

### 2.2 🎛 Custom trening
- Tok: **vežbe → slajderi → start**.
- Izbor vežbe po kategoriji iz CELE biblioteke (svih 6 po kategoriji), tier
  prikazan kao bedž (Ⅰ/Ⅱ/Ⅲ); tier NE filtrira izbor.
- Dva slajdera (diskretni koraci):
  - **Multiplikator ponavljanja:** 0.5× – 2.0×, korak 0.25 (7 pozicija,
    default 1.0×).
  - **Broj karata:** 12 – 52, korak 4 (default 24).
- Klasična mehanika (štoperica, bez roka po karti).

### 2.3 ⚡ Challenge
- Meni sa 5 mode kartica iz registra modova (§4), svaka sa ⓘ objašnjenjem i
  prvi-put modalom (postojeći mehanizam iz Kruga A).
- Svaki mod ima svoj mini-setup — samo parametri koje mod stvarno traži.

### 2.4 Balansirano izvlačenje (sve sesije)
Broj karata iz svake kategorije (boje) u svakoj sesiji je JEDNAK — vežbač radi
isti broj serija za svaki deo tela. `drawSessionCards` dobija novo pravilo:
N/4 karata po boji, slučajan izbor rankova unutar boje, slučajan redosled
celog špila. Važi za sve modove; zato su sve veličine špila deljive sa 4
(Quick 12/24/52, Custom korak 4, Karta dana 20, Dvor 16, Preživi 52).

### 2.5 "Ponovi poslednji trening"
Dugme na landing ekranu (ispod "Novi trening") koje ponavlja poslednju
konfiguraciju (tip ulaza + svi parametri + vežbe). Konfiguracija se čuva u
`localStorage` (radi i za gosta); dugme se ne prikazuje dok ne postoji bar
jedna završena sesija na uređaju. Sačuvana konfiguracija se validira pri
učitavanju (vežbe postoje, veličina špila važeća po §2.4) — nevažeća
konfiguracija sakriva dugme (štiti od zastarelih 13/26 zapisa posle errate).

## 3. Score sistem

### 3.1 Baza (univerzalna, sve sesije)
```
baza = Σ po završenoj karti (ponavljanja × tierFaktor(vežba))
tierFaktor: tier 1 = 1.0, tier 2 = 1.5, tier 3 = 2.0
```
- Multiplikator ponavljanja NE ulazi posebno — već je sadržan u ponavljanjima.
- Računaju se samo karte označene kao završene (`completed_at` postavljen).

### 3.2 Množilac po modu
| Mod | Množilac |
|---|---|
| Quick / Custom (klasična mehanika) | ×1 |
| Perfektan špil | ×(1 + oborene/ukupno) → do ×2 |
| Sprint | ×1 (baza je već mera brzine) |
| Dvor | ×(1 + oborene/ukupno) × 1.25 ("boss" bonus) |
| Preživi špil | ×1.5 ako se pređe svih 52 karte, inače ×1 |
| Karta dana | ×(1 + oborene/ukupno) |

`points = round(baza × množilac)`. (Termin "points" je namerno različit od
postojećeg `settings.score` koji za Perfektan špil znači BROJ OBORENIH karata
— v. §3.5 i N2 revizije.)

### 3.3 Rekordi — dimenzije po modu
Score rekord nije jedan broj po modu — definisane dimenzije (da rekord ne bi
prosto značio "najduža odigrana sesija"):
- **Quick/Custom (classic):** najbolji points po broju karata (`card_count`).
- **Perfektan špil:** najbolji points po dužini špila (12/24/52).
- **Sprint:** po trajanju (3/5/10 min) — tri odvojene kategorije rekorda.
- **Dvor / Preživi / Karta dana:** jedna kategorija po modu (špil je fiksan).
- Postojeći rekordi (najbolje vreme po kombinaciji težina×dužina — računa se
  iz svih sesija bez obzira na mod, i najbolji skor oborenih za Perfektan
  špil) OSTAJU neizmenjeni — points rekordi se dodaju pored njih.

### 3.4 XP i zvanja
- **XP = Σ points svih ZAVRŠENIH sesija** (`status = 'completed'`; napuštene
  se ne broje). Izvedena vrednost — bez nove tabele i bez kolone-brojača.
- Zvanja su univerzalni kartaški SIMBOLI (bez reči, bez prevoda): prag u XP →
  simbol: 0 → `2`, 5.000 → `J`, 15.000 → `Q`, 40.000 → `K`, 100.000 → `A`,
  250.000 → `🃏`. (Baždareno na ~350 poena po prosečnom treningu: J posle
  ~2 nedelje redovnog treniranja, Q posle ~1.5 meseca.)
- Prikaz: simbol + XP broj na Napretku; prelazak praga = proslava na ekranu
  rezultata (konfeti mehanizam već postoji). Info modal objašnjava pragove.

### 3.5 Čuvanje i retroaktivnost
- **Ključevi u `sessions.settings`: `points`, `base_points`, `multiplier`.**
  Postojeći ključ `score` (= broj oborenih karata u challenge modovima)
  OSTAJE sa nepromenjenom semantikom — koriste ga postojeći rekordi, prikaz
  "X/Y" i testovi-ugovor. Nikakva kolizija.
- Za sesije BEZ upisanog `points` (sve postojeće) radi se **lazy backfill**:
  pri prvom učitavanju istorije klijent izračuna points iz već sačuvanog
  (`card_draws.reps` + tier vežbe preko `session_exercises`) istom čistom
  funkcijom i JEDNOM ga upiše u `settings` te sesije (samo ulogovan korisnik,
  svoje sesije). Posle backfill-a su XP i lista istorije čisti upiti, bez
  ponovnog računanja.
- Score funkcije žive u `src/lib/domain/score.ts` kao čiste funkcije sa unit
  testovima. Tier faktori, množioci i XP pragovi su konstante DOMENSKE LOGIKE
  (formula igre), ne podaci u bazi — svesno odstupanje obrazloženo ovde:
  invarijanta 7 pokriva sadržaj (vežbe, težine, par parametre), a score
  formula je pravilo igre koje se menja isključivo kroz spec.

### 3.6 Score ritual i gost
- Ekran rezultata: animirani brojač baza → množilac → ukupan score (+ kratka
  vibracija na kraju, gde je podržana). Prikaz raščlanjen: "baza 480 × 1.72".
- Gost vidi score sesije (čist frontend račun), uz postojeću poruku prošireno:
  score/XP/rekordi se čuvaju samo uz nalog.

## 4. Challenge modovi — pravila

Svi novi modovi = novi unosi u `src/lib/modes/registry.ts` + prevodi + prvi-put
objašnjenje. Korak 0 se redizajnira JEDNOM u ovom krugu (tri vrata, §2);
Challenge meni renderuje kartice iz registra filtriranog po `isChallenge`,
pa dodavanje modova od tada nadalje NE dira ekran — invarijanta 5 važi u tom
obliku. Postojeći `classic` unos registra dele Quick i Custom (obe staze
prave sesije sa `game_mode: 'classic'`; ulaz se beleži u `settings.entry`).
Svi tajmeri i banke
su timestamp/deadline aritmetika (invarijanta 1); auto-pauza i Wake Lock iz
Kruga A važe automatski jer sesija ide kroz isti SessionScreen.

### 4.1 ⚡ Perfektan špil (postojeći — bez izmene mehanike)
Dobija samo score sloj (§3.2) i seli se u Challenge meni.

### 4.2 🏃 Sprint
- Setup: trajanje 3 / 5 / 10 min + izbor vežbi kao Custom (bez slajdera;
  multiplikator fiksno 1.0).
- Mehanika: countdown od deadline-a; izvuci i završi što više karata; kad se
  špil (52, balansiran) potroši — remeša se i nastavlja.
- Kraj: istek vremena zatvara sesiju posle tekuće karte (karta započeta pre
  isteka se računa ako se završi).
- Rekordi po trajanju (3/5/10 = tri odvojene kategorije rekorda, v. §3.3).
- Upis u bazu: `difficulty_level_id` = Srednji (multiplikator 1.0 se poklapa
  sa default-om), `total_cards` = 52 fiksno (jedan prolaz špila; NOT NULL
  kolona traži vrednost na startu), stvaran broj završenih karata u
  `settings.cards_completed`.

### 4.3 👑 Dvor
- Špil: 16 karata — J, Q, K, A u sve 4 boje (4 po boji — balansirano).
- Mehanika: rok po karti kao Perfektan špil, ali budžet je UVEK čist par
  (bez stezanja na rekord×1.05 iz `resolveBudget` — Dvor je ponovljiv "boss
  fight" sa stabilnim pravilima; napredak se meri points rekordom).
- Setup: težina (za par sekunde/rep) + vežbe; bez izbora dužine.
- Score: ×(1 + oborene/ukupno) × 1.25.

### 4.4 🛡 Preživi špil
- Špil: ceo (52, balansiran).
- Banka vremena: start **90 s**. Završetak karte DODAJE banci kvotu te karte
  (čist par račun, kao Dvor); od banke se oduzima proteklo AKTIVNO vreme
  karte — pauza (i auto-pauza iz Kruga A) pomera timestampove i NE troši
  banku (isti model poverenja kao postojeća kvota Perfektnog špila). Saldo
  se menja samo na klik "sledeća karta" (timestamp aritmetika, bez tick-a);
  UI prikazuje procenu salda izvedenu iz timestampova.
- Kraj: banka ≤ 0 posle klika → sesija se završava; points = baza do tog
  trenutka. Završena 52. karta = pređen špil → ×1.5, BEZ OBZIRA na saldo
  posle nje (kraj se proverava tek za sledeću kartu, koje nema).
- Setup: težina + vežbe.

### 4.5 🎴 Karta dana
- Špil: 20 karata (5 po kategoriji), determinističi izvučen iz seed-a =
  lokalni datum (`YYYY-MM-DD`) — isti za sve korisnike tog dana unutar iste
  vremenske zone (svesno prihvaćeno; bitno tek uz budući leaderboard), radi
  offline. `daily_date` se fiksira na lokalni datum STARTA sesije — ponoć
  tokom treninga ne menja ništa.
- Tier dana rotira po danu u nedelji: pon/čet = tier 1, uto/pet = tier 2,
  sre/sub = tier 3, ned = tier 2. Vežbe = defaulti tog tiera — BEZ izbora
  (u tome je poenta: svi rade isto).
- Mehanika: rok po karti kao Perfektan špil, ali UVEK čist par bez stezanja
  na rekord (poenta "svi rade isto" ne trpi personalizovan budžet); par za
  tier dana koristi odgovarajući difficulty red: tier 1→Početnik, 2→Srednji,
  3→Napredni.
- Prvi pokušaj dana upisuje `daily_date`; ponovno igranje istog dana upisuje
  `daily_replay: true` i BEZ `daily_date`. Čip i rekord Karte dana ključaju
  po prisustvu `daily_date`. Replay ULAZI u XP (svesno: XP meri uložen trud,
  ne fer poređenje — za poređenja služe rekordi).
- Nema posebnog dnevnog streak-a — postojeći streak već broji svaku završenu
  sesiju; čip na landingu je samo status današnje Karte dana.
- Landing čip: "🎴 ✓" (danas odigrano) / "🎴 –", pored streak plamena; tap
  vodi pravo u mod. Stanje za gosta u `localStorage`, za korisnika iz baze.

### 4.6 Setup parametri po modu (rezime)
| Mod | Težina | Vežbe | Dužina/Trajanje |
|---|---|---|---|
| Perfektan špil | ✓ | ✓ | 12/24/52 |
| Sprint | – (1.0) | ✓ | 3/5/10 min |
| Dvor | ✓ | ✓ | fiksno 16 |
| Preživi | ✓ | ✓ | fiksno 52 |
| Karta dana | – (tier dana) | – (defaulti) | fiksno 20 |

## 5. Biblioteka vežbi — 24 vežbe

Šema: `exercises` dobija `tier smallint not null` (1–3) i `is_default boolean
not null default false` (aditivna migracija 0005 + prošireni seed). Tačno
jedna default vežba po (kategorija, tier) — postojećih 12 vežbi postaju
defaulti svojih tier-ova (kontinuitet sa dosadašnjim ponašanjem).

Postojeća kolona `difficulty_level_id` na `exercises` ostaje (aditivnost);
posle ovog kruga izbor vežbi je vođen tier-om, a težina služi za
multiplikator/par. Tier postojećih 12 se izvodi iz dosadašnjeg nivoa.

| Kategorija | Tier | Vežba (SR) | Vežba (EN) | Default |
|---|---|---|---|---|
| Guranje | 1 | Sklekovi na kolenima | Knee push-ups | ✓ |
| Guranje | 1 | Sklekovi uz zid | Wall push-ups | |
| Guranje | 2 | Standardni sklekovi | Standard push-ups | ✓ |
| Guranje | 2 | Široki sklekovi | Wide push-ups | |
| Guranje | 3 | Diamond sklekovi | Diamond push-ups | ✓ |
| Guranje | 3 | Sklekovi s nogama na povišenju | Decline push-ups | |
| Povlačenje | 1 | Veslanje peškirom | Towel rows | ✓ |
| Povlačenje | 1 | Superman povlačenje | Superman pulls | |
| Povlačenje | 2 | Zgibovi (asistirani) | Assisted pull-ups | ✓ |
| Povlačenje | 2 | Australijski zgibovi | Inverted rows | |
| Povlačenje | 3 | Puni zgibovi | Full pull-ups | ✓ |
| Povlačenje | 3 | Zgibovi širokim hvatom | Wide-grip pull-ups | |
| Noge | 1 | Čučnjevi | Squats | ✓ |
| Noge | 1 | Glute most | Glute bridges | |
| Noge | 2 | Iskoraci | Lunges | ✓ |
| Noge | 2 | Bočni iskoraci | Side lunges | |
| Noge | 3 | Jump squats | Jump squats | ✓ |
| Noge | 3 | Bugarski čučanj | Bulgarian split squats | |
| Core | 1 | Trbušnjaci (crunches) | Crunches | ✓ |
| Core | 1 | Mrtva buba | Dead bugs | |
| Core | 2 | Standardni trbušnjaci | Sit-ups | ✓ |
| Core | 2 | Planinari | Mountain climbers | |
| Core | 3 | Nožne makaze | Scissor kicks | ✓ |
| Core | 3 | V-podizanja | V-ups | |

Sve vežbe su rep-based (bez vežbi na vreme — plank i sl. ne staju u model
karta=ponavljanja). Nazivi se koriguju u reviziji spec-a po potrebi.

## 6. Istorija i landing

- Red istorije: datum + ikona moda + **score** (desno, akcentovano). Tap na
  red otvara padajuće detalje: vežbe po kategoriji, ukupna ponavljanja,
  trajanje, pauze (postojeći podatak), oborene/ukupno karte (challenge),
  raščlanjen score (baza × množilac).
- Stare sesije: score izračunat retroaktivno (§3.5).
- Landing: dugme "Ponovi poslednji trening" (§2.5) + čip Karta dana (§4.5).

## 7. Podaci i arhitektura

- **Migracija 0005 (exercises):** izvršiv redosled: (1) `add column tier
  smallint` NULLABLE + `add column is_default boolean not null default
  false`; (2) backfill tier-a za postojećih 12 po pravilu ime nivoa →
  Početnik=1, Srednji=2, Napredni=3; (3) `alter column tier set not null`;
  (4) `update … set is_default = true` za postojećih 12; (5) insert 12
  novih vežbi (sa `name_en` i `difficulty_level_id` po mapiranju
  tier 1→Početnik, 2→Srednji, 3→Napredni — kolona je NOT NULL i ostaje).
- **Migracija 0006 (sessions.total_cards check — errata §9.3):** postojeći
  `check (total_cards in (13, 26, 52))` iz 0001 obara SVE nove veličine
  špila. Drop + novi check:
  `total_cards in (13, 26) or (total_cards between 12 and 52 and
  total_cards % 4 = 0)` — propušta stare redove (13/26) i sve nove veličine.
  Presedan za drop+add constraint uz erratu: migracija 0003.
- **`sessions`:** bez novih kolona. Novi `game_mode` stringovi: `sprint`,
  `court`, `survive`, `daily`. Mod-parametri u `settings` JSONB:
  `points`, `base_points`, `multiplier`, `rep_multiplier`, `card_count`,
  `cards_completed`, `sprint_minutes`, `bank_start_seconds`,
  `survived_cards`, `daily_date`, `daily_replay`, `entry`
  (`quick`/`custom`/`challenge`). Postojeći ključevi (`score` = oborene
  karte, `pause_count`, `total_pause_seconds`…) nepromenjeni. Rekordi po
  dimenzijama iz §3.3 filtriraju po JSONB ključevima
  (`settings->>'sprint_minutes'`, `settings->>'daily_date'`) — SVESNA
  odluka: bez novih kolona (invarijanta 8); kolona se uvodi tek ako
  leaderboard (backlog) zatraži indeksiran upit.
- **Novi upit:** `fetchAllExercises()` (sve vežbe, sa tier-om) za Custom
  picker; postojeći `fetchExercisesByDifficulty` ostaje za Quick.
- **Domen:** `score.ts` (baza, množioci, XP, zvanja — čiste funkcije),
  `deck.ts` proširen balansiranim izvlačenjem i konstruktorima specijalnih
  špilova (Dvor, Karta dana sa seed-om), `bank.ts` (Preživi banka, timestamp
  aritmetika). Postojeći `challenge.ts` (par/kvota) se koristi neizmenjen.
- **Registar modova:** +4 unosa (sprint, court, survive, daily) sa
  `explanationKey`; mode kartice u Challenge meniju iz registra.
- **Supabase:** sve kroz `src/lib/supabase/` (invarijanta 6); novi upiti:
  score rekordi po modu, XP zbir, status Karte dana za datum.
- **Gost:** ništa se ne menja — score se prikazuje, ne čuva; poslednja
  konfiguracija i Karta dana status u `localStorage`.

## 8. Isporuka — paket instrukcija za Cursor (redom)

Jedan implementacioni plan pokriva v0.4.1–v0.4.3; faze se izvršavaju redom,
svaka faza = tag + CHANGELOG stavka + ručna verifikacija pre sledeće.
v0.4.4–v0.4.8 dobijaju sopstvene kratke spec-ove i planove kad na njih dođe
red — ovaj dokument im fiksira obim i redosled:

| Verzija | Ime | Sadržaj |
|---|---|---|
| v0.4.1 | Temelj igrivosti | tri vrata, migracija 0005 + 24 vežbe, balansirano izvlačenje, score/XP/zvanja/rekordi po modu, istorija sa detaljima, Ponovi poslednji, score za goste |
| v0.4.2 | Sprint i Dvor | dva moda + rekordi + i18n |
| v0.4.3 | Preživi i Karta dana | dva moda + landing čip + banka vremena |
| v0.4.4 | Džokeri | odmor kao karta, važi u svim modovima (dira `Card`/`deck.ts` — sopstveni spec) |
| v0.4.5 | Animacije vežbi | pilot (čučanj) → stilska pravila → sve 24 |
| v0.4.6 | Napredak | kalendar treniranih/zamrznutih dana, grafikoni, XP/zvanja prikaz, predlog progresije (veći multiplikator posle N čistih sesija) |
| v0.4.7 | Zvuk i ritam | zvuk + vibracija (nova karta, rok ističe, oborena/izgubljena), score ritual animacija |
| v0.4.8 | PWA | manifest, service worker, offline; POSLEDNJA faza — asset lista je tada konačna; obavezno verzionisan keš + update mehanizam (v0.5 će menjati assete) + iOS Safari provera |

Telefonska verifikacija obavezna za v0.4.2–v0.4.8 (tajmeri, vibracija,
animacije, offline). Kraj v0.4.8 = kraj Kruga B → testiranje uživo → v0.5
(sadržaj v0.5 se planira POSLE nalaza testiranja).

## 9. Errata postojećih ugovora

### 9.1 Veličine špila (menja postojeće testove — eksplicitna errata)
Dužine 13/26 postaju 12/24 (deljivost sa 4 za balansirano izvlačenje; 52
ostaje). Tip `DeckSize` (13|26|52) postaje `number` validiran pravilom §2.4
(12–52, deljiv sa 4) — union od tri literala ne može da predstavi Custom
(12–52 po 4), Dvor (16) i Kartu dana (20); Quick selektor nudi 12/24/52 kao
svoje tri opcije nad istim tipom. Postojeći testovi `deck.test.ts`
i svi asserti vezani za 13/26 se ažuriraju po ovoj erratI. i18n ključevi
`quarterSub`/`halfSub` menjaju brojeve ("12 karata · ~10 min",
"24 karte · ~20 min"), a etikete `quarterLabel`/`halfLabel` ("¼ špila",
"½ špila") postaju "Kratak" / "Srednji" jer razlomci više nisu doslovni. Postojeći vremenski rekordi vezani za 13/26 ostaju u
bazi netaknuti; prikazuju se i dalje, nove sesije prave rekorde na 12/24/52.

### 9.2 Balansirano izvlačenje (menja ponašanje `drawSessionCards`)
Dosadašnje slučajno izvlačenje bez garancije po boji zamenjuje se pravilom
N/4 po boji (§2.4). Testovi koji su asertovali čistu slučajnost se ažuriraju;
novi testovi asertuju balans i slučajnost redosleda.

### 9.3 `sessions.total_cards` CHECK constraint (menja postojeću šemu —
eksplicitna errata)
Constraint `total_cards in (13, 26, 52)` iz migracije 0001 zamenjuje se
migracijom 0006 (v. §7) da propusti sve veličine iz §2.4 uz očuvanje starih
redova. Ovo je drop+add constraint po presedanu migracije 0003 (As=1).

Nijedan drugi postojeći test niti postojeća kolona se ne menja.

## 10. Testiranje

- Unit: points (baza/množioci/XP/zvanja pragovi), balansirano izvlačenje,
  seed-ovani špil Karte dana (isti datum → isti špil), Dvor konstruktor,
  banka vremena (uklj. pauzu i ivicu 52. karte), retroaktivni lazy backfill
  (uklj. da NE dira postojeći ključ `score`).
- Komponente: tri vrata navigacija, Custom slajderi (koraci, granice),
  Challenge meni iz registra, istorija detalji, landing čip.
- Ručno na telefonu: Sprint countdown u pozadini (auto-pauza), Preživi banka
  preko pauze, vibracija, Karta dana preko ponoći.

## 11. Backlog (svesno odloženo)

Poker ruka (5 karata odjednom + poker kombinacije — jedini mod koji menja
session ekran; dizajn skiciran u brainstormu 2026-07-15), combo množilac za
uzastopno oborene karte, nedeljni izazovi + zarađivanje ❄️, leaderboard za
Kartu dana (prirodan kandidat — svi igraju isti špil; traži server-side
validaciju), novi jezici, prenos gost→nalog sesije, push podsetnici,
deljenje rezultata. (Džokeri, progresija i PWA su povučeni u faze
v0.4.4/v0.4.6/v0.4.8 — v. §8.)
