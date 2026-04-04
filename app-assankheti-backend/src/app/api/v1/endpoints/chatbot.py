import os
import re
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from app.db.db_connection import get_database
from app.models.collections import CHAT_MESSAGES_COLLECTION

load_dotenv()

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
db = get_database()

SYSTEM_PROMPT = """You are "Assan Kheti AI", a friendly and knowledgeable farming assistant for Pakistani farmers.

Your expertise includes:
- Crop diseases, identification and treatments
- Fertilizer recommendations and dosages
- Pesticide usage and safety
- Weather-based farming advice
- Mandi/market prices and selling tips
- Irrigation and water management
- Government agricultural schemes in Pakistan
- Crop rotation and seasonal planning

Guidelines:
- Be concise and practical — farmers need actionable advice
- Use simple language; avoid overly technical jargon
- If the user writes in Urdu/Roman Urdu, respond in the same language
- If the user writes in English, respond in English
- Always be respectful and encouraging
- For disease identification, ask for symptoms or photos if unclear
- Include specific product names, dosages, and timings when recommending treatments
- Mention local Pakistani brands/products when possible
- If you don't know something, say so honestly and suggest consulting a local agriculture officer
- NEVER use emojis, special characters, or symbols like arrows, stars, or bullet symbols in your responses
- Use plain text only. Use numbered lists (1, 2, 3) or dashes (-) for lists
- Do not use bold, italic, or any markdown formatting
"""


def clean_reply(raw: str) -> str:
    text = re.sub(
        r'[\U0001F600-\U0001F9FF\U0001FA00-\U0001FAFF\U00002702-\U000027B0'
        r'\U0000FE00-\U0000FE0F\U0000200D\U00002600-\U000026FF'
        r'\U00002B50-\U00002B55\U0000203C-\U00003299\U0001F100-\U0001F1FF'
        r'\U0001F200-\U0001F5FF\U0001F680-\U0001F6FF\U0001F900-\U0001F9FF'
        r'\U00002300-\U000023FF\U000025A0-\U000025FF\U00002190-\U000021FF'
        r'\U00002794-\U00002799\U0000FE30-\U0000FE4F\*#]+',
        '', raw
    ).strip()
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text


class ChatRequest(BaseModel):
    message: str
    mobile_id: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


# ── Send message ──
@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session_id = req.session_id or str(uuid.uuid4())

    # Load last 10 messages from this session for context
    history_cursor = db[CHAT_MESSAGES_COLLECTION].find(
        {"mobile_id": req.mobile_id, "session_id": session_id},
        {"_id": 0, "sender": 1, "text": 1}
    ).sort("created_at", -1).limit(10)

    history_docs = await history_cursor.to_list(length=10)
    history_docs.reverse()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history_docs:
        role = "assistant" if msg.get("sender") == "ai" else "user"
        messages.append({"role": role, "content": msg.get("text", "")})
    messages.append({"role": "user", "content": req.message})

    now = datetime.utcnow()
    time_str = now.strftime("%I:%M %p")

    # Generate title from first user message in a new session
    is_first = len(history_docs) == 0
    title = req.message[:60] if is_first else None

    # Save user message
    await db[CHAT_MESSAGES_COLLECTION].insert_one({
        "mobile_id": req.mobile_id,
        "session_id": session_id,
        "sender": "user",
        "text": req.message,
        "time": time_str,
        "created_at": now,
    })

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        raw = response.choices[0].message.content or "Sorry, I could not generate a response."
        reply = clean_reply(raw)
    except Exception as e:
        reply = f"AI service error: {str(e)}"

    ai_now = datetime.utcnow()
    ai_time_str = ai_now.strftime("%I:%M %p")

    # Save AI response
    await db[CHAT_MESSAGES_COLLECTION].insert_one({
        "mobile_id": req.mobile_id,
        "session_id": session_id,
        "sender": "ai",
        "text": reply,
        "time": ai_time_str,
        "created_at": ai_now,
    })

    # Update session title if first message
    if is_first and title:
        await db["chat_sessions"].update_one(
            {"mobile_id": req.mobile_id, "session_id": session_id},
            {"$set": {
                "mobile_id": req.mobile_id,
                "session_id": session_id,
                "title": title,
                "created_at": now,
                "updated_at": ai_now,
            }},
            upsert=True,
        )
    else:
        await db["chat_sessions"].update_one(
            {"mobile_id": req.mobile_id, "session_id": session_id},
            {"$set": {"updated_at": ai_now}},
        )

    return ChatResponse(reply=reply, session_id=session_id)


# ── Get all sessions (grouped by day) ──
@router.get("/sessions/{mobile_id}")
async def get_sessions(mobile_id: str):
    cursor = db["chat_sessions"].find(
        {"mobile_id": mobile_id},
        {"_id": 0, "session_id": 1, "title": 1, "created_at": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(100)

    docs = await cursor.to_list(length=100)

    grouped: dict[str, list] = {}
    today = datetime.utcnow().date()

    for doc in docs:
        created = doc.get("created_at", datetime.utcnow())
        d = created.date()
        if d == today:
            label = "Today"
        elif (today - d).days == 1:
            label = "Yesterday"
        elif (today - d).days < 7:
            label = "This Week"
        elif (today - d).days < 30:
            label = "This Month"
        else:
            label = created.strftime("%B %Y")

        if label not in grouped:
            grouped[label] = []

        grouped[label].append({
            "session_id": doc["session_id"],
            "title": doc.get("title", "Untitled Chat"),
            "created_at": created.isoformat(),
            "updated_at": doc.get("updated_at", created).isoformat(),
        })

    return {"groups": grouped}


# ── Get messages for a session ──
@router.get("/history/{mobile_id}/{session_id}")
async def get_session_history(mobile_id: str, session_id: str, limit: int = 100):
    cursor = db[CHAT_MESSAGES_COLLECTION].find(
        {"mobile_id": mobile_id, "session_id": session_id},
        {"_id": 0, "sender": 1, "text": 1, "time": 1, "created_at": 1}
    ).sort("created_at", 1).limit(limit)

    docs = await cursor.to_list(length=limit)
    messages = []
    for doc in docs:
        messages.append({
            "sender": doc["sender"],
            "text": doc["text"],
            "time": doc.get("time", ""),
            "created_at": doc["created_at"].isoformat() if doc.get("created_at") else "",
        })
    return {"messages": messages}


# ── Get all messages (legacy — no session filter) ──
@router.get("/history/{mobile_id}")
async def get_chat_history(mobile_id: str, limit: int = 50):
    cursor = db[CHAT_MESSAGES_COLLECTION].find(
        {"mobile_id": mobile_id},
        {"_id": 0, "sender": 1, "text": 1, "time": 1, "created_at": 1}
    ).sort("created_at", 1).limit(limit)

    docs = await cursor.to_list(length=limit)
    messages = []
    for doc in docs:
        messages.append({
            "sender": doc["sender"],
            "text": doc["text"],
            "time": doc.get("time", ""),
            "created_at": doc["created_at"].isoformat() if doc.get("created_at") else "",
        })
    return {"messages": messages}


# ── Delete a session ──
@router.delete("/session/{mobile_id}/{session_id}")
async def delete_session(mobile_id: str, session_id: str):
    await db[CHAT_MESSAGES_COLLECTION].delete_many({"mobile_id": mobile_id, "session_id": session_id})
    await db["chat_sessions"].delete_one({"mobile_id": mobile_id, "session_id": session_id})
    return {"deleted": True}


# ── Delete all history ──
@router.delete("/history/{mobile_id}")
async def clear_chat_history(mobile_id: str):
    r1 = await db[CHAT_MESSAGES_COLLECTION].delete_many({"mobile_id": mobile_id})
    await db["chat_sessions"].delete_many({"mobile_id": mobile_id})
    return {"deleted": r1.deleted_count}
