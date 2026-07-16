# v0.4.6 "Ispravke iz žive probe" — dizajn

Datum: 2026-07-16
Status: Odobren u brainstorm sesiji 2026-07-16; implementacija u istoj sesiji.
Poreklo: prva živa proba na telefonu (nalazi korisnika, 6 stavki). Nalaz 2
(kalendar/XP prikaz više sesija dnevno) NIJE u ovom izdanju — ide u sledeći,
dizajn-krug kroz Claude Design prototip, zajedno sa ostalim izmenama interfejsa.

Proces napomena: implementacioni plan kao poseban dokument je preskočen
eksplicitnom odlukom korisnika ("odmah implementiraj, bez previše potvrda");
ovaj spec je jedini izvor istine za obim. Ručna verifikacija na telefonu se
radi POSLE isporuke celog izdanja, pre sledećeg kruga.

## 1. Otporno čuvanje sesije (nalaz 1)

**Utvrđeno stanje:** upis sesije se dešava jednom, na startu treninga, bez
ponovnog pokušaja. Na mobilnoj mreži se dešava da upis USPE na serveru, a
odgovor se izgubi — aplikacija prijavi neuspeh ("Saving isn't working right
now…"), prestane da upisuje karte, a trening se ipak pojavi u istoriji
(potvrđeno u probi: i na starom i na novom nalogu; trening se ipak pojavi).

**Rešenje — tri dela:**

1. **Klijentski ID sesije:** `SessionScreen` generiše UUID
   (`crypto.randomUUID()`) i prosleđuje ga u `createSession`. Upis tako
   postaje idempotentan: ponovni pokušaj sa istim ID-em na već upisanu sesiju
   vraća duplicate grešku (Postgres kod `23505`), koju tretiramo kao USPEH.
2. **Retry sa backoff-om:** helper `withSaveRetry` u `src/lib/supabase/`
   (invarijanta 6: sav Supabase I/O u tom modulu): do 3 pokušaja, pauze
   ~0.8s/2.4s između. Primenjuje se na `createSession`, `recordCardDraw`
   (unique `(session_id, order_index)` čini i njega idempotentnim) i
   `completeSession` (UPDATE, prirodno idempotentan). `session_exercises`
   ima PK `(session_id, category_id)` — duplicate = uspeh, isto pravilo.
3. **Pošten baner:** `saveState = 'failed'` (i baner `workout.saveFailed`)
   tek kad su SVI pokušaji iscrpljeni. Postojeći tekst ostaje.

Tajmer invarijanta se ne dira (backoff pauze nisu merenje vremena treninga).
Bez izmene šeme (invarijanta 2: nula novih migracija).

## 2. Potvrda mejla pri registraciji (nalaz 3)

**Odluka korisnika:** registracija TRAŽI potvrdu mejla.

- **Supabase dashboard (radi korisnik, uz vođenje):** Authentication →
  Sign In / Up → Email → uključiti "Confirm email". Bez toga kod ove sekcije
  nema efekta.
- **Aplikacija:** postojeći success ekran ("proveri mejl") postaje istinit —
  sa uključenom potvrdom `signUp` NE vraća sesiju, korisnik NIJE ulogovan.
- **Login:** greška "Email not confirmed" sa Supabase-a se mapira na
  razumljivu poruku — novi i18n ključ `auth.emailNotConfirmed` u OBA
  kataloga (invarijanta 3). Ostale greške ostaju kakve jesu.

## 3. Prsten se animira zajedno sa kartom (nalaz 4)

**Utvrđeno stanje:** `HeatRing` (conic-gradient — "pizza") je RODITELJ karte;
deal animacija (`transform`/`opacity`) je na samoj karti, pa prsten ostane
vidljiv kad karta odleti. U prototipu (`specs/assets/shuffle-prototype.html`,
sekcija Daily s28) prsten je omotač koji nosi `transform:{{cardT}};
opacity:{{cardO}}` — animira se zajedno sa kartom.

**Rešenje:** `CardDisplay` dobija opcioni prop `ringFraction?: number | null`
i sam renderuje `HeatRing` kao omotač; deal stil (`transform/opacity/
transition`) se primenjuje na NAJSPOLJNIJI element (prsten kad postoji, karta
kad prstena nema). `HeatRing` dobija opcioni `style` prop. `SessionScreen`
umesto `<HeatRing><CardDisplay/></HeatRing>` prosleđuje `ringFraction`.
Važi za sve modove sa prstenom (uočeno u Daily, isti mehanizam svuda).

## 4. Istorija — raširen red se vidi ceo (nalaz 5)

**Utvrđeno stanje:** lista sesija je kutija `max-h-[430px] overflow-y-auto`;
raširen red pri dnu otvori detalje ISPOD donje ivice kutije, unutrašnji skrol
na telefonu nije očigledan → utisak odsečenog sadržaja (potvrđeno u probi:
"donji deo detalja je odsečen").

**Rešenje:** pri širenju reda, red se programski doskroluje u vidno polje
unutar kutije (`scrollIntoView({ block: 'nearest', behavior: 'smooth' })` na
elementu reda, posle rendera detalja). Fiksna visina i kalendar ispod ostaju
netaknuti.

## 5. Ogledalo rangova (nalaz 6)

**Odluka korisnika:** svaka sesija mora dati identičan zbir ponavljanja po
vežbi (odnos 1:1:1:1), za svaki podeljen špil.

**Rešenje:** `drawSessionCards` izvlači JEDAN skup rangova veličine
`deckSize/4` pa ISTE rangove deli u sve 4 boje; redosled celog špila se potom
meša postojećim mešanjem. Posledice:

- Zbir ponavljanja po boji (vežbi) identičan u svakom špilu, svih veličina.
- Pun špil (52) i Court (16) već imaju ovu osobinu — ponašanje im se ne menja.
- Daily ostaje deterministički po datumu (isti seeded rng ulaz) — svi igrači
  i dalje dobijaju isti špil; sadržaj špila od ovog izdanja je balansiran.
- Blitz (remeš na iscrpljen špil) i Preživi (bankrot): garancija važi za
  PODELJEN špil; prekinut trening prirodno nema jednak završen zbir.
- U špilu od N karata svaki izabrani rang se pojavljuje tačno 4 puta —
  svesno prihvaćeno (odluka korisnika u brainstormu).

**Testovi:** novi slučajevi u `deck.test.ts` (isti skup rangova po boji,
jednak zbir rangova po boji za 12/20/24; determinizam sa seeded rng).
Postojeći asserti se NE menjaju (invarijanta 4); provereno da nijedan
postojeći test ne fiksira nasumičnost rangova po boji.

## 6. Isporuka

- CHANGELOG stavka jezikom korisnika + bump na 0.4.6 + anotirani tag v0.4.6.
- Strategija (aneks 2026-07-15): v0.4.6 = "Ispravke iz žive probe";
  Zvuk i ritam → v0.4.7; PWA → v0.4.8. Dizajn-krug (nalaz 2 + izmene
  interfejsa iz Claude Design-a) se ubacuje posle ovog izdanja, pre zvuka,
  kao svoje izdanje.
- Ručna verifikacija na telefonu: greška čuvanja se više ne javlja pri
  normalnom treningu; registracija traži potvrdu; nema pizza efekta; detalji
  istorije vidljivi; zbir ponavljanja identičan po vežbi.

## Šta se NE dira

Migracije (nijedna nova), postojeći testovi (nijedan assert), ekran koraka 0,
score formula, tajmeri, i18n ključevi van `auth.emailNotConfirmed`.
