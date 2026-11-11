# AI-työskentely

## Todellisuudessa käytetty alkuprompt

Valitsin projektin aiheeksi sähkön hinnan optimoinnin. Tämän jälkeen täydensimme projektikuvausta, kuten käyttäjätarvetta ja rajausta. Kun projektikuvaus ja hyväksymiskriteerit olivat valmiina, pyysin tekoälyltä apua ensimmäisen ohjelmaversion tekemiseen.

Alkuperäinen alkuprompt täydennetään vielä keskustelun alusta. Seuraavat myöhemmät pyynnöt on säilytetty sellaisinaan:

- Aiheen valinta: ”aihe voisi olla sähkön hinann optimointi”
- Projektikuvauksen laatiminen: ”tee kohta 2 ja täydennä projektikuvaus.md keksi käyttäjä tarve ja rajaus”
- Ensimmäinen toteutus: ”selvä, voitko sinä tehdä seuraavan vaiheen”

Toteutuspyynnön taustalla olivat keskustelussa annettu kurssiohje sekä [projektikuvaus ja hyväksymiskriteerit](01-projektikuvaus.md). Tekoälylle oli kuvattu ohjelman odotettu toiminta sekä normaalissa tilanteessa että virhetilanteissa.

## Jatkuva työskentelyprosessi

Perustin yhteisen GitHub-repositorion, lisäsin opettajan projektipohjan ja valitsin projektin aiheen. Projektin vaatimukset ja suunnitelma kirjattiin docs/01-projektikuvaus.md-tiedostoon, jonka pohjalta toteutusta lähdettiin tekemään.

ChatGPT/Codex laati pyynnöstäni projektikuvauksen luonnoksen ja tallensi sen työhaaraan sekä pull requestiin #1. Yhdistin muutokset main-haaraan 4.11.2026. Projektin tiedostot ja muutokset ovat GitHubissa, josta pystymme seuraamaan työn etenemistä.

Ensimmäinen ohjelmaversio toteutettiin feature/ensimmainen-versio-haarassa määriteltyjen vaatimusten ja hyväksymiskriteerien pohjalta. ChatGPT/Codex tuotti ensimmäisen version ohjelmakoodin, esimerkkidatan ja automaattiset testit. Sitä käytettiin myös dokumenttien laatimiseen ja Git-työskentelyn neuvontaan. Työkalu luki olemassa olevat tiedostot GitHub-yhteydellä; kurssiohjeet ja tehtävärajaukset annettiin keskustelussa. Toteutusvaiheessa repossa ei ollut AGENTS.md-tiedostoa.

Kokeilin ohjelmaa omalla koneellani Microsoft Edgellä ja vertasin tuloksia sovittuihin odotuksiin. Aatu yhdisti ensimmäisen ohjelmaversion pull requestin #2 päähaaraan 9.11.2026. Testihavainnot kirjataan [testausdokumenttiin](03-testaus-ja-validointi.md). Jatkossa käymme muutokset läpi, kokeilemme toimintaa ja kirjaamme hyväksymisen tai korjausten perustelut.

## Käytetyt työkalut

| Työkalu | Malli tai versio, jos tiedossa | Käyttötarkoitus | Tarkistustapa |
|---|---|---|---|
| ChatGPT / Codex | GPT-6-pohjainen agentti; tarkka palveluversio ei tiedossa | Suunnittelu, ensimmäisen version koodi, testit, dokumentointi ja ohjeistus | Automaattiset testit ja omat selainkokeeni |
| GitHub ja GitHub-yhteys | Versio ei tiedossa | Repon tiedostot, työhaarat ja pull requestit | Muutosten vertailu ja yhdistäminen |
| GitHub Desktop ja VS Code | Versiot eivät tiedossa | Paikallisen projektin hallinta ja tiedostojen muokkaaminen | Muutosten hakeminen, tallentaminen ja ohjelman kokeilu |
| Microsoft Edge | Versio ei tiedossa | Omat toiminnalliset kokeeni | Neljä testitapausta 4.11.2026 |
| Node.js | v24.22.1 agentin ympäristössä | Laskennan ja tapahtumakäsittelyn automaattiset testit | 22 testiä läpäisi |
| Playwright / Chromium | Chromiumia ei saatu asennettua agentin ympäristöön | Valmisteltu selainautomaatiotesti | Ajo jäi suorittamatta onnistuneesti |

## Konkreettinen tarkistusesimerkki

Testasin ensimmäistä versiota Microsoft Edgellä 4.11.2026. Esimerkkiaineistolla, teholla 1 kW ja käyttöajalla 2 h ohjelma näytti jakson klo 01–03, kulutuksen 2 kWh ja kustannuksen 0,08 €. Tulos vastasi odotusta: (5 + 3) / 100 = 0,08 €.

Kokeilin myös liian pitkää käyttöaikaa, puuttuvaa tuntia ja negatiivista hintaa. Vahvistin kokeiden toimivan odotetusti. Negatiivisen hinnan kokeessa minulla oli ensin valittuna tavallinen esimerkkitiedosto. Oikean tiedoston valinnan jälkeen tulos oli odotettu −0,02 €. Tässä tilanteessa korjasin aineiston valinnan; koodimuutosta ei tarvittu.

Näiden neljän kokeen perusteella ensimmäinen käyttötapaus toimi selaimessani. Ne eivät yksin kata kaikkia syötteitä tai käytettävyyttä. Agentin suorittamat automaattiset testit ja omat kokeeni on eroteltu testausdokumentissa. Projektikuvauksen katselmoinnin ja hyväksymisen perustelut täydennetään vielä; pelkkä yhdistäminen ei kerro tarkistuksen sisältöä.

## Työnjako ja kummankin konkreettinen osuus

- **Niklas:** Valitsin projektin aiheen, perustin ja julkaisin GitHub-repositorion sekä lisäsin opettajan projektipohjan. Osallistuin suunnitteluun ja vaatimusten määrittelyyn keskustelussa, ohjasin työtä pyynnöillä ja huolehdin alkuvaiheen etenemisestä sekä tiedostojen hallinnasta. Otin GitHub Desktopin ja VS Coden käyttöön, hain muutokset koneelleni, muokkasin dokumenttitekstiä ja suoritin neljä selainkoetta. Yhdistin projektikuvauksen pull requestin #1.
- **Aatu:** Yhdisti ensimmäisen ohjelmaversion pull requestin #2 päähaaraan 9.11.2026. Hänen omat testihavaintonsa, katselmoinnin perustelunsa ja muu toteutunut työnsä täydennetään projektin edetessä.
- **ChatGPT/Codex:** Tuotti projektikuvauksen luonnoksen, ensimmäisen ohjelmaversion koodin, esimerkkidatan ja testit sekä laati ja päivitti dokumentteja pyyntöjemme ja ilmoittamiemme havaintojen perusteella.

Seuraavissa vaiheissa käymme muutokset yhdessä läpi, testaamme toimintaa ja teemme tarvittavat korjaukset. Tarkoituksena on jakaa työtehtäviä tasaisesti ja vaihtaa rooleja. Vielä täydennetään alkuperäinen alkuprompt, katselmointien perustelut, Aatun testihavainnot sekä toisen parin palaute ja siihen perustuva päätös.
