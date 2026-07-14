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
Istorija izdanja i aktuelno "u pripremi": `CHANGELOG.md`.
