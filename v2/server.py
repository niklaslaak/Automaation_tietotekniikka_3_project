"""Local-only HTTP service. Start: python v2/server.py"""
import hashlib
import hmac
import json
import mimetypes
import secrets
import sqlite3
import threading
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from core import forecast, iso, normalize, optimize, parse_csv, parse_time, validate_rows

ROOT = Path(__file__).resolve().parent
PRICE_URL = "https://api.porssisahko.net/v2/latest-prices.json"


class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT UNIQUE, salt TEXT, hash TEXT);
                CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER, expires REAL);
                CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, payload TEXT, created TEXT);
            """)

    def connect(self):
        return sqlite3.connect(self.path, timeout=15)

    def register(self, name, password):
        name, password = credentials(name, password)
        salt = secrets.token_hex(16)
        digest = password_hash(password, salt)
        try:
            with self.connect() as db:
                db.execute("INSERT INTO users(name,salt,hash) VALUES(?,?,?)", (name, salt, digest))
        except sqlite3.IntegrityError:
            raise ValueError("Käyttäjänimi on jo käytössä.") from None

    def login(self, name, password):
        name, password = credentials(name, password)
        with self.connect() as db:
            row = db.execute("SELECT id,salt,hash FROM users WHERE name=?", (name,)).fetchone()
            digest = password_hash(password, row[1] if row else "0" * 32)
            if row is None or not hmac.compare_digest(digest, row[2]):
                raise ValueError("Käyttäjänimi tai salasana on väärä.")
            token = secrets.token_urlsafe(32)
            db.execute("DELETE FROM sessions WHERE expires < ?", (time.time(),))
            db.execute("INSERT INTO sessions VALUES(?,?,?)", (hashlib.sha256(token.encode()).hexdigest(), row[0], time.time() + 28800))
            return token

    def user(self, token):
        with self.connect() as db:
            return db.execute("SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?",
                              (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()


def credentials(name, password):
    if not isinstance(name, str) or not 3 <= len(name.strip()) <= 40:
        raise ValueError("Käyttäjänimi: 3–40 merkkiä.")
    if not isinstance(password, str) or not 10 <= len(password) <= 128:
        raise ValueError("Salasana: 10–128 merkkiä.")
    return name.strip().casefold(), password


def password_hash(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600000).hex()


class PriceCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.cached = None
        self.updated = 0

    def get(self):
        with self.lock:
            if self.cached and time.time() - self.updated < 900:
                return self.cached
            request = urllib.request.Request(PRICE_URL, headers={"User-Agent": "Automaation-tietotekniikka-course-project/2.0"})
            try:
                with urllib.request.urlopen(request, timeout=10) as response:
                    data = response.read(1000001)
                if len(data) > 1000000:
                    raise ValueError()
                self.cached = {"rows": provider_rows(json.loads(data)), "source": PRICE_URL,
                               "updated": iso(datetime.now(timezone.utc)), "vatIncluded": True}
            except Exception:
                # Never substitute synthetic data or silently use stale prices on provider errors.
                raise ValueError("Verkkohintojen haku epäonnistui. Tarkista verkkoyhteys tai tuo CSV. Vanhaa aineistoa ei korvattu.") from None
            self.updated = time.time()
            return self.cached


def provider_rows(data):
    raw = data.get("prices") if isinstance(data, dict) else None
    if not isinstance(raw, list) or not raw:
        raise ValueError("Hintapalvelun vastaus ei sisällä hintoja.")
    rows = []
    for item in raw:
        start = parse_time(item["startDate"])
        end = datetime.fromisoformat(item["endDate"].replace("Z", "+00:00"))
        # API endDate may be inclusive (...14:59.999) or the exclusive next boundary.
        seconds = (end - start).total_seconds()
        if abs(seconds - 900) > .01:
            raise ValueError("Hintapalvelun jakso ei ole 15 minuuttia.")
        rows.append({"time": iso(start), "price": item["price"], "kind": "published"})
    return validate_rows(sorted(rows, key=lambda r: r["time"]))


def demo_rows():
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    pattern = [6, 5, 4, 3, 2, 4, 8, 12, 15, 10, 8, 6, 5, -2, -1, 3, 8, 16, 20, 13, 9, 7, 6, 5]
    return [{"time": iso(start + timedelta(minutes=15*i)), "price": pattern[(i//4) % 24], "kind": "demo"} for i in range(192)]


def create_server(port=8765, db_path=None):
    store = Store(db_path or ROOT / ".local" / "energy.sqlite3")
    prices = PriceCache()
    solving = threading.Semaphore(1)
    auth_lock = threading.Lock()
    auth_attempts = []

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Avoid logging credentials, user data and query strings.

        def send(self, status, data, cookie=None):
            body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            if cookie is not None:
                self.send_header("Set-Cookie", cookie)
            self.end_headers()
            self.wfile.write(body)

        def host_ok(self):
            port = self.server.server_port
            return self.headers.get("Host") in (f"127.0.0.1:{port}", f"localhost:{port}")

        def session(self):
            cookie = SimpleCookie()
            try:
                cookie.load(self.headers.get("Cookie", ""))
                token = cookie["session"].value if "session" in cookie else ""
            except Exception:
                token = ""
            return token, store.user(token)

        def do_GET(self):
            if not self.host_ok():
                return self.send(403, {"error": "Virheellinen palvelinosoite."})
            if self.path == "/api/me":
                _, user = self.session()
                return self.send(200, {"user": user[1] if user else None})
            if self.path == "/api/plans":
                _, user = self.session()
                if not user:
                    return self.send(401, {"error": "Kirjaudu ensin."})
                with store.connect() as db:
                    plans = db.execute("SELECT id,name,payload,created FROM plans WHERE user_id=? ORDER BY id DESC LIMIT 100", (user[0],)).fetchall()
                return self.send(200, {"plans": [{"id": r[0], "name": r[1], "payload": json.loads(r[2]), "created": r[3]} for r in plans]})
            paths = {"/": "index.html", "/app.js": "app.js", "/style.css": "style.css"}
            if self.path not in paths:
                return self.send(404, {"error": "Sivua ei löydy."})
            file = ROOT / "web" / paths[self.path]
            body = file.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", (mimetypes.guess_type(file)[0] or "text/plain") + "; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            origin = self.headers.get("Origin")
            if not self.host_ok() or origin != f"http://{self.headers.get('Host')}":
                return self.send(403, {"error": "Pyyntö sallitaan vain sovelluksen omalta sivulta."})
            if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                return self.send(415, {"error": "Tarvitaan JSON-pyyntö."})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 1500000:
                    return self.send(413, {"error": "Pyyntö on liian suuri tai tyhjä."})
                body = json.loads(self.rfile.read(size))
                if not isinstance(body, dict):
                    raise ValueError("Tarvitaan JSON-olio.")
                if self.path in ("/api/register", "/api/login"):
                    with auth_lock:
                        now = time.time()
                        auth_attempts[:] = [t for t in auth_attempts if now - t < 60]
                        if len(auth_attempts) >= 10:
                            return self.send(429, {"error": "Liikaa kirjautumisyrityksiä. Odota minuutti."})
                        auth_attempts.append(now)
                    if self.path == "/api/register":
                        store.register(body.get("name"), body.get("password"))
                        return self.send(201, {"ok": True})
                    token = store.login(body.get("name"), body.get("password"))
                    return self.send(200, {"ok": True}, f"session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800")
                token, user = self.session()
                if not user:
                    return self.send(401, {"error": "Kirjaudu ensin."})
                if self.path == "/api/logout":
                    with store.connect() as db:
                        db.execute("DELETE FROM sessions WHERE token=?", (hashlib.sha256(token.encode()).hexdigest(),))
                    return self.send(200, {"ok": True}, "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0")
                if self.path == "/api/prices":
                    return self.send(200, prices.get())
                if self.path == "/api/demo":
                    return self.send(200, {"rows": demo_rows(), "source": "Synteettinen esimerkkiaineisto"})
                if self.path == "/api/csv":
                    return self.send(200, {"rows": parse_csv(body.get("text"), body.get("interval")), "source": "Oma CSV"})
                if self.path == "/api/forecast":
                    return self.send(200, {"rows": forecast(body.get("rows"))})
                if self.path == "/api/optimize":
                    if not solving.acquire(blocking=False):
                        return self.send(409, {"error": "Laskenta on jo käynnissä. Odota sen valmistumista."})
                    try:
                        return self.send(200, optimize(body))
                    finally:
                        solving.release()
                if self.path == "/api/save":
                    payload = body.get("payload")
                    normalize(payload)
                    name = str(body.get("name", "")).strip()
                    if not 1 <= len(name) <= 80:
                        raise ValueError("Suunnitelman nimi: 1–80 merkkiä.")
                    with store.connect() as db:
                        count = db.execute("SELECT count(*) FROM plans WHERE user_id=?", (user[0],)).fetchone()[0]
                        if count >= 100:
                            raise ValueError("Enintään 100 suunnitelmaa. Poista vanhoja ennen tallennusta.")
                        db.execute("INSERT INTO plans(user_id,name,payload,created) VALUES(?,?,?,?)",
                                   (user[0], name, json.dumps(payload, allow_nan=False), iso(datetime.now(timezone.utc))))
                    return self.send(201, {"ok": True})
                if self.path == "/api/delete":
                    with store.connect() as db:
                        db.execute("DELETE FROM plans WHERE id=? AND user_id=?", (body.get("id"), user[0]))
                    return self.send(200, {"ok": True})
                return self.send(404, {"error": "Toimintoa ei löydy."})
            except (ValueError, TypeError, KeyError, OverflowError) as error:
                return self.send(400, {"error": str(error) or "Virheellinen syöte."})
            except Exception:
                return self.send(500, {"error": "Palvelimessa tapahtui virhe. Tarkista syötteet ja yritä uudelleen."})

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = create_server(args.port)
    print(f"Avaa http://127.0.0.1:{server.server_port} — lopetus Ctrl+C", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
