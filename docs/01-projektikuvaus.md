# Projektikuvaus

Projektin nimi: **Sähkönkäytön ajoitusoptimointi**

## Käyttäjä, ongelma ja arvolupaus

Kohdekäyttäjä on kuvitteellinen pörssisähköä käyttävä kotitalouden asukas, joka pystyy siirtämään jonkin sähkölaitteen käyttöä päivän sisällä. Hän haluaa selvittää, milloin laitetta kannattaa käyttää, mutta hintataulukosta on työlästä vertailla usean tunnin jaksoja käsin.

Sovellus etsii käyttäjän tuomasta hintatiedostosta edullisimman yhteisen aikataulun 1–4 laitteelle. Käyttäjä antaa laitteiden tehot ja käyttöajat tai varttikohtaiset tehoprofiilit sekä yhteisen tehorajan. Tuloksena näytetään laitteiden käyttöjaksot ja energiakustannukset. Käyttö voi olla yhtenäistä tai käyttäjän salliessa pilkottua. Hyöty on nopeampi ja toistettava ajankohdan vertailu. Ohjelma optimoi käytön ajoitusta, ei sähkön markkinahintaa.

## Käyttäjäskenaariot

1. **Edullisen käyttöajan etsiminen:** Asukas tuo yhden päivän tuntihinnat CSV-tiedostona ja syöttää laitteen tehoksi 1 kW ja käyttöajaksi 2 tuntia. Ohjelma näyttää aineiston halvimman yhtenäisen kahden tunnin jakson sekä sen kustannuksen.
2. **Käyttöajan muuttaminen:** Asukas vaihtaa käyttöajan kahdesta tunnista kolmeen ja laskee tuloksen uudelleen. Ohjelma päivittää suositellun jakson ja kustannusarvion uusien syötteiden perusteella.
3. **Virheellisen aineiston käsittely:** Asukas tuo tiedoston, josta puuttuu tunti tai jossa hinta ei ole numero. Ohjelma kertoo virheen syyn eikä esitä aineistosta optimointitulosta.

## Vaatimukset ja hyväksymiskriteerit

Prioriteetti P1 tarkoittaa vähimmäiskokonaisuuteen kuuluvaa toimintoa. P2 on lisäominaisuus, joka tehdään vasta P1-toimintojen jälkeen.

| Tunniste | Vaatimus | Hyväksymiskriteeri | Prioriteetti |
|---|---|---|---|
| V1 | Käyttäjä voi tuoda sovitun muotoisen CSV-hintatiedoston. | Tiedosto, jonka sarakkeet ovat `aika;hinta_snt_kwh` ja jossa on neljä peräkkäistä tuntia hinnoin 10, 5, 3 ja 12, hyväksytään. Sovellus näyttää ladattujen tuntien määräksi 4. | P1 |
| V2 | Sovellus tarkistaa aineiston ennen laskentaa. | Tyhjä aineisto, väärät sarakeotsikot, virheellinen aikaleima, puuttuva tai ei-numeerinen hinta, päällekkäinen tunti tai katkos tuntisarjassa aiheuttaa ymmärrettävän virheilmoituksen. Virheellisen tuonnin jälkeen aiempi optimointitulos poistetaan näkyvistä. Negatiiviset ja nollahinnat hyväksytään. | P1 |
| V3 | Käyttäjä voi antaa tehon ja käyttöajan. | Positiivinen, äärellinen teho kilowatteina ja positiivinen 0,25 tunnin monikerta hyväksytään. Tyhjä, ei-numeerinen, nolla tai negatiivinen syöte hylätään. Myös käyttöaika, joka ylittää aineiston tuntimäärän, hylätään selkeällä ilmoituksella. | P1 |
| V4 | Sovellus etsii halvimman yhtenäisen käyttöjakson ja laskee energiakustannuksen. | Kun 4.11.2026 klo 00, 01, 02 ja 03 alkavien tuntien hinnat ovat 10, 5, 3 ja 12 snt/kWh, teholla 1 kW ja käyttöajalla 2 h tulos on klo 01–03 ja 0,08 €. Jos useita jaksoja on yhtä halvalla, valitaan aikaisin. | P1 |
| V5 | Tulos esitetään selkeästi ja vastaa nykyisiä syötteitä. | Näytetään aloitus- ja lopetusaika päivämäärineen, kesto, teho, energiankulutus (kWh) ja kustannus (€). V4:n esimerkissä energiankulutus on 2 kWh. Syötteiden muuttaminen poistaa vanhan tuloksen, kunnes laskenta tehdään uudelleen. | P1 |
| V6 | Käyttäjä näkee hinnat ja valitun jakson kuvaajassa. | Jokaiselle vartille näytetään hinta yksikössä snt/kWh, ja laskennan valitsema jakso erottuu kuvaajasta. Myös negatiiviset hinnat näkyvät oikein. | P2 |
| V7 | Usean laitteen yhteinen optimointi ja pilkottava käyttö. | Kaksi 1 kW laitetta, molemmille 0,5 h, neljän vartin aineisto ja tehoraja 1 kW: laitteet eivät käy päällekkäin. Pilkottava 0,5 h laite valitsee varttihinnoista 1, 20, 2, 30 ensimmäisen ja kolmannen vartin. | P1 |
| V8 | Varttihinnat, osatunnit ja vaihteleva teho. | 15 min CSV hyväksytään; 0,25 h ja 0,5 h hyväksytään. Profiili 2; 0,5 kestää 30 min ja kuluttaa 0,625 kWh. Vaiheiden järjestys säilyy myös pilkottaessa. | P1 |

Hyväksymiskriteerit kuvaavat tavoiteltua toimintaa. Ensiversion automaattiset testitulokset ja vielä puuttuvat selainkokeet erotellaan testausdokumentissa. Todelliset kokeet ja havainnot kirjataan tiedostoon `docs/03-testaus-ja-validointi.md`.

## Rajaus ja vähimmäiskokonaisuus

Nykyinen selainversio kattaa vaatimukset V1–V8. Käyttäjä tuo tunti- tai varttihintaisen tiedoston, lisää 1–4 laitetta ja asettaa niiden yhteisen tehorajan. Laitteen käyttöaika annetaan 0,25 tunnin askelin. Vaihtoehtona on vaihteleva tehoprofiili, jossa jokainen arvo kuvaa yhtä varttia. Käyttö on oletuksena yhtenäistä; pilkkominen sallitaan erikseen laitteelle.

Alkuperäisen version normaalitapaus (1 kW / 2 h → 0,08 €) ja liian pitkä käyttöaika (4 h aineistosta pyydetään 5 h) säilyvät hyväksymiskokeina. Kuvaaja näyttää varttihinnat ja korostaa vartit, joilla vähintään yksi laite on käytössä.

Tästä selainversiosta rajataan edelleen pois:

- Hintojen automaattinen haku, reaaliaikaiset hinnat ja hintaennusteet.
- Oikeiden sähkölaitteiden ohjaus ja automaatiolaitteistot.
- Käyttäjän erikseen määrittämät sallitut käyttöikkunat: koko ladattu aineisto on sallittu hakualue.
- Kirjautuminen, tietokanta, käyttäjätilit ja tietojen pysyvä tallennus.
- Sähkönsiirron, sähköveron, myyjän marginaalin ja perusmaksujen erillinen laskenta.

Ohjelma ei lupaa tiettyä säästöä tai koko sähkölaskun optimointia. Se etsii halvimman jakson annetusta aineistosta ja annetuilla oletuksilla.

## Toteutuksen rakenne

Toteutus suunnitellaan HTML-, CSS- ja JavaScript-tiedostoiksi ilman palvelinta vaativia riippuvuuksia. Tavoitteena on, että sovellus voidaan käynnistää avaamalla `index.html` selaimessa.

| Tiedosto tai kansio | Suunniteltu tehtävä |
|---|---|
| `index.html` | Tiedoston valinta, syötekentät, laskentapainike ja tulosnäkymä. |
| `style.css` | Käyttöliittymän ulkoasu ja asettelu. |
| `script.js` | Käyttöliittymä, tiedoston valinta, kuvaaja ja tulokset. |
| `scheduler.js` | CSV:n validointi ja tarkka yhteisoptimointi varttiaskeleilla. |
| `data/` | Itse tuotetut esimerkki- ja virheaineistot. |
| `docs/` | Projektikuvaus, AI-työskentely, testaus ja palautustiedot. |
| `README.md` | Projektin esittely sekä toteutuksen valmistuttua kokeiltu käynnistys- ja käyttöohje. |

Laskenta käyttää dynaamista ohjelmointia: kunkin vartin jälkeen talletetaan halvin tapa saavuttaa laitteiden tehoprofiilien etenemistila. Yhtenäistä käyttöä ei saa keskeyttää, pilkottavassa käytössä vaiheiden väliin voi jättää vartteja. Kaikkien laitteiden yhteisteho tarkistetaan joka vartilla. Jos kaikkien enimmäistehot mahtuvat rajaan yhtä aikaa, laitteiden riippumattomat minimit ovat myös yhteinen minimi. Vartin kustannus euroina on hinta (snt/kWh) × teho (kW) × 0,25 h / 100. Vertailu tehdään tarkkoina skaalattuina BigInt-kokonaislukuina ennen näyttöarvon pyöristystä. Tasatuloksissa suositaan aikaisempia käyttövartteja, samalla vartilla laitteen listajärjestystä.

## Oletukset, riskit ja mahdollinen data

### Aineiston tuotantotapa ja muoto

Projektissa käytetään itse tuotettua synteettistä testiaineistoa. Se ei kuvaa todellisia markkinahintoja eikä sisällä henkilötietoja tai ulkopuolisesta palvelusta kopioitua aineistoa. Aineisto voidaan sisällyttää projektirepoon; sen käyttö ei edellytä ulkopuolisen datapalvelun lupaa.

CSV-tiedosto on UTF-8-muotoinen. Sarake-erotin on puolipiste ja desimaalierotin piste. Aikaleima ilmaisee jakson alkua muodossa `YYYY-MM-DDTHH:mm`. Jokainen rivi kuvaa valinnan mukaan seuraavan 15 tai 60 minuutin hintaa. Rivit ovat nousevassa aikajärjestyksessä ja jaksot peräkkäisiä. Tuntihinta toistetaan neljälle vartille.

Esimerkkiaineisto:

```csv
aika;hinta_snt_kwh
2026-11-04T00:00;10
2026-11-04T01:00;5
2026-11-04T02:00;3
2026-11-04T03:00;12
```

### Oletukset ja rajoitukset

- Laite noudattaa annettua vakiotehoa tai tehoprofiilia. Pilkottava käyttö saa sisältää taukoja, mutta profiilin vaiheiden järjestystä ei muuteta. Nollatehovaihe kuluttaa aikaa kuten muutkin vaiheet.
- Laitteita on 1–4. Aineiston enimmäispituus on 96 tuntia (384 varttia), koko 1 Mt. Tehot ovat enintään 1 000 kW kolmella desimaalilla, hinnan itseisarvo enintään 100 000 snt/kWh kuudella desimaalilla.
- Laskentaa rajataan selaimen kuormituksen takia: enintään 2 000 000 tutkittua siirtymää, 400 000 tallennettua tilapäivitystä ja 60 000 tilaa kerrallaan ratkaisua kohti. Rajan ylittyessä näytetään selkeä virhe; keskeneräistä tulosta ei palauteta. Käyttöliittymä pysyy peruttavana laskennan aikana.
- Käyttäjä voi ajoittaa käytön mihin tahansa ladatun aineiston jaksoon.
- Hinnat käsitellään sellaisinaan: ohjelma ei lisää arvonlisäveroa tai muita maksuja. Testiaineiston kustannus on laskentaesimerkki.
- Negatiiviset hinnat ovat sallittuja, joten myös laskettu energiakustannus voi olla negatiivinen. Tämä ei tarkoita koko sähkölaskun olevan negatiivinen.
- Aikaleimat ovat testiaineiston paikallisia kellonaikoja ilman aikavyöhykemuunnoksia. Kesä- ja talviajan vaihtumisen sisältävät aineistot eivät kuulu ensimmäiseen versioon.
- Aineisto käsitellään selaimen muistissa eikä sitä lähetetä verkkopalveluun. Sivun lataaminen uudelleen tyhjentää tuodut tiedot.

### Riskit ja niiden hallinta

- **Virheellinen aineisto:** tarkistetaan sarakkeet, arvot ja tuntien jatkuvuus ennen laskentaa.
- **Yksikkö- tai laskentavirhe:** yksiköt näytetään käyttöliittymässä, ja tuloksia verrataan käsin laskettuihin esimerkkeihin.
- **Epärealistinen kustannusodotus:** syötetyn tehoprofiilin oletus ja laskennasta pois jätetyt maksut kerrotaan käyttäjälle.
- **Liian laaja toteutus:** verkkorajapinnat, laiteohjaus ja kuvaaja eivät estä ensimmäisen vähimmäiskokonaisuuden valmistumista.
- **Selainten erot:** käynnistys ja sovitut käyttötapaukset kokeillaan tekijöiden käytössä olevissa selaimissa, ja selaimet sekä havainnot kirjataan testausdokumenttiin.

## Merkittävät rajausmuutokset ja niiden syyt

- **4.11.2026:** Aiemmin harkitusta sähkönkulutuksen analysoinnista siirryttiin sähkönkäytön ajoitusoptimointiin käyttäjän aihetoiveen perusteella. Painopiste on halvimman käyttöjakson löytämisessä.
- **4.11.2026:** Ensimmäinen määrittely rajattiin yhden laitteen vakiotehoon, yhtenäiseen käyttöjaksoon ja itse tuotettuun tuntihintaiseen CSV-aineistoon. Näin laskenta voidaan toteuttaa ja todentaa ilman verkkopalvelua tai laitteistoa. Tämä on tekijöiden yhdessä tarkistettava ensimmäinen määrittelyluonnos.

- **4.11.2026, ensimmäinen toteutus:** Tiedoston kooksi rajataan enintään 1 000 000 tavua ja aineistoksi 10 000 tuntia selaimen kuormituksen rajaamiseksi. Tuetut vuodet ovat 0001–9998. Nämä tekniset rajat näkyvät käyttöohjeessa. Laskentatestit lisätään `tests/optimizer.test.js`-tiedostoon ja käyttöliittymän tapahtumakäsittelyn testit `tests/ui.test.js`-tiedostoon; jälkimmäinen ei korvaa oikeaa selainkoetta.

- **23.11.2026, selainlaajennus:** Pyysin lisäämään usean laitteen optimoinnin, pilkottavan käytön, vaihtelevat tehot ja varttihinnat omaan JavaScript-haaraan. Käynnistys säilyy HTML-tiedoston avaamisena. Aineistorajaa pienennettiin 96 tuntiin, koska yhteisoptimointi vaatii enemmän muistia kuin alkuperäinen yhden laitteen laskenta. Tarkat rajat ja virhetilanteet kerrotaan myös käyttöliittymässä.
