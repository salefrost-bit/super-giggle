# Faza 3 — Beleške sa brainstorminga (NIJE odobren spec)

Datum: 2026-07-10
Status: Neformalne beleške, čekaju se rezultati ručnog testiranja gamifikacije pre pisanja pravog spec-a.

## Kontekst

Ove ideje su razrađene dok je Cursor implementirao Fazu 2 (gamifikacija). Dogovoreno: posle završetka gamifikacije, korisnik ručno testira ceo tok i vraća se sa kompletnim izveštajem/spiskom izmena — koji će verovatno uključivati i izmene ovde navedenih ideja (proširena lista vežbi, promenjeni nazivi challenge-a, slider umesto diskretnih nivoa težine za izbor "težine"). Ništa od ovoga nije zaključano — sve podložno reviziji kad se sve ovo sagleda zajedno u tom izveštaju.

Tri odvojene stavke, nameravani redosled implementacije (posle Faze 2):

## 1. Fiksan broj karata u špilu (uklanja se izbor dužine)

- Umesto biranja ¼/½/ceo špila (nezavisno od težine), špil je UVEK pun (52 karte).
- Težina (Početnik/Srednji/Napredni) i dalje utiče SAMO na ponuđene vežbe + multiplikator ponavljanja — ne na broj karata.
- Dira već implementiran MVP: `SessionLengthSelector` (uklanja se ili ostaje samo za Sprint kao izbor vremena), `drawSessionCards(deckSize)`, `sessions.total_cards` CHECK constraint, postojeći testovi za izbor dužine.
- Setup wizard se skraćuje sa 4 na 3 koraka za Klasično/Perfektan špil/Preživi špil (mode → težina → vežbe); Sprint zadržava 4. korak ali za izbor VREMENA umesto dužine.
- Odluka: uraditi kao poseban spec+plan, PRE Preživi špil/Sprint spec-a (jer taj oslanja se na "uvek isti broj karata").

## 2. Novi challenge modovi: "Preživi špil" i "Sprint"

### Preživi špil
- Jednostavniji od Perfektnog špila — budžet NE zavisi od ličnog rekorda, samo `fiksno_po_karti(težina) × 52`.
- Fiksno vreme po karti definisano PO TEŽINI (mi zadajemo vrednosti, npr. Početnik=25s, Srednji=20s, Napredni=15s) — ne skalira sa brojem ponavljanja.
- Mehanika: svaka karta ima svoj fiksni countdown (može se ponovo iskoristiti postojeći `useCardQuota` hook, samo mu se prosledi konstanta umesto izračunate težine).
- Globalni "saldo" (banka vremena) je MIRAN broj — NE tik-tače uživo. Menja se SAMO u trenutku klika na "sledeća karta": `saldo += (fiksna_kvota - stvarno_utrošeno_vreme)`. Brže od kvote = saldo raste (banka); sporije = saldo pada — simetrično, 1:1, bez pojačane kazne.
- Ako saldo padne na 0 pre kraja špila: challenge izgubljen, trening se nastavlja normalno bez daljeg pritiska (isto pravilo kao Perfektan špil — fitnes se nikad ne prekida).
- Rekord za Progress ekran: najveći finalni pozitivan saldo ("završio si sa +45s u plusu").
- Ime moda: "Preživi špil" (potvrđeno, poklapa se sa backlog imenom iz gamifikacijskog spec-a).

### Sprint
- Fiksno vreme (3/5/10 min) UMESTO dužine špila — jedini mod bez unapred izabranog broja karata.
- Kad se potroši ceo špil (52 karte) a vremena ima još, špil se PREMEŠA i nastavlja (moguće kroz više "krugova").
- Kad vreme istekne: trenutna karta se ZAVRŠAVA (fitnes-bezbedno, nikad prekid usred vežbe), tek posle klika na "sledeća karta" Sprint se zvanično završava.
- Skor: broj obrađenih karata (ne ukupan broj ponavljanja).
- Tehnički: može se ponovo iskoristiti `useCardQuota` hook, samo mu se "reset key" NE menja po karti (broji unazad kontinuirano kroz ceo Sprint umesto da se resetuje).
- Potrebna nova funkcija za "beskonačno" izvlačenje karata (reshuffle-on-exhaustion).

### Baza (aditivno, na postojeći gamifikacijski model)
- `difficulty_levels.survive_card_seconds` — novo, fiksna vrednost po težini.
- `sessions.total_cards` postaje nullable (za Sprint, gde nema unapred zadate dužine); stvaran broj odrađenih karata ide u `settings.cards_completed`.
- `PersonalRecord` (postojeći records sistem iz gamifikacije) dobija `bestBalanceSeconds` polje za Preživi špil rekord.
- Mode registry (već postoji) dobija dva nova unosa: `survive_deck`, `sprint`.

## 3. Džokeri kao ugrađen odmor

- Ideja: dodati džokere u špil (van standardnih 52 karte). Kad se izvuče džoker, umesto vežbe prikazuje se odbrojavanje odmora (npr. 30-60s), pa se automatski prelazi na sledeću kartu.
- Tajmer/budžet svih modova (Perfektan špil, Preživi špil, Sprint) se PAUZIRA tokom džoker-odmora — džoker je "besplatna" pauza, ne košta budžet.
- Dira `deck.ts`/`Card` tip (osnovni domenski model koji koriste SVI modovi) — zato zaslužuje sopstveni spec+plan, ne deo drugih dveju stavki.
- Otvorena pitanja za kasnije: da li se broji u "Karta X/Y" progres, tačna dužina odmora (fiksna ili po težini), da li se primenjuje u Klasičnom modu ili samo u challenge modovima.

## Sledeći koraci

1. Cursor završava Fazu 2 (gamifikacija) po postojećem planu.
2. Korisnik ručno testira ceo tok i vraća se sa punim izveštajem/spiskom (uključujući moguće izmene gore navedenih ideja: proširena lista vežbi, drugačiji nazivi challenge-a, slider za težinu umesto diskretnih nivoa).
3. Tek tada se ove ideje pretvaraju u pravi spec+plan (redosled: fiksan špil → Preživi špil/Sprint → džokeri), uz isti proces kao dosad (brainstorming → spec → Fable revizija → plan → Fable revizija → Cursor).
