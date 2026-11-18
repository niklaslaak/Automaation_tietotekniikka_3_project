# V2:n testaus, 18.11.2026

## Suoritetut kokeet

Tekoäly ajoi testit omassa Linux-ympäristössään: Python 3.12.14, SciPy 1.17.0 ja Node.js 24.22.3. Näitä ei kirjata minun tai Aatun käsin tekemiksi kokeiksi.

| Koe | Havainto |
|---|---|
| `python -m unittest discover -s v2/tests -v` | 18/18 testiä läpäisi. |
| Yhteisoptimoinnin vertailu | 12 pientä, siemenluvulla 42 tuotettua tapausta verrattiin kaikkien mahdollisten aikataulujen läpikäyntiin. Kustannukset täsmäsivät. |
| Vartit, pilkkominen, tehoprofiilit, käyttöikkunat ja yhteistehoraja | Normaali- ja virhetapaukset läpäisivät. |
| Negatiiviset hinnat ja kuluerittely | Odotetut kustannukset täsmäsivät, perusmaksu pysyi erillisenä kuukausimaksuna. |
| CSV ja kellonsiirto | Puuttuva vartti ja epäselvä paikallisaika hylättiin; eksplisiittiset UTC-erot toimivat. |
| Paikallinen HTTP-palvelin ja SQLite | Rekisteröinti, kirjautuminen, väärä salasana, uloskirjautuminen, tallennus ja tilien tietojen erottelu läpäisivät. Tiedot löytyivät uudella tietokantayhteydellä. |
| Alkuperäiset Node-testit | 22/22 läpäisi; vanhan version koodia ei muutettu. |
| `node --check v2/web/app.js` | JavaScriptin syntaksitarkistus läpäisi. |

## Avoimet kokeet ja rajoitukset

- **Oikea selainajo jäi tekemättä:** Playwright löysi koneelta Chromiumin, mutta sen käynnistys pysähtyi ympäristön estämään käyttöjärjestelmäoperaatioon (`socket() failed: Operation not permitted`). Käyttöliittymän visuaalista tarkistusta, mobiiliasettelua tai näppäimistökäyttöä ei merkitä läpäisseeksi.
- **Elävä hintahaku jäi vahvistamatta:** tämän ympäristön pyyntö hintapalveluun palautti HTTP 403. Rajapinnan dokumentaatio tarkistettiin, ja vastausten muunnos testattiin synteettisillä rajapintavastauksilla. Tätä ei lasketa oikeaksi verkkotestiksi.
- **Windows-käynnistys ja Edge:** `kaynnista-v2.bat` on kirjoitettu, mutta sitä ei ajettu Windowsissa.
- **Ennusteen tarkkuutta ei mitattu:** viimeisen vuorokauden toistaminen on vain kokeellinen vertailumalli.
- **Oikea laiteohjaus:** käyttäjä valitsi simulaation; fyysisiä ohjauskokeita ei kuulu tähän versioon.
- **Pitkän ajon automaattinen hintapäivitys ja ratkaisijan 12 sekunnin aikarajatilanne:** eivät vielä kuulu suoritettuihin integraatiokokeisiin.

## Näin toistan testit

Projektin juuresta, riippuvuuksien asennuksen jälkeen:

```sh
python -m unittest discover -s v2/tests -v
node --test tests/optimizer.test.js tests/ui.test.js
```

Selainautomaatio on valmiina, mutta sen suoritus on vielä avoin:

```sh
npm install --prefix v2
npx --prefix v2 playwright install chromium
node v2/tests/browser.cjs
```

Selainkoe käynnistää palvelimen satunnaiseen vapaaseen porttiin ja käyttää väliaikaista testitietokantaa. Se ei käytä oikeita tunnuksia eikä oikeaa hintapalvelua. Testi tarvitsee Pythonin, johon SciPy ja tzdata on asennettu. Windowsin PowerShellissä aseta tarvittaessa `$env:PYTHON = (Resolve-Path v2\.venv\Scripts\python.exe).Path`. Jos Chromium on jo koneella, `CHROMIUM_PATH`-ympäristömuuttujalla voi antaa suoritustiedoston polun.

## Oma ja Aatun kokeilu seuraavaksi

1. Käynnistän V2:n Windowsissa, luon tilin ja kokeilen ensin esimerkkiaineistoa.
2. Tarkistan L1–L10:n tulokset käyttöliittymästä ja kirjaan havaitut arvot, selaimen version ja päivämäärän.
3. Kokeilen verkkohakua ja vertaan yhtä varttihintaa lähdepalveluun. Tarkistan myös nykyhinnan, huomisen puuttuvien hintojen tilanteen ja verkkovirheen.
4. Testaan tallennuksen palvelimen sammuttamisen ja uudelleenkäynnistyksen yli sekä varmistan toisella tilillä, että suunnitelmat eivät näy ristiin.
5. Käymme Aatun kanssa muutokset läpi ennen yhdistämistä `main`-haaraan.

Nämä kohdat ovat suunnitelma, eivät väite jo suoritetuista kokeista.
