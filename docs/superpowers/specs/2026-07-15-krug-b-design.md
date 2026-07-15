# Krug B — "Igrivost" — design spec

Datum: 2026-07-15
Status: Na reviziji (nezavisna revizija sledi pre plana)
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
jedna završena sesija na uređaju.

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

`score = round(baza × množilac)`.

### 3.3 Rekordi — po modu
- Najbolji score po `game_mode`; za Sprint posebno po trajanju (3/5/10).
- Postojeći rekordi Perfektnog špila (najbolje vreme + najbolji skor oborenih
  po kombinaciji težina×dužina) OSTAJU — score rekord se dodaje pored njih.
- Ekran Napredak prikazuje score rekorde po modu; postojeće vremenske rekorde
  zadržava u sekciji Perfektnog špila.

### 3.4 XP i zvanja
- **XP = Σ score svih sačuvanih sesija.** Izvodi se upitom, bez nove tabele i
  bez kolone-brojača (izvedena vrednost, uvek konzistentna).
- Zvanja su univerzalni kartaški SIMBOLI (bez reči, bez prevoda): prag u XP →
  simbol: 0 → `2`, 5.000 → `J`, 15.000 → `Q`, 40.000 → `K`, 100.000 → `A`,
  250.000 → `🃏`. (Baždareno na ~500 poena po treningu: J posle ~10 treninga,
  Q posle ~mesec redovnog treniranja.)
- Prikaz: simbol + XP broj na Napretku; prelazak praga = proslava na ekranu
  rezultata (konfeti mehanizam već postoji). Info modal objašnjava pragove.

### 3.5 Čuvanje i retroaktivnost
- `score` se upisuje u `sessions.settings` JSONB pri čuvanju (brz prikaz
  istorije).
- Za sesije BEZ upisanog score-a (sve postojeće) score se izračunava na
  klijentu iz već sačuvanog (`card_draws.reps` + tier vežbe preko
  `session_exercises`) — ista čista funkcija, drugi ulaz. Istorija time
  retroaktivno oživi.
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
objašnjenje. Ekran koraka 0 se ne menja (invarijanta 5). Svi tajmeri i banke
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
- Rekordi po trajanju (3/5/10 su tri odvojene tabele rekorda).

### 4.3 👑 Dvor
- Špil: 16 karata — J, Q, K, A u sve 4 boje (4 po boji — balansirano).
- Mehanika: identična Perfektnom špilu (rok po karti iz istog par računa).
- Setup: težina (za par sekunde/rep) + vežbe; bez izbora dužine.
- Score: ×(1 + oborene/ukupno) × 1.25.

### 4.4 🛡 Preživi špil
- Špil: ceo (52, balansiran).
- Banka vremena: start **90 s**. Završetak karte DODAJE banci kvotu te karte
  (isti par račun kao Perfektan špil); od banke se oduzima stvarno proteklo
  vreme karte. Saldo se menja samo na klik "sledeća karta" (timestamp
  aritmetika, bez tick-a); UI prikazuje procenu salda izvedenu iz timestampova.
- Kraj: banka ≤ 0 posle klika → sesija se završava; score = baza do tog
  trenutka. Svih 52 → ×1.5.
- Setup: težina + vežbe.

### 4.5 🎴 Karta dana
- Špil: 20 karata (5 po kategoriji), determinističi izvučen iz seed-a =
  lokalni datum (`YYYY-MM-DD`) — isti za sve korisnike tog dana, radi offline.
- Tier dana rotira po danu u nedelji: pon/čet = tier 1, uto/pet = tier 2,
  sre/sub = tier 3, ned = tier 2. Vežbe = defaulti tog tiera — BEZ izbora
  (u tome je poenta: svi rade isto).
- Mehanika: rok po karti kao Perfektan špil (par za tier dana koristi
  odgovarajući difficulty red: tier 1→Početnik, 2→Srednji, 3→Napredni).
- Jednom dnevno se računa (za streak čip i rekord); ponovno igranje istog dana
  je dozvoljeno ali se score ne upisuje kao "karta dana" drugi put — čuva se
  kao običan challenge pokušaj bez dnevne oznake.
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
| Core | 3 | Nožne makaze | Leg scissors | ✓ |
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

- **Migracija 0005 (aditivna):** `alter table exercises add column tier`,
  `add column is_default`; backfill tier-a za postojećih 12 iz njihovog
  nivoa; insert 12 novih vežbi (sa `name_en`); constraint provere u testu
  seed-a nisu potrebne (podatak, ne kod).
- **`sessions`:** bez novih kolona. Novi `game_mode` stringovi: `sprint`,
  `court`, `survive`, `daily`. Mod-parametri u `settings` JSONB:
  `score`, `base_score`, `multiplier`, `rep_multiplier`, `card_count`,
  `sprint_minutes`, `bank_start_seconds`, `survived_cards`, `daily_date`,
  `entry` (`quick`/`custom`/`challenge`).
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
v0.4.4–v0.4.6 dobijaju sopstvene kratke spec-ove i planove kad na njih dođe
red — ovaj dokument im fiksira obim i redosled:

| Verzija | Ime | Sadržaj |
|---|---|---|
| v0.4.1 | Temelj igrivosti | tri vrata, migracija 0005 + 24 vežbe, balansirano izvlačenje, score/XP/zvanja/rekordi po modu, istorija sa detaljima, Ponovi poslednji, score za goste |
| v0.4.2 | Sprint i Dvor | dva moda + rekordi + i18n |
| v0.4.3 | Preživi i Karta dana | dva moda + landing čip + banka vremena |
| v0.4.4 | Animacije vežbi | pilot (čučanj) → stilska pravila → sve 24 |
| v0.4.5 | Napredak | kalendar treniranih/zamrznutih dana, grafikoni, XP/zvanja prikaz |
| v0.4.6 | Zvuk i ritam | zvuk + vibracija (nova karta, rok ističe, oborena/izgubljena), score ritual animacija |

Telefonska verifikacija obavezna za v0.4.2–v0.4.6 (tajmeri, vibracija,
animacije). v0.4.4–v0.4.6 dobijaju sopstvene kratke spec-ove pre svojih faza
(animacije stilska pravila; Napredak layout; zvučni dizajn) — ovaj dokument im
fiksira obim i redosled.

## 9. Errata postojećih ugovora

### 9.1 Veličine špila (menja postojeće testove — eksplicitna errata)
Dužine 13/26 postaju 12/24 (deljivost sa 4 za balansirano izvlačenje; 52
ostaje). `DeckSize` tip 13|26|52 → 12|24|52. Postojeći testovi `deck.test.ts`
i svi asserti vezani za 13/26 se ažuriraju po ovoj erratI. i18n ključevi
`quarterSub`/`halfSub` menjaju brojeve ("12 karata · ~10 min",
"24 karte · ~20 min"), a etikete `quarterLabel`/`halfLabel` ("¼ špila",
"½ špila") postaju "Kratak" / "Srednji" jer razlomci više nisu doslovni. Postojeći vremenski rekordi vezani za 13/26 ostaju u
bazi netaknuti; prikazuju se i dalje, nove sesije prave rekorde na 12/24/52.

### 9.2 Balansirano izvlačenje (menja ponašanje `drawSessionCards`)
Dosadašnje slučajno izvlačenje bez garancije po boji zamenjuje se pravilom
N/4 po boji (§2.4). Testovi koji su asertovali čistu slučajnost se ažuriraju;
novi testovi asertuju balans i slučajnost redosleda.

Nijedan drugi postojeći test se ne menja.

## 10. Testiranje

- Unit: score (baza/množioci/XP/zvanja pragovi), balansirano izvlačenje,
  seed-ovani špil Karte dana (isti datum → isti špil), Dvor konstruktor,
  banka vremena (uklj. pauzu), retroaktivni score.
- Komponente: tri vrata navigacija, Custom slajderi (koraci, granice),
  Challenge meni iz registra, istorija detalji, landing čip.
- Ručno na telefonu: Sprint countdown u pozadini (auto-pauza), Preživi banka
  preko pauze, vibracija, Karta dana preko ponoći.

## 11. Backlog (svesno odloženo)

Poker ruka (5 karata odjednom + poker kombinacije — jedini mod koji menja
session ekran; dizajn skiciran u brainstormu 2026-07-15), combo množilac za
uzastopno oborene karte, nedeljni izazovi + zarađivanje ❄️, leaderboard za
Kartu dana (prirodan kandidat — svi igraju isti špil; traži server-side
validaciju), predlog progresije, PWA, džokeri kao odmor.
