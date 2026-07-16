# v0.4.7 "Ispravke iz žive probe 2" — dizajn

Datum: 2026-07-17
Status: Odobren (korisnikova uputstva 2026-07-17, "na isti ovaj način");
implementacija u istoj sesiji, plan preskočen odlukom korisnika (presedan
v0.4.6). Ručna verifikacija na telefonu posle isporuke, pre dizajn-kruga.

## 1. Prekid sesije bez čuvanja

Uputstvo: "Svaka započeta sesija treba da ima opciju da se prekine u bilo kom
trenutku bez čuvanja u istoriju sa upitnikom […] da/ne".

- `SessionScreen` header dobija ✕ dugme (uvek dostupno, i tokom pauze/odmora).
- Tap → potvrdni overlay: naslov + telo ("trening se neće sačuvati") +
  dugmad NASTAVI / PREKINI. Novi i18n ključevi `workout.quit*` u OBA kataloga.
- Potvrda → za ulogovane: best-effort `deleteSession(sessionId)` (novi API u
  `src/lib/supabase/sessions.ts`; DELETE nad `sessions`, kaskada briše
  `session_exercises` + `card_draws`; RLS politika "for all" to već dozvoljava
  — bez migracije). Neuspeh brisanja ne blokira izlaz (console.error).
  Gost: ništa se ne briše (invarijanta 6 — gost ionako ne piše).
- Novi prop `onAbort?: () => void`; `page.tsx` vraća na landing.

## 2. Džokeri: ispod 20 karata nema, preskakanje svuda

Uputstvo: "jocker kartu treba izbaciti iz deckova sa manje od 20 karata, a
takođe im treba dati opciju da mogu da se preskoče".

- `jokerCountFor`: `< 20 → 0`; `20 → 1`; `> 20 → 2` (24+ nepromenjeno).
  Pogađa Custom 12/16 i Court (16) — više nemaju džokera.
- `assignJokerBreaks`: guard `count === 0 → []`.
- **ERRATA (invarijanta 4), nalog gore:** `jokers.test.ts` asserti
  `jokerCountFor(12)` i `(16)` menjaju se sa `1` na `0`.
- `JokerRestScreen` dobija `onSkip` dugme (i18n `jokers.skip`, oba kataloga);
  `SessionScreen` uvodi deljenu `endRest()` putanju (istek i preskok idu
  istim kodom). Objašnjenje džokera (`jokers.explanation`) se osvežava
  (preskakanje + ne pojavljuju se u malim špilovima).

## 3. On the Clock — nova logika moda

Uputstvo (citat, izvor errata ispod): "u modu on the clock svaka vezba treba
da ima 20 sekundi bez obzira na tier i na broj ponavljanja, logika iza ovog
moda je da svaka vezba ima timer od 20 do -20 sekundi, krece od dvadesete
unazad i prelazi u minus, na kraju se taj broj sabira ili oduzima od bank
timera koji krece da odbrojava od 300 sekundi to jest 5 minuta unazad, ako se
ceo spil izvrti pre nego sto glavni timer istekne challenge je uspeo, u ovom
modu ako se pojavi dzoker on treba da zaustavi taj bank timer".

Mehanika (sve iz timestampova, invarijanta 1):

- **Banka:** kreće od 300 s i odbrojava u realnom vremenu:
  `banka = 300 + Σ(korekcije) − aktivno_vreme`, gde je `aktivno_vreme` =
  `stopwatch.elapsedSeconds − ukupno_vreme_džoker_odmora` (pauza već zamrzava
  stopericu; džoker odmor se izuzima eksplicitno — "zaustavi bank timer").
- **Karta:** tajmer 20 → −20 s, nezavisan od tier-a/ponavljanja
  (`CARD_SECONDS = 20`). Na završetku karte korekcija =
  `clamp(20 − aktivne_sekunde_karte, −20, +20)` se dodaje u Σ.
- **Kraj:** ceo špil (52, nepromenjeno) pre isteka banke → uspeh
  (`survivedAll`, ×1.5 množilac kao do sada); banka ≤ 0 u bilo kom trenutku →
  neuspeh, sesija se odmah završava (efekat na tick, ne samo na klik).
- **UI:** veliki brojač = banka (mm:ss, `heatForAbsolute`); ispod karte novi
  red sa kartinim tajmerom (`+Ns`/`−Ns`, boja accent/danger); bank traka
  procenat od 300; tekstovi moda (`modes.survive.desc/explanation`) i
  caption-i (`workout.everyCardFeedsBank` → nova formulacija) prepisani u
  OBA kataloga.
- `bank.ts` novi čisti API: `BANK_START_SECONDS = 300`, `CARD_SECONDS = 20`,
  `cardAdjustment(activeCardSeconds)`, `bankRemaining(adjustments,
  activeElapsedSeconds)`, `isBankrupt(remaining)`. `applyCompletedCard` se
  briše (jedini potrošač je survive grana koja se prepisuje).
- **ERRATE (invarijanta 4), nalog = citat gore:**
  - `bank.test.ts`: asserti nad `applyCompletedCard` i `BANK_START_SECONDS
    === 90` zamenjuju se testovima novog API-ja (300, ±20, clamp).
  - `SessionScreen.visuals.test.tsx` (On the Clock varijanta): pomak tajmera
    83 s (banka 90) postaje 293 s (banka 300) za danger prag < 8 s; asserti
    ostaju semantički isti (traka 100% na startu, vinjeta pri dnu banke).

## 4. Istorija — vidljiva scroll zona

Uputstvo: "Istorija sesija treba da bude lista unutar svoje zone koja dobija
scroll sa vise sesija kao u .html designu".

Kutija liste već postoji (`max-h-[430px] overflow-y-auto`); nedostaju signali
iz prototipa (linija 626): tanak scrollbar (`scrollbar-width: thin`,
`scrollbar-color: #3a3a40 transparent`) i fade maska na dnu
(`mask-image: linear-gradient(to bottom, black 88%, transparent)`).
Dodaju se identično prototipu; visina i kalendar netaknuti.

## 5. Isporuka

CHANGELOG jezikom korisnika + bump 0.4.7 + anotirani tag v0.4.7; strategija
i README indeks dobijaju red za ovo izdanje. Redosled ostaje: posle ručne
verifikacije → dizajn-krug (Claude Design) → zvuk → PWA.

## Šta se NE dira

Migracije (nijedna), ekran koraka 0, score formula (osim što survive uspeh
zadržava postojeći ×1.5), tok čuvanja iz v0.4.6, deljenje karata (ogledalo
rangova), svi ostali modovi.
