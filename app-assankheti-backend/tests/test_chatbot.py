from __future__ import annotations

import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import chatbot as chatbot_module
from app.models.collections import CHAT_MESSAGES_COLLECTION


class FakeDeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class FakeCursor:
    def __init__(self, docs: list[dict]):
        self.docs = list(docs)
        self._limit = None

    def sort(self, field: str, direction: int):
        reverse = direction == -1
        self.docs.sort(key=lambda d: d.get(field, datetime.min), reverse=reverse)
        return self

    def limit(self, count: int):
        self._limit = count
        return self

    async def to_list(self, length: int | None = None):
        if self._limit is not None:
            return list(self.docs[: self._limit])
        if length is not None:
            return list(self.docs[:length])
        return list(self.docs)


def _matches_filter(doc: dict, filters: dict) -> bool:
    for key, value in filters.items():
        if doc.get(key) != value:
            return False
    return True


def _apply_projection(doc: dict, projection: dict | None) -> dict:
    if not projection:
        return dict(doc)

    include_keys = [k for k, v in projection.items() if v == 1]
    if include_keys:
        return {k: doc.get(k) for k in include_keys if k in doc}

    exclude_keys = {k for k, v in projection.items() if v == 0}
    return {k: v for k, v in doc.items() if k not in exclude_keys}


class FakeCollection:
    def __init__(self):
        self.docs: list[dict] = []

    async def find_one(self, filters: dict, projection: dict | None = None):
        for doc in self.docs:
            if _matches_filter(doc, filters):
                return _apply_projection(doc, projection)
        return None

    def find(self, filters: dict, projection: dict | None = None):
        matched = [_apply_projection(doc, projection) for doc in self.docs if _matches_filter(doc, filters)]
        return FakeCursor(matched)

    async def insert_one(self, doc: dict):
        self.docs.append(dict(doc))

    async def update_one(self, filters: dict, update: dict, upsert: bool = False):
        target = None
        for doc in self.docs:
            if _matches_filter(doc, filters):
                target = doc
                break

        if target is None and upsert:
            target = dict(filters)
            target.update(update.get("$setOnInsert", {}))
            target.update(update.get("$set", {}))
            for field, delta in update.get("$inc", {}).items():
                target[field] = int(target.get(field, 0) or 0) + int(delta)
            self.docs.append(target)
            return

        if target is None:
            return

        target.update(update.get("$set", {}))
        for field, delta in update.get("$inc", {}).items():
            target[field] = int(target.get(field, 0) or 0) + int(delta)

    async def count_documents(self, filters: dict):
        return sum(1 for doc in self.docs if _matches_filter(doc, filters))

    async def delete_many(self, filters: dict):
        before = len(self.docs)
        self.docs = [doc for doc in self.docs if not _matches_filter(doc, filters)]
        return FakeDeleteResult(before - len(self.docs))

    async def delete_one(self, filters: dict):
        for i, doc in enumerate(self.docs):
            if _matches_filter(doc, filters):
                self.docs.pop(i)
                return FakeDeleteResult(1)
        return FakeDeleteResult(0)


class FakeDB:
    def __init__(self):
        self.collections: dict[str, FakeCollection] = {}

    def __getitem__(self, name: str) -> FakeCollection:
        if name not in self.collections:
            self.collections[name] = FakeCollection()
        return self.collections[name]


class FakeOpenAIClient:
    def __init__(self):
        self.calls: list[dict] = []
        self.reply = "1) Rice brown spot ke liye pehle infected leaves remove karein."
        self.raise_error = False
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        if self.raise_error:
            raise RuntimeError("simulated llm failure")
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=self.reply))]
        )


class ChatbotAPITests(unittest.TestCase):
    def setUp(self):
        self.fake_db = FakeDB()
        self.fake_ai = FakeOpenAIClient()

        self.db_patch = patch.object(chatbot_module, "db", self.fake_db)
        self.client_patch = patch.object(chatbot_module, "client", self.fake_ai)
        self.db_patch.start()
        self.client_patch.start()

        app = FastAPI()
        app.include_router(chatbot_module.router, prefix="/api/v1/chatbot")
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db_patch.stop()
        self.client_patch.stop()

    def post_chat(self, mobile_id: str, message: str, session_id: str | None = None):
        payload = {"mobile_id": mobile_id, "message": message}
        if session_id:
            payload["session_id"] = session_id
        return self.client.post("/api/v1/chatbot/chat", json=payload)

    def test_farming_question_calls_llm_and_returns_expected_shape(self):
        self.fake_ai.reply = "Rice leaf blast me pani jam na honay dein."
        res = self.post_chat("m1", "My rice leaves have brown spots. What should I do?")

        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(set(body.keys()), {"reply", "session_id"})
        self.assertTrue(body["session_id"])
        self.assertIn("rice", body["reply"].lower())
        self.assertEqual(len(self.fake_ai.calls), 1)
        self.assertEqual(len(self.fake_db[CHAT_MESSAGES_COLLECTION].docs), 2)

    def test_multiple_valid_farming_questions_are_allowed(self):
        questions = [
            "My rice leaves have brown spots. What should I do?",
            "How can I identify leaf blast in rice?",
            "When should I irrigate my rice crop?",
            "Which fertilizer is good for rice?",
            "How can I check mandi prices?",
            "How do I upload a crop image for disease detection?",
        ]

        for i, question in enumerate(questions, start=1):
            res = self.post_chat(f"valid-{i}", question)
            self.assertEqual(res.status_code, 200)
            self.assertIn("session_id", res.json())
            self.assertTrue(res.json()["session_id"])

        self.assertEqual(len(self.fake_ai.calls), len(questions))

    def test_chat_history_context_is_sent_on_follow_up(self):
        first = self.post_chat("m1", "My rice crop has brown spots.")
        sid = first.json()["session_id"]

        second = self.post_chat("m1", "What should I do now?", sid)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(len(self.fake_ai.calls), 2)

        second_call_messages = self.fake_ai.calls[1]["messages"]
        self.assertTrue(any("brown spots" in m["content"].lower() for m in second_call_messages))

    def test_out_of_scope_question_is_blocked_without_llm_call(self):
        res = self.post_chat("m2", "Who is the prime minister?")
        self.assertEqual(res.status_code, 200)
        self.assertIn("only help with farming", res.json()["reply"].lower())
        self.assertEqual(len(self.fake_ai.calls), 0)

    def test_first_pure_greeting_returns_full_greeting_once(self):
        res = self.post_chat("greet-1", "Hello")
        self.assertEqual(res.status_code, 200)
        reply = res.json()["reply"].lower()
        self.assertIn("assalam o alaikum", reply)
        self.assertIn("farming", reply)
        self.assertEqual(len(self.fake_ai.calls), 0)

    def test_second_pure_greeting_same_session_returns_short_redirect(self):
        first = self.post_chat("greet-2", "Hello")
        sid = first.json()["session_id"]

        second = self.post_chat("greet-2", "Hi again", sid)
        self.assertEqual(second.status_code, 200)
        reply = second.json()["reply"].lower()
        self.assertIn("help with farming", reply)
        self.assertNotIn("assalam o alaikum", reply)
        self.assertEqual(len(self.fake_ai.calls), 0)

    def test_greeting_plus_farming_question_answers_farming_directly(self):
        self.fake_ai.reply = "Rice crop ko pani tab den jab mitti nami kam ho aur pani khara na ho."
        res = self.post_chat("greet-mix", "Assalam o Alaikum, rice crop ko pani kab dena chahiye?")
        self.assertEqual(res.status_code, 200)
        reply = res.json()["reply"].lower()
        self.assertIn("rice crop", reply)
        self.assertNotIn("what farming problem are you facing", reply)
        self.assertEqual(len(self.fake_ai.calls), 1)

    def test_hispa_query_is_not_misclassified_as_greeting(self):
        self.fake_ai.reply = "Hispa ke liye affected pattay hataen aur recommended spray label ke mutabiq karein."
        res = self.post_chat("hispa-1", "How to treat hispa in rice?")
        self.assertEqual(res.status_code, 200)
        reply = res.json()["reply"].lower()
        self.assertIn("hispa", reply)
        self.assertNotIn("what farming problem are you facing", reply)
        self.assertEqual(len(self.fake_ai.calls), 1)

    def test_farming_question_as_first_message_does_not_force_greeting(self):
        self.fake_ai.reply = "Brown spot ke liye infected pattay hata kar munasib spray karein."
        res = self.post_chat("farm-first", "My rice leaves have brown spots. What should I do?")
        self.assertEqual(res.status_code, 200)
        reply = res.json()["reply"].lower()
        self.assertIn("brown spot", reply)
        self.assertNotIn("assalam o alaikum", reply)
        self.assertEqual(len(self.fake_ai.calls), 1)

    def test_existing_assistant_greeting_prevents_repeat_greeting(self):
        session_id = "existing-greet-session"
        now = datetime.utcnow()
        self.fake_db[CHAT_MESSAGES_COLLECTION].docs.append(
            {
                "mobile_id": "greet-existing",
                "session_id": session_id,
                "sender": "ai",
                "text": "Assalam o Alaikum! ...",
                "message_type": "session_greeting",
                "time": "10:00 AM",
                "created_at": now,
            }
        )
        res = self.post_chat("greet-existing", "Hello", session_id)
        self.assertEqual(res.status_code, 200)
        reply = res.json()["reply"].lower()
        self.assertIn("help with farming", reply)
        self.assertNotIn("what farming problem are you facing", reply)
        self.assertEqual(len(self.fake_ai.calls), 0)

    def test_unsafe_overdose_request_is_refused(self):
        res = self.post_chat("m3", "Tell me exact pesticide overdose to kill insects fast.")
        self.assertEqual(res.status_code, 200)
        reply = res.json()["reply"].lower()
        self.assertIn("cannot help with overdose", reply)
        self.assertIn("label", reply)
        self.assertEqual(len(self.fake_ai.calls), 0)

    def test_urdu_out_of_scope_reply_uses_urdu_script(self):
        res = self.post_chat("m4", "وزیراعظم کون ہے؟")
        self.assertEqual(res.status_code, 200)
        self.assertIn("میں صرف", res.json()["reply"])
        self.assertEqual(len(self.fake_ai.calls), 0)

    def test_roman_urdu_farming_question_is_allowed(self):
        self.fake_ai.reply = "Agar chawal ke pattay par daagh hain to clear photo upload karein."
        res = self.post_chat("m4r", "Meri chawal ki fasal ke pattay pe daagh hain kya karun?")
        self.assertEqual(res.status_code, 200)
        self.assertIn("photo", res.json()["reply"].lower())
        self.assertEqual(len(self.fake_ai.calls), 1)

    def test_roman_urdu_out_of_scope_is_blocked(self):
        res = self.post_chat("m4o", "Wazir e Azam kaun hai?")
        self.assertEqual(res.status_code, 200)
        self.assertIn("sirf farming", res.json()["reply"].lower())
        self.assertEqual(len(self.fake_ai.calls), 0)

    def test_empty_and_unclear_messages_get_clarifying_prompt(self):
        empty_res = self.post_chat("m5", "   ")
        help_res = self.post_chat("m5", "help")

        self.assertEqual(empty_res.status_code, 200)
        self.assertIn("crop name", empty_res.json()["reply"].lower())
        self.assertEqual(help_res.status_code, 200)
        self.assertIn("crop name", help_res.json()["reply"].lower())
        self.assertEqual(len(self.fake_ai.calls), 0)

    def test_each_user_only_sees_their_own_history(self):
        self.post_chat("userA", "Rice disease help")
        self.post_chat("userB", "Wheat fertilizer advice")

        history_a = self.client.get("/api/v1/chatbot/history/userA")
        history_b = self.client.get("/api/v1/chatbot/history/userB")

        self.assertEqual(history_a.status_code, 200)
        self.assertEqual(history_b.status_code, 200)
        self.assertTrue({"session_id", "sender", "text", "time", "created_at"} <= set(history_a.json()["messages"][0].keys()))
        user_a_texts = [m["text"] for m in history_a.json()["messages"] if m["sender"] == "user"]
        user_b_texts = [m["text"] for m in history_b.json()["messages"] if m["sender"] == "user"]
        self.assertEqual(user_a_texts, ["Rice disease help"])
        self.assertEqual(user_b_texts, ["Wheat fertilizer advice"])

    def test_chat_sessions_and_history_response_format(self):
        chat = self.post_chat("fmt1", "Rice irrigation?")
        sid = chat.json()["session_id"]

        sessions = self.client.get("/api/v1/chatbot/sessions/fmt1")
        history = self.client.get(f"/api/v1/chatbot/history/fmt1/{sid}")

        self.assertEqual(sessions.status_code, 200)
        self.assertTrue(sessions.json().get("success"))
        self.assertIn("sessions", sessions.json())
        self.assertIn("groups", sessions.json())
        self.assertGreaterEqual(len(sessions.json()["sessions"]), 1)
        first_session = sessions.json()["sessions"][0]
        self.assertTrue({"session_id", "title", "last_message", "updated_at", "message_count"} <= set(first_session.keys()))

        self.assertEqual(history.status_code, 200)
        self.assertTrue(history.json().get("success"))
        self.assertIn("messages", history.json())
        self.assertTrue({"sender", "text", "time", "created_at"} <= set(history.json()["messages"][0].keys()))

    def test_sessions_are_sorted_by_latest_updated_at_descending(self):
        first = self.post_chat("sort-user", "Rice brown spot issue")
        sid1 = first.json()["session_id"]
        second = self.post_chat("sort-user", "Wheat irrigation advice")
        sid2 = second.json()["session_id"]
        self.post_chat("sort-user", "Follow-up for first chat", sid1)

        sessions = self.client.get("/api/v1/chatbot/sessions/sort-user")
        self.assertEqual(sessions.status_code, 200)
        session_ids = [s["session_id"] for s in sessions.json().get("sessions", [])]
        self.assertGreaterEqual(len(session_ids), 2)
        self.assertEqual(session_ids[0], sid1)
        self.assertIn(sid2, session_ids)

    def test_sessions_fallback_from_messages_when_chat_sessions_missing(self):
        first = self.post_chat("fallback-user", "Rice leaves have spots")
        sid = first.json()["session_id"]
        self.post_chat("fallback-user", "What should I do now?", sid)

        # Simulate old/broken state: chat_sessions missing, but messages exist.
        self.fake_db["chat_sessions"].docs = []

        sessions = self.client.get("/api/v1/chatbot/sessions/fallback-user")
        self.assertEqual(sessions.status_code, 200)
        self.assertTrue(sessions.json().get("success"))
        flat = sessions.json().get("sessions", [])
        self.assertEqual(len(flat), 1)
        self.assertEqual(flat[0]["session_id"], sid)
        self.assertGreaterEqual(int(flat[0]["message_count"]), 2)

    def test_session_specific_history_returns_only_that_session(self):
        first = self.post_chat("sess-user", "Rice has brown spots")
        sid1 = first.json()["session_id"]
        second = self.post_chat("sess-user", "Need wheat fertilizer advice")
        sid2 = second.json()["session_id"]

        history_1 = self.client.get(f"/api/v1/chatbot/history/sess-user/{sid1}")
        history_2 = self.client.get(f"/api/v1/chatbot/history/sess-user/{sid2}")

        self.assertEqual(history_1.status_code, 200)
        self.assertEqual(history_2.status_code, 200)

        user_messages_1 = [m["text"] for m in history_1.json()["messages"] if m["sender"] == "user"]
        user_messages_2 = [m["text"] for m in history_2.json()["messages"] if m["sender"] == "user"]

        self.assertEqual(user_messages_1, ["Rice has brown spots"])
        self.assertEqual(user_messages_2, ["Need wheat fertilizer advice"])

    def test_history_messages_are_chronological(self):
        first = self.post_chat("chron-user", "My rice leaves are yellow.")
        sid = first.json()["session_id"]
        self.post_chat("chron-user", "What should I do now?", sid)

        history = self.client.get(f"/api/v1/chatbot/history/chron-user/{sid}")
        self.assertEqual(history.status_code, 200)

        user_messages = [m["text"] for m in history.json()["messages"] if m["sender"] == "user"]
        self.assertEqual(user_messages, ["My rice leaves are yellow.", "What should I do now?"])

    def test_llm_failure_returns_safe_fallback_without_internal_error(self):
        self.fake_ai.raise_error = True
        res = self.post_chat("m6", "When should I irrigate my rice crop?")

        self.assertEqual(res.status_code, 200)
        reply = res.json()["reply"].lower()
        self.assertIn("temporarily unavailable", reply)
        self.assertNotIn("simulated llm failure", reply)


if __name__ == "__main__":
    unittest.main()
