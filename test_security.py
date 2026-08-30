"""Tests for at-rest secret handling (feature 3 hardening)."""
import unittest
from unittest import mock

import server


class _StubHandler:
    def __init__(self, headers=None, client=("203.0.113.9", 5000)):
        self.headers = headers or {}
        self.client_address = client


class ProviderKeyStorageTests(unittest.TestCase):
    def test_legacy_plaintext_is_read_transparently(self):
        # Keys stored before encryption existed have no scheme prefix.
        self.assertEqual(server.provider_api_key_from_storage("pplx-legacy-123"), "pplx-legacy-123")

    def test_empty_is_safe(self):
        self.assertEqual(server.provider_api_key_from_storage(""), "")
        self.assertEqual(server.provider_api_key_from_storage(None), "")

    def test_round_trip_when_crypto_available(self):
        stored = server.encrypt_provider_secret("pplx-secret-xyz")
        # decrypts back to the original regardless of whether crypto is present
        self.assertEqual(server.provider_api_key_from_storage(stored), "pplx-secret-xyz")

    @unittest.skipIf(server.Fernet is None, "cryptography backend not installed")
    def test_encrypts_at_rest_when_crypto_available(self):
        stored = server.encrypt_provider_secret("pplx-secret-xyz")
        self.assertTrue(stored.startswith(("fernet:v1:", "dpapi:v1:")))
        self.assertNotIn("pplx-secret-xyz", stored)


class SharedApiAccessTests(unittest.TestCase):
    def test_key_required_for_everyone_when_configured(self):
        with mock.patch.object(server, "SHARED_COMPANY_API_KEY", "topsecret"):
            # A loopback client with no/wrong key is now denied (proxies can spoof loopback)
            self.assertFalse(server.shared_api_access_allowed(_StubHandler(client=("127.0.0.1", 5000))))
            self.assertFalse(server.shared_api_access_allowed(
                _StubHandler(headers={"X-Shared-API-Key": "wrong"}, client=("127.0.0.1", 5000))))
            # Correct key is allowed from anywhere
            self.assertTrue(server.shared_api_access_allowed(
                _StubHandler(headers={"X-Shared-API-Key": "topsecret"})))

    def test_loopback_open_when_no_key_configured(self):
        with mock.patch.object(server, "SHARED_COMPANY_API_KEY", ""):
            self.assertTrue(server.shared_api_access_allowed(_StubHandler(client=("127.0.0.1", 5000))))
            self.assertFalse(server.shared_api_access_allowed(_StubHandler(client=("203.0.113.9", 5000))))


class MagicLinkHostTests(unittest.TestCase):
    def test_host_allowlist_overrides_spoofed_host(self):
        handler = _StubHandler(headers={"Host": "evil.example.com"})
        with mock.patch.object(server, "ALLOWED_PUBLIC_HOSTS", ["app.inflexcvi.ai"]), \
             mock.patch.object(server, "smtp_runtime_config", return_value={}):
            url = server.request_base_url(handler)
        self.assertIn("app.inflexcvi.ai", url)
        self.assertNotIn("evil.example.com", url)

    def test_host_used_when_no_allowlist(self):
        handler = _StubHandler(headers={"Host": "app.inflexcvi.ai"})
        with mock.patch.object(server, "ALLOWED_PUBLIC_HOSTS", []), \
             mock.patch.object(server, "smtp_runtime_config", return_value={}):
            url = server.request_base_url(handler)
        self.assertIn("app.inflexcvi.ai", url)


class AdminOnlySignInTests(unittest.TestCase):
    """Sign-in is restricted to active admin_access_emails rows."""

    def test_allowlisted_email_passes(self):
        with mock.patch.object(server, "connect") as fake_connect:
            conn = fake_connect.return_value.__enter__.return_value
            conn.execute.return_value.fetchone.return_value = (1,)
            self.assertTrue(server.email_is_admin_allowlisted("admin@admin.com"))

    def test_unlisted_email_is_refused(self):
        with mock.patch.object(server, "connect") as fake_connect:
            conn = fake_connect.return_value.__enter__.return_value
            conn.execute.return_value.fetchone.return_value = None
            self.assertFalse(server.email_is_admin_allowlisted("random@nowhere.com"))

    def test_blank_email_is_refused_without_a_query(self):
        with mock.patch.object(server, "connect") as fake_connect:
            self.assertFalse(server.email_is_admin_allowlisted(""))
            fake_connect.assert_not_called()

    def test_message_is_the_one_users_see(self):
        self.assertEqual(server.ADMIN_ONLY_SIGN_IN_MESSAGE, "Only admin accounts can sign in.")


if __name__ == "__main__":
    unittest.main()
