"use strict";

// Riippuvuudeton laskentaydin: sama koodi selaimessa ja Node.js-testeissä.
const MultiOptimizer = (() => {
  const SLOT_MS = 15 * 60 * 1000;
  const MAX_SLOTS = 384;
  const MAX_DEVICES = 4;
  const MAX_BYTES = 1000000;
  const COST_DIVISOR = 400000000000; // hinta * 10^6, teho * 1000, vartti / 100 snt.

  function fixed(value, digits, label, maximum, allowZero = false, signed = false) {
    if (typeof value !== "string" && typeof value !== "number") throw new Error(`${label}: anna numero.`);
    const text = String(value).trim().replace(",", ".");
    const pattern = signed ? /^[+-]?\d+(?:\.\d+)?$/ : /^\+?\d+(?:\.\d+)?$/;
    if (!pattern.test(text)) throw new Error(`${label}: anna kelvollinen luku.`);
    const number = Number(text);
    if (!Number.isFinite(number) || Math.abs(number) > maximum || (!signed && (number < 0 || (!allowZero && number === 0)))) {
      throw new Error(`${label}: ${signed ? "itseisarvon" : "arvon"} pitää olla ${allowZero || signed ? "0" : "yli 0"}–${maximum}.`);
    }
    const negative = text.startsWith("-");
    const [whole, fraction = ""] = text.replace(/^[+-]/, "").split(".");
    if (fraction.length > digits) throw new Error(`${label}: enintään ${digits} desimaalia.`);
    const scaled = BigInt(whole + fraction.padEnd(digits, "0"));
    return negative ? -scaled : scaled;
  }

  function parseTime(text, line) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text);
    if (!match) throw new Error(`Rivi ${line}: ajan pitää olla YYYY-MM-DDTHH:mm.`);
    const [, year, month, day, hour, minute] = match.map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, 0, 0);
    if (year < 1 || year > 9998 || minute % 15 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute) {
      throw new Error(`Rivi ${line}: tarvitaan kelvollinen vartin alkuaika (vuodet 0001–9998).`);
    }
    return date.getTime();
  }

  function parseCsv(text, intervalMinutes = 60) {
    if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("Tiedoston enimmäiskoko on 1 Mt.");
    if (![15, 60].includes(intervalMinutes)) throw new Error("Valitse hintajaksoksi 15 tai 60 minuuttia.");
    const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
    if (lines[0]?.trim() !== "aika;hinta_snt_kwh") throw new Error("Tiedoston otsikon pitää olla aika;hinta_snt_kwh.");
    if (lines.length < 2) throw new Error("Tiedostossa ei ole hintarivejä.");
    if ((lines.length - 1) * intervalMinutes / 15 > MAX_SLOTS) throw new Error(`Aineiston enimmäispituus on 96 tuntia (${MAX_SLOTS} varttia).`);
    const rows = [];
    let previous;
    lines.slice(1).forEach((line, index) => {
      const cells = line.split(";").map(cell => cell.trim());
      const n = index + 2;
      if (cells.length !== 2) throw new Error(`Rivi ${n}: tarvitaan aika ja hinta puolipisteellä erotettuina.`);
      const time = parseTime(cells[0], n);
      if (intervalMinutes === 60 && new Date(time).getUTCMinutes() !== 0) throw new Error(`Rivi ${n}: tuntihinnan pitää alkaa tasatunnilta.`);
      if (previous !== undefined && time - previous !== intervalMinutes * 60000) throw new Error(`Rivi ${n}: hintajaksojen pitää olla peräkkäisiä ja aikajärjestyksessä. Tarkista myös valittu 15/60 minuutin hintajakso.`);
      if (!/^[+-]?\d+(?:\.\d+)?$/.test(cells[1])) throw new Error(`Rivi ${n}: hinnan desimaalierotin on piste.`);
      fixed(cells[1], 6, `Rivin ${n} hinta`, 100000, true, true);
      for (let i = 0; i < intervalMinutes / 15; i++) rows.push({time: time + i * SLOT_MS, price: cells[1]});
      previous = time;
    });
    return rows;
  }

  function normalize(rows, rawDevices, capacityText) {
    if (!Array.isArray(rows) || !rows.length || rows.length > MAX_SLOTS) throw new Error("Lataa ensin kelvollinen hintatiedosto (enintään 96 tuntia).");
    let previous;
    const prices = rows.map(row => {
      if (!Number.isSafeInteger(row.time) || !Number.isFinite(new Date(row.time).getTime()) || row.time % SLOT_MS || (previous !== undefined && row.time - previous !== SLOT_MS)) throw new Error("Aineistossa pitää olla peräkkäiset vartit.");
      previous = row.time;
      return fixed(row.price, 6, "Hinta", 100000, true, true);
    });
    if (!Array.isArray(rawDevices) || !rawDevices.length || rawDevices.length > MAX_DEVICES) throw new Error(`Lisää 1–${MAX_DEVICES} laitetta.`);
    const capacity = Number(fixed(capacityText, 3, "Yhteinen tehoraja (kW)", 1000));
    const devices = rawDevices.map((raw, index) => {
      if (!raw || typeof raw !== "object") throw new Error("Laitteen tiedot puuttuvat.");
      const name = String(raw.name ?? `Laite ${index + 1}`).trim();
      if (!name || name.length > 60) throw new Error("Laitteen nimen pituus on 1–60 merkkiä.");
      const mode = raw.mode ?? "continuous";
      if (!["continuous", "split"].includes(mode)) throw new Error(`${name}: valitse yhtenäinen tai pilkottava käyttö.`);
      let profile;
      if (raw.profile !== undefined && raw.profile !== null && raw.profile !== "") {
        const values = Array.isArray(raw.profile) ? raw.profile : String(raw.profile).split(";");
        if (!values.length || values.length > rows.length) throw new Error(`${name}: tehoprofiili ylittää aineiston pituuden.`);
        profile = values.map(value => Number(fixed(value, 3, `${name}: tehoprofiili (kW)`, 1000, true)));
        if (!profile.some(value => value > 0)) throw new Error(`${name}: tehoprofiilin pitää sisältää positiivinen teho.`);
      } else {
        const power = Number(fixed(raw.power, 3, `${name}: teho (kW)`, 1000));
        const hours = fixed(raw.hours, 2, `${name}: käyttöaika (h)`, 96);
        if (hours % 25n !== 0n) throw new Error(`${name}: käyttöajan pitää olla 0,25 tunnin monikerta (15 minuuttia).`);
        const length = Number(hours / 25n);
        if (length > rows.length) throw new Error(`${name}: käyttöaika ylittää aineiston pituuden.`);
        profile = Array(length).fill(power);
      }
      if (Math.max(...profile) > capacity) throw new Error(`${name}: laitteen teho ylittää yhteisen tehorajan.`);
      return {name, mode, profile};
    });
    return {rows, prices, devices, capacity};
  }

  // Exact dynamic programming. A state contains completed profile steps for each device.
  // A continuous device with 0 < progress < length must run at the next slot.
  function* solve(prices, devices, capacity, limits) {
    const count = devices.length, n = prices.length;
    const lengths = devices.map(d => d.profile.length);
    const multipliers = [1];
    for (let i = 1; i < count; i++) multipliers[i] = multipliers[i - 1] * (lengths[i - 1] + 1);
    const finalKey = lengths.reduce((sum, length, i) => sum + length * multipliers[i], 0);
    let states = new Map([[0, {key: 0, progress: Array(count).fill(0), cost: 0n, tie: 0n, prev: null, mask: 0}]]);
    let transitions = 0, records = 0;
    const maxTransitions = limits.maxTransitions ?? 2000000;
    const maxRecords = limits.maxRecords ?? 400000;
    const maxStates = limits.maxStates ?? 60000;
    const tooLarge = () => new Error("Yhteislaskenta on liian laaja selaimelle. Lyhennä aineistoa tai käyttöaikoja, vähennä laitteita tai väljennä tehorajaa. Keskeneräistä tulosta ei näytetä halvimpana.");
    for (let t = 0; t < n; t++) {
      const next = new Map();
      for (const state of states.values()) {
        let required = 0, finished = 0;
        for (let d = 0; d < count; d++) {
          const q = state.progress[d], remaining = lengths[d] - q;
          if (!remaining) finished |= 1 << d;
          else if ((q > 0 && devices[d].mode === "continuous") || remaining === n - t) required |= 1 << d;
        }
        // Prefer using earlier slots when total costs tie, without perturbing prices.
        for (let mask = (1 << count) - 1; mask >= 0; mask--) {
          if ((mask & required) !== required || (mask & finished)) continue;
          if (++transitions > maxTransitions) throw tooLarge();
          if (transitions % 1000 === 0) yield {slot: t, slots: n, states: states.size};
          let power = 0, key = state.key, rank = 0;
          for (let d = 0; d < count; d++) if (mask & (1 << d)) {
            power += devices[d].profile[state.progress[d]];
            key += multipliers[d]; rank |= 1 << (count - d - 1);
          }
          if (power > capacity) continue;
          const progress = state.progress.map((q, d) => q + ((mask >> d) & 1));
          if (progress.some((q, d) => lengths[d] - q > n - t - 1)) continue;
          const cost = state.cost + prices[t] * BigInt(power);
          const old = next.get(key);
          if (old && cost > old.cost) continue;
          const tie = (state.tie << BigInt(count)) | BigInt(rank);
          if (old && cost === old.cost && tie <= old.tie) continue;
          next.set(key, {key, progress, cost, tie, prev: state, mask});
          if (++records > maxRecords || next.size > maxStates) throw tooLarge();
        }
      }
      if (!next.size) throw new Error("Laitteiden käyttö ei mahdu aineistoon yhteisellä tehorajalla. Pidennä aineistoa, lyhennä käyttöä tai nosta tehorajaa.");
      states = next;
      yield {slot: t + 1, slots: n, states: states.size};
    }
    let state = states.get(finalKey);
    if (!state) throw new Error("Yhteistä aikataulua ei löytynyt annetulla tehorajalla.");
    const schedules = devices.map(() => []);
    for (let t = n - 1; t >= 0; t--) {
      for (let d = 0; d < count; d++) if (state.mask & (1 << d)) schedules[d].push(t);
      state = state.prev;
    }
    return schedules.map(schedule => schedule.reverse());
  }

  function summarize(model, schedules) {
    const load = Array(model.rows.length).fill(0);
    let total = 0n, totalEnergy = 0;
    const devices = schedules.map((indices, d) => {
      const device = model.devices[d];
      if (indices.length !== device.profile.length) throw new Error("Aikataulun tarkistus epäonnistui.");
      let cost = 0n, energyUnits = 0;
      const slots = indices.map((index, q) => {
        if (q && (index <= indices[q - 1] || (device.mode === "continuous" && index !== indices[q - 1] + 1))) throw new Error("Aikataulun järjestys ei täsmää.");
        const power = device.profile[q];
        cost += model.prices[index] * BigInt(power); energyUnits += power; load[index] += power;
        return {index, time: model.rows[index].time, power: power / 1000};
      });
      const periods = [];
      slots.forEach(slot => {
        const last = periods.at(-1);
        if (last && last.end === slot.time) last.end += SLOT_MS;
        else periods.push({start: slot.time, end: slot.time + SLOT_MS});
      });
      total += cost; totalEnergy += energyUnits;
      return {name: device.name, mode: device.mode, slots, periods, cost: Number(cost) / COST_DIVISOR,
        energy: energyUnits / 4000, hours: slots.length / 4, start: slots[0].time, end: slots.at(-1).time + SLOT_MS};
    });
    if (load.some(power => power > model.capacity)) throw new Error("Aikataulu ylittää tehorajan; tulosta ei käytetä.");
    return {devices, cost: Number(total) / COST_DIVISOR, energy: totalEnergy / 4000,
      load: load.map(power => power / 1000), peak: Math.max(...load) / 1000, capacity: model.capacity / 1000, optimal: true};
  }

  function* optimizeSteps(rows, devices, capacity, limits = {}) {
    const model = normalize(rows, devices, capacity);
    // If every device could run at its own maximum simultaneously, independent minima
    // are also the exact joint minimum. This avoids exponential state growth.
    const maximumSum = model.devices.reduce((sum, d) => sum + Math.max(...d.profile), 0);
    let schedules;
    if (maximumSum <= model.capacity && model.devices.length > 1) {
      schedules = [];
      for (const device of model.devices) {
        const solved = yield* solve(model.prices, [device], model.capacity, limits);
        schedules.push(solved[0]);
      }
    } else schedules = yield* solve(model.prices, model.devices, model.capacity, limits);
    return summarize(model, schedules);
  }

  function optimize(rows, devices, capacity, limits = {}) {
    const iterator = optimizeSteps(rows, devices, capacity, limits);
    let step;
    do { step = iterator.next(); } while (!step.done);
    return step.value;
  }

  async function optimizeAsync(rows, devices, capacity, options = {}) {
    const iterator = optimizeSteps(rows, devices, capacity, options.limits);
    while (true) {
      if (options.cancelled?.()) { const error = new Error("Laskenta peruttiin."); error.name = "AbortError"; throw error; }
      const step = iterator.next();
      if (step.done) return step.value;
      options.onProgress?.(step.value);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  function formatTime(time) {
    const date = new Date(time), pad = value => String(value).padStart(2, "0");
    return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${String(date.getUTCFullYear()).padStart(4,"0")} klo ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  }
  return {parseCsv, normalize, optimize, optimizeAsync, formatTime, SLOT_MS, MAX_SLOTS, MAX_DEVICES, MAX_BYTES};
})();
if (typeof module !== "undefined" && module.exports) module.exports = MultiOptimizer;
