# Sähkönkäytön ajoitusoptimointi

Lue [projektin määrittely ja hyväksymiskriteerit](docs/01-projektikuvaus.md).

## Tekijät ja tarkoitus

Kurssiprojekti: Niklas Laak ja Aatu Lepola. Sovellus auttaa kotitalouden asukasta löytämään yhden sähkölaitteen halvimman yhtenäisen käyttöjakson CSV-tiedoston tuntihinnoista. AI-avusteinen toteutustapa ja työnjako kuvataan [AI-dokumentissa](docs/02-ai-tyoskentely.md).

Ensimmäinen versio toteuttaa V1–V5:n toiminnot. Kuvaaja (V6), verkkohintojen haku ja laiteohjaus eivät ole mukana.

## Käynnistys

1. Hae tämä työhaara GitHub Desktopilla ja avaa projektikansio (Repository → Show in Explorer).
2. Avaa **index.html** selaimessa esimerkiksi kaksoisnapsauttamalla sitä. Jos HTML avautuu editoriin, valitse tiedoston Avaa sovelluksessa -valikosta selain.
3. Säilytä `index.html`, `style.css` ja `script.js` samassa kansiossa.

Käyttö ei vaadi Node.js:ää, Pythonia, lisäosia, palvelinta, tunnuksia tai verkkoyhteyttä. Tarvitaan moderni selain, joka tukee JavaScriptiä ja BigInt-lukuja. GitHubin koodinäkymä ei suorita ohjelmaa. VS Codea käytetään tiedostojen muokkaamiseen; tallennettu muutos näkyy ohjelmassa selaimen sivun päivityksen jälkeen.

## Käyttö

1. Valitse sovelluksen tiedostokentässä `data/esimerkkihinnat.csv`.
2. Tarkista, että näytössä lukee **ladattu 4 tuntia**.
3. Anna tehoksi **1 kW** ja käyttöajaksi **2 h**. Paina **Etsi halvin jakso**.
4. Odotettu tulos: **4.11.2026 klo 01–03, 2 kWh ja 0,08 €**.
5. Vaihda käyttöajaksi **5 h**. Vanha tulos poistuu; laskenta näyttää ilmoituksen aineiston riittämättömyydestä.

Hintatiedoston otsikko on `aika;hinta_snt_kwh`. Aikaleimat ovat tuntien alkuja muodossa `YYYY-MM-DDTHH:00`. Tunnit ovat peräkkäisiä, hintojen desimaalierotin on piste ja rivien erotin puolipiste. UTF-8 ja Windowsin rivinvaihdot käyvät. Negatiiviset ja nollahinnat sallitaan. Tehokenttä hyväksyy sekä pilkun että pisteen. Käyttöaika annetaan kokonaisina tunteina.

Tuonti on rajattu 1 000 000 tavuun, 10 000 tuntiin ja vuosiin 0001–9998. Kellonaikoja ei muuteta aikavyöhykkeestä toiseen; kellonsiirtopäiviä ei käsitellä. Tiedot eivät poistu koneeltasi, ja sivun uudelleenlataus tyhjentää aineiston.

Laitteen oletetaan käyttävän vakiotehoa. Hinnat käytetään sellaisinaan eikä veroja tai muita maksuja lisätä. Tulos ei ole koko sähkölaskun arvio. Esimerkkitiedostot ovat synteettisiä, eivät oikeita markkinahintoja.

## Testien suorittaminen

Tee yllä olevat kaksi koetta selaimessa. Kokeile lisäksi `data/virhe-puuttuva-tunti.csv` (virheilmoitus) ja `data/negatiiviset-hinnat.csv` (1 kW / 2 h: klo 01–03, −0,02 €).

Kehittäjän automaattiset laskentatestit: asenna tarvittaessa Node.js ja suorita projektikansiossa:

```sh
node --test tests/optimizer.test.js tests/ui.test.js
```

Selainautomaatiotesti on `tests/browser.cjs`. Se vaatii erikseen Playwrightin ja sen Chromium-selaimen. Sovelluksen tavallinen käyttö ei vaadi näitä. Kehittäjä voi asentaa testiriippuvuuden paikallisesti komennoilla `npm install --no-save --package-lock=false playwright` ja `npx playwright install chromium`, minkä jälkeen testi ajetaan komennolla `node tests/browser.cjs`. Älä lisää `node_modules`-kansiota repoon.

Testatut ympäristöt, tulokset ja tekijöiden vielä tekemättömät kokeet löytyvät [testausdokumentista](docs/03-testaus-ja-validointi.md).

## Dokumentit

- [Projektikuvaus](docs/01-projektikuvaus.md)
- [AI-työskentely](docs/02-ai-tyoskentely.md)
- [Testaus ja validointi](docs/03-testaus-ja-validointi.md)
- [Palautus](docs/04-palautus.md)

## Lähteet ja käyttöehdot

Sovelluskoodi ja synteettinen testidata tuotettiin tähän projektiin ChatGPT/Codex-avusteisesti; ulkoista hintadataa, käyttöliittymäkirjastoa tai CDN-resurssia ei käytetä. Node.js ja Playwright ovat kehitysvaiheen testityökaluja. Projektille ei ole vielä valittu lisenssiä.

## Seuraava tehtävä

Niklas ja Aatu kokeilevat version omilla koneillaan, sopivat ja kirjaavat katselmoijan sekä täydentävät omat havaintonsa testausdokumenttiin. Katselmoitu toimiva muutos yhdistetään päähaaraan. Kuvaaja voidaan toteuttaa tämän jälkeen erillisenä muutoksena.
