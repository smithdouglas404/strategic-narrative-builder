"""HTTP smoke tests: boot the real server in an isolated runtime dir and
exercise the request layer end to end (routing, auth gates, error handling)."""
import json
import os
import shutil
import socket
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


class HttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="snb-smoke-")
        cls.port = _free_port()
        env = dict(
            os.environ,
            SNB_RUNTIME_DIR=cls.tmp,
            HOST="127.0.0.1",
            PORT=str(cls.port),
            SNB_MAGIC_LINK_DEV_MODE="0",
            SNB_DEV_AUTH_BYPASS="0",
            SNB_BACKGROUND_REFRESH_ENABLED="0",
        )
        cls.proc = subprocess.Popen(
            [sys.executable, "server.py"],
            cwd=HERE, env=env,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        for _ in range(60):
            try:
                if cls._get("/api/health")[0] == 200:
                    break
            except OSError:
                pass
            time.sleep(0.3)
        else:
            cls.proc.kill()
            raise RuntimeError("server did not start in time")

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        try:
            cls.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.proc.kill()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    @classmethod
    def _request(cls, path, method="GET", data=None):
        url = f"http://127.0.0.1:{cls.port}{path}"
        headers = {"Content-Type": "application/json"} if data is not None else {}
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read()

    @classmethod
    def _get(cls, path):
        return cls._request(path)

    @classmethod
    def _post(cls, path, data=b""):
        return cls._request(path, method="POST", data=data)

    def test_health_ok(self):
        status, body = self._get("/api/health")
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(body)["ok"])

    def test_index_and_assets_serve(self):
        self.assertEqual(self._get("/")[0], 200)
        self.assertEqual(self._get("/app.js")[0], 200)
        self.assertEqual(self._get("/styles.css")[0], 200)

    def test_me_is_unauthenticated(self):
        status, body = self._get("/api/me")
        self.assertEqual(status, 200)
        self.assertIsNone(json.loads(body)["user"])

    def test_malformed_json_body_is_400_not_crash(self):
        status, _ = self._post("/api/auth/magic/request", b"{not valid json")
        self.assertEqual(status, 400)

    def test_protected_route_requires_auth(self):
        self.assertEqual(self._post("/api/value-cases", b"{}")[0], 401)

    def test_synthesize_route_is_wired(self):
        # 401 (auth required) proves the route matched rather than 404
        status = self._post("/api/value-cases/nope/business-priorities/synthesize", b"{}")[0]
        self.assertEqual(status, 401)

    def test_unknown_static_path_is_404(self):
        self.assertEqual(self._get("/does-not-exist.html")[0], 404)


if __name__ == "__main__":
    unittest.main()
