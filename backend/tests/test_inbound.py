import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.models import AgentRun, Base, Client, ClientIdentity, InboundEvent, Message, Thread
from app.main import create_app


async def test_telegram_inbound_is_persisted_and_duplicate_delivery_is_idempotent() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    app = create_app(session_factory=session_factory)
    transport = httpx.ASGITransport(app=app)
    payload = {
        "external_message_id": "telegram-message-42",
        "external_user_id": "telegram-user-9",
        "external_thread_id": "telegram-chat-7",
        "text": "I need help launching a campaign.",
        "received_at": "2026-09-12T10:30:00Z",
        "sender_name": "Morgan",
    }
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            first_response = await client.post("/inbound/telegram", json=payload)
            duplicate_response = await client.post("/inbound/telegram", json=payload)

        assert first_response.status_code == 202
        assert first_response.json()["accepted"] is True
        assert first_response.json()["route"] == "support"
        assert duplicate_response.status_code == 200
        assert duplicate_response.json() == {
            "accepted": False,
            "event_id": first_response.json()["event_id"],
            "route": "support",
        }

        async with session_factory() as session:
            for model in (Client, ClientIdentity, Thread, InboundEvent, Message, AgentRun):
                count = await session.scalar(select(func.count()).select_from(model))
                assert count == 1
    finally:
        await engine.dispose()
