"""Tests for SNB_LOG_JSON structured request logging.

Boots the real server twice: once with the flag off (default human-readable
lines) and once with it on, then asserts on what actually reached stderr.
"""
import json
import os
import re
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def _free_port():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


class _Server:
    """Run server.py in an isolated runtime dir, capturing stderr to a file."""

    def __init__(self, log_json, dev_auth=False):
        self.tmp = tempfile.mkdtemp(prefix="snb-log-")
        self.port = _free_port()
        self.stderr_path = os.path.join(self.tmp, "stderr.log")
        env = dict(
            os.environ,
            SNB_RUNTIME_DIR=self.tmp,
            HOST="127.0.0.1",
            PORT=str(self.port),
            SNB_MAGIC_LINK_DEV_MODE="0",
            SNB_BACKGROUND_REFRESH_ENABLED="0",
            SNB_LOG_JSON="1" if log_json else "0",
            SNB_DEV_AUTH_BYPASS="1" if dev_auth else "0",
        )
        self.stderr_file = open(self.stderr_path, "w+")
        self.proc = subprocess.Popen(
            [sys.executable, "server.py"],
            cwd=HERE, env=env,
            stdout=subprocess.DEVNULL, stderr=self.stderr_file,
        )
        for _ in range(60):
            try:
                self.get("/api/health")
                break
            except OSError:
                time.sleep(0.3)
        else:
            self.proc.kill()
            raise RuntimeError("server did not start in time")

    def db(self):
        return sqlite3.connect(os.path.join(self.tmp, "data", "strategic_narrative.db"))

    def get(self, path, headers=None):
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read()

    def log_lines(self):
        self.stderr_file.flush()
        with open(self.stderr_path) as fh:
            return [line for line in fh.read().splitlines() if line.strip()]

    def stop(self):
        self.proc.terminate()
        try:
            self.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.proc.kill()
        self.stderr_file.close()
        shutil.rmtree(self.tmp, ignore_errors=True)


class JsonLoggingDisabledTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = _Server(log_json=False)
        cls.srv.get("/api/health")
        cls.lines = cls.srv.log_lines()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()

    def test_lines_are_not_json(self):
        request_lines = [ln for ln in self.lines if "/api/health" in ln]
        self.assertTrue(request_lines, f"expected a request line, got {self.lines}")
        for line in request_lines:
            with self.assertRaises(json.JSONDecodeError):
                json.loads(line)


class JsonLoggingEnabledTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = _Server(log_json=True)
        cls.srv.get("/api/health")
        cls.srv.get("/api/me")
        cls.srv.get("/api/me", headers={"Cookie": "snb_session=not-a-real-session"})
        cls.srv.get("/api/does-not-exist")
        cls.srv.get("/api/auth/magic/verify?token=super-secret-token-value")
        cls.lines = cls.srv.log_lines()
        cls.records = []
        for line in cls.lines:
            try:
                cls.records.append(json.loads(line))
            except json.JSONDecodeError:
                pass

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()

    def test_every_request_emits_one_json_object(self):
        self.assertGreaterEqual(len(self.records), 5)

    def test_record_has_the_documented_fields(self):
        for record in self.records:
            self.assertEqual(
                set(record), {"method", "path", "status", "duration_ms", "user_id"}
            )

    def test_status_and_path_are_captured(self):
        health = next(r for r in self.records if r["path"] == "/api/health")
        self.assertEqual(health["status"], 200)
        self.assertEqual(health["method"], "GET")
        missing = next(r for r in self.records if r["path"] == "/api/does-not-exist")
        self.assertEqual(missing["status"], 404)

    def test_duration_is_a_non_negative_number(self):
        for record in self.records:
            self.assertIsInstance(record["duration_ms"], (int, float))
            self.assertGreaterEqual(record["duration_ms"], 0)

    def test_unauthenticated_request_has_null_user(self):
        health = next(r for r in self.records if r["path"] == "/api/health")
        self.assertIsNone(health["user_id"])

    def test_sign_in_token_never_reaches_the_log(self):
        for line in self.lines:
            self.assertNotIn("super-secret-token-value", line)

    def test_query_string_is_not_logged(self):
        verify = next(r for r in self.records if r["path"] == "/api/auth/magic/verify")
        self.assertNotIn("token", verify["path"])
        self.assertNotIn("?", verify["path"])

    def test_human_readable_lines_are_gone(self):
        # The default format is `address - "GET /path HTTP/1.1" 200 -`.
        pattern = re.compile(r'^\S+ - "')
        for line in self.lines:
            self.assertIsNone(pattern.match(line), f"human-readable line leaked: {line!r}")


class JsonLoggingAuthenticatedTests(unittest.TestCase):
    """The user_id field is only useful if it is populated for signed-in calls."""

    @classmethod
    def setUpClass(cls):
        cls.srv = _Server(log_json=True, dev_auth=True)
        now = "2026-01-01T00:00:00Z"
        conn = cls.srv.db()
        conn.execute(
            "INSERT INTO admin_access_emails (id, email, access_level, active, created_at, updated_at)"
            " VALUES (?, ?, 'admin', 1, ?, ?)",
            ("allow-1", "logger@example.com", now, now),
        )
        conn.commit()
        conn.close()

        # Sign in through the dev-auth bypass, keeping the session cookie.
        class _NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None

        cls.jar = urllib.request.HTTPCookieProcessor()
        cls.opener = urllib.request.build_opener(cls.jar, _NoRedirect())
        req = urllib.request.Request(
            f"http://127.0.0.1:{cls.srv.port}/api/auth/magic/request",
            data=json.dumps({"email": "logger@example.com"}).encode(),
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with cls.opener.open(req, timeout=5) as resp:
            preview = json.loads(resp.read())["previewUrl"]
        verify_path = preview.split(f"http://127.0.0.1:{cls.srv.port}", 1)[1]
        try:
            cls.opener.open(f"http://127.0.0.1:{cls.srv.port}{verify_path}", timeout=5)
        except urllib.error.HTTPError:
            pass
        with cls.opener.open(f"http://127.0.0.1:{cls.srv.port}/api/me", timeout=5) as resp:
            cls.me = json.loads(resp.read())
        cls.records = []
        for line in cls.srv.log_lines():
            try:
                cls.records.append(json.loads(line))
            except json.JSONDecodeError:
                pass

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()

    def test_authenticated_request_logs_the_user_id(self):
        self.assertIsNotNone(self.me.get("user"), "sign-in did not produce a session")
        expected = self.me["user"]["id"]
        me_records = [r for r in self.records if r["path"] == "/api/me" and r["user_id"]]
        self.assertTrue(me_records, f"no /api/me record carried a user_id: {self.records}")
        self.assertEqual(me_records[-1]["user_id"], expected)


if __name__ == "__main__":
    unittest.main()
