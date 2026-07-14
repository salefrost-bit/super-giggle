<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
nije potvrđena. Kraj svakog izdanja = nova stavka u `CHANGELOG.md` jezikom
korisnika + minor bump + anotirani tag; izdanja se imenuju po sadržaju, ne
slovima.

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
