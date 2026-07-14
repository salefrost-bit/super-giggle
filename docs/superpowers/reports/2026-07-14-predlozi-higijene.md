# Predlozi higijene repoa — 2026-07-14

Datum: 2026-07-14
Status: Predlozi ZA ODOBRENJE — ništa iz ovog dokumenta nije primenjeno. Svaka stavka je spremna za primenu u sledećoj sesiji (pun sadržaj fajla ili tačan diff).
Veza: nalazi N1–N15 i otvorena pitanja O1–O4 iz `2026-07-14-repo-audit.md`.

---

## 1. Novi `README.md` (zamena celog fajla — nalaz N1)

```markdown
# ŠPIL — trening bez opreme

Web aplikacija za "deck of cards" trening: izaberi po jednu vežbu za svaku od 4
kategorije (Guranje ♥ / Povlačenje ♣ / Noge ♠ / Core ♦), izvuci kartu — znak
određuje vežbu, vrednost broj ponavljanja. Radi kao gost (ništa se ne čuva) ili
sa nalogom (istorija, lični rekordi, streak). Modovi: Klasično i challenge
"Perfektan špil" (vremenska kvota po karti). Jezici: engleski (default) i srpski.

**Live:** https://trening-app-five.vercel.app

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) + Tailwind CSS v4 (CSS-first tokeni)
- [Supabase](https://supabase.com) — Postgres + Auth (email/lozinka), owner-RLS
- next-intl (bez locale rutiranja), Vitest + Testing Library
- Hosting: Vercel + Supabase cloud

## Pokretanje lokalno

1. `npm install`
2. Kopiraj `.env.local.example` u `.env.local` i upiši Supabase URL + anon ključ
   (Supabase projekat: primeni `supabase/migrations/` redom kroz SQL editor).
3. `npm run dev` → http://localhost:3000

Gost mod radi i bez baze — prijava/istorija zahtevaju Supabase.

## Testovi i provere

- `npm test` — Vitest (unit + komponentni; jsdom)
- `npx tsc --noEmit` — typecheck
- `npm run lint` — ESLint

## Struktura

- `src/lib/domain/` — čista logika: špil, ponavljanja, tajmer (timestamp invarijanta), challenge, streak, pauze
- `src/lib/modes/` — registar modova igre (novi mod = novi unos + prevodi)
- `src/lib/supabase/` — SAV Supabase I/O (client, queries, sessions, records)
- `src/hooks/` — useStopwatch, useCardQuota, useWakeLock
- `src/components/` — ekrani po fazama toka: landing → setup → session → summary + progress
- `src/i18n/` + `messages/` — LocaleProvider, registar lokala, sr/en katalozi
- `supabase/migrations/` — aditivne SQL migracije (0001 šema, 0002 seed, 0003 As=1 errata, 0004 gamifikacija)
- `docs/superpowers/` — strategija, spec-ovi, planovi, izveštaji (izvor istine procesa)

## Za AI agente

Pročitaj **`AGENTS.md`** (obavezna pravila) i **`docs/superpowers/README.md`**
(indeks dokumentacije i redosled čitanja) pre bilo kakvog rada. Strategija u
`docs/superpowers/strategy/` je izvor istine o tome šta se sledeće radi.
```

---

## 2. Prošireni `AGENTS.md` (zamena celog fajla; postojeća Next.js napomena zadržana na vrhu — nalazi N3/N13 delimično)

```markdown
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# ŠPIL — pravila za agente

## Pre planiranja

Obavezno pročitaj `docs/superpowers/strategy/` (aktuelnu strategiju) i
`docs/superpowers/README.md` (indeks + redosled čitanja) PRE predlaganja ili
planiranja bilo čega. Strategija je izvor istine o krugovima, obimu i backlogu.

## Proces razvoja (nepromenjen od MVP-a)

brainstorm → spec → nezavisna revizija (svež kontekst) → implementacioni plan →
revizija plana → implementacija task-po-task → ručna verifikacija (uklj. telefon
kad izdanje dira tajmere/vidljivost) → version bump + git tag.

Jedan spec po krugu. Nema novog spec-a dok ručna verifikacija prethodnog kruga
nije potvrđena.

## Invarijante koda

1. **Tajmer invarijanta:** svako vreme se izvodi iz timestampova
   (`now − started_at`, `deadline − now`; pauza pomera timestamp). NIKAD
   tick-akumulacija (`setInterval` brojači). Važi za svaki novi tajmer,
   countdown, kvotu i pauzu. (MVP spec §4.2)
2. **Aditivne migracije:** nove kolone/tabele u `supabase/migrations/` sa
   rastućim brojem; postojeće kolone se ne menjaju i ne brišu bez eksplicitnog
   errata-procesa u spec-u (presedan: As=1, migracija 0003).
3. **Svi UI stringovi kroz i18n:** svaki novi string dobija ključ u OBA
   kataloga (`messages/sr.json` + `messages/en.json`). Nijedan hardkodiran
   tekst u komponentama.
4. **Postojeći testovi su ugovor:** prolaze nepromenjeni. Izmena postojećeg
   assert-a je dozvoljena SAMO kad je spec eksplicitno naloži kao erratu, sa
   tačnim citatom u planu.
5. **Registar modova:** novi mod igre = novi modul + unos u
   `src/lib/modes/registry.ts` + prevodi. Ekran koraka 0 se ne menja.
6. **Gost nikad ne piše u Supabase.** Sve Supabase I/O ide kroz
   `src/lib/supabase/` — nigde drugde se ne importuje supabase-js.
7. **Podaci u bazi, ne u kodu:** vežbe, težine, par parametri, sekunde po
   težini — seed/podatak, ne konstanta u kodu.
8. **Mod-specifični podaci u `sessions.settings` JSONB** — bez novih kolona na
   `sessions` dok podatak ne zatreba u SQL upitima.
```

---

## 3. Novi `docs/superpowers/README.md` — indeks (nov fajl)

```markdown
# docs/superpowers — indeks

Izvor istine o tome ŠTA je projekat i KAKO se razvija. Konvencija imenovanja:
`YYYY-MM-DD-<krug|tema>-<design|plan|report|strategy|brainstorm>.md`.

## Redosled čitanja za novog agenta

1. `strategy/2026-07-13-strategija-nastavka.md` — šta je urađeno, šta je sledeće (krugovi A/B/C, backlog, principi)
2. `../../AGENTS.md` — obavezne invarijante koda i proces
3. Spec + plan POSLEDNJEG završenog kruga (trenutno: Krug A) — za sveže konvencije
4. Starije spec-ove/planove SAMO po potrebi, kao istorijsku referencu za lokacije fajlova

Ne čita se cela istorija — strategija + poslednji dokumenti su dovoljni.

## Strategija

| Dokument | Jedna rečenica | Status |
|---|---|---|
| `strategy/2026-07-13-strategija-nastavka.md` | Klasifikacija nalaza ručnog testiranja u krugove A (jasnoća), B (sadržaj/Napredak), C (slajder/modovi/PWA) + backlog i principi. | **AKTUELAN — izvor istine** |

## Spec-ovi

| Dokument | Jedna rečenica | Status |
|---|---|---|
| `specs/2026-07-08-trening-app-design.md` | MVP: model podataka, tajmer invarijanta (§4.2), arhitektura guest/account toka. | Završen (implementiran); principi §4 i dalje obavezuju |
| `specs/2026-07-09-mvp-visual-redesign-design.md` | Dark+volt redizajn svih ekrana po Claude Design prototipu + As=1 errata (§5). | Završen (implementiran) |
| `specs/2026-07-09-gamification-phase2-design.md` | Perfektan špil, registar modova, rekordi, streak, Napredak, i18n SR/EN. | Završen (implementiran) |
| `specs/2026-07-10-phase3-brainstorm-notes.md` | Brainstorm beleške za Fazu 3 (fiksan špil, Preživi špil, Sprint, džokeri). | **SUPERSEDED** strategijom od 2026-07-13 |
| `specs/2026-07-13-krug-a-design.md` | Krug A: Wake Lock, auto-pauza, zbir pauza, objašnjenja modova/streaka, meni jezika. | Završen (implementiran) |
| `specs/assets/` | HTML prototipovi (Claude Design) za redizajn i gamifikaciju. | Istorijska referenca |

## Planovi

| Dokument | Jedna rečenica | Status |
|---|---|---|
| `plans/2026-07-08-trening-app-mvp-plan.md` | 28 taskova MVP-a. | Završen ⚠ napomena: rankovi 2–14 iz Global Constraints su superseded As=1 errata-om |
| `plans/2026-07-09-mvp-visual-redesign-plan.md` | 13 taskova redizajna + As=1 errata. | Završen |
| `plans/2026-07-09-gamification-phase2-plan.md` | 15 taskova gamifikacije. | Završen |
| `plans/2026-07-13-krug-a-plan.md` | 12 taskova Kruga A + obavezna telefonska verifikacija. | Završen |

## Izveštaji

| Dokument | Jedna rečenica | Status |
|---|---|---|
| `reports/2026-07-14-repo-audit.md` | Audit strukture, drifta i higijene repoa posle Kruga A. | Aktuelan |
| `reports/2026-07-14-predlozi-higijene.md` | Konkretni predlozi higijenskih izmena (README, AGENTS, CI, verzionisanje…). | Aktuelan (čeka odobrenje) |

## Kako se pokreće nova faza (checklist)

1. Potvrdi da je ručna verifikacija PRETHODNOG kruga završena (uklj. telefon
   ako je krug dirao tajmere/vidljivost) — bez toga nema novog spec-a.
2. Pročitaj strategiju + spec/plan poslednjeg kruga (NE celu istoriju).
3. Brainstorm za novi krug → spec (`YYYY-MM-DD-<krug>-design.md` u `specs/`).
4. Nezavisna revizija spec-a (svež kontekst) → primena nalaza.
5. Implementacioni plan (`YYYY-MM-DD-<krug>-plan.md` u `plans/`) → nezavisna
   revizija plana → primena nalaza → commit oba dokumenta.
6. Implementacija task-po-task (preflight gate = Task 1) → ručna verifikacija →
   version bump + tag → ažuriraj status kruga u strategiji i u ovom indeksu.

**Šta se NE radi ponovo:** ne re-verifikuju se tagovani/završeni krugovi; ne
čita se cela istorija dokumenata (samo strategija + poslednji); ne piše se novi
spec pre potvrde ručne verifikacije prethodnog kruga; ne "popravljaju" se
dokumentovane devijacije iz završenih planova.
```

Napomena: sekcija "Kako se pokreće nova faza" ovde ispunjava i stavku 8 zadatka.

---

## 4. Konvencija imenovanja dokumenata + lista preimenovanja

**Predlog konvencije:** `YYYY-MM-DD-<krug|tema>-<tip>.md`, gde je `<tip>` ∈ `design | plan | report | strategy | brainstorm`. Direktorijum odgovara tipu: `specs/` (design + brainstorm), `plans/`, `reports/`, `strategy/`.

**Stanje:** 8 od 9 dokumenata VEĆ prati konvenciju. Odstupanja:

| Fajl | Problem | Predlog |
|---|---|---|
| `specs/2026-07-10-phase3-brainstorm-notes.md` | Tip je `brainstorm-notes` (dvočlan, jedini takav) | Preimenovati u `specs/2026-07-10-phase3-brainstorm.md` |
| `strategy/2026-07-13-strategija-nastavka.md` | Tema i tip su srpski (`strategija-nastavka`), ostali dokumenti su en-tema + en-tip | **Preporuka: NE preimenovati** — fajl je referenciran sa 5+ mesta i ime je jasno; konvencija se primenjuje od sledećeg dokumenta |

**Reference koje povlači preimenovanje `phase3-brainstorm-notes.md`** (kompletna lista, proverena git grep-om):

1. `docs/superpowers/strategy/2026-07-13-strategija-nastavka.md:9` — pominjanje u kontekstu
2. `docs/superpowers/strategy/2026-07-13-strategija-nastavka.md:88` — stavka higijene
3. `docs/superpowers/reports/2026-07-14-repo-audit.md` — ovaj audit (2 pominjanja u tabelama)
4. Predloženi `docs/superpowers/README.md` iznad (1 red tabele) — ako se preimenovanje odobri, indeks se piše sa novim imenom

Trošak je mali, ali dobit je čisto kozmetička — **alternativa je i ovde "ne preimenovati"** i samo usvojiti konvenciju ubuduće. Odluka na tebi (upisano i kao implicitno pitanje uz O-listu audita).

---

## 5. Verzionisanje

**Predlog šeme:** minor verzija = završen krug/faza; patch = ispravke unutar kruga.

- Retroaktivno mapiranje (samo dokumentacione prirode): 0.1.0 = MVP + redizajn, 0.2.0 = gamifikacija, **0.3.0 = Krug A** (trenutno stanje).
- **Odmah:** u `package.json` promeniti `"version": "0.1.0"` → `"version": "0.3.0"` i tagovati trenutni HEAD (`69af6b4`):

```bash
git tag -a v0.3.0-krug-a -m "Krug A: wake lock, auto-pauza, zbir pauza, objašnjenja, meni jezika"
git push origin v0.3.0-krug-a
```

- **Pravilo ubuduće (uneti u AGENTS.md proces, već formulisano u stavci 2):** kraj kruga = bump minor verzije + anotirani tag `v<verzija>-<krug>` (npr. `v0.4.0-krug-b`), tek POSLE ručne verifikacije.
- Opciono (otvoreno pitanje O4 iz audita): retroaktivni tagovi `v0.1.0-mvp-redizajn` i `v0.2.0-gamifikacija` na odgovarajuće commit granice — korisno za "ne re-verifikuju se tagovani krugovi", ali zahteva pronalaženje tačnih commitova.

---

## 6. Default asset-i bezbedni za brisanje (nalaz N2)

Grep kroz `src/` (i ceo repo van `node_modules`): nijedna referenca ni na jedan od ovih fajlova.

```bash
git rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

`public/` posle ovoga ostaje prazan — to je u redu (Next.js ga toleriše; favicon živi u `src/app/favicon.ico` i KORISTI se — ne dirati).

---

## 7. Predlog `.github/workflows/ci.yml` (nov fajl — nalaz N9)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test
```

Napomene: bez deploy koraka (Vercel deploy-uje sam); testovi ne zahtevaju Supabase (sve je mock-ovano) ni env varijable; Node 22 = aktuelni LTS kompatibilan sa Next.js 16.

---

## 8. Sekcija "Kako se pokreće nova faza"

Kompletno uključena u predlog `docs/superpowers/README.md` (stavka 3 iznad — poslednja sekcija indeksa): checklist od 6 koraka + eksplicitna lista "šta se NE radi ponovo" (ne re-verifikuju se tagovani krugovi; čita se strategija + poslednji dokumenti, ne cela istorija; nema novog spec-a pre potvrde ručne verifikacije prethodnog kruga; ne "popravljaju" se dokumentovane devijacije).

---

## Dodatni mali diff-ovi (uz nalaze audita, spremni za primenu)

**N4 — `src/lib/gamification/`:** obrisati ceo direktorijum (sadrži samo zastareli README):

```bash
git rm -r src/lib/gamification
```

**N5 — `src/lib/domain/README.md`:** dodati na kraj liste:

```markdown
- `challenge.ts` — per-card quota split and score/win logic for the
  "Perfect Deck" mode (budget from par formula or personal record).
- `streak.ts` — daily streak from completed-session dates; 2 automatic
  freezes per ISO week, streak must be anchored by a real workout.
- `pauseLog.ts` — pause accounting from timestamps (count + total
  seconds); idempotent pause/resume, same timer invariant as `timer.ts`.
```

**N6 — `src/lib/supabase/README.md`:** dodati stavku:

```markdown
- `records.ts` — read-only personal-records and completed-session-dates
  queries over `sessions` (best time, best score per combination).
```

**N3 — `.cursor/rules/plan-execution.mdc`:** ažurirati sekciju ciklusa — označiti gamifikaciju i Krug A kao DONE i preusmeriti na strategiju:

```markdown
1. **MVP** — … — **DONE**, all 28 tasks committed.
2. **Visual redesign** — … — **DONE**, all 13 tasks committed.
3. **Phase 2 gamification** — … — **DONE**, all 15 tasks committed.
4. **Krug A (fixes & clarity)** — Spec: `docs/superpowers/specs/2026-07-13-krug-a-design.md` · Plan: `docs/superpowers/plans/2026-07-13-krug-a-plan.md` — **DONE**, all 12 tasks committed.

There is currently NO active plan. What comes next is defined by
`docs/superpowers/strategy/2026-07-13-strategija-nastavka.md` (Krug B) — a new
spec + plan must be written and approved before any implementation starts.
```

**N13 — vrh `docs/superpowers/plans/2026-07-08-trening-app-mvp-plan.md`** (odmah ispod naslova):

```markdown
> **ERRATA (2026-07-09):** rank scheme changed to As=1 (ranks 1–13) by the
> visual redesign spec §5 — the "ranks 2–14" line in Global Constraints below
> is superseded. See `supabase/migrations/0003_card_value_range.sql`.
```

---

## Predloženi redosled primene (jedna sesija)

1. Brisanja (stavka 6 + N4) i mali README diff-ovi (N5, N6) — bez rizika.
2. Novi `README.md`, prošireni `AGENTS.md`, `docs/superpowers/README.md` indeks, N3 i N13 diff-ovi.
3. `ci.yml` + push → potvrda da je CI zelen.
4. Version bump 0.3.0 + tag `v0.3.0-krug-a` (posle odluke o O4).
5. (Posle odluka o O1–O3): repo ime/vidljivost, sudbina `phase2_gamification.sql`, `<html lang>`.
