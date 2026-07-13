# Krug A — "Ispravke i jasnoća": Design Spec

Datum: 2026-07-13
Status: Draft za review
Preporučena lokacija: `docs/superpowers/specs/2026-07-13-krug-a-design.md`
Izvor: `docs/superpowers/strategy/2026-07-13-strategija-nastavka.md` (sekcija 4, Krug A)

## 1. Obim izdanja

Malo, u potpunosti aditivno izdanje koje popravlja postojeće iskustvo pre Krugova B i C. **U obimu:**

1. **Wake Lock** — ekran se ne gasi tokom aktivne sesije
2. **Auto-pauza** kad aplikacija izgubi vidljivost (zaključavanje, poziv, drugi tab) — svi modovi
3. **Zbir pauza** (`total_pause_seconds`) — beleži se za sve modove, prikazuje na rezultatima i u istoriji
4. **Objašnjenja challenge-a** u interfejsu (info na mode karticama + prvi-put modal)
5. **Objašnjenje streak mehanike** (tap na streak karticu)
6. **Padajući meni za jezik** umesto SR/EN toggle-a

**Van obima** (ostaje po strategiji): sve iz Krugova B i C (vežbe, animacije, Napredak redizajn, slajder, novi modovi, PWA), zarađivanje/kupovina zamrzavanja, novi jezici.

## 2. Preduslovi

Preflight gate: MVP plan (28 taskova), redizajn plan (13) i gamifikacija plan (15) su završeni i push-ovani. Baza sadrži samo test podatke — ali ovo izdanje ionako **nema migracija šeme** (samo novi ključevi u postojećoj `sessions.settings` JSONB koloni).

## 3. Wake Lock

- Novi hook `useWakeLock(active: boolean)` u `src/lib/hooks/`: kad je `active`, traži `navigator.wakeLock.request('screen')`; otpušta na `active = false` i na unmount.
- Wake Lock se automatski gubi kad tab izgubi vidljivost (ponašanje browsera) — hook ga **ponovo traži** na `visibilitychange → visible` dok je `active`.
- Aktivan samo na ekranu treninga (SessionScreen), svi modovi; NE na setup/rezultati/istorija.
- Graceful fallback: ako API ne postoji ili odbije (npr. battery saver), aplikacija radi normalno bez njega; bez poruke korisniku (nema akcije koju bi preduzeo).
- Testiranje: jedinični test hook-a sa mock `navigator.wakeLock`; ručna verifikacija na realnom telefonu (Chrome Android + Safari iOS) je obavezan korak plana.

## 4. Auto-pauza na gubitak vidljivosti

- Na `document.visibilitychange → hidden` tokom aktivne sesije (nije već pauzirana, nije završena): automatski se poziva **postojeći** mehanizam pauze (timestamp-shift; tajmer invarijanta iz MVP spec-a 4.2 važi bez izmena — nikad tick-akumulacija).
- Važi za **sve modove** (klasični i challenge). U challenge-u zamrzava i kvotu karte i ukupno vreme — identično ručnoj pauzi.
- Povratak (`visible`): sesija ostaje pauzirana, prikazan je postojeći pauza overlay; korisnik nastavlja klikom na "Nastavi". Bez auto-nastavka.
- Na pauza overlay se dodaje diskretna oznaka porekla pauze kad je automatska (i18n ključ `pause.autoLabel`: SR "Automatski pauzirano" / EN "Paused automatically") — ista dugmad, isto ponašanje.
- Ivice: `hidden` dok je već ručno pauzirano → bez efekta; `hidden` na setup/rezultatima → bez efekta; višestruki brzi `hidden/visible` prelazi ne smeju da dupliraju pauzu (idempotentno).

## 5. Zbir pauza — model podataka i prikaz

- U stanju sesije se akumulira `totalPauseSeconds` (izračunato iz timestampova pauza: `resume_at − pause_at`, zaokruženo na celu sekundu) i `pauseCount` (ručne + automatske zajedno).
- Pri završetku sesije (samo ulogovani, kao i dosad) upisuje se u **postojeću** `sessions.settings` JSONB kolonu, za SVE modove: `{ "pause_count": int, "total_pause_seconds": int }`. Za challenge sesije ovi ključevi koegzistiraju sa postojećim (`budget_seconds`, `score`, `won`, `par_source`); `pause_count` već postoji za challenge — ovim se proširuje na sve modove, isti ključ.
- Bez novih kolona, bez migracije. Stare sesije bez ovih ključeva: prikaz "—".
- Prikaz: (a) rezultati — red "Pauze: 3 · ukupno 2:41" ispod ukupnog vremena (i18n); (b) istorija — postojeći red sesije dobija diskretan dodatak ukupnog trajanja pauza kad podatak postoji.
- Napomena o poverenju: kao i ostali `settings` podaci, upisuje klijent pod owner-RLS — prihvatljivo za solo podatke, ne za budući leaderboard (konzistentno sa gamifikacijskim spec-om, sekcija 5).

## 6. Objašnjenja challenge-a

- **Info na mode karticama (korak 0):** svaka kartica u registru modova dobija ikonicu ⓘ; tap otvara modal/sheet sa objašnjenjem tog moda. Sadržaj dolazi iz registra modova (novi i18n ključ po modu: `modes.<id>.explanation`) — budući modovi automatski dobijaju svoje objašnjenje bez izmene ekrana.
- **Prvi-put modal:** pri prvom pokretanju `perfect_deck` sesije na uređaju (localStorage flag `explained.perfect_deck`), pre prve karte se prikazuje isto objašnjenje sa dugmetom "Jasno, krećemo". Ne prikazuje se više nikad (osim kroz ⓘ).
- **Predloženi tekst — Perfektan špil** (finalna redakcija na Fable reviziji):
  - SR: "Svaka karta ima svoju vremensku kvotu. Pređi na sledeću kartu pre isteka kvote i karta je oborena ✓. Kvota istekla? Karta je izgubljena ✗ — ali trening se ne prekida: završi ponavljanja svojim tempom i nastavi. Neiskorišćeno vreme propada, ne prenosi se. Obori sve karte za PERFEKTAN ŠPIL. Prvi put igraš protiv naše procene; kad postaviš rekord, igraš protiv svog najboljeg vremena +5%."
  - EN: "Every card has its own time quota. Move to the next card before the quota runs out and the card is beaten ✓. Quota expired? The card is lost ✗ — but the workout never stops: finish your reps at your own pace and carry on. Unused time doesn't carry over. Beat every card for a PERFECT DECK. Your first run is against our estimate; once you set a record, you race your best time +5%."
- **Klasično** dobija jednu rečenicu (SR: "Svojim tempom, bez pritiska — meri se samo ukupno vreme." / EN: "Your pace, no pressure — only total time is tracked.").

## 7. Objašnjenje streak mehanike

- Tap na streak karticu (Napredak ekran) i na 🔥 indikator (landing) otvara modal sa objašnjenjem.
- **Predloženi tekst:**
  - SR: "🔥 Niz raste za svaki dan sa bar jednim završenim treningom. ❄️ Ako preskočiš dan, do 2 dana nedeljno se automatski zamrznu i niz preživi — treći propušten dan u istoj nedelji prekida niz. Zamrzavanja se obnavljaju svake nedelje i ne štede se."
  - EN: "🔥 Your streak grows for every day with at least one finished workout. ❄️ Miss a day? Up to 2 days per week freeze automatically and your streak survives — a third missed day in the same week breaks it. Freezes reset weekly and can't be saved up."
- Modal takođe prikazuje trenutno stanje: dužina niza + preostala zamrzavanja ove nedelje (podaci već postoje iz `calculateStreak`).
- Napomena za budućnost (ne implementira se): kalendar treniranih/zamrznutih dana ide u Krug B (Napredak redizajn); ovaj modal je minimalna verzija koja rešava nejasnoću odmah.

## 8. Padajući meni za jezik

- SR/EN toggle na landing ekranu zamenjuje se padajućim menijem (native `<select>` stilizovan tokenima, ili mala custom lista — odluka na planu prema postojećim obrascima dugmadi).
- Lista jezika iz **registra lokala** (novi mali modul `src/lib/i18n/locales.ts`: `[{ code: 'en', label: 'English' }, { code: 'sr', label: 'Srpski' }]`) — dodavanje jezika = novi unos + JSON katalog, bez izmene komponente.
- Ponašanje nepromenjeno: localStorage, podrazumevani engleski, bez i18n rutiranja.

## 9. i18n

Svi novi stringovi kroz `messages/sr.json` + `messages/en.json` (predloženi ključevi: `pause.autoLabel`, `pause.summary`, `modes.classic.explanation`, `modes.perfect_deck.explanation`, `streak.explanation`, `language.label`). Nijedan hardkodiran string.

## 10. Testiranje

- Unit: akumulacija pauza iz timestampova (uklj. višestruke pauze, auto+ručna kombinacija, idempotentnost na dupli `hidden`), `useWakeLock` sa mock API-jem (request/release/re-acquire), registar lokala.
- Komponente: ⓘ otvara modal sa tekstom iz registra; prvi-put modal se prikazuje jednom (localStorage mock); streak modal prikazuje stanje; meni jezika menja lokal.
- Svi postojeći testovi prolaze nepromenjeni — izdanje je aditivno; pauza overlay zadržava postojeće ponašanje i etikete (dodatak je nov element, ne izmena postojećih).
- Obavezna ručna verifikacija na telefonu: zaključavanje usred challenge-a, dolazni poziv, prebacivanje aplikacije — u sva tri slučaja: pauza aktivna, kvota zamrznuta, vreme tačno po povratku.

## 11. Proces do implementacije

Po odobrenju ovog spec-a: implementacioni plan istog standarda kao dosadašnji (bite-sized taskovi, kompletan kod, TDD, preflight gate iz sekcije 2, tačne komande i očekivani izlazi) → nezavisna Fable revizija spec-a i plana (svež kontekst) → primena nalaza → commit → handoff Cursoru. Revizija posebno da oceni: ivice `visibilitychange` ponašanja po browserima (Safari!), interakciju Wake Lock ↔ auto-pauza, i jasnoću/ton predloženih tekstova na oba jezika.
