# Trening App — MVP Design Spec

Datum: 2026-07-08
Status: Draft za review (pre implementacionog plana)

## 1. Pregled i cilj

Web aplikacija za trening bez opreme, inspirisana "deck of cards workout" konceptom (poznat i iz priče o zatvorskim treninzima). Korisnik pre starta bira po jednu vežbu za svaku od 4 kategorije koje pokrivaju celo telo, zatim "vuče karte" iz digitalnog špila — svaka karta određuje vežbu (po znaku) i broj ponavljanja (po vrednosti karte).

Cilj: besplatna, jednostavna, dostupna svima, radi u browseru na mobilnom i desktop uređaju. Ova faza (MVP) postavlja temelj; gamifikacija (tajmeri-izazovi, leaderboard, dostignuća) je namerno odložena za Fazu 2, ali arhitektura je pripremljena da je primi bez rušenja postojećeg.

## 2. Obim (Scope)

### U obimu za MVP
- Guest mod (bez naloga, bez čuvanja podataka) i Account mod (email/lozinka, istorija treninga)
- Podešavanje treninga: nivo težine, izbor vežbe po kategoriji, dužina sesije
- Generisanje i "vučenje" špila karata, mapiranje karta → vežba + ponavljanja
- Štoperica (ukupno vreme sesije, timestamp-based)
- Čuvanje i pregled istorije treninga (samo ulogovani korisnici)

### Eksplicitno van obima (Faza 2 — gamifikacija, poseban brainstorming/spec kasnije)
- Dual-timer challenge mode (countdown po karti koji utiče na globalni vremenski budžet)
- Leaderboard, dostignuća/bedževi, streak-ovi, XP/nivoi
- Korisnički-kreirane vežbe
- Social/friends funkcije, deljenje rezultata
- Offline/PWA podrška, push notifikacije

Arhitektura (sekcija 5) i model podataka (sekcija 6) su dizajnirani tako da Faza 2 funkcije mogu da se dodaju kao nove tabele/kolone bez migracije postojećih podataka — vidi sekciju 10 (Faza 2 pregled).

## 3. Tech stack

- **Frontend:** Next.js (React + TypeScript), mobile-first responsive dizajn
- **Backend/Baza:** Supabase (Postgres + ugrađen Auth za email/lozinku)
- **Hosting:** Vercel (frontend, serverless, besplatan tier) + Supabase cloud (baza/auth, besplatan tier)

Razlog izbora: relaciona baza prirodno podržava istoriju/statistiku i buduće leaderboard upite; oba servisa imaju velikodušan besplatan tier bez potrebe da se ručno održava server; stack je izuzetno dobro podržan u AI alatima za generisanje koda (Cursor/Claude), što smanjuje rizik od grešaka pri implementaciji.

## 4. Arhitektonski principi

### 4.1 Modularnost
Core logika (generisanje špila, izračunavanje ponavljanja, tajmer) je izolovana u čiste funkcije, nezavisne od UI-a i od guest/account statusa. Exercise biblioteka je podatak u bazi, ne hardkodirana u kodu.

### 4.2 Tajmer — invarijanta (bitno, primenjuje se svuda gde ima vremena)
**Tajmer se nikad ne računa akumulacijom/tick-ovanjem (npr. `setInterval` koji uvećava brojač). Uvek se računa iz timestamp-a:**
- Štoperica: čuva se `started_at`. Prikazano vreme = `sada - started_at`, računa se iznova pri svakom prikazu.
- Pauza: pri pauziranju čuva se `paused_at`; pri nastavku, `started_at` se pomera unapred za trajanje pauze. Štoperica ostaje tačna bez obzira na to koliko je pauza trajala ili da li je tab bio u pozadini.
- Ovaj isti princip će važiti za budući countdown u challenge modu (Faza 2): čuva se `deadline`, preostalo vreme = `deadline - sada`.

Razlog: tick-based tajmeri driftuju kad je browser tab u pozadini ili telefon zaključan — česta klasa bagova koju ovim izbegavamo unapred.

### 4.3 Struktura projekta otporna na duge AI-asistirane sesije
Pošto će implementacija ići kroz Cursor+Claude u odvojenim sesijama (i kroz kompresiju konteksta), projekat prati ova pravila:
1. Mali, fokusirani moduli — svaka čista funkcija (deck logika, tajmer, rep kalkulacija) u svom fajlu, testabilna nezavisno od UI-a.
2. Jedan "izvor istine" za tipove podataka (`types.ts`) — Session, CardDraw, Exercise, TimerState definisani na jednom mestu.
3. Kratak README po modulu — šta radi, šta prima/vraća, koje invarijante mora da poštuje (npr. tajmer princip iz 4.2).
4. Automatizovani unit testovi za kritičnu logiku (generisanje špila, rep kalkulacija, tajmer) — čvrsta provera nezavisna od toga da li agent "misli da je tačno."
5. Implementacioni plan (sledeći korak posle ovog spec-a) podeljen na male, samostalne faze sa jasnim kriterijumom završenosti — svaka faza se može raditi bez čitanja cele istorije projekta.

## 5. Model podataka

| Tabela | Ključna polja | Napomena |
|---|---|---|
| `profiles` | `id`, `username`, `is_public` (bool, default false) | Proširuje Supabase Auth korisnika. `is_public` pripremljen za budući leaderboard (opt-in od starta). |
| `categories` | `id`, `name`, `sort_order` | Guranje/Povlačenje/Noge/Core — tabela, ne enum, radi lakog dodavanja (npr. Kardio) bez izmene koda. |
| `difficulty_levels` | `id`, `name`, `default_rep_multiplier`, `sort_order` | Početnik/Srednji/Napredni. Multiplikator ponavljanja je podatak, ne hardkod. |
| `exercises` | `id`, `name`, `category_id`, `difficulty_level_id`, `created_by` (nullable) | `created_by = null` → ugrađena vežba; `created_by = user_id` → rezervisano za buduću opciju korisničkih vežbi (Faza 2), bez potrebe za migracijom. |
| `sessions` | `id`, `user_id` (nullable — gost ne piše u bazu), `total_cards`, `rep_multiplier`, `game_mode` (default `'classic'`), `settings` (JSONB), `started_at`, `completed_at`, `total_duration_seconds`, `status` | `game_mode` i `settings` su prošireni bez menjanja kolona kad se doda npr. `'challenge'` mod u Fazi 2. |
| `session_exercises` | `session_id`, `category_id`, `exercise_id` | Koja vežba je izabrana po kategoriji za tu sesiju (4 reda po sesiji). |
| `card_draws` | `session_id`, `order_index`, `suit`, `card_value`, `reps`, `completed_at` | Timestamp svakog klika na "sledeća karta" — dovoljno za buduću analizu vremena po karti (dual-timer challenge mode) bez menjanja MVP koda. |

Guest sesije nikad ne dodiruju bazu — cela sesija živi u memoriji/klijentu i nestaje po zatvaranju.

## 6. Karte i špil — logika

- Standardan špil od 52 karte, 4 znaka (♠♥♦♣), bez džokera u MVP-u.
- Mapiranje znak → kategorija (redosled proizvoljan, definisan u kodu kao konstanta):
  - ♥ Herc → Guranje
  - ♣ Tref → Povlačenje
  - ♠ Pik → Noge
  - ♦ Karo → Core
- Vrednost karte → broj ponavljanja: 2–10 = nominalna vrednost, J=11, Q=12, K=13, A=14 (zbir po znaku ~104, ne mora tačno 100 — dovoljno blizu).
- Množilac težine (iz `difficulty_levels.default_rep_multiplier`) se primenjuje na vrednost karte, zaokruženo na najbliži ceo broj (minimum 1). Predloženi početni multiplikatori (seed podaci, menjivi bez izmene koda): Početnik ×0.75, Srednji ×1.0, Napredni ×1.25.
- Dužina sesije: špil se izmeša (Fisher-Yates), zatim se uzima prvih N karata gde je N ∈ {13 (¼), 26 (½), 52 (ceo)}. Nema posebne logike za "po jedan od svakog znaka" — jednostavno nasumičan podskup izmešanog špila.

## 7. Tok korišćenja (User Flow)

1. **Početni ekran** — "Nastavi kao gost" ili "Prijavi se / Registruj se". Ulogovani korisnik dodatno vidi "Istorija treninga".
2. **Podešavanje treninga** — izbor nivoa težine → filtrira ponuđene vežbe po kategoriji → korisnik bira po jednu vežbu za svaku od 4 kategorije → bira dužinu sesije → "Kreni".
3. **Sesija u toku** — prikaz trenutne karte (vežba + ponavljanja), štoperica (timestamp-based, gore desno), dugme "Sledeća karta" (beleži `completed_at`, prelazi dalje), indikator napretka ("Karta 14/26"), opcija pauze.
4. **Kraj sesije** — prikaz ukupnog vremena i pregleda po kategoriji. Gost: rezultat se ne čuva (opciono ponuditi registraciju da sačuva). Ulogovan: sesija se upisuje u bazu.
5. **Istorija treninga** (samo ulogovani) — lista prethodnih sesija (datum, trajanje, težina) — osnova za buduće statistike, bez grafika u MVP-u.

## 8. Biblioteka vežbi (seed sadržaj)

| Kategorija | Početnik | Srednji | Napredni |
|---|---|---|---|
| Guranje | Sklekovi na kolenima | Standardni sklekovi | Diamond / eksplozivni sklekovi |
| Povlačenje | Veslanje peškirom / nisko-ugaoni zgibovi | Zgibovi (delimični/asistirani) | Puni zgibovi |
| Noge | Čučnjevi | Iskoraci (lunges) | Jump squats / pištolj čučnjevi (asistirani) |
| Core | Trbušnjaci (crunches) | Standardni trbušnjaci | Nožne makaze / V-up |

Napomena: sve vežbe su na ponavljanja (nema vremenski merenih vežbi poput planka u MVP-u — pojednostavljenje modela podataka). Lista živi u bazi (`exercises` tabela), lako proširiva bez izmene koda.

## 9. Guest vs Account — detalji

| | Guest | Account (email/lozinka) |
|---|---|---|
| Podešavanje i vučenje karata | Da, identično | Da, identično |
| Čuvanje rezultata | Ne (nestaje po zatvaranju) | Da (`sessions` tabela) |
| Istorija treninga | Ne postoji | Vidljiva, hronološka lista |
| Registracija posle sesije | Ponuđena opcija (rezultat se gubi ako ne registruje odmah — nema "prenosa" gost→account sesije u MVP-u) | N/A |

## 10. Faza 2 — pregled (dokumentovano, ne implementirano sada)

Da bi svaka buduća sesija (Cursor ili Claude) imala kompletnu sliku pravca bez ponovnog smišljanja:

- **Nacrt migracije** — `phase2_gamification.sql` će sadržati predložene tabele (`achievements`, `user_achievements`, `challenge_results`) — pisan kao referenca, NE primenjen na bazu dok Faza 2 ne krene.
- **Prazni moduli sa README-om, bez koda** — npr. `lib/gamification/README.md` opisuje planiranu challenge-tajmer logiku i evaluaciju dostignuća, rezerviše "adresu" za budući kod.
- **Planirane funkcije:** dual-timer challenge mode (na `sessions.game_mode = 'challenge'` i `settings` JSONB za vremenski budžet), leaderboard (upit nad `sessions` + `profiles.is_public`), streak-ovi (računato iz `sessions.completed_at`, bez nove tabele), dostignuća/XP (nove tabele, referenciraju postojeće), korisničke vežbe (`exercises.created_by`), moguć "Joker = bonus vežba" mehanika.

Ništa od ovoga se ne implementira u MVP fazi — ovo je referenca za kasniji poseban spec/brainstorming.

## 11. Ne-funkcionalni zahtevi

- Besplatno hostovanje (Vercel + Supabase free tier)
- Mobile-first responsive — primarna upotreba je na telefonu tokom treninga
- Podrška za moderne browsere (Chrome, Safari, Firefox — poslednje 2 verzije)

## 12. Review proces

Posle odobrenja ovog spec-a i izrade implementacionog plana, planiran je nezavisan pregled oba dokumenta preko Agent alata sa `model: "fable"` — svež pregled bez konteksta ovog razgovora, radi provere pre predaje Cursoru.
