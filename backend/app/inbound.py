from collections.abc import Callable
from datetime import datetime
from typing import cast
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.models import AgentRun, Client, ClientIdentity, InboundEvent, Message, Thread
from app.routing import choose_agent_route

SessionFactory = Callable[[], AsyncSession]


class TelegramInboundPayload(BaseModel):
    """Verified, normalized Telegram content; webhook transport details stay outside the API."""

    external_message_id: str = Field(min_length=1, max_length=255)
    external_user_id: str = Field(min_length=1, max_length=255)
    external_thread_id: str = Field(min_length=1, max_length=255)
    text: str = Field(min_length=1)
    received_at: datetime
    sender_name: str | None = Field(default=None, max_length=255)


class InboundResult(BaseModel):
    accepted: bool
    event_id: UUID
    route: str


def create_session_factory(database_url: str) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(database_url, pool_pre_ping=True)
    return async_sessionmaker(engine, expire_on_commit=False)


async def persist_telegram_inbound(
    session_factory: SessionFactory, payload: TelegramInboundPayload
) -> InboundResult:
    """Persist one normalized inbound event and its first queued agent run exactly once."""
    async with session_factory() as session:
        existing_event = await _find_event(session, payload.external_message_id)
        if existing_event is not None:
            return await _duplicate_result(session, existing_event)

        try:
            client = await _resolve_client(session, payload)
            thread = await _resolve_thread(session, client, payload)
            route = choose_agent_route(client.status)
            event = InboundEvent(
                channel="telegram",
                external_message_id=payload.external_message_id,
                client_id=client.id,
                thread_id=thread.id,
                payload=payload.model_dump(mode="json"),
                received_at=payload.received_at,
            )
            session.add(event)
            await session.flush()
            session.add(
                Message(
                    thread_id=thread.id,
                    inbound_event_id=event.id,
                    direction="inbound",
                    content=payload.text,
                    external_message_id=payload.external_message_id,
                )
            )
            session.add(
                AgentRun(
                    client_id=client.id,
                    thread_id=thread.id,
                    inbound_event_id=event.id,
                    route=route.value,
                )
            )
            await session.commit()
        except IntegrityError:
            await session.rollback()
            existing_event = await _find_event(session, payload.external_message_id)
            if existing_event is None:
                raise
            return await _duplicate_result(session, existing_event)

        return InboundResult(accepted=True, event_id=event.id, route=route.value)


async def _find_event(session: AsyncSession, external_message_id: str) -> InboundEvent | None:
    return cast(
        InboundEvent | None,
        await session.scalar(
            select(InboundEvent).where(
                InboundEvent.channel == "telegram",
                InboundEvent.external_message_id == external_message_id,
            )
        ),
    )


async def _duplicate_result(session: AsyncSession, event: InboundEvent) -> InboundResult:
    route = await session.scalar(
        select(AgentRun.route).where(AgentRun.inbound_event_id == event.id)
    )
    if route is None:
        raise RuntimeError("inbound event is missing its agent run")
    return InboundResult(accepted=False, event_id=event.id, route=route)


async def _resolve_client(session: AsyncSession, payload: TelegramInboundPayload) -> Client:
    identity = await session.scalar(
        select(ClientIdentity).where(
            ClientIdentity.channel == "telegram",
            ClientIdentity.external_user_id == payload.external_user_id,
        )
    )
    if identity is not None:
        client = await session.get(Client, identity.client_id)
        if client is None:
            raise RuntimeError("client identity refers to a missing client")
        return client

    client = Client(display_name=payload.sender_name)
    session.add(client)
    await session.flush()
    session.add(
        ClientIdentity(
            client_id=client.id,
            channel="telegram",
            external_user_id=payload.external_user_id,
        )
    )
    await session.flush()
    return client


async def _resolve_thread(
    session: AsyncSession, client: Client, payload: TelegramInboundPayload
) -> Thread:
    thread = await session.scalar(
        select(Thread).where(
            Thread.channel == "telegram",
            Thread.external_thread_id == payload.external_thread_id,
        )
    )
    if thread is not None:
        return thread

    thread = Thread(
        client_id=client.id,
        channel="telegram",
        external_thread_id=payload.external_thread_id,
    )
    session.add(thread)
    await session.flush()
    return thread


async def load_thread_history(
    session_factory: SessionFactory,
    external_thread_id: str,
    limit: int = 12,
) -> list[tuple[str, str]]:
    """Return bounded persisted conversation context in chronological order."""
    async with session_factory() as session:
        thread = await session.scalar(
            select(Thread).where(Thread.external_thread_id == external_thread_id)
        )
        if thread is None:
            return []
        messages = list(
            (
                await session.scalars(
                    select(Message)
                    .where(Message.thread_id == thread.id)
                    .order_by(Message.created_at.desc())
                    .limit(limit)
                )
            ).all()
        )
    return [(message.direction, message.content) for message in reversed(messages)]


async def persist_outbound_reply(
    session_factory: SessionFactory,
    external_thread_id: str,
    content: str,
) -> None:
    """Persist a sent support reply so the next turn has real conversation context."""
    async with session_factory() as session:
        thread = await session.scalar(
            select(Thread).where(Thread.external_thread_id == external_thread_id)
        )
        if thread is None:
            raise RuntimeError("cannot persist an outbound reply without a thread")
        session.add(Message(thread_id=thread.id, direction="outbound", content=content))
        await session.commit()
