from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import stream_chat as stream_module
from app.core import stream as stream_core
from app.services.security import get_current_mobile_id


class FakeStreamError(Exception):
    def __init__(self, status_code=None, error_code=None):
        super().__init__("fake stream error")
        self.status_code = status_code
        self.error_code = error_code


class FakeChannel:
    def __init__(self, create_error=None):
        self.create_error = create_error
        self.created_with = None
        self.added_members = None
        self.updated_data = None

    def create(self, user_id):
        self.created_with = user_id
        if self.create_error:
            raise self.create_error

    def add_members(self, members):
        self.added_members = list(members)

    def update(self, data):
        self.updated_data = dict(data)


class FakeStreamClient:
    def __init__(self, channel=None):
        self.users = []
        self.channel_calls = []
        self.channel_obj = channel or FakeChannel()

    def create_token(self, user_id):
        return f"token-for-{user_id}"

    def upsert_user(self, user):
        self.users.append(dict(user))

    def channel(self, channel_type, channel_id, data):
        self.channel_calls.append((channel_type, channel_id, dict(data)))
        return self.channel_obj


class StreamChatEndpointTests(unittest.TestCase):
    def _client(self, mobile_id: str | None = "mob:123"):
        app = FastAPI()
        app.include_router(stream_module.router, prefix="/api/v1/stream")
        if mobile_id is not None:
            app.dependency_overrides[get_current_mobile_id] = lambda: mobile_id
        return TestClient(app)

    def test_stream_endpoints_require_auth(self):
        client = self._client(mobile_id=None)

        self.assertIn(client.get("/api/v1/stream/config").status_code, {401, 403})
        self.assertIn(client.post("/api/v1/stream/token", json={}).status_code, {401, 403})
        self.assertIn(
            client.post("/api/v1/stream/channels/direct", json={"member_id": "other"}).status_code,
            {401, 403},
        )
        self.assertIn(
            client.post(
                "/api/v1/stream/channels/community",
                json={"channel_id": "rice", "name": "Rice Farmers"},
            ).status_code,
            {401, 403},
        )

    def test_config_returns_public_keys_without_secret(self):
        client = self._client()
        with patch.object(stream_module, "STREAM_API_KEY", "public-key"), \
             patch.object(stream_module, "STREAM_APP_ID", "app-id"):
            res = client.get("/api/v1/stream/config")

        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json(), {"app_id": "app-id", "api_key": "public-key"})
        self.assertNotIn("secret", res.text.lower())

    def test_token_upserts_authenticated_user_and_returns_token(self):
        client = self._client("farmer:abc")
        with patch.object(stream_module, "STREAM_API_KEY", "public-key"), \
             patch.object(stream_module, "STREAM_APP_ID", "app-id"), \
             patch.object(stream_module, "upsert_stream_user") as upsert, \
             patch.object(stream_module, "create_stream_token", return_value="stream-token"):
            res = client.post("/api/v1/stream/token", json={"name": "Ali Farmer", "role": "farmer"})

        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["api_key"], "public-key")
        self.assertEqual(body["token"], "stream-token")
        self.assertEqual(body["user"]["id"], "farmer-abc")
        self.assertEqual(body["user"]["role"], "farmer")
        upsert.assert_called_once_with("farmer-abc", "Ali Farmer", "farmer", {"mobile_id": "farmer:abc"})

    def test_admin_role_requires_admin_mobile_id(self):
        client = self._client("regular-user")
        with patch.object(stream_core, "STREAM_ADMIN_MOBILE_IDS", set()), \
             patch.object(stream_module, "STREAM_API_KEY", "public-key"), \
             patch.object(stream_module, "upsert_stream_user"), \
             patch.object(stream_module, "create_stream_token", return_value="token"):
            res = client.post("/api/v1/stream/token", json={"role": "admin"})

        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["user"]["role"], "customer")

    def test_admin_mobile_id_receives_admin_role(self):
        client = self._client("admin-mobile")
        with patch.object(stream_core, "STREAM_ADMIN_MOBILE_IDS", {"admin-mobile"}), \
             patch.object(stream_module, "STREAM_API_KEY", "public-key"), \
             patch.object(stream_module, "upsert_stream_user"), \
             patch.object(stream_module, "create_stream_token", return_value="token"):
            res = client.post("/api/v1/stream/token", json={"role": "customer"})

        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["user"]["role"], "admin")

    def test_direct_channel_is_deterministic_and_rejects_self_chat(self):
        client = self._client("user-a")
        with patch.object(stream_module, "upsert_stream_user") as upsert, \
             patch.object(stream_module, "create_or_update_channel", return_value={"cid": "messaging:dm-user-a-user-b", "id": "dm-user-a-user-b", "type": "messaging"}) as create_channel:
            res = client.post("/api/v1/stream/channels/direct", json={"member_id": "user-b", "member_name": "Buyer"})

        self.assertEqual(res.status_code, 200, res.text)
        upsert.assert_called_once_with("user-b", "Buyer", "customer")
        create_channel.assert_called_once()
        args = create_channel.call_args.args
        self.assertEqual(args[1], "dm-user-a-user-b")
        self.assertEqual(args[3], ["user-a", "user-b"])

        self_chat = client.post("/api/v1/stream/channels/direct", json={"member_id": "user-a"})
        self.assertEqual(self_chat.status_code, 400)

    def test_community_channel_create_contract(self):
        client = self._client("mob-1")
        with patch.object(stream_module, "create_or_update_channel", return_value={"cid": "messaging:community-rice", "id": "community-rice", "type": "messaging"}) as create_channel:
            res = client.post(
                "/api/v1/stream/channels/community",
                json={"channel_id": "Rice Group!", "name": "Rice Farmers", "crop": "rice"},
            )

        self.assertEqual(res.status_code, 200, res.text)
        args = create_channel.call_args.args
        self.assertEqual(args[0], "messaging")
        self.assertEqual(args[1], "community-rice-group-")
        self.assertEqual(args[2], "mob-1")
        self.assertEqual(args[3], ["mob-1"])
        self.assertEqual(args[4]["assan_kheti_kind"], "community")

    def test_runtime_stream_errors_become_503_or_500(self):
        client = self._client()
        with patch.object(stream_module, "upsert_stream_user", side_effect=RuntimeError("missing env")):
            res = client.post("/api/v1/stream/token", json={})
        self.assertEqual(res.status_code, 503)

        with patch.object(stream_module, "create_or_update_channel", side_effect=Exception("boom")):
            res = client.post(
                "/api/v1/stream/channels/community",
                json={"channel_id": "rice", "name": "Rice Farmers"},
            )
        self.assertEqual(res.status_code, 500)


class StreamCoreTests(unittest.TestCase):
    def test_duplicate_channel_adds_members_and_updates_metadata(self):
        fake_channel = FakeChannel(create_error=FakeStreamError(status_code=409))
        fake_client = FakeStreamClient(channel=fake_channel)

        with patch.object(stream_core, "get_stream_client", return_value=fake_client):
            result = stream_core.create_or_update_channel(
                "messaging",
                "dm-a-b",
                "a",
                ["b", "a", "a"],
                {"name": "Direct conversation", "assan_kheti_kind": "direct"},
            )

        self.assertEqual(result, {"cid": "messaging:dm-a-b", "id": "dm-a-b", "type": "messaging"})
        self.assertEqual(fake_channel.added_members, ["a", "b"])
        self.assertEqual(fake_channel.updated_data["assan_kheti_kind"], "direct")

    def test_unexpected_stream_error_is_not_swallowed(self):
        fake_channel = FakeChannel(create_error=FakeStreamError(status_code=500))
        fake_client = FakeStreamClient(channel=fake_channel)

        with patch.object(stream_core, "get_stream_client", return_value=fake_client):
            with self.assertRaises(FakeStreamError):
                stream_core.create_or_update_channel("messaging", "bad", "a", ["a"], {})

    def test_normalizers_are_stable(self):
        self.assertEqual(stream_core.normalize_stream_user_id(" mobile:id "), "mobile-id")
        self.assertEqual(stream_core.normalize_channel_id("Rice Group!"), "rice-group-")
