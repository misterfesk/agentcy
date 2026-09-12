"""Minimal open Telegram intake worker for the Agentcy MVP."""

import asyncio
import logging
from datetime import UTC, datetime

import httpx

from app.core.config import get_settings
from app.customer_support import generate_customer_support_reply
from app.inbound import TelegramInboundPayload, create_session_factory, persist_telegram_inbound

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> None:
    settings = get_settings()
    token = settings.telegram_bot_token
    if token is None or settings.database_url is None:
        raise RuntimeError("TELEGRAM_BOT_TOKEN_FILE and database configuration are required")

    session_factory = create_session_factory(settings.database_url)
    offset: int | None = None
    api_url = f"https://api.telegram.org/bot{token}"
    async with httpx.AsyncClient(timeout=35) as client:
        while True:
            response = await client.get(
                f"{api_url}/getUpdates",
                params={"timeout": 25, "offset": offset, "allowed_updates": '["message"]'},
            )
            response.raise_for_status()
            for update in response.json().get("result", []):
                offset = int(update["update_id"]) + 1
                message = update.get("message")
                if not message or not message.get("text"):
                    continue
                chat = message["chat"]
                sender = message.get("from", {})
                payload = TelegramInboundPayload(
                    external_message_id=str(message["message_id"]),
                    external_user_id=str(sender.get("id", chat["id"])),
                    external_thread_id=str(chat["id"]),
                    text=message["text"],
                    received_at=datetime.fromtimestamp(message["date"], tz=UTC),
                    sender_name=sender.get("first_name"),
                )
                result = await persist_telegram_inbound(session_factory, payload)
                if not result.accepted:
                    continue
                reply = await generate_customer_support_reply(
                    settings,
                    payload.text,
                    result.route,
                )
                sent = await client.post(
                    f"{api_url}/sendMessage",
                    json={"chat_id": chat["id"], "text": reply},
                )
                sent.raise_for_status()
                logger.info(
                    "accepted Telegram message %s on %s route",
                    message["message_id"],
                    result.route,
                )


if __name__ == "__main__":
    asyncio.run(main())
