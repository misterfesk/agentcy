"""Populate durable MVP demo work for the fictional marketing and creative agency."""

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.config import Settings
from app.db.models import Client, Todo
from app.inbound import create_session_factory

DEMO_TODOS = (
    ("Northstar Marketing", "Review Q4 demand-generation campaign brief", 2),
    ("Northstar Marketing", "Approve paid-media audience recommendations", 4),
    ("Northstar Marketing", "Send client update on campaign timeline", 7),
    ("Mosaic Creative Studio", "Confirm hospitality brand-system review attendees", 1),
    ("Mosaic Creative Studio", "Prepare content-production milestone update", 3),
    ("Mosaic Creative Studio", "Draft scope-change summary for approval", 6),
)


async def main() -> None:
    settings = Settings()
    if settings.database_url is None:
        raise RuntimeError("database configuration is required")
    session_factory = create_session_factory(settings.database_url)
    async with session_factory() as session:
        for client_name, title, hours_until_due in DEMO_TODOS:
            client = await session.scalar(select(Client).where(Client.display_name == client_name))
            if client is None:
                raise RuntimeError(f"missing demo client {client_name}")
            existing = await session.scalar(select(Todo).where(Todo.title == title))
            if existing is None:
                session.add(
                    Todo(
                        client_id=client.id,
                        title=title,
                        due_at=datetime.now(UTC) + timedelta(hours=hours_until_due),
                    )
                )
        await session.commit()
    print(f"Seeded {len(DEMO_TODOS)} demo work items.")


if __name__ == "__main__":
    asyncio.run(main())
