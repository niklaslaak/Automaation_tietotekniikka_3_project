# Testaus ja validointi

## Testien suoritusohje

Ensimmäisen toteutuksen lähtökohtana on päähaaraan yhdistetty määrittely (commit `1a8c4bba38afea98c695e3a815b2b10587177b4e`). Normaali testitapaus ja liian pitkän käyttöajan rajatapaus määriteltiin ennen koodia.

**Käsin selaimessa:**

1. Avaa `index.html` paikallisena tiedostona selaimessa.
2. Valitse `data/esimerkkihinnat.csv`; tarkista, että ladattuja tunteja on 4.
3. Laske teholla 1 kW ja käyttöajalla 2 h. Odotus: 4.11.2026 klo 01–03, 2 kWh ja 0,08 €.
4. Vaihda käyttöajaksi 5 h. Vanhan tuloksen tulee poistua heti. Laske uudelleen: odotus on ilmoitus aineiston riittämättömyydestä.
5. Palauta käyttöajaksi 2 h ja laske. Tuo sen jälkeen `data/virhe-puuttuva-tunti.csv`: virheilmoitus, vanha tulos piiloon ja laskentapainike pois käytöstä.
6. Tuo `data/negatiiviset-hinnat.csv`. Teholla 1 kW / 2 h odotus on klo 01–03 ja −0,02 €.
7. Kokeile puhelimen levyistä ikkunaa ja näppäimistökäyttöä. Lataa sivu uudelleen: aineiston ja tuloksen tulee tyhjentyä.
8. Kirjaa testausympäristö, havaittu tulos ja johtopäätös testausdokumentin taulukkoon.

**Automaattisesti Node.js:llä projektikansiossa:**

```sh
node --test tests/optimizer.test.js tests/ui.test.js
```

`optimizer.test.js` tarkistaa laskennan ja syötteet. `ui.test.js` käyttää kevyttä elementtien testikorviketta ja tarkistaa tapahtumien käsittelyä; se ei renderöi HTML:ää eikä testaa selaimen oikeaa tiedostovalitsinta. Valmisteltu oikean selaimen testi on `tests/browser.cjs`; sen erilliset testiriippuvuudet kuvataan README:ssä.

## Vaatimuksiin sidotut tulokset

Alla olevat automaattiset tulokset ovat AI-agentin ympäristöstä. Yhteensä 22 testiä läpäisi Node.js v24.22.1 -ympäristössä.

| Vaatimus | Testitapa tai syöte | Odotettu tulos | Havaittu tulos | Johtopäätös |
|---|---|---|---|---|
| V1, V4, V5 | Esimerkkidata, 1 kW, 2 h | 4 tuntia; klo 01–03; 0,08 €; 2 kWh | Odotuksen mukainen laskentafunktiossa ja tapahtumakäsittelytestissä | Automaattinen testi läpäisi |
| V2 | Tyhjä data, väärä otsikko, ei-numeerinen tai puuttuva hinta | Tuonti hylätään | Hylättiin | Läpäisi |
| V2 | Puuttuva, päällekkäinen tai väärässä järjestyksessä oleva tunti | Tuonti hylätään | Hylättiin | Läpäisi |
| V2 | Virheellinen päivämäärä tai varttiaika | Tuonti hylätään | Hylättiin | Läpäisi |
| V2, V4 | Hinnat 5, −2, 0, 4; 1 kW; 2 h | −0,02 € | −0,02 € | Läpäisi |
| V3 | 5 h neljän tunnin aineistosta | Virheilmoitus | Ilmoitus aineiston pituuden ylityksestä | Läpäisi |
| V3 | Tyhjä, nolla, negatiivinen tai ei-numeerinen teho/aika; murto-osainen aika | Hylkäys | Hylättiin | Läpäisi |
| V3, V4 | Teho 1,5 kW ja kesto 3 h | Klo 00–03; 4,5 kWh; 0,27 € | Odotuksen mukainen | Läpäisi |
| V4 | Tasahinnat, myös desimaalit 0.1 + 0.2 ja 0.3 + 0 | Aikaisin halvin jakso | Aikaisin jakso | Läpäisi |
| V4, V5 | Yksi tunti, koko aineisto, vuodenvaihteen ylittävä jakso | Oikea kustannus ja lopetuspäivä | Odotuksen mukainen | Läpäisi |
| V5 | Syötteen muutos tai virheellinen uusi tuonti onnistuneen laskennan jälkeen | Vanha tulos poistuu | Poistui testikorvikkeen näkymätilasta | Tapahtumatesti läpäisi; Niklaksen neljän selainkokeen tulokset alla |
| V1, V2 | BOM, Windows-rivinvaihdot, tyhjä sisärivi, ylimääräinen sarake | Sallitut muodot hyväksytään, virheelliset hylätään | Odotuksen mukainen | Läpäisi |
| V2, V3 | Ylikokoinen tiedosto ja laskennan ylivuoto | Selkeä hylkäys | Hylättiin | Läpäisi |
| V5 | Aiempi tiedostonluku valmistuu uudemman valinnan jälkeen | Ei korvaa uudempaa tilaa | Ei korvannut | Tapahtumatesti läpäisi |
| V1–V5 | Oikea selain, tiedostovalitsin ja paikallinen käynnistys | Ohjelma toimii yllä olevilla kokeilla | Perustoiminnot vahvistettiin käsin selaimessa; hintakuvaaja vahvistettiin selainautomaatiossa | Toiminnot vahvistettu |
| V6 | Hintakuvaaja | Jokaiselle ladatulle tunnille näytetään hinta snt/kWh ja laskennan valitsema jakso korostuu | Neljän tunnin pylväskuvaaja ja kaksi vihreänä korostettua tuntia näkyivät laskennan jälkeen; negatiivinen hinta näkyi oikein; virheellinen tuonti poisti kuvaajan | Läpäisi selainautomaatiossa |

## Olennainen virhe- tai rajatapaus

Käyttöaika 5 h neljän tunnin aineistosta hylätään. Laskenta ei lyhennä aikaa käyttäjän puolesta eikä kierrätä aineistoa. Virheellisen tuonnin jälkeen vanha aineisto ja tulos poistetaan, jotta käyttäjä ei sekoita edellistä tulosta uuteen tiedostoon.

## Validointi käyttäjätarpeeseen nähden

Käsin laskettu esimerkki vastaa automaattisen laskennan tulosta. Sovelluksen perustoiminnot on vahvistettu Microsoft Edgessä. Selainautomaatiossa on lisäksi tarkistettu hintakuvaajan toiminta ja pienemmän selainleveyden asettelu. Testidata on synteettinen, eikä todellisia sähkösäästöjä tai laitteita ole kokeiltu.

### Manuaaliset selainkokeet

| Vaatimus | Koe | Havaittu tulos | Tulos |
|---|---|---|---|
| V1, V4, V5 | esimerkkihinnat.csv, 1 kW / 2 h | Jakso klo 01–03, 2 kWh, 0,08 € | Läpäisi |
| V3 | Sama aineisto, käyttöaika 5 h | Virheilmoitus liian pitkästä käyttöajasta | Läpäisi |
| V2, V5 | virhe-puuttuva-tunti.csv | Virheilmoitus ja aiempi tulos poistuu | Läpäisi |
| V2, V4 | negatiiviset-hinnat.csv, 1 kW / 2 h | Jakso klo 01–03, −0,02 € | Läpäisi |

### Selainautomaatiossa suoritetut kokeet

| Vaatimus | Koe | Havaittu tulos | Tulos |
|---|---|---|---|
| V1, V4, V5, V6 | esimerkkihinnat.csv, 1 kW / 2 h | 4 tuntia ladattu; 0,08 €, klo 01–03, 2 kWh; neljä pylvästä ja kaksi valittua | Läpäisi |
| V3 | Sama aineisto, käyttöaika 5 h | Virheilmoitus käyttöajan ylittäessä aineiston pituuden | Läpäisi |
| V2, V4, V6 | negatiiviset-hinnat.csv, 1 kW / 2 h | −0,02 € ja valittu jakso kuvassa | Läpäisi |
| V2, V5, V6 | virhe-puuttuva-tunti.csv | Virheilmoitus, vanha tulos piilossa, laskentapainike poissa käytöstä ja kuvaaja piilotettu | Läpäisi |
| V5, V6 | 375 pikselin selainleveys | Sivulla ei ollut vaakasuoraa sivunleveydestä ylittyvää vieritystä | Läpäisi |

### Niklaksen käsin tekemät selainkokeet

Tulokset perustuvat käyttäjän keskustelussa antamaan vahvistukseen. Normaalin laskennan tulos näkyi lisäksi käyttäjän toimittamassa kuvakaappauksessa. Negatiivisen hinnan kokeessa valittuna oli ensin esimerkkihinnat.csv; oikean negatiiviset-hinnat.csv-tiedoston valinnan ohjeistamisen jälkeen käyttäjä vahvisti kaikkien kokeiden toimivan. Kyseessä oli testiaineiston valinta, ei todettu laskentavirhe.

| Vaatimus | Koe | Käyttäjän vahvistama havainto | Tulos |
|---|---|---|---|
| V1, V4, V5 | esimerkkihinnat.csv, 1 kW / 2 h | 4.11.2026 klo 01–03, 2 kWh, 0,08 € | Läpäisi |
| V3 | Sama aineisto, käyttöaika 5 h | Virheilmoitus liian pitkästä käyttöajasta | Läpäisi |
| V2, V5 | virhe-puuttuva-tunti.csv | Virheilmoitus ja aiempi tulos poistuu | Läpäisi |
| V2, V4 | negatiiviset-hinnat.csv, 1 kW / 2 h | Klo 01–03, −0,02 € | Läpäisi |

Niklas vahvisti ensimmäisen käyttötapauksen Edgessä ja Aatun selainautomaatiossa vahvistettiin hintakuvaajan keskeiset tilat.

## Epäonnistumiset ja tunnetut puutteet

- Node.js-pohjaisten laskenta- ja tapahtumakäsittelytestien ajo ei ollut saatavilla tarkistusympäristössä. Käytössä oli lisäksi Copilot-selaintestaus, jossa Chromium ja sovelluksen paikallinen tiedosto toimivat.
- Laskenta- ja tapahtumakäsittelytestit olivat aiemmin läpäisseet 22/22 agentin ympäristössä. Niitä ei ajeta uudelleen tässä tarkastuksessa.
- Oikea verkkodata, varttihinnat, kellonsiirtopäivät ja laiteohjaus eivät kuulu ensimmäiseen versioon.
- Todellisen laitteen teho voi vaihdella. Tulos perustuu syötettyyn vakiotehoon ja tiedoston hintoihin, ei koko sähkölaskuun.
