# Šta je novo u ŠPIL-u

## v0.4.8 — Ispravke iz žive probe 3 (2026-07-17)

Doterivanje ekrana treninga po utiscima iz probe. Dugme „Sledeća karta" je izbačeno — **sama karta je dugme**: tapni je za sledeću, a na njoj sada piše „TAP FOR NEXT →" da se to vidi. Pauza je zato šira i narandžasta, a crveni ✕ za prekid treninga stoji odmah pored nje (umesto gore u uglu). Obaveštenje na pola špila sada iskoči uz kratku animaciju i samo nestane umesto da stoji na ekranu. Vraćanje na isto mesto posle osvežavanja stranice usred treninga stiže uz PWA izdanje.

## v0.4.7 — Ispravke iz žive probe 2 (2026-07-17)

Druga runda ispravki posle probe na telefonu. Svaki trening sada može da se **prekine** — ✕ u uglu, uz pitanje za potvrdu; prekinut trening se ne upisuje u istoriju. **Džokeri** se više ne pojavljuju u špilovima kraćim od 20 karata, a kad se pojave, odmor može da se **preskoči** jednim tapom. Mod **On the Clock** je dobio novu logiku: banka kreće od 5 minuta i stalno otkucava; svaka karta nosi svoj sat od 20 sekundi koji prelazi u minus — brzina puni banku, kašnjenje je prazni (najviše −20s po karti); isprazni ceo špil pre nule za ×1.5 bonus, a džoker i pauza zamrzavaju banku. Lista sesija u istoriji sada jasno pokazuje da se skroluje unutar svoje zone (tanak klizač + prelaz na dnu), kao u dizajnu.

## v0.4.6 — Ispravke iz žive probe (2026-07-17)

Prva proba na telefonu otkrila je pet stvari — sve su ispravljene. Čuvanje treninga je sada otporno na slabu mobilnu mrežu: svaki upis se automatski ponovi ako zapne, a poruka o grešci se javlja samo kad čuvanje stvarno propadne (dosad je umela da se javi i kad je sve prošlo). Registracija sada zaista traži potvrdu mejla pre prijave, sa jasnom porukom ako pokušaš da uđeš pre klika na link. Prsten oko karte se pomera zajedno sa kartom pri deljenju — nema više "pice" koja ostane da svetli iza. U istoriji se rašireni detalji sesije sami doskroluju u vidno polje. I najvažnije za trening: karte se sada dele tako da svaka vežba u svakom špilu dobije potpuno isti zbir ponavljanja (1:1:1:1) — isti rangovi u sve četiri boje, uključujući i Kartu dana.

## U pripremi

Novi izgled kalendara i istorije (više treninga u istom danu, XP na kalendaru) i sitne izmene interfejsa — prvo kroz dizajn prototip. Zatim zvuk i vibracija, pa instalacija na telefon (PWA).

## v0.4.5 — SHUFFLE (2026-07-16)

Aplikacija se sada zove **SHUFFLE**. Ceo interfejs je nov: početni ekran sa čipovima (profil, streak, Daily Deal), Quick Deal na jednom ekranu, Build your hand, Challenge meni. Tokom treninga — prsten oko karte, boje grejanja, animacija deljenja, pauza overlay i vođeno disanje na džokeru. Na kraju — proslava poena sa RANK UP bedžom. Novi ekrani **Profil**, **Istorija** i **Kako se igra**. Lestvica od 14 kartaških činova (od Džokera do Kralja) i nova biblioteka vežbi.

## v0.4.4 — Džokeri (2026-07-15)

Povremeno se, umesto prave karte, pojavi džoker — 30 sekundi ugrađenog odmora koji se sam završi i automatski nastavi na sledeću kartu. Radi u svim modovima i nikad ne troši vreme po karti niti budžet (Perfektan špil, Sprint, Dvor, Preživi špil, Karta dana).

## v0.4.3 — Preživi i Karta dana (2026-07-15)

Novi challenge mod **Preživi špil**: banka od 90 sekundi, svaka završena karta dopunjava kvotu, cilj je proći što više od 52 karata. **Karta dana** — jedinstveni dnevni špil od 20 karata (seed po datumu), tier vežbi rotira tokom nedelje; prvi pokušaj se čuva, replay ne utiče na rekord. Na početnom ekranu čip **🎴 Karta dana** (✓ kad je današnja odigrana).

## v0.4.2 — Sprint i Dvor (2026-07-15)

**Sprint** — izaberi 3, 5 ili 10 minuta, obori što više karata dok odbrojava vreme; špil se remeša kad se iscrpi. **Dvor** — 16 najtežih karata (J, Q, K, A), kvota po karti kao kod Perfektnog špila ali uvek procena (bez ličnog rekorda), bonus ×1.25 na poene.

## v0.4.1 — Temelj igrivosti (2026-07-15)

Tri načina ulaska u trening: brzi (nivo + dužina), po meri (svih 24 vežbe, slajderi), i challenge meni. Biblioteka proširena na 24 vežbe sa nivoima težine. Poeni se računaju po završetku svakog treninga; XP i kartaška zvanja na ekranu Napredak. Istorija sa padajućim detaljima po sesiji. Dugme „Ponovi poslednji trening".

## v0.3 — Pošteno vreme (2026-07-14) — ranije zvano: Krug A

Ekran se više ne gasi tokom treninga. Poziv ili zaključavanje telefona automatski pauzira trening umesto da ti krade vreme. Ukupno trajanje pauza se sada vidi u istoriji. Dodata objašnjenja kako rade challenge i niz treninga (streak), i padajući meni za izbor jezika.

## v0.2 — Perfektan špil (2026-07-10) — ranije zvano: Faza 2 / gamifikacija

Novi challenge mod sa vremenskom kvotom po karti, lični rekordi, niz treninga (streak) sa automatskim zamrzavanjima, novi ekran Napredak, i cela aplikacija sada radi na engleskom i srpskom.

## v0.1 — Temelj (2026-07-10) — ranije zvano: MVP + vizuelni redizajn

Ceo trening tok za gosta i za korisnika sa nalogom: izbor vežbi, izvlačenje karata, štoperica, čuvanje i pregled istorije. Tamni dizajn sa volt akcentom.
