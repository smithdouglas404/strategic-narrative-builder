"""Tests for degraded-health detection and alerting (INN-37)."""
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError

from unittest import mock

import server

HERE = os.path.dirname(os.path.abspath(__file__))


class _FakeResponse:
    def __init__(self, status=200, body=b"{}"):
        self.status = status
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False


class _FakeThread:
    """Records construction without starting a real thread."""

    instances = []

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        _FakeThread.instances.append(self)

    def start(self):
        self.started = True


class ProbeHealthTests(unittest.TestCase):
    def test_healthy_2xx_is_reported_healthy(self):
        with mock.patch.object(server, "urlopen", return_value=_FakeResponse(200, b'{"ok": true}')):
            self.assertEqual(server.probe_health("http://health.test/api/health"), (True, ""))

    def test_non_json_2xx_is_still_healthy(self):
        with mock.patch.object(server, "urlopen", return_value=_FakeResponse(200, b"<html>ok</html>")):
            self.assertEqual(server.probe_health("http://health.test/api/health"), (True, ""))

    def test_503_marks_the_instance_unhealthy(self):
        error = HTTPError("http://health.test/api/health", 503, "Service Unavailable", {}, None)
        with mock.patch.object(server, "urlopen", side_effect=error):
            healthy, reason = server.probe_health("http://health.test/api/health")
        self.assertFalse(healthy)
        self.assertIn("503", reason)

    def test_ok_false_payload_marks_the_instance_unhealthy(self):
        body = b'{"ok": false, "status": "degraded"}'
        with mock.patch.object(server, "urlopen", return_value=_FakeResponse(200, body)):
            healthy, reason = server.probe_health("http://health.test/api/health")
        self.assertFalse(healthy)
        self.assertEqual(reason, "degraded")

    def test_connection_error_is_unhealthy_not_an_exception(self):
        with mock.patch.object(server, "urlopen", side_effect=URLError("refused")):
            healthy, reason = server.probe_health("http://health.test/api/health")
        self.assertFalse(healthy)
        self.assertIn("URLError", reason)


class PostHealthAlertTests(unittest.TestCase):
    def test_posts_json_text_payload(self):
        captured = {}

        def fake_urlopen(request, timeout=None):
            captured["request"] = request
            return _FakeResponse(200, b"")

        with mock.patch.object(server, "urlopen", side_effect=fake_urlopen):
            sent = server.post_health_alert("http://hooks.test/x", "degraded now")
        self.assertTrue(sent)
        self.assertEqual(captured["request"].get_method(), "POST")
        self.assertEqual(json.loads(captured["request"].data), {"text": "degraded now"})

    def test_webhook_failure_is_reported_not_raised(self):
        error = HTTPError("http://hooks.test/x", 500, "Server Error", {}, None)
        with mock.patch.object(server, "urlopen", side_effect=error):
            self.assertFalse(server.post_health_alert("http://hooks.test/x", "degraded now"))


class MaybeAlertDegradedHealthTests(unittest.TestCase):
    WEBHOOK = "http://hooks.test/degraded"

    def setUp(self):
        server.HEALTH_ALERT_STATE.update(failures=0, alerted=False, last_error="", last_alert_at=0.0)
        self.addCleanup(
            server.HEALTH_ALERT_STATE.update, failures=0, alerted=False, last_error="", last_alert_at=0.0
        )

    def _call(self, **kwargs):
        kwargs.setdefault("probe_url", "http://health.test/api/health")
        kwargs.setdefault("webhook_url", self.WEBHOOK)
        return server.maybe_alert_degraded_health(**kwargs)

    def test_single_failure_does_not_alert(self):
        with mock.patch.object(server, "probe_health", return_value=(False, "HTTP 503")), \
                mock.patch.object(server, "post_health_alert") as post:
            self.assertFalse(self._call())
        post.assert_not_called()

    def test_alerts_once_the_threshold_is_reached(self):
        posted = []
        with mock.patch.object(server, "probe_health", return_value=(False, "HTTP 503")), \
                mock.patch.object(server, "HEALTH_ALERT_THRESHOLD", 3), \
                mock.patch.object(server, "post_health_alert", side_effect=lambda *a, **k: posted.append(a) or True):
            self.assertFalse(self._call())
            self.assertFalse(self._call())
            self.assertTrue(self._call())
            # A sustained outage must not spam the webhook on every probe.
            self.assertFalse(self._call())
        self.assertEqual(len(posted), 1)
        self.assertEqual(posted[0][0], self.WEBHOOK)
        self.assertIn("503", posted[0][1])

    def test_recovery_resets_so_a_later_outage_alerts_again(self):
        with mock.patch.object(server, "HEALTH_ALERT_THRESHOLD", 1), \
                mock.patch.object(server, "post_health_alert", return_value=True) as post:
            with mock.patch.object(server, "probe_health", return_value=(False, "HTTP 503")):
                self.assertTrue(self._call())
            with mock.patch.object(server, "probe_health", return_value=(True, "")):
                self.assertFalse(self._call())
            with mock.patch.object(server, "probe_health", return_value=(False, "HTTP 503")):
                self.assertTrue(self._call())
        self.assertEqual(post.call_count, 2)

    def test_failed_webhook_delivery_is_retried_next_probe(self):
        with mock.patch.object(server, "HEALTH_ALERT_THRESHOLD", 1), \
                mock.patch.object(server, "probe_health", return_value=(False, "HTTP 503")), \
                mock.patch.object(server, "post_health_alert", side_effect=[False, True]) as post:
            self.assertFalse(self._call())
            self.assertTrue(self._call())
        self.assertEqual(post.call_count, 2)

    def test_unconfigured_webhook_is_a_noop(self):
        with mock.patch.object(server, "HEALTH_ALERT_WEBHOOK_URL", ""), \
                mock.patch.object(server, "probe_health") as probe:
            self.assertFalse(server.maybe_alert_degraded_health(probe_url="http://health.test"))
        probe.assert_not_called()


class DefaultHealthProbeUrlTests(unittest.TestCase):
    def test_prefers_explicit_probe_url(self):
        with mock.patch.object(server, "HEALTH_PROBE_URL", "http://explicit.test/api/health"):
            self.assertEqual(server.default_health_probe_url(), "http://explicit.test/api/health")

    def test_derives_from_host_and_port(self):
        with mock.patch.object(server, "HEALTH_PROBE_URL", ""), \
                mock.patch.dict(os.environ, {"HOST": "0.0.0.0", "PORT": "9999"}):
            # A bind-all host is not routable, so the probe targets loopback.
            self.assertEqual(server.default_health_probe_url(), "http://127.0.0.1:9999/api/health")


class StartHealthAlertWorkerTests(unittest.TestCase):
    def test_noop_when_webhook_is_unconfigured(self):
        _FakeThread.instances = []
        with mock.patch.object(server, "HEALTH_ALERT_WEBHOOK_URL", ""), \
                mock.patch.object(server.threading, "Thread", _FakeThread):
            server.start_health_alert_worker()
        self.assertEqual(_FakeThread.instances, [])

    def test_starts_a_daemon_thread_when_configured(self):
        _FakeThread.instances = []
        with mock.patch.object(server, "HEALTH_ALERT_WEBHOOK_URL", "http://health.test/api/health"), \
                mock.patch.object(server.threading, "Thread", _FakeThread):
            server.start_health_alert_worker()
        self.assertEqual(len(_FakeThread.instances), 1)
        self.assertTrue(_FakeThread.instances[0].kwargs["daemon"])
        self.assertTrue(_FakeThread.instances[0].started)


class LiveServerProbeTests(unittest.TestCase):
    """End-to-end: probe a real running server over the network, no mocks."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="snb-health-alert-")
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        cls.port = sock.getsockname()[1]
        sock.close()
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
        cls.url = f"http://127.0.0.1:{cls.port}/api/health"
        for _ in range(60):
            try:
                if server.probe_health(cls.url, timeout=2)[0]:
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

    def test_live_health_endpoint_probes_healthy(self):
        self.assertEqual(server.probe_health(self.url, timeout=5), (True, ""))

    def test_live_alert_flow_reaches_the_webhook(self):
        received = []

        class _Hook(BaseHTTPRequestHandler):
            def do_POST(self):
                received.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
                self.send_response(200)
                self.send_header("Content-Length", "0")
                self.end_headers()

            def log_message(self, *args):
                pass

        hook = ThreadingHTTPServer(("127.0.0.1", 0), _Hook)
        threading.Thread(target=hook.serve_forever, daemon=True).start()
        self.addCleanup(hook.shutdown)
        webhook_url = f"http://127.0.0.1:{hook.server_address[1]}/alert"
        server.HEALTH_ALERT_STATE.update(failures=0, alerted=False, last_error="", last_alert_at=0.0)
        self.addCleanup(
            server.HEALTH_ALERT_STATE.update, failures=0, alerted=False, last_error="", last_alert_at=0.0
        )
        # A healthy live server must never alert, even after several probes.
        for _ in range(3):
            self.assertFalse(server.maybe_alert_degraded_health(probe_url=self.url, webhook_url=webhook_url))
        self.assertEqual(received, [])

        # Point the probe at a closed port: the same flow must alert once.
        dead_sock = socket.socket()
        dead_sock.bind(("127.0.0.1", 0))
        dead_port = dead_sock.getsockname()[1]
        dead_sock.close()
        dead_url = f"http://127.0.0.1:{dead_port}/api/health"
        with mock.patch.object(server, "HEALTH_ALERT_THRESHOLD", 2):
            self.assertFalse(server.maybe_alert_degraded_health(probe_url=dead_url, webhook_url=webhook_url))
            self.assertTrue(server.maybe_alert_degraded_health(probe_url=dead_url, webhook_url=webhook_url))
        self.assertEqual(len(received), 1)
        self.assertIn("health degraded", received[0]["text"])
        self.assertIn(str(dead_port), received[0]["text"])


class DockerfileHealthcheckTests(unittest.TestCase):
    """The container HEALTHCHECK must treat a degraded body as unhealthy."""

    def _healthcheck_command(self, port):
        with open(os.path.join(HERE, "Dockerfile"), encoding="utf-8") as handle:
            text = handle.read()
        match = re.search(r'CMD (python3 -c "[^"]+")', text)
        self.assertIsNotNone(match, "Dockerfile HEALTHCHECK CMD not found")
        return match.group(1).replace("8787", str(port))

    def _run(self, command):
        return subprocess.run(
            ["sh", "-c", command], capture_output=True, timeout=30
        ).returncode

    def test_healthy_payload_passes(self):
        port = self._serve(lambda handler: handler._respond(200, b'{"ok": true}'))
        self.assertEqual(self._run(self._healthcheck_command(port)), 0)

    def test_ok_false_payload_fails(self):
        port = self._serve(lambda handler: handler._respond(200, b'{"ok": false, "status": "degraded"}'))
        self.assertNotEqual(self._run(self._healthcheck_command(port)), 0)

    def test_503_response_fails(self):
        port = self._serve(lambda handler: handler._respond(503, b'{"ok": false}'))
        self.assertNotEqual(self._run(self._healthcheck_command(port)), 0)

    def _serve(self, respond):
        class _Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                respond(self)

            def _respond(self, status, body):
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass

        httpd = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        self.addCleanup(httpd.shutdown)
        return httpd.server_address[1]


if __name__ == "__main__":
    unittest.main()
