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
| `strategy/2026-07-13-strategija-nastavka.md` | Klasifikacija nalaza ručnog testiranja u krugove A (jasnoća), B (sadržaj/Napredak), C (slajder/modovi/PWA) + backlog i principi. | **AKTUELAN** — krugovi B/C revidirani aneksom 2026-07-15 |
| `strategy/2026-07-15-krug-b-revizija.md` | Krug B postaje "Igrivost" (v0.4.1–v0.4.8): tri vrata, score/XP, pet modova, džokeri, animacije, Napredak, zvuk, PWA; Krug C ugašen, v0.5 posle testiranja uživo. | **AKTUELAN — izvor istine za plan razvoja** |

## Spec-ovi

| Dokument | Jedna rečenica | Status |
|---|---|---|
| `specs/2026-07-08-trening-app-design.md` | MVP: model podataka, tajmer invarijanta (§4.2), arhitektura guest/account toka. | Završen (implementiran); principi §4 i dalje obavezuju |
| `specs/2026-07-09-mvp-visual-redesign-design.md` | Dark+volt redizajn svih ekrana po Claude Design prototipu + As=1 errata (§5). | Završen (implementiran) |
| `specs/2026-07-09-gamification-phase2-design.md` | Perfektan špil, registar modova, rekordi, streak, Napredak, i18n SR/EN. | Završen (implementiran) |
| `specs/2026-07-10-phase3-brainstorm-notes.md` | Brainstorm beleške za Fazu 3 (fiksan špil, Preživi špil, Sprint, džokeri). | **SUPERSEDED** strategijom od 2026-07-13 |
| `specs/2026-07-13-krug-a-design.md` | Krug A: Wake Lock, auto-pauza, zbir pauza, objašnjenja modova/streaka, meni jezika. | Završen (implementiran) |
| `specs/2026-07-15-krug-b-design.md` | Krug B "Igrivost": tri vrata (Quick/Custom/Challenge), score/XP/zvanja, 24 vežbe + tier, 5 challenge modova, isporuka v0.4.1–v0.4.6. | Završen (implementiran, v0.4.1–v0.4.3) |
| `specs/2026-07-15-dzokeri-design.md` | v0.4.4 Džokeri: ugrađeni odmor (30s, automatski) u svim modovima, bez migracije šeme. | Završen (implementiran) |
| `specs/2026-07-16-shuffle-interfejs-design.md` | v0.4.5 SHUFFLE: novi interfejs iz Claude Design prototipa — rebrend, EN copy, 14 činova, nova biblioteka, Profile/History/How to Play. | Završen (implementiran) |
| `specs/2026-07-16-ispravke-zive-probe-design.md` | v0.4.6: ispravke iz prve žive probe — otporno čuvanje (klijentski ID + retry), potvrda mejla, prsten uz kartu, istorija skrol, ogledalo rangova. Plan preskočen odlukom korisnika. | Završen (implementiran) |
| `specs/assets/` | HTML prototipovi (Claude Design) za redizajn i gamifikaciju + istorijski SQL nacrt (`phase2_gamification.sql`, superseded). | Istorijska referenca |

## Planovi

| Dokument | Jedna rečenica | Status |
|---|---|---|
| `plans/2026-07-08-trening-app-mvp-plan.md` | 28 taskova MVP-a. | Završen ⚠ napomena: rankovi 2–14 iz Global Constraints su superseded As=1 errata-om (errata na vrhu fajla) |
| `plans/2026-07-09-mvp-visual-redesign-plan.md` | 13 taskova redizajna + As=1 errata. | Završen |
| `plans/2026-07-09-gamification-phase2-plan.md` | 15 taskova gamifikacije. | Završen |
| `plans/2026-07-13-krug-a-plan.md` | 12 taskova Kruga A + obavezna telefonska verifikacija. | Završen |
| `plans/2026-07-15-dzokeri-plan.md` | 6 taskova v0.4.4 Džokeri: domenski modul, i18n, SessionScreen integracija, prvo objašnjenje, tag. | Završen |
| `plans/2026-07-16-shuffle-interfejs-plan.md` | 20 taskova v0.4.5 SHUFFLE u 4 faze (temelj → setup → sesija → Profile/History/HowToPlay). | Završen — tag v0.4.5 |

## Izveštaji

| Dokument | Jedna rečenica | Status |
|---|---|---|
| `reports/2026-07-14-repo-audit.md` | Audit strukture, drifta i higijene repoa posle Kruga A. | Aktuelan |
| `reports/2026-07-14-predlozi-higijene.md` | Konkretni predlozi higijenskih izmena (README, AGENTS, CI, verzionisanje…) — odobreni i primenjeni 2026-07-14. | Primenjen |
| `reports/2026-07-16-higijena-posle-shuffle.md` | Čišćenje posle v0.4.5: 48 mrtvih i18n ključeva, Pill.tsx, dve dev-zavisnosti (N11/N12), statusi u docs, mcp.json u gitignore. | Primenjen |

## Prevod starih naziva u imenovanje po sadržaju

Od izdanja "Pošteno vreme" nadalje, izdanja se imenuju PO SADRŽAJU (na srpskom)
uz tehnički tag `v0.X.0` — nazivi "Krug A/B/C" i "Faza 1/2/3" se više ne
koriste za nova izdanja. Stari dokumenti se NE preimenuju (istorija); ova
tabela je prevod:

| Stari naziv | Novo ime izdanja | Verzija |
|---|---|---|
| Faza 1 / MVP + vizuelni redizajn | Temelj | v0.1 |
| Faza 2 / gamifikacija | Perfektan špil | v0.2 |
| Krug A | Pošteno vreme | v0.3 |
| Faza 3 brainstorm / Krug B i C | razbija se u više izdanja v0.4+, svako imenovano po sadržaju | v0.4+ |

Istorija izdanja i aktuelno "u pripremi": `../../CHANGELOG.md`.

## Kako se pokreće nova faza (checklist)

1. Potvrdi da je ručna verifikacija PRETHODNOG kruga završena (uklj. telefon
   ako je krug dirao tajmere/vidljivost) — bez toga nema novog spec-a.
2. Pročitaj strategiju + spec/plan poslednjeg kruga (NE celu istoriju).
3. Brainstorm za novi krug → spec (`YYYY-MM-DD-<tema>-design.md` u `specs/`).
4. Nezavisna revizija spec-a (svež kontekst) → primena nalaza.
5. Implementacioni plan (`YYYY-MM-DD-<tema>-plan.md` u `plans/`) → nezavisna
   revizija plana → primena nalaza → commit oba dokumenta.
6. Implementacija task-po-task (preflight gate = Task 1) → ručna verifikacija →
   nova stavka u `CHANGELOG.md` + version bump + tag → ažuriraj status kruga u
   strategiji i u ovom indeksu.

**Šta se NE radi ponovo:** ne re-verifikuju se tagovani/završeni krugovi; ne
čita se cela istorija dokumenata (samo strategija + poslednji); ne piše se novi
spec pre potvrde ručne verifikacije prethodnog kruga; ne "popravljaju" se
dokumentovane devijacije iz završenih planova.
