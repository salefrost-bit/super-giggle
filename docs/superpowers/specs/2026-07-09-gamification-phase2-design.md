# Faza 2 — Gamifikacija: Design Spec

Datum: 2026-07-09
Status: Draft za review

## 1. Obim izdanja

Solo-prvo gamifikacijsko izdanje. **U obimu:**
- Challenge mod **"Perfektan špil"** (kvota po karti, use-it-or-lose-it)
- **Lični rekordi** po kombinaciji težina × dužina špila
- **Streak** (dnevni niz sa 2 automatska zamrzavanja po nedelji)
- Novi ekran **"Napredak"** (streak + rekordi + istorija; zamenjuje dosadašnji "Istorija" ulaz)
- **Višejezičnost** (srpski + engleski, arhitektura spremna za dodavanje jezika)
- **Efekti protoka vremena** u challenge-u (boje, pulsiranje, blesak pri obaranju/gubitku karte)

**Van obima** (dokumentovan backlog, arhitektura ih prima bez prepravki):
- Ostali challenge modovi: "Preživi špil" (prekoračenje jede globalni budžet), "Ghost trka" (trka protiv timestampova sopstvenog rekorda po karti), "Sprint" (fiksno vreme, obori što više karata) — registar modova (sekcija 3) čini svaki od njih zasebnim malim modulom
- Bedževi/dostignuća, leaderboard, XP/nivoi, social/deljenje — Faza 3, zahtevaju sopstveni spec

## 2. Preduslovi i redosled

Ovaj spec se implementira **tek posle** završetka oba postojeća plana:
1. MVP plan (`docs/superpowers/plans/2026-07-08-trening-app-mvp-plan.md`, 28 taskova)
2. Vizuelni redizajn (`docs/superpowers/plans/2026-07-09-mvp-visual-redesign-plan.md`, 13 taskova)

Gamifikacija gradi NA redizajniranom UI-u: korak 0 proširuje redizajnirani setup wizard (3 → 4 koraka), challenge ekran proširuje redizajnirani SessionScreen. Sva nova UI površina koristi **tokene i obrasce iz redizajn spec-a** (`2026-07-09-mvp-visual-redesign-design.md` sekcija 3): `background/surface/accent/foreground/muted` boje, Nunito, radius 14–24px, volt primarna dugmad, aria-label obrazac za dugmad sa podnaslovom. Odobren vizuelni mockup: `docs/superpowers/specs/assets/gamification/gamification-screens.html` (emoji ikonice 🔥❄️⚡🃏 za streak/zamrzavanja/skor/mod su odobrene tim mockup-om; znakovi karata ostaju čisti glifovi ♠♥♦♣).

## 3. Registar modova (arhitektura)

Svaki mod igre je modul u `src/lib/modes/` sa zajedničkim interfejsom (definisan precizno u planu): identifikator (`game_mode` vrednost), i18n ključevi za ime/opis, da li zahteva budžet, kako se računa skor i pobeda, koje dodatne UI elemente prikazuje ekran treninga. Prvo izdanje registruje `classic` (postojeće ponašanje, bez izmena) i `perfect_deck`. Ekran koraka 0 renderuje kartice iz registra — budući mod = novi modul + prevodi, bez izmene ekrana.

`sessions.game_mode` (postoji od MVP-a, default `'classic'`) dobija novu vrednost `'perfect_deck'`. Rezime challenge-a ide u postojeću `sessions.settings` JSONB kolonu — bez novih kolona na `sessions`.

## 4. Mehanika "Perfektan špil"

**Budžet** (ukupno ciljno vreme za ceo špil):
- Prvi put za kombinaciju (težina × dužina): **par formula** = `Σ(ponavljanja svih karata) × par_seconds_per_rep(težina) + broj_karata × par_transition_seconds(težina)`
- Kad postoji lični rekord: **budžet = najbolje `total_duration_seconds` × 1.05** među SVIM završenim sesijama iste kombinacije (klasične i challenge) — trkaš se protiv svog najboljeg vremena, ali sa 5% "vazduha". Bez tog bafera bi svaka pobeda pravila strože kvote od prošlih (rekord-spirala) dok igra ne postane nemoguća; ovako moraš da oboriš rekord da bi postavio novi, a kvote ostaju dostižne.
- `par_source` (`'par'` ili `'record'`) se pamti u `settings` radi prikaza

**Kvota po karti:** raspodela po **punoj težini karte**, ne samo po ponavljanjima: `težina_karte = ponavljanja × par_seconds_per_rep + par_transition_seconds`, `kvota = budžet × težina_karte / Σ(težine svih karata)`. Ovim svaka karta dobija i svoj fiksni "tranzicioni" deo — karta od 2 ponavljanja pri par budžetu dobija ~26s (2×3+20), ne 12s koje bi dobila čistom proporcijom ponavljanja (što bi male karte činilo nepobedivim, a "Perfektan špil" nedostižnim od prvog igranja).

**Pobeda karte:** klik na "Sledeća karta" pre isteka kvote te karte = karta oborena (✓). Istek kvote = karta izgubljena (✗), ali se ponavljanja svejedno završavaju i prelazi se dalje — trening se nikad ne prekida zbog igre. Neiskorišćeno vreme oborene karte **propada** (use-it-or-lose-it): ne prenosi se na sledeće karte.

**Skor i pobeda:** skor = broj oborenih karata (npr. 22/26). Challenge pobeđen ("PERFEKTAN ŠPIL") = sve karte oborene. Gubitak jedne karte ne prekida ništa — igra se dalje za što bolji skor. **Sekundarna lestvica — najbolji skor:** pre starta se učitava dosadašnji najbolji skor za tu kombinaciju i prikazuje uz skor pill tokom treninga (`⚡ 12/14 · najbolje 22`); obaranje najboljeg skora dobija "NOVI NAJBOLJI SKOR" oznaku na rezultatima. Ovo daje dostižan cilj i posle prvog izgubljene karte (kad "perfektan špil" više nije moguć u toj sesiji), umesto 40+ karata "mrtve" igre.

**Pauza:** dozvoljena; zamrzava i kvotu karte i ukupno vreme. Implementacija po istom timestamp-shift principu kao MVP štoperica — **tajmer invarijanta iz MVP spec-a (sekcija 4.2) važi u potpunosti**: preostala kvota = `deadline − sada`, pauza pomera `deadline` unapred; nikad tick-akumulacija.

**Gost:** može da igra Perfektan špil protiv para (nikad protiv rekorda — nema ih), vidi skor na kraju, ništa se ne upisuje u bazu; na rezultatima poziv na registraciju ("Napravi nalog da pratiš rekorde i niz").

**Beleženje ishoda karte:** `beat_quota` se izračunava **na klijentu u trenutku klika** (klijent jedini zna pauza-korigovano vreme) i upisuje uz postojeći `recordCardDraw` poziv. Naknadna rekonstrukcija iz timestampova nije pouzdana (pauze iskrivljuju wall-clock razlike) — zato kolona, a ne izvedeni podatak.

## 5. Model podataka (isključivo aditivne izmene)

| Izmena | Detalj |
|---|---|
| `difficulty_levels` + `par_seconds_per_rep numeric`, + `par_transition_seconds numeric` | Početne seed vrednosti za sva tri nivoa: 3.0 s/ponavljanju, 20 s/karti (podaci — štimuju se u bazi bez koda). Za ½ špila Srednji (~182 ponavljanja, 26 karata): par ≈ 18 min, u skladu sa procenom "~20 min" iz redizajn UI-a. |
| `card_draws` + `beat_quota boolean` (nullable) | `null` = klasična sesija; `true/false` = ishod kvote u challenge-u. |
| `categories`, `difficulty_levels`, `exercises` + `name_en text` (nullable) | Engleska imena; `null` → fallback na srpsko ime. |
| `sessions.settings` (postojeća JSONB) | Za `perfect_deck`: `{ "budget_seconds": int, "par_source": "par"\|"record", "score": int, "won": bool }`. |

**Bez novih tabela.** Rekordi = SQL upit nad `sessions` (najbolje vreme; najbolji skor iz `settings`). Streak = čist algoritam nad datumima `completed_at` (sekcija 6). Nacrt `phase2_gamification.sql` (achievements/challenge_results tabele iz MVP faze) ostaje neiskorišćen nacrt za Fazu 3 — ovaj spec ga NE primenjuje.

**Napomena o poverenju u podatke:** `settings.score/won`, `beat_quota` i `total_duration_seconds` upisuje klijent pod owner-RLS politikom — vlasnik naloga ih tehnički može falsifikovati. To je prihvatljivo dok su podaci isključivo lični (solo izdanje). **Faza 3 leaderboard NE SME da veruje ovim klijentskim vrednostima** bez server-side validacije. Radi transparentnosti, `settings` beleži i `pause_count` (broj pauza tokom challenge-a).

## 6. Streak (niz)

- **Definicija:** broj uzastopnih dana (lokalna vremenska zona uređaja) zaključno sa danas ili juče, u kojima postoji bar jedna završena sesija (bilo koji mod). Današnji dan bez treninga ne prekida niz dok ne istekne.
- **Zamrzavanja:** do **2 propuštena dana po ISO nedelji** se automatski "zamrzavaju" i ne prekidaju niz. Treći propušten dan u istoj nedelji prekida niz. Zamrzavanja se ne prenose među nedeljama.
- **Konvencija brojanja (obavezujuća za implementaciju):** zamrznuti dani se RAČUNAJU u dužinu niza (niz 04–08. sa zamrznutim 06. i 07. = 5 dana). Zamrzavanje sme da pokrije i juče/prekjuče (niz "preživljava" i kad poslednji trening nije bio juče, dok god zamrzavanja te nedelje dostaju). Niz mora biti "usidren" bar jednim stvarnim treningom — lanac sastavljen samo od zamrznutih dana je 0. Zamrzavanja se troše samo IZMEĐU treninga, nikad pre najstarijeg treninga u istoriji.
- **Implementacija:** čista funkcija `calculateStreak(completedDates, today)` — deterministična, bez uskladištenog stanja, pokrivena unit testovima (ivice: prelaz nedelje, više treninga istog dana, prazna istorija, niz koji počinje sred nedelje).
- **Prikaz:** 🔥 + broj dana; preostala zamrzavanja tekuće nedelje kao ❄️ ikonice (0–2).

## 7. Tok korišćenja i ekrani

**Korak 0 — izbor moda** (novi prvi korak setup wizarda; wizard postaje 4 koraka sa 4 progress trake):
- Kartica "🃏 Klasično" (opis: svojim tempom, meri se ukupno vreme) i kartica "⚡ Challenge: Perfektan špil" (opis pravila u jednoj rečenici + ako je ulogovan i ima rekord za poslednju korišćenu kombinaciju: "Obori: 18:32 (½ špila · Srednji)")
- Izbor odmah vodi na korak težine (auto-advance, konzistentno sa redizajn odstupanjem 2)

**Challenge ekran treninga** (proširenje redizajniranog SessionScreen, aktivno samo za `perfect_deck`):
- Na kartici: countdown kvote (veliki, ispod broja ponavljanja) + tanka traka koja se prazni
- Skor pill gore levo: `⚡ 12/14`; ukupna štoperica u sredini; "Karta X/Y" gore desno
- **Efekti** (svi CSS-only, boje/stanja izvedeni iz istog timestamp računa kao kvota — bez novih JS tajmera): kvota > 50% = volt; 25–50% = narandžasta; < 25% = crvena + blago pulsiranje ivice kartice; obaranje karte = kratak volt blesak + ✓; gubitak = kratko crveno treperenje + ✗ pa se prelazi na sledeću kartu
- Pauza overlay zamrzava sve (i vizuelno zaustavlja pražnjenje trake)

**Rezultati challenge-a:** skor veliko (`22/26`), ukupno vreme, `won` → "PERFEKTAN ŠPIL!" proslava (CSS konfete animacija); oznaka "NOVI REKORD" (vreme) samo kad je `par_source = 'record'` i vreme je bolje od budžeta/1.05 (obaranje para na prvom igranju nije "rekord" — nije bilo prethodnog); oznaka "NOVI NAJBOLJI SKOR" kad skor premaši dosadašnji najbolji za kombinaciju; pregled po kategorijama kao u klasičnom + zbir ✓/✗. Gost: postojeća poruka + poziv na registraciju.

**Napredak ekran** (zamenjuje "Istorija" ulaz sa landing-a; ruta/ekran unutar postojećeg state machine-a):
1. Streak kartica: 🔥 broj dana + ❄️ preostala zamrzavanja ove nedelje
2. Rekordi: lista po kombinaciji (težina × dužina) → najbolje vreme + najbolji challenge skor (`⚡ 24/26`)
3. Istorija: postojeća lista, svaki red dobija oznaku moda (🃏 klasično / ⚡ skor)

**Landing:** ulogovan korisnik vidi 🔥 + broj pored statusa; dugme vodi na "Napredak" (umesto dosadašnje "Istorija").

## 8. Višejezičnost (i18n)

- **Biblioteka:** `next-intl` u režimu **bez i18n rutiranja** (URL-ovi se ne menjaju) — ICU format poruka rešava srpske množine (1 karta / 2 karte / 5 karata)
- **Fajlovi:** `messages/sr.json`, `messages/en.json` — dodavanje jezika = novi JSON fajl + registracija
- **Izbor jezika:** localStorage; **podrazumevani jezik je ENGLESKI** (bez obzira na jezik browsera); diskretno SR/EN dugme na landing ekranu menja i pamti izbor
- **Obuhvat:** SVI UI stringovi — uključujući retrofit postojećih MVP/redizajn ekrana; imena iz baze (kategorije, težine, vežbe) kroz `name_en` (za engleski) sa fallback-om na srpsko `name` ako je `name_en` null
- Engleski je podrazumevani jezik prikaza; srpski je izvorni jezik podataka u bazi (`name` kolone), a seed popunjava `name_en` za sav ugrađeni sadržaj

## 9. Testiranje

- Unit: par formula, kvota po karti (proporcije, zaokruživanje), `calculateStreak` (sve ivice iz sekcije 6), izračunavanje skora/pobede, izbor budžeta (par vs. rekord)
- Komponente: korak 0 (renderovanje iz registra, izbor moda), challenge elementi na SessionScreen (skor, ishod karte)
- Svi postojeći MVP/redizajn testovi prolaze nepromenjeni — challenge logika je aditivna grana, klasičan mod se ne menja
- Tajmer invarijanta: kvota testovi koriste iste timestamp obrasce kao postojeći `timer.test.ts`

## 10. Proces do implementacije

Posle odobrenja ovog spec-a: implementacioni plan **istog standarda kao MVP plan** (bite-sized taskovi, kompletan kod u svakom koraku, TDD, tačne komande i očekivani izlazi, Interfaces blokovi, preflight gate koji proverava da su MVP i redizajn planovi završeni) → **nezavisna revizija spec-a i plana (Fable, svež kontekst)** → primena nalaza → commit → handoff Cursoru.

Nezavisna revizija, pored tehničke provere (model podataka, pokrivenost spec-a, kvalitet dekompozicije taskova, bagovi u kodu, bezbednost), OBAVEZNO ocenjuje i **game design**: da li je mehanika "Perfektan špil" logična i konzistentna, da li će stvarno biti ZABAVNA (motivaciona petlja, osećaj napretka, pravednost kvota, da li use-it-or-lose-it frustrira ili motiviše), i ako ima slabosti — šta konkretno dodati ili promeniti da igra bude zabavnija.
