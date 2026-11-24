# Sähkönkäytön ajoitusoptimointi

Lue [projektin määrittely ja hyväksymiskriteerit](docs/01-projektikuvaus.md).

Kurssiprojekti: Niklas Laak ja Aatu Lepola. Tämä haara lisää selainohjelmaan usean laitteen yhteisoptimoinnin, pilkottavat käyttöjaksot, vaihtelevan tehon sekä varttihinnat ja osatunnin käyttöajat.

## Avaa ohjelma

1. GitHub Desktop: **Fetch origin → Current branch → feature/selain-monilaite-vartit**. Paina **Pull origin**, jos se näkyy.
2. Valitse **Repository → Show in Explorer**.
3. Avaa **index.html** Edgessä. Pidä `scheduler.js`, `script.js` ja `style.css` samassa kansiossa.
4. Paina **Lataa esimerkkihinnat**, lisää laitteet ja paina **Laske halvin yhteinen aikataulu**.

Käyttö ei tarvitse asennuksia, Pythonia, palvelinta, kirjautumista tai verkkoyhteyttä. Node.js ja npm ovat vain kehittäjän testien ajamista varten. GitHubin tiedostonäkymä ei suorita ohjelmaa: avaa omalle koneelle haettu HTML-tiedosto.

## Laitteet ja käyttöajat

- Lisää 1–4 laitetta. Anna kullekin nimi, teho kilowatteina ja käyttöaika tunteina.
- Käyttöajan askel on **0,25 h**: esimerkiksi 0,5 h tarkoittaa puolta tuntia ja 1,5 h puoltatoista tuntia.
- **Yhtenäinen jakso:** laite toimii ilman keskeytystä.
- **Saa pilkkoa vartteihin:** käyttö voi jakautua erillisiin vartteihin. Valitse tämä vain laitteelle, jonka käyttöä voi keskeyttää.
- **Laitteen teho vaihtelee:** syötä tehoprofiili puolipisteillä, esimerkiksi `2; 2; 0,5; 0,5`. Se tarkoittaa 30 minuuttia teholla 2 kW ja 30 minuuttia teholla 0,5 kW. Jokainen luku kestää 15 minuuttia. Profiili määrää käyttöajan ja korvaa vakiotehon. Vaiheet säilyvät järjestyksessä myös pilkottaessa.
- **Yhteinen tehoraja:** lisättyjen laitteiden yhteisteho ei saa ylittää rajaa millään vartilla. Talon muita laitteita ei huomioida.

Tuloksessa näkyvät yhteiskustannus, kokonaisenergia, suurin yhtäaikainen teho sekä jokaisen laitteen käyttöjaksot, energia, kustannus ja varttikohtaiset tehot. Vihreä pylväs tarkoittaa, että vähintään yksi laite on siinä vartissa käytössä. Tarkat hinnat ja yhteistehot ovat myös taulukkona.

Syötteen muuttaminen, uuden laitteen lisääminen tai poistaminen ja uusi CSV-tuonti poistavat vanhan tuloksen. Laskennan voi perua. Sivun uudelleenlataus tyhjentää tiedot.

## Hintatiedosto

Valitse ensin, kuvaako yksi CSV-rivi **60 minuuttia** vai **15 minuuttia**, ja valitse vasta sitten tiedosto. Tuntihinta toistetaan neljälle samanhintaiselle vartille. Tuntiaineistostakin voi etsiä osatunnin käyttöjaksoja.

| Tiedosto | Valitse hintajakso | Sisältö |
|---|---|---|
| `data/esimerkkihinnat.csv` | 60 min | Neljä tuntia: 10, 5, 3 ja 12 snt/kWh. |
| `data/varttihinnat.csv` | 15 min | 16 varttia, mukana negatiivinen hinta. |
| `data/negatiiviset-hinnat.csv` | 60 min | Neljä tuntia: 5, −2, 0 ja 4 snt/kWh. |
| `data/virhe-puuttuva-tunti.csv` | 60 min | Virheaineisto, josta puuttuu tunti. |

Muoto on UTF-8, puolipiste-erotin ja hinnassa desimaalipiste. Esimerkiksi varttihinnat:

```csv
aika;hinta_snt_kwh
2026-11-04T00:00;10
2026-11-04T00:15;5
2026-11-04T00:30;-2
2026-11-04T00:45;8
```

Aikaleimat esitetään sellaisinaan ilman aikavyöhykemuunnoksia. Kellonsiirtopäivät eivät kuulu tähän versioon. Aineiston on oltava peräkkäistä ja aikajärjestyksessä. Esimerkkihinnat ovat keksittyä testidataa.

## Tarkistusesimerkit

1. **Vanha esimerkki:** tuo `esimerkkihinnat.csv` 60 minuutin valinnalla. Yksi laite, 1 kW / 2 h, yhtenäinen käyttö. Odotettu tulos: **4.11.2026 klo 01–03, 2 kWh ja 0,08 €**.
2. **Liian pitkä aika:** vaihda käyttöajaksi 5 h. Odotettu tulos: virheilmoitus aineiston pituudesta.
3. **Kaksi laitetta:** sama neljän tunnin aineisto, kaksi 1 kW / 2 h laitetta ja yhteinen tehoraja 1 kW. Laitteet käyttävät eri tunteja, kokonaisenergia 4 kWh ja yhteiskustannus **0,30 €**.
4. **Pilkkominen:** neljän vartin hinnat 1, 20, 2 ja 30 snt/kWh; 1 kW / 0,5 h, pilkkominen sallittu. Valinta on ensimmäinen ja kolmas vartti, tarkka kustannus 0,0075 € (näytössä 0,01 €).
5. **Vaihteleva teho:** profiili `2; 0,5` kestää 30 minuuttia ja kuluttaa **0,625 kWh**.

## Laskenta ja rajat

Ohjelma minimoi kaikkien laitteiden yhteenlasketun energiakustannuksen. Kunkin vartin hinta kerrotaan laitteen senhetkisellä teholla ja 0,25 tunnilla. Hinnat käytetään sellaisinaan; ohjelma ei lisää siirtoa, veroja, marginaalia tai perusmaksuja eikä ohjaa laitteita.

`scheduler.js` ratkaisee tehtävän dynaamisella ohjelmoinnilla. Vertailu tehdään BigInt-kokonaisluvuilla (hinnan tarkkuus kuusi ja tehon kolme desimaalia), joten desimaalien tasahinnat eivät rikkoudu liukulukupyöristyksiin. Yhtä halvoista ratkaisuista suositaan aikaisempia käyttövartteja; samassa vartissa laitteiden listajärjestystä. Jos kaikkien laitteiden enimmäistehot mahtuvat rajaan yhtä aikaa, laitteet voidaan ratkaista erikseen täsmälleen samalla yhteisminimillä.

Rajat: **4 laitetta**, **96 tuntia / 384 varttia**, **1 Mt**; tehot ja tehoraja enintään **1 000 kW** kolmella desimaalilla; hinnan itseisarvo enintään **100 000 snt/kWh** kuudella desimaalilla. Alkuperäisen version 10 000 tunnin aineistorajaa pienennettiin yhteisoptimoinnin muistitarpeen vuoksi.

Vaikeissa yhdistelmissä laskenta voi ylittää selaimelle asetetun työmäärärajan. Silloin näytetään virhe ja pyydetään lyhentämään aineistoa/käyttöä, vähentämään laitteita tai väljentämään tehorajaa. Keskeneräistä tai likimääräistä aikataulua ei esitetä halvimpana. Rajat ratkaisua kohden: 2 000 000 siirtymää, 400 000 tilapäivitystä, 60 000 samanaikaista tilaa. Laskenta luovuttaa välillä suoritusvuoron käyttöliittymälle, jotta peruminen ja syötteiden muokkaaminen toimivat.

## Testit kehittäjälle

Sovelluksen avaamiseen näitä komentoja ei tarvita. Automaattisten testien ajo projektin juuresta:

```sh
npm ci
npm test
```

Pelkkä laskentaydin ilman testiriippuvuuksien asennusta:

```sh
node --test tests/optimizer.test.js
```

Oikean selaimen testit:

```sh
npx playwright install chromium --only-shell
npm run test:browser
```

Katso todelliset tulokset ja avoimet kokeet [testausdokumentista](docs/03-testaus-ja-validointi.md). AI-avusteinen työnjako on [AI-dokumentissa](docs/02-ai-tyoskentely.md). Tämä haara perustuu alkuperäiseen selainversioon; aiemman Python-version tiedostoja ei ole mukana.
