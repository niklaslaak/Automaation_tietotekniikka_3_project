# Laajennettu versio V2

[Yhteinen projektikuvaus](../docs/01-projektikuvaus.md) · [Testaus ja avoimet kokeet](TESTAUS.md)

Halusin kokeilla, miten alkuperäinen ohjelma laajenee usean laitteen käytön suunnitteluun. Valitsin omalla koneella toimivan version ja laiteohjauksen simulaation. Työ on haarassa `feature/laajennettu-optimointi`, jotta Aatu voi jatkaa alkuperäisen käyttöliittymän kehittämistä samalla.

## Käynnistä Windowsissa

1. Hae haara GitHub Desktopissa: **Fetch origin → Current branch → feature/laajennettu-optimointi**. Jos tarjolla on **Pull origin**, paina sitä.
2. Asenna Python 3.12 tai uudempi sekä asennuksen mukana Python Launcher, jos niitä ei vielä ole koneella.
3. Avaa projektikansio ja kaksoisnapsauta **kaynnista-v2.bat**. Ensimmäinen käynnistys tekee virtuaaliympäristön ja asentaa riippuvuudet verkosta.
4. Avaa Edgessä **http://127.0.0.1:8765**. Pidä käynnistysikkuna auki.
5. Luo paikallinen tili, paina **Kokeile esimerkkiaineistolla**, lisää laitteet ja laske aikataulu.

Tämä versio tarvitsee paikallisen Python-palvelimen: pelkkä HTML-tiedoston avaus ei riitä. Alkuperäinen sovellus toimii edelleen repon juuren `index.html`-tiedostosta.

Vaihtoehtoisesti suorita projektin juuresta:

```powershell
py -3 -m venv v2\.venv
v2\.venv\Scripts\python.exe -m pip install -r v2\requirements.txt
v2\.venv\Scripts\python.exe v2\server.py
```

macOS/Linux:

```sh
python3 -m venv v2/.venv
v2/.venv/bin/python -m pip install -r v2/requirements.txt
v2/.venv/bin/python v2/server.py
```

Palvelin kuuntelee vain omaa konetta osoitteessa `127.0.0.1`. Jos portti on varattu, käynnistä `python v2/server.py --port 8766` ja avaa vastaava osoite. Sammutus: Ctrl+C. Windowsin käynnistystiedosto ei ole vielä kokeiltu oikeassa Windows-ympäristössä.

## Mitä listan ominaisuuksista on mukana?

| Ominaisuus | Toteutus ja rajaus |
|---|---|
| Automaattinen hintahaku | Suomen julkaistut varttihinnat Porssisahko.net v2 -rajapinnasta. Valinnainen tarkistus 15 minuutin välein sivun ollessa auki; palvelimessa 15 minuutin välimuisti. Verkkoyhteys tarvitaan. |
| Hinta nyt | Julkaistun aineiston käynnissä olevan vartin hinta; ajankohta tarkistetaan minuutin välein. Ei ennustetta nykyhinnan tilalle. |
| Hintaennuste | Kokeellinen 24 tunnin vertailumalli toistaa aineiston viimeiset 24 todellista tuntia. Ennuste merkitään erikseen ja sen optimointikäyttö on oletuksena pois päältä. Mallin ennustetarkkuutta ei ole validoitu. |
| Laiteohjaus | Käyttäjän valitsema simulaatio. Virtuaalinen aika etenee vartti kerrallaan ja näyttää laitteiden tilat ja tehon. Ei yhteyttä releisiin, Home Assistantiin tai sähköverkkoon. |
| Usean laitteen yhteisoptimointi | 1–6 laitetta, kaikille yhteinen kW-raja ja pienin yhteinen muuttuva kustannus. Koko talon muu kulutus ei ole mukana. |
| Pilkottava käyttö | Laite voi toimia erillisissä 15 minuutin jaksoissa, jos käyttäjä sallii sen. Käynnistysviiveitä, kulumista ja minimi-käynti-/taukoaikoja ei mallinneta. |
| Vaihteleva teho | Tehoprofiili, yksi kW-arvo per vartti. Vaiheiden järjestys säilyy myös pilkottaessa. Profiili korvaa vakiotehon ja käyttöajan. |
| Vartit ja osatunnit | Sisäinen askel on 15 minuuttia; käyttöajat ovat 15 minuutin monikertoja. Tuntihintainen CSV laajennetaan neljälle samanhintaiselle vartille. Ei tätä lyhyempiä jaksoja. |
| Käyttöikkunat | Laitteelle 1–12 sallittua alku–loppuaikaväliä. Jokaisen käytetyn vartin on mahduttava kokonaan sallittuun aikaan. Verkkohinnoilla oletuksena aloitetaan vasta tulevasta vartista; käyttäjä voi valita myös historiallisia vertailuaikoja. |
| Tilit ja tallennus | Paikallinen rekisteröityminen ja kirjautuminen; SQLite-tietokantaan tallennetut suunnitelmat erillään käyttäjittäin. Enintään 100 suunnitelmaa per käyttäjä. |
| Kuluerittely | Sähköenergia, siirto, sähkövero ja marginaali erikseen. Perusmaksut näytetään €/kk erillään yhden käyttösuunnitelman kustannuksesta. |

Automaattinen tarkistus ei vaihda toiseen aikaväliin huomaamatta: jos uusi aineisto kattaisi eri ajat, käyttöliittymä ilmoittaa sen saatavuudesta ja pyytää lataamaan sen hakupainikkeella. Näin laitteiden valitut käyttöikkunat eivät siirry itsestään. Samalle aikavälille päivittyneet hinnat päivitetään ja vanha laskentatulos poistuu. Selaimen sulkeminen pysäyttää automaattisen tarkistuksen ja simulaation.

## Hinnat ja CSV

Verkkohintojen lähde on [Porssisahko.net API v2](https://porssisahko.net/api). Rajapinnan snt/kWh-hinnat sisältävät arvonlisäveron. Kaikki itse annetut lisämaksut syötetään myös arvonlisäveroineen; ohjelma ei lisää ALV:tä uudelleen. Rajapinta ei välttämättä sisällä huomisen hintoja ennen niiden julkaisua. Epäonnistunut haku kertoo virheen eikä korvaa hintoja keksityillä arvoilla.

CSV:n muoto on:

```csv
aika;hinta_snt_kwh
2026-11-18T12:00:00+02:00;10
2026-11-18T12:15:00+02:00;5
2026-11-18T12:30:00+02:00;-2
2026-11-18T12:45:00+02:00;8
```

Valitse tuonnissa 15 tai 60 minuutin hintajakso. Desimaalipiste ja desimaalipilkku hyväksytään. Jokaisella rivillä on kaksi puolipisteellä erotettua saraketta. Rajat: 1 Mt ja 384 varttia eli 96 tuntia. Negatiiviset hinnat ja nollahinnat sallitaan. Esimerkkipainikkeen aineisto on synteettistä.

UTC tai eksplisiittinen aikavyöhyke-ero erottaa toistuvat syksyn kellonajat. Ilman eroa annettu aika tulkitaan Suomen ajaksi, mutta kellonsiirtopäivän epäselvä tai puuttuva paikallinen tunti hylätään. Näyttö käyttää aina Suomen aikaa ja näyttää UTC-eron. Tallennettu aineisto säilyy historiallisena; sitä ei päivitetä verkosta suunnitelmaa avatessa.

## Laskennan toiminta

Vartin kustannus on `teho kW × 0,25 h × (hinta + siirto + vero + marginaali) snt/kWh / 100`. Kaikkien laitteiden varttikustannukset lasketaan yhteen. Perusmaksut eivät riipu valitusta aikataulusta, joten ne eivät kuulu optimoinnin tavoitteeseen. Ne esitetään kuukausimaksuna eikä kokonaisen kuukauden maksua lisätä yhden ajokerran hintaan.

Yhteisoptimointi ratkaistaan SciPyn HiGHS-kokonaislukuoptimoinnilla. Yhtenäiselle käytölle valitaan yksi sallittu aloitus. Pilkottavalle käytölle valitaan tarvittava määrä vartteja; vaihtelevan profiilin vaiheiden järjestys säilytetään. Kaikkien laitteiden hetkellinen yhteisteho jää annetun rajan alle. Tasahintaisista aikatauluista V2 voi palauttaa minkä tahansa; alkuperäisen version aikaisin-tasatulos-sääntöä ei luvata yhteisoptimoinnille.

Laskennan aikaraja on 12 sekuntia. Jos vain kelvollinen aikataulu löytyy, käyttöliittymä kertoo, ettei halvinta ole varmistettu. Aikataulun rajoitteet tarkistetaan ratkaisun jälkeen. Jos ratkaisua ei ole tai sitä ei löydy, näytetään virhe. Enintään 40 000 päätösmuuttujaa; liian pitkä pilkottava tehoprofiili pyydetään lyhentämään. Liukulukulaskennan vuoksi lähes identtiset kustannukset voivat olla ratkaisijan toleranssin sisällä.

## Tilit, tallennus ja tiedostot

Tiedot tallentuvat `v2/.local/energy.sqlite3`-tiedostoon. Tietokantaa, salasanoja tai istuntoja ei lähetetä GitHubiin. Varmuuskopioi tietokanta palvelimen ollessa suljettuna. Tietokannan poistaminen hävittää paikalliset tilit ja suunnitelmat. Salasanat tallennetaan suolattuina PBKDF2-SHA256-tiivisteinä, istuntoeväste on HttpOnly ja SameSite=Strict. Istunto kestää enintään 8 tuntia. Sovellus ei sisällä salasanan palautusta sähköpostilla.

Paikalliset tilit erottelevat ohjelman käyttäjien näkymät; ne eivät suojaa tietokantatiedostoa samalle käyttöjärjestelmätilille pääsevältä henkilöltä. Tämä ei ole internetiin julkaistava palvelu. Niklaksen ja Aatun koneilla on omat tietokannat, vaikka koodi on yhteinen.

| Tiedosto | Tehtävä |
|---|---|
| `v2/core.py` | Hintojen validointi, aikavyöhykkeet, ennuste ja yhteisoptimointi. |
| `v2/server.py` | Paikallinen HTTP-palvelin, kirjautuminen, SQLite ja hintapalvelun yhteys. |
| `v2/web/` | Uusi käyttöliittymä ja ohjaussimulaatio. |
| `v2/tests/` | Laskennan, palvelimen ja selaimen testit. |
| `kaynnista-v2.bat` | Windows-käynnistys projektin juuresta. |

Alkuperäisiä `index.html`, `script.js`, `style.css` ja niiden testejä ei muuteta tässä haarassa. Yhteisiin dokumentteihin lisätään vain V2:n linkit ja rajaus. Aatu voi jatkaa niiden tai oman haaransa työstämistä; Gitin tavallinen katselmointi ja yhdistäminen tarvitaan myöhemmin.

## Hyväksymiskokeet

| Tunniste | Odotettu tulos |
|---|---|
| L1 | Vanhan CSV-esimerkin 1 kW / 120 min antaa 0,08 € ja klo 01–03 Suomen ajassa. |
| L2 | Hinnat 1, 20, 2, 30 snt/kWh: 1 kW / 30 min pilkottuna valitsee vartit 0 ja 2, kustannus 0,0075 €. |
| L3 | Kaksi 1 kW laitetta, molemmille 30 min ja yhteistehoraja 1 kW: neljän vartin aineistossa ne eivät käy yhtä aikaa. |
| L4 | Sallittujen ikkunoiden ulkopuolelle ei ajoiteta käyttöä. Mahdoton tehoraja tai yhtenäinen aika tuottaa virheen. |
| L5 | Tehoprofiili 2; 0,5 säilyttää järjestyksensä myös pilkottaessa. |
| L6 | −4 snt/kWh, 2 kW / 30 min, siirto 3, vero 2 ja marginaali 0,5: muuttuva kokonaiskulu 0,015 €, perusmaksu 8 €/kk erikseen. |
| L7 | Ennustetta ei käytetä ilman nimenomaista valintaa; toistuvaa ennusteen jatkamista ei sallita. |
| L8 | Toisen tilin suunnitelmat eivät näy eikä niitä voi poistaa omalta tililtä. Tallennus säilyy uudelleenavaamisen yli. |
| L9 | Hakuvirhe on näkyvä; julkaistu nykyhinta ja kokeellinen ennuste erottuvat. Verkkohaku kokeillaan käyttäjän koneella. |
| L10 | Simulaation ajassa laitteen tilat vastaavat aikataulua. Virheellinen CSV poistaa aiemman tuloksen. Mobiilissa sivu ei levene kuvaajan mukana. |

Toteutuneet kokeet ja suorittamatta jääneet osat löytyvät [testausraportista](TESTAUS.md). Tekoäly toteutti V2:n koodin ja testit pyynnöstäni. Oma ja Aatun katselmointi sekä Windows/Edge-kokeilu ovat vielä edessä.

Tekniset lähteet: [SciPy milp](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.milp.html), [hintapalvelun dokumentaatio](https://porssisahko.net/api). Rajapinnan vastausmuoto ja hintayksikkö tarkistettiin 18.11.2026. Verkkopalvelun käyttö tässä ympäristössä estyi HTTP 403 -vastaukseen, joten elävää hintahakua ei ole vahvistettu toimivaksi.
