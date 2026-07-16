# Revizija strategije — Krug B postaje "Igrivost"

Datum: 2026-07-15
Status: AKTUELAN — dopuna izvora istine
Odnos prema `2026-07-13-strategija-nastavka.md`: ovaj aneks MENJA obim i
sadržaj Krugova B i C; sve ostalo iz strategije (principi §5, backlog, proces)
ostaje na snazi. Detaljan dizajn: `../specs/2026-07-15-krug-b-design.md`.

## 1. Šta se promenilo i zašto

Brainstorm za Krug B (2026-07-15) doneo je UX zaokret: umesto "sadržaj +
Napredak" kao odvojenih dorada, Krug B postavlja temelj igrivosti — tri ulaza
(Quick / Custom / Challenge), jedinstvenu score formulu, XP i pet challenge
modova. Posledica: dve stavke Kruga C povučene su unapred jer ih novi setup
tok prirodno sadrži:

- **Slajder multiplikatora + broj karata** (C stavka 1) → sada Custom trening.
  Umesto "fiksan pun špil", broj karata je slajder 12–52 (korak 4).
- **Sprint** (C stavka 2) → sada Challenge mod u v0.4.2.
- **Preživi špil** (C stavka 3) → sada Challenge mod u v0.4.3.

Odluke koje su pale u brainstormu (izvor istine za buduće rasprave):

1. **Tri vrata:** Quick (3 težine, default vežbe, 2 tapa do starta), Custom
   (slobodan izbor vežbi + 2 slajdera), Challenge (meni modova).
2. **Score arhitektura = hibrid (opcija C):** univerzalna baza po sesiji
   (Σ ponavljanja × tier faktor 1.0/1.5/2.0), rekordi PO MODU, ukupan XP koji
   samo raste. Challenge množioci do ×2 (+ Dvor ×1.25 bonus).
3. **Zvanja = kartaški simboli** (2→J→Q→K→A→🃏), bez reči, bez prevoda.
4. **Balansirano izvlačenje svuda:** jednak broj karata po kategoriji u svakoj
   sesiji → sve veličine špila deljive sa 4 → errata: 13/26 postaje 12/24.
5. **Tier šema:** tier 1–3 na vežbi, nezavisan od multiplikatora; 24 vežbe
   (2 po tier-u po kategoriji); `is_default` za Quick.
6. **Poker ruka odbačena za sada** (jedini mod koji menja session ekran) —
   backlog, dizajn skiciran u spec-u §11.

## 2. Novi sadržaj krugova

### Krug B — "Igrivost" (v0.4.x, jedan spec + jedan plan, faze redom)

| Verzija | Ime | Sadržaj |
|---|---|---|
| v0.4.1 | Temelj igrivosti | tri vrata, 24 vežbe + tier, balansirano izvlačenje, score/XP/zvanja/rekordi po modu, istorija sa detaljima, Ponovi poslednji |
| v0.4.2 | Sprint i Dvor | dva nova challenge moda |
| v0.4.3 | Preživi i Karta dana | dva nova challenge moda + dnevna petlja |
| v0.4.4 | Džokeri | odmor kao karta, svi modovi (kratak sopstveni spec) — ✅ Završen 2026-07-15 |
| v0.4.5 | SHUFFLE interfejs | ceo novi UI iz Claude Design prototipa: rebrend, EN copy, 14 činova, nova biblioteka vežbi, Profile/History/How to Play, score ritual — spec `specs/2026-07-16-shuffle-interfejs-design.md`. ZAMENJUJE ranije planirane "Animacije vežbi" (odbačene 2026-07-16 kao prekomplikovane) i apsorbuje "Napredak" — ✅ Završen 2026-07-16 |
| v0.4.6 | Ispravke iz žive probe | prva živa proba (2026-07-16) prekinula redosled: otporno čuvanje sesije, potvrda mejla, prsten uz kartu, istorija skrol, ogledalo rangova — spec `specs/2026-07-16-ispravke-zive-probe-design.md` — ✅ Završen 2026-07-17 |
| v0.4.7 | Ispravke iz žive probe 2 | druga runda nalaza: prekid sesije bez čuvanja, džokeri (<20 nema, skip), On the Clock nova logika (300s/±20s), scroll zona istorije — spec `specs/2026-07-17-ispravke-zive-probe-2-design.md` — ✅ Završen 2026-07-17 |
| (sledeći) | Dizajn-krug | nalaz 2 žive probe (kalendar/XP prikaz više sesija dnevno) + izmene interfejsa; korisnik prvo menja prototip u Claude Design alatu, pa spec ovde |
| v0.4.x | Zvuk i ritam | zvuk + vibracija (vizuali score rituala gotovi u v0.4.5) — kratak sopstveni spec; pomereno iza dizajn-kruga |
| v0.4.x | PWA | manifest, SW, offline; poslednja — asset lista konačna; verzionisan keš obavezan (kratak sopstveni spec) |

Proces: jedan implementacioni plan za v0.4.1–v0.4.3 (paket za Cursor, faze
redom, tag + CHANGELOG + ručna verifikacija po fazi); v0.4.4–v0.4.8 dobijaju
kratke spec-ove pre svojih faza, obim im je fiksiran glavnim spec-om.

### Krug C — ugašen (odluka 2026-07-15)

Sve tri preostale stavke Kruga C povučene su u Krug B kao faze v0.4.4
(džokeri), v0.4.6→sada backlog (predlog progresije) i v0.4.7 (PWA).
Krug C više ne postoji; posle v0.4.7 sledi **testiranje uživo**, pa se
**v0.5 planira iz nalaza tog testiranja** (očekuje se i izmena asseta —
zato PWA keš mora biti verzionisan sa update mehanizmom od prvog dana).

Backlog (bez kruga, bez redosleda): Poker ruka, combo množilac, nedeljni
izazovi + zarađivanje ❄️, leaderboard za Kartu dana, novi jezici, prenos
gost→nalog, push podsetnici, deljenje rezultata.

## 3. Otvorena pitanja zatvorena ovim aneksom

- Raspon i koraci slajdera (strategija §6): **0.5×–2.0× po 0.25; karte 12–52
  po 4.** Zaključano.
- Šema tier-ova (strategija §6): **tier 1–3 na vežbi, mapiran na težine samo
  u Quick-u; u Custom-u slobodan.** Zaključano.
- Sprint poređenje skora (strategija §6): **rekordi po trajanju (3/5/10),
  score bez dodatnog množioca.** Zaključano.

Ostaju otvorena (za spec-ove kasnijih faza): stilska pravila animacija,
layout Napretka, zvučni dizajn; džokeri (Krug C).
