# Projektikuvaus

Projektin nimi: **Sähkönkäytön ajoitusoptimointi**

## Käyttäjä, ongelma ja arvolupaus

Kohdekäyttäjä on kuvitteellinen pörssisähköä käyttävä kotitalouden asukas, joka pystyy siirtämään jonkin sähkölaitteen käyttöä päivän sisällä. Hän haluaa selvittää, milloin laitetta kannattaa käyttää, mutta hintataulukosta on työlästä vertailla usean tunnin jaksoja käsin.

Sovellus etsii käyttäjän tuomasta hintatiedostosta edullisimman yhtenäisen käyttöjakson. Käyttäjä antaa laitteen tehon ja käyttöajan, ja saa suositellun aloitus- ja lopetusajan sekä syötettyihin hintoihin perustuvan energiakustannusarvion. Hyöty on nopeampi ja toistettava ajankohdan vertailu. Ohjelma optimoi käytön ajoitusta, ei sähkön markkinahintaa.

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
| V3 | Käyttäjä voi antaa tehon ja käyttöajan. | Positiivinen, äärellinen teho kilowatteina ja positiivinen kokonaislukumäärä tunteja hyväksytään. Tyhjä, ei-numeerinen, nolla tai negatiivinen syöte hylätään. Myös käyttöaika, joka ylittää aineiston tuntimäärän, hylätään selkeällä ilmoituksella. | P1 |
| V4 | Sovellus etsii halvimman yhtenäisen käyttöjakson ja laskee energiakustannuksen. | Kun 4.11.2026 klo 00, 01, 02 ja 03 alkavien tuntien hinnat ovat 10, 5, 3 ja 12 snt/kWh, teholla 1 kW ja käyttöajalla 2 h tulos on klo 01–03 ja 0,08 €. Jos useita jaksoja on yhtä halvalla, valitaan aikaisin. | P1 |
| V5 | Tulos esitetään selkeästi ja vastaa nykyisiä syötteitä. | Näytetään aloitus- ja lopetusaika päivämäärineen, kesto, teho, energiankulutus (kWh) ja kustannus (€). V4:n esimerkissä energiankulutus on 2 kWh. Syötteiden muuttaminen poistaa vanhan tuloksen, kunnes laskenta tehdään uudelleen. | P1 |
| V6 | Käyttäjä näkee hinnat ja valitun jakson kuvaajassa. | Jokaiselle ladatulle tunnille näytetään hinta yksikössä snt/kWh, ja laskennan valitsema jakso erottuu kuvaajasta. Myös negatiiviset hinnat näkyvät oikein. | P2 |

Nämä ovat suunniteltuja hyväksymiskriteereitä, eivät toteutuneita testituloksia. Todelliset kokeet ja havainnot kirjataan tiedostoon `docs/03-testaus-ja-validointi.md`.

## Rajaus ja vähimmäiskokonaisuus

Vähimmäiskokonaisuus on selaimessa paikallisesti toimiva sovellus, joka toteuttaa vaatimukset V1–V5. Käyttäjä tuo hintatiedoston, syöttää yhden laitteen vakiotehon ja kokonaisina tunteina annettavan käyttöajan sekä saa halvimman yhtenäisen jakson ja kustannusarvion.

Ensimmäinen pieni toteutusvaihe kattaa koko tämän käyttötapauksen yksinkertaisella käyttöliittymällä. Ennen toteutusta sovitaan vähintään V4:n normaali testitapaus ja V3:n rajatapaus, jossa neljän tunnin aineistosta pyydetään viiden tunnin käyttöjaksoa. Kuvaaja lisätään erillisenä myöhempänä vaiheena.

Ensimmäisestä versiosta rajataan pois:

- Hintojen automaattinen haku, reaaliaikaiset hinnat ja hintaennusteet.
- Oikeiden sähkölaitteiden ohjaus ja automaatiolaitteistot.
- Usean laitteen yhteinen optimointi, käyttöjakson pilkkominen ja vaihteleva teho.
- Varttihinnat ja osatunnin käyttöajat; ensimmäinen versio käyttää vain tuntiaineistoa.
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
| `script.js` | CSV:n lukeminen, validointi, jaksojen vertailu ja tulosten näyttäminen. |
| `data/` | Itse tuotetut esimerkki- ja virheaineistot. |
| `docs/` | Projektikuvaus, AI-työskentely, testaus ja palautustiedot. |
| `README.md` | Projektin esittely sekä toteutuksen valmistuttua kokeiltu käynnistys- ja käyttöohje. |

Laskenta vertailee kaikki käyttöajan pituiset peräkkäiset jaksot. Jakson energiakustannus euroina on tuntien hintojen summa (snt/kWh) × teho (kW) × 1 h / 100. Vertailu tehdään ennen näyttöarvon pyöristämistä; eurot näytetään kahden desimaalin tarkkuudella. Tasahintaisista jaksoista valitaan aikaisin.

## Oletukset, riskit ja mahdollinen data

### Aineiston tuotantotapa ja muoto

Projektissa käytetään itse tuotettua synteettistä testiaineistoa. Se ei kuvaa todellisia markkinahintoja eikä sisällä henkilötietoja tai ulkopuolisesta palvelusta kopioitua aineistoa. Aineisto voidaan sisällyttää projektirepoon; sen käyttö ei edellytä ulkopuolisen datapalvelun lupaa.

CSV-tiedosto on UTF-8-muotoinen. Sarake-erotin on puolipiste ja desimaalierotin piste. Aikaleima ilmaisee tunnin alkua muodossa `YYYY-MM-DDTHH:00`. Jokainen rivi kuvaa seuraavan yhden tunnin hintaa. Rivit ovat nousevassa aikajärjestyksessä ja tunnit peräkkäisiä.

Esimerkkiaineisto:

```csv
aika;hinta_snt_kwh
2026-11-04T00:00;10
2026-11-04T01:00;5
2026-11-04T02:00;3
2026-11-04T03:00;12
```

### Oletukset ja rajoitukset

- Laite kuluttaa syötetyn vakiotehon koko käyttöjakson ajan ja toimii keskeytyksettä.
- Käyttäjä voi ajoittaa käytön mihin tahansa ladatun aineiston jaksoon.
- Hinnat käsitellään sellaisinaan: ohjelma ei lisää arvonlisäveroa tai muita maksuja. Testiaineiston kustannus on laskentaesimerkki.
- Negatiiviset hinnat ovat sallittuja, joten myös laskettu energiakustannus voi olla negatiivinen. Tämä ei tarkoita koko sähkölaskun olevan negatiivinen.
- Aikaleimat ovat testiaineiston paikallisia kellonaikoja ilman aikavyöhykemuunnoksia. Kesä- ja talviajan vaihtumisen sisältävät aineistot eivät kuulu ensimmäiseen versioon.
- Aineisto käsitellään selaimen muistissa eikä sitä lähetetä verkkopalveluun. Sivun lataaminen uudelleen tyhjentää tuodut tiedot.

### Riskit ja niiden hallinta

- **Virheellinen aineisto:** tarkistetaan sarakkeet, arvot ja tuntien jatkuvuus ennen laskentaa.
- **Yksikkö- tai laskentavirhe:** yksiköt näytetään käyttöliittymässä, ja tuloksia verrataan käsin laskettuihin esimerkkeihin.
- **Epärealistinen kustannusodotus:** vakiotehon oletus ja laskennasta pois jätetyt maksut kerrotaan käyttäjälle.
- **Liian laaja toteutus:** verkkorajapinnat, laiteohjaus ja kuvaaja eivät estä ensimmäisen vähimmäiskokonaisuuden valmistumista.
- **Selainten erot:** käynnistys ja sovitut käyttötapaukset kokeillaan tekijöiden käytössä olevissa selaimissa, ja selaimet sekä havainnot kirjataan testausdokumenttiin.

## Merkittävät rajausmuutokset ja niiden syyt

- **4.11.2026:** Aiemmin harkitusta sähkönkulutuksen analysoinnista siirryttiin sähkönkäytön ajoitusoptimointiin käyttäjän aihetoiveen perusteella. Painopiste on halvimman käyttöjakson löytämisessä.
- **4.11.2026:** Ensimmäinen määrittely rajattiin yhden laitteen vakiotehoon, yhtenäiseen käyttöjaksoon ja itse tuotettuun tuntihintaiseen CSV-aineistoon. Näin laskenta voidaan toteuttaa ja todentaa ilman verkkopalvelua tai laitteistoa. Tämä on tekijöiden yhdessä tarkistettava ensimmäinen määrittelyluonnos.
