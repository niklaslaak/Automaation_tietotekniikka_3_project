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
| V5 | Syötteen muutos tai virheellinen uusi tuonti onnistuneen laskennan jälkeen | Vanha tulos poistuu | Poistui testikorvikkeen näkymätilasta | Tapahtumatesti läpäisi; oikea selain vielä kokeilematta |
| V1, V2 | BOM, Windows-rivinvaihdot, tyhjä sisärivi, ylimääräinen sarake | Sallitut muodot hyväksytään, virheelliset hylätään | Odotuksen mukainen | Läpäisi |
| V2, V3 | Ylikokoinen tiedosto ja laskennan ylivuoto | Selkeä hylkäys | Hylättiin | Läpäisi |
| V5 | Aiempi tiedostonluku valmistuu uudemman valinnan jälkeen | Ei korvaa uudempaa tilaa | Ei korvannut | Tapahtumatesti läpäisi |
| V1–V5 | Oikea selain, tiedostovalitsin ja paikallinen käynnistys | Ohjelma toimii yllä olevilla kokeilla | **Ei suoritettu onnistuneesti:** selain puuttui ympäristöstä | Tekijöiden selainkoe vaaditaan |
| V6 | Hintakuvaaja | Myöhempi lisäominaisuus | Ei toteutettu eikä testattu | Rajattu tästä muutoksesta pois |

## Olennainen virhe- tai rajatapaus

Käyttöaika 5 h neljän tunnin aineistosta hylätään. Laskenta ei lyhennä aikaa käyttäjän puolesta eikä kierrätä aineistoa. Virheellisen tuonnin jälkeen vanha aineisto ja tulos poistetaan, jotta käyttäjä ei sekoita edellistä tulosta uuteen tiedostoon.

## Validointi käyttäjätarpeeseen nähden

Käsin laskettu esimerkki vastaa automaattisen laskennan tulosta. Todellista käyttäjävalidointia ei vielä ole tehty. Testidata on pieni ja synteettinen, eikä todellisia säästöjä tai laitteita ole kokeiltu.

| Kokeilija | Päivämäärä ja selain | Koe ja havainto | Johtopäätös |
|---|---|---|---|
| Niklas | Täydennetään kokeen jälkeen | Vielä tekemättä | Avoin |
| Aatu | Täydennetään kokeen jälkeen | Vielä tekemättä | Avoin |
| Toinen pari | Täydennetään katselmoinnin jälkeen | Perusteltu palaute ja sen perusteella tehty päätös puuttuvat | Avoin |

## Epäonnistumiset ja tunnetut puutteet

- Agentin `node tests/browser.cjs` -ajo pysähtyi, koska Chromiumin suoritustiedostoa ei löytynyt. Selaimen latausyritys epäonnistui virheeseen ”End of central directory record signature not found”. Selainkoetta tai ulkoasun visuaalista tarkistusta ei siis merkitä läpäisseeksi.
- Laskenta- ja tapahtumakäsittelytestit läpäisivät 22/22. Ohjelman toiminta tekijöiden selaimissa, näppäimistökäyttö ja mobiiliasettelu on vielä tarkistettava.
- V6, oikea verkkodata, varttihinnat, kellonsiirtopäivät ja laiteohjaus eivät kuulu ensimmäiseen versioon.
- Todellisen laitteen teho voi vaihdella. Tulos perustuu syötettyyn vakiotehoon ja tiedoston hintoihin, ei koko sähkölaskuun.
