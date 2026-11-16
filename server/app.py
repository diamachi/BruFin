#!/usr/bin/env python3
"""BruFin single-user self-hosted API and static web host."""

from __future__ import annotations

import hmac
import json
import math
import mimetypes
import os
import secrets
import sqlite3
import threading
import time
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

DATA_DIR = Path(os.environ.get("BRUFIN_DATA_DIR", "/data"))
WEB_DIR = Path(os.environ.get("BRUFIN_WEB_DIR", "/app/web"))
DB_PATH = DATA_DIR / "brufin.sqlite3"
HOST = os.environ.get("BRUFIN_HOST", "0.0.0.0")
PORT = int(os.environ.get("BRUFIN_PORT", "8080"))
API_TOKEN = os.environ.get("BRUFIN_API_TOKEN", "").strip()
MAX_BODY_BYTES = 12 * 1024 * 1024
ALLOWED_ORIGINS = {
    value.strip()
    for value in os.environ.get(
        "BRUFIN_ALLOWED_ORIGINS",
        "http://localhost,https://localhost,capacitor://localhost,http://127.0.0.1,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if value.strip()
}
DB_LOCK = threading.RLock()
COLLECTIONS = (
    "transactions", "creditCards", "recurringPayments", "investments", "loans", "bankAccounts",
    "monthlyBalances", "paymentMethods", "expenseCategories", "incomeCategories",
)


def connect_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        os.chmod(DATA_DIR, 0o700)
    except OSError:
        pass
    connection = sqlite3.connect(DB_PATH, timeout=15, isolation_level=None)
    try:
        os.chmod(DB_PATH, 0o600)
    except OSError:
        pass
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=FULL")
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def load_or_create_api_token() -> str:
    """Use a configured token or persist a new random token in the data volume."""
    DATA_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    token_path = DATA_DIR / "api-token"
    configured = API_TOKEN
    if configured:
        if len(configured) < 32:
            raise SystemExit("BRUFIN_API_TOKEN must be at least 32 characters. Generate one with: openssl rand -hex 32")
        token_path.write_text(configured + "\n", encoding="utf-8")
        try:
            os.chmod(token_path, 0o600)
        except OSError:
            pass
        return configured

    try:
        descriptor = os.open(token_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        token = token_path.read_text(encoding="utf-8").strip()
    else:
        token = secrets.token_hex(32)
        with os.fdopen(descriptor, "w", encoding="utf-8") as token_file:
            token_file.write(token + "\n")
        print("Generated a BruFin API token in the persistent data volume at /data/api-token.")
        print("Retrieve it from the container console with: cat /data/api-token")

    if len(token) < 32:
        raise SystemExit("The persisted /data/api-token is invalid. Replace it with a random secret of at least 32 characters.")
    try:
        os.chmod(token_path, 0o600)
    except OSError:
        pass
    return token


def initialize_db() -> None:
    with DB_LOCK, closing(connect_db()) as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS app_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                revision INTEGER NOT NULL,
                has_data INTEGER NOT NULL DEFAULT 0,
                monthly_target REAL NOT NULL DEFAULT 50000,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS records (
                collection TEXT NOT NULL,
                item_id TEXT NOT NULL,
                data_json TEXT NOT NULL,
                PRIMARY KEY (collection, item_id)
            );
            CREATE TABLE IF NOT EXISTS mutations (
                mutation_id TEXT PRIMARY KEY,
                revision INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        # Migrate an earlier development snapshot schema if one was created.
        columns = {row["name"] for row in db.execute("PRAGMA table_info(app_state)").fetchall()}
        if "data_json" in columns:
            if "has_data" not in columns:
                db.execute("ALTER TABLE app_state ADD COLUMN has_data INTEGER NOT NULL DEFAULT 0")
            if "monthly_target" not in columns:
                db.execute("ALTER TABLE app_state ADD COLUMN monthly_target REAL NOT NULL DEFAULT 50000")
            legacy = db.execute("SELECT data_json FROM app_state WHERE id=1").fetchone()
            if legacy and legacy["data_json"]:
                snapshot = json.loads(legacy["data_json"])
                write_records(db, snapshot)
                db.execute(
                    "UPDATE app_state SET has_data=1, monthly_target=?, updated_at=? WHERE id=1",
                    (snapshot.get("monthlyTarget", 50000), time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
                )
                db.execute("UPDATE app_state SET data_json=NULL WHERE id=1")
        db.execute(
            "INSERT OR IGNORE INTO app_state(id, revision, has_data, monthly_target, updated_at) "
            "VALUES (1, 0, 0, 50000, datetime('now'))"
        )


def record_id(collection: str, item: object) -> str:
    if collection in ("expenseCategories", "incomeCategories"):
        return str(item)
    return str(item["id"])


def write_records(db: sqlite3.Connection, data: dict) -> None:
    for collection in COLLECTIONS:
        desired = {
            record_id(collection, item): json.dumps(item, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
            for item in data[collection]
        }
        existing = {
            row["item_id"]: row["data_json"]
            for row in db.execute("SELECT item_id, data_json FROM records WHERE collection=?", (collection,)).fetchall()
        }
        for key in existing.keys() - desired.keys():
            db.execute("DELETE FROM records WHERE collection=? AND item_id=?", (collection, key))
        for key, value in desired.items():
            if existing.get(key) != value:
                db.execute(
                    "INSERT INTO records(collection, item_id, data_json) VALUES (?, ?, ?) "
                    "ON CONFLICT(collection, item_id) DO UPDATE SET data_json=excluded.data_json",
                    (collection, key, value),
                )


def read_state(db: sqlite3.Connection) -> dict:
    state = db.execute("SELECT revision, has_data, monthly_target, updated_at FROM app_state WHERE id=1").fetchone()
    data = None
    if state["has_data"]:
        data = {collection: [] for collection in COLLECTIONS}
        data["monthlyTarget"] = state["monthly_target"]
        for row in db.execute("SELECT collection, data_json FROM records ORDER BY collection, item_id").fetchall():
            data[row["collection"]].append(json.loads(row["data_json"]))
    return {"revision": state["revision"], "data": data, "updatedAt": state["updated_at"]}


def json_response(handler: BaseHTTPRequestHandler, status: int, value: object) -> None:
    body = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


class BruFinHandler(BaseHTTPRequestHandler):
    server_version = "BruFin/1"

    def log_message(self, format: str, *args: object) -> None:
        # Avoid logging request headers, payloads, tokens, or finance data.
        print(f"[{self.log_date_time_string()}] {self.command} {self.path.split('?')[0]}")

    def end_headers(self) -> None:
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def authorized(self) -> bool:
        supplied = self.headers.get("Authorization", "")
        expected = f"Bearer {API_TOKEN}"
        return bool(API_TOKEN) and hmac.compare_digest(supplied.encode(), expected.encode())

    def require_auth(self) -> bool:
        if self.authorized():
            return True
        json_response(self, 401, {"error": "Authentication required"})
        return False

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            json_response(self, 200, {"ok": True, "authConfigured": bool(API_TOKEN)})
            return
        if path == "/api/state":
            if not self.require_auth():
                return
            with DB_LOCK, closing(connect_db()) as db:
                state = read_state(db)
            json_response(self, 200, state)
            return
        self.serve_web(path)

    def do_HEAD(self) -> None:
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            self.send_response(405)
            self.send_header("Allow", "GET, POST, OPTIONS")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.serve_web(path, head_only=True)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/state":
            json_response(self, 404, {"error": "Not found"})
            return
        if not self.require_auth():
            return
        content_length = self.headers.get("Content-Length", "")
        try:
            length = int(content_length)
        except ValueError:
            json_response(self, 411, {"error": "Content-Length is required"})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            json_response(self, 413, {"error": "Request body is empty or exceeds 12 MiB"})
            return
        try:
            request = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            json_response(self, 400, {"error": "Invalid JSON"})
            return
        if not isinstance(request, dict):
            json_response(self, 400, {"error": "Expected a JSON object"})
            return
        data = request.get("data")
        mutation_id = request.get("mutationId")
        base_revision = request.get("baseRevision")
        if not isinstance(data, dict) or not isinstance(mutation_id, str) or len(mutation_id) > 160:
            json_response(self, 400, {"error": "data and mutationId are required"})
            return
        if not isinstance(base_revision, int) or base_revision < 0:
            json_response(self, 400, {"error": "baseRevision must be a non-negative integer"})
            return
        required = {
            "transactions", "creditCards", "recurringPayments", "monthlyTarget", "investments",
            "loans", "bankAccounts", "monthlyBalances", "paymentMethods", "expenseCategories", "incomeCategories",
        }
        if not required.issubset(data):
            json_response(self, 400, {"error": "The BruFin data snapshot is incomplete"})
            return
        for name in required - {"monthlyTarget"}:
            if not isinstance(data[name], list):
                json_response(self, 400, {"error": f"{name} must be an array"})
                return
        if isinstance(data["monthlyTarget"], bool) or not isinstance(data["monthlyTarget"], (int, float)) or not math.isfinite(data["monthlyTarget"]):
            json_response(self, 400, {"error": "monthlyTarget must be a finite number"})
            return
        for name in required - {"monthlyTarget", "expenseCategories", "incomeCategories"}:
            seen: set[str] = set()
            for item in data[name]:
                if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not item["id"].strip():
                    json_response(self, 400, {"error": f"Every {name} item must have an id"})
                    return
                if item["id"] in seen:
                    json_response(self, 400, {"error": f"Duplicate id in {name}"})
                    return
                seen.add(item["id"])
        for name in ("expenseCategories", "incomeCategories"):
            if any(not isinstance(item, str) or not item.strip() for item in data[name]):
                json_response(self, 400, {"error": f"{name} must contain non-empty category names"})
                return
        try:
            json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        except (TypeError, ValueError):
            json_response(self, 400, {"error": "The BruFin snapshot contains invalid values"})
            return
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with DB_LOCK, closing(connect_db()) as db:
            db.execute("BEGIN IMMEDIATE")
            prior = db.execute("SELECT revision FROM mutations WHERE mutation_id=?", (mutation_id,)).fetchone()
            current = read_state(db)
            if prior:
                db.execute("COMMIT")
                current["duplicate"] = True
                json_response(self, 200, current)
                return
            if base_revision != current["revision"]:
                db.execute("COMMIT")
                current["error"] = "The server changed since this device last synced"
                json_response(self, 409, current)
                return
            next_revision = current["revision"] + 1
            write_records(db, data)
            db.execute(
                "UPDATE app_state SET revision=?, has_data=1, monthly_target=?, updated_at=? WHERE id=1",
                (next_revision, data["monthlyTarget"], now),
            )
            db.execute("INSERT INTO mutations(mutation_id, revision, created_at) VALUES (?, ?, ?)", (mutation_id, next_revision, now))
            db.execute("COMMIT")
            state = read_state(db)
        json_response(self, 200, state)

    def serve_web(self, request_path: str, head_only: bool = False) -> None:
        relative = unquote(request_path).lstrip("/")
        candidate = (WEB_DIR / relative).resolve()
        try:
            candidate.relative_to(WEB_DIR.resolve())
        except ValueError:
            self.send_error(404)
            return
        if candidate.is_dir():
            candidate = candidate / "index.html"
        if not candidate.is_file():
            candidate = WEB_DIR / "index.html"
        if not candidate.is_file():
            self.send_error(503, "Web app has not been built")
            return
        body = candidate.read_bytes()
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if candidate.name == "index.html":
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        if not head_only:
            self.wfile.write(body)


def main() -> None:
    global API_TOKEN
    API_TOKEN = load_or_create_api_token()
    initialize_db()
    server = ThreadingHTTPServer((HOST, PORT), BruFinHandler)
    server.daemon_threads = True
    print(f"BruFin self-hosted server listening on {HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
