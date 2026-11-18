"use strict";

// Samat puhtaat laskentafunktiot toimivat selaimessa ja Node.js-testeissä.
const EnergyOptimizer = (() => {
  const HOUR = 3600000;
  const MAX_BYTES = 1000000;
  const MAX_ROWS = 10000;
  const decimal = /^[+-]?\d+(?:\.\d+)?$/;

  function parseTime(text, line) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):00$/.exec(text);
    if (!match) throw new Error(`Rivi ${line}: ajan muodon pitää olla YYYY-MM-DDTHH:00.`);
    const [, y, m, d, h] = match.map(Number);
    // UTC toimii vain kellonaikojen laskenta-akselina. Ei paikallisia aikavyöhykemuunnoksia.
    const date = new Date(0);
    date.setUTCFullYear(y, m - 1, d);
    date.setUTCHours(h, 0, 0, 0);
    if (y < 1 || y > 9998 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d || date.getUTCHours() !== h) {
      throw new Error(`Rivi ${line}: päivämäärä tai tunti ei ole kelvollinen (vuodet 0001–9998).`);
    }
    return date.getTime();
  }

  function parseCsv(text) {
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("Tiedosto on liian suuri. Enimmäiskoko on 1 Mt.");
    const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
    if (lines[0]?.trim() !== "aika;hinta_snt_kwh") throw new Error("Tiedoston otsikon pitää olla aika;hinta_snt_kwh.");
    if (lines.length < 2) throw new Error("Tiedostossa ei ole hintarivejä.");
    if (lines.length - 1 > MAX_ROWS) throw new Error("Tiedostossa saa olla enintään 10 000 tuntia.");
    let previous;
    return lines.slice(1).map((line, index) => {
      const n = index + 2;
      const cells = line.split(";").map(cell => cell.trim());
      if (cells.length !== 2) throw new Error(`Rivi ${n}: tarvitaan aika ja hinta puolipisteellä erotettuina.`);
      const time = parseTime(cells[0], n);
      const price = cells[1];
      if (!decimal.test(price) || !Number.isFinite(Number(price))) throw new Error(`Rivi ${n}: hinnan pitää olla äärellinen luku; käytä desimaalipistettä.`);
      if (previous !== undefined && time - previous !== HOUR) throw new Error(`Rivi ${n}: tuntien pitää olla peräkkäisiä ja aikajärjestyksessä, ilman päällekkäisiä tunteja.`);
      previous = time;
      return { time, price };
    });
  }

  function validateInputs(powerText, durationText, count) {
    const powerValue = String(powerText).trim().replace(",", ".");
    const durationValue = String(durationText).trim();
    const power = Number(powerValue);
    const duration = Number(durationValue);
    if (!decimal.test(powerValue) || !Number.isFinite(power) || power <= 0) throw new Error("Anna laitteen tehoksi positiivinen luku kilowatteina.");
    if (!/^\d+$/.test(durationValue) || !Number.isSafeInteger(duration) || duration <= 0) throw new Error("Anna käyttöajaksi positiivinen kokonaislukumäärä tunteja.");
    if (!count) throw new Error("Lataa ensin kelvollinen hintatiedosto.");
    if (duration > count) throw new Error(`Käyttöaika (${duration} h) ylittää aineiston pituuden (${count} h).`);
    return { power, duration };
  }

  function optimize(rows, powerText, durationText) {
    const { power, duration } = validateInputs(powerText, durationText, rows.length);
    // Hinnat muutetaan saman tarkkuuden kokonaisluvuiksi. Näin esimerkiksi
    // 0.1 + 0.2 ja 0.3 tunnistetaan aidosti yhtä suuriksi ennen pyöristystä.
    const scale = rows.reduce((max, row) => Math.max(max, (row.price.split(".")[1] || "").length), 0);
    const prices = rows.map(row => {
      const [whole, fraction = ""] = row.price.split(".");
      return BigInt(whole + fraction.padEnd(scale, "0"));
    });
    let sum = prices.slice(0, duration).reduce((a, b) => a + b, 0n);
    let bestSum = sum;
    let bestIndex = 0;
    // Liukuva summa: jokaisessa siirrossa yksi tunti poistuu ja yksi tulee tilalle.
    for (let i = duration; i < prices.length; i++) {
      sum += prices[i] - prices[i - duration];
      if (sum < bestSum) {
        bestSum = sum;
        bestIndex = i - duration + 1;
      }
    }
    const negative = bestSum < 0n;
    const digits = (negative ? -bestSum : bestSum).toString().padStart(scale + 1, "0");
    // Sentit euroiksi samalla desimaalisiirrolla; ei välituloksen ylivuotoa.
    const euroDigits = digits.padStart(scale + 3, "0");
    const euros = Number(`${negative ? "-" : ""}${euroDigits.slice(0, -scale - 2)}.${euroDigits.slice(-scale - 2)}`);
    const cost = euros * power;
    const energy = power * duration;
    if (!Number.isFinite(cost) || !Number.isFinite(energy)) throw new Error("Arvot ovat liian suuria kustannuksen tai energiankulutuksen laskentaan.");
    return { start: rows[bestIndex].time, end: rows[bestIndex + duration - 1].time + HOUR, cost, energy, power, duration };
  }

  function formatTime(time) {
    const date = new Date(time);
    const pad = n => String(n).padStart(2, "0");
    return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${String(date.getUTCFullYear()).padStart(4, "0")} klo ${pad(date.getUTCHours())}:00`;
  }
  return { parseCsv, validateInputs, optimize, formatTime, MAX_BYTES };
})();

if (typeof module !== "undefined" && module.exports) module.exports = EnergyOptimizer;

if (typeof document !== "undefined") {
  const get = id => document.getElementById(id);
  const form = get("optimizer");
  const fileInput = get("prices");
  const power = get("power");
  const duration = get("duration");
  let rows = [];
  let loadVersion = 0;
  const number = new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 6 });
  const currency = new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" });

  function svgElement(name, attributes = {}) {
    if (typeof document.createElementNS !== "function") return null;
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function drawChart(chartRows, result = null) {
    const chart = get("price-chart");
    const wrapper = get("chart-wrapper");
    const empty = get("chart-empty");
    if (!chart || typeof chart.replaceChildren !== "function") return;

    if (!chartRows.length) {
      chart.replaceChildren();
      wrapper.hidden = true;
      empty.hidden = false;
      return;
    }

    wrapper.hidden = false;
    empty.hidden = true;
    chart.replaceChildren();

    const prices = chartRows.map(row => Number(row.price));
    let minimum = Math.min(0, ...prices);
    let maximum = Math.max(0, ...prices);
    if (minimum === maximum) {
      minimum -= 1;
      maximum += 1;
    } else {
      const padding = (maximum - minimum) * 0.08;
      minimum -= padding;
      maximum += padding;
    }

    const width = 800;
    const height = 320;
    const left = 54;
    const right = 16;
    const top = 18;
    const bottom = 46;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const x = index => left + (index + 0.5) * plotWidth / chartRows.length;
    const y = price => top + (maximum - price) * plotHeight / (maximum - minimum);
    const bandWidth = plotWidth / chartRows.length;
    const barWidth = Math.max(1, Math.min(18, bandWidth * 0.72));

    const zeroY = y(0);
    for (let i = 0; i <= 4; i++) {
      const value = maximum - (maximum - minimum) * i / 4;
      const gridY = y(value);
      const grid = svgElement("line", {x1:left, y1:gridY, x2:width-right, y2:gridY, class:"chart-grid"});
      const label = svgElement("text", {x:left-8, y:gridY+4, "text-anchor":"end", class:"chart-axis-label"});
      if (grid) chart.appendChild(grid);
      if (label) {
        label.textContent = `${number.format(value)} `;
        chart.appendChild(label);
      }
    }

    const zeroLine = svgElement("line", {x1:left, y1:zeroY, x2:width-right, y2:zeroY, class:"chart-zero"});
    if (zeroLine) chart.appendChild(zeroLine);

    let selectedStart = -1;
    let selectedEnd = -1;
    if (result) {
      selectedStart = chartRows.findIndex(row => row.time === result.start);
      selectedEnd = selectedStart >= 0 ? selectedStart + result.duration - 1 : -1;
    }

    prices.forEach((price, index) => {
      const barTop = price >= 0 ? y(price) : zeroY;
      const barBottom = price >= 0 ? zeroY : y(price);
      const selected = index >= selectedStart && index <= selectedEnd;
      const rect = svgElement("rect", {
        x:x(index)-barWidth/2,
        y:barTop,
        width:barWidth,
        height:Math.max(1, barBottom-barTop),
        rx:Math.min(3, barWidth/4),
        class:`chart-bar${selected ? " selected" : ""}`
      });
      if (!rect) return;
      const title = svgElement("title");
      if (title) {
        title.textContent = `${formatChartTime(chartRows[index].time)}: ${number.format(price)} snt/kWh${selected ? " — valittu jakso" : ""}`;
        rect.appendChild(title);
      }
      chart.appendChild(rect);
    });

    const labelIndexes = chartRows.length <= 8
      ? chartRows.map((_, index) => index)
      : [0, Math.floor((chartRows.length-1)/2), chartRows.length-1];
    labelIndexes.forEach(index => {
      const label = svgElement("text", {
        x:x(index),
        y:height-18,
        "text-anchor":"middle",
        class:"chart-axis-label"
      });
      if (label) {
        label.textContent = formatChartTime(chartRows[index].time);
        chart.appendChild(label);
      }
    });

    const unit = svgElement("text", {x:left, y:10, class:"chart-axis-label"});
    if (unit) {
      unit.textContent = "snt/kWh";
      chart.appendChild(unit);
    }
  }

  function formatChartTime(time) {
    const date = new Date(time);
    const pad = value => String(value).padStart(2, "0");
    return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth()+1)}. ${pad(date.getUTCHours())}:00`;
  }

  function clearResult() {
    get("result").hidden = true;
    get("empty-result").hidden = false;
    get("error").hidden = true;
    get("error").textContent = "";
    drawChart(rows);
  }
  function showError(message) {
    get("error").textContent = message;
    get("error").hidden = false;
  }
  [power, duration].forEach(input => input.addEventListener("input", clearResult));

  fileInput.addEventListener("change", async () => {
    const version = ++loadVersion;
    rows = [];
    clearResult();
    get("calculate").disabled = true;
    const file = fileInput.files[0];
    if (!file) {
      get("file-status").textContent = "Hintatiedostoa ei ole vielä ladattu.";
      return;
    }
    get("file-status").textContent = "Luetaan hintatiedostoa…";
    try {
      if (file.size > EnergyOptimizer.MAX_BYTES) throw new Error("Tiedosto on liian suuri. Enimmäiskoko on 1 Mt.");
      const text = await file.text();
      // Hitaasti valmistuva aiempi lataus ei saa korvata uudempaa valintaa.
      if (version !== loadVersion) return;
      rows = EnergyOptimizer.parseCsv(text);
      get("file-status").textContent = `${file.name}: ladattu ${rows.length} tuntia.`;
      get("calculate").disabled = false;
      drawChart(rows);
    } catch (error) {
      if (version !== loadVersion) return;
      rows = [];
      get("file-status").textContent = "Hintatiedostoa ei hyväksytty.";
      showError(error.message || "Tiedoston lukeminen epäonnistui.");
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    clearResult();
    try {
      const result = EnergyOptimizer.optimize(rows, power.value, duration.value);
      get("start").textContent = EnergyOptimizer.formatTime(result.start);
      get("end").textContent = EnergyOptimizer.formatTime(result.end);
      get("cost").textContent = currency.format(result.cost);
      get("energy").textContent = `${number.format(result.energy)} kWh`;
      get("result-power").textContent = `${number.format(result.power)} kW`;
      get("result-duration").textContent = `${result.duration} h`;
      get("empty-result").hidden = true;
      get("result").hidden = false;
      drawChart(rows, result);
    } catch (error) {
      showError(error.message);
    }
  });
}
