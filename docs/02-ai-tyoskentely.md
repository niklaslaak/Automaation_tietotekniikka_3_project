# AI-työskentely

## Todellisuudessa käytetty alkuprompt

Valitsimme projektin aiheeksi sähkön hinnan optimoinnin. Tämän jälkeen täydensimme projektikuvausta, kuten käyttäjätarvetta ja rajausta. Kun projektikuvaus ja hyväksymiskriteerit olivat valmiina, pyysin tekoälyltä apua ensimmäisen ohjelmaversion tekemiseen.

Toteutuspyynnön taustalla olivat keskustelussa annettu kurssiohje sekä [projektikuvaus ja hyväksymiskriteerit](01-projektikuvaus.md). Tekoälylle oli kuvattu ohjelman odotettu toiminta sekä normaalissa tilanteessa että virhetilanteissa.

## Jatkuva työskentelyprosessi

GitHub-repositorio toimii projektin yhteisenä työympäristönä. Projektipohja valittiin opettajan tai kurssin tarjoamasta pohjasta, ja työn aiheet sekä vaatimukset dokumentoitiin `docs/01-projektikuvaus.md`-tiedostoon. Toteutuksen pohjana käytettiin sovittuja vaatimuksia ja hyväksymiskriteerejä.

Projektikuvaus luotiin työhaaraan ja yhdistettiin pull requestin #1 kautta päähaaraan 4.11.2026. Ensimmäinen ohjelmaversio toteutettiin `feature/ensimmainen-versio`-haaran pohjalta. ChatGPT/Codex tuotti ohjelmakoodin, esimerkkidatan, automaattiset testit ja osan dokumentoinnista. Työkalu käytti repossa olevia tiedostoja ja GitHub-yhteyttä työn ohjaamiseen. Toteutusvaiheessa repossa ei ollut AGENTS.md-tiedostoa.

Muutosten tarkastelu ja hyväksyntä tehdään GitHubissa pull requestien, haarojen ja commit-historian avulla. Ohjelman toimivuus varmennetaan sekä selainkokeilla että automaattisilla testeillä. Testitiedot kirjataan [testausdokumenttiin](03-testaus-ja-validointi.md), ja seuraavissa vaiheissa muutokset käydään läpi yhdessä sekä dokumentoidaan mahdolliset korjaukset ja hyväksymispäätökset.

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

Ensimmäisen version tarkistuksessa esimerkkiaineistoa käsiteltiin teholla 1 kW ja käyttöajalla 2 h. Odotettu tulos oli jakso klo 01–03, kulutus 2 kWh ja kustannus 0,08 €. Käsin laskettu tarkistus on `(5 + 3) / 100 = 0,08 €`, ja tämä vastaava tulos on vahvistettu selaimessa.

Lisäksi tarkistettiin liian pitkä käyttöaika, puuttuva tunti ja negatiivinen hinta. Neljän tunnin aineistosta pyydettyä 5 tunnin jaksoa ei hyväksytty. Puuttuvaa tuntia sisältävä tuonti tuotti virheilmoituksen ja negatiivisella hintatiedostolla saatiin kustannukseksi −0,02 €. Tarkistukset on eroteltu [testausdokumentissa](03-testaus-ja-validointi.md).

## Työnjako ja kummankin konkreettinen osuus

- **Niklas:** esitti aihetoiveen, loi ja julkaisi repon, lisäsi projektipohjan, pyysi AI:lta projektikuvauksen ja toteutuksen sekä yhdisti projektikuvauksen pull requestin #1. Keskustelussa hän vahvisti saaneensa muutokset näkyviin paikallisesti.
- **Aatu:** toteutti hintakuvaajan, jossa jokainen ladattu tunti näkyy hintapylväänä ja laskennan valitsema käyttöjakso korostetaan. Negatiiviset hinnat näkyvät nollaviivan alapuolella.
- **AI-agentti:** laati määrittelyluonnoksen sekä ensimmäisen ohjelmaversion ja sen testit. Koodia ei kirjata opiskelijoiden käsin kirjoittamaksi.
- **Sovittava seuraavaksi:** ensimmäisen koodimuutoksen katselmoija ja kummankin omat kokeet. Roolit vaihdetaan seuraavassa työvaiheessa.

Seuraavissa vaiheissa käymme muutokset yhdessä läpi, testaamme toimintaa ja teemme tarvittavat korjaukset. Tarkoituksena on jakaa työtehtäviä tasaisesti ja vaihtaa rooleja. Vielä täydennetään alkuperäinen alkuprompt, katselmointien perustelut ja Aatun testihavainnot.
