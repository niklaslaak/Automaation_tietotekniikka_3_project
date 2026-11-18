import itertools
import random
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core import forecast, iso, normalize, optimize, parse_csv, parse_time, validate_rows
from server import provider_rows


def rows(prices):
    start = datetime(2026, 11, 4, tzinfo=timezone.utc)
    return [{"time": iso(start + timedelta(minutes=15*i)), "price": p, "kind": "csv"} for i, p in enumerate(prices)]


def device(name="A", power=1, minutes=30, **extra):
    return dict(name=name, power=power, minutes=minutes, **extra)


def run(prices, devices=None, capacity=3, **extra):
    return optimize(dict(rows=rows(prices), devices=devices or [device()], capacity=capacity, **extra))


class OptimizerTests(unittest.TestCase):
    def test_original_example_and_hour_expansion(self):
        text = (Path(__file__).resolve().parents[2] / "data/esimerkkihinnat.csv").read_text()
        data = parse_csv(text, 60)
        self.assertEqual(len(data), 16)
        result = optimize(dict(rows=data,devices=[device(minutes=120)],capacity=3))
        self.assertAlmostEqual(result["totals"]["variable"], .08)
        self.assertEqual(result["devices"][0]["slots"][0]["index"], 4)

    def test_split_skips_expensive_quarter(self):
        r = run([1, 20, 2, 30], [device(mode="split")])
        self.assertEqual([s["index"] for s in r["devices"][0]["slots"]], [0, 2])
        self.assertAlmostEqual(r["totals"]["variable"], .0075)

    def test_joint_schedule_capacity(self):
        r = run([1, 2, 10, 20], [device("A"), device("B")], capacity=1)
        self.assertEqual(r["load"], [1, 1, 1, 1])
        self.assertTrue(r["optimal"])

    def test_joint_solver_matches_exhaustive_reference(self):
        rng = random.Random(42)
        for _ in range(12):
            prices = [rng.randint(-10, 20) for _ in range(6)]
            best = float("inf")
            for a in range(5):
                for b in itertools.combinations(range(6), 2):
                    load = [int(t in (a, a+1))*2 + int(t in b) for t in range(6)]
                    if max(load) <= 2:
                        best = min(best, sum(p*l/400 for p,l in zip(prices,load)))
            result = run(prices,[device("A",power=2),device("B",mode="split")],capacity=2)
            self.assertAlmostEqual(result["totals"]["variable"],best)

    def test_continuous_variable_profile(self):
        r = run([10, 1, 30], [device(profile=[2, .5])])
        self.assertEqual([s["index"] for s in r["devices"][0]["slots"]],[1,2])
        self.assertAlmostEqual(r["totals"]["variable"],17/400)

    def test_split_profile_preserves_order(self):
        r = run([2, 50, 1], [device(profile=[2, .5],mode="split")])
        self.assertEqual([(s["index"],s["power"]) for s in r["devices"][0]["slots"]],[(0,2),(2,.5)])

    def test_disjoint_windows_and_infeasible_continuous(self):
        d = device(windows=[[0,1],[3,4]],mode="split")
        self.assertEqual([s["index"] for s in run([1,-10,-10,2],[d])["devices"][0]["slots"]],[0,3])
        d["mode"]="continuous"
        with self.assertRaisesRegex(ValueError,"yhtenäinen"):
            run([1,-10,-10,2],[d])

    def test_infeasible_capacity(self):
        with self.assertRaisesRegex(ValueError,"tehorajaan"):
            run([1,2],[device(power=3)],capacity=2)

    def test_cost_components_and_monthly_fee(self):
        r = run([-4,-4],[device(power=2)],tariffs=dict(transfer=3,tax=2,margin=.5,fixed=8))
        self.assertAlmostEqual(r["totals"]["energy"],1)
        self.assertAlmostEqual(r["totals"]["variable"],.015)
        self.assertEqual(r["totals"]["fixedMonthly"],8)
        self.assertAlmostEqual(r["totals"]["spot"],-.04)

    def test_forecast_explicit_opt_in(self):
        data=rows([10,10]);data[1]["kind"]="forecast";data[1]["price"]=-100
        payload=dict(rows=data,devices=[device(minutes=15)],capacity=1)
        self.assertFalse(optimize(payload)["forecastUsed"])
        payload["allowForecast"]=True
        self.assertTrue(optimize(payload)["forecastUsed"])

    def test_forecast_baseline_and_recursion(self):
        data=rows(list(range(96))); extended=forecast(data)
        self.assertEqual(len(extended),192)
        self.assertEqual([r["price"] for r in extended[96:]],list(range(96)))
        self.assertTrue(all(r["kind"]=="forecast" for r in extended[96:]))
        with self.assertRaises(ValueError): forecast(extended)
        with self.assertRaises(ValueError): forecast(rows([1,2]))

    def test_dst_explicit_offsets_and_naive_rejection(self):
        a=parse_time("2026-10-25T03:00:00+03:00")
        b=parse_time("2026-10-25T03:00:00+02:00")
        self.assertEqual((b-a).total_seconds(),3600)
        for value in ["2026-10-25T03:00", "2026-03-29T03:00", "2026-11-18T10:01"]:
            with self.assertRaises(ValueError): parse_time(value)

    def test_invalid_prices_and_data(self):
        for price in [float("nan"),float("inf"),True,"bad",100001]:
            with self.assertRaises(ValueError): validate_rows(rows([price]))
        with self.assertRaises(ValueError): validate_rows(rows([1])*2)
        with self.assertRaises(ValueError): validate_rows(rows([1]*385))
        with self.assertRaises(ValueError): parse_csv("aika;hinta_snt_kwh\n2026-11-18T12:00;1\n2026-11-18T12:30;2",15)

    def test_invalid_devices(self):
        for d in [device(minutes=20),device(power=0),device(windows=[[2,1]]),device(profile=[0,0]),device(profile=[float('nan')])]:
            with self.assertRaises(ValueError): run([1,2,3,4],[d])

    def test_provider_inclusive_end_and_sorting(self):
        response={"prices":[{"startDate":"2026-11-18T10:15:00.000Z","endDate":"2026-11-18T10:29:59.999Z","price":2},
                            {"startDate":"2026-11-18T10:00:00.000Z","endDate":"2026-11-18T10:15:00.000Z","price":-1}]}
        self.assertEqual([r["price"] for r in provider_rows(response)],[-1,2])
        response["prices"][0]["endDate"]="2026-11-18T11:15:00Z"
        with self.assertRaises(ValueError): provider_rows(response)


if __name__ == "__main__":
    unittest.main()
