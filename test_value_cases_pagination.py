"""Tests for /api/value-cases pagination: defaults, slicing and the count.

Boots the real server in an isolated runtime dir, signs in through the
dev-auth bypass so the request carries a genuine session cookie, seeds a
known number of cases directly into SQLite, then reads them back over HTTP.
"""
import json
import os
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

CASE_COUNT = 7
COOKIE = ""


def _free_port():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


class ValueCasePaginationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="snb-page-")
        cls.port = _free_port()
        cls.env = dict(
            os.environ,
            SNB_RUNTIME_DIR=cls.tmp,
            HOST="127.0.0.1",
            PORT=str(cls.port),
            SNB_DEV_AUTH_BYPASS="1",
            SNB_MAGIC_LINK_DEV_MODE="0",
            SNB_BACKGROUND_REFRESH_ENABLED="0",
            SNB_VALUE_CASES_DEFAULT_LIMIT="200",
            SNB_VALUE_CASES_MAX_LIMIT="500",
        )
        cls.proc = subprocess.Popen(
            [sys.executable, "server.py"],
            cwd=HERE, env=cls.env,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        for _ in range(60):
            try:
                if cls._request("/api/health")[0] == 200:
                    break
            except OSError:
                pass
            time.sleep(0.3)
        else:
            cls.proc.kill()
            raise RuntimeError("server did not start in time")
        cls._seed()
        cls._sign_in()

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        try:
            cls.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.proc.kill()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    # --- setup helpers ---------------------------------------------------
    @classmethod
    def _db(cls):
        return sqlite3.connect(os.path.join(cls.tmp, "data", "strategic_narrative.db"))

    @classmethod
    def _seed(cls):
        """Allowlist the test account and give it a known number of cases."""
        now = "2026-01-01T00:00:00Z"
        conn = cls._db()
        conn.execute(
            "INSERT INTO admin_access_emails (id, email, access_level, active, created_at, updated_at)"
            " VALUES (?, ?, 'admin', 1, ?, ?)",
            ("allow-1", "pager@example.com", now, now),
        )
        conn.execute(
            "INSERT INTO users (id, email, role, created_at) VALUES (?, ?, 'super_user', ?)",
            ("user-1", "pager@example.com", now),
        )
        for i in range(CASE_COUNT):
            conn.execute(
                "INSERT INTO value_cases (id, user_id, company_name, ticker, industry, status, created_at, updated_at)"
                " VALUES (?, ?, ?, 'TICK', 'Banking', 'In Progress', ?, ?)",
                (f"case-{i:02d}", "user-1", f"Company {i:02d}", now, f"2026-01-{i + 1:02d}T00:00:00Z"),
            )
        # Example-bank rows must never be counted or returned.
        conn.execute(
            "INSERT INTO value_cases (id, user_id, company_name, ticker, industry, status, created_at, updated_at)"
            " VALUES ('case-example', 'user-1', 'Example Bank', 'X', 'Banking', 'In Progress', ?, ?)",
            (now, "2026-02-01T00:00:00Z"),
        )
        conn.commit()
        conn.close()

    @classmethod
    def _sign_in(cls):
        """Exchange the dev-auth bypass for a real session cookie.

        The verify step answers with a redirect, and the session cookie is set
        on that redirect. urllib would follow it and discard the cookie, so
        redirects are blocked here and the cookie is read from the 3xx response.
        """
        class _NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None

        cls.jar = urllib.request.HTTPCookieProcessor()
        cls.opener = urllib.request.build_opener(cls.jar, _NoRedirect())

        body = json.dumps({"email": "pager@example.com"}).encode()
        req = urllib.request.Request(
            f"http://127.0.0.1:{cls.port}/api/auth/magic/request",
            data=body, method="POST", headers={"Content-Type": "application/json"},
        )
        with cls.opener.open(req, timeout=5) as resp:
            payload = json.loads(resp.read())
        verify_path = payload["previewUrl"].split(f"http://127.0.0.1:{cls.port}", 1)[1]
        try:
            cls.opener.open(f"http://127.0.0.1:{cls.port}{verify_path}", timeout=5)
        except urllib.error.HTTPError as exc:
            # A 3xx is the expected success signal here.
            assert exc.code in (301, 302, 303, 307, 308), f"unexpected {exc.code}"
        names = [c.name for c in cls.jar.cookiejar]
        assert names, "sign-in did not yield a session cookie"

    @classmethod
    def _request(cls, path, authenticated=True):
        req = urllib.request.Request(f"http://127.0.0.1:{cls.port}{path}")
        opener = cls.opener if (authenticated and hasattr(cls, "opener")) else urllib.request.build_opener()
        try:
            with opener.open(req, timeout=5) as resp:
                return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read() or b"{}")

    # --- tests -----------------------------------------------------------
    def test_absent_params_return_everything_with_a_total(self):
        status, body = self._request("/api/value-cases")
        self.assertEqual(status, 200)
        self.assertEqual(body["total"], CASE_COUNT)
        self.assertEqual(len(body["valueCases"]), CASE_COUNT)
        self.assertFalse(body["hasMore"])
        self.assertEqual(body["offset"], 0)

    def test_example_bank_rows_are_excluded_from_both_page_and_total(self):
        _, body = self._request("/api/value-cases")
        names = [c["company_name"] for c in body["valueCases"]]
        self.assertNotIn("Example Bank", names)
        self.assertEqual(body["total"], CASE_COUNT)

    def test_limit_slices_the_page_and_reports_more(self):
        status, body = self._request("/api/value-cases?limit=3")
        self.assertEqual(status, 200)
        self.assertEqual(len(body["valueCases"]), 3)
        self.assertEqual(body["total"], CASE_COUNT)
        self.assertTrue(body["hasMore"])
        self.assertEqual(body["limit"], 3)

    def test_offset_walks_without_overlap(self):
        _, first = self._request("/api/value-cases?limit=3&offset=0")
        _, second = self._request("/api/value-cases?limit=3&offset=3")
        first_ids = {c["id"] for c in first["valueCases"]}
        second_ids = {c["id"] for c in second["valueCases"]}
        self.assertEqual(len(first_ids), 3)
        self.assertEqual(len(second_ids), 3)
        self.assertFalse(first_ids & second_ids)

    def test_last_page_reports_no_more(self):
        _, body = self._request(f"/api/value-cases?limit=3&offset={CASE_COUNT - 1}")
        self.assertEqual(len(body["valueCases"]), 1)
        self.assertFalse(body["hasMore"])

    def test_offset_past_the_end_is_an_empty_page_not_an_error(self):
        status, body = self._request(f"/api/value-cases?offset={CASE_COUNT + 50}")
        self.assertEqual(status, 200)
        self.assertEqual(body["valueCases"], [])
        self.assertEqual(body["total"], CASE_COUNT)
        self.assertFalse(body["hasMore"])

    def test_limit_is_clamped_to_the_maximum(self):
        _, body = self._request("/api/value-cases?limit=99999")
        self.assertEqual(body["limit"], 500)
        self.assertEqual(len(body["valueCases"]), CASE_COUNT)

    def test_garbage_params_fall_back_to_defaults(self):
        status, body = self._request("/api/value-cases?limit=abc&offset=xyz")
        self.assertEqual(status, 200)
        self.assertEqual(body["limit"], 200)
        self.assertEqual(body["offset"], 0)
        self.assertEqual(body["total"], CASE_COUNT)

    def test_negative_offset_is_clamped_to_zero(self):
        _, body = self._request("/api/value-cases?offset=-5")
        self.assertEqual(body["offset"], 0)
        self.assertEqual(body["total"], CASE_COUNT)

    def test_still_requires_authentication(self):
        status, _ = self._request("/api/value-cases?limit=1", authenticated=False)
        self.assertEqual(status, 401)


if __name__ == "__main__":
    unittest.main()
