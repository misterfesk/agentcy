from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.demo_seed import seed_demo_marketing_and_creative_context
from app.db.models import Base, Client


async def test_demo_seed_creates_idempotent_marketing_and_creative_business_context() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    try:
        await seed_demo_marketing_and_creative_context(session_factory)
        await seed_demo_marketing_and_creative_context(session_factory)

        async with session_factory() as session:
            clients = list(
                (await session.scalars(select(Client).order_by(Client.display_name))).all()
            )
    finally:
        await engine.dispose()

    assert [client.display_name for client in clients] == [
        "Mosaic Creative Studio",
        "Northstar Marketing",
    ]
    contexts = {client.display_name: client.business_context for client in clients}
    assert contexts["Northstar Marketing"]["services"] == ["paid media", "campaign strategy"]
    assert contexts["Mosaic Creative Studio"]["services"] == [
        "brand identity",
        "content production",
    ]
