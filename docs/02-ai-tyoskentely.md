# AI-työskentely

## Todellisuudessa käytetty alkuprompt

Projektin varsinainen alkuperäinen alkuprompt on vielä poimittava keskustelun alusta tekijöiden toimesta. Alla olevat myöhemmät pyynnöt ovat sanatarkkoja näkyvästä keskustelusta; ne eivät korvaa alkupromptia.

- Aihetoive: ”aihe voisi olla sähkön hinann optimointi”
- Projektikuvauksen täydennyspyyntö: ”tee kohta 2 ja täydennä projektikuvaus.md keksi käyttäjä tarve ja rajaus”
- Ensimmäisen toteutuksen pyyntö 4.11.2026: ”selvä, voitko sinä tehdä seuraavan vaiheen”

Viimeisen pyynnön kontekstina olivat yhteinen projektikuvaus, sovitut normaalin ja virhetilanteen hyväksymiskriteerit sekä keskustelu ensimmäisestä ohjelmaversiosta. Pyyntö ei ollut irrallinen ohje koko sovelluksen vapaaseen toteutukseen.

## Jatkuva työskentelyprosessi

Työkalulle annettiin kurssin työpajaohje ja projektin tavoite keskustelussa. Codex luki olemassa olevat tiedostot GitHub-yhteydellä. Repossa ei tässä vaiheessa ollut AGENTS.md-tiedostoa. Sovitut toiminnalliset vaatimukset luettiin tiedostosta `docs/01-projektikuvaus.md`.

Projektikuvauksen muutos tehtiin omaan haaraan ja pull requestiin #1. GitHubin mukaan Niklas yhdisti sen päähaaraan 4.11.2026. Tämä osoittaa yhdistämisen, mutta ei itsessään todista parin yhteistä katselmointia.

Ensimmäinen ohjelmaversio tehdään haaraan `feature/ensimmainen-versio` päähaaran määrittelyn pohjalta. Codex tuottaa koodin, esimerkkidatan ja automaattiset testit sekä kirjaa itse suorittamansa kokeet. Tekijät lukevat koodin, suorittavat omat kokeensa ja tekevät päätöksen muutoksen hyväksymisestä. Tekemättömiä ihmisten kokeita ei kirjata suoritetuiksi.

## Käytetyt työkalut

| Työkalu | Malli tai versio, jos tiedossa | Käyttötarkoitus | Tarkistustapa |
|---|---|---|---|
| ChatGPT / Codex | GPT-6-pohjainen agentti; tarkka palveluversio ei tiedossa | Projektikuvaus ja ensimmäinen ohjelmaversio | Agentin laskenta- ja tapahtumakäsittelytestit; selainkoe ja tekijöiden katselmointi vielä tehtävä |
| GitHub-yhteys | Versio ei tiedossa | Repon luku, työhaara, commit ja pull request | Muutosten tarkastelu GitHubissa |
| GitHub Desktop ja VS Code | Tekijät täydentävät omat versionsa tarvittaessa | Paikallinen työkopio ja tiedostojen muokkaaminen | Tekijöiden käytännön työ |
| Node.js | v24.22.1 agentin ympäristössä | Laskennan ja validoinnin testit | `node --test tests/optimizer.test.js` |
| Playwright / Chromium | Selain ei ollut saatavilla agentin ympäristössä | Valmisteltu selainkoe; suoritus estyi | `node tests/browser.cjs` |

## Konkreettinen tarkistusesimerkki

Projektikuvaus esitettiin ensin katselmoitavana muutoksena, ja Niklas yhdisti sen pull requestissa #1. Tekijöiden tulee täydentää tähän, mitä he tarkistivat ja miksi hyväksyivät rajauksen; perustelua ei päätellä pelkästä merge-toiminnosta.

Ohjelmaversion tarkistuksessa agentti vertaa 1 kW:n ja kahden tunnin tulosta käsin laskettuun arvoon (5 + 3) / 100 = 0,08 €. Lisäksi tarkistetaan viiden tunnin käyttöpyynnön hylkäys neljän tunnin aineistosta. Suoritetut agenttikokeet kirjataan testausdokumenttiin erillään käyttäjävalidoinnista.

## Työnjako ja kummankin konkreettinen osuus

- **Niklas:** esitti aihetoiveen, loi ja julkaisi repon, lisäsi projektipohjan, pyysi AI:lta projektikuvauksen ja toteutuksen sekä yhdisti projektikuvauksen pull requestin #1. Keskustelussa hän vahvisti saaneensa muutokset näkyviin paikallisesti.
- **Aatu:** konkreettista työpanosta ei ole vielä vahvistettu tässä keskustelussa. Täydennetään todellisen osallistumisen mukaan.
- **AI-agentti:** laati määrittelyluonnoksen sekä ensimmäisen ohjelmaversion ja sen testit. Koodia ei kirjata opiskelijoiden käsin kirjoittamaksi.
- **Sovittava seuraavaksi:** ensimmäisen koodimuutoksen katselmoija ja kummankin omat kokeet. Roolit vaihdetaan seuraavassa työvaiheessa.

Toisen parin palaute ja siihen perustuva päätös ovat vielä tekemättä.
