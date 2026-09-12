from collections.abc import Callable
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Client

SessionFactory = Callable[[], AsyncSession]

DEMO_MARKETING_AND_CREATIVE_CONTEXT: tuple[tuple[str, dict[str, Any]], ...] = (
    (
        "Northstar Marketing",
        {
            "industry": "marketing agency",
            "services": ["paid media", "campaign strategy"],
            "voice": "direct, data-informed, and optimistic",
            "current_priority": "Q4 demand-generation launch",
        },
    ),
    (
        "Mosaic Creative Studio",
        {
            "industry": "creative studio",
            "services": ["brand identity", "content production"],
            "voice": "collaborative, visual, and precise",
            "current_priority": "brand-system rollout for a hospitality client",
        },
    ),
)


async def seed_demo_marketing_and_creative_context(session_factory: SessionFactory) -> None:
    """Create the explicit local-demo clients without overwriting existing context."""
    async with session_factory() as session:
        for display_name, business_context in DEMO_MARKETING_AND_CREATIVE_CONTEXT:
            existing_client = await session.scalar(
                select(Client).where(Client.display_name == display_name)
            )
            if existing_client is None:
                session.add(
                    Client(
                        status="active",
                        display_name=display_name,
                        business_context=business_context,
                    )
                )
        await session.commit()
