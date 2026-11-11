# AI-työskentely

## Todellisuudessa käytetty alkuprompt

Alkuperäinen alkuprompt täydennetään keskustelun alusta. Seuraavat myöhemmät pyynnöt on säilytetty sellaisinaan:

- Aiheen valinta: ”aihe voisi olla sähkön hinann optimointi”
- Projektikuvauksen laatiminen: ”tee kohta 2 ja täydennä projektikuvaus.md keksi käyttäjä tarve ja rajaus”
- Ensimmäinen toteutus: ”selvä, voitko sinä tehdä seuraavan vaiheen”

Toteutuspyynnön taustalla olivat keskustelussa annettu kurssiohje sekä [projektikuvaus ja hyväksymiskriteerit](01-projektikuvaus.md).

## Jatkuva työskentelyprosessi

Niklas perusti yhteisen GitHub-repon, lisäsi opettajan projektipohjan ja valitsi aiheeksi sähkönkäytön ajoitusoptimoinnin. Projektia suunniteltiin keskustelussa ja toteutettiin vaiheittain työhaaroissa.

ChatGPT/Codex laati pyynnöstä projektikuvauksen luonnoksen sekä ensimmäisen version ohjelmakoodin, esimerkkiaineistot ja automaattiset testit. Sitä käytettiin myös dokumenttien laatimiseen ja Git-työskentelyn neuvontaan. Työkalu luki repon nykyiset tiedostot GitHub-yhteydellä; kurssiohjeet ja tehtävärajaukset annettiin keskustelussa. Toteutusvaiheessa repossa ei ollut AGENTS.md-tiedostoa.

Niklas kokeili ohjelmaa omalla koneellaan Edgellä ja vertasi tuloksia sovittuihin odotuksiin. Muutokset käsiteltiin pull requesteina: Niklas yhdisti projektikuvauksen (#1) 4.11.2026 ja Aatu ensimmäisen ohjelmaversion (#2) 9.11.2026. Kokeiden havainnot kirjataan [testausdokumenttiin](03-testaus-ja-validointi.md).

## Käytetyt työkalut

| Työkalu | Malli tai versio, jos tiedossa | Käyttötarkoitus | Tarkistustapa |
|---|---|---|---|
| ChatGPT / Codex | GPT-6-pohjainen agentti; tarkka palveluversio ei tiedossa | Suunnittelu, ensimmäisen version koodi, testit, dokumentointi ja ohjeistus | Automaattiset testit ja Niklaksen omat selainkokeet |
| GitHub ja GitHub-yhteys | Versio ei tiedossa | Repon tiedostot, työhaarat ja pull requestit | Muutosten vertailu ja yhdistäminen |
| GitHub Desktop ja VS Code | Versiot eivät tiedossa | Paikallisen projektin hallinta ja tiedostojen tarkastelu | Työkopion muutosten hakeminen ja ohjelman kokeilu |
| Microsoft Edge | Versio ei tiedossa | Niklaksen omat toiminnalliset kokeet | Neljä testitapausta 4.11.2026 |
| Node.js | v24.22.1 agentin ympäristössä | Laskennan ja tapahtumakäsittelyn automaattiset testit | 22 testiä läpäisi |
| Playwright / Chromium | Chromiumia ei saatu asennettua agentin ympäristöön | Valmisteltu selainautomaatiotesti | Ajo jäi suorittamatta onnistuneesti |

## Konkreettinen tarkistusesimerkki

Niklas testasi ensimmäistä versiota Microsoft Edgellä 4.11.2026. Esimerkkiaineistolla, teholla 1 kW ja käyttöajalla 2 h ohjelma näytti jakson klo 01–03, kulutuksen 2 kWh ja kustannuksen 0,08 €. Tulos vastasi odotusta: (5 + 3) / 100 = 0,08 €.

Niklas vahvisti myös liian pitkän käyttöajan, puuttuvan tunnin ja negatiivisen hinnan kokeiden toimivan odotetusti. Negatiivisen hinnan kokeessa oli ensin valittuna tavallinen esimerkkitiedosto. Oikean testitiedoston valinnan jälkeen tulos oli odotettu −0,02 €. Tässä tilanteessa korjattiin aineiston valinta; koodimuutosta ei tarvittu.

Näiden neljän kokeen perusteella ensimmäinen käyttötapaus toimi Niklaksen selaimessa. Ne eivät yksin kata kaikkia mahdollisia syötteitä tai käytettävyyttä.

## Työnjako ja kummankin konkreettinen osuus

- **Niklas:** perusti ja julkaisi repon, lisäsi projektipohjan, valitsi aiheen, ohjasi työtä pyynnöillä, otti GitHub Desktopin ja VS Coden käyttöön, haki muutokset koneelleen sekä suoritti neljä selainkoetta ja ilmoitti havaintonsa. Hän yhdisti projektikuvauksen pull requestin #1.
- **Aatu:** yhdisti ensimmäisen ohjelmaversion pull requestin #2 päähaaraan 9.11.2026. Hänen omat testihavaintonsa ja katselmoinnin perustelunsa täydennetään toteutuneen työn mukaan.
- **ChatGPT/Codex:** tuotti projektikuvauksen luonnoksen, ensimmäisen ohjelmaversion koodin, esimerkkidatan ja testit sekä laati ja päivitti dokumentteja tekijöiden pyyntöjen ja ilmoittamien havaintojen perusteella.

Vielä täydennetään alkuperäinen alkuprompt, katselmointien perustelut, Aatun testihavainnot sekä toisen parin palaute ja siihen perustuva päätös. Työnjakoa päivitetään projektin edetessä.
