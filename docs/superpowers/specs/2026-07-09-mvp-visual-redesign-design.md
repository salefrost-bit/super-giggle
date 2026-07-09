# MVP Vizuelni Redizajn — Design Spec

Datum: 2026-07-09
Status: Draft za review

## 1. Šta je ovo i šta nije

Ovo **nije Faza 2** (gamifikacija — challenge mode, leaderboard, dostignuća, streak-ovi). Gamifikacija ostaje zaseban budući krug brainstorminga, nepromenjena u odnosu na sekciju 10 MVP spec-a.

Ovo je **manji, prioritetniji korak koji se primenjuje odmah nakon što Cursor završi MVP implementaciju** (`docs/superpowers/plans/2026-07-08-trening-app-mvp-plan.md`): vizuelni redizajn svih 5 postojećih ekrana + jedna mala ispravka u logici karata. Ne menja se arhitektura, komponente, props, ili testovi iz MVP plana — samo njihov vizuelni izgled (JSX/Tailwind klase).

## 2. Izvor istine za vizuelni dizajn

Kompletan, piksel-precizan vizuelni dizajn je već napravljen u Claude Design-u i sačuvan u repo-u:

- `docs/superpowers/specs/assets/mvp-visual-redesign/Trening.dc.html` — glavni prototip, sadrži sve ekrane (landing, setup×3, trening, rezultati, istorija) sa tačnim bojama, tipografijom, razmacima i tekstom
- `docs/superpowers/specs/assets/mvp-visual-redesign/image-slot.js`, `support.js` — prateće Claude Design runtime biblioteke (referenca, ne treba ih prevoditi u kod)

**Implementacija treba da bude piksel-precizna prema ovom fajlu**, osim eksplicitno navedenih odstupanja u sekciji 4. Ne prepisuje se ovde u prozi — čita se direktno iz fajla (isto pravilo koje je fajl sam sebi propisao u originalnom handoff README-u: "read it top to bottom, don't skim").

## 3. Design tokeni (izvučeno iz fajla, za Tailwind config)

| Token | Vrednost | Upotreba |
|---|---|---|
| `background` | `#18181b` | Osnovna pozadina stranice |
| `surface` | `#27272a` | Kartice, paneli, dugmad sekundarne akcije |
| `accent` | `#ccff00` | Primarna akcija, brojevi, isticanje, aktivna selekcija |
| `text-primary` | `#fafafa` | Primarni tekst |
| `text-muted` | `#a1a1aa` | Sekundarni/prigušen tekst |
| font | Nunito (400/600/700/800/900) | Jedini font u aplikaciji |
| radius | 14–24px (veće za kartice, manje za manje elemente) | Svi zaobljeni uglovi |

Ovi tokeni idu u `src/app/globals.css` kroz `@theme` blok (projekat koristi Tailwind v4, CSS-first konfiguraciju — nema `tailwind.config.ts`) kao imenovane boje (npr. `bg-surface`, `text-accent`) — ne kao raštrkane hex vrednosti po komponentama.

## 4. Odstupanja od fajla (implementirati DRUGAČIJE od onoga što fajl doslovno pokazuje)

**Jedino odstupanje:** ekran treninga u fajlu ima zamagljenu foto-pozadinu vežbe (`image-slot` komponenta, linije 138-140 u `Trening.dc.html`). Odlučeno je da se fotografije NE koriste. Umesto foto-pozadine: koristiti samo `background` boju (bez slike, bez `image-slot` importa). Ostatak ekrana treninga (glassmorphism kartica, štoperica, progress bar, dugmad, pauza overlay) implementirati identično fajlu.

Nema drugih odstupanja — sve ostalo (5 ekrana, kopirajte redom kako je u fajlu) implementira se piksel-precizno.

## 5. Ispravka iz Faze 1 (errata na već napisan/komitovan MVP kod)

Fajl-ov ugrađeni JS (`buildFullDeck()` u `<script type="text/x-dc">`) koristi As=1 (`['A', 1]`), što je u skladu sa odlukom da se MVP spec/plan usaglasi na As=1 umesto originalno planiranog As=14. Ovo zahteva izmenu već komitovanog MVP koda:

| Fajl | Trenutno (MVP, komitovano) | Treba da postane |
|---|---|---|
| `src/lib/domain/types.ts` | komentar `rank: 2-10 = face value, 11=J, 12=Q, 13=K, 14=A` | `rank: 1=A, 2-10 = face value, 11=J, 12=Q, 13=K` |
| `src/lib/domain/deck.ts` | `RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14]` | `RANKS = [1,2,3,4,5,6,7,8,9,10,11,12,13]` |
| `src/lib/domain/deck.test.ts` | očekuje sortirane rankove `[2..14]` | očekuje `[1..13]` |
| `src/lib/domain/reps.test.ts` | primer koristi `rank: 14` | zameniti validnim rankom (npr. `rank: 13`, K) i prepočunati očekivani rezultat |
| `supabase/migrations/0001_init.sql` | `check (card_value between 2 and 14)` | `check (card_value between 1 and 13)` |

**Bez izmena** (potvrđeno, ostaje kao u MVP planu): mapiranje znak→kategorija (herc=Guranje, tref=Povlačenje, pik=Noge, karo=Core), multiplikator za Napredni (1.25x), lista vežbi za Povlačenje (zgibovi ostaju).

## 6. Pristup implementaciji

- Tailwind theme tokeni u `src/app/globals.css` `@theme` bloku (sekcija 3) — jednom definisano, korišćeno svuda.
- Font Nunito učitan preko `next/font/google` u `layout.tsx`.
- Svaka od već postojećih 5+ MVP komponenti (`LandingScreen`, `DifficultySelector`, `ExercisePicker`, `SessionLengthSelector`, `SetupScreen`, `CardDisplay`, `ProgressIndicator`, `StopwatchDisplay`, `SessionScreen`, `SummaryScreen`, `HistoryScreen`) se **retušira** — menja se samo JSX/Tailwind klase da vizuelno prate `Trening.dc.html`, ne menja se logika, props, ni postojeći testovi. Testovi moraju i dalje da prolaze nepromenjeni posle retuširanja (osim testova eksplicitno navedenih u sekciji 5, koji se menjaju zbog As=1 ispravke).
- Novi vizuelni elementi iz fajla koji ne postoje u trenutnom MVP kodu (progress dots za 3 koraka setup-a, glassmorphism kartica na ekranu treninga, pauza kao pun-ekran overlay, procena vremena uz svaku opciju dužine treninga npr. "~10 min") — dodaju se u odgovarajuće komponente kao deo retuširanja.

## 7. Redosled primene

Ovaj redizajn se primenjuje **tek kada Cursor završi ceo MVP plan (svih 28 taskova)** — ne usred implementacije, da se izbegnu konflikti sa taskovima koji su u toku. Sledeći korak posle ovog spec-a je pisanje kratkog implementacionog plana (kao dodatak MVP planu) koji Cursor pokreće nakon MVP-a.
