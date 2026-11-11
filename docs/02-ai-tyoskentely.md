# AI-työskentely

## Todellisuudessa käytetty alkuprompt

Ensin valitsin projektin aiheeksi sähkön hinnan optimoinnin. Tämän jälkeen täydensimme projektikuvauksen (esim. käyttäjätarpeen ja rajauksen määrittely)

Kun olimme saaneet yhteisen projektikuvauksen ja hyväksymiskriteerit valmiiksi, pyysin tekoälyltä apua ensimmäisen ohjelmaversion tekemiseen. Olimme jo aiemmin sopineet, mitä ohjelman pitää tehdä normaalitilanteessa ja miten sen tulee toimia virhetilanteissa. Tekoälyä käytettiin siis apuna projektin suunnittelussa ja toteutuksessa jo määriteltyjen vaatimusten pohjalta.

## Jatkuva työskentelyprosessi

Ihan aluksi projektin vaatimukset ja suunnitelma kirjattiin docs/01-projektikuvaus.md-tiedostoon, jonka pohjalta toteutusta lähdettiin tekemään.

Tein projektikuvauksen muutokset omaan haaraan ja loin niistä pull requestin #1. Yhdistin muutokset main-haaraan 4.11.2026. Projektin tiedostot ja muutokset ovat GitHubissa, josta pystymme seuraamaan työn etenemistä.

Seuraavana vaiheena on ensimmäisen ohjelmaversion toteuttaminen feature/ensimmainen-versio-haarassa. Toteutuksen pohjana käytetään aiemmin määriteltyjä vaatimuksia ja hyväksymiskriteerejä.

Ohjelman toteutuksessa hyödynnetään tekoälyä koodin, esimerkkidatan ja automaattisten testien tuottamiseen. Käymme tuotetun koodin läpi, testaamme ohjelman toimintaa ja tarkistamme, että se täyttää projektin vaatimukset. Tämän jälkeen muutokset voidaan hyväksyä ja yhdistää päähaaraan.

## Käytetyt työkalut

| Työkalu | Malli tai versio, jos tiedossa | Käyttötarkoitus | Tarkistustapa |
|---|---|---|---|


## Konkreettinen tarkistusesimerkki

Projektikuvaus esitettiin ensin katselmoitavana muutoksena, ja Niklas yhdisti sen pull requestissa #1. Seuraavaksi meidän tulee täydentää tähän, mitä tarkistimme ja miksi hyväksyimme rajauksen; perustelua ei päätellä pelkästä merge-toiminnosta.

Ohjelmaversion tarkistuksessa agentti vertaa 1 kW:n ja kahden tunnin tulosta käsin laskettuun arvoon (5 + 3) / 100 = 0,08 €. Lisäksi tarkistetaan viiden tunnin käyttöpyynnön hylkäys neljän tunnin aineistosta. Suoritetut agenttikokeet kirjataan testausdokumenttiin erillään käyttäjävalidoinnista.

## Työnjako ja kummankin konkreettinen osuus

Niklas: Valitsin projektin aiheen, perustin GitHub-repositorion ja loin projektin pohjan. Osallistuin projektin suunnitteluun ja vaatimusten määrittelyyn sekä yhdistin projektikuvauksen muutokset päähaaraan pull requestin #1 kautta. Olen myös huolehtinut projektin alkuvaiheen etenemisestä ja tiedostojen hallinnasta.

Aatu: Osallistuu projektin suunnitteluun, toteutuksen tarkistamiseen ja ohjelman testaamiseen. Tarkempi työnjako ja tehdyt tehtävät täydennetään projektin edetessä.

Tekoäly: Käytetty apuna ohjelmakoodin tuottamisessa ja testauksen valmistelussa.

Seuraavat vaiheet: Käymme yhdessä läpi ensimmäisen ohjelmaversion, testaamme sen toiminnan ja teemme tarvittavat korjaukset. Tarkoituksena on jakaa työtehtäviä tasaisesti ja vaihtaa rooleja projektin eri vaiheissa.
