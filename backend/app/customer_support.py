"""Nebius-backed customer-support subagent for inbound MVP messages."""

import logging

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Agentcy's customer-support subagent for a marketing and creative agency.
Reply warmly and concisely. The agency offers paid media, campaign strategy,
brand identity, and content production. Never invent pricing, delivery dates,
policies, guarantees, or client facts. If a request needs a human, say that the
team will review it and follow up. Ask at most one useful clarification question.
Use the supplied conversation history. Do not restart with a generic greeting when
the customer has already spoken; acknowledge the latest message and move it forward."""


async def generate_customer_support_reply(
    settings: Settings,
    message: str,
    route: str,
    history: list[tuple[str, str]],
) -> str:
    """Generate a bounded contextual customer reply or return a safe fallback."""
    api_key = settings.nebius_api_key
    if api_key is None:
        return "Thanks for reaching out to Agentcy. We have your message and will reply shortly."

    handoff_context = (
        "This is an active or past client. A dedicated account specialist will review the request."
        if route == "dedicated"
        else "This is a new or prospective client inquiry."
    )
    conversation = "\n".join(
        f"{'Customer' if direction == 'inbound' else 'Agentcy'}: {content}"
        for direction, content in history[-12:]
    )
    request_payload = {
        "model": settings.nebius_model,
        "temperature": 0.2,
        # GLM-5.3-Flash emits hidden reasoning before its customer-facing
        # content. 180 tokens could exhaust the completion on reasoning and
        # leave content empty even though the API correctly returns HTTP 200.
        "max_tokens": 512,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": handoff_context},
            {"role": "system", "content": f"Conversation history:\n{conversation}"},
            {"role": "user", "content": message},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                f"{settings.nebius_base_url}chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=request_payload,
            )
            response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        if not content:
            raise ValueError("Nebius returned an empty customer-facing completion")
        return content[:1200]
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
        logger.warning("Customer-support completion failed: %s", type(error).__name__)
        return "Thanks for reaching out to Agentcy. We have your message and will reply shortly."
