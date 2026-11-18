"""Varttiaineisto, yhteisoptimointi ja kustannukset. Ei laiteohjausta."""
import csv
import io
import math
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_matrix

UTC = timezone.utc
HELSINKI = ZoneInfo("Europe/Helsinki")
STEP = timedelta(minutes=15)
MAX_SLOTS = 384


def number(value, label, low=0, high=100000):
    try:
        if isinstance(value, bool):
            raise ValueError()
        result = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        raise ValueError(f"{label}: anna numero.") from None
    if not math.isfinite(result) or not low <= result <= high:
        raise ValueError(f"{label}: sallitut arvot {low}–{high}.")
    return result


def integer(value, label, low, high):
    result = number(value, label, low, high)
    if result != int(result):
        raise ValueError(f"{label}: anna kokonaisluku.")
    return int(result)


def parse_time(value):
    if not isinstance(value, str):
        raise ValueError("Aikaleiman pitää olla tekstiä.")
    try:
        time = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if time.tzinfo is None:
            # Reject both ambiguous and nonexistent local times. Explicit offsets resolve DST.
            first = time.replace(tzinfo=HELSINKI, fold=0)
            second = time.replace(tzinfo=HELSINKI, fold=1)
            if first.utcoffset() != second.utcoffset():
                raise ValueError()
            time = first
        result = time.astimezone(UTC)
        if result.minute % 15 or result.second or result.microsecond:
            raise ValueError()
        return result
    except (ValueError, OverflowError):
        raise ValueError("Anna vartin alku ISO-muodossa. Kellonsiirron aikaan tarvitaan +02:00 tai +03:00.") from None


def iso(time):
    return time.astimezone(UTC).isoformat().replace("+00:00", "Z")


def validate_rows(rows):
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_SLOTS:
        raise ValueError(f"Aineistossa pitää olla 1–{MAX_SLOTS} varttia.")
    clean = []
    previous = None
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Hintarivi ei ole kelvollinen.")
        time = parse_time(row.get("time"))
        if previous is not None and time != previous + STEP:
            raise ValueError("Hintojen pitää olla peräkkäisiä vartteja ilman aukkoja tai toistoja.")
        price = number(row.get("price"), "Hinta snt/kWh", -100000, 100000)
        kind = row.get("kind", "csv")
        if kind not in ("csv", "published", "forecast", "demo"):
            raise ValueError("Tuntematon hintatyyppi.")
        clean.append({"time": iso(time), "price": price, "kind": kind})
        previous = time
    return clean


def parse_csv(text, interval):
    if not isinstance(text, str) or len(text.encode("utf-8")) > 1000000:
        raise ValueError("CSV-tiedoston enimmäiskoko on 1 Mt.")
    interval = integer(interval, "Hintajakso", 15, 60)
    if interval not in (15, 60):
        raise ValueError("Hintajakso on 15 tai 60 minuuttia.")
    reader = csv.reader(io.StringIO(text.lstrip("\ufeff").strip()), delimiter=";")
    if next(reader, None) != ["aika", "hinta_snt_kwh"]:
        raise ValueError("CSV-otsikon pitää olla aika;hinta_snt_kwh.")
    rows = []
    previous = None
    for line in reader:
        if len(line) != 2:
            raise ValueError("Jokaisella CSV-rivillä pitää olla aika ja hinta.")
        time = parse_time(line[0].strip())
        if interval == 60 and time.minute:
            raise ValueError("Tuntihinnan pitää alkaa tasatunnilta.")
        if previous is not None and time != previous + timedelta(minutes=interval):
            raise ValueError("CSV:n hintajaksoissa on aukko, toisto tai väärä järjestys.")
        price = number(line[1].strip(), "Hinta", -100000, 100000)
        rows.extend({"time": iso(time + i * STEP), "price": price, "kind": "csv"} for i in range(interval // 15))
        if len(rows) > MAX_SLOTS:
            raise ValueError(f"Enintään {MAX_SLOTS} varttia eli 96 tuntia.")
        previous = time
    return validate_rows(rows)


def forecast(rows):
    rows = validate_rows(rows)
    if len(rows) < 96 or len(rows) + 96 > MAX_SLOTS:
        raise ValueError("Ennuste tarvitsee vähintään 24 tuntia; kokonaisaineisto saa olla enintään 96 tuntia.")
    if any(r["kind"] == "forecast" for r in rows):
        raise ValueError("Ennustetta ei jatketa ennusteesta. Lataa alkuperäiset hinnat uudelleen.")
    start = parse_time(rows[-1]["time"]) + STEP
    extra = [{"time": iso(start + i * STEP), "price": r["price"], "kind": "forecast"} for i, r in enumerate(rows[-96:])]
    return rows + extra


def normalize(payload):
    if not isinstance(payload, dict):
        raise ValueError("Suunnitelman pitää olla JSON-olio.")
    rows = validate_rows(payload.get("rows"))
    n = len(rows)
    raw_devices = payload.get("devices")
    if not isinstance(raw_devices, list) or not 1 <= len(raw_devices) <= 6:
        raise ValueError("Lisää 1–6 laitetta.")
    devices = []
    for raw in raw_devices:
        if not isinstance(raw, dict):
            raise ValueError("Laitteen tiedot eivät ole kelvolliset.")
        name = str(raw.get("name", "")).strip()
        if not name or len(name) > 60:
            raise ValueError("Laitteen nimen pituus on 1–60 merkkiä.")
        profile = raw.get("profile")
        if profile is not None:
            if not isinstance(profile, list) or not 1 <= len(profile) <= n:
                raise ValueError("Tehoprofiilissa pitää olla 1–aineiston varttimäärä arvoa.")
            profile = [number(p, "Tehoprofiili kW", 0, 1000) for p in profile]
            if not any(profile):
                raise ValueError("Tehoprofiilin pitää kuluttaa energiaa.")
        else:
            power = number(raw.get("power"), "Teho kW", 0.001, 1000)
            minutes = integer(raw.get("minutes"), "Käyttöaika minuuttia", 15, n * 15)
            if minutes % 15:
                raise ValueError("Käyttöajan pitää olla 15 minuutin monikerta.")
            profile = [power] * (minutes // 15)
        mode = raw.get("mode", "continuous")
        if mode not in ("continuous", "split"):
            raise ValueError("Tuntematon käyttötapa.")
        windows = raw.get("windows", [[0, n]])
        if not isinstance(windows, list) or not 1 <= len(windows) <= 12:
            raise ValueError("Laitteelle tarvitaan 1–12 käyttöikkunaa.")
        allowed = set()
        checked = []
        for window in windows:
            if not isinstance(window, list) or len(window) != 2:
                raise ValueError("Käyttöikkunasta puuttuu alku tai loppu.")
            a = integer(window[0], "Ikkunan alku", 0, n - 1)
            b = integer(window[1], "Ikkunan loppu", a + 1, n)
            checked.append([a, b])
            allowed.update(range(a, b))
        allow_forecast = payload.get("allowForecast") is True
        allowed = {t for t in allowed if allow_forecast or rows[t]["kind"] != "forecast"}
        if len(allowed) < len(profile):
            raise ValueError(f"{name}: sallittuja vartteja ei ole tarpeeksi. Tarkista käyttöikkuna ja ennusteen salliminen.")
        devices.append({"name": name, "profile": profile, "mode": mode, "windows": checked, "allowed": sorted(allowed)})
    raw_tariffs = payload.get("tariffs", {})
    if not isinstance(raw_tariffs, dict):
        raise ValueError("Kulut eivät ole kelvolliset.")
    tariffs = {key: number(raw_tariffs.get(key, 0), label, 0, 10000) for key, label in
               (("transfer", "Siirto snt/kWh"), ("tax", "Sähkövero snt/kWh"), ("margin", "Marginaali snt/kWh"), ("fixed", "Perusmaksut €/kk"))}
    return {"rows": rows, "devices": devices, "tariffs": tariffs,
            "capacity": number(payload.get("capacity"), "Yhteinen tehoraja kW", 0.001, 1000),
            "allowForecast": payload.get("allowForecast") is True}


def optimize(payload, time_limit=12):
    model = normalize(payload)
    rows, devices, tariffs = model["rows"], model["devices"], model["tariffs"]
    n = len(rows)
    rates = [r["price"] + tariffs["transfer"] + tariffs["tax"] + tariffs["margin"] for r in rows]
    columns, costs = [], []
    constraints, lower, upper = [], [], []

    def constraint(entries, lo, hi):
        constraints.append(entries)
        lower.append(lo)
        upper.append(hi)

    def variable(device, steps):
        if len(columns) >= 40000:
            raise ValueError("Tehoprofiilit ovat liian pitkiä. Lyhennä aineistoa tai käyttöaikoja.")
        index = len(columns)
        columns.append((device, steps))
        costs.append(sum(rates[t] * power / 400 for t, power in steps))
        return index

    for d, device in enumerate(devices):
        profile = device["profile"]
        allowed = set(device["allowed"])
        if device["mode"] == "continuous":
            candidates = []
            for start in sorted(allowed):
                if all(start + q in allowed for q in range(len(profile))):
                    candidates.append(variable(d, [(start + q, p) for q, p in enumerate(profile)]))
            if not candidates:
                raise ValueError(f"{device['name']}: yhtenäinen jakso ei mahdu käyttöikkunoihin.")
            constraint({i: 1 for i in candidates}, 1, 1)
        elif len(set(profile)) == 1:
            candidates = [variable(d, [(t, profile[0])]) for t in sorted(allowed)]
            constraint({i: 1 for i in candidates}, len(profile), len(profile))
        else:
            # One placement for each profile step, with strictly increasing time indices.
            stages = []
            for q, power in enumerate(profile):
                candidates = {t: variable(d, [(t, power)]) for t in sorted(allowed)
                              if q <= t <= n - len(profile) + q}
                constraint({i: 1 for i in candidates.values()}, 1, 1)
                stages.append(candidates)
            for a, b in zip(stages, stages[1:]):
                entries = {i: t for t, i in a.items()}
                entries.update({i: -t for t, i in b.items()})
                constraint(entries, -np.inf, -1)
    if len(columns) > 40000:
        raise ValueError("Tehoprofiilit ovat liian pitkiä. Lyhennä aineistoa tai käyttöaikoja.")
    loads = [{} for _ in rows]
    for i, (_, steps) in enumerate(columns):
        for t, power in steps:
            loads[t][i] = power
    for entries in loads:
        constraint(entries, 0, model["capacity"])
    r_indices, c_indices, values = [], [], []
    for r, entries in enumerate(constraints):
        for c, value in entries.items():
            r_indices.append(r)
            c_indices.append(c)
            values.append(value)
    matrix = coo_matrix((values, (r_indices, c_indices)), shape=(len(constraints), len(columns))).tocsc()
    result = milp(np.array(costs), integrality=np.ones(len(columns)), bounds=Bounds(0, 1),
                  constraints=LinearConstraint(matrix, lower, upper),
                  options={"time_limit": time_limit, "mip_rel_gap": 0.0})
    if result.x is None:
        if result.status == 2:
            raise ValueError("Laitteet eivät mahdu yhteiseen tehorajaan ja käyttöikkunoihin. Suurenna rajaa tai väljennä aikoja.")
        raise ValueError("Ratkaisua ei löytynyt aikarajassa. Lyhennä aineistoa tai vähennä laitteita.")
    selected = (result.x > 0.5).astype(float)
    actual = matrix @ selected
    if np.any(actual < np.array(lower) - 1e-6) or np.any(actual > np.array(upper) + 1e-6):
        raise ValueError("Ratkaisun tarkistus epäonnistui; aikataulua ei käytetä.")
    schedules = [dict() for _ in devices]
    for i, (d, steps) in enumerate(columns):
        if selected[i]:
            for t, power in steps:
                schedules[d][t] = power
    output, total_load = [], [0.0] * n
    total = {"spot": 0.0, "transfer": 0.0, "tax": 0.0, "margin": 0.0, "energy": 0.0}
    for device, schedule in zip(devices, schedules):
        energy = sum(schedule.values()) / 4
        parts = {"spot": sum(rows[t]["price"] * p / 400 for t, p in schedule.items()),
                 **{key: energy * tariffs[key] / 100 for key in ("transfer", "tax", "margin")}}
        for key in parts:
            total[key] += parts[key]
        total["energy"] += energy
        for t, p in schedule.items():
            total_load[t] += p
        output.append({"name": device["name"], "energy": energy, "cost": sum(parts.values()), "parts": parts,
                       "slots": [{"index": t, "time": rows[t]["time"], "power": p, "kind": rows[t]["kind"]} for t, p in sorted(schedule.items())]})
    total["variable"] = sum(total[key] for key in ("spot", "transfer", "tax", "margin"))
    # Fixed fees are monthly. Never silently add an entire month's fee to one device run.
    total["fixedMonthly"] = tariffs["fixed"]
    return {"devices": output, "totals": total, "load": total_load,
            "optimal": bool(result.success), "gap": float(result.mip_gap) if result.mip_gap is not None and math.isfinite(result.mip_gap) else None,
            "forecastUsed": any(s["kind"] == "forecast" for d in output for s in d["slots"]), "simulation": True}
