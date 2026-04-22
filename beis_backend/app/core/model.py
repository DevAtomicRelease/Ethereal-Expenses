"""
NVIDIA NIM LLM Client
======================
Calls NVIDIA NIM OpenAI-compatible API for Qwen inference.
Architecture v3.0: timeout 60s, retry 2x, fallback response.
"""

import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger("beis.model")

SYSTEM_PROMPT = (
    "You are the intelligence engine of a behavioral expense analysis system. "
    "Given compressed behavioral spending signals as JSON, produce a <reasoning> block "
    "(100-180 words analyzing signals step by step) followed by a <narrative> block "
    "(180-280 words, the behavioral intelligence report). Be specific, reference actual values, "
    "address contradictions, hedge when confidence is low, never use generic openers."
)

FALLBACK_RESPONSE = {
    "narrative": (
        "The intelligence engine is temporarily unavailable. "
        "Your behavioral data has been analyzed by the statistical engines. "
        "Please try again shortly for the full AI-generated report."
    ),
    "reasoning": None,
    "model_unavailable": True,
}


async def generate_intelligence(compressed_signals: dict) -> dict:
    """Send compressed behavioral signals to NVIDIA NIM API and return parsed narrative."""
    user_message = json.dumps(compressed_signals, default=str)
    payload = {
        "model": settings.NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,
        "top_p": 0.9,
        "max_tokens": 1024,
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
                content = data["choices"][0]["message"]["content"]
                return _parse_response(content)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as e:
            logger.warning(f"NVIDIA API attempt {attempt + 1} failed: {e}")
            if attempt < settings.NVIDIA_RETRIES:
                continue
            return {**FALLBACK_RESPONSE}
        except Exception as e:
            logger.error(f"NVIDIA API unexpected error: {e}")
            return {**FALLBACK_RESPONSE}

    return {**FALLBACK_RESPONSE}


def _parse_response(content: str) -> dict:
    """Extract <reasoning> and <narrative> blocks from LLM output."""
    reasoning = None
    narrative = content
    if "<reasoning>" in content and "</reasoning>" in content:
        reasoning = content[content.index("<reasoning>") + 11:content.index("</reasoning>")].strip()
    if "<narrative>" in content and "</narrative>" in content:
        narrative = content[content.index("<narrative>") + 11:content.index("</narrative>")].strip()
    elif "<narrative>" in content:
        narrative = content[content.index("<narrative>") + 11:].strip()
    return {"narrative": narrative, "reasoning": reasoning, "model_unavailable": False}


async def check_llm_health() -> bool:
    """Verify NVIDIA API is reachable by listing available models."""
    try:
        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.NVIDIA_API_URL}/models",
                headers=headers,
            )
            return resp.status_code == 200
    except Exception:
        return False
