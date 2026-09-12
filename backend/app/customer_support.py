"""Nebius-backed customer-support subagent for inbound MVP messages."""

import httpx

from app.core.config import Settings

SYSTEM_PROMPT = """You are Agentcy's customer-support subagent for a marketing and creative agency.
Reply warmly and concisely. The agency offers paid media, campaign strategy,
brand identity, and content production. Never invent pricing, delivery dates,
policies, guarantees, or client facts. If a request needs a human, say that the
team will review it and follow up. Ask at most one useful clarification question."""


async def generate_customer_support_reply(settings: Settings, message: str, route: str) -> str:
    """Generate a bounded customer reply or return a safe operational fallback."""
    api_key = settings.nebius_api_key
    if api_key is None:
        return "Thanks for reaching out to Agentcy. We have your message and will reply shortly."

    handoff_context = (
        "This is an active or past client. A dedicated account specialist will review the request."
        if route == "dedicated"
        else "This is a new or prospective client inquiry."
    )
    request_payload = {
        "model": settings.nebius_model,
        "temperature": 0.2,
        "max_tokens": 180,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": handoff_context},
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
        return content[:1200] or "Thanks for reaching out. Our team will review this and follow up."
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return "Thanks for reaching out to Agentcy. We have your message and will reply shortly."
