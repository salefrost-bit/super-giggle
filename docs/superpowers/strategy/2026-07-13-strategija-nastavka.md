# ŠPIL — Strategija nastavka razvoja

Datum: 2026-07-13
Status: Radni dokument za planiranje (nastao iz razgovora o rezultatima ručnog testiranja)
Preporučena lokacija u repou: `docs/superpowers/strategy/2026-07-13-strategija-nastavka.md`

## 1. Kontekst

Završene su tri faze: MVP (28 taskova), vizuelni redizajn (13 taskova, uklj. As=1 erratu) i gamifikacija Faze 2 (15 taskova: Perfektan špil, rekordi, streak, Napredak, i18n SR/EN). Faza 3 postoji samo kao brainstorm beleške (`2026-07-10-phase3-brainstorm-notes.md`) i čekala je izveštaj sa ručnog testiranja — ovaj dokument JE taj izveštaj, pretočen u plan.

Proces koji se nastavlja (nepromenjen): **brainstorm → spec → nezavisna Fable revizija → implementacioni plan → Fable revizija → Cursor implementira**. Jedan spec po krugu, ne mega-spec.

## 2. Nalazi sa testiranja — klasifikacija

| # | Nalaz | Tip | Rešenje | Krug |
|---|---|---|---|---|
| 1 | Težina smanjuje broj karata → nejednaka ponavljanja; želja: uvek pun špil + slajder multiplikatora | Dizajnerska izmena | Potvrđuje i proširuje postojeću Faza 3 stavku 1; slajder sa DISKRETNIM koracima (npr. 0.5×–2.0× po 0.25) da rekordi/par ostanu izračunljivi | C |
| 2 | Streak zamrzavanja (❄️) postoje ali "nema opcije da se iskoriste" | UX — nekomunicirana odluka (troše se automatski, to je po spec-u) | (a) objašnjenje u UI odmah; (b) kalendar treniranih/zamrznutih dana u Napredak redizajnu; (c) zarađivanje/kupovina zamrzavanja = backlog (traži XP sistem) | A (a), B (b) |
| 3 | Telefon se zaključa / poziv / drugi tab → vreme teče | Bug klase UX | Wake Lock API tokom sesije + auto-pauza na `visibilitychange` (SVUDA, svi modovi) + `total_pause_seconds` u `sessions.settings` i prikaz u istoriji | A |
| 4 | Challenge pravila nejasna u interfejsu | UX | Info tap/modal na mode karticama (korak 0), kratko objašnjenje pri prvom pokretanju challenge-a | A |
| 5 | Samo 2-3 vežbe po kategoriji | Sadržaj | Proširiti seed na ≥4 vežbe po kategoriji; dodeliti tier-ove kompatibilne sa budućim slajderom (v. sekcija 4, zavisnost) | B |
| 6 | SR/EN toggle ne skalira na 5-6 jezika | UX | Padajući meni za jezik; novi jezici tek kad postoji publika (trošak = prevod svih stringova + `name_XX` kolone) | A (meni) / backlog (jezici) |
| 7 | Vežbe bez vizuelnog prikaza | UX/sadržaj | Minimalističke SVG/CSS stick-figure animacije (opcija B), generisane kao kod kroz postojeći AI workflow; pilot 1 vežba → stilska pravila → svih 16+ | B (pilot), B/C (sve) |
| 8 | Napredak ekran previše go | UX | Redizajn à la Apple Health: kalendar (trenirani/zamrznuti dani — rešava i #2b), grafikoni ponavljanja po nedelji/kategoriji, trendovi. Podaci već postoje u bazi, čist frontend | B |
| 9 | PWA / offline | Nova funkcija | Manifest + service worker + keš frontenda i biblioteke vežbi; gost mod potpuno offline (već ne dira bazu); ulogovani: queue-and-sync čuvanje sesije; posebno testirati iOS Safari | C |

## 3. Dodatni predlozi (prihvaćeni u razgovoru kao kandidati)

- **"Ponovi poslednji trening"** dugme na landing ekranu — uklanja trenje pre starta. (B)
- **Zvuk + vibracija** — nova karta, kvota ističe, karta oborena/izgubljena; trening se ne gleda u ekran. (B)
- **Predlog progresije** — posle N čistih sesija predložiti veći multiplikator; prirodno se nadovezuje na slajder. (C, posle slajdera)
- **Backlog:** push podsetnici (traže PWA), deljenje rezultata kao slika, prenos gost→account sesije, zarađivanje zamrzavanja, leaderboard (zahteva server-side validaciju — v. napomenu o poverenju u podatke u gamifikacijskom spec-u sekcija 5).

## 4. Krugovi — sadržaj, redosled, zavisnosti

### Krug A — "Ispravke i jasnoća" (mali spec+plan, bez migracija osim settings ključeva)

> **✅ ZAVRŠEN 2026-07-13.** Spec `docs/superpowers/specs/2026-07-13-krug-a-design.md`, plan `docs/superpowers/plans/2026-07-13-krug-a-plan.md` (12 taskova) — implementiran u celosti (commit raspon `ee2e372..77d8e2a`), testovi zeleni, verifikovano i push-ovano. Sledeći korak: brainstorm za Krug B.

1. Wake Lock tokom sesije (graceful fallback gde nije podržan).
2. Auto-pauza na gubitak vidljivosti, svi modovi; postojeći pauza overlay pri povratku; `pause_count` već postoji, dodaje se `total_pause_seconds` u `settings` + prikaz u istoriji/rezultatima.
3. Challenge objašnjenja: info na mode karticama + prvi-put modal.
4. Streak: tap na 🔥/❄️ otvara objašnjenje mehanike (automatska zamrzavanja, 2 po nedelji).
5. Jezik: padajući meni umesto toggle-a (i dalje samo SR/EN u ponudi).

Karakter: sve aditivno, ne dira domenski model ni postojeće testove (osim novih). Ovo je najbrži krug i podiže kvalitet postojećeg pre nego što se gradi novo.

> **⚠ REVIDIRANO 2026-07-15.** Obim i sadržaj Krugova B i C menja aneks
> `2026-07-15-krug-b-revizija.md` (tri vrata, score sistem, pet challenge
> modova; CEO Krug C povučen u Krug B kao faze v0.4.4–v0.4.8 — Krug C je
> ugašen). Sekcije ispod su istorijske; principi §5 ostaju na snazi.

### Krug B — "Sadržaj i Napredak" (spec+plan, seed izmene + frontend)
1. Biblioteka vežbi ≥4 po kategoriji. **Zavisnost:** vežbe dobijaju tier oznake usklađene sa budućim slajderom (Krug C) — dizajnirati šemu tier-ova SADA u spec-u ovog kruga, da se seed ne radi dvaput.
2. Pilot SVG animacija (1 vežba, čučanj), stilska pravila (linija, boja, petlja 2-3s, ugao); po prihvatanju — task za sve vežbe.
3. Napredak redizajn: kalendar sa treniranim/zamrznutim danima, grafikoni (nedeljna ponavljanja, po kategoriji, trend), postojeći rekordi/istorija integrisani.
4. "Ponovi poslednji trening" + zvuk/vibracija.

### Krug C — "Faza 3 revidirana" (zamenjuje/ažurira brainstorm od 2026-07-10)
Redosled unutar kruga (izmenjen u odnosu na originalne beleške zbog nalaza #1):
1. **Fiksan pun špil (52) + slajder težine** sa diskretnim koracima. Posledice koje spec MORA da obradi: rekordi se vezuju za multiplikator umesto težina×dužina; par formule po koraku slajdera; razdvajanje "slajder = multiplikator ponavljanja" od "izbor vežbe = tier, slobodno menjiv"; migracija `sessions.total_cards`; sudbina `SessionLengthSelector`.
2. **Sprint** (fiksno vreme 3/5/10 min, reshuffle-on-exhaustion) — ide ODMAH uz stavku 1 jer vraća opciju kratkog treninga koju pun špil ukida.
3. **Preživi špil** (fiksna kvota po koraku slajdera × 52, banka vremena, saldo se menja samo na klik).
4. **Džokeri kao odmor** (dira `deck.ts`/`Card` — sopstveni spec kao što beleške već kažu; pauzira budžet svih modova).
5. **PWA** (poslednje u krugu — keširanje je najstabilnije kad je sadržaj/asset lista konačna za ovo izdanje).

### Backlog (posle C, bez redosleda)
Push podsetnici, deljenje rezultata, prenos gost sesije, zarađivanje zamrzavanja, predlog progresije, novi jezici, leaderboard + server validacija, korisničke vežbe.

## 5. Principi koji čuvaju prostor za buduće faze (nastavak postojećih)

1. **Aditivne migracije** — nove kolone/tabele, nikad menjanje postojećih podataka bez errata-procesa (presedan: As=1).
2. **Mode registry** — svaki novi mod je modul + prevodi, ekran koraka 0 se ne menja.
3. **`settings` JSONB** za mod-specifične podatke — bez novih kolona na `sessions` dok podatak ne zatreba u SQL upitima.
4. **Tajmer invarijanta** (timestamp, nikad tick) — važi i za Wake Lock/auto-pauzu i za sve nove countdown-e.
5. **Podaci u bazi, ne u kodu** — vežbe, tier-ovi, sekunde po težini, par parametri: sve seed/podatak.
6. **Testovi kao ugovor** — postojeći testovi prolaze nepromenjeni osim kad spec eksplicitno kaže drugačije (presedan: As=1 errata tabela).
7. **i18n od prvog dana** za svaki novi string (ključ u sr.json + en.json, nikad hardkodiran tekst).
8. **Jedan spec po krugu**, Fable revizija pre i posle plana, ručno testiranje na kraju kruga PRE pisanja sledećeg spec-a.

## 6. Otvorena pitanja za sledeće brainstorminge (ne blokiraju Krug A)

- Tačan raspon i koraci slajdera (0.5–2.0 po 0.25 je predlog, nije zaključan).
- Šema tier-ova vežbi i kako se mapira na zone slajdera.
- Da li džokeri važe i u Klasičnom modu; dužina odmora.
- Sprint: da li se skor (broj karata) upoređuje kroz multiplikatore ili po multiplikatoru.
- iOS PWA ograničenja (Wake Lock, keš eviction) — proveriti aktuelno stanje podrške pre PWA spec-a.

## 7. Higijena repoa (uraditi pre Kruga A)

- Razjasniti misteriju `super-giggle` repoa: javna verzija vidljiva spolja ima samo `docs/` (4 commit-a), dok se lokalno/u aplikaciji vidi 65 commit-ova — proveriti da li je SAV kod push-ovan i na koji repo je Vercel zakačen (Vercel → Settings → Git). Kod mora biti na GitHubu (backup + istorija).
- Commit-ovati ovaj dokument u `docs/superpowers/strategy/`.
- Ažurirati `2026-07-10-phase3-brainstorm-notes.md` napomenom na vrhu: "Superseded by 2026-07-13-strategija-nastavka.md".
