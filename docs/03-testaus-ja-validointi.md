# Testaus ja validointi

## Nykyinen selainversio – 23.11.2026

Haara: `feature/selain-monilaite-vartit`. Käyttö tapahtuu avaamalla `index.html` selaimessa; Node.js tarvitaan vain kehittäjän automaattisten testien ajamiseen.

AI-agentin ympäristössä (Node.js v24.22.3) komento `npm test` läpäisi **29/29 testiä**: 21 laskenta- ja validointitestiä sekä 8 käyttöliittymätestiä. Nämä eivät ole Niklaksen tai Aatun käsin tekemiä selainkokeita.

| Tarkistus | Tulos |
|---|---|
| Alkuperäinen tuntiaineisto, 1 kW / 2 h | 0,08 €, klo 01–03 |
| Tunti- ja varttiaineisto, osatunnit ja negatiiviset hinnat | Laskentatestit läpäisivät |
| Yhteinen tehoraja ja usean laitteen aikataulu | Testit läpäisivät; myös tapaus, jossa laitteiden peräkkäinen ahne valinta olisi väärä |
| Yhtenäinen ja pilkottava käyttö, järjestyksessä etenevä tehoprofiili | Testit läpäisivät, myös nollatehoinen vaihe |
| Tarkka minimi | 40 pientä tapausta verrattiin erilliseen kaikki vaihtoehdot läpikäyvään vertailulaskentaan |
| Tiedoston tuonti, tulokset, kuvaajan valinnat ja syötteiden muuttaminen | 8 Happy DOM -testiä läpäisi |
| Laskennan peruminen, laskentarajat ja kilpailevat tiedostonluvut | Testit läpäisivät |

Happy DOM suorittaa oikean HTML:n ja käyttöliittymäkoodin simuloidussa DOM-ympäristössä. Se ei varmista selaimen ulkoasua, CSS-asettelua tai oikeaa tiedostovalitsinta.

Oikean selaimen testi on valmisteltu tiedostoon `tests/browser.cjs`. Chromiumin käynnistys tässä ympäristössä estyi virheeseen `socket() failed: Operation not permitted`; Playwrightin selainlataus palautti HTTP 403. **Oikean selaimen testistä ei siis ole hyväksyttyä tulosta tälle versiolle.** Aiemman version selainhavainnot alempana eivät vahvista tätä laajennusta.

### Toistaminen

Kehittäjän testit: `npm ci` ja `npm test`. Oikean selaimen automaattitesti: `npx playwright install chromium --only-shell` ja `npm run test:browser` ympäristössä, jossa Chromium voidaan asentaa ja käynnistää.

Käsin Edgessä:

1. Avaa `index.html`. Valitse 60 min ja tuo `data/esimerkkihinnat.csv`. Laske 1 kW / 2 h: 0,08 €, klo 01–03.
2. Lisää toinen 1 kW / 2 h laite ja aseta yhteiseksi tehorajaksi 1 kW. Laske: laitteet käyttävät yhdessä kaikki neljä tuntia, huipputeho 1 kW ja hinta 0,30 €.
3. Poista toinen laite. Paina **Lataa esimerkkihinnat**. Aseta 1 kW, 0,5 h ja pilkottava käyttö: valitut vartit ovat klo 00.45 ja 02.45. Tarkka kustannus on −0,0025 €; kahden desimaalin näytössä se pyöristyy arvoon −0,00 €.
4. Ota vaihteleva teho käyttöön ja anna profiili `2; 0,5`: käyttöaika 0,5 h ja energia 0,625 kWh. Tarkista varttikohtainen teho tuloksesta.
5. Muuta syötettä ja varmista vanhan tuloksen poistuminen. Tuo virheellinen CSV ja tarkista virheilmoitus. Kokeile myös laskennan perumista sekä kapeaa ikkunaa ja näppäimistökäyttöä.
6. Kirjaa oma päivämäärä, selainversio ja havaitut tulokset tämän osion alle. Älä merkitse koetta läpäistyksi ennen suorittamista.

## Aiemman version testihistoria

Alla oleva 4.11.2026 historia koskee aiempaa tuntipohjaista yhden laitteen versiota. Sen rajaukset, testimäärät ja suoritusohjeet eivät korvaa yllä olevia nykyisen version tietoja.

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
8. Kirjaa käyttäjä, päivämäärä, selainversio, havaittu tulos ja johtopäätös alla olevaan taulukkoon.

**Automaattisesti Node.js:llä projektikansiossa:**

```sh
node --test tests/optimizer.test.js tests/ui.test.js
```

`optimizer.test.js` tarkistaa laskennan ja syötteet. `ui.test.js` käyttää kevyttä elementtien testikorviketta ja tarkistaa tapahtumien käsittelyä; se ei renderöi HTML:ää eikä testaa selaimen oikeaa tiedostovalitsinta. Valmisteltu oikean selaimen testi on `tests/browser.cjs`; sen erilliset testiriippuvuudet kuvataan README:ssä.

## Vaatimuksiin sidotut tulokset

Alla olevat suoritetut tulokset ovat **AI-agentin ympäristöstä 4.11.2026, Node.js v24.22.1**. Yhteensä 22 automaattista testiä läpäisi. Ne eivät ole Niklaksen tai Aatun omia testihavaintoja.

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
| V1–V5 | Oikea selain, tiedostovalitsin ja paikallinen käynnistys | Ohjelma toimii yllä olevilla kokeilla | Niklas vahvisti neljä käsin tehtyä koetta Edgessä; Aatun V6-koe suoritettiin selainautomaatiossa | Toiminnot vahvistettu |
| V6 | Hintakuvaaja | Jokaiselle ladatulle tunnille näytetään hinta snt/kWh ja laskennan valitsema jakso korostuu | Neljän tunnin pylväskuvaaja ja kaksi vihreänä korostettua tuntia näkyivät laskennan jälkeen; negatiivinen hinta näkyi oikein; virheellinen tuonti poisti kuvaajan | Läpäisi selainautomaatiossa |

## Olennainen virhe- tai rajatapaus

Käyttöaika 5 h neljän tunnin aineistosta hylätään. Laskenta ei lyhennä aikaa käyttäjän puolesta eikä kierrätä aineistoa. Virheellisen tuonnin jälkeen vanha aineisto ja tulos poistetaan, jotta käyttäjä ei sekoita edellistä tulosta uuteen tiedostoon.

## Validointi käyttäjätarpeeseen nähden

Käsin laskettu esimerkki vastaa automaattisen laskennan tulosta. Niklas kokeili sovellusta Microsoft Edgellä 4.11.2026 ja vahvisti keskustelussa neljän alla kuvatun testitapauksen toimivan odotetusti. Selaimen tarkkaa versiota ei ilmoitettu. Tämä on rajattu toiminnallinen käyttäjäkoe, ei vielä kattava käytettävyysarvio. Testidata on pieni ja synteettinen, eikä todellisia säästöjä tai laitteita ole kokeiltu.

| Kokeilija | Päivämäärä ja selain | Koe ja havainto | Johtopäätös |
|---|---|---|---|
| Niklas | 4.11.2026, Microsoft Edge (versio ei tiedossa) | Normaali laskenta, liian pitkä käyttöaika, puuttuva tunti ja negatiivinen hinta toimivat käyttäjän ilmoituksen mukaan odotetusti | Neljä koetta läpäisi |
| Aatu | Copilot-selaintestaus: Chromium, paikallinen tiedosto | Esimerkkihinnat, liian pitkä käyttöaika, negatiiviset hinnat, puuttuva tunti ja 375 pikselin leveys toimivat odotetusti | Kuvaajan pääkohdat ja virheiden käsittely läpäisi; manuaalinen selainkoe ja näppäimistökäyttö ovat vielä vahvistamatta |
| Toinen pari | Täydennetään katselmoinnin jälkeen | Perusteltu palaute ja sen perusteella tehty päätös puuttuvat | Avoin |

### Aatun selainautomaatiossa suoritetut kokeet

| Vaatimus | Koe | Havaittu tulos | Tulos |
|---|---|---|---|
| V1, V4, V5, V6 | esimerkkihinnat.csv, 1 kW / 2 h | 4 tuntia ladattu; 0,08 €, klo 01–03, 2 kWh; neljä pylvästä ja kaksi valittua | Läpäisi |
| V3 | Sama aineisto, käyttöaika 5 h | Virheilmoitus käyttöajan ylittäessä aineiston pituuden | Läpäisi |
| V2, V4, V6 | negatiiviset-hinnat.csv, 1 kW / 2 h | −0,02 € ja valittu jakso kuvassa | Läpäisi |
| V2, V5, V6 | virhe-puuttuva-tunti.csv | Virheilmoitus, vanha tulos piilossa, laskentapainike poissa käytöstä ja kuvaaja piilotettu | Läpäisi |
| V5, V6 | 375 pikselin selainleveys | Sivulla ei vaakasuoraa vieritystä kuvan rajaamisen jälkeen | Läpäisi |

### Niklaksen käsin tekemät selainkokeet 4.11.2026

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
