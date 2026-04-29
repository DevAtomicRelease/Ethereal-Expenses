"""Chat endpoint — Conversational finance assistant powered by Qwen 3 via NVIDIA NIM."""

import json
import logging
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import settings
from app.data.models import User, Transaction
from app.dependencies import get_current_user
from app.services.insight_service import get_insights
from app.core.cache import get_cache

logger = logging.getLogger("beis.chat")

router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


CHAT_SYSTEM_PROMPT = (
    "You are a personal finance assistant built into an expense tracking app called AtomicShift. "
    "Users ask you questions about their own spending data, which is provided below as JSON context.\n\n"
    "IMPORTANT INSTRUCTIONS:\n"
    "1. ALWAYS reference the user's actual data. Quote specific amounts, categories, dates, and percentages.\n"
    "2. Use Indian Rupee (₹) with Indian comma formatting (e.g., ₹1,25,000 for lakhs).\n"
    "3. Keep responses SHORT: 2-4 sentences for factual questions, 1 short paragraph for advice.\n"
    "4. If the data doesn't contain enough information to answer, say so directly.\n"
    "5. NEVER fabricate numbers. Only use what appears in the provided context.\n"
    "6. Be direct and conversational. No corporate jargon. No emojis.\n"
    "7. For spending comparisons, calculate percentage differences.\n"
    "8. For advice questions, give 2-3 specific, actionable suggestions based on their actual spending patterns.\n"
    "9. Do NOT wrap your response in any XML tags. Just respond in plain text.\n"
    "10. Do NOT use markdown formatting like ** or ## in responses. Use plain text only.\n\n"
    "CONTEXT GUIDE:\n"
    "- 'category_breakdown_pct': each category's share of total spending (0-1 = 0%-100%)\n"
    "- 'recent_transactions': the user's most recent expenses with amounts, categories, and dates\n"
    "- 'total_spend_90d': total amount spent in the last 90 days\n"
    "- 'thresholds': the user's budget limits (daily, weekly, monthly)\n"
    "- 'time_pattern': when the user tends to spend (morning/afternoon/evening/night)\n"
)


@router.post("/chat")
async def chat(req: ChatRequest, user: User = Depends(get_current_user)):
    uid = str(user.id)

    # Gather user's financial context
    context = await _build_context(uid)
    system_message = CHAT_SYSTEM_PROMPT + f"\n--- USER FINANCIAL DATA ---\n{json.dumps(context, default=str)}\n---\n"

    # Build message history
    messages = [{"role": "system", "content": system_message}]

    if req.history:
        for msg in req.history[-8:]:  # Keep last 8 messages for context window
            messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": req.message})

    # Call NVIDIA NIM API
    payload = {
        "model": settings.NVIDIA_MODEL,
        "messages": messages,
        "temperature": 0.6,
        "top_p": 0.85,
        "max_tokens": 512,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }

    for attempt in range(settings.NVIDIA_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=settings.NVIDIA_TIMEOUT) as client:
                response = await client.post(
                    f"{settings.NVIDIA_API_URL}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()
                reply = data["choices"][0]["message"]["content"].strip()

                # Strip Qwen 3 thinking blocks and any XML tags
                import re
                reply = re.sub(r'<think>.*?</think>', '', reply, flags=re.DOTALL).strip()
                reply = re.sub(r'<reasoning>.*?</reasoning>', '', reply, flags=re.DOTALL).strip()
                reply = re.sub(r'<narrative>|</narrative>', '', reply).strip()
                # Remove markdown bold/headers
                reply = re.sub(r'\*\*(.+?)\*\*', r'\1', reply)
                reply = re.sub(r'^#+\s*', '', reply, flags=re.MULTILINE)

                return {"reply": reply, "status": "ok"}
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            logger.warning(f"Chat API attempt {attempt + 1} failed: {e}")
            if attempt < settings.NVIDIA_RETRIES:
                continue
            return {
                "reply": "I'm having trouble connecting right now. Please try again in a moment.",
                "status": "error",
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"Chat API HTTP error: {e.response.status_code} — {e.response.text[:300]}")
            return {
                "reply": "Something went wrong on my end. Please try again shortly.",
                "status": "error",
            }
        except Exception as e:
            logger.error(f"Chat API unexpected error: {e}")
            return {
                "reply": "I encountered an unexpected issue. Please try again.",
                "status": "error",
            }

    return {"reply": "Unable to process your request right now.", "status": "error"}


async def _build_context(uid: str) -> dict:
    """Build a compact financial context from cached data and recent transactions."""
    context = {}

    # Get insights (category breakdown, totals)
    try:
        insights = await get_insights(uid)
        if insights:
            context["total_spend_90d"] = insights.get("total_spend_90d", 0)
            context["txn_count_90d"] = insights.get("txn_count_90d", 0)
            context["category_breakdown_pct"] = insights.get("category_breakdown", {})
            context["time_pattern"] = insights.get("time_pattern", {})
            context["weekly_averages"] = insights.get("weekly_averages", {})
    except Exception:
        pass

    # Get cached intelligence results
    for key in ["identity", "momentum", "risk", "thresholds"]:
        try:
            cached = await get_cache(uid, key)
            if cached:
                context[key] = cached
        except Exception:
            pass

    # Get recent transactions (last 20)
    try:
        from datetime import datetime, timezone, timedelta
        recent = await Transaction.find(
            Transaction.user_id == uid,
            Transaction.is_deleted == False,
        ).sort(-Transaction.timestamp).limit(20).to_list()

        context["recent_transactions"] = [
            {
                "amount": float(t.amount),
                "category": t.category,
                "description": t.description or "",
                "date": t.timestamp.strftime("%Y-%m-%d"),
            }
            for t in recent
        ]
    except Exception:
        pass

    return context
