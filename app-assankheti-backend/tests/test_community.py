"""
Comprehensive test suite for the community / marketplace messaging module.

Consolidates coverage that was previously split across:
  - tests/test_community_helpers.py   (Pieces 2 + 12)
  - tests/test_offers.py              (Piece 7)

and adds the Piece 13 additions:
  - Auto-join hook (Piece 6)
  - Socket auth happy/sad paths (Piece 4)

Tests use lightweight in-memory stubs rather than a real Mongo/Socket.IO
server, so the suite runs in <1 s and has no external dependencies.
"""
from __future__ import annotations

import asyncio
import unittest
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app.api.v1.endpoints import community_dm, community_offers, deviceSettings
from app.models.collections import (
    COMMUNITY_BLOCKS_COLLECTION,
    COMMUNITY_CONVERSATIONS_COLLECTION,
    COMMUNITY_GROUP_MEMBERS_COLLECTION,
    COMMUNITY_GROUPS_COLLECTION,
)
from app.schemas.community import MessageCreate, OfferCreate
from app.schemas.crop_selections import cropSelectionCreate
from app.services import community_helpers as helpers_module
from app.services import socket_gateway


# ---------- Tiny in-memory Mongo stub ----------

def _matches(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    if "$or" in query:
        return any(_matches(doc, sub) for sub in query["$or"])
    for k, v in query.items():
        if isinstance(v, dict) and "$in" in v:
            if doc.get(k) not in v["$in"]:
                return False
        elif doc.get(k) != v:
            return False
    return True


class FakeCollection:
    def __init__(self) -> None:
        self.docs: List[Dict[str, Any]] = []

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for d in self.docs:
            if _matches(d, query):
                return dict(d)
        return None

    async def insert_one(self, doc: Dict[str, Any]):
        self.docs.append(dict(doc))

        class _R:
            inserted_id = doc.get("_id")
        return _R()

    async def update_one(self, query, update, upsert=False):
        class _R:
            matched_count = 0
            modified_count = 0
        for d in self.docs:
            if _matches(d, query):
                if "$set" in update:
                    d.update(update["$set"])
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        d[k] = (d.get(k) or 0) + v
                _R.matched_count = 1
                _R.modified_count = 1
                return _R()
        if upsert:
            doc = {**query}
            if "$setOnInsert" in update:
                doc.update(update["$setOnInsert"])
            if "$set" in update:
                doc.update(update["$set"])
            self.docs.append(doc)
        return _R()

    def find(self, query: Dict[str, Any] = None, projection=None):
        query = query or {}
        results = [dict(d) for d in self.docs if _matches(d, query)]

        class _Cursor:
            def __init__(self, items):
                self._items = items

            def __aiter__(self):
                async def gen():
                    for x in self._items:
                        yield x
                return gen()
        return _Cursor(results)


class FakeDB:
    def __init__(self) -> None:
        self.collections: Dict[str, FakeCollection] = {}

    def __getitem__(self, name: str) -> FakeCollection:
        if name not in self.collections:
            self.collections[name] = FakeCollection()
        return self.collections[name]


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------- Conversations & blocks (Piece 2 helpers) ----------

class GetOrCreateDMConversationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fake_db = FakeDB()
        self._original_db = helpers_module.db
        helpers_module.db = self.fake_db

    def tearDown(self) -> None:
        helpers_module.db = self._original_db

    def test_idempotent_same_order(self) -> None:
        cid1 = run(helpers_module.get_or_create_dm_conversation("alice", "bob", "direct", None))
        cid2 = run(helpers_module.get_or_create_dm_conversation("alice", "bob", "direct", None))
        self.assertEqual(cid1, cid2)
        self.assertEqual(len(self.fake_db[COMMUNITY_CONVERSATIONS_COLLECTION].docs), 1)

    def test_idempotent_reversed_order(self) -> None:
        cid_ab = run(helpers_module.get_or_create_dm_conversation("alice", "bob", "product", "p1"))
        cid_ba = run(helpers_module.get_or_create_dm_conversation("bob", "alice", "product", "p1"))
        self.assertEqual(cid_ab, cid_ba)

    def test_participants_stored_sorted(self) -> None:
        run(helpers_module.get_or_create_dm_conversation("zeta", "alpha", "direct", None))
        doc = self.fake_db[COMMUNITY_CONVERSATIONS_COLLECTION].docs[0]
        self.assertEqual(doc["participants"], ["alpha", "zeta"])

    def test_different_pairs_distinct(self) -> None:
        cid1 = run(helpers_module.get_or_create_dm_conversation("alice", "bob", "direct", None))
        cid2 = run(helpers_module.get_or_create_dm_conversation("alice", "carol", "direct", None))
        self.assertNotEqual(cid1, cid2)

    def test_missing_user_raises(self) -> None:
        with self.assertRaises(ValueError):
            run(helpers_module.get_or_create_dm_conversation("", "bob", None, None))


class IsBlockedTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fake_db = FakeDB()
        self._original_db = helpers_module.db
        helpers_module.db = self.fake_db

    def tearDown(self) -> None:
        helpers_module.db = self._original_db

    def _add_block(self, blocker: str, blocked: str) -> None:
        self.fake_db[COMMUNITY_BLOCKS_COLLECTION].docs.append({
            "blocker_id": blocker, "blocked_id": blocked,
        })

    def test_no_block(self) -> None:
        self.assertFalse(run(helpers_module.is_blocked("alice", "bob")))

    def test_blocks_forward(self) -> None:
        self._add_block("alice", "bob")
        self.assertTrue(run(helpers_module.is_blocked("alice", "bob")))

    def test_blocks_reverse(self) -> None:
        self._add_block("alice", "bob")
        self.assertTrue(run(helpers_module.is_blocked("bob", "alice")))

    def test_unrelated_block_does_not_match(self) -> None:
        self._add_block("alice", "carol")
        self.assertFalse(run(helpers_module.is_blocked("alice", "bob")))

    def test_empty_input_returns_false(self) -> None:
        self.assertFalse(run(helpers_module.is_blocked("", "bob")))
        self.assertFalse(run(helpers_module.is_blocked("alice", "")))


class BuildNotificationTests(unittest.TestCase):
    def test_dm_template_filled(self) -> None:
        n = helpers_module.build_notification("u1", "dm", sender_name="Hafiz")
        self.assertEqual(n["recipient_id"], "u1")
        self.assertEqual(n["type"], "dm")
        self.assertIn("Hafiz", n["body_en"])
        self.assertIn("Hafiz", n["body_ur"])
        self.assertFalse(n["read"])

    def test_offer_accepted_no_placeholders(self) -> None:
        n = helpers_module.build_notification("u1", "offer_accepted")
        self.assertEqual(n["title_en"], "Offer accepted")
        self.assertEqual(n["body_en"], "Your offer was accepted")

    def test_unknown_type_raises(self) -> None:
        with self.assertRaises(ValueError):
            helpers_module.build_notification("u1", "not_a_real_type")

    def test_missing_placeholder_does_not_raise(self) -> None:
        n = helpers_module.build_notification("u1", "dm")
        self.assertIn("{sender_name}", n["body_en"])


# ---------- Offer state machine (Piece 7) ----------

def _offer(status: str = "pending", buyer: str = "buyer", seller: str = "seller"):
    return {
        "offer_id": "o1", "product_id": "p1",
        "buyer_id": buyer, "seller_id": seller, "status": status,
    }


class OfferStateMachineTests(unittest.TestCase):
    def test_seller_can_accept_pending(self) -> None:
        community_offers._validate_offer_action(_offer("pending"), "accept", "seller")

    def test_seller_can_reject_pending(self) -> None:
        community_offers._validate_offer_action(_offer("pending"), "reject", "seller")

    def test_buyer_can_withdraw_pending(self) -> None:
        community_offers._validate_offer_action(_offer("pending"), "withdraw", "buyer")

    def _expect_403(self, offer, action, actor) -> None:
        with self.assertRaises(HTTPException) as cm:
            community_offers._validate_offer_action(offer, action, actor)
        self.assertEqual(cm.exception.status_code, 403)

    def _expect_400(self, offer, action, actor) -> None:
        with self.assertRaises(HTTPException) as cm:
            community_offers._validate_offer_action(offer, action, actor)
        self.assertEqual(cm.exception.status_code, 400)

    def test_buyer_cannot_accept(self) -> None:
        self._expect_403(_offer("pending"), "accept", "buyer")

    def test_buyer_cannot_reject(self) -> None:
        self._expect_403(_offer("pending"), "reject", "buyer")

    def test_seller_cannot_withdraw(self) -> None:
        self._expect_403(_offer("pending"), "withdraw", "seller")

    def test_third_party_cannot_accept(self) -> None:
        self._expect_403(_offer("pending"), "accept", "stranger")

    def test_third_party_cannot_withdraw(self) -> None:
        self._expect_403(_offer("pending"), "withdraw", "stranger")

    def test_double_accept_rejected(self) -> None:
        self._expect_400(_offer("accepted"), "accept", "seller")

    def test_accept_after_reject_rejected(self) -> None:
        self._expect_400(_offer("rejected"), "accept", "seller")

    def test_reject_after_accept_rejected(self) -> None:
        self._expect_400(_offer("accepted"), "reject", "seller")

    def test_withdraw_after_accept_rejected(self) -> None:
        self._expect_400(_offer("accepted"), "withdraw", "buyer")

    def test_withdraw_already_expired_rejected(self) -> None:
        self._expect_400(_offer("expired"), "withdraw", "buyer")

    def test_unknown_action_400(self) -> None:
        self._expect_400(_offer("pending"), "approve", "seller")


# ---------- Block enforcement in HTTP route handlers (Piece 12) ----------

class BlockEnforcementInRouteHandlers(unittest.TestCase):
    def test_dm_send_returns_403_when_blocked(self) -> None:
        async def go():
            payload = MessageCreate(recipient_id="other", body="hi")
            with patch.object(community_dm, "is_blocked", new=AsyncMock(return_value=True)):
                with self.assertRaises(HTTPException) as cm:
                    await community_dm.dm_send(payload, sender_id="me")
                self.assertEqual(cm.exception.status_code, 403)
        run(go())

    def test_offer_create_returns_403_when_blocked(self) -> None:
        async def go():
            payload = OfferCreate(
                product_id="p1", seller_id="seller",
                price=1000, quantity=10, unit="kg",
            )
            with patch.object(community_offers, "is_blocked", new=AsyncMock(return_value=True)):
                with self.assertRaises(HTTPException) as cm:
                    await community_offers.offer_create(payload, buyer_id="buyer")
                self.assertEqual(cm.exception.status_code, 403)
        run(go())


# ---------- Auto-join hook (Piece 6) ----------

class AutoJoinHookTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fake_db = FakeDB()
        self._original_ds_db = deviceSettings.db
        deviceSettings.db = self.fake_db
        # Pre-seed the Rice group
        self.fake_db[COMMUNITY_GROUPS_COLLECTION].docs.append({
            "group_id": "grp-rice",
            "crop": "rice",
            "name_en": "Rice",
            "name_ur": "چاول",
            "member_count": 0,
        })

    def tearDown(self) -> None:
        deviceSettings.db = self._original_ds_db

    def test_rice_user_added_to_member_collection(self) -> None:
        async def go():
            # Lazy notify import inside the helper — patch it out so we don't
            # hit the socket gateway during this unit test.
            with patch("app.services.notifications.notify", new=AsyncMock()):
                await deviceSettings._auto_join_community_groups("u1", ["rice"])
        run(go())
        members = self.fake_db[COMMUNITY_GROUP_MEMBERS_COLLECTION].docs
        self.assertEqual(len(members), 1)
        self.assertEqual(members[0]["group_id"], "grp-rice")
        self.assertEqual(members[0]["mobile_id"], "u1")

    def test_unknown_crop_is_silent_noop(self) -> None:
        async def go():
            with patch("app.services.notifications.notify", new=AsyncMock()):
                await deviceSettings._auto_join_community_groups("u1", ["wheat"])
        run(go())
        self.assertEqual(self.fake_db[COMMUNITY_GROUP_MEMBERS_COLLECTION].docs, [])

    def test_repeat_join_does_not_double_insert(self) -> None:
        async def go():
            with patch("app.services.notifications.notify", new=AsyncMock()):
                await deviceSettings._auto_join_community_groups("u1", ["rice"])
                await deviceSettings._auto_join_community_groups("u1", ["rice"])
        run(go())
        self.assertEqual(len(self.fake_db[COMMUNITY_GROUP_MEMBERS_COLLECTION].docs), 1)


# ---------- Socket auth (Piece 4) ----------

class SocketAuthTests(unittest.TestCase):
    """Cover the `connect` handler's auth path with a stubbed sio + db."""

    def test_decode_token_rejects_garbage(self) -> None:
        self.assertIsNone(socket_gateway._decode_token("not.a.valid.jwt"))

    def test_decode_token_rejects_empty(self) -> None:
        self.assertIsNone(socket_gateway._decode_token(""))
        self.assertIsNone(socket_gateway._decode_token(None))

    def test_decode_token_rejects_token_without_mobile_id(self) -> None:
        # Build a JWT that has no mobile_id claim
        from app.services.security import create_access_token
        token = create_access_token("u1", extra={"auth_via": "stytch_otp"})  # no mobile_id
        self.assertIsNone(socket_gateway._decode_token(token))

    def test_decode_token_accepts_valid(self) -> None:
        from app.services.security import create_access_token
        token = create_access_token("u1", extra={"mobile_id": "mob-1", "auth_via": "stytch_otp"})
        self.assertEqual(socket_gateway._decode_token(token), "mob-1")

    def test_connect_with_invalid_token_returns_false(self) -> None:
        async def go():
            with patch.object(socket_gateway, "sio") as fake_sio, \
                 patch.object(socket_gateway, "db", new=FakeDB()):
                fake_sio.emit = AsyncMock()
                fake_sio.save_session = AsyncMock()
                fake_sio.enter_room = AsyncMock()
                result = await socket_gateway.connect("sid-bad", {}, {"token": "garbage"})
            self.assertFalse(result)
        run(go())

    def test_connect_with_valid_token_joins_user_room(self) -> None:
        from app.services.security import create_access_token
        async def go():
            token = create_access_token("u1", extra={"mobile_id": "mob-ok", "auth_via": "stytch_otp"})
            fake_sio = MagicMock()
            fake_sio.emit = AsyncMock()
            fake_sio.save_session = AsyncMock()
            fake_sio.enter_room = AsyncMock()
            with patch.object(socket_gateway, "sio", new=fake_sio), \
                 patch.object(socket_gateway, "db", new=FakeDB()):
                result = await socket_gateway.connect("sid-ok", {}, {"token": token})

            self.assertTrue(result)
            # save_session was called with the mobile_id
            fake_sio.save_session.assert_awaited()
            saved_args, saved_kwargs = fake_sio.save_session.call_args
            self.assertEqual(saved_args[0], "sid-ok")
            self.assertEqual(saved_args[1]["mobile_id"], "mob-ok")
            # enter_room was called with the user room
            room_calls = [c.args for c in fake_sio.enter_room.await_args_list]
            self.assertIn(("sid-ok", "user:mob-ok"), room_calls)
        run(go())


if __name__ == "__main__":
    unittest.main()
