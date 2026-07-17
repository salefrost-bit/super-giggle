# v0.4.8 "Ispravke iz žive probe 3" — dizajn

Datum: 2026-07-17
Status: Odobren (korisnikove primedbe sa lokalnog testiranja v0.4.7, iste
večeri); implementacija odmah, plan preskočen (presedan v0.4.6/v0.4.7).

## 1. Refresh usred sesije — ODLOŽENO za PWA fazu

Primedba: refresh vraća na početni ekran i gubi sesiju u toku. Odluka
(preporuka prihvaćena u razgovoru): puna popravka = čuvanje i vraćanje stanja
sesije (timestampovi čine vraćanje vremena izvodljivim — invarijanta 1), a to
je sopstvena celina koja ide uz PWA fazu jer: (a) browser "upozorenje pre
napuštanja" ne radi pouzdano na telefonima (iOS Safari ignoriše), (b) PWA
standalone režim uklanja i glavni uzrok (slučajni pull-to-refresh). U PWA
spec obavezno ući "vraćanje sesije u toku posle refresh/restart".

## 2. Half-deck toast — kratko i sa efektom

Uputstvo: "treba da iskoci na kratko uz neki efekat i da odma nestane".
Trajanje 2300 → 1500 ms; nova `toastK` animacija (pop-in, kratko zadržavanje,
fade-out naviše) u `globals.css`, `animation ... both` prati unmount tajming.

## 3. Karta je kontrola — dugme "Sledeća karta" uklonjeno

Uputstvo: "sledeca karta dugme treba da se izbaci jer je sama karta vec ta
funkcija ali treba u njoj da se doda neka strelica sa tekstom".

- Dugme uklonjeno iz donjeg reda; Pauza postaje široka (flex-1) u narandžastoj
  iz palete (`--color-heat-warn`), tekst u boji pozadine.
- Karta preuzima ULOGU dugmeta u celosti: `aria-label` = `workout.nextCard`,
  `aria-disabled` kad je čekanje/pauza/odmor; tap radi i tokom deal animacije
  (kao što je dugme radilo) — dupli tap i dalje brani `nextDisabled`/
  `isAdvancing` u SessionScreen-u, ne animaciona faza.
- U karti, ispod imena vežbe: `workout.tapForNext` + strelica u accent boji
  (novi ključ u OBA kataloga). Ključ `workout.preparing` obrisan (koristilo ga
  samo uklonjeno dugme).
- **ERRATE (invarijanta 4), nalog = citat gore:** u `SessionScreen.test.tsx`
  (a) assert "Priprema treninga..." dugmeta zamenjen aria-disabled assertima
  na karti; (b) tokom džoker odmora kontrola NE postoji (karta nije
  renderovana) — `toBeDisabled` assert zamenjen odsustvom; posle odmora
  `not.toHaveAttribute('aria-disabled')`. Svih ostalih ~46 klikova na
  "Sledeća karta" radi nepromenjeno jer se ime kontrole nije menjalo.

## 4. ✕ za prekid — dole, pored Pauze, crven

Uputstvo: "X dugme za prekid treninga treba da bude pored dugmeta za pauzu i
da ima crvenu boju". ✕ seli iz header-a u donji red desno od Pauze: kvadratno
(64px), ivica i tekst u `--color-heat-danger`, blaga crvena pozadina. Dijalog
potvrde nepromenjen (v0.4.7 §1).

## Isporuka

Verifikacija na lokalu (korisnik testira uživo u browseru) → po potvrdi:
CHANGELOG + bump 0.4.8 + tag. Napomena: Vercel ima aktivan incident sa GitHub
integracijom (2026-07-16 23:09 UTC) — push/deploy po razrešenju.

## Šta se NE dira

Logika modova (v0.4.7), tok čuvanja, pauza overlay, migracije, ekran koraka 0.
